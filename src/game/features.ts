export type FeatureId = "atto3" | "coalition" | "territories" | "memeEvents" | "weeklyCampaign";

export interface FeatureDefinition {
  readonly defaultEnabled: boolean;
  readonly dependencies: readonly FeatureId[];
  readonly release: "R1" | "R2" | "R3" | "R4";
}

export const FEATURE_DEFINITIONS: Readonly<Record<FeatureId, FeatureDefinition>> = Object.freeze({
  atto3: { defaultEnabled: true, dependencies: [], release: "R1" },
  coalition: { defaultEnabled: true, dependencies: ["atto3"], release: "R1" },
  territories: { defaultEnabled: false, dependencies: ["atto3", "coalition"], release: "R3" },
  memeEvents: { defaultEnabled: false, dependencies: ["atto3"], release: "R2" },
  weeklyCampaign: { defaultEnabled: false, dependencies: ["atto3", "coalition", "territories"], release: "R4" }
});

export const FEATURE_OVERRIDE_KEY = "politicmon:dev:feature-overrides";

type OverrideSource = Pick<Storage, "getItem">;
export type FeatureOverrides = Partial<Record<FeatureId, boolean>>;

function isFeatureId(value: string): value is FeatureId {
  return Object.hasOwn(FEATURE_DEFINITIONS, value);
}

export function parseFeatureOverrides(raw: string | null): FeatureOverrides {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const overrides: FeatureOverrides = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (isFeatureId(id) && typeof value === "boolean") overrides[id] = value;
    }
    return overrides;
  } catch {
    return {};
  }
}

export function resolveFeatures(overrides: FeatureOverrides = {}, dev = false): Readonly<Record<FeatureId, boolean>> {
  const resolved = {} as Record<FeatureId, boolean>;
  for (const id of Object.keys(FEATURE_DEFINITIONS) as FeatureId[]) {
    const definition = FEATURE_DEFINITIONS[id];
    const requested = dev ? (overrides[id] ?? definition.defaultEnabled) : definition.defaultEnabled;
    resolved[id] = requested && definition.dependencies.every((dependency) => resolved[dependency]);
  }
  return Object.freeze(resolved);
}

export function runtimeFeatures(
  dev = import.meta.env.DEV,
  storage: OverrideSource | undefined = typeof localStorage === "undefined" ? undefined : localStorage
): Readonly<Record<FeatureId, boolean>> {
  let raw: string | null = null;
  if (dev && storage) {
    try {
      raw = storage.getItem(FEATURE_OVERRIDE_KEY);
    } catch {
      // Storage negato: mantieni i default sicuri.
    }
  }
  return resolveFeatures(parseFeatureOverrides(raw), dev);
}

export function isFeatureEnabled(id: FeatureId): boolean {
  return runtimeFeatures()[id];
}
