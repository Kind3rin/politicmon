export type CoalitionId = "campo_largo" | "centro_mobile" | "destra_competitiva" | "lista_civica" | "none";
export type AllyId = "campo_secretary" | "quantum_centrist" | "steel_governor" | "civic_mayor" | "generorso";
export type AllyTag = "campo" | "centro" | "destra" | "civica";
export type CoalitionChannel = "funds" | "sondaggiGain" | "territoryGain" | "shopPrice";
export type MembershipStatus = "allied" | "strained" | "reconciled";

export interface AllyDefinition {
  readonly id: AllyId;
  readonly tag: AllyTag;
  readonly bonus: CoalitionChannel;
  readonly malus: CoalitionChannel;
  readonly lineRedEventIndexes: readonly number[];
  readonly incompatibleWith: readonly AllyId[];
}

export interface CoalitionMember {
  readonly allyId: AllyId;
  readonly status: MembershipStatus;
  readonly violationCount: number;
  readonly reconciliationSpent: boolean;
}

export interface CoalitionState {
  readonly members: readonly CoalitionMember[];
  readonly locked: boolean;
  readonly pendingConsequences: readonly string[];
  readonly processedConsequences: readonly string[];
}

export type CoalitionError = "locked" | "unknown_ally" | "duplicate" | "full" | "missing";
export type CoalitionResult =
  | { readonly ok: true; readonly state: CoalitionState }
  | { readonly ok: false; readonly error: CoalitionError; readonly state: CoalitionState };

export const ALLY_CATALOG: Readonly<Record<AllyId, AllyDefinition>> = Object.freeze({
  campo_secretary: { id: "campo_secretary", tag: "campo", bonus: "territoryGain", malus: "funds", lineRedEventIndexes: [10, 12], incompatibleWith: ["steel_governor"] },
  quantum_centrist: { id: "quantum_centrist", tag: "centro", bonus: "shopPrice", malus: "sondaggiGain", lineRedEventIndexes: [11, 13], incompatibleWith: [] },
  steel_governor: { id: "steel_governor", tag: "destra", bonus: "funds", malus: "territoryGain", lineRedEventIndexes: [11, 13], incompatibleWith: ["campo_secretary"] },
  civic_mayor: { id: "civic_mayor", tag: "civica", bonus: "sondaggiGain", malus: "shopPrice", lineRedEventIndexes: [10, 12], incompatibleWith: ["generorso"] },
  generorso: { id: "generorso", tag: "destra", bonus: "funds", malus: "shopPrice", lineRedEventIndexes: [11, 13], incompatibleWith: ["civic_mayor"] }
});

const ALLY_IDS = Object.freeze(Object.keys(ALLY_CATALOG) as AllyId[]);
const MAX_MEMBERS = 3;

export function newCoalitionState(): CoalitionState {
  return { members: [], locked: false, pendingConsequences: [], processedConsequences: [] };
}

export function isAllyId(value: unknown): value is AllyId {
  return typeof value === "string" && Object.hasOwn(ALLY_CATALOG, value);
}

export function normalizeCoalitionState(value: unknown): CoalitionState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return newCoalitionState();
  const raw = value as Partial<CoalitionState>;
  const seen = new Set<AllyId>();
  const members: CoalitionMember[] = [];
  if (Array.isArray(raw.members)) {
    for (const candidate of raw.members) {
      if (members.length >= MAX_MEMBERS || !candidate || typeof candidate !== "object") break;
      const member = candidate as Partial<CoalitionMember>;
      if (!isAllyId(member.allyId) || seen.has(member.allyId)) continue;
      const status: MembershipStatus = member.status === "strained" || member.status === "reconciled" ? member.status : "allied";
      members.push({
        allyId: member.allyId,
        status,
        violationCount: Number.isInteger(member.violationCount) ? Math.max(0, Math.min(99, member.violationCount as number)) : 0,
        reconciliationSpent: member.reconciliationSpent === true
      });
      seen.add(member.allyId);
    }
  }
  const cleanIds = (input: unknown): string[] => Array.isArray(input)
    ? [...new Set(input.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 128))].slice(0, 128)
    : [];
  return {
    members,
    locked: raw.locked === true,
    pendingConsequences: cleanIds(raw.pendingConsequences),
    processedConsequences: cleanIds(raw.processedConsequences)
  };
}

export function canAddAlly(state: CoalitionState, allyId: string): CoalitionError | null {
  if (state.locked) return "locked";
  if (!isAllyId(allyId)) return "unknown_ally";
  if (state.members.some((member) => member.allyId === allyId)) return "duplicate";
  if (state.members.length >= MAX_MEMBERS) return "full";
  return null;
}

