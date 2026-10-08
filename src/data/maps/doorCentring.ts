/**
 * Every door is one tile, on the centre line of its building or room.
 *
 * The authored maps still describe a doorway as a pair of warp tiles, two tiles wide.
 * A one-tile body cannot stand on the centre of such a pair, so when the maps load
 * each pair becomes one centred door: an outdoor building loses its far edge column
 * and keeps the left door tile (the centre of an even-width facade); an interior room
 * gets one more floor column when needed and keeps the mat on its centre line. Warps
 * that pointed at a removed tile are moved to the kept one. Nothing downstream sees a
 * two-tile doorway, so the body is drawn on the tile centre and never slides.
 */
import type { MapDef, WarpDef } from "./types";
import { TILES, buildingKey, isFacade } from "../../art/tiles";

const OUTDOOR_DOOR = new Set(["d", "D", "g"]);
const INTERIOR_DOOR = "c";

/** A room wall: any tile that is solid (or unknown), so caves and rooms bound the same way. */
function isWall(ch: string): boolean {
  return TILES[ch]?.solid ?? true;
}

/** A roof or facade tile: part of a building, not ground. */
function isBuildingPart(ch: string): boolean {
  return buildingKey(ch) !== null || isFacade(ch);
}

type Rows = string[];

interface DoorRecord {
  /** Row of the door (and of the arrival row above an interior mat). */
  y: number;
  /** The tile that was a warp and no longer is. */
  dropped: number;
  /** The tile that stays the single door. */
  kept: number;
}

function at(rows: Rows, x: number, y: number): string {
  return rows[y]?.[x] ?? "T";
}

function withChar(row: string, x: number, ch: string): string {
  return row.slice(0, x) + ch + row.slice(x + 1);
}

/** Outdoor pair (a, a+1) on row y, under a building roof: drop the far edge column, keep the left door. */
function centreOutdoorDoor(rows: Rows, a: number, y: number): Rows {
  const key = buildingKey(at(rows, a, y - 1));
  if (!key) throw new Error(`door ${a},${y}: no building above it`);
  let left = a;
  while (buildingKey(at(rows, left - 1, y - 1)) === key) left -= 1;
  let right = a + 1;
  while (buildingKey(at(rows, right + 1, y - 1)) === key) right += 1;
  const width = right - left + 1;
  if (width % 2 !== 0 || a - left !== width / 2 - 1) {
    throw new Error(`door ${a},${y}: the pair is not centred on a ${width}-wide building`);
  }
  let top = y - 1;
  while (buildingKey(at(rows, a, top - 1)) === key) top -= 1;
  let bottom = y;
  for (let x = left; x <= right; x += 1) {
    if (isFacade(at(rows, x, y + 1))) bottom = y + 1;
  }
  const out = [...rows];
  for (let r = top; r <= bottom; r += 1) {
    if (!isBuildingPart(at(rows, right, r))) continue;
    // The removed column takes what lies beside the building: free ground when there is some, otherwise the solid planter beside it (the roof cell was solid too).
    const beside = [at(rows, right + 1, r), at(rows, left - 1, r)].filter(ch => !isBuildingPart(ch));
    const ground = beside.find(ch => !TILES[ch]?.solid) ?? beside[0];
    if (!ground) throw new Error(`door ${a},${y}: nothing beside the far edge at row ${r}`);
    out[r] = withChar(out[r], right, ground);
  }
  const beside = at(rows, a - 1, y);
  out[y] = withChar(out[y], a + 1, isFacade(beside) && !OUTDOOR_DOOR.has(beside) ? beside : "m");
  return out;
}

