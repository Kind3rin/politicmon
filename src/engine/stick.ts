// Direction picked by a virtual stick on a grid: one cardinal axis at a time.
export type StickDirection = "up" | "down" | "left" | "right";

export const STICK_DEADZONE = 14;
/** The other axis must lead by this factor before the stick turns a corner. */
export const STICK_TURN_BIAS = 1.35;

/**
 * Thumbs drift. Without memory a diagonal drag flips between two axes every
 * few pixels and the character stutters. Once an axis is chosen it is kept
 * until the other one is clearly stronger.
 */
export function stickDirection(dx: number, dy: number, previous: StickDirection | null): StickDirection | null {
  if (Math.hypot(dx, dy) < STICK_DEADZONE) return null;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const horizontal: StickDirection = dx > 0 ? "right" : "left";
  const vertical: StickDirection = dy > 0 ? "down" : "up";
  if (previous === "left" || previous === "right") return ay > ax * STICK_TURN_BIAS ? vertical : horizontal;
  if (previous === "up" || previous === "down") return ax > ay * STICK_TURN_BIAS ? horizontal : vertical;
  return ax > ay ? horizontal : vertical;
}
