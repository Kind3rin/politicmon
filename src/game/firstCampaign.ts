import { SPECIES } from "../data/species";
import type { GameState } from "./state";

export function firstEvolutionDone(state: GameState): boolean {
  return Boolean(state.starterId && SPECIES[state.starterId]?.evolutions?.some(rule => state.dex[rule.id] === "caught"));
}

export function firstRivalReady(state: GameState): boolean {
  return state.party.length + state.boxed.length >= 2 && firstEvolutionDone(state);
}

export const OPENING_QUEST_ORDER = ["starter", "dex", "recruit", "grow", "rival1"];
