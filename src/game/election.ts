import type { AllyId, AllyTag, CoalitionState } from "./coalition";
import { electionDoctrine, type ElectionDoctrine } from "./electionDoctrine";

export const DISTRICT_IDS = ["nord", "centro", "sud", "isole", "feed"] as const;
export type DistrictId = typeof DISTRICT_IDS[number];
export type DistrictAction = "debate" | "promise" | "endorsement";
export type ElectionPhase = "inactive" | "tour" | "ready" | "locked" | "resolved";
export type ElectionEnding = "government" | "opposition";

export interface ActionOutcome {
  readonly action: DistrictAction;
  readonly variant: string;
  readonly baseDelta: number;
  readonly appliedDelta: number;
  readonly allyId?: AllyId;
}

export interface DistrictState {
  readonly id: DistrictId;
  readonly localConsensus: number;
  readonly actionMask: number;
  readonly outcomes: readonly ActionOutcome[];
  readonly revision: number;
}

export interface DistrictBreakdown {
  readonly id: DistrictId;
  readonly beforeRecount: number;
  readonly afterRecount: number;
  readonly seat: 0 | 1;
  readonly recounted: boolean;
}

export interface ElectionResult {
  readonly bossWon: boolean;
  readonly seats: number;
  readonly ending: ElectionEnding;
  readonly districts: readonly DistrictBreakdown[];
}

export interface ElectionState {
  readonly phase: ElectionPhase;
  readonly runId: string | null;
  readonly districts: readonly DistrictState[];
  readonly endorsementDistrictByAlly: Readonly<Partial<Record<AllyId, DistrictId>>>;
  readonly result: ElectionResult | null;
  readonly snapshot: ElectionSnapshot | null;
  readonly revision: number;
  readonly extensions: { readonly unknownDistricts: readonly unknown[] };
}

export interface ElectionSnapshot {
  readonly schemaVersion: 1;
  readonly electionSnapshotId: string;
  readonly coalitionSnapshotId: string;
  readonly runId: string;
  readonly doctrine: ElectionDoctrine;
  readonly sondaggi: number;
  readonly districts: readonly DistrictState[];
  readonly coalition: CoalitionState;
  readonly brokenDuringChapter: readonly AllyId[];
}

export interface TerritoryModifier {
  readonly bonusPercent: number;
  readonly malusPercent: number;
}

export type ElectionError = "inactive" | "locked" | "resolved" | "unknown_district" | "duplicate_action" | "action_limit" | "ally_already_used" | "not_ready" | "run_mismatch";
export type ElectionCommandResult =
  | { readonly ok: true; readonly state: ElectionState }
  | { readonly ok: false; readonly error: ElectionError; readonly state: ElectionState };

const ACTION_BITS: Readonly<Record<DistrictAction, number>> = { debate: 1, promise: 2, endorsement: 4 };
const VALID_PHASES: readonly ElectionPhase[] = ["inactive", "tour", "ready", "locked", "resolved"];

export const DISTRICT_CATALOG: Readonly<Record<DistrictId, {
  readonly prudentDelta: 4;
  readonly riskyDelta: 12;
  readonly riskyCost: number;
  readonly affinity: readonly AllyTag[];
  readonly neutral: readonly AllyTag[] | "all";
  readonly incompatible: readonly AllyTag[];
}>> = Object.freeze({
  nord: { prudentDelta: 4, riskyDelta: 12, riskyCost: 1000, affinity: ["centro", "destra"], neutral: ["civica"], incompatible: ["campo"] },
  centro: { prudentDelta: 4, riskyDelta: 12, riskyCost: 800, affinity: ["campo", "centro"], neutral: ["civica"], incompatible: ["destra"] },
  sud: { prudentDelta: 4, riskyDelta: 12, riskyCost: 900, affinity: ["campo", "civica"], neutral: ["centro"], incompatible: ["destra"] },
  isole: { prudentDelta: 4, riskyDelta: 12, riskyCost: 1000, affinity: ["destra", "civica"], neutral: ["campo"], incompatible: ["centro"] },
  feed: { prudentDelta: 4, riskyDelta: 12, riskyCost: 1200, affinity: [], neutral: "all", incompatible: [] }
});

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback;
}

function popcount3(mask: number): number {
  let value = mask & 0b111;
  let count = 0;
  while (value) { count += value & 1; value >>>= 1; }
  return count;
}

export function newDistrictState(id: DistrictId): DistrictState {
  return { id, localConsensus: 38, actionMask: 0, outcomes: [], revision: 0 };
}

export function newElectionState(active = false): ElectionState {
  return {
    phase: active ? "tour" : "inactive",
    runId: null,
    districts: DISTRICT_IDS.map(newDistrictState),
    endorsementDistrictByAlly: {},
    result: null,
    snapshot: null,
    revision: 0,
    extensions: { unknownDistricts: [] }
  };
}

