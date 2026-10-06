import { SPECIES } from "../data/species";
import type { PolType } from "../data/poltypes";
import type { Monster } from "./monster";
import type { GameState } from "./state";

/**
 * Poteri sul campo: le «MN» di Politicmon.
 * Niente mossa da insegnare né slot sprecato: il potere si sblocca con la storia (medaglie) e lo usa
 * il primo compagno in forze della squadra che ha uno dei tipi giusti. Servono a trovare cose, non a passare:
 * la strada principale non dipende mai da un potere.
 */
export type PowerId = "comizio" | "scappatoia" | "riflettori" | "taglio" | "volo" | "scalata" | "ponte" | "spallata";

export interface PowerDef {
  id: PowerId;
  name: string;
  /** What the context button says when there is something to do in front of you. */
  verb: string;
  /** The type that colours its entrance. */
  type: PolType;
  /** Who can use it: a party member with one of these types, or anybody. */
  users: readonly PolType[] | "any";
  /** Medals needed, and/or a flag. */
  badges?: string;
  flag?: string;
  /** The line under the name when it enters the scene. */
  tagline: string;
  /** What it does, for the list. */
  does: string;
  /** Where in the world it matters, for the list. */
  where: string;
  /** How the player gets it. */
  unlock: string;
}

export const POWERS: Record<PowerId, PowerDef> = {
  comizio: { id: "comizio", name: "COMIZIO", verb: "Comizio", type: "POPULISMO", users: "any", flag: "dex-received",
    tagline: "UN COMIZIO A SORPRESA", does: "Attira un Politicmon selvatico nell'erba alta vicina.", where: "Erba alta: quando cerchi qualcuno da reclutare.", unlock: "Subito, col Politicdex." },
  scappatoia: { id: "scappatoia", name: "DIMISSIONI LAMPO", verb: "Dimettiti", type: "CENTRO", users: ["CENTRO", "ISTITUZIONE", "MEDIA", "DESTRA"], badges: "auditel",
    tagline: "MI DIMETTO. ANZI, GIÀ FATTO", does: "Ti porta fuori dalla grotta o dall'edificio in cui sei, all'ingresso.", where: "Grotte, interni, rovine.", unlock: "Medaglia Auditel." },
  riflettori: { id: "riflettori", name: "RIFLETTORI", verb: "Riflettori", type: "MEDIA", users: ["MEDIA", "TECNO", "POPULISMO"], badges: "auditel",
    tagline: "SI GIRA!", does: "Accende i riflettori: le grotte buie si vedono lontano e i tesori nascosti brillano.", where: "Grotte e luoghi bui.", unlock: "Medaglia Auditel." },
  taglio: { id: "taglio", name: "TAGLIO LINEARE", verb: "Taglia", type: "DESTRA", users: ["DESTRA", "ISTITUZIONE", "TECNO"], badges: "spread",
    tagline: "TUTTO IL RESTO, A META", does: "Taglia i nastri della burocrazia che sbarrano un passaggio.", where: "Nastri rossi e bianchi: nascondigli e scorciatoie.", unlock: "Medaglia Spread." },
  volo: { id: "volo", name: "VOLO DI STATO", verb: "Vola", type: "DESTRA", users: ["DESTRA", "CENTRO", "MEDIA"], badges: "spread",
    tagline: "VOLO BLU, A SPESE DI QUALCUN ALTRO", does: "Ti porta in una città già visitata, senza benzina.", where: "Dovunque, fuori da edifici e grotte.", unlock: "Medaglia Spread." },
  scalata: { id: "scalata", name: "SCALATA", verb: "Scala", type: "SINISTRA", users: ["SINISTRA", "POPULISMO", "VERDE"], badges: "spread",
    tagline: "SI SALE DOVE GLI ALTRI SCENDONO", does: "Sali una scarpata che di solito si scende soltanto.", where: "Scarpate: belvedere e scorciatoie.", unlock: "Medaglia Spread." },
  ponte: { id: "ponte", name: "DECRETO PONTE", verb: "Decreto", type: "ISTITUZIONE", users: ["ISTITUZIONE", "TECNO", "VERDE"], badges: "dazio",
    tagline: "COLLAUDO RIMANDATO", does: "Getta un ponte provvisorio sull'acqua stretta davanti a te. Regge finché resti nella mappa.", where: "Canali, fossati e lagune.", unlock: "Medaglia Dazio." },
  spallata: { id: "spallata", name: "SPALLATA", verb: "Spalla", type: "SINISTRA", users: ["SINISTRA", "POPULISMO", "ISTITUZIONE"], badges: "dazio",
    tagline: "UNA SPALLATA ALLA MAGGIORANZA", does: "Sposta di una casella i massi pesanti che bloccano la strada.", where: "Grotte e cantieri: massi.", unlock: "Medaglia Dazio." }
};

export const POWER_ORDER: readonly PowerId[] = ["comizio", "riflettori", "scappatoia", "taglio", "volo", "scalata", "ponte", "spallata"];

export function powerUnlocked(state: GameState, id: PowerId): boolean {
  const power = POWERS[id];
  if (power.badges && !state.badges.includes(power.badges)) return false;
  if (power.flag && !state.flags[power.flag]) return false;
  return true;
}

/** Powers that are open and have not been announced yet. */
export function newPowers(state: GameState): PowerId[] {
  return POWER_ORDER.filter(id => powerUnlocked(state, id) && !state.flags[`power-seen-${id}`]);
}

export function unlockedPowers(state: GameState): PowerId[] {
  return POWER_ORDER.filter(id => powerUnlocked(state, id));
}

/** Everyone in the party who could do it (alive, right type), in party order. */
export function powerUsers(state: GameState, id: PowerId): Monster[] {
  const power = POWERS[id];
  return state.party.filter(mon => mon.hp > 0 && (power.users === "any" || SPECIES[mon.speciesId].types.some(type => (power.users as readonly PolType[]).includes(type))));
}

export type PowerStatus = { kind: "locked"; why: string } | { kind: "nobody"; need: readonly PolType[] } | { kind: "ready"; user: Monster };

export function powerStatus(state: GameState, id: PowerId): PowerStatus {
  if (!powerUnlocked(state, id)) return { kind: "locked", why: POWERS[id].unlock };
  const user = powerUsers(state, id)[0];
  if (!user) return { kind: "nobody", need: POWERS[id].users === "any" ? [] : POWERS[id].users };
  return { kind: "ready", user };
}

/** The power that opens a given kind of obstacle, for the context button. */
export function powerNamed(id: PowerId): string {
  return POWERS[id].name;
}
