import {memeForm} from "../memeForms";
// DUELLO PvP host-autoritativo. La scena presenta il duello riusando la
// presentazione estratta in view.ts (BattleFx, sprite, box HP) e la sim pura
// di duelsim.ts. Due sim:
// - `auth` (SOLO host): l'autorità, mutata da resolveTurn con la RNG dell'host;
// - `view` (entrambi): la copia di presentazione, mutata evento-per-evento
//   mentre la coda Step anima il log (così le barre HP si muovono passo passo).
// A ogni confine di turno auth === view.
//
// INVARIANTE ASSOLUTO (C9): il duello NON tocca MAI GameState — niente
// saveGame, exp, fondi, sondaggi, dex, HP persistiti. I team sono MIRROR
// ricostruiti da validateWireTeam; muoiono con la scena. check-duel.mjs
// asserisce localStorage identico prima/dopo.

import { MAPS } from "../../data/maps";
import { MOVES, STATUS_NAMES } from "../../data/moves";
import { typeMultiplier, type PolType } from "../../data/poltypes";
import { audio } from "../../engine/audio";
import type { Input } from "../../engine/input";
import type { Scene, SceneStack } from "../../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import { battleBackdropForMap, type BattleBackdrop } from "./backdrop";
import type { GameState } from "../state";
import { abilityOf, speciesOf, statsOf, type Monster } from "../monster";
import { statName } from "./sim";
import {
  applyEvent, applySwitch, aliveCount, makeDuelSim, otherSide, resolveTurn, usableMoves, type DuelSim
} from "./duelsim";
import {
  DUEL_TURN_TIMEOUT, sanitizeDuelCmd, sanitizeTurnlog, validateWireTeam,
  type DuelCmd, type DuelEndReason, type DuelEvent, type DuelMsg, type DuelSide, type WireMon
} from "../../net/duelproto";
import { mp } from "../../net/mp";
import { MessageBox } from "../../ui/widgets";
import {
  approach, BattleFx, damageImpacts, drawBattleBackdrop, drawBattleMonster, drawEllipse, battleGeometry, battleFit
} from "./view";
import type { UiPanel } from "../../ui/kit";
import type { TouchAction } from "../../engine/touchActions";
import { readableCopy } from "../../ui/kit/copy";
import { moveDescription, moveCardDescription } from "../../ui/kit/moveContent";
import { PartyScene } from "../../scenes/PartyScene";

interface Step {
  text?: string;
  run?: () => void;
  waitHp?: boolean;
  pause?: number;
}

export interface PvpOptions {
  state: GameState;
  role: DuelSide;
  peerId: string;
  opponentNick: string;
  hostWire: WireMon[];
  guestWire: WireMon[];
  duelId: string;
  // Esito dal punto di vista LOCALE, consegnato a duello CHIUSO (banner
  // confermato): chi lo riceve può aggiornare duelWins/duelLosses e salvare —
  // qui dentro il save resta intoccato (invariante C9).
  onEnd: (result: "win" | "loss" | "draw") => void;
}

type EndInfo = { winner: DuelSide | null; reason: DuelEndReason };

export class PvpBattleScene implements Scene {
  private readonly backdrop: BattleBackdrop;
  private readonly mySide: DuelSide;
  private readonly foeSide: DuelSide;
  private view!: DuelSim;
  private auth: DuelSim | null = null; // solo host

  private queue: Step[] = [];
  private mode: "queue" | "menu" | "ask" | "wait" = "queue";
  private msg = new MessageBox();
  private inspection: string | null = null;
  private viewHeight = VIEW_H;
  get expandedViewport(): boolean { return true; }
  readonly continueWhenGuideOpen = true;

  private fx = new BattleFx();
  private introT = 0;
  private displayHp = { player: 0, foe: 0 };
  private stepTimer = 0;
  private finished = false;
  private done = false; // banner finale in corso: si ignora tutto tranne msg

