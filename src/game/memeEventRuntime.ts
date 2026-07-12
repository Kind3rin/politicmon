import type { MemeEffect } from "../data/meme-events/types";
import { addSondaggi } from "./governo";
import type { GameState } from "./state";

export function canApplyMemeEffects(state: GameState, effects: readonly MemeEffect[] | undefined): boolean {
  const moneyDelta = effects?.filter((effect) => effect.kind === "money").reduce((sum, effect) => sum + effect.delta, 0) ?? 0;
  return state.money + moneyDelta >= 0;
}

export function applyMemeEffects(state: GameState, effects: readonly MemeEffect[] | undefined): void {
  for (const effect of effects ?? []) {
    if (effect.kind === "sondaggi") addSondaggi(state, effect.delta);
    else if (effect.kind === "money") state.money = Math.max(0, state.money + effect.delta);
    else if (effect.kind === "flag") state.flags[effect.id] = effect.value;
    else if (effect.kind === "item") state.bag[effect.id] = (state.bag[effect.id] ?? 0) + effect.qty;
    else if (effect.kind === "territory") {
      state.election = {
        ...state.election,
        districts: state.election.districts.map((district) => district.id === effect.id
          ? { ...district, localConsensus: Math.max(0, Math.min(100, district.localConsensus + effect.delta)) }
          : district)
      };
    }
  }
}
