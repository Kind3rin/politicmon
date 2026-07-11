export type QuestPrerequisite =
  | { readonly kind: "flag"; readonly id: string; readonly value?: boolean }
  | { readonly kind: "minBadges"; readonly value: number }
  | { readonly kind: "all"; readonly rules: readonly QuestPrerequisite[] }
  | { readonly kind: "any"; readonly rules: readonly QuestPrerequisite[] }
  | { readonly kind: "not"; readonly rule: QuestPrerequisite };

export interface QuestFacts {
  readonly flags: Readonly<Record<string, boolean>>;
  readonly badges: readonly string[];
}

export interface QuestBranchDef {
  readonly id: string;
  readonly label: string;
  readonly prerequisites?: readonly QuestPrerequisite[];
  readonly completionFlag: string;
  readonly failureFlag?: string;
}

export interface BranchingQuestDef {
  readonly prerequisites?: readonly QuestPrerequisite[];
  readonly branches: readonly QuestBranchDef[];
  readonly allowFailure?: boolean;
}

export type QuestFlowStatus = "locked" | "available" | "active" | "completed" | "failed";

export interface QuestFlowView {
  readonly status: QuestFlowStatus;
  readonly selectedBranchId: string | null;
  readonly availableBranchIds: readonly string[];
}

export interface QuestFlagPatch {
  readonly set: Readonly<Record<string, true>>;
}

export type QuestFlowError = "locked" | "unknown_branch" | "branch_locked" | "already_selected" | "not_active" | "failure_disabled";
export type QuestFlowResult =
  | { readonly ok: true; readonly patch: QuestFlagPatch }
  | { readonly ok: false; readonly error: QuestFlowError; readonly patch: null };

function prefix(questId: string): string {
  return `quest:${questId}:`;
}

export function branchFlag(questId: string, branchId: string): string {
  return `${prefix(questId)}branch:${branchId}`;
}

export function questCompletedFlag(questId: string): string {
  return `${prefix(questId)}completed`;
}

export function questFailedFlag(questId: string): string {
  return `${prefix(questId)}failed`;
}

export function meetsPrerequisite(facts: QuestFacts, rule: QuestPrerequisite): boolean {
  switch (rule.kind) {
    case "flag": return Boolean(facts.flags[rule.id]) === (rule.value ?? true);
    case "minBadges": return facts.badges.length >= Math.max(0, Math.floor(rule.value));
    case "all": return rule.rules.every((child) => meetsPrerequisite(facts, child));
    case "any": return rule.rules.some((child) => meetsPrerequisite(facts, child));
    case "not": return !meetsPrerequisite(facts, rule.rule);
  }
}

function prerequisitesMet(facts: QuestFacts, rules: readonly QuestPrerequisite[] = []): boolean {
  return rules.every((rule) => meetsPrerequisite(facts, rule));
}

export function selectedQuestBranch(questId: string, flow: BranchingQuestDef, facts: QuestFacts): string | null {
  return flow.branches.find((branch) => facts.flags[branchFlag(questId, branch.id)])?.id ?? null;
}

export function questFlowView(questId: string, flow: BranchingQuestDef, facts: QuestFacts): QuestFlowView {
  const selectedBranchId = selectedQuestBranch(questId, flow, facts);
  if (facts.flags[questCompletedFlag(questId)]) return { status: "completed", selectedBranchId, availableBranchIds: [] };
  if (facts.flags[questFailedFlag(questId)]) return { status: "failed", selectedBranchId, availableBranchIds: [] };
  if (!prerequisitesMet(facts, flow.prerequisites)) return { status: "locked", selectedBranchId: null, availableBranchIds: [] };
  const availableBranchIds = flow.branches
    .filter((branch) => prerequisitesMet(facts, branch.prerequisites))
    .map((branch) => branch.id);
  return { status: selectedBranchId ? "active" : "available", selectedBranchId, availableBranchIds };
}

export function chooseQuestBranch(questId: string, flow: BranchingQuestDef, branchId: string, facts: QuestFacts): QuestFlowResult {
  const view = questFlowView(questId, flow, facts);
  if (view.status === "locked") return { ok: false, error: "locked", patch: null };
  if (view.selectedBranchId) return { ok: false, error: "already_selected", patch: null };
  const branch = flow.branches.find((candidate) => candidate.id === branchId);
  if (!branch) return { ok: false, error: "unknown_branch", patch: null };
  if (!view.availableBranchIds.includes(branchId)) return { ok: false, error: "branch_locked", patch: null };
  return { ok: true, patch: { set: { [branchFlag(questId, branchId)]: true } } };
}

export function completeQuestBranch(questId: string, flow: BranchingQuestDef, facts: QuestFacts): QuestFlowResult {
  const view = questFlowView(questId, flow, facts);
  if (view.status !== "active" || !view.selectedBranchId) return { ok: false, error: "not_active", patch: null };
  const branch = flow.branches.find((candidate) => candidate.id === view.selectedBranchId);
  if (!branch || !facts.flags[branch.completionFlag]) return { ok: false, error: "not_active", patch: null };
  return { ok: true, patch: { set: { [questCompletedFlag(questId)]: true } } };
}

export function failQuestBranch(questId: string, flow: BranchingQuestDef, facts: QuestFacts): QuestFlowResult {
  if (!flow.allowFailure) return { ok: false, error: "failure_disabled", patch: null };
  const view = questFlowView(questId, flow, facts);
  if (view.status !== "active" || !view.selectedBranchId) return { ok: false, error: "not_active", patch: null };
  const branch = flow.branches.find((candidate) => candidate.id === view.selectedBranchId);
  if (!branch?.failureFlag || !facts.flags[branch.failureFlag]) return { ok: false, error: "not_active", patch: null };
  return { ok: true, patch: { set: { [questFailedFlag(questId)]: true } } };
}

export function applyQuestFlagPatch(flags: Record<string, boolean>, patch: QuestFlagPatch): void {
  for (const id of Object.keys(patch.set).sort()) flags[id] = true;
}
