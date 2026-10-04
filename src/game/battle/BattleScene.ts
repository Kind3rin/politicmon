import {openUiSheet} from "../../ui/kit/sheet";
import {memeForm} from "../memeForms";
import { TeachScene } from "../../scenes/TeachScene";
import { openingRecruitmentExp } from "../firstCampaign";
import { healingQuote } from "../supplyGuide";
import { ITEMS } from "../../data/items";
import { MOVES, STATUS_NAMES, moveSummary, type Move } from "../../data/moves";
import type { TrainerDef } from "../../data/trainers";
import { audio } from "../../engine/audio";
import type { Input } from "../../engine/input";
import type { Scene, SceneStack } from "../../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import { sceneImage } from "../../engine/assets";
import { markCaught, markSeen, saveGame, type GameState } from "../state";
import { addSondaggi, bumpSondaggi, expMalus, hasMinistro } from "../governo";
import { bumpDailyQuest } from "../dailyquests";
import { recordBattleResult, recordBattleStarted, recordHealingItemUsed, recordPartyKo } from "../runstats";
import { zoneProgress } from "../../data/dexzones";
import {
  abilityOf, evolve, expForLevel, expYield, gainExp, healMonster, LEVEL_CAP, levelEvolution, speciesOf,
  statsOf, type Monster
} from "../monster";
import {
  calcDamage, catchChance, chooseFoeMove, makeCombatant, moveOrder, runChance, statName,
  type AiProfile, type Combatant, type OffensiveTrigger
} from "./sim";
import {
  resolveEndTurn, resolveEntryAbility, resolveFuturoPhase, resolveHitReactionAbility,
  resolveKoAbility, resolvePreMove, statDropBlockReason, statusBlockReason
} from "./effectContract";
import { festivalScandaloChance } from "./atto3MoveEffects";
import { Menu, MessageBox } from "../../ui/widgets";
import {
  approach, BattleFx, drawBattleBackdrop, drawBattleMonster, drawEllipse, monsterCenter, battleGeometry
} from "./view";
import { PartyScene } from "../../scenes/PartyScene";
import { BagScene } from "../../scenes/BagScene";
import { EvolutionScene } from "../../scenes/EvolutionScene";
import { DOCTRINE_LABEL, type ElectionDoctrine } from "../electionDoctrine";
import { buildTrainerVictoryPlan } from "./postBattle";
import { battleBackdropForMap, type BattleBackdrop } from "./backdrop";
import { moraleExpMultiplier } from "../morale";
import { BattleIntelScene } from "../../scenes/BattleIntelScene";
import { trainerAi, trainerStyle } from "./trainerStyle";
import { switchPreview, damageRange, replyRange } from "./tactics";
import { POSTURES, postureBlocksStatus, postureDamage, postureDealt, postureKeepsPP, posturePolemica, postureTaken, type Posture } from "./posture";
import { Polemica, FUORIONDA, fuoriondaDamage, recruitmentChance } from "./polemica";
import { chooseFieldEvent, applyFieldEvent, fieldPreview, type BattleField } from "./fieldEvents";
import type { TouchAction } from "../../engine/touchActions";
import type { UiPanel } from "../../ui/kit";
import { readableCopy } from "../../ui/kit/copy";
import { moveDescription, moveCardDescription } from "../../ui/kit/moveContent";

export type BattleResult = "win" | "loss" | "caught" | "run";

interface Step {
  text?: string;
  run?: () => void;
  waitHp?: boolean;
  pause?: number;
}

export interface BattleOptions {
  state: GameState;
  foeTeam: Monster[];
  trainer?: TrainerDef;
  music?: string; // override (es. leggendari)
  legendary?: boolean; // mette in scena l'incontro come "leggendario" (epico)
  encounterIntro?: string;
  /** Who moves first on turn one: a candidate caught asleep, or one that caught the player. */
  advantage?: "player" | "foe";
  // RIVINCITA (R42 economia): true se è un rematch di un trainer già battuto. Lo
  // SPOT IN PRIME TIME (+50% fondi) è ESCLUSO dai rematch: il bonus resta un
  // acceleratore sui trainer di storia/nuovi, non un faucet sui ribattuti.
  isRematch?: boolean;
  electionDoctrine?: ElectionDoctrine;
  maxBattleHealingItems?: number | null;
  onEnd: (result: BattleResult) => void;
}

// Boss narrativi: tema musicale dedicato (e IA boss-grade in computeAiProfile).
// Esportato: la WorldScene lo usa per l'hold-item extra dei boss in HARD MODE.
export const BOSS_TRAINER_IDS = ["boss", "garante", "ilcapitano", "tesoriere", "commissione", "campo-photographer", "futuro-anteriore", "partner-perfetto", "algoritmo-sovrano"];

function battleMusic(opts: BattleOptions): string {
  if (opts.music) {
    return opts.music;
  }
  if (!opts.trainer) {
    return "battle-wild";
  }
  if (BOSS_TRAINER_IDS.includes(opts.trainer.id)) {
    return "battle-boss";
  }
  return opts.trainer.badge ? "battle-gym" : "battle-trainer";
}

export class BattleScene implements Scene {
  private readonly backdrop: BattleBackdrop;
  private state: GameState;
  private foeTeam: Monster[];
  private trainer?: TrainerDef;
  private isRematch = false; // rematch: nega lo SPOT bonus (R42 economia)
  private onEnd: (result: BattleResult) => void;

  private player!: Combatant;
  private foe!: Combatant;
  private foeIndex = 0;
  private ai!: AiProfile; // profilo di difficoltà, calcolato dal contesto

  private queue: Step[] = [];
  private mode: "queue" | "menu" | "fight" | "campaign" | "recruit" = "queue";
  private msg = new MessageBox();
  private actionCaption: { actor: string; move: string; result: string } | null = null;
  private polemica = new Polemica();
  private firstOrder: "player" | "foe" | null = null;
  private buferaDone?: WeakSet<Combatant>;
  private posture: Posture = "none";
  private turnPosture: Posture = "none";
  private foeIntent: Move | null = null;
  private recruitBall = "";
  private battery = 3;
  private copione = false;
  private copioneFxT = 0;
  private field?: BattleField;
  private fieldTurn = 0;
  private fieldResolved = false;
  private fieldFxT = 0;
  private fieldNotice = "";
  private viewHeight = VIEW_H;

  get touchLayout(): "battle" | undefined { return this.state.pos.mapId === "route1" ? "battle" : undefined; }
  get expandedViewport(): boolean { return true; }
  private finisherT = 0;
  private mainMenu = new Menu([
    { label: "LOTTA" }, { label: "BORSA" }, { label: "SQUADRA" }, { label: "FUORIONDA" }, { label: "CAMPAGNA" }, { label: "FUGA" }
  ]);
  private campaignMenu = new Menu([]);
  private catchBoost = false; // APPELLO AL VOTO: raddoppia la prossima cattura
  private fightMenu = new Menu([]);
  // Efficacia per mossa (allineata a fightMenu.items): colora le label nel
  // menu LOTTA se la specie avversaria è già nel Dex.
  // true quando il menu LOTTA mostra il solo COMIZIO di riserva (tutte le mosse a 0 PP).

  private displayHp = { player: 0, foe: 0 };
  private displayExp = 0;
  // Trigger offensivi già annunciati in QUESTA battaglia (chiave specie:effetto):
  // ogni effetto (MAGGIORANZA/OPPOSIZIONE/WHATEVER/CAIMANO/SANTINO/AGENDA ROSSA)
  // si annuncia una volta sola per specie, come i difensivi (LODO/GILET).
  private announcedOffensive = new Set<string>();
  private futuroPhaseTriggered = false;
  private electionDoctrine: ElectionDoctrine = "none";
  private electionDoctrineTriggered = false;
  private electionTurn = 0;
  private maxBattleHealingItems: number | null = null;
  private battleHealingItemsUsed = 0;
  private runAttempts = 0;
  private finished = false;
  private resultRecorded = false;
  private ballAnim: { t: number; shakes: number; success: boolean; viral: boolean } | null = null;
  private captured = false; // il nemico è stato reclutato: niente più sprite in campo
  private recruitReceipt: { elapsed: number; destination: string; newDex: boolean; polls: number; growth: string; levels: string; modifiers: string[]; saved: boolean } | null = null;
  private growthReceipt: { elapsed: number; previousLevel: number; previousExp: number; gained: number; shared: string; modifiers: string[] } | null = null;
  private stepTimer = 0;
  private introT = 0; // apertura a cerchio + slide degli sprite
  // Effetti visivi condivisi (shake, affondi, particelle, banner, telegrafia):
  // estratti in view.ts per il riuso nella PvpBattleScene.
  private fx = new BattleFx();
  // Incontro leggendario: aura dorata permanente sul nemico + banner d'ingresso.
  private isLegendary = false;
  private legendBanner = 0; // tempo del banner "LEGGENDARIO!" all'ingresso
  private firstSeenBanner = 0; // banner "UN VOLTO MAI VISTO!" alla scoperta
  private legendIntroFlash = 0; // lampo d'apertura drammatico

  constructor(private stack: SceneStack, private input: Input, opts: BattleOptions) {
    this.state = opts.state;
    sceneImage("battle:growth", "ui/battle/growth.png");
    this.backdrop = battleBackdropForMap(opts.state.pos.mapId);
    if (this.backdrop.path === "ui/battle_bg.png") sceneImage("battle:bg:prato-portrait", "ui/battle/prato-portrait.png");
    this.foeTeam = opts.foeTeam;
    this.trainer = opts.trainer;
    this.copione = opts.trainer?.id === "rival1" && Boolean(this.state.flags["opening-v2"]);
    if (this.copione) { this.battery = 2; sceneImage("battle:copione", "ui/battle/copione.png"); }
    this.firstOrder = opts.advantage ?? null;
    if (opts.advantage === "player") this.polemica.value = 1;
    this.isRematch = opts.isRematch ?? false;
    this.isLegendary = opts.legendary ?? false;
    this.electionDoctrine = opts.electionDoctrine ?? "none";
    this.maxBattleHealingItems = opts.maxBattleHealingItems ?? null;
    this.onEnd = opts.onEnd;
    if (!this.trainer) {
      sceneImage("battle:viral", "ui/battle/viral.png");
      sceneImage("battle:recruited", "ui/battle/recruited.png");
    }
    recordBattleStarted(this.state);
    if (!this.state.badges.length && ["borgo", "route1"].includes(this.state.pos.mapId) && this.state.runStats.captures > 0 && !opts.legendary && !this.copione) {
      this.field = chooseFieldEvent(this.state.runStats.battles);
    }
    // Accessibilità: RIDUCI EFFETTI azzera shake/flash. Passa la scelta a BattleFx
    // (screen-shake) e la usa la scena per i lampi (KO/level/cattura/leggendario).
    this.fx.reduceEffects = this.state.reduceEffects;

    // Difesa: non mandare mai in campo un mon a 0 HP. Se l'intero party è
    // svenuto (save corrotto da kill in background mid-lotta) lo si cura, così
    // non si entra in battaglia con un mostro morto che sviene subito.
    if (this.state.party.length > 0 && this.state.party.every((m) => m.hp <= 0)) {
      for (const m of this.state.party) {
        healMonster(m);
      }
    }
    const lead = this.state.party.find((m) => m.hp > 0) ?? this.state.party[0];
    this.player = makeCombatant(lead);
    this.foe = makeCombatant(this.foeTeam[0]);
    if (this.copione) this.foe.stages.atk = 2;
    this.displayHp.player = lead.hp;
    this.displayHp.foe = this.foe.mon.hp;
    this.displayExp = this.expRatio();
    // Prima volta che incontri questa specie: banner "UN VOLTO MAI VISTO!"
    // (la scoperta del nuovo è il gancio più forte della collezione).
    const firstTime = markSeen(this.state, this.foe.mon.speciesId);
    if (firstTime && !opts.legendary && !opts.trainer) {
      this.firstSeenBanner = 2.2;
    }

    sceneImage("battle:fuorionda", "ui/battle/fuorionda.png");
    this.ai = this.computeAiProfile();
    audio.playMusic(battleMusic(opts));
    if (this.isLegendary) {
      // Messa in scena epica: lampo d'ingresso + banner "LEGGENDARIO!" + sting,
      // così si capisce subito che NON è un incontro qualsiasi. Con RIDUCI EFFETTI
      // il lampo bianco è soppresso (il banner testuale resta: l'info non sparisce).
      this.legendIntroFlash = this.state.reduceEffects ? 0 : 1.0;
      this.legendBanner = 2.4;
      audio.encounterSting();
      this.push({ text: `Un'aura dorata squarcia la campagna elettorale...` });
      this.push({ text: `POLITICMON LEGGENDARIO! ${this.foeName()} si manifesta!` });
    } else if (this.trainer) {
      for (const line of this.trainer.intro) {
        this.push({ text: line });
      }
      if (this.trainer.id === "algoritmo-sovrano") this.push({ text: `DOTTRINA SNAPSHOT: ${DOCTRINE_LABEL[this.electionDoctrine]}!` });
    } else {
      this.push({ text: opts.encounterIntro ?? `Un ${this.foeName()} selvatico sbuca dalla campagna elettorale!` });
    }
    this.pushEntryAbility(this.foe, this.player, `Il nemico ${this.foeName()}`);
    // SONDAGGI COME METEO: annuncio a inizio battaglia quando il gradimento
    // attiva il modificatore (+15% ai tipi establishment o anti-establishment).
    // Solo PVE: il duello PvP non passa mai dai SONDAGGI.
    const sond = this.state.sondaggi;
    if (sond >= 70) {
      this.push({ text: "IL VENTO POLITICO SOFFIA A FAVORE DEL GOVERNO!" });
      this.push({ text: "Mosse ISTITUZIONE/TECNO/CENTRO/MEDIA potenziate (+15%)." });
    } else if (sond <= 40) {
      this.push({ text: "IL VENTO POLITICO SOFFIA A FAVORE DELL'OPPOSIZIONE!" });
      this.push({ text: "Mosse POPULISMO/DESTRA/SINISTRA/VERDE potenziate (+15%)." });
    }
    this.pushEntryAbility(this.player, this.foe, this.playerName());
  }

