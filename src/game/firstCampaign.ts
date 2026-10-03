import { SPECIES } from "../data/species";
import { expForLevel, type Monster } from "./monster";
import type { GameState } from "./state";

export function firstEvolutionDone(state: GameState): boolean {
  return Boolean(state.starterId && SPECIES[state.starterId]?.evolutions?.some(rule => state.dex[rule.id] === "caught"));
}

export function firstRivalReady(state: GameState): boolean {
  return state.party.length + state.boxed.length >= 2 && firstEvolutionDone(state);
}

export const OPENING_QUEST_ORDER = ["starter", "dex", "recruit", "grow", "rival1"];

/** A second ally after rehearsal earns the opening evolution, independent of wild EXP RNG. */
export function openingRecruitmentExp(state: GameState, mon: Monster, gained: number, recruit: boolean): number {
  return recruit && state.flags["opening-v2"] && !state.flags["rival1-beaten"] && state.defeatedTrainers.includes("praticante") && state.runStats.captures >= 1 && mon.speciesId === state.starterId && mon.level < 8
    ? Math.max(gained, expForLevel(8) - mon.exp) : gained;
}
