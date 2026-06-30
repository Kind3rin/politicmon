import { charSprite, playerImage, ferryImage, npcImage, vehicleImage, remotePalId, vehicleSprite, type Facing } from "../../art/characters";
import { mp } from "../../net/mp";
import { MONSTER_ART, drawMonsterSprite } from "../../art/monsters";
import { TILE, TILES, waterFrames, tileImage, objectImage, isRoof, isFacade, buildingImage, buildingKey, buildingDoorOffset } from "../../art/tiles";
import { sceneImage, getSpriteImage } from "../../engine/assets";

// Pickup "scheda elettorale": PNG PixelLab 14px centrato nella cella.
function drawBallot(screen: Screen, dx: number, dy: number): void {
  const img = sceneImage("item:scheda", "items/scheda.png");
  if (!img) {
    return;
  }
  const b = screen.imageBounds(img);
  const s = 14 / Math.max(b.w, b.h);
  screen.imageSpriteCropped(img, dx + (TILE - b.w * s) / 2, dy + (TILE - b.h * s) / 2, { scaleX: s, scaleY: s });
}
import { ITEMS } from "../../data/items";
import { BAR_RESPAWN, MAPS, STARTER_SPOTS, type MapDef, type NpcDef } from "../../data/maps";
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
import { createMonster, healMonster, statsOf, type Monster } from "../monster";
import { markCaught, markSeen, saveGame, setActiveState, type GameState } from "../state";
import { addSondaggi, curaPassiva, hasMinistro, sondaggiColor, sondaggiLabelShort } from "../governo";
import { checkAchievements } from "../achievements";
import { bulldozedKey, isBulldozed, unlockVehicle, VEHICLES, type VehicleId } from "../vehicles";
import { isGuideOn } from "../../engine/controls";
import { PauseScene } from "../../scenes/PauseScene";
import { ShopScene } from "../../scenes/ShopScene";
import { CasinoScene } from "../../scenes/CasinoScene";
import { BoxScene } from "../../scenes/BoxScene";
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

const WORLD_OBJECT_TARGET_PX: Record<string, number> = {
  T: 30,
  s: 16,
  f: 16,
  "~": 16,
  ",": 16,
  L: 16,
  t: 16,
  b: 16,
  P: 16,
  h: 16,
  k: 16,
  J: 18,
  K: 20,
  g: 16
};

const TRANSPORT_DESTINATIONS: TransportDestination[] = [
  { label: "BORGO URNE", mapId: "borgo", x: 24, y: 22, facing: "right" },
  { label: "MEDIOPOLI", mapId: "mediopoli", x: 23, y: 19, facing: "right", requires: (s) => Boolean(s.flags["dex-received"]) },
  { label: "EUROTOWN", mapId: "eurotown", x: 23, y: 14, facing: "right", requires: (s) => s.badges.includes("auditel") },
  { label: "CAPUT MUNDI", mapId: "capitale", x: 23, y: 19, facing: "right", requires: (s) => s.badges.includes("spread") }
  // STRETTO rimosso dal taxi: ora ci si arriva dall'IMBARCO a Caput Mundi e si
  // attraversa l'acqua con la MN TRAGHETTO (vedi warp "imbarco" + canFerry).
];

