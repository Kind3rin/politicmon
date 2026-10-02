import { MOVES } from "../../data/moves";
import type { TrainerDef } from "../../data/trainers";
import { createMonster, healMonster, type Monster } from "../monster";
import { hardModeLevelBonus } from "../rematch";
import type { GameState } from "../state";
import { advanceMoraleProgress } from "../morale";

export interface TrainerTeamOptions {
  fallbackTeam: () => Monster[];
  bossTrainerIds: readonly string[];
}

export type TrainerBattleResult = "win" | "loss" | "caught" | "run";

export function preparePractice(state: GameState, trainerId: string): boolean {
  if (trainerId !== "praticante" || state.defeatedTrainers.includes(trainerId)) return false;
  state.party.forEach(healMonster);
  return true;
}

export function buildTrainerTeam(state: GameState, def: TrainerDef, options: TrainerTeamOptions): Monster[] {
  if (def.team.length === 0) return options.fallbackTeam();
  // Coppa dossiers show the exact match levels, including the level-50 rule.
  const noHard = def.id.startsWith("daily:") || def.id.startsWith("coppa:");
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

export function recordNewTrainerVictory(state: GameState, trainerId: string, result: TrainerBattleResult): string[] {
  if (!shouldPersistTrainerVictory(trainerId, result) || state.defeatedTrainers.includes(trainerId)) return [];
  state.defeatedTrainers.push(trainerId);
  if (trainerId.startsWith("weekly:")) return [];
  return advanceMoraleProgress(state);
}