  private turn = 1;
  private myCmd: DuelCmd | null = null; // host: comando proprio in attesa del guest
  private peerCmd: DuelCmd | null = null; // host: comando del guest
  private myForcedIdx: number | null = null; // host: switch forzato proprio
  private peerForcedIdx: number | null = null; // host: switch forzato del guest
  private forcedSent = false; // guest: switch forzato già inviato
  private switching = false; // PartyScene aperta (evita doppio push)
  private waitTimer = DUEL_TURN_TIMEOUT;
  private endInfo: EndInfo | null = null;

  private prevOnDuel: typeof mp.onDuel = null;
  private prevOnPeerGone: typeof mp.onPeerGone = null;

  constructor(private stack: SceneStack, private input: Input, private opts: PvpOptions) {
    this.backdrop = battleBackdropForMap(opts.state.pos.mapId);
    this.mySide = opts.role;
    this.foeSide = otherSide(opts.role);
    // Entrambi i lati ricostruiscono i team dallo STESSO code path di
    // validazione (anche il proprio): stat/HP derivano solo da specie+livello.
    const viewHost = validateWireTeam(opts.hostWire);
    const viewGuest = validateWireTeam(opts.guestWire);
    if (!viewHost || !viewGuest) {
      // Non dovrebbe accadere (validato a monte): chiusura pulita.
      this.finished = true;
      queueMicrotask(() => opts.onEnd("draw"));
      return;
    }
    this.view = makeDuelSim(viewHost, viewGuest);
    if (opts.role === "host") {
      this.auth = makeDuelSim(validateWireTeam(opts.hostWire)!, validateWireTeam(opts.guestWire)!);
    }
    this.displayHp.player = this.mine.active.mon.hp;
    this.displayHp.foe = this.theirs.active.mon.hp;
    // Accessibilità: RIDUCI EFFETTI azzera lo screen-shake anche in duello.
    this.fx.reduceEffects = opts.state.reduceEffects;
    audio.playMusic("battle-duel");
    const nick = opts.opponentNick.slice(0, 12);
    this.push({ text: `DUELLO IN DIRETTA contro ${nick}!` });
    this.push({ text: "Si duella a squadre fresche: HP e PP al massimo. Nessun premio, solo gloria." });
    this.push({ text: `${nick} manda in campo ${speciesOf(this.theirs.active.mon).name}!` });
    this.push({ text: `Vai, ${speciesOf(this.mine.active.mon).name}!` });
    if (abilityOf(this.theirs.active.mon)?.id === "tabularasa" || abilityOf(this.mine.active.mon)?.id === "tabularasa") {
      this.push({ text: "TABULA RASA azzera ogni modifica alle statistiche!" });
    }
  }

  onEnter(): void {
    mp.duelBusy = true;
    this.prevOnDuel = mp.onDuel;
    this.prevOnPeerGone = mp.onPeerGone;
    mp.onDuel = (msg, peerId) => this.onDuelMsg(msg, peerId);
    mp.onPeerGone = (peerId) => {
      if (peerId === this.opts.peerId) {
        this.walkover("disconnect");
      }
    };
  }

  onExit(): void {
    mp.duelBusy = false;
    mp.onDuel = this.prevOnDuel;
    mp.onPeerGone = this.prevOnPeerGone;
  }

  // ---- Helpers ----

  private get mine() {
    return this.view[this.mySide];
  }

  private get theirs() {
    return this.view[this.foeSide];
  }

  private sideKey(side: DuelSide): "player" | "foe" {
    return side === this.mySide ? "player" : "foe";
  }

  private push(step: Step): void {
    this.queue.push(step);
  }

  private send(msg: DuelMsg): void {
    mp.sendDuel(msg, this.opts.peerId);
  }

  // ---- Rete ----

