import { MOVES, type Move } from "../../data/moves";
import type { Monster } from "../monster";
import type { GameState } from "../state";
import { makeCombatant } from "./sim";
import { damageRange, switchPreview } from "./tactics";

type Estimate = ReturnType<typeof damageRange>;
export interface PreparationForecast {
  readonly mon: Monster;
  readonly unavailable?: "ko" | "no-pp";
  readonly best?: { move: Move; pp: number; range: Estimate };
  readonly afterDefense?: { move: Move; range: Estimate };
  readonly preparations: { move: Move; pp: number }[];
}

// Pure estimates for a fresh entry, never a promise about a future battle.
export function preparationForecasts(state: GameState, foe: Monster): PreparationForecast[] {
  const boost = foe.moves.map(slot => MOVES[slot.id]).find(move =>
    move.effect?.stat?.target === "self" && move.effect.stat.key === "def" && move.effect.stat.stages > 0);
  return state.party.map(mon => {
    if (mon.hp <= 0) return { mon, unavailable: "ko", preparations: [] };
    const preparations = mon.moves.filter(slot => slot.pp > 0 && MOVES[slot.id].effect?.stat?.target === "self")
      .map(slot => ({ move: MOVES[slot.id], pp: slot.pp }));
    const preview = switchPreview(mon, makeCombatant(foe));
    const attacks = mon.moves.filter(slot => slot.pp > 0 && MOVES[slot.id].power > 0).map(slot => ({
      move: MOVES[slot.id], pp: slot.pp,
      range: damageRange(preview.entrant, preview.opponent, MOVES[slot.id], { sondaggi: state.sondaggi })
    })).sort((a, b) => b.range.min - a.range.min);
    const best = attacks[0];
    if (!best) return { mon, unavailable: "no-pp", preparations };
    let afterDefense: PreparationForecast["afterDefense"];
    if (boost) {
      preview.opponent.stages.def = Math.min(6, preview.opponent.stages.def + boost.effect!.stat!.stages);
      afterDefense = { move: boost, range: damageRange(preview.entrant, preview.opponent, best.move, { sondaggi: state.sondaggi }) };
    }
    return { mon, best, afterDefense, preparations };
  });
}