export function addAlly(state: CoalitionState, allyId: string): CoalitionResult {
  const error = canAddAlly(state, allyId);
  if (error) return { ok: false, error, state };
  return {
    ok: true,
    state: { ...state, members: [...state.members, { allyId: allyId as AllyId, status: "allied", violationCount: 0, reconciliationSpent: false }] }
  };
}

export function removeAlly(state: CoalitionState, allyId: string): CoalitionResult {
  if (state.locked) return { ok: false, error: "locked", state };
  if (!isAllyId(allyId)) return { ok: false, error: "unknown_ally", state };
  if (!state.members.some((member) => member.allyId === allyId)) return { ok: false, error: "missing", state };
  return { ok: true, state: { ...state, members: state.members.filter((member) => member.allyId !== allyId) } };
}

export function violatedLines(state: CoalitionState, eventIndex: number): AllyId[] {
  return state.members
    .filter((member) => ALLY_CATALOG[member.allyId].lineRedEventIndexes.includes(eventIndex))
    .map((member) => member.allyId);
}

export interface LineRedResolution {
  readonly state: CoalitionState;
  readonly strained: readonly AllyId[];
  readonly broken: readonly AllyId[];
}

export function applyLineRedEvent(state: CoalitionState, eventIndex: number): LineRedResolution {
  const targets = new Set(violatedLines(state, eventIndex));
  const strained: AllyId[] = [];
  const broken: AllyId[] = [];
  const members: CoalitionMember[] = [];
  for (const member of state.members) {
    if (!targets.has(member.allyId)) {
      members.push(member);
      continue;
    }
    const violationCount = member.violationCount + 1;
    if (member.status === "reconciled" || violationCount >= 2) {
      broken.push(member.allyId);
      continue;
    }
    strained.push(member.allyId);
    members.push({ ...member, status: "strained", violationCount });
  }
  return { state: { ...state, members }, strained, broken };
}

const ASSET_MODIFIERS: Readonly<Record<Exclude<CoalitionId, "none">, { bonus: CoalitionChannel; malus: CoalitionChannel }>> = {
  campo_largo: { bonus: "territoryGain", malus: "funds" },
  centro_mobile: { bonus: "shopPrice", malus: "sondaggiGain" },
  destra_competitiva: { bonus: "funds", malus: "territoryGain" },
  lista_civica: { bonus: "sondaggiGain", malus: "shopPrice" }
};

export function coalitionId(state: CoalitionState): CoalitionId {
  if (state.members.length === 0) return "none";
  const counts = new Map<AllyTag, number>();
  for (const member of state.members) {
    const tag = ALLY_CATALOG[member.allyId].tag;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const required = Math.floor(state.members.length / 2) + 1;
  const winner = [...counts].find(([, count]) => count >= required)?.[0];
  if (!winner) return "lista_civica";
  return ({ campo: "campo_largo", centro: "centro_mobile", destra: "destra_competitiva", civica: "lista_civica" } as const)[winner];
}

export interface CoalitionBonuses {
  readonly id: CoalitionId;
  readonly bonus: Readonly<Record<CoalitionChannel, number>>;
  readonly malus: Readonly<Record<CoalitionChannel, number>>;
}

export function coalitionBonuses(state: CoalitionState, knockedOut: readonly AllyId[] = []): CoalitionBonuses {
  const channels: CoalitionChannel[] = ["funds", "sondaggiGain", "territoryGain", "shopPrice"];
  const bonus = Object.fromEntries(channels.map((channel) => [channel, 0])) as Record<CoalitionChannel, number>;
  const malus = Object.fromEntries(channels.map((channel) => [channel, 0])) as Record<CoalitionChannel, number>;
  const ko = new Set(knockedOut.filter((id) => ALLY_IDS.includes(id)));
  for (const member of state.members) {
    const definition = ALLY_CATALOG[member.allyId];
    const power = member.status === "strained" ? 0.5 : member.status === "reconciled" ? 0.75 : 1;
    if (!ko.has(member.allyId)) bonus[definition.bonus] += 10 * power;
    malus[definition.malus] -= 6;
  }
  const id = coalitionId(state);
  if (id !== "none") {
    bonus[ASSET_MODIFIERS[id].bonus] += 5;
    malus[ASSET_MODIFIERS[id].malus] -= 3;
  }
  for (const channel of channels) {
    bonus[channel] = Math.min(20, Math.max(0, Math.round(bonus[channel])));
    malus[channel] = Math.min(0, Math.max(-20, Math.round(malus[channel])));
  }
  return { id, bonus, malus };
}