/** Interior mat pair (a, a+1) on row y: one mat stays. Floor above only one of them: that one is the way in. Otherwise the mat on the centre line of the floor, widening the floor by one column when an even floor is centred on the pair. */
function centreInteriorDoor(rows: Rows, a: number, y: number): { rows: Rows; record: DoorRecord } {
  let start = a;
  while (!isWall(at(rows, start - 1, y))) start -= 1;
  let end = a + 1;
  while (!isWall(at(rows, end + 1, y))) end += 1;
  const openAbove = [a, a + 1].filter(x => !isWall(at(rows, x, y - 1)));
  let out = rows;
  let kept: number;
  if (openAbove.length === 1) {
    kept = openAbove[0];
  } else if ((end - start + 1) % 2 === 0 && (start + end) / 2 === a + 0.5) {
    out = rows.map(row => row.slice(0, end + 1) + row[end] + row.slice(end + 1));
    end += 1;
    kept = (start + end) / 2;
  } else {
    const mid = (start + end) / 2;
    kept = Math.abs(a - mid) < Math.abs(a + 1 - mid) ? a : a + 1;
  }
  const dropped = kept === a ? a + 1 : a;
  const around = [at(out, dropped - 1, y), at(out, dropped + 1, y)].find(ch => ch !== INTERIOR_DOOR && !isWall(ch)) ?? "p";
  out[y] = withChar(out[y], dropped, around);
  return { rows: out, record: { y, dropped, kept } };
}

function warpAt(warps: WarpDef[], x: number, y: number): WarpDef | undefined {
  return warps.find(w => w.x === x && w.y === y);
}

/** Find one door pair on a map, or null when none is left. */
function findPair(map: MapDef, rows: Rows): { a: number; y: number } | null {
  const doorChars = map.outdoor ? OUTDOOR_DOOR : new Set([INTERIOR_DOOR]);
  for (const warp of map.warps) {
    const { x, y } = warp;
    if (!doorChars.has(at(rows, x, y))) continue;
    if (doorChars.has(at(rows, x - 1, y)) && warpAt(map.warps, x - 1, y)) continue;
    if (!doorChars.has(at(rows, x + 1, y)) || !warpAt(map.warps, x + 1, y)) continue;
    return { a: x, y };
  }
  return null;
}

/** Turn every two-tile doorway of the registry into one centred door. */
export function centreDoors(registry: Record<string, MapDef>): Record<string, MapDef> {
  const result: Record<string, MapDef> = {};
  const records = new Map<string, DoorRecord[]>();
  const failures: string[] = [];
  for (const [id, source] of Object.entries(registry)) {
    let rows: Rows = [...source.tiles];
    let warps: WarpDef[] = [...source.warps];
    const mapRecords: DoorRecord[] = [];
    for (let pair = findPair({ ...source, warps }, rows); pair; pair = findPair({ ...source, warps }, rows)) {
      const { a, y } = pair;
      try {
        if (source.outdoor) {
          rows = centreOutdoorDoor(rows, a, y);
          mapRecords.push({ y, dropped: a + 1, kept: a });
          warps = warps.filter(w => !(w.x === a + 1 && w.y === y));
        } else {
          const done = centreInteriorDoor(rows, a, y);
          rows = done.rows;
          mapRecords.push(done.record);
          warps = warps.filter(w => !(w.x === done.record.dropped && w.y === y));
        }
      } catch (error) {
        failures.push(`${id}: ${(error as Error).message}`);
        break;
      }
    }
    records.set(id, mapRecords);
    result[id] = { ...source, tiles: rows, warps };
  }
  if (failures.length) throw new Error(`door centring: ${failures.length} doorway(s) cannot be centred:\n${failures.join("\n")}`);
  // Warps that arrive on, or leave from, a removed tile follow the kept one.
  for (const map of Object.values(result)) {
    map.warps = map.warps.map(warp => {
      const targetRecords = records.get(warp.toMap) ?? [];
      const target = result[warp.toMap];
      if (!target) return warp;
      for (const record of targetRecords) {
        // Outdoors an exit lands on the street cell in front of the door; inside, an arrival lands on the floor above the mat.
        const onLine = target.outdoor ? warp.toY === record.y || warp.toY === record.y + 1 : warp.toY === record.y || warp.toY === record.y - 1;
        if (warp.toX === record.dropped && onLine) {
          return { ...warp, toX: record.kept };
        }
      }
      return warp;
    });
  }
  return result;
}
