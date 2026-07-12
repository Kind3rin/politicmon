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
import { typeMultiplier } from "../../data/poltypes";
import { audio } from "../../engine/audio";
import type { Input } from "../../engine/input";
import type { Scene, SceneStack } from "../../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import { sceneImage } from "../../engine/assets";
import type { GameState } from "../state";
import { abilityOf, speciesOf, type Monster } from "../monster";
import { statName } from "./sim";
import {
  applyEvent, applySwitch, aliveCount, makeDuelSim, otherSide, resolveTurn, usableMoves, type DuelSim
} from "./duelsim";
import {
  DUEL_TURN_TIMEOUT, sanitizeDuelCmd, sanitizeTurnlog, validateWireTeam,
  type DuelCmd, type DuelEndReason, type DuelEvent, type DuelMsg, type DuelSide, type WireMon
} from "../../net/duelproto";
import { mp } from "../../net/mp";
import { Menu, MessageBox, wrapText, GREY, INK } from "../../ui/widgets";
import {
  approach, BattleFx, drawBattleMonster, drawCombatantBox, drawEllipse, FOE_BOX, PLAYER_BOX
} from "./view";
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
  private readonly mySide: DuelSide;
  private readonly foeSide: DuelSide;
  private view!: DuelSim;
  private auth: DuelSim | null = null; // solo host

  private queue: Step[] = [];
  private mode: "queue" | "menu" | "fight" | "ask" | "wait" = "queue";
  private msg = new MessageBox();
  private mainMenu = new Menu([{ label: "LOTTA" }, { label: "SQUADRA" }, { label: "RESA" }]);
  private fightMenu = new Menu([]);
  private fightEff: Array<"super" | "weak" | "immune" | null> = [];
  private askMenu = new Menu([{ label: "SÌ" }, { label: "NO" }]);
  private askText = "";
  private askYes: (() => void) | null = null;

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
          this.push({
            run: () => {
              // Danno cosmetico per il numero flottante: differenza di HP prima/dopo
              // l'evento (il filo porta solo hpAfter assoluto). Zero impatto sulla
              // logica: applyEvent resta l'unica fonte di verità.
              const before = this.view[ev.side].active.mon.hp;
              apply();
              const dealt = Math.max(0, before - this.view[ev.side].active.mon.hp);
              this.fx.onHit(this.sideKey(attacker), ev.typeMult, ev.crit, dealt);
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
    this.exposeDebug();
    if (this.done) {
      this.msg.update(dt, this.input);
      return;
    }
    this.fx.update(dt);
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
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.walkover("timeout");
      }
      return;
    }

    if (this.mode === "queue") {
      this.msg.update(dt, this.input);
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

    if (this.mode === "menu") {
      const action = this.mainMenu.update(this.input);
      if (action === "select") {
        const idx = this.mainMenu.index;
        if (idx === 0) {
          this.openFightMenu();
        } else if (idx === 1) {
          this.openSwitchMenu(false);
        } else {
          this.askText = "CONFERMI LA RESA? IL SEGGIO VERRÀ ASSEGNATO ALL'AVVERSARIO.";
          this.askMenu.index = 0;
          this.askYes = () => this.forfeit();
          this.mode = "ask";
        }
      }
      return;
    }

    if (this.mode === "fight") {
      const action = this.fightMenu.update(this.input);
      if (action === "select") {
        const slot = usableMoves(this.mine.active.mon)[this.fightMenu.index];
        const moveId = slot?.id ?? "comizio";
        this.submitCmd({ kind: "move", moveId });
      } else if (action === "cancel") {
        this.mode = "menu";
      }
      return;
    }

    if (this.mode === "ask") {
      const action = this.askMenu.update(this.input);
      if (action === "select") {
        const yes = this.askMenu.index === 0;
        this.mode = "menu";
        if (yes) {
          this.askYes?.();
        }
      } else if (action === "cancel") {
        this.mode = "menu";
      }
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
    this.mainMenu.index = 0;
    this.mode = "menu";
  }

  private openFightMenu(): void {
    const foeTypes = speciesOf(this.theirs.active.mon).types;
    const usable = usableMoves(this.mine.active.mon);
    this.fightEff = [];
    const items =
      usable.length > 0
        ? usable.map((slot) => {
            const move = MOVES[slot.id];
            let marker = "";
            let eff: "super" | "weak" | "immune" | null = null;
            if (move.power > 0) {
              const mult = typeMultiplier(move.type, foeTypes);
              marker = mult === 0 ? "X " : mult >= 2 ? "▲ " : mult < 1 ? "▼ " : "";
              eff = mult === 0 ? "immune" : mult >= 2 ? "super" : mult < 1 ? "weak" : null;
            }
            this.fightEff.push(eff);
            return { label: move.name, rightLabel: `${marker}PP ${slot.pp}/${move.pp}` };
          })
        : [{ label: MOVES.comizio.name, rightLabel: "GRATIS" }];
    this.fightMenu = new Menu(items);
    this.mode = "fight";
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

  // ---- Draw ----

  draw(screen: Screen): void {
    if (this.finished) {
      return;
    }
    const ctx = screen.ctx;
    // SCREEN-SHAKE PIENO anche nel duello (come in BattleScene): tutto il frame
    // trasla su super-efficace/crit; il box azioni resta fermo (restore prima).
    const shake = this.fx.shakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    screen.clear("#f0f0e0");
    const bg = sceneImage("battle:bg", "ui/battle_bg.png");
    if (bg) {
      screen.image(bg, 0, 0, VIEW_W, VIEW_H - 44);
    } else {
      screen.rect(0, 0, VIEW_W, 76, "#d8e8c8");
      screen.rect(0, 76, VIEW_W, VIEW_H - 76 - 44, "#e8e0c8");
    }

    const slide = Math.max(0, Math.min(1, (this.introT - 0.25) / 0.6));
    const foeSlide = Math.round((1 - slide) * 90);
    const playerSlide = Math.round((1 - slide) * -90);

    drawEllipse(screen, 162 + foeSlide, 64, 64, 14, "#c0cc9c");
    drawEllipse(screen, 56 + playerSlide, 114, 76, 16, "#cabf96");

    const foeC = this.theirs.active;
    const myC = this.mine.active;
    const foeBlink = this.fx.flashT.foe > 0 && Math.floor(this.fx.flashT.foe * 16) % 2 === 0;
    if ((foeC.mon.hp > 0 || this.fx.faintT.foe > 0) && !foeBlink) {
      drawBattleMonster(screen, this.fx, foeC, 162 + foeSlide, 66, this.fx.lungeT.foe, false, "foe");
    }
    const playerBlink = this.fx.flashT.player > 0 && Math.floor(this.fx.flashT.player * 16) % 2 === 0;
    if ((myC.mon.hp > 0 || this.fx.faintT.player > 0) && !playerBlink) {
      drawBattleMonster(screen, this.fx, myC, 56 + playerSlide, 116, this.fx.lungeT.player, true, "player");
    }

    this.fx.drawParticles(screen);
    this.fx.drawDamageNumbers(screen);
    drawCombatantBox(screen, foeC.mon, this.displayHp.foe, FOE_BOX);
    drawCombatantBox(screen, myC.mon, this.displayHp.player, PLAYER_BOX);
    // Targhetta avversario + riserve (pallini squadra) sotto il suo box.
    const nick = this.opts.opponentNick.slice(0, 10);
    screen.rect(FOE_BOX.x, FOE_BOX.y + FOE_BOX.h + 1, nick.length * 6 + 22, 9, "rgba(16,20,31,0.8)");
    screen.text(`DI ${nick}`, FOE_BOX.x + 2, FOE_BOX.y + FOE_BOX.h + 2, "#9cd8e8");
    this.drawTeamDots(screen, this.theirs.party, FOE_BOX.x + 2, FOE_BOX.y + FOE_BOX.h + 13);
    this.drawTeamDots(screen, this.mine.party, PLAYER_BOX.x + 2, PLAYER_BOX.y - 7);

    this.fx.drawEffFx(screen);

    // Fine screen-shake: menu/box e cerchio d'apertura restano stabili.
    ctx.restore();

    screen.panel(0, VIEW_H - 44, VIEW_W, 44);
    if (this.mode === "menu") {
      this.drawMainMenu(screen);
    } else if (this.mode === "fight") {
      this.drawFightMenu(screen);
    } else if (this.mode === "ask") {
      const lines = wrapText(this.askText, 28);
      for (let i = 0; i < Math.min(2, lines.length); i += 1) {
        screen.text(lines[i], 10, VIEW_H - 34 + i * 13, INK);
      }
      this.askMenu.draw(screen, VIEW_W - 58, VIEW_H - 42, 50, 11);
    } else if (this.mode === "wait") {
      screen.text("IN ATTESA DELL'AVVERSARIO...", 10, VIEW_H - 32, INK);
      if (this.waitTimer <= 10) {
        screen.text(`RISPONDE ENTRO ${Math.max(0, Math.ceil(this.waitTimer))}S O PERDE A TAVOLINO`, 10, VIEW_H - 20, GREY);
      }
    }
    this.msg.draw(screen);

    if (this.introT < 0.55) {
      const ctx = screen.ctx;
      const radius = (this.introT / 0.55) * 160;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, VIEW_W, VIEW_H);
      ctx.arc(VIEW_W / 2, VIEW_H / 2, Math.max(1, radius), 0, Math.PI * 2);
      ctx.clip("evenodd");
      ctx.fillStyle = "#10141f";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }
  }

  private drawTeamDots(screen: Screen, party: Monster[], x: number, y: number): void {
    for (let i = 0; i < party.length; i += 1) {
      const alive = party[i].hp > 0;
      screen.rect(x + i * 7, y, 5, 5, alive ? "#48b848" : "#5a5a5a");
    }
  }

  private drawMainMenu(screen: Screen): void {
    const labels = ["LOTTA", "SQUADRA", "RESA"];
    const w = 100;
    const x = VIEW_W - w;
    const y = VIEW_H - 44;
    screen.panel(x, y, w, 44);
    for (let i = 0; i < labels.length; i += 1) {
      const cy = y + 6 + i * 12;
      if (this.mainMenu.index === i) {
        screen.text("►", x + 8, cy, INK);
      }
      screen.text(labels[i], x + 16, cy, INK);
    }
    screen.text("AZIONE?", 16, y + 8, INK);
    screen.text(`TURNO ${this.turn}`, 8, y + 21, GREY);
  }

  private drawFightMenu(screen: Screen): void {
    const items = this.fightMenu.items;
    const y = VIEW_H - 44;
    for (let i = 0; i < items.length; i += 1) {
      const cx = 8;
      const cy = y + 4 + i * 9;
      const eff = this.fightEff[i];
      const color =
        eff === "super" ? "#2f9a4c" : eff === "weak" ? "#c06030" : eff === "immune" ? "#8a8a98" : INK;
      if (this.fightMenu.index === i) {
        screen.rect(cx - 2, cy - 2, 226, 9, "#fff0bd");
        screen.rect(cx - 2, cy - 2, 2, 9, "#e0a92f");
        screen.text("►", cx, cy, "#8c5b12");
      }
      screen.textFit(items[i].label, cx + 8, cy, 173, color);
      screen.textRight(items[i].rightLabel ?? "", 228, cy, INK);
    }
  }
}
