import type { SlotId } from "../../game/palinsesto";
import type { EncounterEntry, MapDef } from "./types";

/**
 * Candidates that only turn up at one hour of the schedule, on top of every map's own table.
 * They are species the game already has, shown earlier or in a place where they were missing:
 * the grass of the first routes gets green and media types, the towns get their night shift.
 * Weights are low on purpose: the point is a reason to come back, not to replace the table.
 */
const slot = (speciesId: string, minLv: number, maxLv: number, weight: number, slots: SlotId[]): EncounterEntry => ({ speciesId, minLv, maxLv, weight, slots });

export const SLOT_ENCOUNTERS: Readonly<Record<string, readonly EncounterEntry[]>> = {
  borgo: [slot("verdolino", 3, 5, 18, ["mattina"])],
  route1: [slot("verdolino", 5, 6, 16, ["mattina"]), slot("mediocrate", 6, 7, 12, ["giorno"]), slot("bojoon", 5, 6, 10, ["notte"])],
  mediopoli: [slot("verdolino", 9, 11, 14, ["mattina"]), slot("zelenskir", 11, 12, 10, ["sera"]), slot("bojoon", 10, 12, 14, ["notte"])],
  antenna: [slot("zelenskir", 11, 12, 10, ["sera"]), slot("muskrat", 11, 12, 10, ["notte"])],
  route2: [slot("zelenskir", 13, 15, 10, ["sera"]), slot("pontigor", 14, 15, 10, ["notte"])],
  eurotown: [slot("muskrat", 14, 15, 10, ["notte"]), slot("mediocrate", 13, 15, 12, ["giorno"])],
  route3: [slot("pontigor", 17, 19, 10, ["notte"])],
  capitale: [slot("pontigor", 17, 18, 10, ["notte"]), slot("macronfox", 16, 18, 10, ["giorno"])]
};

export function applySlotEncounters(maps: Record<string, MapDef>): void {
  for (const [id, entries] of Object.entries(SLOT_ENCOUNTERS)) {
    const map = maps[id];
    if (!map?.encounters) throw new Error(`Slot encounters for ${id}: the map has no encounter table`);
    map.encounters = [...map.encounters, ...entries];
  }
}
