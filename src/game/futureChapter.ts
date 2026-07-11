import { addAlly, applyLineRedEvent, coalitionBonuses, type AllyId, type CoalitionState } from "./coalition";

export type FutureChoice = "alliance" | "distance" | "opposition";
export type FutureChoiceError = "already_resolved" | "insufficient_funds" | "coalition_full";

export interface FutureChoiceInput {
  readonly choice: FutureChoice;
  readonly coalition: CoalitionState;
  readonly money: number;
  readonly sondaggi: number;
  readonly flags: Readonly<Record<string, boolean>>;
}

export interface FutureChoicePatch {
  readonly coalition: CoalitionState;
  readonly money: number;
  readonly sondaggi: number;
  readonly flags: Readonly<Record<string, true>>;
  readonly strained: readonly AllyId[];
  readonly broken: readonly AllyId[];
  readonly moneyDelta: number;
  readonly sondaggiDelta: number;
}

export type FutureChoiceResult =
  | { readonly ok: true; readonly patch: FutureChoicePatch }
  | { readonly ok: false; readonly error: FutureChoiceError };

function fundGain(base: number, coalition: CoalitionState): number {
  const modifiers = coalitionBonuses(coalition);
  return Math.round(base * (1 + (modifiers.bonus.funds + modifiers.malus.funds) / 100));
}

export function resolveFutureChoice(input: FutureChoiceInput): FutureChoiceResult {
  if (input.flags["future-choice-complete"]) return { ok: false, error: "already_resolved" };

  let coalition = input.coalition;
  let moneyDelta = 0;
  let sondaggiDelta = 0;
  let strained: readonly AllyId[] = [];
  let broken: readonly AllyId[] = [];
  let outcomeFlag: "a3.future.ally" | "a3.future.distance" | "a3.future.oppose";

  if (input.choice === "alliance") {
    if (input.money < 800) return { ok: false, error: "insufficient_funds" };
    if (!coalition.members.some((member) => member.allyId === "generorso")) {
      const added = addAlly(coalition, "generorso");
      if (!added.ok) return { ok: false, error: "coalition_full" };
      coalition = added.state;
    }
    const lines = applyLineRedEvent(coalition, 10);
    coalition = lines.state;
    strained = lines.strained;
    broken = lines.broken;
    moneyDelta = -800;
    outcomeFlag = "a3.future.ally";
  } else if (input.choice === "distance") {
    moneyDelta = fundGain(600, coalition);
    outcomeFlag = "a3.future.distance";
  } else {
    const lines = applyLineRedEvent(coalition, 11);
    coalition = lines.state;
    strained = lines.strained;
    broken = lines.broken;
    sondaggiDelta = 2;
    outcomeFlag = "a3.future.oppose";
  }

  const flags: Record<string, true> = { "future-choice-complete": true, [outcomeFlag]: true };
  for (const id of broken) flags[`coalition-broken:${id}`] = true;
  return {
    ok: true,
    patch: {
      coalition,
      money: Math.max(0, input.money + moneyDelta),
      sondaggi: Math.max(0, Math.min(100, input.sondaggi + sondaggiDelta)),
      flags,
      strained,
      broken,
      moneyDelta,
      sondaggiDelta
    }
  };
}

export const FUTURE_REWARD_FLAGS = Object.freeze({
  "futuro-anteriore-beaten": true,
  "futureResolved": true,
  "futurorso-branch-unlocked": true,
  "feed-dossier-nord": true
} as const);

export function futureRewardPatch(flags: Readonly<Record<string, boolean>>): typeof FUTURE_REWARD_FLAGS | null {
  return flags.futureResolved ? null : FUTURE_REWARD_FLAGS;
}
