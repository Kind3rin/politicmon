import { applyLineRedEvent, type AllyId, type CoalitionState } from "./coalition";
import { newElectionState, resolveAction, type ElectionState } from "./election";

export type PhotoChoice = "stringetevi" | "panoramica";
export type PhotoEventError = "already_resolved" | "candidates_unseen" | "coalition_incomplete" | "insufficient_funds" | "territory_conflict";

export interface PhotoEventInput {
  readonly choice: PhotoChoice;
  readonly coalition: CoalitionState;
  readonly election: ElectionState;
  readonly money: number;
  readonly flags: Readonly<Record<string, boolean>>;
}

export interface PhotoEventPatch {
  readonly coalition: CoalitionState;
  readonly election: ElectionState;
  readonly money: number;
  readonly flags: Readonly<Record<string, true>>;
  readonly localDelta: number;
  readonly strained: readonly AllyId[];
  readonly broken: readonly AllyId[];
}

export type PhotoEventResult =
  | { readonly ok: true; readonly patch: PhotoEventPatch }
  | { readonly ok: false; readonly error: PhotoEventError };

const R1_CANDIDATES: readonly AllyId[] = ["campo_secretary", "quantum_centrist", "civic_mayor"];

export function resolvePhotoEvent(input: PhotoEventInput): PhotoEventResult {
  if (input.flags["atto3-photo-choice:stringetevi"] || input.flags["atto3-photo-choice:panoramica"]) {
    return { ok: false, error: "already_resolved" };
  }
  if (!R1_CANDIDATES.every((id) => input.flags[`coalition-candidate-seen:${id}`])) {
    return { ok: false, error: "candidates_unseen" };
  }
  if (input.coalition.members.length !== 2) return { ok: false, error: "coalition_incomplete" };
  const risky = input.choice === "panoramica";
  if (risky && input.money < 800) return { ok: false, error: "insufficient_funds" };

  const election = input.election.phase === "inactive" ? newElectionState(true) : input.election;
  const action = resolveAction(election, {
    districtId: "centro",
    action: "promise",
    variant: input.choice,
    baseDelta: risky ? 12 : 4
  });
  if (!action.ok) return { ok: false, error: "territory_conflict" };

  const lineRed = risky
    ? applyLineRedEvent(input.coalition, 13)
    : { state: input.coalition, strained: [] as AllyId[], broken: [] as AllyId[] };
  return {
    ok: true,
    patch: {
      coalition: lineRed.state,
      election: action.state,
      money: input.money - (risky ? 800 : 0),
      flags: {
        [`atto3-photo-choice:${input.choice}`]: true,
        "campo-photo-choice-complete": true
      },
      localDelta: risky ? 12 : 4,
      strained: lineRed.strained,
      broken: lineRed.broken
    }
  };
}
