import { applyLineRedEvent, coalitionBonuses, type AllyId, type CoalitionState } from "./coalition";

export type DiplomacyChoice = "loyalty" | "autonomy" | "home";
export type DiplomacyChoiceError = "already_resolved" | "insufficient_funds";

export interface DiplomacyChoiceInput {
  readonly choice: DiplomacyChoice;
  readonly coalition: CoalitionState;
  readonly money: number;
  readonly sondaggi: number;
  readonly flags: Readonly<Record<string, boolean>>;
}

export interface DiplomacyChoicePatch {
  readonly coalition: CoalitionState;
  readonly money: number;
  readonly sondaggi: number;
  readonly flags: Readonly<Record<string, true>>;
  readonly strained: readonly AllyId[];
  readonly broken: readonly AllyId[];
  readonly moneyDelta: number;
  readonly sondaggiDelta: number;
  readonly repairTarget: AllyId | null;
}

export type DiplomacyChoiceResult =
  | { readonly ok: true; readonly patch: DiplomacyChoicePatch }
  | { readonly ok: false; readonly error: DiplomacyChoiceError };

function applyFundGain(base: number, coalition: CoalitionState): number {
  const modifiers = coalitionBonuses(coalition);
  return Math.round(base * (1 + (modifiers.bonus.funds + modifiers.malus.funds) / 100));
}

export function resolveDiplomacyChoice(input: DiplomacyChoiceInput): DiplomacyChoiceResult {
  if (input.flags["diplomacy-choice-complete"]) return { ok: false, error: "already_resolved" };
  let coalition = input.coalition;
  let moneyDelta = 0;
  let sondaggiDelta = 0;
  let strained: readonly AllyId[] = [];
  let broken: readonly AllyId[] = [];
  let repairTarget: AllyId | null = null;
  let outcome: "a3.diplomacy.loyalty" | "a3.diplomacy.autonomy" | "a3.diplomacy.home";
  const extraFlags: Record<string, true> = {};

  if (input.choice === "loyalty") {
    moneyDelta = applyFundGain(800, coalition);
    const lines = applyLineRedEvent(coalition, 12);
    coalition = lines.state; strained = lines.strained; broken = lines.broken;
    extraFlags["pass-vertice"] = true;
    outcome = "a3.diplomacy.loyalty";
  } else if (input.choice === "autonomy") {
    const target = coalition.members.find((member) => member.status === "strained");
    if (target) {
      if (input.money < 500) return { ok: false, error: "insufficient_funds" };
      moneyDelta = -500;
      repairTarget = target.allyId;
      extraFlags[`reconcile-token:${target.allyId}:v${target.violationCount}`] = true;
    } else {
      moneyDelta = applyFundGain(500, coalition);
    }
    outcome = "a3.diplomacy.autonomy";
  } else {
    sondaggiDelta = 4;
    const lines = applyLineRedEvent(coalition, 13);
    coalition = lines.state; strained = lines.strained; broken = lines.broken;
    outcome = "a3.diplomacy.home";
  }
  for (const id of broken) extraFlags[`coalition-broken:${id}`] = true;

  return {
    ok: true,
    patch: {
      coalition,
      money: Math.max(0, input.money + moneyDelta),
      sondaggi: Math.max(0, Math.min(100, input.sondaggi + sondaggiDelta)),
      flags: { "diplomacy-choice-complete": true, [outcome]: true, ...extraFlags },
      strained, broken, moneyDelta, sondaggiDelta, repairTarget
    }
  };
}

export const DIPLOMACY_REWARD_FLAGS = Object.freeze({
  diplomacyComplete: true,
  "temptation-diplomacy-beaten": true,
  "tour-feed-unlocked": true,
  "diplomacy-clip-viral": true
} as const);

export function diplomacyRewardPatch(flags: Readonly<Record<string, boolean>>): typeof DIPLOMACY_REWARD_FLAGS | null {
  return flags.diplomacyComplete ? null : DIPLOMACY_REWARD_FLAGS;
}
