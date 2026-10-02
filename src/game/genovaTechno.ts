import type { GameState } from "./state";
import type { Button } from "../engine/input";

export type TechnoButton = Extract<Button, "up" | "down" | "left" | "right" | "a">;
export const TECHNO_SEQUENCE: readonly TechnoButton[] = ["left", "a", "right", "up", "a", "down"];
export const TECHNO_BEAT_SECONDS = 1.35;
export const TECHNO_WINDOW_SECONDS = 0.22;
export function technoInWindow(run: TechnoRun): boolean {
  return run.reducedMotion || Math.abs(run.remaining - TECHNO_BEAT_SECONDS / 2) <= TECHNO_WINDOW_SECONDS;
}

export function technoPressFeedback(run: TechnoRun, button: TechnoButton): string {
  if (!run.reducedMotion && run.remaining > TECHNO_BEAT_SECONDS / 2 + TECHNO_WINDOW_SECONDS) return "TROPPO PRESTO: ASPETTA";
  if (!technoInWindow(run)) return "IN RITARDO";
  return TECHNO_SEQUENCE[run.index] === button ? "A TEMPO!" : "TASTO SBAGLIATO";
}

export interface TechnoRun {
  readonly index: number;
  readonly hits: number;
  readonly misses: number;
  readonly remaining: number;
  readonly reducedMotion: boolean;
  readonly complete: boolean;
}

export function newTechnoRun(reducedMotion: boolean): TechnoRun {
  return { index: 0, hits: 0, misses: 0, remaining: TECHNO_BEAT_SECONDS, reducedMotion, complete: false };
}

function advance(run: TechnoRun, hit: boolean): TechnoRun {
  const index = run.index + 1;
  return {
    ...run, index,
    hits: run.hits + (hit ? 1 : 0),
    misses: run.misses + (hit ? 0 : 1),
    remaining: TECHNO_BEAT_SECONDS,
    complete: index >= TECHNO_SEQUENCE.length
  };
}

export function pressTechno(run: TechnoRun, button: TechnoButton): TechnoRun {
  if (run.complete) return run;
  if (!run.reducedMotion && run.remaining > TECHNO_BEAT_SECONDS / 2 + TECHNO_WINDOW_SECONDS) return run;
  return advance(run, technoInWindow(run) && TECHNO_SEQUENCE[run.index] === button);
}

export function tickTechno(run: TechnoRun, dt: number): TechnoRun {
  if (run.complete || run.reducedMotion) return run;
  const remaining = run.remaining - Math.max(0, Math.min(dt, 0.25));
  return remaining <= 0 ? advance(run, false) : { ...run, remaining };
}

export interface TechnoReward { readonly grade: "PERFETTO" | "IN ONDA" | "FUORI TEMPO"; readonly money: number; readonly sondaggi: number; }

export function technoReward(hits: number): TechnoReward {
  if (hits >= 6) return { grade: "PERFETTO", money: 1200, sondaggi: 4 };
  if (hits >= 3) return { grade: "IN ONDA", money: 600, sondaggi: 2 };
  return { grade: "FUORI TEMPO", money: 200, sondaggi: 0 };
}

export function claimTechnoReward(state: GameState, run: TechnoRun): { money: number; sondaggi: number } {
  if (!run.complete || state.flags["genova-techno-complete"]) return { money: 0, sondaggi: 0 };
  const reward = technoReward(run.hits), before = state.sondaggi;
  state.flags["genova-techno-complete"] = true;
  state.flags[`genova-techno:${reward.grade.toLowerCase().replaceAll(" ", "-")}`] = true;
  state.money += reward.money;
  state.sondaggi = Math.min(100, state.sondaggi + reward.sondaggi);
  return { money: reward.money, sondaggi: state.sondaggi - before };
}
