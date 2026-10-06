/** The plan of the place you are in, drawn from the same tiles you walk on. */
import { isFacade, isRoof, TILES } from "../../art/tiles";
import type { MapDef } from "../../data/maps/types";
import { PLAN, type UiPlan, type UiPlanMark } from "../../ui/kit/plan";
import type { Terraces } from "./terraces";

/** What a tile is, for the plan: one of a dozen kinds, not the sixty characters of the map. */
export function planKind(ch: string, outdoor: boolean): number {
  if (ch === "%" ) return PLAN.bank;
  if (ch === "&") return PLAN.wall;
  if (ch === "^") return PLAN.bank;
  if (ch === "E" || ch === "l") return PLAN.stairs;
  if (isRoof(ch) || isFacade(ch)) return ch === "d" || ch === "D" || ch === "g" ? PLAN.door : PLAN.building;
  if (ch === "c" || ch === "O") return PLAN.door;
  if (ch === "~" || ch === "I") return PLAN.tall;
  if (ch === "=" || ch === "j" || ch === "q") return PLAN.path;
  if (ch === "z") return PLAN.sand;
  if (ch === "w") return PLAN.water;
  if (ch === "T" || ch === "N") return PLAN.tree;
  if (ch === "f") return PLAN.fence;
  if (ch === "A") return PLAN.building;
  if (ch === "p" || ch === "i") return PLAN.floor;
  const tile = TILES[ch];
  if (tile?.solid) return PLAN.object;
  return outdoor ? PLAN.ground : PLAN.floor;
}

export function planOf(map: Pick<MapDef, "tiles" | "outdoor">, terraces: Terraces, marks: readonly UiPlanMark[], key?: UiPlan["key"]): UiPlan {
  const rows = map.tiles.length, cols = Math.max(1, ...map.tiles.map(row => row.length));
  const tiles: number[] = [], levels: number[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const ch = map.tiles[y][x];
    tiles.push(ch === undefined ? PLAN.void : planKind(ch, map.outdoor));
    levels.push(terraces.at(x, y));
  }
  return { cols, rows, tiles, levels, marks, key };
}
