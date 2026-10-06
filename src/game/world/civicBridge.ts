import type { GameState } from "../state";

/** Public works the player has decided on. They alter both collision and rendering through WorldScene.tileAt,
 * and only on the one map they belong to: MAPS stays immutable, so importing another save never inherits them. */
interface CivicWork { decision: string; map: string; x: readonly [number, number]; y: readonly [number, number]; from: string; to: string }
export const CIVIC_WORKS: readonly CivicWork[] = [
  // Route 1: four planks across the little lake.
  { decision: "cantiere:build", map: "route1", x: [4, 7], y: [7, 7], from: "w", to: "q" },
  // Route 3: a gap in the quarry wall, so the climb no longer goes round by the east lane.
  { decision: "cava:open", map: "route3", x: [13, 16], y: [10, 11], from: "R", to: "=" }
];

export function civicBridgeTile(state: GameState, mapId: string, x: number, y: number, raw: string): string {
  for (const work of CIVIC_WORKS) {
    if (work.map === mapId && raw === work.from && x >= work.x[0] && x <= work.x[1] && y >= work.y[0] && y <= work.y[1] && state.morale.decisions.includes(work.decision)) return work.to;
  }
  return raw;
}
