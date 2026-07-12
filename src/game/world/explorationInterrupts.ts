import type { Facing } from "../../art/characters";
import { pickWanderer, wandererLevel, type WanderingDef } from "../../data/encounters";
import type { TrainerDef } from "../../data/trainers";
import type { GameState } from "../state";

export const MIN_FREE_STEPS = 8;
export const INITIAL_WANDERER_COOLDOWN = 50;
export const WANDERER_CHANCE = 0.02;

export interface WandererCadence {
  cooldown: number;
  recentIds: string[];
}

export interface WandererSpot {
  x: number;
  y: number;
  facing: Facing;
}

export interface WandererPlan {
  def: WanderingDef;
  trainer: TrainerDef;
  spot: WandererSpot;
}

export function newWandererCadence(): WandererCadence {
  return { cooldown: INITIAL_WANDERER_COOLDOWN, recentIds: [] };
}

function buildWandererTrainer(state: GameState, def: WanderingDef): TrainerDef {
  const level = wandererLevel(state);
  const team: Array<[string, number]> = [];
  for (let i = 0; i < def.size; i += 1) {
    const speciesId = def.species[i % def.species.length];
    team.push([speciesId, Math.max(2, level - (def.size - 1 - i))]);
  }
  return {
    id: `wander:${def.id}`,
    name: def.name,
    pal: def.pal,
    team,
    intro: def.intro,
    defeat: def.defeat,
    money: Math.round(def.money * (1 + level / 30)),
    reward: def.reward
  };
}

export function planWanderingChallenge(
  state: GameState,
  cadence: WandererCadence,
  enabled: boolean,
  hasActiveProposal: boolean,
  findSpot: () => WandererSpot | null,
  random: () => number = Math.random
): WandererPlan | null {
  if (!enabled || hasActiveProposal || state.party.length === 0 || !state.party.some((mon) => mon.hp > 0)) {
    return null;
  }
  if (cadence.cooldown > 0) {
    cadence.cooldown -= 1;
    return null;
  }
  if (random() > WANDERER_CHANCE) return null;
  const def = pickWanderer(state, cadence.recentIds, random());
  if (!def) return null;
  const spot = findSpot();
  if (!spot) return null;

  cadence.cooldown = 70 + Math.floor(random() * 40);
  cadence.recentIds.push(def.id);
  if (cadence.recentIds.length > 3) cadence.recentIds.shift();
  return { def, trainer: buildWandererTrainer(state, def), spot };
}
