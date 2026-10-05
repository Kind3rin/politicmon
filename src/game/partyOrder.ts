/** The first companion of the squad enters every debate first, so the order is a decision. */

/**
 * Take the companion at `from` and put it at place `to`; the others keep their relative order.
 * The same rule serves a tap on a destination, a drag released over a row and the old
 * START-then-START chord. Returns false when nothing moved.
 */
export function moveCompanion<T>(party: T[], from: number, to: number): boolean {
  const inside = (index: number) => Number.isInteger(index) && index >= 0 && index < party.length;
  if (from === to || !inside(from) || !inside(to)) return false;
  const [mover] = party.splice(from, 1);
  party.splice(to, 0, mover);
  return true;
}

/** "1º", "2º"... for a zero-based place. */
export const placeLabel = (index: number): string => `${index + 1}º`;
