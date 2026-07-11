export const FESTIVAL_SCANDALO_CHANCE = 20;

/** FESTIVAL puo innescare SCANDALO solo quando chi lo usa agisce per primo. */
export function festivalScandaloChance(actedFirst: boolean): number {
  return actedFirst ? FESTIVAL_SCANDALO_CHANCE : 0;
}