  // VOLTAGABBANA: l'effetto (+1 OPPORTUNISMO) è applicato da makeCombatant;
  // qui si annuncia soltanto, a ogni ingresso in campo.
  private pushEntryAbility(c: Combatant, opponent: Combatant, name: string): void {
    if (abilityOf(c.mon)?.id === "voltagabbana") {
      this.push({ text: `${name} cambia casacca al volo: OPPORTUNISMO sale!` });
    }
    const entry = resolveEntryAbility(c, opponent);
    if (entry.triggered) {
      c.stages = entry.entrantStages;
      opponent.stages = entry.opponentStages;
      this.push({ text: `${name} fa TABULA RASA: ogni modifica alle statistiche è azzerata!` });
    }
  }

  // ---- Helpers ----

  // Profilo di difficoltà dell'IA in base al contesto. I wild e i primi
  // allenatori sbagliano spesso, non si curano da fenomeni e lasciano scampo al
  // giocatore agli sgoccioli; palestre e boss restano competenti. Così la curva
  // di difficoltà sale con la partita invece di partire al massimo.
  private computeAiProfile(): AiProfile {
    return trainerAi(this.trainer?.id ?? "", Boolean(this.trainer?.badge), this.state.hardMode, this.state.badges.length);
  }

  private playerName(): string {
    return speciesOf(this.player.mon).name;
  }

  private foeName(): string {
    return speciesOf(this.foe.mon).name;
  }

  private push(step: Step): void {
    this.queue.push(step);
  }

  private expRatio(): number {
    const mon = this.player.mon;
    if (mon.level >= LEVEL_CAP) {
      return 1;
    }
    const cur = expForLevel(mon.level);
    const next = expForLevel(mon.level + 1);
    return Math.max(0, Math.min(1, (mon.exp - cur) / (next - cur)));
  }

  private endBattle(result: BattleResult): void {
    this.push({
      run: () => {
        this.finished = true;
        this.recordResult(result);
        audio.playMusic(null);
        this.onEnd(result);
      }
    });
  }

  private recordResult(result: BattleResult): void {
    if (this.resultRecorded) return;
    this.resultRecorded = true;
    recordBattleResult(this.state, result);
    const won = result === "win";
    const coppa = this.trainer?.id.startsWith("coppa:") ?? false;
    // EXP: KO and recruitment; tournament EXP belongs to its temporary team.
    if ((won || result === "caught") && !coppa && this.state.boostExpBattles > 0) this.state.boostExpBattles -= 1;
    if (won && this.trainer) {
      // Funds exclude rematches/tournaments; their polling boost still applies.
      if (!this.isRematch && !coppa && this.state.boostMoneyBattles > 0) this.state.boostMoneyBattles -= 1;
      if (this.state.boostSondBattles > 0) this.state.boostSondBattles -= 1;
    }
  }

  // ---- Turn building ----

  private startTurn(playerMove: Move): void {
    this.turnPosture = playerMove.id === FUORIONDA.id ? "none" : this.posture;
    this.posture = "none";
    if (posturePolemica(this.turnPosture) && this.polemica.value < 3) this.polemica.value += 1;
    this.advanceField();
    this.electionTurn += 1;
    this.drainBattery();
    if (this.electionDoctrine === "destra_competitiva" && !this.electionDoctrineTriggered && this.electionTurn >= 7) {
      this.electionDoctrineTriggered = true;
      this.foe.stages.atk = Math.min(6, this.foe.stages.atk + 2);
      this.foe.stages.def = Math.max(-6, this.foe.stages.def - 1);
      this.push({ text: "DESTRA COMPETITIVA: ATTACCO +2, DIFESA -1!" });
    }
    if (this.trainer?.id === "futuro-anteriore") {
      const phase = resolveFuturoPhase(this.foe, this.futuroPhaseTriggered);
      if (phase.triggered) {
        this.futuroPhaseTriggered = true;
        this.foe.stages = phase.stages;
        this.push({ text: "PARTITO NUOVO! Il boss azzera i malus e cerca un'ALLEANZA: VELOCITÀ +1!" });
      }
    }
    const slot = this.player.mon.moves.find((s) => s.id === playerMove.id);
    if (slot && !postureKeepsPP(this.turnPosture)) {
      slot.pp = Math.max(0, slot.pp - 1);
    }
    const foeMove = this.takeFoeIntent();
    const forced = this.firstOrder;
    this.firstOrder = null;
    const order = forced ?? moveOrder(this.player, this.foe, playerMove, foeMove);
    const playerFirst = order === "tie" ? Math.random() < 0.5 : order === "player";

    const first = playerFirst ? "player" : "foe";
    const second = playerFirst ? "foe" : "player";
    // Identità dei combattenti a inizio turno: un KO annulla l'azione rimasta.
    // Il solo check sugli HP non basta: dopo il cambio post-KO this.player/
    // this.foe puntano al RIMPIAZZO (vivo), e la mossa scelta dal caduto
    // partiva eseguita dal nuovo entrato (magari senza nemmeno conoscerla).
    const pC = this.player;
    const fC = this.foe;
    this.pushMove(first, first === "player" ? playerMove : foeMove, true);
    this.push({
      run: () => {
        if (this.player === pC && this.foe === fC && pC.mon.hp > 0 && fC.mon.hp > 0) {
          this.pushMoveNow(second, second === "player" ? playerMove : foeMove, false);
        }
      }
    });
    this.pushEndOfTurn();
  }

  private pushMoveNow(side: "player" | "foe", move: Move, actedFirst = true): void {
    // Inserisce gli step della mossa in testa alla coda (dopo lo step corrente).
    const saved = this.queue;
    this.queue = [];
    this.pushMove(side, move, actedFirst);
    this.queue = [...this.queue, ...saved];
  }

  private pushMove(side: "player" | "foe", move: Move, actedFirst = true): void {
    const attacker = side === "player" ? this.player : this.foe;
    const defender = side === "player" ? this.foe : this.player;
    const attackerName = side === "player" ? this.playerName() : `Il nemico ${this.foeName()}`;

    this.push({
      run: () => {
        if (attacker.mon.hp <= 0 || defender.mon.hp <= 0) {
          return;
        }
        const preMove = resolvePreMove(attacker, Math.random);
        attacker.gaffeTurns = preMove.gaffeTurns;
        if (preMove.event === "indagato") {
          this.pushFront([{ text: `${attackerName} è trattenuto in audizione! Non può agire!` }]);
          return;
        }
        if (preMove.event === "gaffeEnd") {
          this.pushFront([{ text: `${attackerName} ha chiarito la GAFFE con una nota stampa!` }]);
        } else if (preMove.event === "gaffeSelf") {
          attacker.mon.hp = Math.max(0, attacker.mon.hp - preMove.selfDamage);
          this.pushFront([
            { text: `${attackerName} riformula la GAFFE e peggiora tutto!`, waitHp: true, run: () => audio.hit() },
            ...this.koCheckSteps(side === "player" ? "player" : "foe")
          ]);
          return;
        }
        this.pushFront(this.moveSteps(side, attacker, defender, move, attackerName, actedFirst));
      }
    });
  }

  private pushFront(steps: Step[]): void {
    this.queue = [...steps, ...this.queue];
  }

  // Contromossa del nemico dopo un'azione del giocatore che consuma il turno
  // (cambio/oggetto/scheda/fuga fallita). UNICO punto che sceglie e fa partire
  // la mossa del nemico "fuori dallo scambio normale": passa SEMPRE da
  // pushMoveNow → pushMove, quindi eredita il blocco status (INDAGATO 25% /
  // GAFFE autodanno) esattamente come lo scambio di startTurn. Prima ogni
  // callsite duplicava questo giro: alcuni rischiavano di aggirare il check.
  private foeCounterStep(): Step {
    return {
      run: () => {
        this.turnPosture = "none";
        if (this.foe.mon.hp > 0) {
          const saved = this.queue;
          this.queue = [];
          this.advanceField();
          const event = this.queue;
          this.queue = saved;
          this.pushMoveNow("foe", this.takeFoeIntent());
          this.pushFront(event);
          this.drainBattery();
        }
      }
    };
  }

  private advanceField(): void {
    this.fieldTurn += 1;
    if (!this.field || this.fieldTurn !== 2 || this.field.id === "click") return;
    this.fieldResolved = true;
    this.fieldNotice = applyFieldEvent(this.field, this.player, this.foe);
    this.fieldFxT = 1.4;
    this.push({ pause: .25, waitHp: true });
  }

  private drainBattery(): void {
    if (!this.copione && this.trainer?.id === "rival1" && --this.battery === 0) {
      this.foe.stages.atk = Math.max(-6, this.foe.stages.atk - 1);
      this.pushFront([{ text: "BATTERIA 0%! Copione perso: GRINTA -1." }]);
    }
  }

  private breakCopione(): void {
    if (!this.copione || this.battery <= 0) return;
    this.battery = 0;
    this.foe.stages.atk = Math.max(-6, this.foe.stages.atk - 3);
    this.copioneFxT = this.state.reduceEffects ? 0 : .6;
    this.pushFront([{ pause: this.state.reduceEffects ? .12 : .6 }, { text: "FUORI COPIONE! SCUDO VIA. GRINTA -3." }]);
  }

  private copioneDamage(damage: number, move: Move): number {
    return this.copione && this.battery > 0 && move.id !== FUORIONDA.id && damage > 0 ? Math.max(1, Math.floor(damage / 2)) : damage;
  }

  private pickFoeIntent(): Move {
    if (this.copione && this.battery > 0 && this.foe.mon.moves.some(slot => slot.id === "comizio" && slot.pp > 0)) return MOVES.comizio;
    return chooseFoeMove(this.foe, this.player, this.ai, Math.random, { sondaggi: this.state.sondaggi });
  }

  private takeFoeIntent(): Move {
    const move = this.foeIntent ?? this.pickFoeIntent();
    this.foeIntent = null;
    return move;
  }

  private useFuorionda(): void {
    if (!this.polemica.spend()) return;
    audio.confirm();
    this.mode = "queue";
    this.startTurn(FUORIONDA);
  }

  private catchEstimate(itemId: string, viral = false): number {
    return recruitmentChance(catchChance(this.foe.mon, itemId, hasMinistro(this.state, "propaganda") ? 1.25 : 1, this.foe.gaffeTurns > 0), this.catchBoost, viral);
  }

