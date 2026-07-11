import type { Facing } from "../../art/characters";
import type { FeatureId } from "../../game/features";

export interface NpcDef {
  id: string;
  pal: string;
  x: number;
  y: number;
  facing: Facing;
  lines?: string[];
  trainerId?: string;
  sightRange?: number;
  healer?: boolean;
  shop?: boolean;
  casino?: boolean;
  box?: boolean; // COMPUTER DI PARTITO: apre il box (CIRCOLO DI PARTITO)
  mafia?: boolean;
  transport?: boolean;
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
  };
  showIfFlag?: string;
  hideIfFlag?: string;
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

export interface PickupDef {
  id: string;
  x: number;
  y: number;
  itemId: string;
  qty: number;
  hidden?: boolean; // tesoro segreto: non disegnato, si trova esaminando il tile
}

export interface EncounterEntry {
  speciesId: string;
  weight: number;
  minLv: number;
  maxLv: number;
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
  warps: WarpDef[];
  npcs: NpcDef[];
  signs: SignDef[];
  pickups: PickupDef[];
  decoratives?: DecorativeDef[]; // arredo urbano esaminabile (fontane/statue/...)
  edges?: { north?: EdgeDef; south?: EdgeDef };
  encounters?: EncounterEntry[];
  encounterRate?: number;
  music?: string; // traccia di audio.playMusic (default "borgo")
  allowWanderers?: boolean; // false nelle aree narrative dove un PG casuale romperebbe il beat
  // Override texture-tile per questa mappa (char -> file PNG in sprites/tiles/).
  // Permette di riusare gli stessi char con look diverso per ambiente (es. la
  // GROTTA: pavimento `p` -> roccia, muro `A` -> roccia scura). Non tocca la
  // logica di collisione (resta quella di TILES[ch]).
  tileOverrides?: Record<string, string>;
}