  private onDuelMsg(msg: DuelMsg, peerId: string): void {
    if (peerId !== this.opts.peerId || msg.duelId !== this.opts.duelId || this.done || this.finished) {
      return;
    }
    switch (msg.type) {
      case "cmd": {
        if (this.mySide !== "host" || msg.turn !== this.turn) {
          return; // stale o ruolo sbagliato
        }
        const cmd = sanitizeDuelCmd(msg.cmd);
        if (!cmd) {
          return; // cmd malformato: ignorato, il timeout di turno fa il resto
        }
        if (cmd.kind === "switch" && (this.needsForced("guest") || this.peerForcedIdx !== null)) {
          this.peerForcedIdx = cmd.index;
          this.tryResolveForced();
          return;
        }
        this.peerCmd = cmd;
        this.tryResolveTurn();
        return;
      }
      case "turnlog": {
        if (this.mySide !== "guest" || msg.turn !== this.turn) {
          return;
        }
        // Log dal filo MAI fidato: un evento malformato scarterebbe in crash
        // l'update loop (applyEvent per assegnazione). Protocollo rotto =
        // fine a tavolino, senza applicare nulla.
        const events = sanitizeTurnlog(msg.events);
        if (!events) {
          this.walkover("disconnect");
          return;
        }
        this.enqueueTurnlog(events);
        return;
      }
      case "end": {
        this.finishDuel({ winner: msg.winner, reason: msg.reason });
        return;
      }
      default:
        return;
    }
  }

  // ---- Flusso di turno ----

  private submitCmd(cmd: DuelCmd): void {
    this.inspection = null;
    this.mode = "wait";
    this.waitTimer = DUEL_TURN_TIMEOUT;
    if (this.mySide === "guest") {
      this.send({ v: 1, duelId: this.opts.duelId, type: "cmd", turn: this.turn, cmd });
      return;
    }
    this.myCmd = cmd;
    this.tryResolveTurn();
  }

  private tryResolveTurn(): void {
    if (this.mySide !== "host" || !this.auth || !this.myCmd || !this.peerCmd) {
      return;
    }
    const hostCmd = this.myCmd;
    const guestCmd = this.peerCmd;
    this.myCmd = null;
    this.peerCmd = null;
    const events = resolveTurn(this.auth, hostCmd, guestCmd, Math.random);
    this.send({ v: 1, duelId: this.opts.duelId, type: "turnlog", turn: this.turn, events });
    this.enqueueTurnlog(events);
  }

  // Switch forzato post-KO: mini-turno che emette solo eventi switch.
  private needsForced(side: DuelSide): boolean {
    const st = (this.auth ?? this.view)[side];
    return st.active.mon.hp <= 0 && aliveCount(st) > 0;
  }

  private tryResolveForced(): void {
    if (this.mySide !== "host" || !this.auth) {
      return;
    }
    if (this.needsForced("host") && this.myForcedIdx === null) {
      return;
    }
    if (this.needsForced("guest") && this.peerForcedIdx === null) {
      return;
    }
    const events: DuelEvent[] = [];
    if (this.myForcedIdx !== null) {
      applySwitch(this.auth, "host", this.myForcedIdx, events);
    }
    if (this.peerForcedIdx !== null) {
      applySwitch(this.auth, "guest", this.peerForcedIdx, events);
    }
    this.myForcedIdx = null;
    this.peerForcedIdx = null;
    if (events.length === 0) {
      return;
    }
    this.send({ v: 1, duelId: this.opts.duelId, type: "turnlog", turn: this.turn, events });
    this.enqueueTurnlog(events);
  }