  private supplyInfo(itemId: string): { hint: string; disabled: boolean } {
    const item = ITEMS[itemId], qty = this.state.bag[itemId] ?? 0;
    const blocked = (hint: string) => ({ hint, disabled: true });
    if (!item || qty < 1) return blocked("Scorta esaurita");
    if (item.kind === "ball") return this.trainer ? blocked("Allenatore: non reclutabile") : { hint: `${Math.round(this.catchEstimate(itemId) * 100)}% · se fallisce, risponde`, disabled: this.foe.mon.hp <= 0 };
    if (!["heal", "cure"].includes(item.kind)) return blocked("Si prepara fuori dalla lotta");
    if (this.maxBattleHealingItems !== null && this.battleHealingItemsUsed >= this.maxBattleHealingItems) return blocked("Limite cure raggiunto");
    if (this.player.mon.hp <= 0) return blocked("KO: serve un cambio");
    if (item.kind === "heal") {
      const quote = healingQuote(this.state, this.player.mon, itemId);
      return quote ? { hint: `PV ${quote.before} → ${quote.after}/${quote.max} · nemico risponde`, disabled: false } : blocked("PV pieni");
    }
    const status = this.player.mon.status;
    return status || this.player.gaffeTurns > 0 ? { hint: `${status ? STATUS_NAMES[status] : "GAFFE"}${status && this.player.gaffeTurns > 0 ? " + GAFFE" : ""} via · nemico risponde`, disabled: false } : blocked("Nessuno status da curare");
  }

  private openBag(): void {
    this.stack.push(new BagScene(this.stack, this.input, this.state, { inBattle: true, battleItem: id => this.supplyInfo(id), onCampaign: () => this.openCampaignMenu(), onUse: id => this.useItem(id) }));
  }

  private openRecruit(): void {
    this.recruitBall = Object.keys(this.state.bag).find(id => this.state.bag[id] > 0 && ITEMS[id]?.kind === "ball") ?? "scheda";
    this.mode = "recruit";
  }

  private orderLabel(move: Move): TouchAction["order"] {
    if (!this.foeIntent) return undefined;
    const [player, previewFoe] = fieldPreview(this.field, this.fieldTurn, this.player, this.foe);
    const foe = this.trainer?.id === "futuro-anteriore"
      ? { ...previewFoe, stages: resolveFuturoPhase(previewFoe, this.futuroPhaseTriggered).stages } : previewFoe;
    const order = this.firstOrder ?? moveOrder(player, foe, move, this.foeIntent);
    return order === "player" ? "AGISCI PRIMA" : order === "foe" ? "AGISCI DOPO" : "PARITÀ: 50%";
  }

  private moveHint(move: Move): string {
    const [player, foe] = fieldPreview(this.field, this.fieldTurn, this.player, this.foe);
    const stat = move.effect?.stat;
    if (stat) {
      const target = stat.target === "self" ? player : foe;
      if (move.power === 0 && stat.target === "foe" && stat.stages < 0 && statDropBlockReason(target.mon)) return `BLOCCATA: ${statDropBlockReason(target.mon) === "garanzia" ? "GARANZIA" : "POLTRONA SALDA"}`;
      if (target.stages[stat.key] === (stat.stages > 0 ? 6 : -6)) return "STATISTICA GIÀ AL LIMITE";
    }
    if (move.power > 0) {
      const range = damageRange(player, foe, move, { sondaggi: this.state.sondaggi });
      return `STIMA ${this.copioneDamage(range.min, move)}-${this.copioneDamage(range.max, move)} / +${range.max > 0 ? this.polemica.gainFor(move) : 0} P${this.copione && this.battery > 0 ? " · SCUDO ×½" : ""}`;
    }
    return `${moveSummary(move)} / +${this.polemica.gainFor(move)} P${this.copione && this.battery > 0 && stat ? " · ROMPE COPIONE" : this.foeIntent?.power ? ` · RISPOSTA ${this.replyDamage(move)} PV` : ""}`;
  }

  private replyDamage(preparation?: Move): string {
    if (!this.foeIntent) return "—";
    const [player, foe] = fieldPreview(this.field, this.fieldTurn, this.player, this.foe);
    const range = replyRange(player, foe, this.foeIntent, preparation, { sondaggi: this.state.sondaggi });
    const taken = postureTaken(this.posture);
    return taken === 1 ? `${range.min}-${range.max}` : `${postureDamage(range.min, taken)}-${postureDamage(range.max, taken)}`;
  }

  /** Scandalo + gaffe on the same target: one-off storm that costs an eighth of its health. */
  private buferaStep(defender: Combatant, defenderName: string, defenderSide: "player" | "foe"): Step {
    return { run: () => {
      const done = (this.buferaDone ??= new WeakSet<Combatant>());
      if (defender.mon.hp <= 0 || done.has(defender) || defender.mon.status !== "scandalo" || defender.gaffeTurns <= 0) return;
      done.add(defender);
      const loss = Math.max(1, Math.floor(statsOf(defender.mon).hp / 8));
      this.pushFront([
        { text: `BUFERA! Scandalo e gaffe insieme: ${defenderName} perde ${loss} PV.`, run: () => { defender.mon.hp = Math.max(0, defender.mon.hp - loss); audio.hit(); }, waitHp: true },
        ...this.koCheckSteps(defenderSide)
      ]);
    } };
  }

  private moveSteps(
    side: "player" | "foe",
    attacker: Combatant,
    defender: Combatant,
    move: Move,
    attackerName: string,
    actedFirst: boolean
  ): Step[] {
    const defenderName = side === "player" ? `Il nemico ${this.foeName()}` : this.playerName();
    const steps: Step[] = [];
    if (this.field?.id === "click" && this.fieldTurn === 2 && !this.fieldResolved) {
      this.fieldResolved = true;
      this.fieldFxT = 1.4;
      const gain = side === "player" && this.polemica.value < 3;
      if (gain) this.polemica.value += 1;
      this.fieldNotice = side === "player" ? `DOMANDA ACCETTATA. POLEMICA +${gain ? 1 : 0}.` : "IL NEMICO ERA PRIMO.\nFONDI FINITI. POLEMICA +0.";
      steps.push({ pause: .25 });
    }
    const before = {
      hp: defender.mon.hp, status: defender.mon.status, gaffe: defender.gaffeTurns,
      own: { ...attacker.stages }, foe: { ...defender.stages }
    };

    if (move.id === FUORIONDA.id) steps.push({
      run: () => { this.finisherT = this.state.reduceEffects ? 0 : .8; audio.hitSuper(); }, pause: this.state.reduceEffects ? .12 : .8
    });
    // Name and wind-up share the impact's caption instead of a separate page.
    steps.push({
      run: () => {
        this.actionCaption = { actor: `${side === "player" ? "TU" : "NEMICO"} · ${side === "player" ? this.playerName() : this.foeName()}`, move: move.name, result: "" };
        if (side === "foe") {
          const color = move.category === "fisico" ? "#e85a5a" : move.category === "speciale" ? "#5a9ae8" : "#b86ad8";
          this.fx.telegraph = { side, color, t: .35, max: .35 };
        }
      },
      pause: .18
    });

    if (side === "foe") {
      const slot = attacker.mon.moves.find((s) => s.id === move.id);
      if (slot) {
        slot.pp = Math.max(0, slot.pp - 1);
      }
    }

    const selfTargeted = move.power === 0 && !move.effect?.status && move.effect?.stat?.target !== "foe";
    if (!selfTargeted && Math.random() * 100 >= move.accuracy) {
      steps.push({ run: () => { this.actionCaption!.result = "ANNUNCIO A VUOTO · MANCATO"; }, pause: .85 });
      return steps;
    }

    if (move.power > 0) {
      // Contesto SONDAGGI (meteo politico): SOLO qui nel PVE; il duello resta neutro.
      const result = move.id === FUORIONDA.id
        ? { damage: fuoriondaDamage(statsOf(defender.mon).hp), crit: false, typeMult: 1, offensive: [], pollEstimate: undefined, lodo: false }
        : calcDamage(attacker, defender, move, Math.random, { sondaggi: this.state.sondaggi });
      const civicFavored = this.electionDoctrine === "lista_civica" && side === "foe"
        && ((this.electionTurn % 2 === 1 && move.category === "fisico") || (this.electionTurn % 2 === 0 && move.category === "speciale"));
      const baseDamage = side === "player" ? this.copioneDamage(result.damage, move) : civicFavored ? Math.max(1, Math.round(result.damage * 1.15)) : result.damage;
      const postureFactor = move.id === FUORIONDA.id ? 1 : side === "player" ? postureDealt(this.turnPosture) : postureTaken(this.turnPosture);
      const appliedDamage = postureFactor === 1 ? baseDamage : postureDamage(baseDamage, postureFactor);
      steps.push({
        run: () => {
          const lost = Math.min(defender.mon.hp, appliedDamage);
          defender.mon.hp = Math.max(0, defender.mon.hp - appliedDamage);
          const efficacy = result.typeMult === 0 ? "IMMUNE" : result.typeMult > 1
            ? move.type === "SINISTRA" && speciesOf(defender.mon).types.includes("SINISTRA") ? `SCISSIONE x${result.typeMult}` : "SUPER EFFICACE"
            : result.typeMult < 1 ? "POCO EFFICACE" : "";
          this.actionCaption!.result = [`-${lost} PV`, result.crit ? "CRITICO" : "", efficacy].filter(Boolean).join(" · ");
          this.fx.onHit(side, result.typeMult, result.crit, lost, move.type);
        },
        waitHp: true,
        pause: .85
      });
      steps.push({
        waitHp: true,
        run: () => {
          if (side === "player" && !this.electionDoctrineTriggered && this.electionDoctrine === "campo_largo" && this.foe.mon.hp > 0 && this.foe.mon.hp <= statsOf(this.foe.mon).hp / 2) {
            this.electionDoctrineTriggered = true;
            this.foe.stages.def = Math.min(6, this.foe.stages.def + 1);
            this.pushFront([{ text: "DIFESA COLLETTIVA: la squadra del boss alza la DIFESA!" }]);
          } else if (side === "player" && !this.electionDoctrineTriggered && this.electionDoctrine === "centro_mobile" && result.typeMult > 1) {
            this.electionDoctrineTriggered = true;
            for (const key of ["atk", "def", "spc", "spd"] as const) this.foe.stages[key] = Math.max(0, this.foe.stages[key]);
            this.foe.stages.spd = Math.min(6, this.foe.stages.spd + 1);
            this.pushFront([{ text: "CENTRO MOBILE: malus azzerati, VELOCITÀ +1!" }]);
          }
          const reaction = resolveHitReactionAbility(defender);
          if (reaction.triggered) {
            defender.stages.spc = reaction.resulting;
            this.pushFront([{ text: `CONTRADDITTORIO! RETORICA di ${defenderName} sale!` }]);
          }
          const ko = resolveKoAbility(attacker, defender);
          if (ko.triggered) {
            attacker.stages.spd = ko.resulting;
            this.pushFront([{ text: `STAFFETTA! VELOCITÀ di ${attackerName} sale!` }]);
          }
        }
      });
      if (civicFavored) steps.push({ text: "LISTA CIVICA: formato favorito, POTENZA +15%!" });
      // Annuncio dei TRIGGER OFFENSIVI (R42): prima volta per specie in battaglia,
      // simmetrico ai difensivi (LODO/GILET/TEFLON) già parlanti.
      for (const trig of result.offensive ?? []) {
        const key = `${attacker.mon.speciesId}:${trig}`;
        if (this.announcedOffensive.has(key)) {
          continue;
        }
        this.announcedOffensive.add(key);
        steps.push({ text: OFFENSIVE_TRIGGER_TEXT[trig](attackerName) });
      }
      if (result.pollEstimate) {
        steps.push({ text: `FORCHETTA SONDAGGI: STIMA ${result.pollEstimate === "high" ? "ALTA" : "BASSA"}!` });
      }
      if (result.lodo) {
        steps.push({
          text: `Il LODO protegge ${defenderName}: primo colpo dimezzato!`,
          run: () => audio.holdGuard()
        });
      }
      if (move.effect?.drainRatio) {
        const healed = Math.max(1, Math.floor(result.damage * move.effect.drainRatio));
        steps.push({
          text: `${attackerName} assorbe consenso!`,
          run: () => {
            attacker.mon.hp = Math.min(statsOf(attacker.mon).hp, attacker.mon.hp + healed);
          },
          waitHp: true
        });
      }
      if (move.effect?.recoilRatio) {
        const recoil = Math.max(1, Math.floor(result.damage * move.effect.recoilRatio));
        steps.push({
          text: `${attackerName} subisce il contraccolpo della corrente interna!`,
          run: () => {
            attacker.mon.hp = Math.max(0, attacker.mon.hp - recoil);
            audio.hit();
          },
          waitHp: true
        });
      }
    }

    const effect = move.effect;
    if (effect?.healRatio) {
      steps.push({
        run: () => {
          const max = statsOf(attacker.mon).hp;
          attacker.mon.hp = Math.min(max, attacker.mon.hp + Math.floor(max * effect.healRatio!));
          audio.heal();
        },
        waitHp: true
      });
      steps.push({ text: `${attackerName} recupera consenso!` });
    }
    // Cura status: blocco INDIPENDENTE da healRatio. Prima era annidato dentro
    // if(healRatio), quindi NON CE N'È (cureStatus senza healRatio) non curava mai
    // nulla nonostante la UI promettesse "TOGLIE STATUS". Azzera anche gaffeTurns
    // (la GAFFE è un contatore su Combatant, non un mon.status).
    if (effect?.cureStatus) {
      const hadStatus = attacker.mon.status !== null || attacker.gaffeTurns > 0;
      steps.push({
        run: () => {
          attacker.mon.status = null;
          attacker.gaffeTurns = 0;
          if (hadStatus) {
            audio.heal();
          }
        }
      });
      if (hadStatus) {
        steps.push({ text: `${attackerName} si libera di ogni grana!` });
      }
    }
    if (effect?.stat) {
      const target = effect.stat.target === "self" ? attacker : defender;
      const targetName = effect.stat.target === "self" ? attackerName : defenderName;
      // POLTRONA SALDA (e GARANZIA COSTITUZIONALE): immune ai cali di statistica
      // inflitti dal nemico (replicato in duelsim.ts, stesso punto).
      const statBlock = statDropBlockReason(target.mon);
      if (
        effect.stat.target === "foe" &&
        effect.stat.stages < 0 &&
        statBlock
      ) {
        steps.push({
          text: statBlock === "garanzia"
            ? `GARANZIA COSTITUZIONALE! ${targetName} resta al di sopra delle parti.`
            : `POLTRONA SALDA! ${targetName} non si schioda di un millimetro.`,
          run: () => audio.abilityBlock()
        });
      } else if ((effect.stat.chance ?? 100) > Math.random() * 100) {
        steps.push({
          run: () => {
            target.stages[effect.stat!.key] = Math.max(
              -6, Math.min(6, target.stages[effect.stat!.key] + effect.stat!.stages)
            );
          }
        });
        steps.push({
          text: `${statName(effect.stat.key)} di ${targetName} ${effect.stat.stages > 0 ? "sale" : "scende"}${Math.abs(effect.stat.stages) > 1 ? " di brutto" : ""}!`
        });
      }
    }
    const conditionalStatus = effect?.statusIfFirst
      ? { ...effect.statusIfFirst, chance: festivalScandaloChance(actedFirst) }
      : undefined;
    const statusEffect = effect?.status ?? conditionalStatus;
    if (statusEffect && statusEffect.chance > 0 && defender.mon.hp > 0 && side === "foe" && postureBlocksStatus(this.turnPosture)) {
      steps.push({ text: "SMENTITA PRONTA: lo status viene respinto!", run: () => audio.abilityBlock() });
    } else if (statusEffect && statusEffect.chance > 0 && defender.mon.hp > 0) {
      // TEFLON (e GARANZIA COSTITUZIONALE): immune agli status (guard PRIMA del
      // tiro di chance, come in duelsim). TELECAMERA (hold): previene solo la GAFFE.
      const statusBlock = statusBlockReason(defender.mon, statusEffect.id);
      if (statusBlock) {
        if (statusEffect.chance >= 100) {
          steps.push({
            text: statusBlock !== "telecamera"
              ? (statusBlock === "garanzia"
                  ? `GARANZIA COSTITUZIONALE! Le accuse non scalfiscono ${defenderName}.`
                  : `TEFLON! Le accuse scivolano via da ${defenderName}.`)
              : `La TELECAMERA riprende tutto: ${defenderName} evita la GAFFE!`,
            run: () => audio.abilityBlock()
          });
        }
      } else if (Math.random() * 100 < statusEffect.chance) {
        const id = statusEffect.id;
        if (defender.mon.status || (id === "gaffe" && defender.gaffeTurns > 0)) {
          if (statusEffect.chance >= 100) {
            steps.push({ text: `${defenderName} è già nei guai fino al collo!` });
          }
        } else {
          steps.push({
            run: () => {
              if (id === "gaffe") {
                defender.gaffeTurns = 2 + Math.floor(Math.random() * 3);
              } else {
                defender.mon.status = id;
              }
            }
          });
          steps.push({ text: `${defenderName} è ${STATUS_NAMES[id]}!` });
        }
      }
    }

    steps.push(this.buferaStep(defender, defenderName, side === "player" ? "foe" : "player"));
    if (side === "player") steps.push({ run: () => {
      const changed = defender.mon.hp < before.hp || defender.mon.status !== before.status || defender.gaffeTurns !== before.gaffe ||
        (Object.keys(before.own) as Array<keyof typeof before.own>).some(key => attacker.stages[key] !== before.own[key] || defender.stages[key] !== before.foe[key]);
      if (this.polemica.reward(move, changed) > 0) audio.cursor();
      if (changed && move.power === 0 && !move.effect?.healRatio && !move.effect?.cureStatus) this.breakCopione();
    } });

    // KO del BERSAGLIO (colpito dalla mossa).
    steps.push(...this.koCheckSteps(side === "player" ? "foe" : "player"));
    // KO dell'ATTACCANTE: recoil (SCISSIONE/BREXIT) o autodanno possono portarlo a
    // 0 HP. Prima si controllava solo il bersaglio, quindi un auto-KO lasciava il
    // POLITICMON a 0 HP "vivo" e bloccato. Il check va DOPO quello del bersaglio:
    // se muoiono entrambi, il difensore sviene per primo (è caduto per il tuo colpo).
    steps.push(...this.koCheckSteps(side));
    return steps;
  }

