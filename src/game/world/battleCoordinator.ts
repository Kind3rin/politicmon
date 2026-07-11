import { MOVES } from "../../data/moves";
import type { TrainerDef } from "../../data/trainers";
import { createMonster, type Monster } from "../monster";
import { hardModeLevelBonus } from "../rematch";
import type { GameState } from "../state";

export interface TrainerTeamOptions {
  fallbackTeam: () => Monster[];
  bossTrainerIds: readonly string[];
}

export type TrainerBattleResult = "win" | "loss" | "caught" | "run";

export function buildTrainerTeam(state: GameState, def: TrainerDef, options: TrainerTeamOptions): Monster[] {
  if (def.team.length === 0) return options.fallbackTeam();
  const noHard = def.id.startsWith("daily:");
  const team = def.team.map(([id, level, moveIds, heldItem]) => {
    const bonus = noHard ? 0 : hardModeLevelBonus(state, level);
    const mon = createMonster(id, Math.min(60, level + bonus));
    if (moveIds?.length) mon.moves = moveIds.map((moveId) => ({ id: moveId, pp: MOVES[moveId].pp }));
    if (heldItem) mon.heldItem = heldItem;
    return mon;
  });
  if (state.hardMode && options.bossTrainerIds.includes(def.id)) {
    const ace = team.reduce((best, mon) => (mon.level > best.level ? mon : best), team[0]);
    if (!ace.heldItem) ace.heldItem = "gilet";
  }
  return team;
}

export function shouldPersistTrainerVictory(trainerId: string, result: TrainerBattleResult): boolean {
  return result === "win" && !["wander:", "daily:", "coppa:"].some((prefix) => trainerId.startsWith(prefix));
}