  // Accoda la presentazione del log. La `view` viene mutata DENTRO gli step
  // (applyEvent), così le barre HP animano evento per evento. Alla fine il
  // turno avanza.
  private enqueueTurnlog(events: DuelEvent[]): void {
    this.turn += 1;
    this.mode = "queue";
    // Nomi tracciati lungo il log (uno switch cambia il nome dei successivi).
    const nick = this.opts.opponentNick.slice(0, 12);
    let myName = speciesOf(this.mine.active.mon).name;
    let foeName = `Il nemico ${speciesOf(this.theirs.active.mon).name}`;
    const nameOf = (side: DuelSide) => (side === this.mySide ? myName : foeName);
    const moveTypes: Partial<Record<DuelSide, PolType>> = {};
    for (const ev of events) {
      const apply = () => applyEvent(this.view, ev);
      switch (ev.e) {
        case "switch": {
          const st = this.view[ev.side];
          const incoming = st.party[ev.index];
          // Host malevolo su relay pubblico: sanitizeTurnlog clampa index a 0..5
          // ma NON alla dimensione reale del party. Uno switch verso un indice
          // oltre il team fa incoming=undefined → speciesOf(undefined) crasha e
          // desincronizza il duello del guest. Interrompi con walkover invece
          // di dereferenziare (applyEvent tollera già l'indice cattivo).
          if (!incoming) {
            this.walkover("disconnect");
            return;
          }
          const label =
            ev.side === this.mySide
              ? `Tocca a te, ${speciesOf(incoming).name}!`
              : `${nick} manda in campo ${speciesOf(incoming).name}!`;
          this.push({
            text: label,
            run: () => {
              apply();
              const key = this.sideKey(ev.side);
              this.displayHp[key] = this.view[ev.side].active.mon.hp;
            }
          });
          if (ev.side === this.mySide) {
            myName = speciesOf(incoming).name;
          } else {
            foeName = `Il nemico ${speciesOf(incoming).name}`;
          }
          break;
        }
        case "stageReset":
          this.push({ text: `${nameOf(ev.side)} fa TABULA RASA: ogni modifica è azzerata!`, run: apply });
          break;
        case "move":
          moveTypes[ev.side] = MOVES[ev.moveId]?.type;
          this.push({ text: `${nameOf(ev.side)} usa ${MOVES[ev.moveId]?.name ?? "???"}!`, run: apply });
          break;
        case "miss":
          this.push({ text: "Ma manca il bersaglio! La piazza fischia." });
          break;
        case "blocked":
          this.push({ text: `${nameOf(ev.side)} è trattenuto in audizione! Non può agire!` });
          break;
        case "gaffeEnd":
          this.push({ text: `${nameOf(ev.side)} ha chiarito la GAFFE con una nota stampa!`, run: apply });
          break;
        case "gaffeSelf":
          this.push({
            text: `${nameOf(ev.side)} riformula la GAFFE e peggiora tutto!`,
            run: () => {
              apply();
              audio.hit();
            },
            waitHp: true
          });
          break;
        case "dmg": {
          const attacker = otherSide(ev.side);
          const moveType = moveTypes[attacker];
          this.push({
            run: () => {
              // Danno cosmetico per il numero flottante: differenza di HP prima/dopo
              // l'evento (il filo porta solo hpAfter assoluto). Zero impatto sulla
              // logica: applyEvent resta l'unica fonte di verità.
              const before = this.view[ev.side].active.mon.hp;
              apply();
              const dealt = Math.max(0, before - this.view[ev.side].active.mon.hp);
              this.fx.onHit(this.sideKey(attacker), ev.typeMult, ev.crit, dealt, moveType, dealt / Math.max(1, statsOf(this.view[ev.side].active.mon).hp));
            },
            waitHp: true,
            pause: 0.25
          });
          if (ev.crit) {
            this.push({ text: "Colpo critico! I retroscenisti impazziscono!" });
          }
          if (ev.pollEstimate) {
            this.push({ text: `FORCHETTA SONDAGGI: STIMA ${ev.pollEstimate === "high" ? "ALTA" : "BASSA"}!` });
          }
          if (ev.typeMult === 0) {
            this.push({ text: "Non ha alcun effetto..." });
          } else if (ev.typeMult >= 2) {
            this.push({ text: "È super efficace!" });
          } else if (ev.typeMult < 1) {
            this.push({ text: "Non è molto efficace..." });
          }
          break;
        }
        case "drain":
          this.push({ text: `${nameOf(ev.side)} assorbe consenso!`, run: apply, waitHp: true });
          break;
        case "recoil":
          this.push({
            text: `${nameOf(ev.side)} subisce il contraccolpo della corrente interna!`,
            run: () => {
              apply();
              audio.hit();
            },
            waitHp: true
          });
          break;
        case "heal":
          this.push({
            text: `${nameOf(ev.side)} recupera consenso!`,
            run: () => {
              apply();
              audio.heal();
            },
            waitHp: true
          });
          break;
        case "stat":
          this.push({
            text: `${statName(ev.key)} di ${nameOf(ev.side)} ${ev.stages > 0 ? "sale" : "scende"}${Math.abs(ev.stages) > 1 ? " di brutto" : ""}!`,
            run: apply
          });
          break;
        case "status":
          this.push({ text: `${nameOf(ev.side)} è ${STATUS_NAMES[ev.id]}!`, run: apply });
          break;
        case "gaffeStart":
          this.push({ text: `${nameOf(ev.side)} è ${STATUS_NAMES.gaffe}!`, run: apply });
          break;
        case "eot":
          this.push({
            text: `${nameOf(ev.side)} è logorato dallo SCANDALO!`,
            run: () => {
              apply();
              audio.hit();
            },
            waitHp: true
          });
          break;
        case "faint":
          this.push({
            text: `${nameOf(ev.side)} si ritira dalla corsa!`,
            run: () => {
              apply();
              audio.faint();
              this.fx.hitStop = Math.max(this.fx.hitStop, .25);
              this.fx.koFlash = .5;
              this.fx.faintT[ev.side === this.mySide ? "player" : "foe"] = 0.55;
            },
            waitHp: true
          });
          break;
        case "end":
          this.push({ run: () => (this.endInfo = { winner: ev.winner, reason: ev.reason }) });
          break;
      }
    }
  }