  private koCheckSteps(side: "player" | "foe"): Step[] {
    return [
      {
        run: () => {
          const c = side === "player" ? this.player : this.foe;
          if (c.mon.hp > 0) {
            return;
          }
          if (side === "foe") {
            this.pushFront(this.foeFaintedSteps());
          } else {
            this.pushFront(this.playerFaintedSteps());
          }
        }
      }
    ];
  }

  private foeFaintedSteps(): Step[] {
    const steps: Step[] = [
      {
        // KO: freeze-frame (hit-stop lungo) + lampo bianco prima che lo sprite
        // svanisca, per dare peso alla sconfitta. Puro effetto: nessuna logica.
        run: () => {
          audio.faint();
          this.fx.hitStop = Math.max(this.fx.hitStop, 0.25);
          this.fx.koFlash = 0.5;
          this.fx.faintT.foe = 0.55;
        },
        pause: 0.15
      }
    ];
    return [...steps, ...this.consensusSteps(() => this.afterFoeDown())];
  }

  private consensusSteps(after: () => void, recruit = false): Step[] {
    const steps: Step[] = [];
    const istruzione = hasMinistro(this.state, "istruzione");
    const base = expYield(this.foe.mon, Boolean(this.trainer), this.player.mon.level);
    // ONDA DEL CONSENSO (feature originale): l'EXP scala coi SONDAGGI.
    // Popolarità alta = i tuoi crescono in fretta; impopolarità = penalità.
    // MODALITÀ DIFFICILE: l'onda è DISATTIVATA (wave neutro, nessun bonus EXP).
    const sond = this.state.sondaggi;
    const wave = this.state.hardMode ? 1 : sond >= 70 ? 1.25 : sond >= 40 ? 1 : 0.92;
    // MANIFESTI OVUNQUE (boost campagna): +30% EXP finché restano battaglie.
    const manifestiBonus = this.state.boostExpBattles > 0 ? 1.3 : 1;
    const gained = openingRecruitmentExp(this.state, this.player.mon, Math.max(
      1,
      Math.floor(base * (istruzione ? 1.15 : 1) * wave * manifestiBonus * expMalus(this.state) * moraleExpMultiplier(this.state.morale))
    ), recruit);
    const teamwork = moraleExpMultiplier(this.state.morale);
    const modifiers = [
      ...(teamwork !== 1 ? [teamwork > 1 ? "COESIONE +8%" : "COESIONE -8%"] : []),
      ...(wave !== 1 ? [wave > 1 ? "ONDA +25%" : "ONDA -8%"] : []),
      ...(manifestiBonus > 1 ? ["MANIFESTI +30%"] : []),
      ...(istruzione ? ["ISTRUZ.+15%"] : []),
      ...(expMalus(this.state) < 1 ? [`MIN.-${Math.round((1 - expMalus(this.state)) * 100)}%`] : [])
    ];
    const hasShare = (this.state.bag["divisa"] ?? 0) > 0;
    // Opening momentum belongs to the living starter even when an ally recruits.
    const benchStarter = this.state.party.find(mon => mon !== this.player.mon && mon !== this.foe.mon && mon.hp > 0 && openingRecruitmentExp(this.state, mon, 0, recruit) > 0);
    let applied = false;
    steps.push({
      run: () => {
        if (applied) return;
        applied = true;
        const followUp: Step[] = recruit ? [{ pause: 1.8 }, { run: () => { this.recruitReceipt = null; } }] : [];
        let sharedRecipients = 0, sharedExp = 0;
        let starterGrowth = "";
        let benchLevelled = false;
        // EXP condivisa (silenziosa) agli altri membri vivi, prima del lead
        // così i loro level-up non interrompono l'animazione del protagonista.
        if (hasShare || benchStarter) {
          const shared = hasShare ? Math.max(1, Math.floor(gained / 2)) : 0;
          for (const mon of this.state.party) {
            if (mon === this.player.mon || mon === this.foe.mon || mon.hp <= 0) {
              continue;
            }
            const amount = mon === benchStarter ? openingRecruitmentExp(this.state, mon, shared, recruit) : shared;
            if (amount <= 0) continue;
            const before = mon.exp, beforeLevel = mon.level;
            const ev = gainExp(mon, amount, this.state.sondaggi);
            if (mon.exp > before) { sharedRecipients += 1; sharedExp += mon.exp - before; }
            if (ev.length) benchLevelled = true;
            if (mon === benchStarter && mon.level > beforeLevel) starterGrowth = `${speciesOf(mon).name.toUpperCase()} LV${beforeLevel} > ${mon.level}`;
            for (const event of ev) for (const moveId of event.learnableMoves) followUp.push(...this.learnMoveSteps(moveId, mon));
            const target = ev.find((event) => event.evolvesTo)?.evolvesTo ?? levelEvolution(mon, this.state.sondaggi);
            if (target) {
              followUp.push(...this.evolveStepsFor(mon, target));
            }
          }
        }
        const previousLevel = this.player.mon.level;
        const previousExp = this.player.mon.exp;
        const events = gainExp(this.player.mon, gained, this.state.sondaggi);
        if (recruit && this.recruitReceipt) {
          const receipt = this.recruitReceipt;
          receipt.growth = `${this.playerName()} +${this.player.mon.exp - previousExp} CONSENSO`;
          receipt.levels = `LV${previousLevel}${this.player.mon.level > previousLevel ? ` > ${this.player.mon.level}` : ""}${starterGrowth ? ` · SLANCIO ${starterGrowth}` : sharedRecipients ? ` · DIVISA ${sharedRecipients}x${Math.max(1, Math.floor(gained / 2))}` : ""}`;
          receipt.modifiers = modifiers;
          if (events.length || benchLevelled) audio.levelUp();
          // Recruitment and growth are durable before the receipt can be skipped.
          this.recordResult("caught");
          receipt.saved = saveGame(this.state);
        }
        if (!recruit && (this.player.mon.exp > previousExp || sharedRecipients > 0)) {
          this.growthReceipt = {
            elapsed: 0, previousLevel, previousExp, gained: this.player.mon.exp - previousExp,
            shared: sharedRecipients ? `DIVISA ${sharedRecipients} ALLEATI +${sharedExp}` : "",
            modifiers
          };
          if (events.length || benchLevelled) audio.levelUp();
          followUp.unshift({ pause: 1.6, waitHp: true }, { run: () => { this.growthReceipt = null; } });
        }
        let queuedEvolution = false;
        for (const event of events) {
          for (const moveId of event.learnableMoves) {
            followUp.push(...this.learnMoveSteps(moveId));
          }
          if (event.evolvesTo && !queuedEvolution) {
            queuedEvolution = true;
            followUp.push(...this.evolveStepsFor(this.player.mon, event.evolvesTo));
          }
        }
        if (!queuedEvolution) {
          const target = levelEvolution(this.player.mon, this.state.sondaggi);
          if (target) {
            followUp.push(...this.evolveStepsFor(this.player.mon, target));
          }
        }
        followUp.push({ run: after });
        this.pushFront(followUp);
      }
    });
    return steps;
  }

