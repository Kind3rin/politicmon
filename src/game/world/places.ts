/** Places: the doors, roads and docks of a map, named the way a person would ask for them.
 * Pure data read off the map, so the plan, the in-world signs and the tests all agree. */
import { isFacade, isRoof, TILES } from "../../art/tiles";
import type { MapDef } from "../../data/maps/types";
import { MAP_NAMES } from "../../data/maps/names";

export type PlaceKind = "door" | "exit" | "dock";

export interface Place {
  id: string;
  kind: PlaceKind;
  label: string;
  /** What the place is for, in a few words: "Cura gratis", "Negozio". */
  detail?: string;
  /** Tile to walk to: the door, or the road at the edge of the map. */
  x: number;
  y: number;
  /** Tiles the place spans (a two-tile door, a road four tiles wide). */
  x2: number;
  y2: number;
  /** Where its sign hangs: above the roof for a building, above the tile otherwise. */
  signX: number;
  signY: number;
  /** For exits: which edge of the map the road leaves by. */
  edge?: "north" | "south";
  to: string;
  /** Badges needed to pass, when the way is gated. */
  requiresBadges?: number;
}

const SHORT: Record<string, string> = {
  lab: "Laboratorio", home: "Casa tua", circolo: "Circolo", market1: "Discount", market2: "Discount",
  gymtv: "Studio 5", gymue: "Palestra UE", gymglobal: "Global Tower", casino: "Casinò", palazzo: "Palazzo",
  attico: "Attico", redazione: "Redazione", lobbystudio: "Lobbying", bistrot: "Bistrot", salotto: "Salotto",
  retroscena: "Retroscena", covo: "Retrobottega", chiosco: "Chiosco", commissione: "Commissione",
  grotta1: "Grotta", grotta2: "Archivio", tour_feed: "Tour del feed", diplomacy_lobby: "Hotel diplomatico",
  futuro_sede: "Sede", retropalco_campo: "Retropalco", palazzo_feed: "Palazzo dei feed"
};

const sentence = (text: string) => text.charAt(0) + text.slice(1).toLocaleLowerCase("it");

/** Short name of a map for signs and lists. */
export function placeName(mapId: string): string {
  if (SHORT[mapId]) return SHORT[mapId];
  if (mapId.startsWith("bar")) return "Bar";
  return sentence(MAP_NAMES[mapId] ?? mapId);
}

/** What a visit is good for, from the people inside. */
export function placeDetail(target: MapDef | undefined): string | undefined {
  if (!target) return undefined;
  const found: string[] = [];
  const has = (test: (npc: MapDef["npcs"][number]) => boolean) => target.npcs.some(test);
  if (has(npc => Boolean(npc.healer))) found.push("cura gratis");
  if (has(npc => Boolean(npc.shop))) found.push("negozio");
  if (has(npc => Boolean(npc.box))) found.push("box squadra");
  if (has(npc => Boolean(npc.casino))) found.push("casinò");
  if (has(npc => Boolean(npc.transport))) found.push("viaggi");
  if (target.id.startsWith("gym") || has(npc => Boolean(npc.trainerId) && /^boss|^gym|capo|leader/i.test(npc.trainerId ?? ""))) found.push("palestra");
  const text = found.join(" · ");
  return text ? text.charAt(0).toLocaleUpperCase("it") + text.slice(1) : undefined;
}

export function mapPlaces(map: MapDef, maps: Readonly<Record<string, MapDef>>): Place[] {
  const rows = map.tiles, width = Math.max(0, ...rows.map(row => row.length)), height = rows.length;
  const places: Place[] = [];
  const open = (x: number, y: number) => {
    const tile = TILES[rows[y]?.[x] ?? ""];
    return Boolean(tile && !tile.solid && !tile.water && !tile.ledge);
  };
  // Doors: neighbouring warps to the same place are one door, however many tiles wide or tall.
  const groups: (typeof map.warps[number])[][] = [];
  for (const warp of [...map.warps].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const group = groups.find(g => g[0].toMap === warp.toMap && g[0].markerLabel === warp.markerLabel
      && g.some(other => Math.abs(other.x - warp.x) + Math.abs(other.y - warp.y) === 1));
    if (group) group.push(warp); else groups.push([warp]);
  }
  for (const group of groups) {
    const warp = group[0], target = maps[warp.toMap];
    const x2 = Math.max(...group.map(w => w.x)), y2 = Math.max(...group.map(w => w.y));
    const door = ["d", "D", "g"].includes(rows[warp.y]?.[warp.x] ?? "");
    const inside = Boolean(target && !target.outdoor) || !map.outdoor;
    const leaving = !map.outdoor && Boolean(target?.outdoor);
    // A road that leaves by the side of the map is a gate, not a door: say which way it goes.
    const gate = map.outdoor && target?.outdoor && !door && group.every(w => w.x === 0) ? "◀ " : map.outdoor && target?.outdoor && !door && group.every(w => w.x === width - 1) ? "▶ " : "";
    const marker = warp.markerLabel ? sentence(warp.markerLabel.replace(/^(ROTTA|TRAGHETTO|VERTICE):\s*/i, "")) : undefined;
    // A building: climb from the door through facade and roof to find where its sign belongs.
    let top = warp.y;
    while (door && top > 0 && (isFacade(rows[top - 1]?.[warp.x] ?? "") || isRoof(rows[top - 1]?.[warp.x] ?? ""))) top -= 1;
    places.push({
      id: `${warp.toMap}@${warp.x},${warp.y}`, kind: door || inside ? "door" : "dock",
      label: marker ?? (leaving ? "Esci" : `${gate}${placeName(warp.toMap)}`), detail: leaving ? placeName(warp.toMap) : inside && map.outdoor ? placeDetail(target) : undefined,
      x: warp.x, y: warp.y, x2, y2, signX: (warp.x + x2 + 1) / 2, signY: top, to: warp.toMap,
      requiresBadges: warp.requiresBadges
    });
  }
  // Roads: where the map ends and another begins.
  for (const edge of ["north", "south"] as const) {
    const target = map.edges?.[edge];
    if (!target) continue;
    const y = edge === "north" ? 0 : height - 1;
    const xs = Array.from({ length: width }, (_, x) => x).filter(x => open(x, y));
    if (!xs.length) continue;
    // The road is the widest unbroken run on the border row.
    let best = [xs[0]], run = [xs[0]];
    for (const x of xs.slice(1)) { run = x === run[run.length - 1] + 1 ? [...run, x] : [x]; if (run.length > best.length) best = run; }
    places.push({
      id: `${target.toMap}:${edge}`, kind: "exit", label: placeName(target.toMap), edge, to: target.toMap,
      x: best[Math.floor(best.length / 2)], y, x2: best[best.length - 1], y2: y, signX: (best[0] + best[best.length - 1] + 1) / 2, signY: y,
      requiresBadges: target.requiresBadges
    });
  }
  return places;
}

/** Compass words from a tile to another, for "a nord-ovest, 9 passi". */
export function compass(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = toX - fromX, dy = toY - fromY;
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return "qui";
  const ratio = Math.abs(dx) / Math.max(1, Math.abs(dy));
  const vertical = dy < 0 ? "nord" : "sud", horizontal = dx < 0 ? "ovest" : "est";
  if (ratio < 0.4) return vertical;
  if (ratio > 2.5) return horizontal;
  return `${vertical}-${horizontal}`;
}