  // ---- Fine duello ----

  private walkover(reason: DuelEndReason): void {
    if (this.done || this.finished) {
      return;
    }
    // Vittoria a tavolino locale: non serve l'arbitrio dell'host (che potrebbe
    // essere proprio il disconnesso). Cortesia: annuncio all'altro se c'è.
    this.send({ v: 1, duelId: this.opts.duelId, type: "end", winner: this.mySide, reason });
    this.finishDuel({ winner: this.mySide, reason });
  }

  private forfeit(): void {
    if (this.done || this.finished) {
      return;
    }
    this.send({ v: 1, duelId: this.opts.duelId, type: "end", winner: this.foeSide, reason: "forfeit" });
    this.finishDuel({ winner: this.foeSide, reason: "forfeit" });
  }

  private finishDuel(info: EndInfo): void {
    if (this.done || this.finished) {
      return;
    }
    this.done = true;
    this.inspection = null;
    const nick = this.opts.opponentNick.slice(0, 12);
    const lines: string[] = [];
    if (info.winner === null) {
      lines.push("PAREGGIO ALL'ITALIANA: TUTTI A CASA.");
      audio.faint();
    } else if (info.winner === this.mySide) {
      audio.victory();
      if (info.reason === "forfeit") {
        lines.push(`${nick} SI RITIRA: VINCI PER ABBANDONO DELL'AULA!`);
      } else if (info.reason === "timeout" || info.reason === "disconnect") {
        lines.push("L'AVVERSARIO HA ABBANDONATO L'AULA! VITTORIA A TAVOLINO.");
      } else {
        lines.push("HAI VINTO IL CONFRONTO TELEVISIVO! L'ELETTORATO APPLAUDE (MA NON CAMBIA IDEA).");
      }
    } else {
      audio.faint();
      lines.push(
        info.reason === "forfeit"
          ? "TI RITIRI DAL CONFRONTO. IL SEGGIO VA ALL'AVVERSARIO."
          : "HAI PERSO IL DIBATTITO. DOMANI SMENTIRAI TUTTO IN CONFERENZA STAMPA."
      );
    }
    lines.push("Nessun premio e nessuna penalità: era solo un'amichevole televisiva.");
    // NIENTE saveGame, NIENTE exp/fondi/sondaggi/dex: invariante C9. Il record
    // duelli viene scritto DOPO, dal chiamante di onEnd (ritorno al mondo).
    const result: "win" | "loss" | "draw" =
      info.winner === null ? "draw" : info.winner === this.mySide ? "win" : "loss";
    this.msg.show(lines, () => {
      this.finished = true;
      this.exposeDebug(); // ultimo stato visibile a check-duel (finished=true)
      audio.playMusic(MAPS[this.opts.state.pos.mapId]?.music ?? "borgo");
      this.opts.onEnd(result);
    });
  }

