import { speciesOf, type Monster } from "./monster";

// Current form only: an evolution cannot unlock another branch's curriculum.
export function archivedMoves(mon: Monster): string[] {
  return [...new Set(speciesOf(mon).learnset.filter(([level, id]) =>
    level <= mon.level && !mon.moves.some((slot) => slot.id === id)
  ).map(([, id]) => id))];
}