  private learnMoveSteps(moveId: string, mon: Monster = this.player.mon): Step[] {
    return [{ run: () => {
      this.stack.push(new TeachScene(this.stack, this.input, mon, moveId,
        () => saveGame(this.state), { source: "level", party: this.state.party }));
    } }];
  }

  private evolveStepsFor(mon: Monster, targetId: string): Step[] {
    return [
      {
        // Apre la scena dedicata con l'animazione. La coda resta ferma finché la
        // scena è in cima allo stack; al termine l'evoluzione è già applicata.
        run: () => {
          const fromId = mon.speciesId;
          this.stack.push(
            new EvolutionScene(this.stack, this.input, fromId, targetId, () => {
              evolve(mon, targetId);
              markSeen(this.state, mon.speciesId);
              markCaught(this.state, mon.speciesId);
              saveGame(this.state);
            }, { mon, reduceEffects: this.state.reduceEffects, battleSpeed: this.state.battleSpeed })
          );
        }
      }
    ];
  }

  private afterFoeDown(): void {
    if (this.trainer && this.foeIndex < this.foeTeam.length - 1) {
      this.foeIndex += 1;
      this.foe = makeCombatant(this.foeTeam[this.foeIndex]);
      this.displayHp.foe = this.foe.mon.hp;
      markSeen(this.state, this.foe.mon.speciesId);
      const entry: Step[] = [{ text: `${this.trainer.name} manda in campo ${this.foeName()}!` }];
      if (abilityOf(this.foe.mon)?.id === "voltagabbana") {
        entry.push({ text: `Il nemico ${this.foeName()} cambia casacca al volo: OPPORTUNISMO sale!` });
      }
      const entryAbility = resolveEntryAbility(this.foe, this.player);
      if (entryAbility.triggered) {
        this.foe.stages = entryAbility.entrantStages;
        this.player.stages = entryAbility.opponentStages;
        entry.push({ text: `Il nemico ${this.foeName()} fa TABULA RASA: ogni modifica è azzerata!` });
      }
      if (this.electionDoctrine === "campo_largo" && this.electionDoctrineTriggered) {
        this.foe.stages.def = Math.min(6, this.foe.stages.def + 1);
      }
      if (this.electionDoctrine === "scissione" && !this.electionDoctrineTriggered) {
        this.electionDoctrineTriggered = true;
        this.foe.stages.atk = Math.min(6, this.foe.stages.atk + 1);
        this.foe.stages.def = Math.max(-6, this.foe.stages.def - 1);
        entry.push({ text: "SCISSIONE: riserva immediata, ATTACCO +1 e DIFESA -1!" });
      }
      // La scelta contiene già INDIETRO: nessuna conferma prima del rimpasto.
      if (this.hasBenchAlive()) {
        entry.push({
          run: () => {
            this.mode = "queue";
            this.openParty(true);
          }
        });
      }
      this.pushFront(entry);
      return;
    }
    const steps: Step[] = [];
    if (this.trainer) {
      const trainer = this.trainer;
      const plan = buildTrainerVictoryPlan(this.state, trainer, this.isRematch);
      steps.push({ run: () => audio.victory() });
      for (const line of trainer.defeat) steps.push({ text: line });
      let paid = false;
      steps.push({ run: () => {
        if (paid) return;
        paid = true;
        this.state.money += plan.payout;
        const { value, milestone } = bumpSondaggi(this.state, plan.sondaggiGain);
        const rewards = new Map<string, number>();
        if (trainer.reward) rewards.set(trainer.reward.itemId, trainer.reward.qty);
        if (plan.loot) rewards.set(plan.loot.id, (rewards.get(plan.loot.id) ?? 0) + plan.loot.qty);
        for (const [id, qty] of rewards) this.state.bag[id] = (this.state.bag[id] ?? 0) + qty;
        if (milestone || plan.loot && !plan.loot.jackpot) audio.catchJingle();
        const items = [...rewards].map(([id, qty]) => `${ITEMS[id].name} x${qty}`).join(" / ");
        this.pushFront([{ text: `+${plan.payout}€ / SONDAGGI ${value}%${items ? " / " + items : ""}` }]);
      } });
      if (trainer.badge) {
        const badgeName = trainer.badge.toUpperCase();
        steps.push({ run: () => audio.badgeFanfare() });
        steps.push({
          text: `Conquisti la MEDAGLIA ${badgeName}!`,
          run: () => {
            if (!this.state.badges.includes(trainer.badge!)) {
              this.state.badges.push(trainer.badge!);
            }
            addSondaggi(this.state, 8);
            const lead = plan.badgeLead.map((text, index) => ({
              text,
              run: index === 0 && text.startsWith("BREAKING NEWS") ? () => audio.catchJingle() : undefined
            }));
            if (lead.length > 0) {
              this.pushFront(lead);
            }
          }
        });
      }
      // BONUS A SORPRESA: ~30% di pescare un extra dalla "mazzetta elettorale".
      // Variabilità della ricompensa = quel "ancora una battaglia".
      if (plan.loot) {
        const drop = plan.loot;
        if (drop.jackpot) {
          // JACKPOT: la rara TESSERA DORATA merita un trattamento speciale
          // (lampo dorato + scintille + fanfara di vittoria, come la cattura).
          steps.push({
            run: () => {
              audio.victory();
              this.fx.catchFlash = 0.9;
              const c = monsterCenter("foe", this.viewHeight);
              for (let i = 0; i < 26; i += 1) {
                const ang = (Math.PI * 2 * i) / 26 + 0.2;
                const speed = 80 * (0.6 + Math.random() * 0.9);
                this.fx.particles.push({
                  x: c.x + (Math.random() - 0.5) * 14,
                  y: c.y + (Math.random() - 0.5) * 14,
                  vx: Math.cos(ang) * speed,
                  vy: Math.sin(ang) * speed - 36,
                  life: 0,
                  max: 0.6 + Math.random() * 0.5,
                  color: ["#ffe98a", "#ffd23c", "#fff4c0"][i % 3],
                  size: 2
                });
              }
            }
          });
          steps.push({ text: `JACKPOT! È uscita una rarissima ${ITEMS[drop.id].name}!` });
        }
      }
    } else {
      steps.push({
        run: () => {
          audio.victory();
          addSondaggi(this.state, 2);
        }
      });
    }
    this.pushFront(steps);
    this.endBattle("win");
  }

  private playerFaintedSteps(): Step[] {
    return [
      {
        run: () => {
          recordPartyKo(this.state);
          audio.faint();
          this.fx.hitStop = Math.max(this.fx.hitStop, 0.25);
          this.fx.koFlash = 0.5;
          this.fx.faintT.player = 0.55;
        },
        pause: 0.15
      },
      { text: `${this.playerName()} si ritira dalla corsa!` },
      {
        run: () => {
          const alive = this.state.party.filter((m) => m.hp > 0);
          if (alive.length === 0) {
            this.pushFront([{ text: "Sei rimasto senza candidati..." }]);
            this.endBattle("loss");
            return;
          }
          this.openParty(true, true);
        }
      }
    ];
  }

  // C'è almeno un POLITICMON sano IN PANCHINA (diverso da quello in campo)?
  private hasBenchAlive(): boolean {
    return this.state.party.some((m) => m.hp > 0 && m.uid !== this.player.mon.uid);
  }

  private openParty(free: boolean, forced = false): void {
    this.stack.push(new PartyScene(this.stack, this.input, this.state, {
      mode: forced ? "forced-switch" : "battle-switch", currentUid: this.player.mon.uid, freeSwitch: free,
      switchHint: mon => {
        if (!this.foeIntent) return "nemico risponde";
        const preview = switchPreview(mon, this.foe);
        const [player, foe] = fieldPreview(this.field, this.fieldTurn, preview.entrant, preview.opponent);
        const range = replyRange(player, foe, this.foeIntent, undefined, { sondaggi: this.state.sondaggi });
        return this.foeIntent.power ? `risposta stimata ${range.min}-${range.max} PV, senza critico` : `risponde: ${this.foeIntent.name}`;
      },
      onInspect: mon => this.openSwitchIntel(mon, free), onChoose: mon => this.switchTo(mon, free)
    }));
  }

  private switchTo(mon: Monster, afterFaint: boolean): void {
    if (this.finished || this.stack.top !== this || !this.state.party.includes(mon) || mon.hp <= 0 || mon.uid === this.player.mon.uid) return;
    this.player = makeCombatant(mon);
    this.displayHp.player = mon.hp;
    this.displayExp = this.expRatio();
    const steps: Step[] = [];
    if (!afterFaint) this.state.flags["seen-switch-tip"] = true;
    steps.push({ text: `Tocca a te, ${this.playerName()}!` });
    if (abilityOf(mon)?.id === "voltagabbana") {
      steps.push({ text: `${this.playerName()} cambia casacca al volo: OPPORTUNISMO sale!` });
    }
    const entryAbility = resolveEntryAbility(this.player, this.foe);
    if (entryAbility.triggered) {
      this.player.stages = entryAbility.entrantStages;
      this.foe.stages = entryAbility.opponentStages;
      steps.push({ text: `${this.playerName()} fa TABULA RASA: ogni modifica è azzerata!` });
    }
    if (!afterFaint) {
      // Il cambio consuma il turno: il nemico attacca (col blocco status).
      steps.push(this.foeCounterStep());
      steps.push(...this.endOfTurnSteps());
    }
    this.pushFront(steps);
    this.mode = "queue";
  }

  private openSwitchIntel(mon: Monster, free: boolean): void {
    const preview = switchPreview(mon, this.foe);
    this.stack.push(new BattleIntelScene(this.stack, this.input, preview.entrant, preview.opponent, 0, { sondaggi: this.state.sondaggi }, undefined, [], [
      `CANDIDATO: ${speciesOf(mon).name}.`,
      free ? "RIMPASTO GRATIS: NESSUN CONTRATTACCO." : "CAMBIO: IL NEMICO ATTACCA PRIMA CHE TU POSSA USARE UNA MOSSA.",
      "STIMA DOPO IL CAMBIO E LE ABILITA DI INGRESSO. LEGGERE NON SCHIERA."
    ], "SQUADRA"));
  }

  private pushEndOfTurn(): void {
    this.push({
      run: () => this.pushFront(this.endOfTurnSteps())
    });
  }

  private endOfTurnSteps(): Step[] {
    const apply = (c: Combatant, name: string): Step[] => {
      return [{
        run: () => {
          const steps: Step[] = [];
          for (const effect of resolveEndTurn(c, true)) {
            if (effect.kind === "damage") {
              steps.push({
                text: `${name} è logorato dallo SCANDALO!`,
                run: () => { c.mon.hp = effect.hpAfter; audio.hit(); },
                waitHp: true
              }, ...this.koCheckSteps(c === this.player ? "player" : "foe"));
            } else {
              const label = effect.id === "caffettiera" ? "La CAFFETTIERA fuma:" : "GALLEGGIAMENTO!";
              steps.push({
                text: `${label} ${name} recupera un po' di consenso!`,
                run: () => {
                  c.mon.hp = effect.hpAfter;
                  effect.id === "caffettiera" ? audio.holdBrew() : audio.heal();
                },
                waitHp: true
              });
            }
          }
          this.pushFront(steps);
        }
      }];
    };
    return [...apply(this.player, this.playerName()), ...apply(this.foe, `Il nemico ${this.foeName()}`), { run: () => {
      if (this.copione && this.battery > 0 && this.foe.mon.hp > 0 && this.player.mon.hp > 0) {
        if (this.battery === 1) this.breakCopione(); else this.battery -= 1;
      }
    } }];
  }