function isDistrictId(value: unknown): value is DistrictId {
  return typeof value === "string" && (DISTRICT_IDS as readonly string[]).includes(value);
}

function normalizeOutcome(value: unknown, allowedMask: number): ActionOutcome | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Partial<ActionOutcome>;
  if (raw.action !== "debate" && raw.action !== "promise" && raw.action !== "endorsement") return null;
  if ((allowedMask & ACTION_BITS[raw.action]) === 0) return null;
  return {
    action: raw.action,
    variant: typeof raw.variant === "string" ? raw.variant.slice(0, 48) : "legacy",
    baseDelta: clampInt(raw.baseDelta, -100, 100, 0),
    appliedDelta: clampInt(raw.appliedDelta, -100, 100, 0),
    ...(typeof raw.allyId === "string" ? { allyId: raw.allyId as AllyId } : {})
  };
}

export function normalizeElectionState(value: unknown): ElectionState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return newElectionState();
  const raw = value as Partial<ElectionState>;
  const source = Array.isArray(raw.districts) ? raw.districts : [];
  const known = new Map<DistrictId, DistrictState>();
  const unknownDistricts: unknown[] = [];
  for (const candidate of source) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const district = candidate as Partial<DistrictState>;
    if (!isDistrictId(district.id)) { unknownDistricts.push(candidate); continue; }
    if (known.has(district.id)) continue;
    let mask = clampInt(district.actionMask, 0, 7, 0) & 0b111;
    if (popcount3(mask) > 2) {
      const bits = [1, 2, 4].filter((bit) => (mask & bit) !== 0).slice(0, 2);
      mask = bits.reduce((sum, bit) => sum | bit, 0);
    }
    const outcomes: ActionOutcome[] = [];
    const actions = new Set<DistrictAction>();
    if (Array.isArray(district.outcomes)) {
      for (const item of district.outcomes) {
        const outcome = normalizeOutcome(item, mask);
        if (outcome && !actions.has(outcome.action)) { outcomes.push(outcome); actions.add(outcome.action); }
      }
    }
    known.set(district.id, {
      id: district.id,
      localConsensus: clampInt(district.localConsensus, 0, 100, 38),
      actionMask: mask,
      outcomes,
      revision: clampInt(district.revision, 0, Number.MAX_SAFE_INTEGER, 0)
    });
  }
  const districts = DISTRICT_IDS.map((id) => known.get(id) ?? newDistrictState(id));
  const allReady = districts.every((district) => popcount3(district.actionMask) === 2);
  let phase: ElectionPhase = VALID_PHASES.includes(raw.phase as ElectionPhase) ? raw.phase as ElectionPhase : "inactive";
  if (phase === "ready" && !allReady) phase = "tour";
  if (phase === "tour" && allReady) phase = "ready";
  const endorsements: Partial<Record<AllyId, DistrictId>> = {};
  if (raw.endorsementDistrictByAlly && typeof raw.endorsementDistrictByAlly === "object") {
    for (const [allyId, districtId] of Object.entries(raw.endorsementDistrictByAlly)) {
      if (isDistrictId(districtId) && typeof allyId === "string" && !(allyId in endorsements)) endorsements[allyId as AllyId] = districtId;
    }
  }
  return {
    phase,
    runId: typeof raw.runId === "string" && raw.runId.length > 0 ? raw.runId.slice(0, 128) : null,
    districts,
    endorsementDistrictByAlly: endorsements,
    result: phase === "resolved" && raw.result && typeof raw.result === "object" ? raw.result : null,
    snapshot: raw.snapshot && typeof raw.snapshot === "object" ? raw.snapshot as ElectionSnapshot : null,
    revision: clampInt(raw.revision, 0, Number.MAX_SAFE_INTEGER, 0),
    extensions: { unknownDistricts: [...unknownDistricts, ...(Array.isArray(raw.extensions?.unknownDistricts) ? raw.extensions.unknownDistricts : [])].slice(0, 32) }
  };
}

export function applyTerritoryGain(baseDelta: number, modifier: TerritoryModifier): number {
  if (baseDelta <= 0) return Math.round(baseDelta);
  const percent = clampInt(modifier.bonusPercent, 0, 20, 0) + clampInt(modifier.malusPercent, -20, 0, 0);
  return Math.round(baseDelta * (1 + percent / 100));
}

export function endorsementDelta(districtId: DistrictId, tag: AllyTag): 6 | 3 | -3 {
  const rule = DISTRICT_CATALOG[districtId];
  if (rule.affinity.includes(tag)) return 6;
  if (rule.neutral === "all" || rule.neutral.includes(tag)) return 3;
  return -3;
}

