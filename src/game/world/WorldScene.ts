import { charSprite, remotePalId, vehicleSprite, type Facing } from "../../art/characters";
import { mp } from "../../net/mp";
import { BALLOT_ART } from "../../art/monsters";
import { TILE, TILES, waterFrames } from "../../art/tiles";
import { ITEMS } from "../../data/items";
import { MAPS, STARTER_SPOTS, type MapDef, type NpcDef } from "../../data/maps";
import { MOVES } from "../../data/moves";
import { currentQuest } from "../../data/quests";
import { RIVAL_COUNTER, SPECIES } from "../../data/species";
import { buildRivalStageTeam, RIVAL_STAGES, rivalStageFor } from "../../data/rival";
import { TRAINERS, type TrainerDef } from "../../data/trainers";
import { pickWanderer, wandererLevel, type WanderingDef } from "../../data/encounters";
import { STREET_EVENTS } from "../../data/streetevents";
import { audio } from "../../engine/audio";
import type { Input } from "../../engine/input";
import type { Scene, SceneStack } from "../../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import { Menu, MessageBox, GREY, INK, PAPER } from "../../ui/widgets";
import { BattleScene, type BattleResult } from "../battle/BattleScene";
import { createMonster, healMonster, type Monster } from "../monster";
import { markCaught, markSeen, saveGame, type GameState } from "../state";
import { addSondaggi, curaPassiva, hasMinistro, sondaggiColor } from "../governo";
import { bulldozedKey, isBulldozed, unlockVehicle, VEHICLES, type VehicleId } from "../vehicles";
import { isGuideOn } from "../../engine/controls";
import { PauseScene } from "../../scenes/PauseScene";
import { ShopScene } from "../../scenes/ShopScene";
import { CasinoScene } from "../../scenes/CasinoScene";
import { StarterPreviewScene } from "../../scenes/StarterPreviewScene";

const STEP_TIME = 0.18;
const RUN_FACTOR = 1.85;

interface RuntimeNpc extends NpcDef {
  currentFacing: Facing;
  turnTimer: number;
}

interface Rustle {
  x: number;
  y: number;
  t: number;
}

interface TransportDestination {
  label: string;
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
  requires?: (state: GameState) => boolean;
}

const DIR_DELTA: Record<Facing, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

const FACINGS: Facing[] = ["up", "down", "left", "right"];

const TRANSPORT_DESTINATIONS: TransportDestination[] = [
  { label: "BORGO URNE", mapId: "borgo", x: 24, y: 22, facing: "right" },
  { label: "MEDIOPOLI", mapId: "mediopoli", x: 23, y: 19, facing: "right", requires: (s) => Boolean(s.flags["dex-received"]) },
  { label: "EUROTOWN", mapId: "eurotown", x: 23, y: 14, facing: "right", requires: (s) => s.badges.includes("auditel") },
  { label: "CAPUT MUNDI", mapId: "capitale", x: 23, y: 18, facing: "right", requires: (s) => s.badges.includes("spread") },
  { label: "STRETTO DI MESSINA", mapId: "stretto", x: 7, y: 5, facing: "down", requires: (s) => s.badges.length >= 3 }
];