  // ---- Oggetti ----

  useItem(itemId: string): void {
    const item = ITEMS[itemId];
    if (!item || this.finished || this.stack.top !== this || this.mode !== "menu" || this.supplyInfo(itemId).disabled) return;
    if (item.kind === "ball") {
      this.throwBall(itemId);
      return;
    }
    if (item.kind === "heal" || item.kind === "cure") {
      this.battleHealingItemsUsed += 1;
      recordHealingItemUsed(this.state);
    }
    const recovery = item.kind === "heal" ? healingQuote(this.state, this.player.mon, itemId)! : null;
    this.state.bag[itemId] = Math.max(0, (this.state.bag[itemId] ?? 0) - 1);
    bumpDailyQuest(this.state, "item1"); // missione "USA 1 OGGETTO IN LOTTA"
    const steps: Step[] = [];
    if (item.kind === "heal") {
      steps.push({
        text: `${item.name}: +${recovery!.after - recovery!.before} PV.`,
        run: () => {
          this.player.mon.hp = recovery!.after;
          audio.heal();
        },
        waitHp: true
      });
    } else {
      steps.push({
        text: `${this.playerName()} si scrolla di dosso ogni guaio!`,
        run: () => {
          this.player.mon.status = null;
          this.player.gaffeTurns = 0;
          audio.heal();
        }
      });
    }
    // Usare un oggetto consuma il turno (il nemico risponde, blocco status incluso).
    steps.push(this.foeCounterStep());
    steps.push(...this.endOfTurnSteps());
    this.pushFront(steps);
    this.mode = "queue";
  }

  private throwBall(itemId: string, viral = false): void {
    const item = ITEMS[itemId];
    if (this.trainer) {
      this.pushFront([
        { text: "Non si reclutano i candidati altrui in diretta!" },
        { text: "Il regolamento di campagna lo vieta. Sezione 7, comma maleducazione." }
      ]);
      this.mode = "queue";
      return;
    }
    if (!item || item.kind !== "ball" || (viral && itemId !== "scheda") || (!viral && (this.state.bag[itemId] ?? 0) <= 0) || this.foe.mon.hp <= 0 || (viral && this.polemica.value < 3)) {
      audio.cancel();
      return;
    }
    const chance = this.catchEstimate(itemId, viral);
    if (viral) this.polemica.spend();
    this.catchBoost = false;
    if (!viral) { this.state.bag[itemId] -= 1; bumpDailyQuest(this.state, "item1"); }
    const success = Math.random() < chance;
    const shakes = success ? 3 : Math.min(2, Math.floor(chance * 4 * Math.random()));
    this.pushFront([
      { text: viral ? "VIRALE! LA TESSERA LA STAMPIAMO DOPO." : `Lanci una ${item.name}!`, run: () => audio.ballThrow() },
      {
        run: () => {
          this.ballAnim = { t: 0, shakes, success, viral };
        },
        pause: 1.2 + shakes * 0.55
      },
      {
        run: () => {
          this.ballAnim = null;
          if (success) {
            // Reclutato: il mostro è "dentro la tessera", non va più disegnato in
            // campo (altrimenti ricompare e sembra essere evaso).
            this.captured = true;
            this.pushFront(this.captureSteps());
          } else {
            this.pushFront([
              { text: `Maledizione! ${this.foeName()} si è astenuto!` },
              this.foeCounterStep(),
              ...this.endOfTurnSteps()
            ]);
          }
        }
      }
    ]);
    this.mode = "queue";
  }

  private captureSteps(): Step[] {
    const zoneAnnouncements: Step[] = [];
    // Snapshot modifiers before the capture's polling rewards, as for KO EXP.
    const growth = this.consensusSteps(() => {}, true);
    const steps: Step[] = [
      {
        run: () => {
          audio.catchJingle();
          const newDex = this.state.dex[this.foe.mon.speciesId] !== "caught";
          const polls = this.state.sondaggi;
          markCaught(this.state, this.foe.mon.speciesId);
          // Catturato sul campo: se era arrivato solo via scambio, ora conta
          // anche per i gate di zona (si toglie l'esclusione C10).
          delete this.state.flags[`dex-trade:${this.foe.mon.speciesId}`];
          addSondaggi(this.state, 3);
          if (this.state.party.length < 6) {
            this.state.party.push(this.foe.mon);
          } else {
            // Squadra piena: lo si conserva nel box (CIRCOLO DI PARTITO) invece
            // di perderlo. Prima il box non esisteva e il mostro spariva.
            this.state.boxed.push(this.foe.mon);
          }
          this.recruitReceipt = {
            elapsed: 0, newDex, polls: this.state.sondaggi - polls,
            destination: this.state.party.includes(this.foe.mon) ? `SQUADRA ${this.state.party.length}/6` : "NEL BOX: CIRCOLO",
            growth: "", levels: "", modifiers: [], saved: false
          };
          // Ricompensa di completamento ZONA: se questa cattura riempie il
          // roster di una zona (e non l'hai già riscossa), premio + annuncio.
          for (const p of zoneProgress(this.state.dex, this.state.flags, this.state.browserSeed)) {
            if (p.done && !this.state.zoneRewardsClaimed.includes(p.zone.id)) {
              this.state.zoneRewardsClaimed.push(p.zone.id);
              const r = p.zone.reward;
              this.state.bag[r.itemId] = (this.state.bag[r.itemId] ?? 0) + r.qty;
              if (r.money > 0) {
                this.state.money += r.money;
              }
              addSondaggi(this.state, 5);
              const moneyTxt = r.money > 0 ? ` e ${r.money} FONDI` : "";
              zoneAnnouncements.push({ text: `ZONA ${p.zone.name} COMPLETATA! ${r.qty}x ${ITEMS[r.itemId].name}${moneyTxt}!` });
            }
          }
          for (const step of growth) step.run?.();
        }
      }
    ];
    steps.push({ run: () => this.pushFront(zoneAnnouncements) });
    this.endBattle("caught");
    return steps;
  }

  // ---- Update ----

  get uiPanel(): UiPanel {
    const mode = this.mode;
    const ready = mode === "menu" || mode === "fight";
    const action = (label:string, run:()=>void, hint?:string, disabled=false):TouchAction => ({
      label,hint,disabled,run:()=>{
        if(disabled || this.stack.top!==this || this.mode!==mode || this.finished)return;
        this.input.reset();audio.confirm();run();
      }
    });
    const back = action("Indietro",()=>{this.mode="menu";},"Torna alle mosse.");
    const recruit=this.recruitReceipt, growth=this.growthReceipt;
    if(recruit || growth){
      const receipt=recruit??growth!;
      return {
        title:recruit?"Reclutamento riuscito":"Consenso ottenuto",subtitle:recruit?this.foeName():this.playerName(),
        blocks:recruit?[
          {title:"Nuovo compagno",facts:[{label:"Destinazione",value:readableCopy(recruit.destination)},{label:"Politicdex",value:recruit.newDex?"Nuova specie":"Già conosciuta"},{label:"Sondaggi",value:`+${recruit.polls} punti`}]},
          {title:"Crescita",body:readableCopy([recruit.growth,recruit.levels,...recruit.modifiers].filter(Boolean).join("\n\n"))}
        ]:[
          {title:"Crescita",facts:[{label:"Consenso",value:`+${growth!.gained}`},{label:"Livello",value:`${growth!.previousLevel} → ${this.player.mon.level}`}],body:readableCopy([growth!.shared,...growth!.modifiers].filter(Boolean).join("\n\n"))}
        ],
        actions:[action("Continua",()=>{if((this.recruitReceipt??this.growthReceipt)===receipt)this.stepTimer=0;},recruit?.saved?"Progressi salvati.":undefined,Boolean(recruit&&!recruit.growth)||this.stepTimer<=0)],primary:0
      };
    }
    if(mode==="campaign")return {
      title:"Campagna",subtitle:"L’avversario risponde dopo l’azione.",
      blocks:[{title:"Risorsa disponibile",facts:[{label:"Sondaggi",value:`${this.state.sondaggi}%`}]}],
      actions:CAMPAIGN_ACTIONS.map((item,index)=>({...action(readableCopy(item.label),()=>this.useCampaign(item),readableCopy(item.desc),Boolean(this.campaignMenu.items[index]?.disabled)),facts:[{label:"Costo",value:`${item.cost} punti`},{label:"Dopo",value:`${this.state.sondaggi-item.cost}%`},{label:"Soglia",value:`${item.minSond}%`}]})),back
    };
    if(mode==="recruit")return {
      title:"Recluta",subtitle:"Se il tentativo fallisce, l’avversario risponde.",
      blocks:[{title:this.foeName(),body:"Ridurre i PV e infliggere uno status aiuta il reclutamento. Un avversario KO non può essere reclutato."}],
      actions:[
        {...action(readableCopy(ITEMS[this.recruitBall]?.name??"Scheda"),()=>this.throwBall(this.recruitBall),"Consuma una scheda.",!this.state.bag[this.recruitBall]||this.foe.mon.hp<=0),facts:[{label:"Probabilità",value:`${Math.round(this.catchEstimate(this.recruitBall)*100)}%`},{label:"Scorte",value:String(this.state.bag[this.recruitBall]??0)}]},
        {...action("Reclutamento virale",()=>this.throwBall("scheda",true),"Consuma 3 Polemica; nessuna scheda.",this.polemica.value<3||this.foe.mon.hp<=0),facts:[{label:"Probabilità",value:`${Math.round(this.catchEstimate("scheda",true)*100)}%`},{label:"Polemica",value:`${this.polemica.value} di 3`}]},
        action("Borsa",()=>{this.mode="menu";this.openBag();},"Scegli un’altra scheda.")
      ],back
    };
    const fallback=this.player.mon.moves.every(slot=>slot.pp<=0);
    const slots=fallback?[{id:"comizio",pp:0}]:this.player.mon.moves;
    const moves=slots.map((slot,index):TouchAction=>{
      const move=MOVES[slot.id];
      const [player,foe]=fieldPreview(this.field,this.fieldTurn,this.player,this.foe);
      const estimate=damageRange(player,foe,move,{sondaggi:this.state.sondaggi});
      const tactical=this.moveHint(move);
      const blocked=/^(BLOCCATA|STATISTICA)/.test(tactical);
      const dealt=postureDealt(this.posture),hint=blocked?readableCopy(tactical):move.power?`Danno stimato: ${postureDamage(this.copioneDamage(estimate.min,move),dealt)}–${postureDamage(this.copioneDamage(estimate.max,move),dealt)} PV.`:moveCardDescription(move);
      return {...action(readableCopy(move.name),()=>{
        if(!fallback && (this.player.mon.moves[index]!==slot || slot.pp<=0))return;
        this.fightMenu.index=index;this.mode="queue";this.startTurn(move);
      },hint,!ready||(!fallback&&slot.pp<=0)),
        facts:[{label:"Tipo",value:move.type},{label:"Potenza",value:move.power?String(move.power):"—"},{label:"PP",value:fallback?"Riserva":`${slot.pp}/${move.pp}`},{label:"Efficacia",value:blocked?"No":move.power?`×${estimate.typeMult}`:"—"}],
        order:ready?this.orderLabel(move):undefined,
        onInspect:ready&&!fallback?()=>{if(this.stack.top!==this||this.mode!==mode||this.finished)return;this.fightMenu.index=index;openUiSheet(readableCopy(move.name),`${moveDescription(move)}\nPotenza ${move.power||"—"} · Precisione ${move.accuracy}%\n${hint}\n${this.orderLabel(move)}`);}:undefined
      };
    });
    while(moves.length<4)moves.push({label:"Spazio libero",hint:"Impara una nuova mossa.",disabled:true,run:()=>{}});
    const more:TouchAction[]=[
      ...(this.trainer?[action("Campagna",()=>this.openCampaignMenu())]:[]),
      action("Dossier",()=>this.openFightIntel(),undefined,fallback),
      ...(!this.trainer?[action("Fuga",()=>this.tryRun())]:[])
    ];
    const secondary:TouchAction[]=ready?[
      action("Cambio",()=>this.openParty(false),undefined,!this.hasBenchAlive()),
      action("Borsa",()=>this.openBag()),
      action("Recluta",()=>this.openRecruit(),undefined,Boolean(this.trainer)),
      action("···",()=>openUiSheet("Altre azioni","",more))
    ]:[action(this.msg.isOpen?"Continua":"Turno in corso",()=>this.msg.advance(),undefined,!this.msg.isOpen)];
    const intent=this.foeIntent;
    const postures:TouchAction[]=ready?(Object.keys(POSTURES) as Array<Exclude<Posture,"none">>).map(id=>{
      const info=POSTURES[id],chosen=this.posture===id;
      const describe=()=>openUiSheet(info.label,`${info.rule}\n\n${info.tip}`);
      return {...action(info.label,()=>{this.posture=chosen?"none":id;},info.rule),pressed:chosen,onInspect:describe};
    }):[];
    const title=this.msg.isOpen?"In lotta":this.actionCaption?`${readableCopy(this.actionCaption.actor)}: ${readableCopy(this.actionCaption.move)}`:intent?`${readableCopy(this.foeName())}: ${readableCopy(intent.name)}`:"Turno in corso";
    const body=this.msg.isOpen?readableCopy(this.msg.visibleText):this.actionCaption?readableCopy(this.actionCaption.result):intent?(intent.power?`Risposta prevista: ${this.replyDamage()} PV, senza critico.`:moveDescription(intent).replace(/del nemico/g,"del tuo compagno").replace(/di chi la usa/g,"dell’avversario")):"Le azioni si stanno risolvendo.";
    const notice=this.fx.effFx?({super:"Super efficace",weak:"Poco efficace",crit:"Colpo critico"}[this.fx.effFx.kind]):this.fieldFxT>0?readableCopy(this.fieldNotice):this.finisherT>0?"Microfono aperto!":this.copioneFxT>0?"Domanda non prevista!":this.legendBanner>0?"Incontro leggendario":this.firstSeenBanner>0?"Nuova specie nel Politicdex":undefined;
    return {title:"Lotta",selected:this.fightMenu.index,actions:[...moves,...postures,...secondary],arena:{
      impacts:this.fx.damageNumbers.map(d=>({label:`−${d.val}`,x:d.x/VIEW_W*100,y:d.y/this.viewHeight*100,opacity:this.state.reduceEffects?1:Math.min(1,Math.max(0,(1-d.life/d.max)/.34)),kind:d.crit?"crit":d.super?"super":"normal"})),
      player:{form:memeForm(this.player.mon.memeFormId)?.name,name:this.playerName(),level:this.player.mon.level,hp:this.displayHp.player,maxHp:statsOf(this.player.mon).hp,status:this.player.mon.status?readableCopy(STATUS_NAMES[this.player.mon.status]):undefined},
      foe:{form:memeForm(this.foe.mon.memeFormId)?.name,name:this.foeName(),level:this.foe.mon.level,hp:this.displayHp.foe,maxHp:statsOf(this.foe.mon).hp,status:this.foe.mon.status?readableCopy(STATUS_NAMES[this.foe.mon.status]):undefined},
      message:{title,body},notice,moveCount:moves.length,postureCount:postures.length,
      polemica:this.polemica.value,intent:intent?{label:readableCopy(intent.name),kind:intent.power?"attack":"status"}:undefined,
      finisher:ready&&this.polemica.value>=3?action("Fuorionda",()=>this.useFuorionda()):undefined
    }};
  }

