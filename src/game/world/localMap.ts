/** What the map screen needs to answer "where am I and where can I go", handed over by the world you are standing in. */
import type { UiPlan } from "../../ui/kit/plan";
import type { Place } from "./places";

export interface LocalMapRow {
  place: Place;
  /** Number on the plan pin. */
  n: number;
  /** "a nord-ovest, 9 passi" */
  where: string;
  goal: boolean;
  /** Why it cannot be reached yet, when it cannot. */
  locked?: string;
  /** Walking is possible: the world can take you there. */
  reachable: boolean;
}

export interface LocalMap {
  name: string;
  zone?: string;
  inside: boolean;
  plan: UiPlan;
  rows: readonly LocalMapRow[];
  /** Walk the player to a place and close the map. */
  go(place: Place): void;
}

let provider: (() => LocalMap | null) | null = null;
/** The world registers itself while it is on screen; the map screen asks for the place you are in. */
export function registerLocalMap(next: (() => LocalMap | null) | null): void { provider = next; }
export function currentLocalMap(): LocalMap | null { return provider?.() ?? null; }
