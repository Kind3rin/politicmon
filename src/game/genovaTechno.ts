import type { Button } from "../engine/input";

export type TechnoButton = Extract<Button, "up" | "down" | "left" | "right" | "a">;
export const TECHNO_SEQUENCE: readonly TechnoButton[] = ["left", "a", "right", "up", "a", "down"];
export const TECHNO_BEAT_SECONDS = 1.35;

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
  return advance(run, TECHNO_SEQUENCE[run.index] === button);
}

export function tickTechno(run: TechnoRun, dt: number): TechnoRun {
  if (run.complete || run.reducedMotion) return run;
  const remaining = run.remaining - Math.max(0, Math.min(dt, 0.25));
  return remaining <= 0 ? advance(run, false) : { ...run, remaining };
}

export interface TechnoReward { readonly grade: "PERFETTO" | "IN ONDA" | "FUORI TEMPO"; readonly money: number; readonly sondaggi: number; }

export function technoReward(hits: number): TechnoReward {
  if (hits >= 5) return { grade: "PERFETTO", money: 1200, sondaggi: 4 };
  if (hits >= 3) return { grade: "IN ONDA", money: 600, sondaggi: 2 };
  return { grade: "FUORI TEMPO", money: 200, sondaggi: 0 };
}
