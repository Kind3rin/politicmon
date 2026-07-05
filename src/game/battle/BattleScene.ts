import { ITEMS } from "../../data/items";
import { MOVES, STATUS_NAMES, moveSummary, moveKindLabel, type Move } from "../../data/moves";
import { TYPE_COLORS } from "../../data/poltypes";
import { BADGE_TEASER, type TrainerDef } from "../../data/trainers";
import { audio } from "../../engine/audio";
import type { Input } from "../../engine/input";
import type { Scene, SceneStack } from "../../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import { sceneImage } from "../../engine/assets";
import { markCaught, markSeen, saveGame, type GameState } from "../state";
import { addSondaggi, bumpSondaggi, expMalus, hasMinistro, moneyMalus } from "../governo";
import { bumpDailyQuest } from "../dailyquests";
import { zoneProgress } from "../../data/dexzones";
import {
  abilityOf, evolve, expForLevel, expYield, gainExp, healMonster, heldItemOf, LEVEL_CAP, levelEvolution, speciesOf,
  statsOf, type Monster
} from "../monster";
import { typeMultiplier } from "../../data/poltypes";
import {
  calcDamage, catchChance, chooseFoeMove, effectiveStat, makeCombatant, runChance, statName,
  type AiProfile, type Combatant, type OffensiveTrigger
} from "./sim";
import { Menu, MessageBox, clipToWidth, wrapText, GREY, INK } from "../../ui/widgets";
import {
  approach, BattleFx, drawBattleMonster, drawCombatantBox, drawEllipse, monsterCenter, FOE_BOX, PLAYER_BOX
} from "./view";
import { PartyScene } from "../../scenes/PartyScene";
import { BagScene } from "../../scenes/BagScene";
import { EvolutionScene } from "../../scenes/EvolutionScene";

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
  // RIVINCITA (R42 economia): true se è un rematch di un trainer già battuto. Lo
  // SPOT IN PRIME TIME (+50% fondi) è ESCLUSO dai rematch: il bonus resta un
  // acceleratore sui trainer di storia/nuovi, non un faucet sui ribattuti.
  isRematch?: boolean;
  onEnd: (result: BattleResult) => void;
}