function clipHud(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function drawWorldObjectPng(screen: Screen, ch: string, img: HTMLImageElement, dx: number, dy: number): void {
  const target = WORLD_OBJECT_TARGET_PX[ch] ?? TILE;
  const b = screen.imageBounds(img);
  const scale = target / Math.max(b.w, b.h);
  const dw = b.w * scale;
  const dh = b.h * scale;
  screen.imageSpriteCropped(img, dx + TILE / 2 - dw / 2, dy + TILE - dh, { scaleX: scale, scaleY: scale });
}

// Avvicina `current` a `target` di al più `delta` (lerp clampato per le barre).
function approachWorld(current: number, target: number, delta: number): number {
  if (current < target) {
    return Math.min(target, current + delta);
  }
  if (current > target) {
    return Math.max(target, current - delta);
  }
  return current;
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
  private landVehicle: VehicleId | null = null; // mezzo terrestre messo da parte mentre sei in TRAGHETTO
  private fromX = 0;
  private fromY = 0;
  private time = 0;
  private rustles: Rustle[] = [];
  private encounterFlash = 0;
  private fadeT = 0; // dissolvenza d'ingresso mappa
  private fadeOut = 0; // dissolvenza d'USCITA prima di un warp
  private pendingWarp: (() => void) | null = null;
  private pendingBattle: (() => void) | null = null;
  private exclaimNpc: RuntimeNpc | null = null;
  private exclaimT = 0;
  private pendingTrainer: TrainerDef | null = null;
  private wanderNpc: RuntimeNpc | null = null; // sprite temporaneo del PG vagante

  // ---- Effetto di CURA (BAR SPORT, risveglio, raccomandazione mafia) ----
  private healFx = 0; // durata residua dell'animazione di cura
  private afterHeal: (() => void) | null = null; // callback a fine animazione
  private healSparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; max: number; color: string }> = [];
  // Snapshot HP pre-cura: le barre si riempiono "a vista" da `from` a `to`.
  private healSnapshot: Array<{ mon: Monster; from: number; to: number; disp: number }> = [];
  // Scintille della cura passiva (Min. Salute), in coordinate-MONDO (px mappa).
  private stepSparks: Array<{ x: number; y: number; vy: number; life: number; max: number }> = [];

  // ---- Banner "evento" (traguardo, breaking news): entra a molla + flash ----
  private banner: { text: string; sub: string; t: number; color: string } | null = null;
  private bannerFlash = 0;

  // ---- HUD sondaggi animata: il valore mostrato insegue quello reale ----
  private displaySondaggi = -1; // -1 = non inizializzato
  private sondPulse = 0; // durata residua del flash colore sulla barra
  private sondDelta: { text: string; t: number; up: boolean } | null = null;

  private askMenu: Menu | null = null;
  private askYes: (() => void) | null = null;
  private askNo: (() => void) | null = null;
  private askLabel = "";
  private transportMenu: Menu | null = null;
  private transportDestinations: TransportDestination[] = [];

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    // Registra lo stato come "attivo" per il salvataggio su chiusura/background
    // (gestito a livello globale in main.ts).
    setActiveState(this.state);
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
    // Cambiando mappa la vecchia lista NPC viene sostituita: scarta il ref allo
    // sprite del PG vagante (altrimenti puntereebbe a un NPC non più disegnato).
    this.wanderNpc = null;
    this.exclaimNpc = null;
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
    // Memorizza l'ultima città-con-bar visitata: è lì che si respawna al KO.
    if (this.map.outdoor && BAR_RESPAWN[mapId]) {
      this.state.lastBar = mapId;
    }
    // Multiplayer: entra nella room di questa mappa (vedi solo chi è qui).
    const p = this.state.pos;
    mp.joinMap(mapId, p.x, p.y, p.facing);
    // Autosave a ogni cambio mappa: warp e bordi nord/sud aggiornano state.pos e
    // chiamano loadMap, ma prima nessuno salvava — chiudendo l'app si tornava a
    // un punto vecchio, spesso su un'altra mappa. saveGame è try/catch: sicuro.
    saveGame(this.state);
  }

  // Crea lo stato runtime di un NPC. Decide se può vagare: esplicito via
  // `wander`, oppure di default per gli NPC "ambientali" (niente trainer, ruolo
  // funzionale o linea di vista — quelli devono restare al loro posto).
  private makeRuntimeNpc(npc: NpcDef): RuntimeNpc {
    const ambient =
      !npc.trainerId && !npc.sightRange && !npc.shop && !npc.healer && !npc.casino &&
      !npc.box && !npc.mafia && !npc.transport && !npc.gift && !npc.vehicleGift &&
      !npc.legendary;
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
    const ch = this.map.tiles[y]?.[x] ?? (this.map.outdoor ? "T" : "A");
    // Un albero abbattuto dalla RUSPA diventa erba calpestabile.
    if (ch === "T" && isBulldozed(this.state, this.map.id, x, y)) {
      return this.map.outdoor ? "." : "p";
    }
    return ch;
  }

  // Terreni PixelLab cartoon: erba/sentiero/sabbia/acqua restano tile top-down
  // pieni. I Wang grass/path provati sembravano rilievi attraversabili.
  // Texture PNG di un tile per la mappa corrente: prima l'override di mappa
  // (es. roccia in grotta), poi il PNG di default (`tileImage`). null = pixmap.
  private tilePng(ch: string): HTMLImageElement | null {
    const ov = this.map.tileOverrides?.[ch];
    if (ov) {
      return getSpriteImage(`tile:ov:${this.map.id}:${ch}`, ov);
    }
    return tileImage(ch);
  }

  // Footprint di un EDIFICIO a partire dall'angolo alto-sx (atx,aty) di un blocco
  // tetto: misura larghezza/altezza in tile inglobando le righe di FACCIATA
  // (muro/porta/finestra) contigue sotto il tetto. Così il building-PNG si scala
  // ESATTAMENTE sull'impronta disegnata nella mappa ASCII, qualunque sia la sua
  // dimensione (4x3 casa, 6x3 palestra/casinò, 10x4 palazzo) — niente overflow,
  // niente celle-tetto scoperte, niente edifici che galleggiano o si tagliano.
  private buildingFootprint(atx: number, aty: number, roofCh: string): { w: number; h: number } {
    const groupKey = buildingKey(roofCh);
    // Stessa "famiglia" di tetto = stesso file PNG (es. e/Q bar, y/B/x palestra).
    const sameGroup = (x: number, y: number): boolean => buildingKey(this.tileAt(x, y)) === groupKey;
    // Larghezza: celle tetto dello stesso GRUPPO contigue verso destra.
    let w = 0;
    while (sameGroup(atx + w, aty)) {
      w += 1;
    }
    // Altezza: righe di tetto (stesso gruppo) + righe di facciata sotto, larghe
    // almeno quanto il tetto (centrate). Mi fermo alla prima riga senza facciata.
    let roofRows = 0;
    while (sameGroup(atx, aty + roofRows)) {
      roofRows += 1;
    }
    let facadeRows = 0;
    for (let r = aty + roofRows; ; r += 1) {
      // La riga conta come facciata se almeno una cella nella fascia [atx, atx+w)
      // è un char-facciata. (Il muro può essere più largo del tetto: `mmdnmm`.)
      let any = false;
      for (let c = atx - 1; c < atx + w + 1; c += 1) {
        if (isFacade(this.tileAt(c, r))) {
          any = true;
          break;
        }
      }
      if (!any) {
        break;
      }
      facadeRows += 1;
      if (facadeRows > 2) {
        break; // le facciate sono 1 riga (case) o eccezione; cap di sicurezza
      }
    }
    return { w, h: roofRows + facadeRows };
  }

  // Se la cella (tx,ty) cade dentro la footprint di un edificio col building-PNG
  // pronto, ritorna il char-tetto di quell'edificio (così il 1° passo sa che il
  // terreno sotto va lasciato libero e il PNG ci penserà). Altrimenti null.
  // Cerca l'angolo alto-sx del blocco-tetto scorrendo su/sinistra dalla cella, su
  // entrambi i char tetto E facciata, poi verifica che (tx,ty) sia nella footprint.
  private buildingCovering(tx: number, ty: number): string | null {
    const here = this.tileAt(tx, ty);
    if (!isRoof(here) && !isFacade(here)) {
      return null;
    }
    // Trova un char-tetto risalendo: se sono su una facciata salgo finché trovo
    // il tetto; se sono già su un tetto resto. Poi vado all'angolo alto-sx.
    let rx = tx;
    let ry = ty;
    if (isFacade(here)) {
      // sali finché trovi un tetto (max poche righe)
      let steps = 0;
      while (steps < 4 && !isRoof(this.tileAt(rx, ry))) {
        ry -= 1;
        steps += 1;
      }
      if (!isRoof(this.tileAt(rx, ry))) {
        return null;
      }
    }
    const roofCh = this.tileAt(rx, ry);
    const groupKey = buildingKey(roofCh);
    // angolo alto-sx del blocco tetto (stesso GRUPPO, non stesso char)
    let atx = rx;
    let aty = ry;
    while (buildingKey(this.tileAt(atx - 1, aty)) === groupKey) atx -= 1;
    while (buildingKey(this.tileAt(atx, aty - 1)) === groupKey) aty -= 1;
    const fp = this.buildingFootprint(atx, aty, roofCh);
    if (!buildingImage(roofCh, fp)) {
      return null; // PNG esatto per questa footprint non pronto: usa i pixmap.
    }
    // (tx,ty) dentro la footprint? La facciata può sbordare di 1 col per lato.
    if (tx >= atx - 1 && tx < atx + fp.w + 1 && ty >= aty && ty < aty + fp.h) {
      // ma solo se è davvero tetto o facciata (non erba a fianco)
      if (isRoof(here) || isFacade(here)) {
        return roofCh;
      }
    }
    return null;
  }

  private isBlocked(x: number, y: number): boolean {
    const tile = TILES[this.tileAt(x, y)];
    if (!tile) {
      return true;
    }
    // MN TRAGHETTO: con la mossa macchina sbloccata, l'acqua diventa
    // attraversabile (come SURF). Senza, resta un muro liquido.
    if (tile.water) {
      if (!this.canFerry()) {
        return true;
      }
    } else if (tile.solid) {
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

  // L'acqua è navigabile solo se POSSIEDI il TRAGHETTO (al timone il CAPITANO
  // SCHETTINO). L'imbarco è automatico: niente menu, niente soft-lock.
  private canFerry(): boolean {
    return Boolean(this.state.flags["veh-traghetto"]);
  }

  private isOutdoorDoorWarp(warp: MapDef["warps"][number]): boolean {
    const target = MAPS[warp.toMap];
    const ch = this.tileAt(warp.x, warp.y);
    return Boolean(this.map.outdoor && target && !target.outdoor && (ch === "d" || ch === "D" || ch === "g"));
  }

  private enteredDoorFromFront(warp: MapDef["warps"][number]): boolean {
    return this.state.pos.facing === "up" && this.fromX === warp.x && this.fromY === warp.y + 1;
  }

  // Imbarco/sbarco automatico: se sei su acqua col traghetto posseduto, il
  // veicolo "traghetto" è attivo (scafo+Schettino); appena torni a terra,
  // ripristina il veicolo terrestre precedente. Chiamato dopo ogni passo.
  private syncFerryVehicle(): void {
    if (!this.canFerry()) {
      return;
    }
    const onWater = Boolean(TILES[this.tileAt(this.state.pos.x, this.state.pos.y)]?.water);
    if (onWater && this.state.vehicle !== "traghetto") {
      this.landVehicle = (this.state.vehicle as VehicleId | null) ?? null; // ricorda il mezzo terrestre
      this.state.vehicle = "traghetto";
    } else if (!onWater && this.state.vehicle === "traghetto") {
      this.state.vehicle = this.landVehicle ?? null;
    }
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

  // Sapore casuale dell'incontro selvatico: ~22% delle volte applica un
  // modificatore di livello con un annuncio, modulato dai SONDAGGI. Restituisce
  // null per un incontro "normale".
  private rollEncounterFlavor(): { dLevel: number; line: string } | null {
    if (Math.random() > 0.22) {
      return null;
    }
    const sond = this.state.sondaggi;
    const pool: Array<{ dLevel: number; line: string }> = [
      { dLevel: 3, line: "COMIZIO AFFOLLATO! Un POLITICMON carico e agguerrito ti sbarra la strada." },
      { dLevel: -2, line: "Un ASTENSIONISTA svogliato ti incrocia, senza troppa voglia di lottare." },
      { dLevel: 1, line: "Aria di campagna elettorale: l'avversario sembra più motivato del solito." }
    ];
    // SONDAGGI alti -> più probabile il "VIP" tosto; bassi -> più astensionisti.
    if (sond >= 70 && Math.random() < 0.6) {
      return pool[0];
    }
    if (sond < 40 && Math.random() < 0.6) {
      return pool[1];
    }
    return pool[Math.floor(Math.random() * pool.length)];
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
            // Rimuovi lo sprite temporaneo del PG vagante a fine lotta (qualsiasi
            // esito): la vittoria su un "wander:*" non ricarica la mappa, quindi
            // senza questo l'NPC resterebbe sullo schermo per sempre.
            if (this.wanderNpc) {
              const gone = this.wanderNpc;
              this.npcs = this.npcs.filter((n) => n !== gone);
              this.wanderNpc = null;
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
      // Risveglio davanti al BAR SPORT dell'ULTIMA città visitata (non sempre
      // BORGO). Lo spot è la cella calpestabile davanti alla porta del bar.
      const city = this.state.lastBar && BAR_RESPAWN[this.state.lastBar] ? this.state.lastBar : "borgo";
      const spot = BAR_RESPAWN[city];
      const cityName = MAPS[city]?.name ?? "BORGO URNE";
      this.state.pos = { mapId: city, x: spot.x, y: spot.y, facing: "down" };
      this.loadMap(city);
      this.say([
        "Hai perso il consenso e anche i sensi...",
        `Ti risvegli davanti al BAR SPORT di ${cityName}, più leggero di ${lost}€.`,
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

    if (npc.box) {
      this.say(npc.lines ?? [], () => {
        this.stack.push(new BoxScene(this.stack, this.input, this.state));
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
        this.playHealFx(() => {
          saveGame(this.state);
          this.say(["Un giro di caffè per tutta la squadra... offre la casa!", "I tuoi POLITICMON sono al massimo del consenso."]);
        });
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
      // Gating opzionale (es. il TRAGHETTO serve 3 medaglie).
      if (vg.requiresBadges && this.state.badges.length < vg.requiresBadges) {
        this.say(vg.lockedLines ?? ["Non sei ancora pronto."]);
        return;
      }
      this.say(vg.lines, () => {
        this.state.flags[vg.flag] = true;
        unlockVehicle(this.state, vg.vehicle);
        audio.catchJingle();
        // Il TRAGHETTO si imbarca da solo sull'acqua; gli altri si attivano dal menu.
        const howto = vg.vehicle === "traghetto"
          ? "Cammina verso il mare: t'imbarchi da solo, SCHETTINO al timone."
          : "Attivalo dal menu (START) alla voce VEICOLO.";
        this.say([`Hai ottenuto: ${VEHICLES[vg.vehicle].name}!`, howto]);
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

  private wanderCooldown = 50; // passi minimi prima del primo/prossimo incontro
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
    // ~2% per passo una volta scaduto il cooldown (raro, non invadente).
    if (Math.random() > 0.02) {
      return false;
    }
    const def = pickWanderer(this.state, this.recentWanderers, Math.random());
    if (!def) {
      return false;
    }
    // Serve una cella libera ACCANTO al player dove far comparire il PG: senza
    // sprite l'incontro sembrerebbe partire "dal nulla" (la nuvoletta "!" si
    // disegna solo sopra un NPC reale). Se è tutto occupato, niente incontro.
    const spot = this.freeAdjacentSpot();
    if (!spot) {
      return false;
    }
    this.wanderCooldown = 70 + Math.floor(Math.random() * 40);
    this.recentWanderers.push(def.id);
    if (this.recentWanderers.length > 3) {
      this.recentWanderers.shift();
    }
    const trainer = this.buildWandererTrainer(def);
    // Crea lo sprite del PG vagante rivolto verso il player e mostragli la "!".
    const npc = this.makeRuntimeNpc({
      id: `wanderer-${def.id}`,
      pal: def.pal,
      x: spot.x,
      y: spot.y,
      facing: spot.facing
    });
    this.npcs.push(npc);
    this.wanderNpc = npc;
    audio.encounterSting();
    this.exclaimNpc = npc;
    this.exclaimT = 0.7;
    this.pendingTrainer = trainer;
    return true;
  }

  // Cella calpestabile e libera adiacente al player, col facing rivolto verso
  // di lui. Usata per far "spuntare" un PG vagante accanto al giocatore.
  private freeAdjacentSpot(): { x: number; y: number; facing: Facing } | null {
    const pos = this.state.pos;
    // facing dell'NPC = opposto della direzione in cui sta rispetto al player.
    const opp: Record<Facing, Facing> = { up: "down", down: "up", left: "right", right: "left" };
    for (const dir of FACINGS) {
      const d = DIR_DELTA[dir];
      const nx = pos.x + d.dx;
      const ny = pos.y + d.dy;
      const tile = TILES[this.tileAt(nx, ny)];
      if (!tile || tile.solid) {
        continue;
      }
      if (this.npcs.some((n) => n.x === nx && n.y === ny)) {
        continue;
      }
      return { x: nx, y: ny, facing: opp[dir] };
    }
    return null;
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
    const pulse = 1 + Math.sin(this.time * 6) * 0.75;
    const r = 9 + pulse;
    const tipX = cx + Math.cos(ang) * r;
    const tipY = cy + Math.sin(ang) * r;
    // Triangolo pieno orientato verso l'obiettivo.
    const ctx = screen.ctx;
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(ang);
    ctx.fillStyle = "#f4d34a";
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-4, -3);
    ctx.lineTo(-4, 3);
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

    // Imbarco/sbarco automatico sul TRAGHETTO (su acqua) prima di tutto il resto.
    this.syncFerryVehicle();

    // Multiplayer: comunica la nuova posizione agli altri sulla mappa.
    mp.sendMove(pos.x, pos.y, pos.facing);

    // Sanità di prossimità: il Min. Salute fa recuperare 1 PV ogni 6 passi.
    this.stepCount += 1;
    if (this.stepCount % 6 === 0 && hasMinistro(this.state, "salute") && curaPassiva(this.state)) {
      // Feedback leggero: 2 scintille verdi salgono dal player (cura del ministero).
      const px = this.state.pos.x * TILE + 8;
      const py = this.state.pos.y * TILE;
      for (let i = 0; i < 2; i += 1) {
        this.stepSparks.push({
          x: px + (Math.random() - 0.5) * 10,
          y: py + (Math.random() - 0.5) * 6,
          vy: -22 - Math.random() * 14,
          life: 0,
          max: 0.5
        });
      }
    }

    const warp = this.map.warps.find((w) => w.x === pos.x && w.y === pos.y);
    if (warp) {
      if (this.isOutdoorDoorWarp(warp) && !this.enteredDoorFromFront(warp)) {
        pos.x = this.fromX;
        pos.y = this.fromY;
        return;
      }
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
      // Transizione morbida: dissolvenza in uscita, poi carica la mappa nuova
      // (che fa il suo fade-in). Niente più stacco secco a ogni porta/scala.
      audio.confirm();
      this.fadeOut = 0.22;
      this.pendingWarp = () => {
        this.state.pos = { mapId: warp.toMap, x: warp.toX, y: warp.toY, facing: warp.facing };
        this.loadMap(warp.toMap);
      };
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

    // Tregua globale: dopo una qualsiasi interruzione si saltano i PG VAGANTI
    // per qualche passo, così non si accavallano in raffica. Il cooldown frena
    // SOLO trainer/vaganti: l'erba alta non ci passa (ha il suo rate come freno
    // statistico), altrimenti 6 passi morti dopo ogni incontro la renderebbero
    // quasi sterile.
    const onCooldown = this.interruptCooldown > 0;
    if (onCooldown) this.interruptCooldown -= 1;
    if (!onCooldown && this.checkWanderingChallenger()) {
      this.interruptCooldown = 6;
      return;
    }


    const tile = TILES[this.tileAt(pos.x, pos.y)];
    if (tile?.encounter) {
      this.rustles.push({ x: pos.x, y: pos.y, t: 0.4 });
      const baseRate = this.map.encounterRate ?? 0.18;
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
            let level = entry.minLv + Math.floor(Math.random() * (entry.maxLv - entry.minLv + 1));
            // Modificatore d'incontro (~22%): rompe la monotonia dei selvatici.
            // A SONDAGGI alti compaiono più "VIP" (tosti); a SONDAGGI bassi più
            // astensionisti deboli. Un annuncio dà colore al momento.
            const mod = this.rollEncounterFlavor();
            if (mod) {
              level = Math.max(2, level + mod.dLevel);
              this.say([mod.line], () => this.startWildBattle(entry.speciesId, level));
            } else {
              this.startWildBattle(entry.speciesId, level);
            }
            return;
          }
        }
      }
    }
  }

  // ---- Update ----

  // Avvia l'animazione di cura sull'intero party: snapshot HP, scintille,
  // velo verde, anelli e barre che si riempiono a vista. La cura dei DATI è
  // immediata (sotto il velo); a fine effetto scatta `done`. Riusato da BAR
  // SPORT, risveglio post-KO e raccomandazione mafia.
  private playHealFx(done: () => void): void {
    this.healSnapshot = this.state.party.map((m) => ({
      mon: m, from: m.hp, to: statsOf(m).hp, disp: m.hp
    }));
    this.healFx = 1.6;
    this.afterHeal = done;
    audio.heal();
    this.spawnHealSparks(18);
    for (const mon of this.state.party) {
      healMonster(mon);
    }
  }

  private spawnHealSparks(n: number): void {
    const colors = ["#7ad858", "#bdf0a0", "#fff6c8"];
    for (let i = 0; i < n; i += 1) {
      this.healSparks.push({
        x: VIEW_W / 2 + (Math.random() - 0.5) * 28,
        y: VIEW_H / 2 + 6 + (Math.random() - 0.5) * 18,
        vx: (Math.random() - 0.5) * 24,
        vy: -30 - Math.random() * 40, // salgono verso l'alto
        life: 0,
        max: 0.7 + Math.random() * 0.6,
        color: colors[i % colors.length]
      });
    }
  }

  private updateHealSparks(dt: number): void {
    for (const s of this.healSparks) {
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 18 * dt; // gravità lieve: rallentano salendo
    }
    this.healSparks = this.healSparks.filter((s) => s.life < s.max);
  }

  // Mostra un banner "evento" (traguardo, breaking news) con entrata a molla.
  private showBanner(text: string, sub: string, color: string): void {
    this.banner = { text, sub, t: 0, color };
    this.bannerFlash = 0.4;
  }

  update(dt: number): void {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.fadeT = Math.max(0, this.fadeT - dt);
    this.bannerFlash = Math.max(0, this.bannerFlash - dt);
    this.sondPulse = Math.max(0, this.sondPulse - dt);
    // Scintille cura passiva: salgono e svaniscono (sempre, non bloccano nulla).
    for (const s of this.stepSparks) {
      s.life += dt;
      s.y += s.vy * dt;
    }
    this.stepSparks = this.stepSparks.filter((s) => s.life < s.max);
    if (this.banner) {
      this.banner.t += dt;
    }
    if (this.sondDelta) {
      this.sondDelta.t -= dt;
      if (this.sondDelta.t <= 0) {
        this.sondDelta = null;
      }
    }
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

    // Sondaggi: il valore mostrato insegue quello reale (barra che ticchetta).
    // Al primo giro si allinea senza animare; poi un cambio fa flash + delta.
    if (this.displaySondaggi < 0) {
      this.displaySondaggi = this.state.sondaggi;
    } else if (Math.round(this.displaySondaggi) !== this.state.sondaggi) {
      const diff = this.state.sondaggi - Math.round(this.displaySondaggi);
      // Segnala il delta solo se non c'è già un tooltip in corso (evita spam).
      if (!this.sondDelta || this.sondPulse <= 0) {
        this.sondDelta = { text: `${diff > 0 ? "+" : ""}${diff}`, t: 1.4, up: diff > 0 };
        this.sondPulse = 0.5;
      }
      this.displaySondaggi = approachWorld(this.displaySondaggi, this.state.sondaggi, dt * 28);
    }

    // Dissolvenza d'uscita prima di un warp: a nero completo esegue il cambio
    // mappa. Blocca l'input nel frattempo (come encounterFlash).
    if (this.fadeOut > 0) {
      this.fadeOut = Math.max(0, this.fadeOut - dt);
      if (this.fadeOut === 0 && this.pendingWarp) {
        const w = this.pendingWarp;
        this.pendingWarp = null;
        w();
      }
      return;
    }

    // Animazione di cura: blocca movimento/input finché finisce (come encounterFlash).
    if (this.healFx > 0) {
      this.healFx = Math.max(0, this.healFx - dt);
      this.updateHealSparks(dt);
      for (const s of this.healSnapshot) {
        s.disp = approachWorld(s.disp, s.to, dt * 60);
      }
      if (this.healFx === 0 && this.afterHeal) {
        const f = this.afterHeal;
        this.afterHeal = null;
        this.healSnapshot = [];
        this.healSparks = [];
        f();
      }
      return;
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
        // Banner dorato + fanfara di "evento" (non più il jingle riciclato della
        // cattura): un traguardo si DEVE sentire come un traguardo.
        audio.victory();
        this.showBanner("TRAGUARDO SBLOCCATO!", fresh[0].name, "#e8c84a");
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
      // Confine gated da medaglie: ogni palestra apre la regione successiva.
      if (edge.requiresBadges && this.state.badges.length < edge.requiresBadges) {
        this.say(edge.lockedLines ?? ["La strada è ancora chiusa."]);
        return;
      }
      const target = MAPS[edge.toMap];
      this.state.pos = {
        mapId: edge.toMap, x: nx + edge.offsetX, y: target.tiles.length - 1, facing
      };
      this.loadMap(edge.toMap);
      return;
    }
    if (ny >= mapH && this.map.edges?.south) {
      const edge = this.map.edges.south;
      if (edge.requiresBadges && this.state.badges.length < edge.requiresBadges) {
        this.say(edge.lockedLines ?? ["La strada è ancora chiusa."]);
        return;
      }
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
        // EDIFICI: se questo tile è un tetto/facciata di un edificio col
        // building-PNG pronto, disegno solo il terreno base qui (l'edificio intero
        // è disegnato in un secondo passo, scalato sulla footprint, così copre
        // tetto+muro+porta senza overflow). Se il PNG non è pronto, ricade sui
        // pixmap (tetto/muro/porta normali, rami sotto).
        const coveringRoof = this.buildingCovering(tx, ty);
        if (coveringRoof) {
          // Terreno per ancorare l'edificio: erba/sentiero (esterno) o pavimento
          // (interno). Per i tile-facciata usiamo il terreno della cella sopra il
          // tetto così la base resta coerente col contorno.
          const baseCh2 = this.map.outdoor ? "." : "p";
          if (this.map.outdoor) {
            const bImg = this.tilePng(baseCh2);
            if (bImg) screen.imageSprite(bImg, dx, dy);
            else screen.sprite(`tile:${baseCh2}`, TILES[baseCh2].pix, dx, dy);
          } else {
            const bImg = this.tilePng(baseCh2);
            if (bImg) screen.imageSprite(bImg, dx, dy);
            else screen.sprite(`tile:${baseCh2}`, TILES[baseCh2].pix, dx, dy);
          }
          continue;
        }
        if (def.overlay) {
          // Terreno di base sotto l'overlay (PNG se disponibile, altrimenti pixmap).
          const baseCh = this.map.outdoor ? "." : "p";
          const baseImg = this.tilePng(baseCh);
          if (baseImg) {
            screen.imageSprite(baseImg, dx, dy);
          } else {
            screen.sprite(`tile:${baseCh}`, TILES[baseCh].pix, dx, dy);
          }
        }
        if (def.water) {
          const waterImg = this.tilePng(ch);
          if (waterImg) {
            screen.imageSprite(waterImg, dx, dy);
          } else {
            screen.sprite(`tile:w:${waterFrame}`, waterFrames[waterFrame], dx, dy);
          }
        } else if (def.overlay) {
          // Oggetto overlay (albero/segnale/...): PNG 32px ancorato in basso al
          // tile (la chioma sborda verso l'alto), o pixmap di fallback.
          const obj = objectImage(ch);
          if (obj) {
            drawWorldObjectPng(screen, ch, obj, dx, dy);
          } else {
            screen.sprite(`tile:${ch}`, def.pix, dx, dy);
          }
        } else {
          const objImg = objectImage(ch);
          if (objImg) {
            // Tile non-overlay con oggetto PNG (es. erba alta `~`): prima il
            // terreno base (erba/pavimento), poi i ciuffi PNG ancorati in basso.
            const baseCh = this.map.outdoor ? "." : "p";
            const baseImg2 = this.tilePng(baseCh);
            if (baseImg2) {
              screen.imageSprite(baseImg2, dx, dy);
            } else {
              screen.sprite(`tile:${baseCh}`, TILES[baseCh].pix, dx, dy);
            }
            drawWorldObjectPng(screen, ch, objImg, dx, dy);
          } else {
            // Texture PNG PixelLab del terreno (override mappa o default), con
            // fallback alla pixmap testuale.
            const img = this.tilePng(ch);
            if (img) {
              screen.imageSprite(img, dx, dy);
            } else {
              screen.sprite(`tile:${ch}`, def.pix, dx, dy);
            }
          }
        }
      }
    }

    // EDIFICI (secondo passo): disegna il building-PNG sull'angolo ALTO-SX di
    // ogni blocco-tetto, SCALATO sulla footprint reale (tetto + righe facciata).
    // Così un PNG 64x48 nativo copre esattamente un blocco 4x3 in tile, e un
    // 96x48 un blocco 6x3, qualunque mappa — niente overflow né tagli. Il PNG si
    // ancora in alto-sx e si stira/comprime per combaciare con l'impronta ASCII.
    // Disegnato in un range esteso a sinistra/sopra così gli edifici a cavallo
    // del bordo schermo entrano comunque.
    // Z-ORDER per profondità: edifici, NPC, remoti e player vengono raccolti in
    // una lista con la loro Y di base (bordo inferiore in px-mondo) e disegnati
    // ordinati per Y crescente. Così chi è più in ALTO (Y minore) finisce DIETRO
    // (es. il player dietro la casa quando è sopra di essa), risolvendo il
    // "personaggio sopra il tetto". Gli edifici senza building-PNG restano gestiti
    // dal 1° passo (pixmap) e quindi sotto, come prima.
    const tall: Array<{ baseY: number; draw: () => void }> = [];

    for (let ty = y0 - 4; ty <= y0 + Math.ceil(VIEW_H / TILE) + 1; ty += 1) {
      for (let tx = x0 - 10; tx <= x0 + Math.ceil(VIEW_W / TILE); tx += 1) {
        const ch = this.tileAt(tx, ty);
        if (!isRoof(ch)) {
          continue;
        }
        // È l'angolo alto-sx del blocco? (gruppo PNG, non char: e/Q, y/B/x)
        const groupKey = buildingKey(ch);
        if (buildingKey(this.tileAt(tx - 1, ty)) === groupKey || buildingKey(this.tileAt(tx, ty - 1)) === groupKey) {
          continue;
        }
        const fp = this.buildingFootprint(tx, ty, ch);
        const build = buildingImage(ch, fp);
        if (!build) {
          continue;
        }
        const dx = tx * TILE - camX;
        const dy = ty * TILE - camY;
        const dw = fp.w * TILE;
        const dh = fp.h * TILE;
        const bImg = build;
        const rawCanvas = buildingDoorOffset(ch) != null;
        const bBounds = rawCanvas ? null : screen.imageBounds(build);
        const bScaleX = dw / (rawCanvas ? bImg.width : bBounds!.w);
        const bScaleY = dh / (rawCanvas ? bImg.height : bBounds!.h);
        // baseY = bordo inferiore dell'edificio in px-mondo.
        const baseYb = (ty + fp.h) * TILE;
        tall.push({
          baseY: baseYb,
          draw: () => rawCanvas
            ? screen.imageSprite(bImg, dx, dy, { scaleX: bScaleX, scaleY: bScaleY })
            : screen.imageSpriteCropped(bImg, dx, dy, { scaleX: bScaleX, scaleY: bScaleY })
        });
      }
    }

    for (const pickup of this.map.pickups) {
      if (this.state.pickedItems.includes(pickup.id) || pickup.hidden) {
        continue; // i tesori nascosti non si disegnano: vanno scovati esaminando
      }
      drawBallot(screen, pickup.x * TILE - camX, pickup.y * TILE - camY);
    }

    if (this.map.id === "lab" && !this.state.flags["starter-chosen"]) {
      for (const spot of STARTER_SPOTS) {
        drawBallot(screen, spot.x * TILE - camX, spot.y * TILE - camY);
      }
    }

    for (const npc of this.visibleNpcs()) {
      // Frame di camminata mentre l'NPC fa un passo (altrimenti fermo).
      const walkFrame = npc.stepFrom ? (Math.floor(this.time * 6) % 2 === 0 ? 1 : 0) : 0;
      const sprite = charSprite(npc.pal, npc.currentFacing, walkFrame);
      const nx = Math.round(npc.dispX) - camX;
      const ny = Math.round(npc.dispY) - camY - 1;
      // PNG PixelLab dell'NPC (4 dir, scalato ai 16px, ancorato in basso) se
      // l'archetipo è migrato, altrimenti il pixmap parametrico. Frame walk
      // mentre l'NPC fa un passo (stepFrom), così non scivola.
      const npcMoving = Boolean(npc.stepFrom);
      const npcWalkCycle = npcMoving ? Math.floor(this.time * 8) % 4 : 0;
      const npcImg = npcImage(npc.pal, npc.currentFacing, npcWalkCycle, npcMoving);
      const exclaim = this.exclaimNpc === npc;
      tall.push({
        baseY: npc.dispY + TILE,
        draw: () => {
          if (npcImg) {
            const nb = screen.imageBounds(npcImg);
            const ns = 22 / nb.h;
            const dw = nb.w * ns;
            screen.imageSpriteCropped(npcImg, nx + 8 - dw / 2, ny + 16 - nb.h * ns, { scaleX: ns, scaleY: ns });
          } else {
            screen.sprite(sprite.key, sprite.pix, nx, ny, { flipX: sprite.flip });
          }
          if (exclaim) {
            screen.panel(nx + 2, ny - 13, 12, 13);
            screen.text("!", nx + 5, ny - 10, INK);
          }
        }
      });
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
      // Avatar remoto: stesso PNG del player (4 viste + walk) per coerenza con
      // il resto del mondo; il nickname sopra la testa li distingue. Fallback al
      // pixmap parametrico colorato se i PNG non sono pronti.
      const rWalk = r.moving ? Math.floor(this.time * 8) % 4 : 0;
      const rImg = playerImage(r.facing, rWalk, r.moving);
      const rEmote = r.emote;
      const rNick = r.nick.slice(0, 10);
      tall.push({
        baseY: r.dispY + TILE,
        draw: () => {
          if (rImg) {
            const rb = screen.imageBounds(rImg);
            const rs = 22 / rb.h;
            const rdw = rb.w * rs;
            screen.imageSpriteCropped(rImg, sx + 8 - rdw / 2, sy + 15 - rb.h * rs, { scaleX: rs, scaleY: rs });
          } else {
            screen.sprite(sprite.key, sprite.pix, sx, sy, { flipX: sprite.flip });
          }
          // Targhetta col nickname sopra la testa.
          const w = rNick.length * 6 + 4;
          screen.rect(sx + 8 - w / 2, sy - 9, w, 8, "rgba(16,20,31,0.8)");
          screen.text(rNick, sx + 8 - w / 2 + 2, sy - 8, "#9cd8e8");
          // Bolla emote.
          if (rEmote) {
            screen.panel(sx + 6, sy - 22, 16, 13);
            screen.text(rEmote.slice(0, 1), sx + 10, sy - 19, INK);
          }
        }
      });
    }

    const frame = this.moving ? (Math.floor(this.moveT * 2) % 2 === 0 ? 1 : 0) : 0;
    const playerSprite = charSprite("player", pos.facing, frame);
    const baseX = Math.round(playerPx) - camX;
    const baseY = Math.round(playerPy) - camY - 2;
    // Se sei su un veicolo, lo disegniamo SOTTO e ti alziamo "in sella":
    // così si vede chiaramente che ci sei sopra.
    const vehicle = this.state.vehicle as VehicleId | null;
    // Disegna il player: PNG PixelLab (4 dir native, scalato ai 16px del mondo,
    // ancorato in basso) se pronto, altrimenti il pixmap con flip.
    // Frame di camminata: alterna i fotogrammi walk mentre il player si muove,
    // così non "scivola". `walkCycle` è un indice 0..3 derivato dal tempo di passo.
    const walkCycle = this.moving ? Math.floor(this.moveT * 8) % 4 : 0;
    const playerImg = playerImage(pos.facing, walkCycle, this.moving);
    const drawPlayer = (px: number, py: number): void => {
      if (playerImg) {
        const pb = screen.imageBounds(playerImg);
        const ps = 22 / pb.h; // altezza visibile target ~22px
        const dw = pb.w * ps;
        // Centra sul riquadro 16px e ancora i piedi a py+16.
        screen.imageSpriteCropped(playerImg, px + 8 - dw / 2, py + 16 - pb.h * ps, { scaleX: ps, scaleY: ps });
      } else {
        screen.sprite(playerSprite.key, playerSprite.pix, px, py, { flipX: playerSprite.flip });
      }
    };
    const drawPlayerAndVehicle = (): void => {
      if (vehicle === "traghetto") {
        // TRAGHETTO: scafo che ondeggia, al timone il CAPITANO SCHETTINO (satira),
        // e il giocatore a bordo. Lo scafo si vede su acqua e a terra (è il mezzo).
        const bob = this.moving ? (frame === 0 ? 0 : 1) : (Math.floor(this.time * 2) % 2);
        const ferryImg = ferryImage();
        if (ferryImg) {
          const fb = screen.imageBounds(ferryImg);
          screen.imageSpriteCropped(ferryImg, baseX + 8 - fb.w / 2, baseY + 12 + bob - fb.h / 2);
        }
        // Schettino al timone (PNG PixelLab).
        const schImg = sceneImage("char:schettino", "chars/schettino.png");
        if (schImg) {
          const sb = screen.imageBounds(schImg);
          const ss = 18 / sb.h;
          screen.imageSpriteCropped(schImg, baseX + 10 - (sb.w * ss) / 2, baseY - 2 + bob, { scaleX: ss, scaleY: ss });
        }
        drawPlayer(baseX - 4, baseY + bob);
      } else if (vehicle) {
        // Sobbalzo del mezzo in movimento (vibra un pelo, fa "motore").
        const motor = vehicle === "ruspa" || vehicle === "auto";
        const jitter = this.moving && motor ? (frame === 0 ? 0 : 1) : 0;
        const vehImg = vehicleImage(vehicle, pos.facing);
        if (vehImg) {
          // Mezzi CHIUSI (auto, ruspa): vista dall'alto, il player è DENTRO →
          // si disegna solo il veicolo (più grande, riempie la cella). I mezzi
          // APERTI (monopattino): il player sta SOPRA, visibile in sella.
          const enclosed = vehicle === "auto" || vehicle === "ruspa";
          // Scala sul lato MAGGIORE così le viste laterali (east/west, più larghe
          // che alte) non si deformano né sbordano. Target più grande dei 26px
          // precedenti: il mezzo deve "riempire" la cella ed essere chiaramente
          // più grosso di un pedone (l'utente lo voleva ben visibile).
          const target = enclosed ? 30 : 24;
          const vb = screen.imageBounds(vehImg);
          const vs = target / Math.max(vb.w, vb.h);
          const vw = vb.w * vs;
          const vh = vb.h * vs;
          if (enclosed) {
            // Solo l'auto/ruspa, centrata sulla cella, ancorata in basso.
            screen.imageSpriteCropped(vehImg, baseX + 8 - vw / 2, baseY + 16 - vh + jitter, { scaleX: vs, scaleY: vs });
          } else {
            // Monopattino sotto, player in sella sopra.
            screen.imageSpriteCropped(vehImg, baseX + 8 - vw / 2, baseY + 16 - vh + jitter, { scaleX: vs, scaleY: vs });
            drawPlayer(baseX, baseY - 5 + jitter);
          }
        } else {
          const veh = vehicleSprite(vehicle, pos.facing);
          const lift = vehicle === "ruspa" ? 6 : vehicle === "auto" ? 7 : 4;
          screen.sprite(veh.key, veh.pix, baseX, baseY + jitter, { flipX: veh.flip });
          drawPlayer(baseX, baseY - lift + jitter);
        }
      } else {
        drawPlayer(baseX, baseY);
      }
    };
    // Il player entra nello z-order: baseY = piedi in px-mondo.
    tall.push({ baseY: playerPy + TILE, draw: drawPlayerAndVehicle });

    // Disegna tutti gli oggetti "alti" ordinati per Y (chi è più in alto va dietro).
    tall.sort((a, b) => a.baseY - b.baseY);
    for (const e of tall) {
      e.draw();
    }

    // Scintille della cura passiva (Min. Salute): in coordinate-mondo.
    for (const s of this.stepSparks) {
      const a = 1 - s.life / s.max;
      if (a <= 0) {
        continue;
      }
      const col = a > 0.5 ? "#bdf0a0" : "#7ad858";
      screen.rect(Math.round(s.x - camX), Math.round(s.y - camY), 2, 2, col);
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
      // Valore mostrato: insegue quello reale (barra che ticchetta, non salta).
      const shown = this.displaySondaggi < 0 ? sond : Math.round(this.displaySondaggi);
      const col = sondaggiColor(sond);
      const panelW = 80;
      const px = VIEW_W - panelW - 2;
      // Flash colore sulla cornice quando il consenso cambia (verde su / rosso giù).
      const pulse = this.sondPulse > 0 && Math.floor(this.sondPulse * 16) % 2 === 0;
      const bg = pulse
        ? (this.sondDelta?.up ? "rgba(122,216,88,0.85)" : "rgba(208,72,72,0.85)")
        : "rgba(16,20,31,0.92)";
      screen.rect(px, 2, panelW, 22, bg);
      screen.text(`SOND ${shown}%`, px + 4, 4, col);
      // Barra di riempimento (segue il valore animato).
      const barW = panelW - 8;
      screen.rect(px + 4, 12, barW, 4, "rgba(255,255,255,0.15)");
      screen.rect(px + 4, 12, Math.max(1, Math.round((barW * shown) / 100)), 4, col);
      // Etichetta del momento (PLEBISCITO, OPPOSIZIONE, ...): troncata se serve.
      screen.text(clipHud(sondaggiLabelShort(sond), 13), px + 4, 17, "#cfe6ff");
      // Delta flottante (+8 / -2) che sale e svanisce accanto alla barra.
      if (this.sondDelta) {
        const dy = Math.round(6 - (1.4 - this.sondDelta.t) * 8);
        screen.text(this.sondDelta.text, px - 18, dy, this.sondDelta.up ? "#7ad858" : "#d04848");
      }
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
      screen.text(clipHud(this.askLabel, 37), 10, VIEW_H - 46, INK);
      // Pannello largo abbastanza da NON troncare "STRETTO DI MESSINA" (prima
      // era 96px → "STRETTO DI ..."); auto-largo sul label più lungo, clampato.
      const w = Math.min(VIEW_W - 8, Math.max(96, this.transportMenu.measureWidth() + 8));
      this.transportMenu.draw(screen, VIEW_W - 4 - w, VIEW_H - 58 - this.transportMenu.measureHeight(), w);
    }

    if (this.askMenu) {
      screen.panel(0, VIEW_H - 44, VIEW_W, 44);
      screen.text(clipHud(this.askLabel, 37), 10, VIEW_H - 32, INK);
      this.askMenu.draw(screen, VIEW_W - 64, VIEW_H - 44 - this.askMenu.measureHeight(), 56);
    }

    this.msg.draw(screen);

    if (this.encounterFlash > 0) {
      const phase = Math.floor(this.encounterFlash * 12) % 2;
      if (phase === 0) {
        screen.dim(0.85);
      }
    }

    if (
      !quest &&
      !this.msg.isOpen &&
      !this.askMenu &&
      !this.transportMenu &&
      this.state.party.length === 0 &&
      this.map.id === "borgo"
    ) {
      screen.text("Vai al laboratorio col tetto BLU!", 8, VIEW_H - 26, GREY);
    }

    // Dissolvenza d'ingresso nella nuova mappa (più dolce dei cambi secchi).
    if (this.fadeT > 0) {
      screen.dim(this.fadeT / 0.35 * 0.9);
    }
    // Dissolvenza d'uscita prima del warp: oscura crescente fino al nero.
    if (this.fadeOut > 0) {
      screen.dim((1 - this.fadeOut / 0.22) * 0.95);
    }

    // Effetto di cura sopra tutto (velo verde, anelli, scintille, barre HP).
    if (this.healFx > 0) {
      this.drawHealOverlay(screen);
    }

    // Banner "evento" (traguardo, breaking news) sopra tutto.
    if (this.banner) {
      this.drawBanner(screen);
    }
  }

  private drawHealOverlay(screen: Screen): void {
    const ctx = screen.ctx;
    const prog = this.healFx / 1.6; // 1 -> 0 mentre l'effetto svanisce
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2 + 6;

    // 1) Velo verde che si accende e svanisce.
    ctx.fillStyle = `rgba(122,216,88,${0.26 * prog})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // 2) Anelli curativi che si stringono verso il centro.
    ctx.save();
    ctx.globalAlpha = 0.55 * prog;
    ctx.strokeStyle = "#9aff7a";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      const r = 8 + ((1 - prog) * 18 + i * 9) % 30;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 3) Scintille verdi/bianche che salgono.
    for (const s of this.healSparks) {
      const a = 1 - s.life / s.max;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
    }
    ctx.globalAlpha = 1;

    // 4) Pannello party: ritratti + barre HP dedicate. Non usa drawHpBar:
    // quella utility stampa "PV" a sinistra e qui finiva sopra i ritratti.
    const rows = this.healSnapshot.length;
    if (rows > 0) {
      const panelX = 8;
      const panelW = 224;
      const rowH = 15;
      const panelH = 18 + rows * rowH;
      const py = VIEW_H - panelH - 4;
      screen.panel(panelX, py, panelW, panelH);
      screen.text("PV RECUPERATI", panelX + 8, py + 5, INK);
      for (let i = 0; i < rows; i += 1) {
        const s = this.healSnapshot[i];
        const ry = py + 17 + i * rowH;
        drawMonsterSprite(screen, s.mon.speciesId, MONSTER_ART[s.mon.speciesId], panelX + 8, ry - 1, 14, 13);
        this.drawHealHpRow(screen, panelX + 27, ry + 3, 122, s.disp, s.to);
        screen.textRight(`${Math.round(s.disp)}/${s.to}`, panelX + panelW - 24, ry + 2, INK);
      }
    }
  }

  private drawHealHpRow(screen: Screen, x: number, y: number, width: number, current: number, max: number): void {
    const ratio = Math.max(0, Math.min(1, current / Math.max(1, max)));
    const fillW = Math.round((width - 4) * ratio);
    const color = ratio > 0.5 ? "#48b848" : ratio > 0.2 ? "#d8b838" : "#d04848";
    screen.frame(x, y, width, 8, INK);
    screen.rect(x + 2, y + 2, width - 4, 4, "#d8d8c8");
    if (fillW > 0) {
      screen.rect(x + 2, y + 2, fillW, 4, color);
    }
    screen.rect(x + 2, y + 6, width - 4, 1, "rgba(0,0,0,0.22)");
  }

  private drawBanner(screen: Screen): void {
    const b = this.banner;
    if (!b) {
      return;
    }
    // Flash schermo all'apparizione.
    if (this.bannerFlash > 0) {
      const ctx = screen.ctx;
      ctx.fillStyle = `rgba(255,240,180,${0.5 * (this.bannerFlash / 0.4)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // Entrata a molla: toast compatto sotto l'HUD, non un cartellone sopra la mappa.
    const dur = 2.4;
    const t = b.t;
    let y: number;
    if (t < 0.3) {
      const p = t / 0.3;
      y = -22 + 50 * p; // entra fino a y=28 con leggero overshoot
    } else if (t > dur - 0.3) {
      const p = (t - (dur - 0.3)) / 0.3;
      y = 26 - 48 * p; // esce verso l'alto
    } else {
      y = 26 - Math.sin((t - 0.3) * 6) * 1; // oscilla appena
    }
    const w = 156;
    const x = Math.round((VIEW_W - w) / 2);
    screen.rect(x, Math.round(y), w, 18, "rgba(16,20,31,0.94)");
    screen.rect(x, Math.round(y), w, 2, b.color);
    screen.rect(x, Math.round(y) + 16, w, 2, b.color);
    screen.textCenter(clipHud(b.text, 24), VIEW_W / 2, Math.round(y) + 3, b.color);
    screen.textCenter(clipHud(b.sub, 22), VIEW_W / 2, Math.round(y) + 10, "#cfe6ff");
    if (t > dur) {
      this.banner = null;
    }
  }
}
