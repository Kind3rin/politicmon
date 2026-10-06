import type { Facing } from "../../art/characters";
import type { FeatureId } from "../../game/features";
import type { SlotId } from "../../game/palinsesto";

export interface NpcDef {
  spriteSet?: string; // optional directional appearance, independent of gameplay role
  id: string;
  dialogueName?: string; // Speaker label, independent of floating world signs.
  pal: string;
  x: number;
  y: number;
  facing: Facing;
  lines?: string[];
  trainerId?: string;
  sightRange?: number;
  /** Route trainers: stepping into this line of sight (tiles, along their facing) offers a duel. The player can say "not now"; nobody is ambushed. */
  inviteRange?: number;
  healer?: boolean;
  shop?: boolean;
  casino?: boolean;
  box?: boolean; // COMPUTER DI PARTITO: apre il box (CIRCOLO DI PARTITO)
  mafia?: boolean;
  transport?: boolean;
  pump?: boolean; // BENZINAIO: vende carburante a prezzo del giorno
  gift?: { itemId: string; qty: number; flag: string; lines: string[] };
  vehicleGift?: {
    vehicle: "monopattino" | "ruspa" | "auto" | "traghetto";
    flag: string;
    lines: string[];
    requiresBadges?: number; // gating opzionale (es. TRAGHETTO a 3 medaglie)
    lockedLines?: string[];
  };
  legendary?: {
    speciesId: string;
    level: number;
    flag: string;
    lines: string[];
    afterRunLines?: string[];
    afterGoneLines?: string[];
    /** A key item that joins the bag when the legend is recruited (src/game/legends.ts says what it does). */
    relic?: string;
  };
  showIfFlag?: string;
  hideIfFlag?: string;
  /** Only about during these slots of the schedule (and only once the schedule is open). */
  slots?: readonly SlotId[];
  setFlag?: string; // flag impostato quando ci parli (per le quest "hai parlato con...")
  wander?: boolean; // se true, l'NPC cammina attorno alla sua posizione iniziale
  daily?: boolean; // SFIDA DEL GIORNO: apre la sfida quotidiana (e non vaga mai)
  coppa?: boolean; // BANDITORE della COPPA DELLE POLTRONE (torneo post-garante)
  monument?: boolean; // ARCHITETTO DI CORTE: money-sink MONUMENTO AL CANDIDATO (R42)
  nameplate?: string; // targhetta fluttuante sopra la testa (es. GUIDA "LUCA")
  guide?: { // NPC GUIDA: menù di domande a scelta invece del dialogo lineare
    intro: string[]; // battute di apertura (mostrate una volta a interazione)
    prompt: string; // etichetta del menù (es. "COSA VUOI SAPERE?")
    topics: { label: string; lines: string[] }[]; // voci + risposte
  };
}

export interface WarpDef {
  x: number;
  y: number;
  toMap: string;
  toX: number;
  toY: number;
  facing: Facing;
  requiresBadges?: number;
  requiresFlag?: string;
  requiresFeature?: FeatureId;
  lockedLines?: string[];
  // Prompt SÌ/NO prima di partire (es. la darsena di ritorno dallo Stretto):
  // evita warp accidentali e rende ESPLICITO che stai lasciando la mappa.
  confirm?: string;
  // Etichetta persistente sopra un imbarco/uscita altrimenti invisibile.
  markerLabel?: string;
}

export interface SignDef {
  x: number;
  y: number;
  lines: string[];
}

// Arredo urbano esaminabile (fontana W, statua Y, panchina U, ...): il char è già
// nei tile della mappa (solido), questo aggiunge SOLO il testo satirico mostrato
// premendo A davanti. Decorativo: nessun effetto di gioco, niente collisioni nuove.
export interface DecorativeDef {
  x: number;
  y: number;
  lines: string[];
}

/** An obstacle that a field power deals with. `tape` is cut for good; a `boulder` is pushed and is back where it was whenever you come in again. */
export interface PowerSpot {
  id: string;
  kind: "tape" | "boulder";
  x: number;
  y: number;
}

export interface PickupDef {
  id: string;
  x: number;
  y: number;
  itemId: string;
  qty: number;
  hidden?: boolean; // tesoro segreto: non disegnato, si trova esaminando il tile
  /** Behind an obstacle that this power deals with: the road never leads here without it. */
  power?: "taglio" | "scalata" | "spallata" | "ponte";
}

export interface EncounterEntry {
  anyVersion?: boolean; // earned chapter recruitment can cross the early split
  speciesId: string;
  weight: number;
  minLv: number;
  maxLv: number;
  requiresFlag?: string;
  /** Only seen in these slots of the schedule (see game/palinsesto.ts); absent means any time. */
  slots?: readonly SlotId[];
}

export interface EdgeDef {
  toMap: string;
  offsetX: number;
  requiresBadges?: number; // medaglie minime per attraversare il confine
  lockedLines?: string[]; // messaggio se la strada è ancora chiusa
}

export interface MapDef {
  id: string;
  name: string;
  tiles: string[];
  outdoor: boolean;
  /** 0..1: how dark it is underground. Without the field lights you see about two tiles around you. */
  dark?: number;
  /** Tape to cut and boulders to push: the places where the field powers matter. */
  spots?: PowerSpot[];
  lamps?: { x: number; y: number }[]; // attached to existing solid posts; no collision change
  groundMaterials?: Record<string, "grass" | "sand" | "path" | "asphalt" | "floor">; // visual only; preserves movement tiles
  scatter?: { kind: string; density: number }[]; // 0..1, decorative only
  weather?: "sereno" | "pioggia" | "nebbia" | "afa";
  warps: WarpDef[];
  npcs: NpcDef[];
  signs: SignDef[];
  pickups: PickupDef[];
  decoratives?: DecorativeDef[]; // arredo urbano esaminabile (fontane/statue/...)
  edges?: { north?: EdgeDef; south?: EdgeDef };
  encounters?: EncounterEntry[];
  encounterRate?: number;
  music?: string; // traccia di audio.playMusic (default "borgo")
  stairStyle?: "carpet"; // scalinate rosse invece che di pietra (le sale)
  zones?: { name: string; x: number; y: number; w: number; h: number }[]; // quartieri/terrazze: il nome compare in alto quando ci entri
  allowWanderers?: boolean; // false nelle aree narrative dove un PG casuale romperebbe il beat
  // Override texture-tile per questa mappa (char -> file PNG in sprites/tiles/).
  // Permette di riusare gli stessi char con look diverso per ambiente (es. la
  // GROTTA: pavimento `p` -> roccia, muro `A` -> roccia scura). Non tocca la
  // logica di collisione (resta quella di TILES[ch]).
  tileOverrides?: Record<string, string>;
  buildingOverrides?: Record<string, string>; // roof family -> complete footprint PNG
  objectOverrides?: Record<string, string>; // overlay char -> anchored prop PNG
  objectSizes?: Record<string, number>; // target pixels for a map's own prop
}