  // ---- Update ----

  update(dt: number): void {
    if (this.finished) {
      return;
    }
    const realDt = dt;
    dt *= this.opts.state.battleSpeed === 2 ? 2 : 1;
    this.exposeDebug();
    if (this.done) {
      this.msg.update(dt, this.input, this.viewHeight);
      return;
    }
    this.fx.update(dt, this.fx.hitStop > 0);
    if (this.fx.hitStop > 0) {
      this.fx.hitStop = Math.max(0, this.fx.hitStop - dt);
      return;
    }
    if (this.introT < 1.2) {
      this.introT += dt;
      if (this.introT < 0.55) {
        return;
      }
    }
    const speed = dt * 60;
    this.displayHp.player = approach(this.displayHp.player, this.mine.active.mon.hp, speed * 0.8);
    this.displayHp.foe = approach(this.displayHp.foe, this.theirs.active.mon.hp, speed * 0.8);

    if (this.mode === "wait") {
      this.waitTimer -= realDt;
      if (this.waitTimer <= 0) {
        this.walkover("timeout");
      }
      return;
    }

    if (this.mode === "queue") {
      this.msg.update(dt, this.input, this.viewHeight);
      if (this.msg.isOpen) {
        return;
      }
      if (this.stepTimer > 0) {
        this.stepTimer -= dt;
        return;
      }
      const hpSettled =
        Math.abs(this.displayHp.player - this.mine.active.mon.hp) < 0.5 &&
        Math.abs(this.displayHp.foe - this.theirs.active.mon.hp) < 0.5;
      const step = this.queue[0];
      if (!step) {
        if (hpSettled) {
          this.afterQueueDrained();
        }
        return;
      }
      if (step.waitHp && !hpSettled) {
        return;
      }
      this.queue.shift();
      step.run?.();
      if (step.pause) {
        this.stepTimer = step.pause;
      }
      if (step.text) {
        this.msg.show([step.text]);
      }
      return;
    }

  }

  // Coda svuotata: fine duello, switch forzati o nuovo turno.
  private afterQueueDrained(): void {
    if (this.endInfo) {
      this.finishDuel(this.endInfo);
      return;
    }
    const myDown = this.mine.active.mon.hp <= 0;
    const foeDown = this.theirs.active.mon.hp <= 0;
    if (myDown) {
      if (!this.switching) {
        this.openSwitchMenu(true);
      }
      return;
    }
    if (foeDown) {
      // Attendo lo switch forzato dell'avversario (turnlog mini-turno).
      if (this.mode !== "wait") {
        this.mode = "wait";
        this.waitTimer = DUEL_TURN_TIMEOUT;
      }
      return;
    }
    // Nuovo turno.
    this.forcedSent = false;
    this.mode = "menu";
  }

  // Cambio: PartyScene sui MIRROR (partyOverride) — il party reale resta
  // intoccato. `forced` = post-KO (non consuma il turno, mini-turno switch).
  private openSwitchMenu(forced: boolean): void {
    const party = this.mine.party;
    this.switching = forced; // guardia anti doppio-push solo per il forzato
    this.stack.push(
      new PartyScene(this.stack, this.input, this.opts.state, {
        mode: forced ? "forced-switch" : "battle-switch",
        currentUid: this.mine.active.mon.uid,
        partyOverride: party,
        title: forced ? "Scegli il prossimo candidato!" : "Chi mandi in campo?",
        onChoose: (mon: Monster) => {
          this.switching = false;
          const index = party.indexOf(mon);
          if (index < 0) {
            return;
          }
          if (!forced) {
            this.submitCmd({ kind: "switch", index });
            return;
          }
          if (this.mySide === "guest") {
            if (!this.forcedSent) {
              this.forcedSent = true;
              this.send({ v: 1, duelId: this.opts.duelId, type: "cmd", turn: this.turn, cmd: { kind: "switch", index } });
            }
            this.mode = "wait";
            this.waitTimer = DUEL_TURN_TIMEOUT;
          } else {
            this.myForcedIdx = index;
            this.mode = "wait";
            this.waitTimer = DUEL_TURN_TIMEOUT;
            this.tryResolveForced();
          }
        }
      })
    );
  }

