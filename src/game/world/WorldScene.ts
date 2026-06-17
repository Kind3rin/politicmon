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
import { audio } from "../../engine/audio";
import type { Input } from "../../engine/input";
import type { Scene, SceneStack } from "../../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import { Menu, MessageBox, GREY, INK, PAPER } from "../../ui/widgets";
import { BattleScene, type BattleResult } from "../battle/BattleScene";
import { createMonster, healMonster, type Monster } from "../monster";
import { markCaught, markSeen, saveGame, type GameState } from "../state";
import { addSondaggi, curaPassiva, hasMinistro, sondaggiColor, sondaggiLabelShort } from "../governo";
import { checkAchievements } from "../achievements";
import { bulldozedKey, isBulldozed, unlockVehicle, VEHICLES, type VehicleId } from "../vehicles";
import { isGuideOn } from "../../engine/controls";
import { PauseScene } from "../../scenes/PauseScene";
import { ShopScene } from "../../scenes/ShopScene";
import { CasinoScene } from "../../scenes/CasinoScene";
import { MafiaScene } from "../../scenes/MafiaScene";
import { StarterPreviewScene } from "../../scenes/StarterPreviewScene";

const STEP_TIME = 0.18;
const RUN_FACTOR = 1.85;
const SCOOTER_FACTOR = 2.5; // il MONOPATTINO deve battere la corsa, non pareggiarla
const AUTO_FACTOR = 3.0; // l'AUTO BLU è il mezzo più rapido all'aperto

// Annunci una-tantum quando si entra in una mappa per la prima volta: servono a
// far scoprire feature che la storia principale non segnala (es. il CASINÒ).
const MAP_ENTRY_HINTS: Record<string, { flag: string; lines: string[] }> = {
  capitale: {
    flag: "hint-casino",
    lines: [
      "Sei a CAPUT MUNDI, il cuore del potere.",
      "Dietro l'angolo c'è il CASINÒ DI PALAZZO: SLOT, FICHE e un certo CLUB...",
      "Si gioca consenso a soldi. Cerca la porta tra i palazzi, verso destra."
    ]
  }
};

