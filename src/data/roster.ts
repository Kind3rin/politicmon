import type { Move } from './moves';
import type { Species } from './species';
import source from './roster.json' with { type: 'json' };

interface RosterData {
  moves: Array<Omit<Move, 'name'> & {name?:string}>;
  species: Array<Omit<Species, 'name'> & {name?:string}>;
}

// The complete editable catalog stays bundled: no additional boot/offline fetch.
// Its semantic identity is verified against the original canonical digest.
export const roster = source as unknown as RosterData;
