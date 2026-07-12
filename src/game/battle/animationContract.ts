import { MONSTERS_WITH_ACTION_PNG, MONSTERS_WITH_PNG } from "../../art/monsters";

export type BattleAnimationState = "idle" | "attack" | "damage" | "ko";

export interface BattleAnimationContract {
  speciesId: string;
  basePng: true;
  attackMode: "dedicated-frame" | "procedural-lunge";
  states: readonly BattleAnimationState[];
}

const REQUIRED_STATES = ["idle", "attack", "damage", "ko"] as const;

export function battleAnimationContract(speciesId: string): BattleAnimationContract | null {
  if (!MONSTERS_WITH_PNG.has(speciesId)) return null;
  return {
    speciesId,
    basePng: true,
    attackMode: MONSTERS_WITH_ACTION_PNG.has(speciesId) ? "dedicated-frame" : "procedural-lunge",
    states: REQUIRED_STATES
  };
}

export function allBattleAnimationContracts(): BattleAnimationContract[] {
  return [...MONSTERS_WITH_PNG].map((id) => battleAnimationContract(id)!);
}
