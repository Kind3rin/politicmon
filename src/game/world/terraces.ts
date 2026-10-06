/** Terraces: ground that sits higher than its neighbours.
 *
 * Nothing here moves the camera or the player. A height is the number of steps
 * you had to climb to get there, read off the map itself:
 *   `%` earth bank and `&` stone wall are faces. You can hop down them (south), never climb them.
 *   `E` and `l` are stairs. Going north across one raises the ground by one level.
 * So authors draw terraces with the tiles they already know and every map gets the same rules. */
import { TILES } from "../../art/tiles";

export const BANK = "%";
export const WALL = "&";
export const isFace = (ch: string | undefined): boolean => ch === BANK || ch === WALL;
export const isStair = (ch: string | undefined): boolean => ch === "E" || ch === "l";

export interface TerraceSource {
  tiles: readonly string[];
  warps: readonly { x: number; y: number }[];
  edges?: { north?: unknown; south?: unknown };
}

export interface Terraces {
  width: number;
  height: number;
  /** 0 = valley floor. Faces and unreached ground read as 0. */
  levels: Uint8Array;
  top: number;
  at(x: number, y: number): number;
}

const FLAT: Terraces = { width: 0, height: 0, levels: new Uint8Array(0), top: 0, at: () => 0 };

const walkable = (ch: string | undefined): boolean => {
  if (!ch) return false;
  const tile = TILES[ch];
  return Boolean(tile && !tile.solid && !tile.water && !tile.ledge);
};

export function terraceLevels(map: TerraceSource): Terraces {
  const rows = map.tiles, height = rows.length, width = Math.max(0, ...rows.map(row => row.length));
  if (!rows.some(row => /[%&El]/.test(row))) return FLAT;
  const ch = (x: number, y: number) => rows[y]?.[x];
  const UNSET = -100;
  const level = new Int8Array(width * height).fill(UNSET);
  const key = (x: number, y: number) => y * width + x;
  const queue: [number, number][] = [];
  const set = (x: number, y: number, value: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height || level[key(x, y)] !== UNSET) return;
    level[key(x, y)] = value; queue.push([x, y]);
  };
  const run = () => {
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i], here = level[key(x, y)], onStair = isStair(ch(x, y));
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const nx = x + dx, ny = y + dy, next = ch(nx, ny);
        if (walkable(next)) {
          // A stair belongs to its lower side. Leaving it to the north is the climb; entering it from the north is the descent.
          const up = dy === -1 && onStair && !isStair(next), down = dy === 1 && isStair(next) && !onStair;
          set(nx, ny, here + (up ? 1 : 0) - (down ? 1 : 0));
        } else if (isFace(next) && dy === 1 && walkable(ch(nx, ny + 1)) && !isFace(ch(nx, ny + 1))) {
          // Hop: a single face, the landing is the row under it. A taller wall cannot be hopped, only taken by the stairs.
          set(nx, ny + 1, here - 1);
        }
      }
    }
  };
  // One seed is enough: doors can sit on any terrace (the palace door is up the stairs), so the level is read from how you got there.
  const first = map.warps.find(warp => walkable(ch(warp.x, warp.y)));
  if (first) set(first.x, first.y, 0);
  else if (map.edges?.south) { const x = Array.from({ length: width }, (_, i) => i).find(i => walkable(ch(i, height - 1))); if (x !== undefined) set(x, height - 1, 0); }
  run();
  // Ground nothing led to (a closed field behind trees) takes the level of its first reached neighbour, else 0.
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (level[key(x, y)] === UNSET && walkable(ch(x, y))) { set(x, y, 0); run(); }
  const lowest = Math.min(0, ...Array.from(level).filter(v => v !== UNSET));
  const levels = new Uint8Array(width * height);
  let top = 0;
  for (let i = 0; i < level.length; i++) {
    const value = level[i] === UNSET ? 0 : Math.max(0, level[i] - lowest);
    levels[i] = value; if (value > top) top = value;
  }
  return { width, height, levels, top, at: (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : levels[key(x, y)]) };
}
