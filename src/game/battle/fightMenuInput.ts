import { VIEW_H, VIEW_W } from "../../engine/screen";

// Geometria condivisa con il renderer custom della lista mosse.
export const FIGHT_LIST_LEFT = 4;
export const FIGHT_LIST_RIGHT = VIEW_W - 4;
export const FIGHT_LIST_TOP = VIEW_H - 42;
export const FIGHT_LIST_ROW_H = 9;

export interface FightMenuTap {
  x: number;
  y: number;
}

/** Restituisce la riga toccata, oppure null fuori dalla lista visibile. */
export function fightMenuTapIndex(tap: FightMenuTap, itemCount: number, height = VIEW_H): number | null {
  const top = height - 42;
  if (
    itemCount <= 0 ||
    tap.x < FIGHT_LIST_LEFT ||
    tap.x >= FIGHT_LIST_RIGHT ||
    tap.y < top ||
    tap.y >= top + itemCount * FIGHT_LIST_ROW_H
  ) {
    return null;
  }
  return Math.floor((tap.y - top) / FIGHT_LIST_ROW_H);
}