// Boss narrativi: tema musicale dedicato (e IA boss-grade in computeAiProfile).
// Esportato: la WorldScene lo usa per l'hold-item extra dei boss in HARD MODE.
export const BOSS_TRAINER_IDS = ["boss", "garante", "ilcapitano", "tesoriere", "commissione"];

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
  private mode: "queue" | "menu" | "fight" | "ask" | "campaign" = "queue";
  private msg = new MessageBox();
  private mainMenu = new Menu([
    { label: "LOTTA" }, { label: "BORSA" }, { label: "SQUADRA" }, { label: "CAMPAGNA" }, { label: "FUGA" }
  ]);
  private campaignMenu = new Menu([]);
  private catchBoost = false; // APPELLO AL VOTO: raddoppia la prossima cattura
  private fightMenu = new Menu([]);
  // Efficacia per mossa (allineata a fightMenu.items): colora le label nel
  // menu LOTTA se la specie avversaria è già nel Dex.
  private fightEff: Array<"super" | "weak" | "immune" | null> = [];
  // true quando il menu LOTTA mostra il solo COMIZIO di riserva (tutte le mosse a 0 PP).
  private fightFallback = false;
  private askMenu = new Menu([{ label: "SÌ" }, { label: "NO" }]);
  private askText = "";
  private askYes: (() => void) | null = null;
  private askNo: (() => void) | null = null;

  private displayHp = { player: 0, foe: 0 };
  private displayExp = 0;
  // Trigger offensivi già annunciati in QUESTA battaglia (chiave specie:effetto):
  // ogni effetto (MAGGIORANZA/OPPOSIZIONE/WHATEVER/CAIMANO/SANTINO/AGENDA ROSSA)
  // si annuncia una volta sola per specie, come i difensivi (LODO/GILET).
  private announcedOffensive = new Set<string>();
  private runAttempts = 0;
  private finished = false;
  private ballAnim: { t: number; shakes: number; success: boolean } | null = null;
  private captured = false; // il nemico è stato reclutato: niente più sprite in campo
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
    this.foeTeam = opts.foeTeam;
    this.trainer = opts.trainer;
    this.isRematch = opts.isRematch ?? false;
    this.isLegendary = opts.legendary ?? false;
    this.onEnd = opts.onEnd;
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
    this.displayHp.player = lead.hp;
    this.displayHp.foe = this.foe.mon.hp;
    this.displayExp = this.expRatio();
    // Prima volta che incontri questa specie: banner "UN VOLTO MAI VISTO!"
    // (la scoperta del nuovo è il gancio più forte della collezione).
    const firstTime = markSeen(this.state, this.foe.mon.speciesId);
    if (firstTime && !opts.legendary && !opts.trainer) {
      this.firstSeenBanner = 2.2;
    }

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
      this.push({ text: `${this.trainer.name} ti sfida!` });
      for (const line of this.trainer.intro) {
        this.push({ text: line });
      }
      this.push({ text: `${this.trainer.name} manda in campo ${this.foeName()}!` });
    } else {
      this.push({ text: `Un ${this.foeName()} selvatico sbuca dalla campagna elettorale!` });
    }
    this.push({ text: `Vai, ${this.playerName()}!` });
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
    this.pushEntryAbility(this.player, this.playerName());
  }

  // VOLTAGABBANA: l'effetto (+1 OPPORTUNISMO) è applicato da makeCombatant;
  // qui si annuncia soltanto, a ogni ingresso in campo.
  private pushEntryAbility(c: Combatant, name: string): void {
    if (abilityOf(c.mon)?.id === "voltagabbana") {
      this.push({ text: `${name} cambia casacca al volo: OPPORTUNISMO sale!` });
    }
  }

  // ---- Helpers ----

  // Profilo di difficoltà dell'IA in base al contesto. I wild e i primi
  // allenatori sbagliano spesso, non si curano da fenomeni e lasciano scampo al
  // giocatore agli sgoccioli; palestre e boss restano competenti. Così la curva
  // di difficoltà sale con la partita invece di partire al massimo.
  private computeAiProfile(): AiProfile {
    const id = this.trainer?.id ?? "";
    const isBoss = BOSS_TRAINER_IDS.includes(id) || id.startsWith("rival");
    // R42 economia (LOTTO 3): MODALITÀ DIFFICILE dà QUALITÀ, non solo +livelli.
    // I boss diventano quasi infallibili (whiff 0.20→0.10); i capipalestra
    // salgono a boss-grade; e persino gli allenatori COMUNI acquisiscono
    // cura+finisher con un whiff-floor più basso. La modalità normale è INTATTA.
    const hard = this.state.hardMode;
    if (isBoss) {
      // Boss narrativi e RIVALE: sempre competenti, è il loro momento.
      return { whiff: hard ? 0.1 : 0.2, canHeal: true, finisher: true };
    }
    if (this.trainer?.badge) {
      // Capipalestra: tosti ma non perfetti (in hard, boss-grade).
      return { whiff: hard ? 0.15 : 0.28, canHeal: true, finisher: true };
    }
    // Wild e allenatori comuni: clemenza scalata sulle medaglie conquistate
    // (più avanti sei, meno sbagliano). In NORMALE floor 0.33, niente cura/
    // finisher. In HARD i TRAINER comuni ottengono cura+finisher e un floor più
    // basso (0.22); i selvatici (nessun trainer) restano clementi come prima.
    const badges = this.state.badges.length;
    const isCommonTrainer = Boolean(this.trainer);
    if (hard && isCommonTrainer) {
      return { whiff: Math.max(0.22, 0.4 - badges * 0.05), canHeal: true, finisher: true };
    }
    const whiff = Math.max(0.33, 0.48 - badges * 0.05);
    return { whiff, canHeal: false, finisher: false };
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
        // Boost campagna: una carica si consuma SOLO nelle battaglie dove il
        // rispettivo bonus è davvero applicato (R42, audit: prima ogni win —
        // wild inclusi — bruciava tutti e tre i contatori anche quando il bonus
        // non c'era). Il contatore è già clampato >=0 dal parseState.
        //  - MANIFESTI (EXP): l'EXP arriva da OGNI foe KO (foeFaintedSteps),
        //    wild e trainer → consuma su qualunque vittoria per KO ("win").
        //    Sulla cattura non c'è EXP, quindi non scala.
        //  - SPOT (fondi) e COMIZIO (SONDAGGI ×2): il payout e il raddoppio
        //    sondaggi vivono SOLO nel ramo trainer di afterFoeDown → consumano
        //    solo battendo un TRAINER.
        const won = result === "win";
        if (won && this.state.boostExpBattles > 0) this.state.boostExpBattles -= 1;
        if (won && this.trainer) {
          // R42: lo SPOT non si applica ai rematch → non bruciare la carica lì
          // (altrimenti si sprecherebbe un uso senza bonus). Il COMIZIO
          // (SONDAGGI ×2) vale anche sui rematch, quindi si consuma comunque.
          if (!this.isRematch && this.state.boostMoneyBattles > 0) this.state.boostMoneyBattles -= 1;
          if (this.state.boostSondBattles > 0) this.state.boostSondBattles -= 1;
        }
        audio.playMusic(null);
        this.onEnd(result);
      }
    });
  }

  // ---- Turn building ----

  private startTurn(playerMove: Move): void {
    const slot = this.player.mon.moves.find((s) => s.id === playerMove.id);
    if (slot) {
      slot.pp = Math.max(0, slot.pp - 1);
    }
    const foeMove = chooseFoeMove(this.foe, this.player, this.ai);
    const pPriority = playerMove.effect?.priority ?? 0;
    const fPriority = foeMove.effect?.priority ?? 0;
    const playerFirst =
      pPriority !== fPriority
        ? pPriority > fPriority
        : effectiveStat(this.player, "spd") === effectiveStat(this.foe, "spd")
          ? Math.random() < 0.5
          : effectiveStat(this.player, "spd") > effectiveStat(this.foe, "spd");

    const first = playerFirst ? "player" : "foe";
    const second = playerFirst ? "foe" : "player";
    this.pushMove(first, first === "player" ? playerMove : foeMove);
    this.push({
      run: () => {
        if (this.player.mon.hp > 0 && this.foe.mon.hp > 0) {
          this.pushMoveNow(second, second === "player" ? playerMove : foeMove);
        }
      }
    });
    this.pushEndOfTurn();
  }

  private pushMoveNow(side: "player" | "foe", move: Move): void {
    // Inserisce gli step della mossa in testa alla coda (dopo lo step corrente).
    const saved = this.queue;
    this.queue = [];
    this.pushMove(side, move);
    this.queue = [...this.queue, ...saved];
  }

  private pushMove(side: "player" | "foe", move: Move): void {
    const attacker = side === "player" ? this.player : this.foe;
    const defender = side === "player" ? this.foe : this.player;
    const attackerName = side === "player" ? this.playerName() : `Il nemico ${this.foeName()}`;

    this.push({
      run: () => {
        if (attacker.mon.hp <= 0 || defender.mon.hp <= 0) {
          return;
        }
        // Status: INDAGATO può bloccare il turno.
        if (attacker.mon.status === "indagato" && Math.random() < 0.25) {
          this.pushFront([{ text: `${attackerName} è trattenuto in audizione! Non può agire!` }]);
          return;
        }
        // GAFFE: come la confusione.
        if (attacker.gaffeTurns > 0) {
          attacker.gaffeTurns -= 1;
          if (attacker.gaffeTurns === 0) {
            this.pushFront([{ text: `${attackerName} ha chiarito la GAFFE con una nota stampa!` }]);
          } else if (Math.random() < 0.33) {
            const self = Math.max(1, Math.floor((attacker.mon.level * 2) / 3) + 2);
            attacker.mon.hp = Math.max(0, attacker.mon.hp - self);
            this.pushFront([
              { text: `${attackerName} riformula la GAFFE e peggiora tutto!`, waitHp: true, run: () => audio.hit() },
              ...this.koCheckSteps(side === "player" ? "player" : "foe")
            ]);
            return;
          }
        }
        this.pushFront(this.moveSteps(side, attacker, defender, move, attackerName));
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
        if (this.foe.mon.hp > 0) {
          this.pushMoveNow("foe", chooseFoeMove(this.foe, this.player, this.ai));
        }
      }
    };
  }

  private moveSteps(
    side: "player" | "foe",
    attacker: Combatant,
    defender: Combatant,
    move: Move,
    attackerName: string
  ): Step[] {
    const defenderName = side === "player" ? `Il nemico ${this.foeName()}` : this.playerName();
    const steps: Step[] = [];

    // Telegrafia: il nemico "carica" la mossa con un'aura colorata per categoria,
    // così il giocatore può leggere se sarà fisica, speciale o di status.
    if (side === "foe") {
      const color =
        move.category === "fisico" ? "#e85a5a" : move.category === "speciale" ? "#5a9ae8" : "#b86ad8";
      steps.push({
        run: () => {
          this.fx.telegraph = { side: "foe", color, t: 0.5, max: 0.5 };
        },
        pause: 0.5
      });
    }

    steps.push({ text: `${attackerName} usa ${move.name}!` });

    if (side === "foe") {
      const slot = attacker.mon.moves.find((s) => s.id === move.id);
      if (slot) {
        slot.pp = Math.max(0, slot.pp - 1);
      }
    }

    const selfTargeted = move.power === 0 && !move.effect?.status && move.effect?.stat?.target !== "foe";
    if (!selfTargeted && Math.random() * 100 >= move.accuracy) {
      steps.push({ text: "Ma manca il bersaglio! La piazza fischia." });
      return steps;
    }

    if (move.power > 0) {
      // Contesto SONDAGGI (meteo politico): SOLO qui nel PVE; il duello resta neutro.
      const result = calcDamage(attacker, defender, move, Math.random, { sondaggi: this.state.sondaggi });
      steps.push({
        run: () => {
          defender.mon.hp = Math.max(0, defender.mon.hp - result.damage);
          this.fx.onHit(side, result.typeMult, result.crit, result.damage);
        },
        waitHp: true,
        pause: 0.25
      });
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
      if (result.crit) {
        steps.push({ text: "Colpo critico! I retroscenisti impazziscono!" });
      }
      if (result.lodo) {
        steps.push({
          text: `Il LODO protegge ${defenderName}: primo colpo dimezzato!`,
          run: () => audio.holdGuard()
        });
      }
      if (result.typeMult === 0) {
        steps.push({ text: "Non ha alcun effetto..." });
      } else if (result.typeMult >= 2) {
        steps.push({
          text:
            move.type === "SINISTRA" && speciesOf(defender.mon).types.includes("SINISTRA")
              ? "È super efficace! La SINISTRA è fortissima contro se stessa!"
              : "È super efficace!"
        });
      } else if (result.typeMult < 1) {
        steps.push({ text: "Non è molto efficace..." });
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
      const immuneStatDrop = abilityOf(target.mon)?.id === "poltrona" || abilityOf(target.mon)?.id === "garanzia";
      if (
        effect.stat.target === "foe" &&
        effect.stat.stages < 0 &&
        immuneStatDrop
      ) {
        steps.push({
          text: abilityOf(target.mon)?.id === "garanzia"
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
    if (effect?.status && defender.mon.hp > 0) {
      // TEFLON (e GARANZIA COSTITUZIONALE): immune agli status (guard PRIMA del
      // tiro di chance, come in duelsim). TELECAMERA (hold): previene solo la GAFFE.
      const defAbility = abilityOf(defender.mon)?.id;
      const immuneTeflon = defAbility === "teflon" || defAbility === "garanzia";
      const immuneCamera = effect.status.id === "gaffe" && heldItemOf(defender.mon)?.id === "telecamera";
      if (immuneTeflon || immuneCamera) {
        if (effect.status.chance >= 100) {
          steps.push({
            text: immuneTeflon
              ? (defAbility === "garanzia"
                  ? `GARANZIA COSTITUZIONALE! Le accuse non scalfiscono ${defenderName}.`
                  : `TEFLON! Le accuse scivolano via da ${defenderName}.`)
              : `La TELECAMERA riprende tutto: ${defenderName} evita la GAFFE!`,
            run: () => audio.abilityBlock()
          });
        }
      } else if (Math.random() * 100 < effect.status.chance) {
        const id = effect.status.id;
        if (defender.mon.status || (id === "gaffe" && defender.gaffeTurns > 0)) {
          if (effect.status.chance >= 100) {
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
        },
        pause: 0.15
      },
      { text: `Il nemico ${this.foeName()} si ritira dalla corsa!` }
    ];
    const istruzione = hasMinistro(this.state, "istruzione");
    const base = expYield(this.foe.mon, Boolean(this.trainer));
    // ONDA DEL CONSENSO (feature originale): l'EXP scala coi SONDAGGI.
    // Popolarità alta = i tuoi crescono in fretta; impopolarità = penalità.
    // MODALITÀ DIFFICILE: l'onda è DISATTIVATA (wave neutro, nessun bonus EXP).
    const sond = this.state.sondaggi;
    const wave = this.state.hardMode ? 1 : sond >= 70 ? 1.25 : sond >= 40 ? 1 : 0.92;
    // MANIFESTI OVUNQUE (boost campagna): +30% EXP finché restano battaglie.
    const manifestiBonus = this.state.boostExpBattles > 0 ? 1.3 : 1;
    const gained = Math.max(
      1,
      Math.floor(base * (istruzione ? 1.15 : 1) * wave * manifestiBonus * expMalus(this.state))
    );
    steps.push({ text: `${this.playerName()} guadagna ${gained} PUNTI CONSENSO!` });
    if (wave > 1) {
      steps.push({ text: `ONDA DEL CONSENSO! I sondaggi al ${sond}% gonfiano l'esperienza (+25%)!` });
    } else if (wave < 1) {
      steps.push({ text: `Sondaggi a terra (${sond}%): l'entusiasmo scarseggia (-8%).` });
    }
    if (manifestiBonus > 1) {
      steps.push({ text: "I MANIFESTI OVUNQUE gonfiano l'entusiasmo: +30% CONSENSO!" });
    }
    if (istruzione) {
      steps.push({ text: "Il MIN. ISTRUZIONE ha preparato la squadra: bonus del 15%!" });
    }
    // DIVISA EQUA: condivide metà EXP con il resto della squadra viva.
    const hasShare = (this.state.bag["divisa"] ?? 0) > 0;
    if (hasShare) {
      steps.push({ text: "La DIVISA EQUA spartisce il consenso con tutta la squadra!" });
    }
    steps.push({
      run: () => {
        const followUp: Step[] = [];
        // EXP condivisa (silenziosa) agli altri membri vivi, prima del lead
        // così i loro level-up non interrompono l'animazione del protagonista.
        if (hasShare) {
          const shared = Math.max(1, Math.floor(gained / 2));
          for (const mon of this.state.party) {
            if (mon === this.player.mon || mon.hp <= 0) {
              continue;
            }
            const ev = gainExp(mon, shared, this.state.sondaggi);
            if (ev.length > 0) {
              followUp.push({ text: `${speciesOf(mon).name} cresce in panchina: ora è L${mon.level}!` });
            }
            const target = ev.find((event) => event.evolvesTo)?.evolvesTo ?? levelEvolution(mon, this.state.sondaggi);
            if (target) {
              followUp.push({ text: `${speciesOf(mon).name} è pronto per il salto di carriera!` });
              followUp.push(...this.evolveStepsFor(mon, target));
            }
          }
        }
        const events = gainExp(this.player.mon, gained, this.state.sondaggi);
        let queuedEvolution = false;
        for (const event of events) {
          followUp.push({ run: () => { audio.levelUp(); this.fx.levelFlash = 0.6; } });
          followUp.push({ text: `${this.playerName()} sale al livello ${event.newLevel}!`, waitHp: true });
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
            followUp.push({ text: `${this.playerName()} ha abbastanza consenso per evolversi!` });
            followUp.push(...this.evolveStepsFor(this.player.mon, target));
          }
        }
        followUp.push({ run: () => this.afterFoeDown() });
        this.pushFront(followUp);
      }
    });
    return steps;
  }

  private learnMoveSteps(moveId: string): Step[] {
    const move = MOVES[moveId];
    return [
      {
        run: () => {
          const mon = this.player.mon;
          if (mon.moves.length < 4) {
            mon.moves.push({ id: moveId, pp: move.pp });
            this.pushFront([{ text: `${this.playerName()} impara ${move.name}!` }]);
            return;
          }
          this.ask(
            `Vuoi dimenticare una mossa per imparare ${move.name}?`,
            () => {
              const choice = new Menu(
                mon.moves.map((slot) => ({ label: MOVES[slot.id].name }))
              );
              this.fightMenu = choice;
              this.mode = "fight";
              this.onFightSelect = (index) => {
                const old = MOVES[mon.moves[index].id];
                mon.moves[index] = { id: moveId, pp: move.pp };
                this.mode = "queue";
                this.pushFront([
                  { text: `1, 2, 3... PUF! ${this.playerName()} dimentica ${old.name}...` },
                  { text: `...e impara ${move.name}!` }
                ]);
              };
              this.onFightCancel = () => {
                this.mode = "queue";
                this.pushFront([{ text: `${this.playerName()} rinuncia a ${move.name}.` }]);
              };
            },
            () => {
              this.pushFront([{ text: `${this.playerName()} rinuncia a ${move.name}.` }]);
            }
          );
        }
      }
    ];
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
            })
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
      this.pushFront(entry);
      return;
    }
    const steps: Step[] = [];
    if (this.trainer) {
      const trainer = this.trainer;
      const economia = hasMinistro(this.state, "economia");
      // SPOT IN PRIME TIME (boost campagna): +50% fondi dai trainer finché attivo.
      // R42 economia: ESCLUSO dai rematch (era un faucet netto +3.800€). Sui
      // ribattuti il bonus non si applica (ma il contatore boost si consuma solo
      // dove il bonus vale davvero — vedi endBattle: non consumato sui rematch).
      const spotBonus = this.state.boostMoneyBattles > 0 && !this.isRematch ? 1.5 : 1;
      const payout = Math.round(trainer.money * (economia ? 1.25 : 1) * spotBonus * moneyMalus(this.state));
      steps.push({ run: () => audio.victory() });
      steps.push({ text: `Hai sconfitto ${trainer.name}!` });
      for (const line of trainer.defeat) {
        steps.push({ text: line });
      }
      steps.push({
        text: `Ricevi ${payout}€ di rimborso elettorale!`,
        run: () => {
          this.state.money += payout;
        }
      });
      if (economia) {
        steps.push({ text: "Il MIN. ECONOMIA ha trovato la copertura: +25%!" });
      }
      if (spotBonus > 1) {
        steps.push({ text: "Lo SPOT IN PRIME TIME riempie le casse: +50% fondi!" });
      }
      steps.push({
        run: () => {
          // COMIZIO OCEANICO (boost campagna): guadagno SONDAGGI raddoppiato.
          const sondGain = this.state.boostSondBattles > 0 ? 12 : 6;
          const { value, milestone } = bumpSondaggi(this.state, sondGain);
          const lines: Step[] = [{ text: `I SONDAGGI ti premiano: gradimento al ${value}%!` }];
          if (milestone) {
            // Notifica gamificata quando superi una soglia chiave.
            lines.push({ text: milestone, run: () => audio.catchJingle() });
          }
          this.pushFront(lines);
        }
      });
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
            const lead: Step[] = [];
            if (this.state.badges.length === 1) {
              lead.push(
                { text: "BREAKING NEWS! Con la prima medaglia si apre il GOVERNO OMBRA!", run: () => audio.catchJingle() },
                { text: "Dal menu (START) trovi la voce GOVERNO: 6 MINISTERI da assegnare." },
                { text: "Ogni ministro dà un bonus passivo (soldi, cure, incontri, cattura...)." },
                { text: "Attento: da oggi ogni incarico ha anche un piccolo costo. Scegli bene." }
              );
            }
            // Cliffhanger: anticipa la prossima tappa per invogliare a continuare.
            const teaser = BADGE_TEASER[trainer.badge!];
            if (teaser) {
              for (const line of teaser) {
                lead.push({ text: line });
              }
            }
            if (lead.length > 0) {
              this.pushFront(lead);
            }
          }
        });
      }
      if (trainer.reward) {
        const item = ITEMS[trainer.reward.itemId];
        steps.push({
          text: `Ottieni ${item.name} x${trainer.reward.qty}!`,
          run: () => {
            this.state.bag[item.id] = (this.state.bag[item.id] ?? 0) + trainer.reward!.qty;
          }
        });
      }
      // BONUS A SORPRESA: ~30% di pescare un extra dalla "mazzetta elettorale".
      // Variabilità della ricompensa = quel "ancora una battaglia".
      if (Math.random() < 0.3) {
        const drop = rollLootDrop();
        const isJackpot = drop.id === "tessera";
        if (isJackpot) {
          // JACKPOT: la rara TESSERA DORATA merita un trattamento speciale
          // (lampo dorato + scintille + fanfara di vittoria, come la cattura).
          steps.push({
            run: () => {
              audio.victory();
              this.fx.catchFlash = 0.9;
              const c = monsterCenter("foe");
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
          steps.push({
            text: `JACKPOT! È uscita una rarissima ${ITEMS[drop.id].name}!`,
            run: () => {
              this.state.bag[drop.id] = (this.state.bag[drop.id] ?? 0) + drop.qty;
            }
          });
        } else {
          steps.push({ run: () => audio.catchJingle() });
          steps.push({
            text: `BUSTA A SORPRESA! Dentro c'è: ${ITEMS[drop.id].name} x${drop.qty}!`,
            run: () => {
              this.state.bag[drop.id] = (this.state.bag[drop.id] ?? 0) + drop.qty;
            }
          });
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
          audio.faint();
          this.fx.hitStop = Math.max(this.fx.hitStop, 0.25);
          this.fx.koFlash = 0.5;
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
          this.stack.push(
            new PartyScene(this.stack, this.input, this.state, {
              mode: "forced-switch",
              onChoose: (mon) => this.switchTo(mon, true)
            })
          );
        }
      }
    ];
  }

  private switchTo(mon: Monster, afterFaint: boolean): void {
    this.player = makeCombatant(mon);
    this.displayHp.player = mon.hp;
    this.displayExp = this.expRatio();
    const steps: Step[] = [];
    // Avviso one-shot: al PRIMO cambio volontario (non forzato da KO) spiega che
    // il cambio lascia campo libero all'avversario. Un neofita altrimenti cambia
    // "per guardare" e si becca un colpo gratis senza capire perché.
    if (!afterFaint && !this.state.flags["seen-switch-tip"]) {
      this.state.flags["seen-switch-tip"] = true;
      steps.push({ text: "Cambiare candidato lascia campo libero all'avversario: perdi il turno!" });
    }
    steps.push({ text: `Tocca a te, ${this.playerName()}!` });
    if (abilityOf(mon)?.id === "voltagabbana") {
      steps.push({ text: `${this.playerName()} cambia casacca al volo: OPPORTUNISMO sale!` });
    }
    if (!afterFaint) {
      // Il cambio consuma il turno: il nemico attacca (col blocco status).
      steps.push(this.foeCounterStep());
      steps.push(...this.endOfTurnSteps());
    }
    this.pushFront(steps);
    this.mode = "queue";
  }

  private pushEndOfTurn(): void {
    this.push({
      run: () => this.pushFront(this.endOfTurnSteps())
    });
  }

  private endOfTurnSteps(): Step[] {
    const apply = (c: Combatant, name: string): Step[] => {
      const steps: Step[] = [];
      if (c.mon.hp > 0 && c.mon.status === "scandalo") {
        steps.push(
          {
            text: `${name} è logorato dallo SCANDALO!`,
            run: () => {
              c.mon.hp = Math.max(0, c.mon.hp - Math.max(1, Math.floor(statsOf(c.mon).hp / 8)));
              audio.hit();
            },
            waitHp: true
          },
          ...this.koCheckSteps(c === this.player ? "player" : "foe")
        );
      }
      // Cure di fine turno (dopo lo SCANDALO, come in duelsim):
      // GALLEGGIAMENTO (abilità, 1/16) e CAFFETTIERA (hold, 1/16, solo PVE).
      const healEot = (label: string, cond: () => boolean, sfx: () => void) => {
        steps.push({
          run: () => {
            const max = statsOf(c.mon).hp;
            if (c.mon.hp <= 0 || c.mon.hp >= max || !cond()) {
              return;
            }
            c.mon.hp = Math.min(max, c.mon.hp + Math.max(1, Math.floor(max / 16)));
            sfx();
            this.pushFront([{ text: `${label} ${name} recupera un po' di consenso!`, waitHp: true }]);
          }
        });
      };
      healEot("GALLEGGIAMENTO!", () => abilityOf(c.mon)?.id === "galleggiamento", () => audio.heal());
      healEot("La CAFFETTIERA fuma:", () => heldItemOf(c.mon)?.id === "caffettiera", () => audio.holdBrew());
      return steps;
    };
    return [...apply(this.player, this.playerName()), ...apply(this.foe, `Il nemico ${this.foeName()}`)];
  }

  // ---- Oggetti ----

  useItem(itemId: string): void {
    const item = ITEMS[itemId];
    if (!item) {
      return;
    }
    if (item.kind === "ball") {
      this.throwBall(itemId);
      return;
    }
    if (item.kind === "evo") {
      this.pushFront([
        { text: "Le tessere si firmano in segreteria, non in diretta TV!" }
      ]);
      this.mode = "queue";
      return;
    }
    if (item.kind === "hold" || item.kind === "tm" || item.kind === "key") {
      this.pushFront([
        { text: "Con calma: si equipaggia fuori dai riflettori, dalla BORSA." }
      ]);
      this.mode = "queue";
      return;
    }
    if (item.kind === "field") {
      this.pushFront([
        { text: "Non ora! In diretta non si scappa a colpi di spray e rimborsi." }
      ]);
      this.mode = "queue";
      return;
    }
    this.state.bag[itemId] = Math.max(0, (this.state.bag[itemId] ?? 0) - 1);
    bumpDailyQuest(this.state, "item1"); // missione "USA 1 OGGETTO IN LOTTA"
    const steps: Step[] = [];
    if (item.kind === "heal") {
      steps.push({
        text: `Usi ${item.name} su ${this.playerName()}!`,
        run: () => {
          const max = statsOf(this.player.mon).hp;
          const heal = item.percent != null ? Math.ceil(max * item.percent) : (item.amount ?? 20);
          this.player.mon.hp = Math.min(max, this.player.mon.hp + heal);
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

  private throwBall(itemId: string): void {
    const item = ITEMS[itemId];
    if (this.trainer) {
      this.pushFront([
        { text: "Non si reclutano i candidati altrui in diretta!" },
        { text: "Il regolamento di campagna lo vieta. Sezione 7, comma maleducazione." }
      ]);
      this.mode = "queue";
      return;
    }
    this.state.bag[itemId] = Math.max(0, (this.state.bag[itemId] ?? 0) - 1);
    bumpDailyQuest(this.state, "item1"); // anche la SCHEDA lanciata è un oggetto usato
    const propaganda = hasMinistro(this.state, "propaganda");
    let chance = catchChance(this.foe.mon, itemId, propaganda ? 1.25 : 1);
    // APPELLO AL VOTO (mossa da campagna): raddoppia la prossima cattura, una volta.
    if (this.catchBoost) {
      this.catchBoost = false;
      chance = Math.min(0.95, chance * 2);
    }
    const success = Math.random() < chance;
    const shakes = success ? 3 : Math.min(2, Math.floor(chance * 4 * Math.random()));
    const pct = Math.round(chance * 100);
    const verdict = pct >= 60 ? "alta" : pct >= 30 ? "media" : "bassa";
    this.pushFront([
      { text: `Probabilità di reclutamento: ${pct}% (${verdict}).` },
      { text: `Lanci una ${item.name}!`, run: () => audio.ballThrow() },
      {
        run: () => {
          this.ballAnim = { t: 0, shakes, success };
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
    const steps: Step[] = [
      {
        run: () => {
          audio.catchJingle();
          // Celebrazione: lampo dorato a schermo + scintille dal punto del nemico.
          this.fx.catchFlash = 0.7;
          const c = monsterCenter("foe");
          for (let i = 0; i < 22; i += 1) {
            const ang = (Math.PI * 2 * i) / 22 + 0.2;
            const speed = 70 * (0.6 + Math.random() * 0.8);
            this.fx.particles.push({
              x: c.x + (Math.random() - 0.5) * 12,
              y: c.y + (Math.random() - 0.5) * 12,
              vx: Math.cos(ang) * speed,
              vy: Math.sin(ang) * speed - 30,
              life: 0,
              max: 0.5 + Math.random() * 0.4,
              color: ["#ffe98a", "#ffd23c", "#fff4c0"][i % 3],
              size: 2
            });
          }
        }
      },
      { text: `Fatto! ${this.foeName()} è stato eletto nella tua squadra!` },
      {
        run: () => {
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
            this.pushFront([
              { text: "La squadra è piena: viene spedito al CIRCOLO DI PARTITO (resta nel box)." }
            ]);
          }
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
              this.pushFront([
                { text: `ZONA ${p.zone.name} COMPLETATA! Tutti i candidati schedati.` },
                { text: `Ricompensa: ${r.qty}x ${ITEMS[r.itemId].name}${moneyTxt}!` }
              ]);
            }
          }
          saveGame(this.state);
        }
      },
      { text: `I dati di ${this.foeName()} sono nel POLITICDEX.` }
    ];
    this.endBattle("caught");
    return steps;
  }

  // ---- Ask (sì/no) ----

  private ask(question: string, yes: () => void, no: () => void): void {
    this.askText = question;
    this.askMenu.index = 0;
    this.askYes = yes;
    this.askNo = no;
    this.mode = "ask";
  }

  private onFightSelect: ((index: number) => void) | null = null;
  private onFightCancel: (() => void) | null = null;

  // ---- Update ----

  update(dt: number): void {
    if (this.finished) {
      return;
    }
    this.legendBanner = Math.max(0, this.legendBanner - dt);
    this.firstSeenBanner = Math.max(0, this.firstSeenBanner - dt);
    this.legendIntroFlash = Math.max(0, this.legendIntroFlash - dt);
    // I leggendari spruzzano scintille dorate di continuo: aura "viva".
    if (this.isLegendary && this.foe.mon.hp > 0 && Math.random() < 0.25) {
      const c = monsterCenter("foe");
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
      this.msg.update(dt, this.input);
      if (this.msg.isOpen) {
        return;
      }
      if (this.stepTimer > 0) {
        this.stepTimer -= dt;
        return;
      }
      const hpSettled =
        Math.abs(this.displayHp.player - this.player.mon.hp) < 0.5 &&
        Math.abs(this.displayHp.foe - this.foe.mon.hp) < 0.5;
      const step = this.queue[0];
      if (!step) {
        if (hpSettled) {
          this.mainMenu.index = 0;
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
        this.msg.show([step.text]);
      }
      return;
    }

    if (this.mode === "menu") {
      const result = this.menuGridUpdate();
      if (result === null) {
        return;
      }
      if (result === 0) {
        this.openFightMenu();
      } else if (result === 1) {
        this.stack.push(
          new BagScene(this.stack, this.input, this.state, {
            inBattle: true,
            onUse: (itemId) => this.useItem(itemId)
          })
        );
      } else if (result === 2) {
        this.stack.push(
          new PartyScene(this.stack, this.input, this.state, {
            mode: "battle-switch",
            currentUid: this.player.mon.uid,
            onChoose: (mon) => this.switchTo(mon, false)
          })
        );
      } else if (result === 3) {
        this.openCampaignMenu();
      } else if (result === 4) {
        this.tryRun();
      }
      return;
    }

    if (this.mode === "campaign") {
      const action = this.campaignMenu.update(this.input);
      if (action === "select") {
        this.useCampaign(CAMPAIGN_ACTIONS[this.campaignMenu.index]);
      } else if (action === "cancel") {
        audio.cancel();
        this.mode = "menu";
      }
      return;
    }

    if (this.mode === "fight") {
      const action = this.fightGridUpdate();
      if (action === "select") {
        if (this.onFightSelect) {
          const handler = this.onFightSelect;
          this.onFightSelect = null;
          this.onFightCancel = null;
          handler(this.fightMenu.index);
          return;
        }
        if (this.fightFallback) {
          // COMIZIO di riserva a PP esauriti: non consuma PP (il mon non ha lo
          // slot COMIZIO, quindi startTurn non decrementa nulla).
          this.mode = "queue";
          this.startTurn(MOVES.comizio);
          return;
        }
        const slot = this.player.mon.moves[this.fightMenu.index];
        if (!slot || slot.pp <= 0) {
          audio.cancel();
          return;
        }
        this.mode = "queue";
        this.startTurn(MOVES[slot.id]);
      } else if (action === "cancel") {
        if (this.onFightCancel) {
          const handler = this.onFightCancel;
          this.onFightSelect = null;
          this.onFightCancel = null;
          handler();
          return;
        }
        this.mode = "menu";
      }
      return;
    }

    if (this.mode === "ask") {
      const action = this.askMenu.update(this.input);
      if (action === "select") {
        const handler = this.askMenu.index === 0 ? this.askYes : this.askNo;
        this.mode = "queue";
        handler?.();
      } else if (action === "cancel") {
        this.mode = "queue";
        this.askNo?.();
      }
    }
  }

  private menuGridUpdate(): number | null {
    // Griglia a 2 colonne, 5 voci: LOTTA BORSA / SQUADRA CAMPAGNA / FUGA.
    const n = this.mainMenu.items.length; // 5
    const idx = this.mainMenu.index;
    const set = (target: number) => {
      const clamped = Math.max(0, Math.min(n - 1, target));
      if (clamped !== this.mainMenu.index) {
        this.mainMenu.index = clamped;
        audio.cursor();
      }
    };
    if (this.input.wasPressed("left")) {
      if (idx % 2 === 1) set(idx - 1);
    }
    if (this.input.wasPressed("right")) {
      if (idx % 2 === 0 && idx + 1 < n) set(idx + 1);
    }
    if (this.input.wasPressed("up")) {
      set(idx - 2);
    }
    if (this.input.wasPressed("down")) {
      set(idx + 2);
    }
    if (this.input.wasPressed("a")) {
      audio.confirm();
      return this.mainMenu.index;
    }
    return null;
  }

  // Navigazione 2x2 del menu mosse (stesso schema del menu principale).
  private fightGridUpdate(): "select" | "cancel" | null {
    const n = this.fightMenu.items.length;
    const move = (target: number) => {
      if (target >= 0 && target < n && target !== this.fightMenu.index) {
        this.fightMenu.index = target;
        audio.cursor();
      }
    };
    if (this.input.wasPressed("left")) {
      move(this.fightMenu.index - 1);
    }
    if (this.input.wasPressed("right")) {
      move(this.fightMenu.index + 1);
    }
    if (this.input.wasPressed("up")) {
      move(this.fightMenu.index - 2);
    }
    if (this.input.wasPressed("down")) {
      move(this.fightMenu.index + 2);
    }
    if (this.input.wasPressed("a")) {
      if (this.fightMenu.items[this.fightMenu.index]?.disabled) {
        audio.cancel();
        return null;
      }
      audio.confirm();
      return "select";
    }
    if (this.input.wasPressed("b")) {
      audio.cancel();
      return "cancel";
    }
    return null;
  }

  private openFightMenu(): void {
    // Suggerimento matchup sempre visibile (▲ super / ▼ poco efficace): è il
    // modo principale per imparare il sistema dei tipi senza tentativi a vuoto.
    // La GUIDA TIPI nel menu pausa è il riferimento completo.
    const foeTypes = speciesOf(this.foe.mon).types;
    this.fightEff = [];
    // STRUGGLE/COMIZIO di riserva: se TUTTE le mosse sono a 0 PP, senza un
    // fallback il giocatore non potrebbe agire (mosse disabled, fuga vietata vs
    // trainer) → soft-lock. L'IA nemica ha già COMIZIO gratis (sim.ts chooseFoeMove);
    // qui pareggiamo l'asimmetria. Compare SOLO quando serve.
    this.fightFallback = this.player.mon.moves.every((s) => s.pp <= 0);
    if (this.fightFallback) {
      this.fightEff.push(null);
      this.fightMenu = new Menu([
        { label: "COMIZIO", rightLabel: "PP —", disabled: false }
      ]);
      this.mode = "fight";
      return;
    }
    this.fightMenu = new Menu(
      this.player.mon.moves.map((slot) => {
        const move = MOVES[slot.id];
        let marker = "";
        let eff: "super" | "weak" | "immune" | null = null;
        if (move.power > 0) {
          const mult = typeMultiplier(move.type, foeTypes);
          marker = mult === 0 ? "X " : mult >= 2 ? "▲ " : mult < 1 ? "▼ " : "";
          eff = mult === 0 ? "immune" : mult >= 2 ? "super" : mult < 1 ? "weak" : null;
        }
        this.fightEff.push(eff);
        return {
          label: move.name,
          rightLabel: `${marker}PP ${slot.pp}/${move.pp}`,
          disabled: slot.pp <= 0
        };
      })
    );
    this.mode = "fight";
  }

  private openCampaignMenu(): void {
    const sond = this.state.sondaggi;
    this.campaignMenu = new Menu(
      CAMPAIGN_ACTIONS.map((a) => {
        const affordable = sond >= a.cost && sond >= a.minSond;
        return {
          label: a.label,
          rightLabel: `-${a.cost}%`,
          disabled: !affordable
        };
      })
    );
    this.mode = "campaign";
  }

  private useCampaign(action: { kind: CampaignKind; label: string; cost: number; minSond: number }): void {
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
        text: "Sondaggio farlocco: i numeri gonfiati danno GRINTA!",
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
    // SCREEN-SHAKE PIENO: tutto il frame (sfondo, sprite, box, banner) trasla
    // insieme su super-efficace/crit. Prima solo il nemico tremava.
    const shake = this.fx.shakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    screen.clear("#f0f0e0");
    // Sfondo battaglia PixelLab (se pronto) dietro tutto, fino al box azioni;
    // altrimenti le due fasce di colore (cielo/terra) di prima.
    const bg = sceneImage("battle:bg", "ui/battle_bg.png");
    if (bg) {
      screen.image(bg, 0, 0, VIEW_W, VIEW_H - 44);
    } else {
      screen.rect(0, 0, VIEW_W, 76, "#d8e8c8");
      screen.rect(0, 76, VIEW_W, VIEW_H - 76 - 44, "#e8e0c8");
    }

    // TINT SFONDO METEO (sondaggi-meteo): velo colorato leggero sullo sfondo
    // quando il gradimento attiva il modificatore. Caldo/dorato col GOVERNO in
    // luna di miele (>=70), freddo/rosso-piazza con l'OPPOSIZIONE al comando
    // (<=40). Alpha basso: atmosfera, non disturbo. Solo PVE (i SONDAGGI
    // esistono solo qui). Sotto gli sprite, sopra lo sfondo.
    this.drawWeatherTint(screen);

    // Slide-in iniziale degli sprite.
    const slide = Math.max(0, Math.min(1, (this.introT - 0.25) / 0.6));
    const foeSlide = Math.round((1 - slide) * 90);
    const playerSlide = Math.round((1 - slide) * -90);

    // Piattaforme.
    drawEllipse(screen, 162 + foeSlide, 64, 64, 14, "#c0cc9c");
    drawEllipse(screen, 56 + playerSlide, 114, 76, 16, "#cabf96");

    // Aura dorata pulsante attorno al leggendario: alone "sacro" che lo
    // distingue da un mostro qualsiasi per tutta la durata dello scontro.
    if (this.isLegendary && this.foe.mon.hp > 0 && !this.ballAnim) {
      this.drawLegendaryAura(screen, 162 + foeSlide, 52);
    }

    // Telegrafia: aura pulsante dietro il nemico che sta per attaccare.
    if (this.fx.telegraph && this.fx.telegraph.side === "foe" && this.foe.mon.hp > 0 && !this.ballAnim) {
      this.fx.drawTelegraph(screen, 162 + foeSlide, 50);
    }

    // Nemico: animazione idle (respiro), affondo all'attacco, blink se colpito.
    // Se è stato reclutato (captured) non si disegna più: è dentro la tessera.
    const foeBlink = this.fx.flashT.foe > 0 && Math.floor(this.fx.flashT.foe * 16) % 2 === 0;
    if (this.foe.mon.hp > 0 && !this.ballAnim && !foeBlink && !this.captured) {
      drawBattleMonster(screen, this.fx, this.foe, 162 + foeSlide, 66, this.fx.lungeT.foe, false, "foe");
    }
    if (this.ballAnim) {
      this.drawBall(screen);
    }

    // Player (di spalle: specchiato e più grande).
    const playerBlink = this.fx.flashT.player > 0 && Math.floor(this.fx.flashT.player * 16) % 2 === 0;
    if (this.player.mon.hp > 0 && !playerBlink) {
      drawBattleMonster(screen, this.fx, this.player, 56 + playerSlide, 116, this.fx.lungeT.player, true, "player");
    }

    // Scintille d'impatto (sopra i mostri, sotto le scritte/HUD).
    this.fx.drawParticles(screen);
    // Numeri di danno flottanti (sopra le scintille, sotto le barre HP).
    this.fx.drawDamageNumbers(screen);

    this.drawFoeBox(screen);
    this.drawPlayerBox(screen);

    // Banner "SUPER EFFICACE / POCO EFFICACE / CRITICO".
    this.fx.drawEffFx(screen);

    // Lampo d'apertura + banner "LEGGENDARIO!" per l'incontro epico.
    this.drawLegendIntro(screen);

    // Fine dello screen-shake: il box azioni/menu e gli overlay a schermo intero
    // restano fermi (l'UI non deve "ballare" sotto le dita).
    ctx.restore();

    // Riquadro testo.
    screen.panel(0, VIEW_H - 44, VIEW_W, 44);
    if (this.mode === "menu") {
      this.drawMainMenu(screen);
    } else if (this.mode === "fight") {
      // Mosse in griglia 2x2 dentro il pannello: niente sovrapposizioni.
      const items = this.fightMenu.items;
      const y = VIEW_H - 44;
      for (let i = 0; i < items.length; i += 1) {
        const cx = 8 + (i % 2) * 114;
        const cy = y + 6 + Math.floor(i / 2) * 13;
        // Colore: grigio se senza PP, altrimenti tinta d'efficacia — verde super,
        // rosso ruggine poco efficace, grigio scuro immune. Il calcolo è
        // INCONDIZIONATO (sempre noto, non serve aver visto il tipo nel Dex).
        const eff = this.fightEff[i];
        const color = items[i].disabled
          ? GREY
          : eff === "super"
            ? "#2f9a4c"
            : eff === "weak"
              ? "#c06030"
              : eff === "immune"
                ? "#8a8a98"
                : INK;
        if (this.fightMenu.index === i) {
          screen.text("►", cx, cy, INK);
        }
        // Marker d'efficacia PRIMA del nome (▲ super / ▼ poco eff. / X immune):
        // il segnale non è più solo il colore (accessibilità daltonici).
        const marker = eff === "super" ? "▲" : eff === "weak" ? "▼" : eff === "immune" ? "X" : "";
        const nameX = marker ? cx + 8 + 7 : cx + 8;
        if (marker) {
          screen.text(marker, cx + 8, cy, color);
        }
        // Tronca con ellissi se la mossa è troppo lunga per la colonna (resta
        // spazio per il marker), così non si legge un nome tagliato a metà parola.
        screen.text(clipToWidth(items[i].label, marker ? 91 : 98), nameX, cy, color);
      }
      const slot = this.player.mon.moves[this.fightMenu.index];
      if (this.onFightSelect) {
        screen.text("Quale dimentichi? B: annulla", 8, y + 32, GREY);
      } else if (slot) {
        const move = MOVES[slot.id];
        const item = items[this.fightMenu.index];
        // Striscia info sopra il pannello: TIPO • CATEGORIA • PP.
        screen.panel(8, 117, 226, 17);
        const typeLabel = move.type.slice(0, 9);
        screen.text(typeLabel, 14, 122, INK);
        screen.rect(14, 130, typeLabel.length * 6, 1, TYPE_COLORS[move.type]);
        screen.text(moveKindLabel(move), 14 + typeLabel.length * 6 + 10, 122, GREY);
        screen.textRight(item?.rightLabel ?? "", 228, 122, INK);
        // Riga meccanica: cosa fa davvero (danno, buff/debuff, cure, status).
        screen.text(clipToWidth(moveSummary(move), 210), 8, y + 30, INK);
      }
    } else if (this.mode === "campaign") {
      // Mosse da campagna in GRIGLIA 2x2 (come il menu LOTTA): libera spazio per
      // la descrizione COMPLETA su 2 righe, che prima veniva tagliata.
      const items = this.campaignMenu.items;
      const y = VIEW_H - 44;
      for (let i = 0; i < items.length; i += 1) {
        const cx = 8 + (i % 2) * 116;
        const cy = y + 4 + Math.floor(i / 2) * 11;
        const color = items[i].disabled ? GREY : INK;
        if (this.campaignMenu.index === i) {
          screen.text("►", cx, cy, INK);
        }
        screen.text(clipToWidth(items[i].label, 86), cx + 8, cy, color);
        screen.textRight(items[i].rightLabel ?? "", cx + 110, cy, items[i].disabled ? GREY : "#d86868");
      }
      const sel = CAMPAIGN_ACTIONS[this.campaignMenu.index];
      screen.panel(154, 117, 80, 17);
      screen.text(`SOND ${this.state.sondaggi}%`, 160, 122, "#7ad858");
      if (sel) {
        // Descrizione completa su 2 righe: l'effetto della mossa si legge tutto.
        const lines = wrapText(sel.desc, 38);
        screen.text(lines[0] ?? "", 8, y + 28, GREY);
        screen.text(lines[1] ?? "", 8, y + 37, GREY);
      }
    } else if (this.mode === "ask") {
      const lines = wrapText(this.askText, 28);
      for (let i = 0; i < Math.min(2, lines.length); i += 1) {
        screen.text(lines[i], 10, VIEW_H - 34 + i * 13, INK);
      }
      this.askMenu.draw(screen, VIEW_W - 58, VIEW_H - 42, 50, 11);
    }
    this.msg.draw(screen);

    // Bagliore dorato al level-up + raggi che pulsano dallo sprite del player.
    // RIDUCI EFFETTI: soppresso (l'evento resta nel testo "sale al livello X").
    if (this.fx.levelFlash > 0 && !this.state.reduceEffects) {
      const ctx = screen.ctx;
      const a = this.fx.levelFlash / 0.6;
      ctx.save();
      ctx.fillStyle = `rgba(244, 211, 74, ${0.35 * a})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }

    // Lampo di celebrazione alla cattura: whiteout dorato che svanisce in fretta.
    // RIDUCI EFFETTI: soppresso (la cattura resta annunciata nel testo).
    if (this.fx.catchFlash > 0 && !this.state.reduceEffects) {
      const ctx = screen.ctx;
      const a = this.fx.catchFlash / 0.7;
      ctx.save();
      ctx.fillStyle = `rgba(255, 246, 200, ${0.55 * a})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
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
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }

    // Apertura a cerchio in stile Game Boy.
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
    const h = VIEW_H - 44; // solo sopra il box azioni
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
    const t = this.fx.time;
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
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }
    if (this.legendBanner > 0) {
      const prog = 1 - this.legendBanner / 2.4;
      const pop = Math.min(1, prog / 0.2);
      const fade = prog > 0.8 ? 1 - (prog - 0.8) / 0.2 : 1;
      const y = 34 + (1 - pop) * -10;
      const size = pop >= 1 ? 2 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      // Pannello scuro dietro per stacco.
      const label = "POLITICMON LEGGENDARIO!";
      screen.textCenter(label, VIEW_W / 2 + 1, y + 1, "rgba(16,20,31,0.8)", size);
      screen.textCenter(label, VIEW_W / 2, y, "#ffd23c", size);
      ctx.restore();
    }
    // Banner "prima vista" (ciano, per distinguerlo dall'oro leggendario).
    if (this.firstSeenBanner > 0) {
      const prog = 1 - this.firstSeenBanner / 2.2;
      const pop = Math.min(1, prog / 0.2);
      const fade = prog > 0.8 ? 1 - (prog - 0.8) / 0.2 : 1;
      const y = 30 + (1 - pop) * -10;
      const size = pop >= 1 ? 2 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      const label = "UN VOLTO MAI VISTO!";
      screen.textCenter(label, VIEW_W / 2 + 1, y + 1, "rgba(16,20,31,0.8)", size);
      screen.textCenter(label, VIEW_W / 2, y, "#4ad0e8", size);
      ctx.restore();
    }
  }

  private drawBall(screen: Screen): void {
    if (!this.ballAnim) {
      return;
    }
    const anim = this.ballAnim;
    let x = 168;
    let y = 44;
    if (anim.t < 0.5) {
      // Parabola di lancio.
      const p = anim.t / 0.5;
      x = 40 + p * 128;
      y = 70 - Math.sin(p * Math.PI) * 52 - p * 26;
    } else {
      const shakePhase = Math.floor((anim.t - 0.7) / 0.55);
      if (anim.t > 0.7 && shakePhase < anim.shakes) {
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

  private drawFoeBox(screen: Screen): void {
    drawCombatantBox(screen, this.foe.mon, this.displayHp.foe, FOE_BOX);
    // Indicatore "GIÀ ELETTO": nei combattimenti SELVATICI (non contro allenatori),
    // se la specie è già nel tuo Dex come catturata, mostra la SCHEDA nell'angolo
    // basso-sx del box — così sai a colpo d'occhio se ti serve ancora o no.
    if (!this.trainer && this.state.dex[this.foe.mon.speciesId] === "caught") {
      const ballotImg = sceneImage("item:scheda", "items/scheda.png");
      if (ballotImg) {
        const size = 12;
        const s = Math.min(size / ballotImg.width, size / ballotImg.height);
        // Nello spazio libero a SINISTRA della barra HP (x+6..x+22, ~16px), sulla
        // riga della barra: non collide col nome (riga sopra) né con la barra.
        screen.imageSprite(ballotImg, FOE_BOX.x + 5, FOE_BOX.y + FOE_BOX.hpY - 2, { scaleX: s, scaleY: s });
      }
    }
  }

  private drawPlayerBox(screen: Screen): void {
    const { x, y } = PLAYER_BOX;
    const mon = this.player.mon;
    drawCombatantBox(screen, mon, this.displayHp.player, PLAYER_BOX);
    // Badge DIVISA EQUA: segnala a colpo d'occhio che l'EXP è condivisa con la
    // panchina (la feature prima era invisibile finché non finiva la lotta).
    if ((this.state.bag["divisa"] ?? 0) > 0) {
      const bx = mon.status ? x + 40 : x + 6;
      screen.rect(bx, y + 25, 25, 8, "#b8901a");
      screen.text("EXP+", bx + 1, y + 26, "#fff0a0");
    }
    // Barra esperienza (solo PVE: nel PvP non c'è EXP).
    screen.rect(x + 6, y + 34, 98, 2, "#c8c8c0");
    screen.rect(x + 6, y + 34, Math.round(98 * this.displayExp), 2, "#4878d8");
  }

  private drawMainMenu(screen: Screen): void {
    const labels = ["LOTTA", "BORSA", "SQUADRA", "CAMPAGNA", "FUGA"];
    const rows = Math.ceil(labels.length / 2); // 3
    const h = 12 + rows * 16;
    const w = 148;
    const x = VIEW_W - w;
    const y = VIEW_H - h;
    const padX = 10;
    const colW = Math.floor((w - padX * 2) / 2);
    screen.panel(x, y, w, h);
    for (let i = 0; i < labels.length; i += 1) {
      const cx = x + padX + (i % 2) * colW;
      const cy = y + 8 + Math.floor(i / 2) * 16;
      if (this.mainMenu.index === i) {
        screen.text("►", cx - 2, cy, INK);
      }
      screen.text(clipToWidth(labels[i], colW - 8), cx + 6, cy, INK);
    }
    // Prompt + consenso disponibile (così sai se puoi permetterti la CAMPAGNA).
    screen.text("AZIONE?", 16, y + 8, INK);
    screen.text(`CONSENSO ${this.state.sondaggi}%`, 8, y + 21, "#7ad858");
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

// Tabella di loot a sorpresa (pesata): oggetti comuni frequenti, rari saltuari.
// Tutti gli id esistono in ITEMS. Il peso più alto = più probabile.
const LOOT_TABLE: Array<{ id: string; qty: number; weight: number }> = [
  { id: "scheda", qty: 2, weight: 30 },
  { id: "caffe", qty: 1, weight: 24 },
  { id: "spritz", qty: 1, weight: 16 },
  { id: "schedona", qty: 1, weight: 14 },
  { id: "maalox", qty: 1, weight: 8 },
  { id: "mojito", qty: 1, weight: 5 },
  { id: "tessera", qty: 1, weight: 3 } // jackpot: oggetto evolutivo raro
];

function rollLootDrop(): { id: string; qty: number } {
  const total = LOOT_TABLE.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of LOOT_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) {
      return { id: entry.id, qty: entry.qty };
    }
  }
  return { id: "scheda", qty: 1 };
}
