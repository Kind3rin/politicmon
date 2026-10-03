import type { Monster } from "../../game/monster";

/** Keep the same party position visible in choices and their consequences. */
export function companionPosition(mon: Monster, party: readonly Monster[] = []): string {
  const index = party.findIndex(candidate => candidate.uid === mon.uid);
  return index < 0 ? "" : `Compagno ${index + 1} di ${party.length}`;
}

export function companionHint(mon: Monster, party: readonly Monster[], hint: string): string {
  const sentence = hint.charAt(0).toLocaleUpperCase("it") + hint.slice(1);
  return [companionPosition(mon, party), sentence].filter(Boolean).join(". ");
}
