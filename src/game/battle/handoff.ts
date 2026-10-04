import { speciesOf, type Monster } from "../monster";

/** Passing the baton to a companion that shares a type with the one leaving: it enters motivated. */
export function sharedTypes(outgoing: Monster, incoming: Monster): string[] {
  const left = speciesOf(outgoing).types;
  return speciesOf(incoming).types.filter(type => left.includes(type));
}

export const HANDOFF_STAGES = { atk: 1, spd: 1 } as const;

export function handoffKey(outgoing: Monster, incoming: Monster): string {
  return `${outgoing.uid}>${incoming.uid}`;
}
