import type { GameState } from "./state";

export const RUN_CHECKPOINT_IDS = [
  "starter", "badge-1", "badge-2", "badge-3",
  "palazzo", "garante", "offshore", "bruxelles"
] as const;

export type RunCheckpointId = typeof RUN_CHECKPOINT_IDS[number];

export interface RunCheckpoint {
  playSeconds: number;
  steps: number;
  battles: number;
  averagePartyLevel: number;
}

export interface RunStats {
  playSeconds: number;
  steps: number;
  battles: number;
  wins: number;
  losses: number;
  captures: number;
  runs: number;
  // null = traguardo già raggiunto prima dell'introduzione delle statistiche v14;
  // non inventiamo tempo/livello retroattivi.
  checkpoints: Partial<Record<RunCheckpointId, RunCheckpoint | null>>;
}

export type RecordedBattleResult = "win" | "loss" | "caught" | "run";

export function newRunStats(): RunStats {
  return {
    playSeconds: 0,
    steps: 0,
    battles: 0,
    wins: 0,
    losses: 0,
    captures: 0,
    runs: 0,
    checkpoints: {}
  };
}

function finiteNonNegative(value: unknown, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const safe = Math.max(0, value);
  return integer ? Math.floor(safe) : safe;
}

function normalizeCheckpoint(value: unknown): RunCheckpoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Partial<RunCheckpoint>;
  return {
    playSeconds: finiteNonNegative(raw.playSeconds),
    steps: finiteNonNegative(raw.steps, true),
    battles: finiteNonNegative(raw.battles, true),
    averagePartyLevel: finiteNonNegative(raw.averagePartyLevel)
  };
}

export function normalizeRunStats(value: unknown): RunStats {
  if (!value || typeof value !== "object" || Array.isArray(value)) return newRunStats();
  const raw = value as Partial<RunStats>;
  const checkpoints: RunStats["checkpoints"] = {};
  if (raw.checkpoints && typeof raw.checkpoints === "object" && !Array.isArray(raw.checkpoints)) {
    for (const id of RUN_CHECKPOINT_IDS) {
      const source = raw.checkpoints[id];
      if (source === null) checkpoints[id] = null;
      else {
        const checkpoint = normalizeCheckpoint(source);
        if (checkpoint) checkpoints[id] = checkpoint;
      }
    }
  }
  return {
    playSeconds: finiteNonNegative(raw.playSeconds),
    steps: finiteNonNegative(raw.steps, true),
    battles: finiteNonNegative(raw.battles, true),
    wins: finiteNonNegative(raw.wins, true),
    losses: finiteNonNegative(raw.losses, true),
    captures: finiteNonNegative(raw.captures, true),
    runs: finiteNonNegative(raw.runs, true),
    checkpoints
  };
}

export function tickRunStats(state: GameState, dt: number, active: boolean): void {
  if (!active || !Number.isFinite(dt) || dt <= 0) return;
  state.runStats.playSeconds += Math.min(dt, 0.1);
}

export function recordRunStep(state: GameState): void {
  state.runStats.steps += 1;
}

export function recordBattleStarted(state: GameState): void {
  state.runStats.battles += 1;
}

export function recordBattleResult(state: GameState, result: RecordedBattleResult): void {
  if (result === "win") state.runStats.wins += 1;
  else if (result === "loss") state.runStats.losses += 1;
  else if (result === "caught") state.runStats.captures += 1;
  else state.runStats.runs += 1;
}

function averagePartyLevel(state: GameState): number {
  if (state.party.length === 0) return 0;
  const total = state.party.reduce((sum, mon) => sum + mon.level, 0);
  return Math.round((total / state.party.length) * 10) / 10;
}

function recordCheckpoint(state: GameState, id: RunCheckpointId): void {
  if (id in state.runStats.checkpoints) return;
  state.runStats.checkpoints[id] = {
    playSeconds: state.runStats.playSeconds,
    steps: state.runStats.steps,
    battles: state.runStats.battles,
    averagePartyLevel: averagePartyLevel(state)
  };
}

function reachedCheckpointIds(state: GameState): RunCheckpointId[] {
  const reached: RunCheckpointId[] = [];
  if (state.flags["starter-chosen"]) reached.push("starter");
  if (state.badges.length >= 1) reached.push("badge-1");
  if (state.badges.length >= 2) reached.push("badge-2");
  if (state.badges.length >= 3) reached.push("badge-3");
  if (state.flags["boss-beaten"]) reached.push("palazzo");
  if (state.flags["garante-beaten"]) reached.push("garante");
  if (state.flags["offshore-beaten"]) reached.push("offshore");
  if (state.flags["ue-beaten"]) reached.push("bruxelles");
  return reached;
}

export function markHistoricalCheckpoints(state: GameState): void {
  for (const id of reachedCheckpointIds(state)) {
    state.runStats.checkpoints[id] = null;
  }
}

export function syncRunCheckpoints(state: GameState): void {
  for (const id of reachedCheckpointIds(state)) recordCheckpoint(state, id);
}
