import { namedCatalog } from "./catalog";
import { roster } from "./roster";
import type { PolType } from "./poltypes";

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spc: number;
  spd: number;
}

// Regola di evoluzione: per livello, per oggetto, o ramificata sui SONDAGGI.
// La prima regola soddisfatta vince: l'ordine nell'array conta.
export interface EvolutionRule {
  id: string;
  level?: number; // si attiva al level-up una volta raggiunto questo livello
  item?: string; // si attiva usando l'oggetto indicato dalla borsa
  trade?: boolean; // si attiva ricevendo il mostro in uno SCAMBIO online ("cambio di casacca")
  minSondaggi?: number; // richiede gradimento >= soglia (ramo "governista")
  maxSondaggi?: number; // richiede gradimento <= soglia (ramo "opposizione")
}

export interface Species {
  id: string;
  dexNum: number;
  name: string;
  category: string; // es. "POLITICMON FIAMMA"
  types: PolType[];
  base: BaseStats;
  // Override raro per ruoli con counter speciale esplicito. Le specie legacy
  // continuano a usare DEF contro entrambe le categorie.
  specialDefense?: number;
  catchRate: number; // 0-255, più alto = più facile
  expYield: number;
  learnset: Array<[number, string]>; // [livello, moveId]
  evolutions?: EvolutionRule[];
  ability?: string; // id in ABILITIES (abilities.ts): effetto passivo fisso della specie
  dexLine: string;
}

export const SPECIES: Record<string, Species> = namedCatalog<Omit<Species, "name">>(roster.species);

export const DEX_ORDER: string[] = Object.values(SPECIES)
  .sort((a, b) => a.dexNum - b.dexNum)
  .map((s) => s.id);

export const STARTERS = ["giorgetta", "ellyna", "renzino"] as const;

// Lo starter del rivale è quello forte contro la tua scelta.
export const RIVAL_COUNTER: Record<string, string> = {
  giorgetta: "renzino", // CENTRO batte DESTRA
  ellyna: "giorgetta", // DESTRA batte SINISTRA
  renzino: "ellyna" // SINISTRA batte CENTRO
};