  // Hook di debug per check-duel.mjs: HP speculari sulle due pagine.
  private exposeDebug(): void {
    (globalThis as unknown as { __duel?: unknown }).__duel = {
      duelId: this.opts.duelId,
      role: this.mySide,
      turn: this.turn,
      mode: this.mode,
      host: this.view.host.party.map((m) => m.hp),
      guest: this.view.guest.party.map((m) => m.hp),
      done: this.done,
      finished: this.finished
    };
  }

  get uiPanel(): UiPanel {
    if (!this.view || this.finished) return { title: "Duello concluso", actions: [] };
    const mode = this.mode, turn = this.turn;
    const action = (label: string, run: () => void, hint?: string, disabled = false): TouchAction => ({
      label, hint, disabled, run: () => {
        if (disabled || this.stack.top !== this || this.mode !== mode || this.turn !== turn || this.finished) return;
        this.input.reset(); audio.confirm(); run();
      }
    });
    const back = action("Indietro", () => { this.inspection = null; this.mode = "menu"; });
    if (this.inspection && mode === "menu" && !this.done) {
      const move = MOVES[this.inspection];
      return { title: readableCopy(move.name), blocks: [{ title: "Effetto", body: moveDescription(move), facts: [
        { label: "Tipo", value: move.type }, { label: "Potenza", value: move.power ? String(move.power) : "—" },
        { label: "Precisione", value: `${move.accuracy}%` }, { label: "Priorità", value: String(move.effect?.priority ?? 0) }
      ] }], actions: [], back };
    }
    if (mode === "ask" && !this.done) return { title: "Ritirarsi dal duello?", blocks: [
      { title: "Esito", body: "L’avversario vincerà per resa. La squadra della campagna conserva PV e PP; fondi e sondaggi restano invariati." }
    ], actions: [action("Conferma la resa", () => this.forfeit())], primary: 0, back };
    const ready = mode === "menu" && !this.done;
    const fallback = usableMoves(this.mine.active.mon).length === 0;
    const slots = fallback ? [{ id: "comizio", pp: 0 }] : this.mine.active.mon.moves;
    const moves: TouchAction[] = slots.map(slot => {
      const move = MOVES[slot.id], mult = typeMultiplier(move.type, speciesOf(this.theirs.active.mon).types);
      return { ...action(readableCopy(move.name), () => {
        if (this.done || this.inspection || (!fallback && (!this.mine.active.mon.moves.includes(slot) || slot.pp <= 0))) return;
        this.submitCmd({ kind: "move", moveId: slot.id });
      }, moveCardDescription(move), !ready || (!fallback && slot.pp <= 0)), facts: [
        { label: "Tipo", value: move.type }, { label: "Potenza", value: move.power ? String(move.power) : "—" },
        { label: "PP", value: fallback ? "Riserva" : `${slot.pp}/${move.pp}` },
        { label: "Efficacia", value: move.power ? `×${mult}` : "—" }
      ], onInspect: ready ? () => {
        if (this.stack.top !== this || this.mode !== mode || this.turn !== turn || this.done || this.finished) return;
        this.inspection = slot.id; this.input.reset();
      } : undefined };
    });
    while (moves.length < 4) moves.push({ label: "Spazio libero", disabled: true, run: () => {} });
    const secondary = ready ? [
      action("Cambio", () => this.openSwitchMenu(false), "Usa il turno. Il nemico sceglie contemporaneamente.", !this.mine.party.some(mon => mon !== this.mine.active.mon && mon.hp > 0)),
      action("Resa", () => { this.mode = "ask"; }, "Ritirarsi assegna la vittoria all’avversario.")
    ] : [action(this.msg.isOpen ? "Continua" : "In attesa", () => this.msg.advance(), undefined, !this.msg.isOpen)];
    const combatant = (mon: Monster, hp: number) => ({ name: speciesOf(mon).name, level: mon.level, hp, maxHp: statsOf(mon).hp,
      form:memeForm(mon.memeFormId)?.name,status: mon.status ? readableCopy(STATUS_NAMES[mon.status]) : undefined });
    return { title: "Duello in rete", actions: [...moves, ...secondary], arena: {
      player: combatant(this.mine.active.mon, this.displayHp.player), foe: combatant(this.theirs.active.mon, this.displayHp.foe),
      notice: this.fx.effFx ? ({super: "Super efficace", weak: "Poco efficace", crit: "Colpo critico"}[this.fx.effFx.kind]) : `${this.opts.opponentNick.slice(0, 12)} · Turno ${this.turn} · Riserve: ${aliveCount(this.mine)} / ${aliveCount(this.theirs)}`,
      message: { title: this.done ? "Esito del duello" : mode === "wait" ? "Scelta inviata" : "Duello",
        body: this.msg.isOpen ? readableCopy(this.msg.visibleText) : mode === "wait"
          ? `In attesa dell’avversario. Tempo rimasto: ${Math.max(0, Math.ceil(this.waitTimer))} secondi.`
          : ready ? "Scegli una mossa. Le scelte sono simultanee; tieni premuta una scheda per leggere il dettaglio." : "Il turno è in corso." },
      moveCount: moves.length,
      impacts: damageImpacts(this.fx.damageNumbers, this.viewHeight, this.opts.state.reduceEffects)
    } };
  }