interface RuntimeNpc extends NpcDef {
  currentFacing: Facing;
  turnTimer: number;
  // Wander: gli NPC ambientali camminano un po' attorno al loro punto iniziale.
  homeX: number;
  homeY: number;
  dispX: number; // posizione di disegno in px (interpolata durante il passo)
  dispY: number;
  walkTimer: number; // tempo al prossimo tentativo di passo
  stepFrom: { x: number; y: number } | null; // cella di partenza del passo corrente
  stepT: number; // 0..1 avanzamento del passo
  canWander: boolean;
  path?: Array<{ x: number; y: number }>; // percorso scriptato (es. entrata di Gianni)
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
  private shake = 0; // scossone camera (es. RUSPA che abbatte un albero)
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
        "Lì scegli il tuo primo POLITICMON e parti per la scalata: tre MEDAGLIE e poi il PALAZZO!",
        "Un consiglio: non tutti gli edifici sono palestre. Circoli, redazioni, salotti... molti nascondono STORIE e tesori. Entra ed esplora!"
      ]);
    }
  }

  // ---- Setup ----

  private loadMap(mapId: string): void {
    this.map = MAPS[mapId];
    this.npcs = this.map.npcs.map((npc) => this.makeRuntimeNpc(npc));
    // RIVALE GIANNI ricorrente: se la tappa corrente è su questa mappa e non
    // l'hai ancora battuta, aggiungi il suo NPC (con linea di vista).
    const stage = rivalStageFor(this.state.rivalWins);
    if (stage && stage.mapId === mapId && !this.state.defeatedTrainers.includes(stage.id)) {
      this.npcs.push(this.makeRuntimeNpc({
        id: stage.id, pal: "rival", x: stage.x, y: stage.y, facing: stage.facing,
        trainerId: stage.id, sightRange: stage.sightRange,
        lines: ["GIANNI: ehi! Sì, dico a te."]
      }));
    }
    this.rustles = [];
    audio.playMusic(this.map.music ?? "borgo");
    this.fadeT = 0.35; // breve dissolvenza d'ingresso nella nuova mappa
    // Multiplayer: entra nella room di questa mappa (vedi solo chi è qui).
    const p = this.state.pos;
    mp.joinMap(mapId, p.x, p.y, p.facing);
  }

  // Crea lo stato runtime di un NPC. Decide se può vagare: esplicito via
  // `wander`, oppure di default per gli NPC "ambientali" (niente trainer, ruolo
  // funzionale o linea di vista — quelli devono restare al loro posto).
  private makeRuntimeNpc(npc: NpcDef): RuntimeNpc {
    const ambient =
      !npc.trainerId && !npc.sightRange && !npc.shop && !npc.healer && !npc.casino &&
      !npc.mafia && !npc.transport && !npc.gift && !npc.vehicleGift && !npc.legendary;
    const canWander = npc.wander ?? (ambient && this.map.outdoor);
    return {
      ...npc,
      currentFacing: npc.facing,
      turnTimer: 2 + Math.random() * 4,
      homeX: npc.x,
      homeY: npc.y,
      dispX: npc.x * TILE,
      dispY: npc.y * TILE,
      walkTimer: 2 + Math.random() * 4,
      stepFrom: null,
      stepT: 0,
      canWander
    };
  }

  // Aggiorna la camminata di un NPC vagante: interpola il passo in corso o, se
  // fermo, ogni tanto ne avvia uno nuovo verso una cella libera vicino a casa.
  private updateNpcWalk(npc: RuntimeNpc, dt: number): void {
    if (npc.stepFrom) {
      npc.stepT += dt / 0.3; // ~0.3s per cella, andatura tranquilla
      if (npc.stepT >= 1) {
        npc.stepT = 0;
        npc.stepFrom = null;
        npc.dispX = npc.x * TILE;
        npc.dispY = npc.y * TILE;
        npc.walkTimer = 1.5 + Math.random() * 4; // pausa prima del prossimo passo
      } else {
        npc.dispX = (npc.stepFrom.x + (npc.x - npc.stepFrom.x) * npc.stepT) * TILE;
        npc.dispY = (npc.stepFrom.y + (npc.y - npc.stepFrom.y) * npc.stepT) * TILE;
      }
      return;
    }
    npc.walkTimer -= dt;
    if (npc.walkTimer > 0) {
      return;
    }
    npc.walkTimer = 1.5 + Math.random() * 3;
    // Prova una direzione a caso; resta entro 2 celle dalla posizione iniziale.
    const dir = FACINGS[Math.floor(Math.random() * FACINGS.length)];
    npc.currentFacing = dir;
    const d = DIR_DELTA[dir];
    const nx = npc.x + d.dx;
    const ny = npc.y + d.dy;
    if (Math.abs(nx - npc.homeX) > 2 || Math.abs(ny - npc.homeY) > 2) {
      return; // troppo lontano da casa: questo giro gira solo la testa
    }
    if (!this.npcCanEnter(nx, ny, npc)) {
      return;
    }
    npc.stepFrom = { x: npc.x, y: npc.y };
    npc.stepT = 0;
    npc.x = nx;
    npc.y = ny;
  }

  // Sceglie la prima cella candidata libera (no player, no NPC, calpestabile).
  // Fallback all'ultima se tutte occupate.
  private firstFreeLabSpot(candidates: Array<{ x: number; y: number }>): { x: number; y: number } {
    for (const c of candidates) {
      const tile = TILES[this.tileAt(c.x, c.y)];
      const free =
        tile && !tile.solid &&
        !(this.state.pos.x === c.x && this.state.pos.y === c.y) &&
        !this.npcs.some((n) => n.id !== "rival-lab-cameo" && n.x === c.x && n.y === c.y);
      if (free) {
        return c;
      }
    }
    return candidates[candidates.length - 1];
  }

  // Avvia un cammino scriptato: l'NPC seguirà i waypoint uno dopo l'altro.
  private scriptedWalk(npc: RuntimeNpc, path: Array<{ x: number; y: number }>): void {
    npc.path = [...path];
  }

  // Avanza un NPC lungo il suo percorso scriptato, interpolando ogni passo.
  private advanceScriptedWalk(npc: RuntimeNpc, dt: number): void {
    const next = npc.path![0];
    if (!npc.stepFrom) {
      // Imposta direzione e parti verso il prossimo waypoint.
      const dx = Math.sign(next.x - npc.x);
      const dy = Math.sign(next.y - npc.y);
      npc.currentFacing = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
      npc.stepFrom = { x: npc.x, y: npc.y };
      npc.stepT = 0;
      npc.x = next.x;
      npc.y = next.y;
    }
    npc.stepT += dt / 0.22; // andatura un po' svelta: "ingresso a effetto"
    if (npc.stepT >= 1) {
      npc.stepT = 0;
      npc.stepFrom = null;
      npc.dispX = npc.x * TILE;
      npc.dispY = npc.y * TILE;
      npc.path!.shift();
      if (npc.path!.length === 0) {
        npc.path = undefined;
      }
    } else {
      npc.dispX = (npc.stepFrom.x + (npc.x - npc.stepFrom.x) * npc.stepT) * TILE;
      npc.dispY = (npc.stepFrom.y + (npc.y - npc.stepFrom.y) * npc.stepT) * TILE;
    }
  }

  // Una cella è agibile per un NPC se: tile calpestabile, non c'è il player, né
  // un altro NPC, né un warp o un pickup visibile (per non bloccare il giocatore).
  private npcCanEnter(x: number, y: number, self: RuntimeNpc): boolean {
    const tile = TILES[this.tileAt(x, y)];
    if (!tile || tile.solid || tile.encounter) {
      return false; // niente erba alta: eviterebbe trigger strani e sembra più sensato
    }
    if (this.state.pos.x === x && this.state.pos.y === y) {
      return false;
    }
    if (this.npcs.some((n) => n !== self && n.x === x && n.y === y)) {
      return false;
    }
    if (this.map.warps.some((w) => w.x === x && w.y === y)) {
      return false;
    }
    if (this.map.pickups.some((p) => !p.hidden && p.x === x && p.y === y && !this.state.pickedItems.includes(p.id))) {
      return false;
    }
    return true;
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
        (p) => p.x === x && p.y === y && !p.hidden && !this.state.pickedItems.includes(p.id)
      )
    ) {
      return true; // i tesori nascosti NON bloccano: niente muri invisibili
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
    music?: string,
    legendary = false
  ): void {
    this.queueBattle(() => {
      const foe = createMonster(speciesId, level);
      this.stack.push(
        new BattleScene(this.stack, this.input, {
          state: this.state,
          foeTeam: [foe],
          music,
          legendary,
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
      // Sconfitta meno punitiva: perdi un quarto dei fondi (max 250€) invece
      // della metà, così una sconfitta non azzera la campagna né demotiva.
      const lost = Math.min(Math.floor(this.state.money / 4), 250);
      this.state.money -= lost;
      const sondaggi = addSondaggi(this.state, -5);
      for (const mon of this.state.party) {
        healMonster(mon);
      }
      // Risveglio in piazza, davanti al BAR SPORT (cella aperta e calpestabile):
      // (19,17) era la PORTA, circondata da muri -> sembrava incastrati nel bar.
      this.state.pos = { mapId: "borgo", x: 19, y: 18, facing: "down" };
      this.loadMap("borgo");
      this.say([
        "Hai perso il consenso e anche i sensi...",
        `Ti risvegli davanti al BAR SPORT di BORGO URNE, più leggero di ${lost}€.`,
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
      audio.hitSuper(); // tonfo più corposo dell'hit normale
      this.shake = 0.45; // scossone: l'albero crolla, si sente
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
      saveGame(this.state);
      if (pickup.hidden) {
        // Tesoro segreto: ricompensa la curiosità con una piccola celebrazione.
        audio.catchJingle();
        this.say([
          "Ehi! Qui c'era qualcosa di nascosto...",
          `TESORO SEGRETO! ${ITEMS[pickup.itemId].name} x${pickup.qty}!`
        ]);
      } else {
        audio.confirm();
        this.say([`Trovi ${ITEMS[pickup.itemId].name} x${pickup.qty}!`]);
      }
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
      // Primo accesso a un negozio: spiega cosa sono le DIRETTIVE (le "MT").
      const lines = [...(npc.lines ?? [])];
      if (!this.state.flags["tm-hint"]) {
        this.state.flags["tm-hint"] = true;
        lines.push(
          "Occhio alle DIRETTIVE: insegnano una mossa nuova a un POLITICMON dello stesso schieramento.",
          "Si riusano all'infinito. Le impari dalla BORSA, fuori dalla lotta."
        );
      }
      this.say(lines, () => {
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

    if (npc.mafia) {
      this.say(npc.lines ?? [], () => {
        this.stack.push(new MafiaScene(this.stack, this.input, this.state));
      });
      return;
    }

    if (npc.healer) {
      const lines = [...(npc.lines ?? [])];
      // Primo BAR SPORT: spiega che qui si cura GRATIS, quando serve.
      if (!this.state.flags["heal-hint"]) {
        this.state.flags["heal-hint"] = true;
        lines.push(
          "Quando la squadra è malconcia, passa da un BAR SPORT come questo: rimetto tutti in sesto, gratis.",
          "Ne trovi uno in ogni città. Tornaci ogni volta che ti serve."
        );
      }
      this.say(lines, () => {
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
      }, "battle-legend", true);
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

    // Gianni ENTRA in scena dalla porta del lab (5,7) e si piazza al centro,
    // così non è solo testo: lo si vede arrivare di corsa. Evita la cella del
    // player: si ferma in una libera, accanto a lui.
    const gianni = this.makeRuntimeNpc({
      id: "rival-lab-cameo", pal: "rival", x: 5, y: 7, facing: "up",
      lines: []
    });
    gianni.canWander = false;
    this.npcs.push(gianni);
    const target = this.firstFreeLabSpot([{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 6, y: 4 }, { x: 5, y: 5 }]);
    this.scriptedWalk(gianni, [{ x: 5, y: 6 }, { x: 5, y: 5 }, target]);

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
          this.npcs = this.npcs.filter((n) => n.id !== "rival-lab-cameo"); // Gianni esce
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

  private wanderCooldown = 30; // passi minimi prima del primo/prossimo incontro
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
    // ~3% per passo una volta scaduto il cooldown (raro, non invadente).
    if (Math.random() > 0.03) {
      return false;
    }
    const def = pickWanderer(this.state, this.recentWanderers, Math.random());
    if (!def) {
      return false;
    }
    this.wanderCooldown = 45 + Math.floor(Math.random() * 30);
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

  // Eventi morale di strada DISABILITATI: comparivano come nuvolette di testo dal
  // nulla (nessun personaggio in scena), ovunque all'aperto e troppo spesso. Non
  // divertenti. La chiamata in onStepComplete è stata rimossa. Il pool
  // STREET_EVENTS resta in src/data/streetevents.ts se si volesse riattivare.

  // ---- Step resolution ----

  private stepCount = 0;
  // Cooldown globale fra interruzioni (incontri, PG vaganti, eventi morale):
  // dopo una qualsiasi, si concede una "tregua" di pochi passi prima che possa
  // scattarne un'altra. Evita la raffica di interruzioni ravvicinate.
  private interruptCooldown = 0;

  // Annunci one-shot all'arrivo in una mappa: segnalano feature che altrimenti
  // resterebbero invisibili a chi segue solo la storia. Flag per non ripetere.
  private showMapEntryHint(): boolean {
    const hint = MAP_ENTRY_HINTS[this.map.id];
    if (!hint || this.state.flags[hint.flag]) {
      return false;
    }
    this.state.flags[hint.flag] = true;
    saveGame(this.state);
    this.say(hint.lines);
    return true;
  }

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

    // Tesori nascosti: si scoprono calpestandoli (non hanno sprite a terra).
    const buried = this.map.pickups.find(
      (p) => p.hidden && p.x === pos.x && p.y === pos.y && !this.state.pickedItems.includes(p.id)
    );
    if (buried) {
      this.state.pickedItems.push(buried.id);
      this.state.bag[buried.itemId] = (this.state.bag[buried.itemId] ?? 0) + buried.qty;
      saveGame(this.state);
      audio.catchJingle();
      this.say([
        "Un attimo... il terreno qui suona strano.",
        `TESORO SEGRETO! ${ITEMS[buried.itemId].name} x${buried.qty}!`
      ]);
      return;
    }

    // Le sfide a vista degli allenatori NON passano dal cooldown: sono fisse,
    // non casuali, e vanno innescate sempre.
    if (this.checkTrainerSight()) {
      this.interruptCooldown = 6;
      return;
    }

    // Tregua globale: dopo una qualsiasi interruzione si saltano gli eventi
    // casuali per qualche passo, così non si accavallano in raffica.
    if (this.interruptCooldown > 0) {
      this.interruptCooldown -= 1;
      return;
    }

    if (this.checkWanderingChallenger()) {
      this.interruptCooldown = 6;
      return;
    }


    const tile = TILES[this.tileAt(pos.x, pos.y)];
    if (tile?.encounter) {
      this.rustles.push({ x: pos.x, y: pos.y, t: 0.4 });
      const baseRate = this.map.encounterRate ?? 0.06;
      // Ministero dell'Interno e PROTEZIONE della famiglia diradano gli incontri.
      const rate =
        baseRate *
        (hasMinistro(this.state, "interno") ? 0.65 : 1) *
        (this.state.flags["mafia-protezione"] ? 0.6 : 1);
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
            this.interruptCooldown = 6;
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
    this.shake = Math.max(0, this.shake - dt);
    this.fadeT = Math.max(0, this.fadeT - dt);
    mp.update(dt); // interpolazione avatar remoti + decadimento emote
    this.rustles = this.rustles.filter((r) => (r.t -= dt) > 0);

    // NPC vivi: i "vaganti" camminano attorno a casa, gli altri si guardano
    // intorno girando la testa. (I trainer/healer restano immobili al loro posto.)
    for (const npc of this.npcs) {
      // Percorso scriptato (es. Gianni che entra nel lab): ha la precedenza.
      if (npc.path && npc.path.length > 0) {
        this.advanceScriptedWalk(npc, dt);
        continue;
      }
      if (npc.trainerId || npc.healer) {
        continue;
      }
      if (npc.canWander) {
        this.updateNpcWalk(npc, dt);
      } else {
        npc.turnTimer -= dt;
        if (npc.turnTimer <= 0) {
          npc.turnTimer = 2 + Math.random() * 5;
          npc.currentFacing = FACINGS[Math.floor(Math.random() * FACINGS.length)];
        }
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

    // Traguardi: valutati quando il giocatore ha il controllo libero (così
    // scattano dopo battaglie, catture, sblocchi senza agganci sparsi). La
    // notifica appare come BREAKING NEWS dei traguardi.
    if (!this.moving) {
      const fresh = checkAchievements(this.state);
      if (fresh.length > 0) {
        const lines: string[] = [];
        for (const a of fresh) {
          lines.push(`TRAGUARDO SBLOCCATO: ${a.name}!`, `${a.desc} Premio: ${a.reward}€.`);
        }
        saveGame(this.state);
        audio.catchJingle();
        this.say(lines);
        return;
      }
      // Hint one-shot all'arrivo in certe mappe (segnala le feature nascoste).
      if (this.showMapEntryHint()) {
        return;
      }
    }

    const pos = this.state.pos;

    if (this.moving) {
      // Monopattino e auto sono più veloci della semplice corsa (B): si sente.
      const fast = this.map.outdoor ? this.state.vehicle : null;
      const factor =
        fast === "auto"
          ? AUTO_FACTOR
          : fast === "monopattino"
            ? SCOOTER_FACTOR
            : this.running
              ? RUN_FACTOR
              : 1;
      this.moveT += (dt / STEP_TIME) * factor;
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
    // Con MONOPATTINO o AUTO si va sempre veloci all'aperto; B resta la corsa.
    const onVehicle =
      (this.state.vehicle === "monopattino" || this.state.vehicle === "auto") && this.map.outdoor;
    this.running = this.input.isHeld("b") || onVehicle;
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
    // Scossone (RUSPA): sposta la camera di qualche pixel, dà peso all'impatto.
    if (this.shake > 0) {
      const amp = this.shake * 4;
      camX += Math.round((Math.random() - 0.5) * amp);
      camY += Math.round((Math.random() - 0.5) * amp);
    }

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
      if (this.state.pickedItems.includes(pickup.id) || pickup.hidden) {
        continue; // i tesori nascosti non si disegnano: vanno scovati esaminando
      }
      screen.sprite("ballot", BALLOT_ART, pickup.x * TILE - camX + 3, pickup.y * TILE - camY + 3);
    }

    if (this.map.id === "lab" && !this.state.flags["starter-chosen"]) {
      for (const spot of STARTER_SPOTS) {
        screen.sprite("ballot", BALLOT_ART, spot.x * TILE - camX + 3, spot.y * TILE - camY + 1);
      }
    }

    for (const npc of this.visibleNpcs()) {
      // Frame di camminata mentre l'NPC fa un passo (altrimenti fermo).
      const walkFrame = npc.stepFrom ? (Math.floor(this.time * 6) % 2 === 0 ? 1 : 0) : 0;
      const sprite = charSprite(npc.pal, npc.currentFacing, walkFrame);
      const nx = Math.round(npc.dispX) - camX;
      const ny = Math.round(npc.dispY) - camY - 1;
      screen.sprite(sprite.key, sprite.pix, nx, ny, { flipX: sprite.flip });
      if (this.exclaimNpc === npc) {
        screen.panel(nx + 2, ny - 13, 12, 13);
        screen.text("!", nx + 5, ny - 10, INK);
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
      // Quanto sollevare il personaggio per "sedercelo" sopra: la ruspa è alta,
      // l'auto lo mette in abitacolo, il monopattino di poco.
      const lift = vehicle === "ruspa" ? 6 : vehicle === "auto" ? 7 : 4;
      // Sobbalzo del mezzo in movimento (vibra un pelo, fa "motore").
      const motor = vehicle === "ruspa" || vehicle === "auto";
      const jitter = this.moving && motor ? (frame === 0 ? 0 : 1) : 0;
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

    // Sondaggi in tempo reale: barra colorata + etichetta del momento politico,
    // così il giocatore "legge" il suo consenso a colpo d'occhio (non solo un numero).
    let hudBottom = 2;
    if (this.state.party.length > 0) {
      const sond = this.state.sondaggi;
      const col = sondaggiColor(sond);
      const panelW = 80;
      const px = VIEW_W - panelW - 2;
      screen.rect(px, 2, panelW, 22, "rgba(16,20,31,0.92)");
      screen.text(`SOND ${sond}%`, px + 4, 4, col);
      // Barra di riempimento.
      const barW = panelW - 8;
      screen.rect(px + 4, 12, barW, 4, "rgba(255,255,255,0.15)");
      screen.rect(px + 4, 12, Math.max(1, Math.round((barW * sond) / 100)), 4, col);
      // Etichetta del momento (PLEBISCITO, OPPOSIZIONE, ...): troncata se serve.
      screen.text(clipHud(sondaggiLabelShort(sond), 13), px + 4, 17, "#cfe6ff");
      hudBottom = 26;
    }

    // Veicolo attivo: piccola targhetta sotto i sondaggi.
    if (this.state.vehicle) {
      const vlabel = VEHICLES[this.state.vehicle as VehicleId].name;
      const w = vlabel.length * 6 + 8;
      screen.rect(VIEW_W - w - 2, hudBottom, w, 12, "rgba(16,20,31,0.92)");
      screen.text(vlabel, VIEW_W - w + 2, hudBottom + 2, "#9cc8e8");
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
