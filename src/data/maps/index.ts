import type { MapDef } from "./types";
import { BASE_MAPS } from "./base";
import { POSTGAME_MAPS } from "./postgame";
import { INTERIOR_MAPS } from "./interiors";
import { ATTO3_MAPS } from "./atto3";

export type * from "./types";

function composeMapRegistry(groups: ReadonlyArray<Record<string, MapDef>>): Record<string, MapDef> {
  const registry: Record<string, MapDef> = {};
  for (const group of groups) {
    for (const [key, map] of Object.entries(group)) {
      if (registry[key]) {
        throw new Error(`Duplicate map id: ${key}`);
      }
      if (map.id !== key) {
        throw new Error(`Map registry mismatch: key ${key}, id ${map.id}`);
      }
      registry[key] = map;
    }
  }
  return registry;
}

export const MAPS = composeMapRegistry([BASE_MAPS, POSTGAME_MAPS, INTERIOR_MAPS, ATTO3_MAPS]);

export const BAR_RESPAWN: Record<string, { x: number; y: number }> = {
  borgo: { x: 21, y: 18 },
  mediopoli: { x: 7, y: 16 },
  eurotown: { x: 8, y: 13 },
  capitale: { x: 24, y: 8 },
  stretto: { x: 14, y: 5 },
  offshore: { x: 15, y: 5 },
  bruxelles: { x: 10, y: 12 }
};

// Posizioni delle tre schede starter sul tavolo del laboratorio.

export const STARTER_SPOTS: Array<{ x: number; y: number; speciesId: string }> = [
  { x: 3, y: 3, speciesId: "giorgetta" },
  { x: 5, y: 3, speciesId: "ellyna" },
  { x: 7, y: 3, speciesId: "renzino" }
];
