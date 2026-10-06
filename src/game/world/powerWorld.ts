/** The geometry of the field powers, kept apart from the scene so it can be tested on plain grids. */
export interface Grid {
  width: number;
  height: number;
  water(x: number, y: number): boolean;
  /** Ground a person can stand on: no wall, no water, no person, no object, no warp. */
  open(x: number, y: number): boolean;
}

export interface BridgePlan { tiles: { x: number; y: number }[]; landing: { x: number; y: number } }

export const MAX_BRIDGE = 3;

const inside = (grid: Grid, x: number, y: number) => x >= 0 && y >= 0 && x < grid.width && y < grid.height;

/** From `from`, looking along (dx, dy): one to three water tiles and then open ground. */
export function bridgePlan(grid: Grid, from: { x: number; y: number }, dx: number, dy: number, max = MAX_BRIDGE): BridgePlan | null {
  const tiles: { x: number; y: number }[] = [];
  let x = from.x + dx, y = from.y + dy;
  while (inside(grid, x, y) && grid.water(x, y)) {
    tiles.push({ x, y });
    if (tiles.length > max) return null;
    x += dx; y += dy;
  }
  if (!tiles.length || !inside(grid, x, y) || !grid.open(x, y)) return null;
  return { tiles, landing: { x, y } };
}

/** Climbing a bank upwards: the bank tile is in front, the ground above it is where you land. */
export function climbLanding(grid: Grid, from: { x: number; y: number }): { x: number; y: number } | null {
  const landing = { x: from.x, y: from.y - 2 };
  return inside(grid, landing.x, landing.y) && grid.open(landing.x, landing.y) ? landing : null;
}

/** A boulder pushed one tile along (dx, dy): where it ends up, if the way is free. */
export function pushTarget(grid: Grid, boulder: { x: number; y: number }, dx: number, dy: number): { x: number; y: number } | null {
  const x = boulder.x + dx, y = boulder.y + dy;
  return inside(grid, x, y) && grid.open(x, y) ? { x, y } : null;
}