  draw(screen: Screen): void {
    if (this.finished || !this.view) return;
    this.viewHeight = screen.height; this.fx.viewHeight = screen.height;
    const ctx = screen.ctx, shake = this.fx.shakeOffset(), g = battleGeometry(screen.height);
    ctx.save(); ctx.translate(shake.x, shake.y); this.fx.applyPunch(ctx, screen.height);
    screen.clear("#f0f0e0"); drawBattleBackdrop(screen, this.backdrop, screen.height, 0);
    const slide = this.fx.reduceEffects ? 1 : Math.max(0, Math.min(1, (this.introT - .25) / .6));
    const foeSlide = Math.round((1 - slide) * 90), playerSlide = Math.round((1 - slide) * -90);
    drawEllipse(screen, 162 + foeSlide, g.foeBase - 2, Math.round(64 * battleFit(screen.height)), Math.max(5, Math.round(14 * battleFit(screen.height))), this.backdrop.foePlatform);
    drawEllipse(screen, 56 + playerSlide, g.playerBase - 2, Math.round(76 * battleFit(screen.height)), Math.max(5, Math.round(16 * battleFit(screen.height))), this.backdrop.playerPlatform);
    for (const side of ["foe", "player"] as const) {
      const c = side === "foe" ? this.theirs.active : this.mine.active;
      const blink = this.fx.flashT[side] > 0 && Math.floor(this.fx.flashT[side] * 16) % 2 === 0;
      if ((c.mon.hp > 0 || this.fx.faintT[side] > 0) && !blink)
        drawBattleMonster(screen, this.fx, c, side === "foe" ? 162 + foeSlide : 56 + playerSlide,
          side === "foe" ? g.foeBase : g.playerBase, this.fx.lungeT[side], side === "player", side);
    }
    // The same white flash as a KO against the computer.
    if (this.fx.koFlash > 0 && !this.fx.reduceEffects) {
      ctx.save(); ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * this.fx.koFlash / .5})`; ctx.fillRect(0, 0, VIEW_W, screen.height); ctx.restore();
    }
    this.fx.drawMoveFx(screen); this.fx.drawRings(screen); this.fx.drawParticles(screen); this.fx.drawTint(screen); ctx.restore();
  }
}