function clipHud(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

export class WorldScene implements Scene {
  private map!: MapDef;
  private npcs: RuntimeNpc[] = [];
  private msg = new MessageBox();
  private afterMsg: (() => void) | null = null;

  private moving = false;
  private running = false;
  private moveT = 0;
  private fromX = 0;
  private fromY = 0;
  private time = 0;
  private rustles: Rustle[] = [];
  private encounterFlash = 0;
  private fadeT = 0; // dissolvenza d'ingresso mappa
  private pendingBattle: (() => void) | null = null;
  private exclaimNpc: RuntimeNpc | null = null;
  private exclaimT = 0;
  private pendingTrainer: TrainerDef | null = null;

  private askMenu: Menu | null = null;
  private askYes: (() => void) | null = null;
  private askNo: (() => void) | null = null;
  private askLabel = "";
  private transportMenu: Menu | null = null;
  private transportDestinations: TransportDestination[] = [];

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.loadMap(this.state.pos.mapId);
    if (!this.state.flags["intro-done"]) {
      this.state.flags["intro-done"] = true;
      this.say([
        "PROF. QUIRINO (al megafono): Benvenuto a BORGO URNE, giovane!",
        "Muoviti con le FRECCE (o il D-PAD). A per parlare e confermare, B per tornare indietro.",
        "Segui la FRECCIA GIALLA: ti porta al mio LABORATORIO, l'edificio col tetto blu.",
        "Lì scegli il tuo primo POLITICMON e parti per la scalata: tre MEDAGLIE e poi il PALAZZO!"
      ]);
    }
  }

  // ---- Setup ----

  private loadMap(mapId: string): void {
    this.map = MAPS[mapId];
    this.npcs = this.map.npcs.map((npc) => ({
      ...npc,
      currentFacing: npc.facing,
      turnTimer: 2 + Math.random() * 4
    }));
    // RIVALE GIANNI ricorrente: se la tappa corrente è su questa mappa e non
    // l'hai ancora battuta, aggiungi il suo NPC (con linea di vista).
    const stage = rivalStageFor(this.state.rivalWins);
    if (stage && stage.mapId === mapId && !this.state.defeatedTrainers.includes(stage.id)) {
      this.npcs.push({
        id: stage.id, pal: "rival", x: stage.x, y: stage.y, facing: stage.facing,
        trainerId: stage.id, sightRange: stage.sightRange,
        lines: ["GIANNI: ehi! Sì, dico a te."],
        currentFacing: stage.facing, turnTimer: 999
      });
    }
    this.rustles = [];
    audio.playMusic(this.map.music ?? "borgo");
    this.fadeT = 0.35; // breve dissolvenza d'ingresso nella nuova mappa
    // Multiplayer: entra nella room di questa mappa (vedi solo chi è qui).
    const p = this.state.pos;
    mp.joinMap(mapId, p.x, p.y, p.facing);
  }

  private visibleNpcs(): RuntimeNpc[] {
    return this.npcs.filter((npc) => {
      if (npc.showIfFlag && !this.state.flags[npc.showIfFlag]) {
        return false;
      }
      if (npc.hideIfFlag && this.state.flags[npc.hideIfFlag]) {
        return false;
      }
      return true;
    });
  }

  private tileAt(x: number, y: number): string {
    const ch = this.map.tiles[y]?.[x] ?? "T";
    // Un albero abbattuto dalla RUSPA diventa erba calpestabile.
    if (ch === "T" && isBulldozed(this.state, this.map.id, x, y)) {
      return this.map.outdoor ? "." : "p";
    }
    return ch;
  }

  private isBlocked(x: number, y: number): boolean {
    const tile = TILES[this.tileAt(x, y)];
    if (!tile || tile.solid) {
      return true;
    }
    if (this.visibleNpcs().some((npc) => npc.x === x && npc.y === y)) {
      return true;
    }
    if (
      this.map.pickups.some(
        (p) => p.x === x && p.y === y && !this.state.pickedItems.includes(p.id)
      )
    ) {
      return true;
    }
    if (this.map.id === "lab" && STARTER_SPOTS.some((s) => s.x === x && s.y === y)) {
      return true;
    }
    return false;
  }

  private say(lines: string[], after?: () => void): void {
    this.afterMsg = after ?? null;
    this.msg.show(lines, () => {
      const callback = this.afterMsg;
      this.afterMsg = null;
      callback?.();
    });
  }


  // ---- Battles ----

  private queueBattle(start: () => void): void {
    // Lampeggio in stile Game Boy prima della battaglia.
    audio.encounterSting();
    this.encounterFlash = 0.55;
    this.pendingBattle = start;
  }

  private startWildBattle(
    speciesId: string,
    level: number,
    after?: (result: BattleResult) => void,
    music?: string
  ): void {
    this.queueBattle(() => {
      const foe = createMonster(speciesId, level);
      this.stack.push(
        new BattleScene(this.stack, this.input, {
          state: this.state,
          foeTeam: [foe],
          music,
          onEnd: (result) => {
            this.onBattleEnd(result);
            after?.(result);
          }
        })
      );
    });
  }

  private startTrainerBattle(def: TrainerDef, after?: (result: BattleResult) => void): void {
    this.queueBattle(() => {
      const team: Monster[] =
        def.team.length > 0
          ? def.team.map(([id, lv, moveIds]) => {
              const mon = createMonster(id, lv);
              if (moveIds?.length) {
                mon.moves = moveIds.map((moveId) => ({ id: moveId, pp: MOVES[moveId].pp }));
              }
              return mon;
            })
          : this.buildRivalTeam();
      this.stack.push(
        new BattleScene(this.stack, this.input, {
          state: this.state,
          foeTeam: team,
          trainer: def,
          onEnd: (result) => {
            // I PG vaganti (id "wander:*") restano ripetibili: non li
            // registriamo tra i trainer sconfitti.
            if (result === "win" && !def.id.startsWith("wander:")) {
              this.state.defeatedTrainers.push(def.id);
            }
            this.onBattleEnd(result);
            after?.(result);
          }
        })
      );
    });
  }

  private buildRivalTeam(): Monster[] {
    const counter = RIVAL_COUNTER[this.state.starterId] ?? "renzino";
    const evolved = SPECIES[counter].evolutions?.find((rule) => rule.level !== undefined)?.id ?? counter;
    return [createMonster("grillix", 16), createMonster(evolved, 18)];
  }

  // Restituisce il TrainerDef per un id: se è una tappa del RIVALE ricorrente
  // (id "rival-*"), lo costruisce al volo dallo stage con squadra scalata e
  // battute che ricordano gli scontri precedenti; altrimenti dai TRAINERS fissi.
  private trainerForId(trainerId: string): TrainerDef {
    if (trainerId.startsWith("rival-")) {
      const stage = RIVAL_STAGES.find((s) => s.id === trainerId);
      if (stage) {
        return {
          id: stage.id,
          name: "RIVALE GIANNI",
          pal: "rival",
          team: buildRivalStageTeam(this.state, stage),
          intro: stage.intro,
          defeat: stage.defeat,
          money: 400 + stage.level * 40,
          reward: stage.reward
        };
      }
    }
    return TRAINERS[trainerId];
  }

  private onBattleEnd(result: BattleResult): void {
    this.stack.pop();
    audio.playMusic(this.map.music ?? "borgo");
    saveGame(this.state);
    if (result === "loss") {
      if (!this.state.flags["dex-received"]) {
        for (const mon of this.state.party) {
          healMonster(mon);
        }
        this.state.pos = { mapId: "lab", x: 5, y: 6, facing: "up" };
        this.loadMap("lab");
        saveGame(this.state);
        this.say([
          "PROF. QUIRINO: stop tecnico!",
          "Ti rimetto in piedi la squadra. Il primo dibattito serve a imparare, non a rovinarsi la carriera.",
          "Riprova: usa anche le mosse di stato, non solo COMIZIO."
        ]);
        return;
      }
      const lost = Math.floor(this.state.money / 2);
      this.state.money -= lost;
      const sondaggi = addSondaggi(this.state, -8);
      for (const mon of this.state.party) {
        healMonster(mon);
      }
      this.state.pos = { mapId: "borgo", x: 19, y: 17, facing: "right" };
      this.loadMap("borgo");
      this.say([
        "Hai perso il consenso e anche i sensi...",
        `Ti risvegli al BAR SPORT di BORGO URNE, più leggero di ${lost}€.`,
        `I SONDAGGI crollano al ${sondaggi}%. I retroscenisti parlano già di rimpasto.`,
        "Il barista ha rimesso in sesto la squadra. Si riparte!"
      ]);
    }
  }

  // ---- Interactions ----

  private interact(): void {
    const pos = this.state.pos;
    const delta = DIR_DELTA[pos.facing];
    const tx = pos.x + delta.dx;
    const ty = pos.y + delta.dy;

    const npc = this.visibleNpcs().find((n) => n.x === tx && n.y === ty);
    if (npc) {
      this.interactNpc(npc);
      return;
    }

    // RUSPA: abbatte l'albero davanti (apre scorciatoie). Solo se attiva.
    const raw = this.map.tiles[ty]?.[tx];
    if (raw === "T" && this.state.vehicle === "ruspa" && !isBulldozed(this.state, this.map.id, tx, ty)) {
      this.state.bulldozed.push(bulldozedKey(this.map.id, tx, ty));
      audio.hit();
      saveGame(this.state);
      this.say(["VRRRRR... la RUSPA fa il suo dovere.", "L'albero è stato 'riqualificato'. Passaggio libero!"]);
      return;
    }

    if (this.map.id === "lab") {
      const spot = STARTER_SPOTS.find((s) => s.x === tx && s.y === ty);
      if (spot) {
        this.interactStarter(spot.speciesId);
        return;
      }
    }

    const sign = this.map.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      this.say(sign.lines);
      return;
    }

    const pickup = this.map.pickups.find(
      (p) => p.x === tx && p.y === ty && !this.state.pickedItems.includes(p.id)
    );
    if (pickup) {
      this.state.pickedItems.push(pickup.id);
      this.state.bag[pickup.itemId] = (this.state.bag[pickup.itemId] ?? 0) + pickup.qty;
      audio.confirm();
      this.say([`Trovi ${ITEMS[pickup.itemId].name} x${pickup.qty}!`]);
      saveGame(this.state);
    }
  }

  private interactNpc(npc: RuntimeNpc): void {
    const pos = this.state.pos;
    npc.currentFacing =
      npc.x > pos.x ? "left" : npc.x < pos.x ? "right" : npc.y > pos.y ? "up" : "down";

    if (npc.trainerId && !this.state.defeatedTrainers.includes(npc.trainerId)) {
      if (this.state.party.length === 0) {
        this.say(["Torna quando avrai un POLITICMON.", "Qui si combatte, mica si dialoga."]);
        return;
      }
      this.startTrainerFight(this.trainerForId(npc.trainerId));
      return;
    }

    if (npc.transport) {
      this.openTransport();
      return;
    }

    if (npc.shop) {
      this.say(npc.lines ?? [], () => {
        this.stack.push(new ShopScene(this.stack, this.input, this.state));
      });
      return;
    }

    if (npc.casino) {
      this.say(npc.lines ?? [], () => {
        this.stack.push(new CasinoScene(this.stack, this.input, this.state));
      });
      return;
    }

    if (npc.healer) {
      this.say(npc.lines ?? [], () => {
        for (const mon of this.state.party) {
          healMonster(mon);
        }
        audio.heal();
        this.say(["Un giro di caffè per tutta la squadra... offre la casa!", "I tuoi POLITICMON sono al massimo del consenso."]);
        saveGame(this.state);
      });
      return;
    }

    if (npc.legendary) {
      this.interactLegendary(npc);
      return;
    }

    if (npc.gift && !this.state.flags[npc.gift.flag]) {
      const gift = npc.gift;
      this.say(gift.lines, () => {
        this.state.flags[gift.flag] = true;
        this.state.bag[gift.itemId] = (this.state.bag[gift.itemId] ?? 0) + gift.qty;
        audio.confirm();
        this.say([`Ricevi ${ITEMS[gift.itemId].name} x${gift.qty}!`]);
        saveGame(this.state);
      });
      return;
    }

    if (npc.vehicleGift && !this.state.flags[npc.vehicleGift.flag]) {
      const vg = npc.vehicleGift;
      this.say(vg.lines, () => {
        this.state.flags[vg.flag] = true;
        unlockVehicle(this.state, vg.vehicle);
        audio.catchJingle();
        this.say([
          `Hai ottenuto: ${VEHICLES[vg.vehicle].name}!`,
          "Attivalo dal menu (START) alla voce VEICOLO."
        ]);
        saveGame(this.state);
      });
      return;
    }

    // Flag "hai parlato con..." per le quest secondarie (es. GIRO DI PORTE).
    if (npc.setFlag && !this.state.flags[npc.setFlag]) {
      this.state.flags[npc.setFlag] = true;
      saveGame(this.state);
    }

    if (npc.lines && npc.lines.length > 0) {
      this.say(npc.lines);
    }
  }

  private openTransport(): void {
    if (!this.state.flags["dex-received"]) {
      this.say([
        "SCORTA AUTO BLU: la macchina elettorale è pronta.",
        "Ma senza POLITICDEX non possiamo scarrozzare candidati non registrati."
      ]);
      return;
    }
    this.transportDestinations = TRANSPORT_DESTINATIONS.filter(
      (dest) => dest.mapId !== this.map.id && (!dest.requires || dest.requires(this.state))
    );
    if (this.transportDestinations.length === 0) {
      this.say(["SCORTA AUTO BLU: per ora non hai tratte autorizzate.", "Conquista medaglie e sbloccheremo nuove destinazioni."]);
      return;
    }
    this.transportMenu = new Menu(this.transportDestinations.map((dest) => ({ label: dest.label })));
    this.askLabel = "Dove ti porta la Macchina Elettorale?";
  }

  private travelToDestination(dest: TransportDestination): void {
    this.transportMenu = null;
    this.transportDestinations = [];
    this.state.pos = { mapId: dest.mapId, x: dest.x, y: dest.y, facing: dest.facing };
    this.loadMap(dest.mapId);
    audio.confirm();
    saveGame(this.state);
    this.say([`La scorta accende le sirene: destinazione ${dest.label}.`, "Arrivi senza traffico. La democrazia, quando vuole, sa parcheggiare."]);
  }

  private interactLegendary(npc: RuntimeNpc): void {
    const legendary = npc.legendary;
    if (!legendary) {
      return;
    }
    if (this.state.flags[legendary.flag]) {
      this.say(legendary.afterGoneLines ?? npc.lines ?? ["La leggenda è già stata registrata."]);
      return;
    }
    if (this.state.party.length === 0) {
      this.say(["Ti serve almeno un POLITICMON.", "Anche le leggende vogliono un minimo di contraddittorio."]);
      return;
    }

    markSeen(this.state, legendary.speciesId);
    this.say(legendary.lines, () => {
      this.startWildBattle(legendary.speciesId, legendary.level, (result) => {
        if (result === "caught" || result === "win") {
          this.state.flags[legendary.flag] = true;
          saveGame(this.state);
          this.say(legendary.afterGoneLines ?? [`${SPECIES[legendary.speciesId].name} entra nella leggenda.`]);
          return;
        }
        if (result === "run") {
          this.say(legendary.afterRunLines ?? [`${SPECIES[legendary.speciesId].name} resta nei paraggi.`]);
        }
      }, "battle-legend");
    });
  }

  private startTrainerFight(def: TrainerDef): void {
    const isBoss = def.id === "boss";
    this.say(isBoss ? [`${def.name}: ti stavo aspettando.`] : [`${def.name} ti ha notato!`], () => {
      this.startTrainerBattle(def, (result) => {
        if (result !== "win") {
          return;
        }
        // RIVALE ricorrente: ogni vittoria sblocca la prossima tappa (memoria).
        if (def.id.startsWith("rival-")) {
          this.state.rivalWins += 1;
          saveGame(this.state);
          this.loadMap(this.state.pos.mapId); // rimuove l'NPC battuto dalla mappa
          return;
        }
        if (def.id === "emittenza" && !this.state.flags["legend-berlusconix-gone"]) {
          this.state.flags["legend-berlusconix-ready"] = true;
          saveGame(this.state);
          this.say([
            "Le luci dello STUDIO 5 cambiano colore.",
            "Dal maxischermo arriva una sigla impossibile da mandare in pensione.",
            "Qualcosa di leggendario ti aspetta accanto alla regia."
          ]);
          return;
        }
        if (isBoss) {
          this.state.flags["boss-beaten"] = true;
          saveGame(this.state);
          this.say([
            "INCREDIBILE! Hai sconfitto il PRESIDENTE OMBRA!",
            "Da oggi sei tu il CAMPIONE DI PALAZZOPOLI.",
            "Mandato pieno, fiducia incondizionata, talk show in ginocchio.",
            "Ma mentre festeggi... CLACK. Dietro lo scranno scatta una PORTA DORATA.",
            "Una voce dall'alto: 'La nomina non basta. Serve la CONTROFIRMA del COLLE.'",
            "La scala in fondo al PALAZZO ora è aperta: la CONSULTA ti aspetta."
          ]);
          return;
        }
        if (def.id === "ilcapitano") {
          this.state.flags["ponte-beaten"] = true;
          addSondaggi(this.state, 6);
          saveGame(this.state);
          this.say([
            "IL CAPITANO si toglie gli occhiali da sole. Tramonto a favore di telecamera.",
            "CAPITANO: 'Hai vinto tu. Ma il ponte si farà. Me lo sento. Dal 1969.'",
            `I meme su questa vittoria fanno il giro dei social: SONDAGGI al ${this.state.sondaggi}%.`,
            "Ti lascia una TESSERA DORATA: 'A me ormai serve solo l'ombrellone.'"
          ]);
          return;
        }
        if (def.id === "garante") {
          this.state.flags["garante-beaten"] = true;
          addSondaggi(this.state, 10);
          saveGame(this.state);
          this.say([
            "Il GARANTE SUPREMO ripiega gli occhiali e... sorride.",
            "GARANTE: 'Controfirmato. Con riserva, ma controfirmato.'",
            "Sei ufficialmente CAMPIONE COSTITUZIONALE DI PALAZZOPOLI!",
            `I SONDAGGI volano al ${this.state.sondaggi}%: persino gli astenuti applaudono.`,
            "Si dice che nella sala accanto un DRAGO DEI MERCATI attenda la prossima crisi..."
          ]);
        }
      });
    });
  }

  private interactStarter(speciesId: string): void {
    if (this.state.flags["starter-chosen"]) {
      this.say(["Le altre schede? Sequestrate dalla commissione di garanzia."]);
      return;
    }
    markSeen(this.state, speciesId);
    // Anteprima animata con stats e descrizione prima di confermare.
    this.stack.push(
      new StarterPreviewScene(this.stack, this.input, speciesId, () => this.chooseStarter(speciesId))
    );
  }

  private chooseStarter(speciesId: string): void {
    const starter = createMonster(speciesId, 5);
    this.state.party.push(starter);
    this.state.starterId = speciesId;
    this.state.flags["starter-chosen"] = true;
    markCaught(this.state, speciesId);
    audio.catchJingle();
    saveGame(this.state);

    const rivalStarterId = RIVAL_COUNTER[speciesId];
    const rivalSpecies = SPECIES[rivalStarterId];
    markSeen(this.state, rivalStarterId);
    this.say(
      [
        `${SPECIES[speciesId].name} è il tuo primo POLITICMON!`,
        "PROF. QUIRINO: ottima scelta. O pessima, lo dirà il televoto.",
        "?!? Qualcuno entra di corsa nel laboratorio...",
        "RIVALE GIANNI: in ritardo? Io? Era un ingresso A EFFETTO!",
        `GIANNI afferra la scheda di ${rivalSpecies.name}.`,
        "GIANNI: il mio batte il tuo per posizionamento strategico. Te lo dimostro SUBITO!"
      ],
      () => {
        const def: TrainerDef = {
          id: "rival1",
          name: "RIVALE GIANNI",
          pal: "rival",
          team: [[rivalStarterId, 4, this.tutorialRivalMoves(rivalStarterId)]],
          intro: ["Preparati al primo dibattito della tua vita!"],
          defeat: ["Cosa?! Chiederò il riconteggio!"],
          money: 150
        };
        this.startTrainerBattle(def, () => {
          this.state.flags["rival1-beaten"] = true;
          this.state.rivalWins = 1; // sblocca la prima tappa ricorrente (Mediopoli)
          saveGame(this.state);
          this.giveDex();
        });
      }
    );
  }

  private tutorialRivalMoves(speciesId: string): string[] {
    if (speciesId === "giorgetta") {
      return ["comizio", "slogan"];
    }
    if (speciesId === "ellyna") {
      return ["comizio", "ztl"];
    }
    return ["comizio", "promessa"];
  }

  private giveDex(): void {
    this.say(
      [
        "GIANNI: mi alleno e ci rivediamo a CAPUT MUNDI. Il PALAZZO sarà mio!",
        "PROF. QUIRINO: che energia, voi due.",
        "Tieni, questo è il POLITICDEX: registra ogni politico che vedi o elegga.",
        "E queste sono 5 SCHEDE ELETTORALI: indebolisci i candidati selvatici e lanciale!",
        "Conquista le 3 MEDAGLIE: AUDITEL a MEDIOPOLI, SPREAD a EUROTOWN, DAZIO a CAPUT MUNDI.",
        "Solo allora il PALAZZO ti aprirà il portone. In bocca al lupo!"
      ],
      () => {
        this.state.flags["dex-received"] = true;
        this.state.bag.scheda = (this.state.bag.scheda ?? 0) + 5;
        audio.catchJingle();
        this.say(["Hai ricevuto il POLITICDEX e 5 SCHEDE ELETTORALI!", "Trovi il Dex e le MISSIONI nel menu (tasto P o START)."]);
        saveGame(this.state);
      }
    );
  }

  // ---- Trainer line-of-sight ----

  private checkTrainerSight(): boolean {
    const pos = this.state.pos;
    for (const npc of this.visibleNpcs()) {
      if (!npc.trainerId || !npc.sightRange) {
        continue;
      }
      if (this.state.defeatedTrainers.includes(npc.trainerId)) {
        continue;
      }
      if (this.state.party.length === 0) {
        continue;
      }
      const delta = DIR_DELTA[npc.facing];
      for (let step = 1; step <= npc.sightRange; step += 1) {
        const sx = npc.x + delta.dx * step;
        const sy = npc.y + delta.dy * step;
        if (sx === pos.x && sy === pos.y) {
          this.exclaimNpc = npc;
          this.exclaimT = 0.7;
          this.pendingTrainer = this.trainerForId(npc.trainerId);
          audio.encounterSting();
          return true;
        }
        const tile = TILES[this.tileAt(sx, sy)];
        if (!tile || tile.solid) {
          break;
        }
      }
    }
    return false;
  }

  // ---- Incontri PG casuali su strada ----

  private wanderCooldown = 18; // passi minimi prima del primo/prossimo incontro
  private recentWanderers: string[] = []; // ultimi PG, per non ripeterli subito

  private checkWanderingChallenger(): boolean {
    if (!this.map.outdoor || !this.state.flags["dex-received"]) {
      return false;
    }
    if (this.state.party.length === 0 || !this.state.party.some((m) => m.hp > 0)) {
      return false;
    }
    if (this.wanderCooldown > 0) {
      this.wanderCooldown -= 1;
      return false;
    }
    // ~4.5% per passo una volta scaduto il cooldown (non invadente).
    if (Math.random() > 0.045) {
      return false;
    }
    const def = pickWanderer(this.state, this.recentWanderers, Math.random());
    if (!def) {
      return false;
    }
    this.wanderCooldown = 28 + Math.floor(Math.random() * 16);
    this.recentWanderers.push(def.id);
    if (this.recentWanderers.length > 3) {
      this.recentWanderers.shift();
    }
    const trainer = this.buildWandererTrainer(def);
    audio.encounterSting();
    this.exclaimT = 0.7;
    this.pendingTrainer = trainer;
    return true;
  }

  private buildWandererTrainer(def: WanderingDef): TrainerDef {
    const level = wandererLevel(this.state);
    const team: Array<[string, number]> = [];
    for (let i = 0; i < def.size; i += 1) {
      const sp = def.species[i % def.species.length];
      // Piccola variazione di livello tra i membri.
      team.push([sp, Math.max(2, level - (def.size - 1 - i))]);
    }
    return {
      id: `wander:${def.id}`,
      name: def.name,
      pal: def.pal,
      team,
      intro: def.intro,
      defeat: def.defeat,
      money: Math.round(def.money * (1 + level / 30)),
      reward: def.reward
    };
  }

  // Direzione approssimata (in pixel mondo) verso un'altra mappa, per la guida
  // quando il bersaglio non è sulla mappa corrente. La progressione è quasi
  // sempre verso nord; le mappe interne si raggiungono dalla città relativa.
  private mapHintDir(targetMap: string): { dx: number; dy: number } | null {
    if (targetMap === this.map.id) {
      return null;
    }
    // Mappa città -> direzione cardinale verso la prossima tappa a nord.
    const northChain = ["borgo", "mediopoli", "eurotown", "capitale"];
    const here = northChain.indexOf(this.map.id);
    const there = northChain.indexOf(targetMap);
    if (here !== -1 && there !== -1) {
      return there > here ? { dx: 0, dy: -1 } : { dx: 0, dy: 1 };
    }
    // Interni (lab/palazzo/colle): se sono il bersaglio e siamo nella città
    // giusta, punta verso il warp d'ingresso corrispondente sulla mappa.
    const warp = this.map.warps.find((w) => w.toMap === targetMap);
    if (warp) {
      return { dx: Math.sign(warp.x - this.state.pos.x), dy: Math.sign(warp.y - this.state.pos.y) };
    }
    return null;
  }

  private drawGuideArrow(
    screen: Screen,
    target: { mapId: string; x: number; y: number },
    playerPx: number,
    playerPy: number,
    camX: number,
    camY: number
  ): void {
    let dx: number;
    let dy: number;
    if (target.mapId === this.map.id) {
      dx = target.x - this.state.pos.x;
      dy = target.y - this.state.pos.y;
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        return; // già arrivato: niente freccia
      }
    } else {
      const hint = this.mapHintDir(target.mapId);
      if (!hint) {
        return;
      }
      dx = hint.dx;
      dy = hint.dy;
    }
    const ang = Math.atan2(dy, dx);
    // Centro del giocatore sullo schermo.
    const cx = playerPx - camX + TILE / 2;
    const cy = playerPy - camY + TILE / 2 - 18; // sopra la testa
    // Pulsazione: la freccia "spinge" verso l'obiettivo.
    const pulse = 2 + Math.sin(this.time * 6) * 1.5;
    const r = 12 + pulse;
    const tipX = cx + Math.cos(ang) * r;
    const tipY = cy + Math.sin(ang) * r;
    // Triangolo pieno orientato verso l'obiettivo.
    const ctx = screen.ctx;
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(ang);
    ctx.fillStyle = "#f4d34a";
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#10141f";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // ---- Eventi morale casuali su strada ----

  private streetCooldown = 30;

  private checkStreetEvent(): boolean {
    if (!this.map.outdoor || !this.state.flags["dex-received"]) {
      return false;
    }
    if (this.streetCooldown > 0) {
      this.streetCooldown -= 1;
      return false;
    }
    if (Math.random() > 0.035) {
      return false;
    }
    this.streetCooldown = 50 + Math.floor(Math.random() * 30);
    const ev = STREET_EVENTS[Math.floor(Math.random() * STREET_EVENTS.length)];
    if (ev.sondaggi) {
      addSondaggi(this.state, ev.sondaggi);
    }
    if (ev.money) {
      this.state.money = Math.max(0, this.state.money + ev.money);
    }
    audio.confirm();
    saveGame(this.state);
    this.say(ev.lines);
    return true;
  }

  // ---- Step resolution ----

  private stepCount = 0;

  private onStepComplete(): void {
    const pos = this.state.pos;

    // Multiplayer: comunica la nuova posizione agli altri sulla mappa.
    mp.sendMove(pos.x, pos.y, pos.facing);

    // Sanità di prossimità: il Min. Salute fa recuperare 1 PV ogni 6 passi.
    this.stepCount += 1;
    if (this.stepCount % 6 === 0 && hasMinistro(this.state, "salute")) {
      curaPassiva(this.state);
    }

    const warp = this.map.warps.find((w) => w.x === pos.x && w.y === pos.y);
    if (warp) {
      if (warp.requiresBadges && this.state.badges.length < warp.requiresBadges) {
        pos.x = this.fromX;
        pos.y = this.fromY;
        this.say(warp.lockedLines ?? ["È chiuso."]);
        return;
      }
      if (warp.requiresFlag && !this.state.flags[warp.requiresFlag]) {
        pos.x = this.fromX;
        pos.y = this.fromY;
        this.say(warp.lockedLines ?? ["È chiuso."]);
        return;
      }
      this.state.pos = { mapId: warp.toMap, x: warp.toX, y: warp.toY, facing: warp.facing };
      this.loadMap(warp.toMap);
      audio.confirm();
      return;
    }

    if (this.checkTrainerSight()) {
      return;
    }

    if (this.checkWanderingChallenger()) {
      return;
    }

    if (this.checkStreetEvent()) {
      return;
    }

    const tile = TILES[this.tileAt(pos.x, pos.y)];
    if (tile?.encounter) {
      this.rustles.push({ x: pos.x, y: pos.y, t: 0.4 });
      const baseRate = this.map.encounterRate ?? 0.08;
      const rate = baseRate * (hasMinistro(this.state, "interno") ? 0.65 : 1);
      if (
        this.map.encounters &&
        this.state.party.some((m) => m.hp > 0) &&
        Math.random() < rate
      ) {
        const table = this.map.encounters;
        const total = table.reduce((sum, e) => sum + e.weight, 0);
        let roll = Math.random() * total;
        for (const entry of table) {
          roll -= entry.weight;
          if (roll <= 0) {
            const level = entry.minLv + Math.floor(Math.random() * (entry.maxLv - entry.minLv + 1));
            this.startWildBattle(entry.speciesId, level);
            return;
          }
        }
      }
    }
  }

  // ---- Update ----

  update(dt: number): void {
    this.time += dt;
    this.fadeT = Math.max(0, this.fadeT - dt);
    mp.update(dt); // interpolazione avatar remoti + decadimento emote
    this.rustles = this.rustles.filter((r) => (r.t -= dt) > 0);

    // NPC che si guardano attorno (solo quelli senza linea di vista da trainer).
    for (const npc of this.npcs) {
      if (npc.trainerId || npc.healer) {
        continue;
      }
      npc.turnTimer -= dt;
      if (npc.turnTimer <= 0) {
        npc.turnTimer = 2 + Math.random() * 5;
        npc.currentFacing = FACINGS[Math.floor(Math.random() * FACINGS.length)];
      }
    }

    if (this.encounterFlash > 0) {
      this.encounterFlash -= dt;
      if (this.encounterFlash <= 0 && this.pendingBattle) {
        const start = this.pendingBattle;
        this.pendingBattle = null;
        start();
      }
      return;
    }

    if (this.exclaimT > 0) {
      this.exclaimT -= dt;
      if (this.exclaimT <= 0 && this.pendingTrainer) {
        const def = this.pendingTrainer;
        this.pendingTrainer = null;
        this.exclaimNpc = null;
        this.startTrainerFight(def);
      }
      return;
    }

    if (this.transportMenu) {
      const action = this.transportMenu.update(this.input);
      if (action === "select") {
        const dest = this.transportDestinations[this.transportMenu.index];
        if (dest) {
          this.travelToDestination(dest);
        }
      } else if (action === "cancel") {
        this.transportMenu = null;
        this.transportDestinations = [];
      }
      return;
    }

    if (this.askMenu) {
      const action = this.askMenu.update(this.input);
      if (action === "select") {
        const yes = this.askMenu.index === 0;
        const handler = yes ? this.askYes : this.askNo;
        this.askMenu = null;
        this.askYes = null;
        this.askNo = null;
        handler?.();
      } else if (action === "cancel") {
        const handler = this.askNo;
        this.askMenu = null;
        this.askYes = null;
        this.askNo = null;
        handler?.();
      }
      return;
    }

    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }

    const pos = this.state.pos;

    if (this.moving) {
      this.moveT += (dt / STEP_TIME) * (this.running ? RUN_FACTOR : 1);
      if (this.moveT >= 1) {
        this.moving = false;
        this.moveT = 0;
        this.onStepComplete();
      }
      return;
    }

    if (this.input.wasPressed("start")) {
      audio.confirm();
      this.stack.push(new PauseScene(this.stack, this.input, this.state));
      return;
    }
    if (this.input.wasPressed("a")) {
      this.interact();
      return;
    }

    const dir = this.input.heldDirection();
    if (!dir) {
      return;
    }
    const facing = dir as Facing;
    if (pos.facing !== facing) {
      pos.facing = facing;
      return;
    }
    const delta = DIR_DELTA[facing];
    const nx = pos.x + delta.dx;
    const ny = pos.y + delta.dy;

    // Passaggio tra zone ai bordi della mappa.
    const mapH = this.map.tiles.length;
    if (ny < 0 && this.map.edges?.north) {
      const edge = this.map.edges.north;
      const target = MAPS[edge.toMap];
      this.state.pos = {
        mapId: edge.toMap, x: nx + edge.offsetX, y: target.tiles.length - 1, facing
      };
      this.loadMap(edge.toMap);
      return;
    }
    if (ny >= mapH && this.map.edges?.south) {
      const edge = this.map.edges.south;
      this.state.pos = { mapId: edge.toMap, x: nx + edge.offsetX, y: 0, facing };
      this.loadMap(edge.toMap);
      return;
    }

    if (this.isBlocked(nx, ny)) {
      return;
    }
    // Col MONOPATTINO si va sempre veloci all'aperto; B resta la corsa manuale.
    const onScooter = this.state.vehicle === "monopattino" && this.map.outdoor;
    this.running = this.input.isHeld("b") || onScooter;
    this.fromX = pos.x;
    this.fromY = pos.y;
    pos.x = nx;
    pos.y = ny;
    this.moving = true;
    this.moveT = 0;
  }

  // ---- Draw ----

  draw(screen: Screen): void {
    const pos = this.state.pos;
    const mapW = this.map.tiles[0].length * TILE;
    const mapH = this.map.tiles.length * TILE;

    const t = this.moving ? this.moveT : 1;
    const px = (this.fromX + (pos.x - this.fromX) * t) * TILE;
    const py = (this.fromY + (pos.y - this.fromY) * t) * TILE;
    const playerPx = this.moving ? px : pos.x * TILE;
    const playerPy = this.moving ? py : pos.y * TILE;

    let camX = Math.round(playerPx + TILE / 2 - VIEW_W / 2);
    let camY = Math.round(playerPy + TILE / 2 - VIEW_H / 2);
    camX = Math.max(0, Math.min(mapW - VIEW_W, camX));
    camY = Math.max(0, Math.min(Math.max(0, mapH - VIEW_H), camY));

    screen.clear("#10141f");

    const x0 = Math.floor(camX / TILE);
    const y0 = Math.floor(camY / TILE);
    const waterFrame = Math.floor(this.time * 2) % 2;

    for (let ty = y0; ty <= y0 + Math.ceil(VIEW_H / TILE); ty += 1) {
      for (let tx = x0; tx <= x0 + Math.ceil(VIEW_W / TILE); tx += 1) {
        const ch = this.tileAt(tx, ty);
        const def = TILES[ch];
        if (!def) {
          continue;
        }
        const dx = tx * TILE - camX;
        const dy = ty * TILE - camY;
        if (def.overlay) {
          const base = TILES[this.map.outdoor ? "." : "p"];
          screen.sprite(`tile:${this.map.outdoor ? "." : "p"}`, base.pix, dx, dy);
        }
        if (def.water) {
          screen.sprite(`tile:w:${waterFrame}`, waterFrames[waterFrame], dx, dy);
        } else {
          screen.sprite(`tile:${ch}`, def.pix, dx, dy);
        }
      }
    }

    for (const pickup of this.map.pickups) {
      if (this.state.pickedItems.includes(pickup.id)) {
        continue;
      }
      screen.sprite("ballot", BALLOT_ART, pickup.x * TILE - camX + 3, pickup.y * TILE - camY + 3);
    }

    if (this.map.id === "lab" && !this.state.flags["starter-chosen"]) {
      for (const spot of STARTER_SPOTS) {
        screen.sprite("ballot", BALLOT_ART, spot.x * TILE - camX + 3, spot.y * TILE - camY + 1);
      }
    }

    for (const npc of this.visibleNpcs()) {
      const sprite = charSprite(npc.pal, npc.currentFacing, 0);
      screen.sprite(sprite.key, sprite.pix, npc.x * TILE - camX, npc.y * TILE - camY - 1, {
        flipX: sprite.flip
      });
      if (this.exclaimNpc === npc) {
        screen.panel(npc.x * TILE - camX + 2, npc.y * TILE - camY - 14, 12, 13);
        screen.text("!", npc.x * TILE - camX + 5, npc.y * TILE - camY - 11, INK);
      }
    }

    // Altri giocatori online sulla mia stessa mappa (interpolati).
    for (const r of mp.remotePlayers()) {
      const palId = remotePalId(r.id);
      const rFrame = r.moving ? (Math.floor(this.time * 4) % 2 === 0 ? 1 : 0) : 0;
      const sprite = charSprite(palId, r.facing, rFrame);
      const sx = Math.round(r.dispX) - camX;
      const sy = Math.round(r.dispY) - camY - 1;
      // Salta chi è troppo fuori schermo (perf + pulizia).
      if (sx < -20 || sx > VIEW_W + 20 || sy < -20 || sy > VIEW_H + 20) {
        continue;
      }
      screen.sprite(sprite.key, sprite.pix, sx, sy, { flipX: sprite.flip });
      // Targhetta col nickname sopra la testa.
      const name = r.nick.slice(0, 10);
      const w = name.length * 6 + 4;
      screen.rect(sx + 8 - w / 2, sy - 9, w, 8, "rgba(16,20,31,0.8)");
      screen.text(name, sx + 8 - w / 2 + 2, sy - 8, "#9cd8e8");
      // Bolla emote.
      if (r.emote) {
        screen.panel(sx + 6, sy - 22, 16, 13);
        screen.text(r.emote.slice(0, 1), sx + 10, sy - 19, INK);
      }
    }

    const frame = this.moving ? (Math.floor(this.moveT * 2) % 2 === 0 ? 1 : 0) : 0;
    const playerSprite = charSprite("player", pos.facing, frame);
    const baseX = Math.round(playerPx) - camX;
    const baseY = Math.round(playerPy) - camY - 2;
    // Se sei su un veicolo, lo disegniamo SOTTO e ti alziamo "in sella":
    // così si vede chiaramente che ci sei sopra.
    const vehicle = this.state.vehicle as VehicleId | null;
    if (vehicle) {
      const veh = vehicleSprite(vehicle, pos.facing);
      // La ruspa è più alta: solleva di più; il monopattino di poco.
      const lift = vehicle === "ruspa" ? 6 : 4;
      // Sobbalzo del mezzo in movimento (vibra un pelo, fa "motore").
      const jitter = this.moving && vehicle === "ruspa" ? (frame === 0 ? 0 : 1) : 0;
      screen.sprite(veh.key, veh.pix, baseX, baseY + jitter, { flipX: veh.flip });
      screen.sprite(playerSprite.key, playerSprite.pix, baseX, baseY - lift + jitter, {
        flipX: playerSprite.flip
      });
    } else {
      screen.sprite(playerSprite.key, playerSprite.pix, baseX, baseY, {
        flipX: playerSprite.flip
      });
    }

    // Fruscio dell'erba alta.
    for (const rustle of this.rustles) {
      const rx = rustle.x * TILE - camX;
      const ry = rustle.y * TILE - camY;
      const phase = rustle.t > 0.2 ? 0 : 1;
      screen.rect(rx + 1 + phase * 2, ry + 11, 3, 2, "#2c6a1a");
      screen.rect(rx + 12 - phase * 2, ry + 12, 3, 2, "#2c6a1a");
      screen.rect(rx + 6, ry + 13 + phase, 3, 2, "#3f8a2a");
    }

    // Nome zona.
    screen.rect(2, 2, this.map.name.length * 6 + 8, 12, "rgba(16,20,31,0.92)");
    screen.text(this.map.name, 6, 4, PAPER);

    // Conteggio giocatori online sulla mappa (presence multiplayer).
    if (mp.isEnabled() && mp.onlineCount > 0) {
      const label = `ONLINE ${mp.onlineCount + 1}`;
      screen.rect(2, 15, label.length * 6 + 8, 11, "rgba(16,20,31,0.92)");
      screen.text(label, 6, 17, "#7ad858");
    }

    // Overlay chat: ultime 2 righe sotto il nome zona (se ci sono messaggi).
    if (!this.msg.isOpen && !this.askMenu && !this.transportMenu && mp.chat.length > 0) {
      const recent = mp.chat.slice(-2);
      for (let i = 0; i < recent.length; i += 1) {
        const c = recent[i];
        const line = `${c.nick}: ${c.text}`.slice(0, 34);
        const y = 28 + i * 11;
        screen.rect(2, y, line.length * 6 + 6, 10, "rgba(16,20,31,0.7)");
        screen.text(line, 5, y + 1, "#cfe6ff");
      }
    }

    // Sondaggi in tempo reale (appena hai un Politicmon da sondare).
    if (this.state.party.length > 0) {
      const label = `SOND ${this.state.sondaggi}%`;
      const w = label.length * 6 + 8;
      screen.rect(VIEW_W - w - 2, 2, w, 12, "rgba(16,20,31,0.92)");
      screen.text(label, VIEW_W - w + 2, 4, sondaggiColor(this.state.sondaggi));
    }

    // Veicolo attivo: piccola targhetta sotto i sondaggi.
    if (this.state.vehicle) {
      const vlabel = VEHICLES[this.state.vehicle as VehicleId].name;
      const w = vlabel.length * 6 + 8;
      screen.rect(VIEW_W - w - 2, 16, w, 12, "rgba(16,20,31,0.92)");
      screen.text(vlabel, VIEW_W - w + 2, 18, "#9cc8e8");
    }

    // Obiettivo corrente in basso (solo all'aperto e a schermo libero).
    const quest = currentQuest(this.state);
    if (quest && !this.msg.isOpen && !this.askMenu && !this.transportMenu && this.map.outdoor) {
      const label = clipHud(`► ${quest.step}`, 35);
      screen.rect(2, VIEW_H - 16, VIEW_W - 4, 14, "rgba(16,20,31,0.92)");
      screen.text(label, 6, VIEW_H - 13, "#e8c84a");
    }

    // Modalità guidata: freccia gialla che punta verso l'obiettivo. La
    // nascondiamo quando siamo in un INTERNO (es. il LAB) ma il target è la
    // porta su un'altra mappa: la freccia ti direbbe di USCIRE proprio dal posto
    // in cui devi restare per completare l'obiettivo. In quel caso sei arrivato.
    const guideMisleading = quest?.target && !this.map.outdoor && quest.target.mapId !== this.map.id;
    if (
      quest?.target &&
      !guideMisleading &&
      isGuideOn() &&
      !this.msg.isOpen &&
      !this.askMenu &&
      !this.transportMenu
    ) {
      this.drawGuideArrow(screen, quest.target, playerPx, playerPy, camX, camY);
    }

    if (this.transportMenu) {
      screen.panel(0, VIEW_H - 58, VIEW_W, 58);
      screen.text(this.askLabel, 10, VIEW_H - 46, INK);
      this.transportMenu.draw(screen, VIEW_W - 104, VIEW_H - 58 - this.transportMenu.measureHeight(), 96);
    }

    if (this.askMenu) {
      screen.panel(0, VIEW_H - 44, VIEW_W, 44);
      screen.text(this.askLabel, 10, VIEW_H - 32, INK);
      this.askMenu.draw(screen, VIEW_W - 64, VIEW_H - 44 - this.askMenu.measureHeight(), 56);
    }

    this.msg.draw(screen);

    if (this.encounterFlash > 0) {
      const phase = Math.floor(this.encounterFlash * 12) % 2;
      if (phase === 0) {
        screen.dim(0.85);
      }
    }

    if (!this.msg.isOpen && !this.askMenu && this.state.party.length === 0 && this.map.id === "borgo") {
      screen.text("Vai al laboratorio col tetto BLU!", 8, VIEW_H - 26, GREY);
    }

    // Dissolvenza d'ingresso nella nuova mappa (più dolce dei cambi secchi).
    if (this.fadeT > 0) {
      screen.dim(this.fadeT / 0.35 * 0.9);
    }
  }
}