  update(dt: number): void {
    if (this.finished) {
      return;
    }
    dt *= this.state.battleSpeed === 2 ? 2 : 1;
    if (this.recruitReceipt) this.recruitReceipt.elapsed += dt;
    if (this.growthReceipt) this.growthReceipt.elapsed += dt;
    this.finisherT = Math.max(0, this.finisherT - dt);
    this.copioneFxT = Math.max(0, this.copioneFxT - dt);
    this.fieldFxT = Math.max(0, this.fieldFxT - dt);
    this.legendBanner = Math.max(0, this.legendBanner - dt);
    this.firstSeenBanner = Math.max(0, this.firstSeenBanner - dt);
    this.legendIntroFlash = Math.max(0, this.legendIntroFlash - dt);
    // I leggendari spruzzano scintille dorate di continuo: aura "viva".
    if (this.isLegendary && !this.state.reduceEffects && this.foe.mon.hp > 0 && Math.random() < 0.25) {
      const c = monsterCenter("foe", this.viewHeight);
      const ang = Math.random() * Math.PI * 2;
      this.fx.particles.push({
        x: c.x + Math.cos(ang) * 22,
        y: c.y + Math.sin(ang) * 16,
        vx: Math.cos(ang) * 8,
        vy: -12 - Math.random() * 10,
        life: 0,
        max: 0.6 + Math.random() * 0.4,
        color: ["#ffe98a", "#ffd23c", "#fff4c0"][Math.floor(Math.random() * 3)],
        size: 1
      });
    }
    this.fx.update(dt);
    // Hit-stop: congela l'avanzamento della battaglia per pochi centesimi,
    // dando "peso" al colpo. Animazioni cosmetiche (sopra) continuano.
    if (this.fx.hitStop > 0) {
      this.fx.hitStop = Math.max(0, this.fx.hitStop - dt);
      return;
    }
    if (this.introT < 1.2) {
      this.introT += dt;
      if (this.introT < 0.55) {
        return; // il cerchio si sta ancora aprendo
      }
    }

    // Anima barre HP ed EXP.
    const speed = dt * 60;
    this.displayHp.player = approach(this.displayHp.player, this.player.mon.hp, speed * 0.8);
    this.displayHp.foe = approach(this.displayHp.foe, this.foe.mon.hp, speed * 0.8);
    this.displayExp = approach(this.displayExp, this.expRatio(), dt * 1.5);
    if (this.ballAnim) {
      this.ballAnim.t += dt;
    }

    if (this.mode === "queue") {
      this.msg.update(dt, this.input, this.viewHeight);
      if (this.msg.isOpen) {
        return;
      }
      if (this.stepTimer > 0) {
        if ((this.recruitReceipt?.growth || this.growthReceipt) && (this.input.wasPressed("a") || this.input.wasPressed("b"))) this.stepTimer = 0;
        this.stepTimer -= dt;
        return;
      }
      const hpSettled =
        Math.abs(this.displayHp.player - this.player.mon.hp) < 0.5 &&
        Math.abs(this.displayHp.foe - this.foe.mon.hp) < 0.5;
      const step = this.queue[0];
      if (!step) {
        if (hpSettled) {
          // A blocked Click Day expires with its round; no retroactive bonus.
          if (this.field?.id === "click" && this.fieldTurn >= 2) this.fieldResolved = true;
          this.mainMenu.index = 0;
          this.foeIntent ??= this.pickFoeIntent();
          this.actionCaption = null;
          this.mode = "menu";
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
        this.msg.show([step.text], undefined, true);
      }
      return;
    }

  }

  private openFightIntel(): void {
    const recruitment = this.trainer ? [] : ["RECLUTAMENTO NELLO STATO ATTUALE:", ...Object.entries(this.state.bag).filter(([id, qty]) => qty > 0 && ITEMS[id]?.kind === "ball").map(([id, qty]) => {
      const base = catchChance(this.foe.mon, id, hasMinistro(this.state, "propaganda") ? 1.25 : 1, this.foe.gaffeTurns > 0);
      const chance = this.catchBoost ? Math.min(.95, base * 2) : base;
      return `${ITEMS[id].name}: ${Math.round(chance * 100)}% (${qty} IN BORSA).`;
    }), "INDEBOLIRE E APPLICARE UNO STATUS AIUTA. METTERLO KO IMPEDISCE LA CATTURA.", ...(this.catchBoost ? ["APPELLO AL VOTO ATTIVO: PROSSIMA SCHEDA x2."] : [])];
    this.stack.push(new BattleIntelScene(this.stack, this.input, this.player, this.foe, this.fightMenu.index, { sondaggi: this.state.sondaggi }, (index) => { this.fightMenu.index = index; }, recruitment, this.trainer ? [`STILE: ${trainerStyle(this.trainer.id).label}.`, ...trainerStyle(this.trainer.id).hints] : []));
  }

  private openCampaignMenu(): void {
    const sond = this.state.sondaggi;
    this.campaignMenu = new Menu(
      CAMPAIGN_ACTIONS.map((a) => {
        const affordable = sond >= a.cost && sond >= a.minSond;
        return {
          label: a.label,
          rightLabel: `-${a.cost}%`,
          disabled: !affordable || a.kind === "appello" && Boolean(this.trainer)
        };
      })
    );
    this.mode = "campaign";
  }

  private useCampaign(action: { kind: CampaignKind; label: string; cost: number; minSond: number }): void {
    if (action.kind === "appello" && this.trainer) { audio.cancel(); return; }
    const sond = this.state.sondaggi;
    if (sond < action.cost || sond < action.minSond) {
      audio.cancel();
      this.pushFront([{ text: "Consenso insufficiente per questa mossa." }]);
      this.mode = "queue";
      return;
    }
    audio.confirm();
    const steps: Step[] = [
      { text: `${this.playerName()} gioca la carta ${action.label}!`, run: () => addSondaggi(this.state, -action.cost) }
    ];

    if (action.kind === "spin") {
      steps.push({
        text: "Spin mediatico: la narrazione cambia, la squadra si rianima!",
        run: () => {
          const m = this.player.mon;
          m.status = null;
          this.player.gaffeTurns = 0;
          m.hp = Math.min(statsOf(m).hp, m.hp + Math.ceil(statsOf(m).hp * 0.3));
          audio.heal();
        },
        waitHp: true
      });
    } else if (action.kind === "farlocco") {
      steps.push({
        text: "NUMERI GONFIATI: GRINTA +2!",
        run: () => {
          this.player.stages.atk = Math.min(6, this.player.stages.atk + 2);
          audio.confirm();
        }
      });
    } else if (action.kind === "ruspa") {
      steps.push({
        text: "RUSPA DEL CONSENSO! Travolge ogni difesa!",
        run: () => {
          const dmg = Math.max(8, Math.floor(statsOf(this.foe.mon).hp * 0.28));
          this.foe.mon.hp = Math.max(0, this.foe.mon.hp - dmg);
          audio.hitSuper();
          this.fx.shake = 0.25;
        },
        waitHp: true
      });
      steps.push(...this.koCheckSteps("foe"));
    } else if (action.kind === "appello") {
      steps.push({
        text: "Appello al voto: l'elettorato è pronto a essere reclutato!",
        run: () => {
          this.catchBoost = true;
        }
      });
    }

    // La CAMPAGNA consuma il turno: il nemico risponde (blocco status incluso).
    steps.push(this.foeCounterStep());
    steps.push(...this.endOfTurnSteps());
    this.pushFront(steps);
    this.mode = "queue";
  }

  private tryRun(): void {
    if (this.trainer) {
      this.pushFront([{ text: "Non si scappa da un confronto televisivo!" }]);
      this.mode = "queue";
      return;
    }
    this.runAttempts += 1;
    if (Math.random() < runChance(this.player, this.foe, this.runAttempts)) {
      audio.run();
      addSondaggi(this.state, -2);
      this.pushFront([{ text: "Fuga riuscita! Dirai che era una pausa di riflessione." }]);
      this.endBattle("run");
    } else {
      this.pushFront([
        { text: "I cronisti ti bloccano! Niente fuga!" },
        this.foeCounterStep(),
        ...this.endOfTurnSteps()
      ]);
    }
    this.mode = "queue";
  }

  // ---- Draw ----

  draw(screen: Screen): void {
    const ctx = screen.ctx;
    this.viewHeight = screen.height;
    this.fx.viewHeight = screen.height;
    const g = battleGeometry(screen.height);
    // SCREEN-SHAKE PIENO: tutto il frame (sfondo, sprite, box, banner) trasla
    // insieme su super-efficace/crit. Prima solo il nemico tremava.
    const shake = this.fx.shakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    screen.clear("#f0f0e0");
    drawBattleBackdrop(screen, this.backdrop, screen.height, 0);

    // TINT SFONDO METEO (sondaggi-meteo): velo colorato leggero sullo sfondo
    // quando il gradimento attiva il modificatore. Caldo/dorato col GOVERNO in
    // luna di miele (>=70), freddo/rosso-piazza con l'OPPOSIZIONE al comando
    // (<=40). Alpha basso: atmosfera, non disturbo. Solo PVE (i SONDAGGI
    // esistono solo qui). Sotto gli sprite, sopra lo sfondo.
    this.drawWeatherTint(screen);

    // Slide-in iniziale degli sprite.
    const slide = this.state.reduceEffects ? 1 : Math.max(0, Math.min(1, (this.introT - 0.25) / 0.6));
    const foeSlide = Math.round((1 - slide) * 90);
    const playerSlide = Math.round((1 - slide) * -90);

    // Piattaforme.
    drawEllipse(screen, 162 + foeSlide, g.foeBase - 2, 64, 14, this.backdrop.foePlatform);
    drawEllipse(screen, 56 + playerSlide, g.playerBase - 2, 76, 16, this.backdrop.playerPlatform);

    // Aura dorata pulsante attorno al leggendario: alone "sacro" che lo
    // distingue da un mostro qualsiasi per tutta la durata dello scontro.
    if (this.isLegendary && this.foe.mon.hp > 0 && !this.ballAnim) {
      this.drawLegendaryAura(screen, 162 + foeSlide, g.foeBase - 14);
    }

    // Telegrafia: aura pulsante dietro il nemico che sta per attaccare.
    if (this.fx.telegraph && this.fx.telegraph.side === "foe" && this.foe.mon.hp > 0 && !this.ballAnim) {
      this.fx.drawTelegraph(screen, 162 + foeSlide, g.foeBase - 16);
    }

    // Nemico: animazione idle (respiro), affondo all'attacco, blink se colpito.
    // Se è stato reclutato (captured) non si disegna più: è dentro la tessera.
    const foeBlink = this.fx.flashT.foe > 0 && Math.floor(this.fx.flashT.foe * 16) % 2 === 0;
    if ((this.foe.mon.hp > 0 || this.fx.faintT.foe > 0) && !this.ballAnim && !foeBlink && !this.captured) {
      drawBattleMonster(screen, this.fx, this.foe, 162 + foeSlide, g.foeBase, this.fx.lungeT.foe, false, "foe", g.size);
    }
    if (this.ballAnim) {
      this.drawBall(screen);
    }

    // Player (di spalle: specchiato e più grande).
    const playerBlink = this.fx.flashT.player > 0 && Math.floor(this.fx.flashT.player * 16) % 2 === 0;
    if ((this.player.mon.hp > 0 || this.fx.faintT.player > 0) && !playerBlink) {
      drawBattleMonster(screen, this.fx, this.player, 56 + playerSlide, g.playerBase, this.fx.lungeT.player, true, "player", g.size);
    }

    // Scintille d'impatto (sopra i mostri, sotto le scritte/HUD).
    this.fx.drawMoveFx(screen);
    this.fx.drawParticles(screen);
    // Numeri di danno flottanti (sopra le scintille, sotto le barre HP).


    // Banner "SUPER EFFICACE / POCO EFFICACE / CRITICO".

    // Lampo d'apertura + banner "LEGGENDARIO!" per l'incontro epico.
    this.drawLegendIntro(screen);

    // Fine dello screen-shake: il box azioni/menu e gli overlay a schermo intero
    // restano fermi (l'UI non deve "ballare" sotto le dita).
    ctx.restore();

    if (this.copioneFxT > 0) {
      const atlas = sceneImage("battle:copione", "ui/battle/copione.png");
      const frame = Math.min(3, Math.floor((.6 - this.copioneFxT) / .15));
      if (atlas) screen.imageRegion(atlas, (frame % 2) * 240, Math.floor(frame / 2) * 135, 240, 135, 0, Math.round((screen.height - 135) / 2), 240, 135);
    }
    if (this.finisherT > 0) {
      const atlas = sceneImage("battle:fuorionda", "ui/battle/fuorionda.png");
      const frame = Math.min(3, Math.floor((.8 - this.finisherT) / .2));
      if (atlas) screen.imageRegion(atlas, (frame % 2) * 240, Math.floor(frame / 2) * 135, 240, 135, 0, Math.round((screen.height - 135) / 2), 240, 135);
    }

    // Bagliore dorato al level-up + raggi che pulsano dallo sprite del player.
    // RIDUCI EFFETTI: soppresso (l'evento resta nel testo "sale al livello X").
    if (this.fx.levelFlash > 0 && !this.state.reduceEffects) {
      const ctx = screen.ctx;
      const a = this.fx.levelFlash / 0.6;
      ctx.save();
      ctx.fillStyle = `rgba(244, 211, 74, ${0.35 * a})`;
      ctx.fillRect(0, 0, VIEW_W, screen.height);
      ctx.restore();
    }

    // Lampo di celebrazione alla cattura: whiteout dorato che svanisce in fretta.
    // RIDUCI EFFETTI: soppresso (la cattura resta annunciata nel testo).
    if (this.fx.catchFlash > 0 && !this.state.reduceEffects) {
      const ctx = screen.ctx;
      const a = this.fx.catchFlash / 0.7;
      ctx.save();
      ctx.fillStyle = `rgba(255, 246, 200, ${0.55 * a})`;
      ctx.fillRect(0, 0, VIEW_W, screen.height);
      ctx.restore();
    }

    // Lampo bianco di KO: freeze-frame accompagnato da un flash che sbianca
    // brevemente lo schermo quando un mostro cade. RIDUCI EFFETTI: niente
    // whiteout (il KO resta ovvio: lo sprite svanisce e il testo lo annuncia).
    if (this.fx.koFlash > 0 && !this.state.reduceEffects) {
      const ctx = screen.ctx;
      const a = this.fx.koFlash / 0.5;
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * a})`;
      ctx.fillRect(0, 0, VIEW_W, screen.height);
      ctx.restore();
    }

    // Apertura a cerchio in stile Game Boy.
    if (this.introT < 0.55) {
      const ctx = screen.ctx;
      const radius = (this.introT / 0.55) * Math.hypot(VIEW_W, screen.height) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, VIEW_W, screen.height);
      ctx.arc(VIEW_W / 2, screen.height / 2, Math.max(1, radius), 0, Math.PI * 2);
      ctx.clip("evenodd");
      ctx.fillStyle = "#10141f";
      ctx.fillRect(0, 0, VIEW_W, screen.height);
      ctx.restore();
    }
  }

  // Velo colorato del "meteo politico": tinge lievemente lo sfondo battaglia
  // quando i SONDAGGI attivano il modificatore (>=70 governo / <=40 opposizione),
  // così il banner testuale iniziale ha anche un riscontro visivo persistente.
  private drawWeatherTint(screen: Screen): void {
    const sond = this.state.sondaggi;
    if (sond >= 70) {
      // Luna di miele del GOVERNO: velo caldo/dorato, più intenso in alto.
      this.drawTintGradient(screen, "255,214,120", 0.16 + (sond - 70) / 30 * 0.08);
    } else if (sond <= 40) {
      // Piazza in fermento: velo freddo/rosso-piazza, più intenso in basso.
      this.drawTintGradient(screen, "216,72,72", 0.14 + (40 - sond) / 40 * 0.08, true);
    }
  }

  private drawTintGradient(screen: Screen, rgb: string, alpha: number, fromBottom = false): void {
    const ctx = screen.ctx;
    const h = screen.height; // la superficie nativa contiene solo la grafica
    const grad = fromBottom
      ? ctx.createLinearGradient(0, h, 0, 0)
      : ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(${rgb},${alpha})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, h);
    ctx.restore();
  }

  // Alone dorato dietro il leggendario: cerchio luminoso pulsante + raggi.
  private drawLegendaryAura(screen: Screen, cx: number, cy: number): void {
    const ctx = screen.ctx;
    const t = this.state.reduceEffects ? 0 : this.fx.time;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.save();
    // Bagliore radiale.
    const r = 30 + pulse * 4;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    grad.addColorStop(0, `rgba(255, 230, 130, ${0.35 + pulse * 0.15})`);
    grad.addColorStop(1, "rgba(255, 210, 60, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Raggi rotanti, pochi e netti.
    ctx.strokeStyle = `rgba(255, 240, 170, ${0.25 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const a = t * 0.6 + (i * Math.PI) / 4;
      const r0 = 18;
      const r1 = 30 + pulse * 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Lampo d'apertura a tutto schermo + banner "LEGGENDARIO!" che entra a molla.
  private drawLegendIntro(screen: Screen): void {
    const ctx = screen.ctx;
    if (this.legendIntroFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 246, 200, ${0.7 * this.legendIntroFlash})`;
      ctx.fillRect(0, 0, VIEW_W, screen.height);
      ctx.restore();
    }
  }

  private drawBall(screen: Screen): void {
    if (!this.ballAnim) {
      return;
    }
    const anim = this.ballAnim;
    if (anim.viral) {
      const atlas = sceneImage("battle:viral", "ui/battle/viral.png");
      const frame = this.state.reduceEffects ? 3 : Math.min(3, Math.floor(anim.t / .55));
      if (atlas) screen.imageRegion(atlas, (frame % 2) * 240, Math.floor(frame / 2) * 135, 240, 135, 0, Math.round((screen.height - 135) / 2), 240, 135);
      return;
    }
    let x = 168;
    const g = battleGeometry(screen.height);
    let y = g.foeBase - 22;
    if (!this.state.reduceEffects && anim.t < 0.5) {
      // Parabola di lancio.
      const p = anim.t / 0.5;
      x = 40 + p * 128;
      y = (g.playerBase - 46) * (1 - p) + (g.foeBase - 22) * p - Math.sin(p * Math.PI) * 52;
    } else {
      const shakePhase = Math.floor((anim.t - 0.7) / 0.55);
      if (!this.state.reduceEffects && anim.t > 0.7 && shakePhase < anim.shakes) {
        const wobble = Math.sin((anim.t - 0.7) * 18) * 3;
        x += wobble;
        if (Math.abs(wobble) > 2.6) {
          audio.ballShake();
        }
      }
    }
    // Scheda elettorale (cattura): PNG PixelLab.
    const ballotImg = sceneImage("item:scheda", "items/scheda.png");
    if (!ballotImg) {
      return;
    }
    const s = 14 / Math.max(ballotImg.width, ballotImg.height);
    screen.imageSprite(ballotImg, x - (ballotImg.width * s) / 2, y - (ballotImg.height * s) / 2, { scaleX: s, scaleY: s });
  }

}

// Testo d'annuncio per ogni TRIGGER OFFENSIVO (R42): mostrato una volta per
// specie in battaglia, alla prima volta che l'effetto alza il danno. Simmetrico
// ai difensivi (LODO/GILET/TEFLON), che già parlavano.
const OFFENSIVE_TRIGGER_TEXT: Record<OffensiveTrigger, (name: string) => string> = {
  maggioranza: (n) => `MAGGIORANZA! ${n} ha i numeri e picchia più forte!`,
  opposizione: (n) => `OPPOSIZIONE! ${n}, con le spalle al muro, raddoppia la foga!`,
  whatever: (n) => `WHATEVER IT TAKES! ${n} fa qualunque cosa: colpo devastante!`,
  caimano: (n) => `CAIMANO! ${n} azzanna il nemico già nei guai!`,
  primapagina: (n) => `PRIMA PAGINA! Il primo attacco di ${n} fa notizia!`,
  santino: (n) => `Il SANTINO ELETTORALE carica il colpo di ${n}!`,
  agendarossa: (n) => `L'AGENDA ROSSA infiamma la retorica di ${n}!`
};

// MOSSE DA CAMPAGNA: spendi SONDAGGI per effetti una-tantum in battaglia. Sono
// la risorsa che collega il consenso (prima solo passivo) al loop di lotta.
// `minSond` = soglia minima di sondaggi per poterle usare.
type CampaignKind = "spin" | "farlocco" | "ruspa" | "appello";
const CAMPAIGN_ACTIONS: Array<{
  kind: CampaignKind; label: string; cost: number; minSond: number; desc: string;
}> = [
  { kind: "spin", label: "SPIN MEDIATICO", cost: 8, minSond: 8,
    desc: "Cura gli status e recupera il 30% dei PV." },
  { kind: "farlocco", label: "SONDAGGIO FARLOCCO", cost: 12, minSond: 12,
    desc: "Gonfia i numeri: GRINTA +2." },
  { kind: "ruspa", label: "RUSPA DEL CONSENSO", cost: 20, minSond: 55,
    desc: "Colpo fisso che ignora la difesa (serve consenso alto)." },
  { kind: "appello", label: "APPELLO AL VOTO", cost: 15, minSond: 12,
    desc: "Raddoppia la probabilità della prossima cattura." }
];