export interface ResolveActionInput {
  readonly districtId: DistrictId;
  readonly action: DistrictAction;
  readonly variant: string;
  readonly baseDelta: number;
  readonly modifier?: TerritoryModifier;
  readonly allyId?: AllyId;
}

export function resolveAction(state: ElectionState, input: ResolveActionInput): ElectionCommandResult {
  if (state.phase === "inactive") return { ok: false, error: "inactive", state };
  if (state.phase === "locked") return { ok: false, error: "locked", state };
  if (state.phase === "resolved") return { ok: false, error: "resolved", state };
  const index = state.districts.findIndex((district) => district.id === input.districtId);
  if (index < 0) return { ok: false, error: "unknown_district", state };
  const district = state.districts[index];
  const bit = ACTION_BITS[input.action];
  if ((district.actionMask & bit) !== 0) return { ok: false, error: "duplicate_action", state };
  if (popcount3(district.actionMask) >= 2) return { ok: false, error: "action_limit", state };
  if (input.action === "endorsement" && input.allyId && state.endorsementDistrictByAlly[input.allyId]) {
    return { ok: false, error: "ally_already_used", state };
  }
  const appliedDelta = applyTerritoryGain(input.baseDelta, input.modifier ?? { bonusPercent: 0, malusPercent: 0 });
  const nextDistrict: DistrictState = {
    ...district,
    localConsensus: clampInt(district.localConsensus + appliedDelta, 0, 100, 38),
    actionMask: district.actionMask | bit,
    outcomes: [...district.outcomes, { action: input.action, variant: input.variant, baseDelta: input.baseDelta, appliedDelta, ...(input.allyId ? { allyId: input.allyId } : {}) }],
    revision: district.revision + 1
  };
  const districts = state.districts.map((item, position) => position === index ? nextDistrict : item);
  const endorsements = input.action === "endorsement" && input.allyId
    ? { ...state.endorsementDistrictByAlly, [input.allyId]: input.districtId }
    : state.endorsementDistrictByAlly;
  return {
    ok: true,
    state: {
      ...state,
      districts,
      endorsementDistrictByAlly: endorsements,
      phase: districts.every((item) => popcount3(item.actionMask) === 2) ? "ready" : "tour",
      revision: state.revision + 1
    }
  };
}

export function startElection(state: ElectionState, runId: string, snapshot?: ElectionSnapshot): ElectionCommandResult {
  if (state.phase !== "ready") return { ok: false, error: "not_ready", state };
  return { ok: true, state: { ...state, phase: "locked", runId, snapshot: snapshot ?? null, revision: state.revision + 1 } };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createElectionSnapshot(state: ElectionState, coalition: CoalitionState, sondaggi: number, flags: Readonly<Record<string, boolean>>, runId: string): Promise<ElectionSnapshot> {
  const brokenDuringChapter = Object.keys(flags)
    .filter((flag) => flag.startsWith("coalition-broken:") && flags[flag])
    .map((flag) => flag.slice("coalition-broken:".length) as AllyId)
    .sort();
  const coalitionPayload = { members: coalition.members, locked: coalition.locked, pendingConsequences: coalition.pendingConsequences, processedConsequences: coalition.processedConsequences };
  const coalitionSnapshotId = await sha256(coalitionPayload);
  const payload = {
    schemaVersion: 1 as const, runId, coalitionSnapshotId, doctrine: electionDoctrine(coalition, flags),
    sondaggi: clampInt(sondaggi, 0, 100, 50), districts: state.districts, coalition: coalitionPayload, brokenDuringChapter
  };
  return { ...payload, electionSnapshotId: await sha256(payload) };
}

export function calculateElectionResult(districts: readonly DistrictState[], bossWon: boolean): ElectionResult {
  const breakdown = DISTRICT_IDS.map((id): DistrictBreakdown => {
    const before = clampInt(districts.find((district) => district.id === id)?.localConsensus, 0, 100, 38);
    const recounted = before === 50;
    const after = recounted ? before + (bossWon ? 1 : -1) : before;
    return { id, beforeRecount: before, afterRecount: after, seat: after > 50 ? 1 : 0, recounted };
  });
  const seats = breakdown.reduce((sum, district) => sum + district.seat, 0);
  return { bossWon, seats, ending: seats >= 3 ? "government" : "opposition", districts: breakdown };
}

export function resolveElection(state: ElectionState, runId: string, bossWon: boolean): ElectionCommandResult {
  if (state.phase === "resolved" && state.runId === runId) return { ok: true, state };
  if (state.phase !== "locked") return { ok: false, error: "not_ready", state };
  if (state.runId !== runId) return { ok: false, error: "run_mismatch", state };
  return { ok: true, state: { ...state, phase: "resolved", result: calculateElectionResult(state.districts, bossWon), revision: state.revision + 1 } };
}
