import type { MapDef, PickupDef, PowerSpot } from "./types";

/**
 * Where the field powers matter: small glades and nooks cut into the woods, sealed in a way that one power opens.
 * Each has something worth the detour, and none of them is on the way to anywhere: the road never needs a power.
 * Applied to the registry once, so the maps stay readable as drawn.
 */
interface Site { map: string; edits: [number, number, string][]; spots?: PowerSpot[]; pickups?: PickupDef[] }

const row = (y: number, x0: number, x1: number, ch: string): [number, number, string][] => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y, ch]);

export const POWER_SITES: readonly Site[] = [
  // Percorso 2, north wood: a glade behind barrier tape (TAGLIO LINEARE).
  { map: "route2", edits: [[10, 4, "."], ...row(3, 9, 11, "."), [10, 2, "."]],
    spots: [{ id: "r2-nastro-nord", kind: "tape", x: 10, y: 4 }],
    pickups: [{ id: "pk-r2-radura", x: 10, y: 2, itemId: "dirFiamma", qty: 1, power: "taglio" }, { id: "pk-r2-radura-b", x: 9, y: 3, itemId: "mojito", qty: 2, power: "taglio" }] },
  // Percorso 2, north wood: a bank to climb (SCALATA).
  { map: "route2", edits: [[17, 4, "%"], ...row(3, 15, 19, "."), ...row(2, 16, 18, ".")],
    pickups: [{ id: "pk-r2-belvedere", x: 15, y: 3, itemId: "dirMulta", qty: 1, power: "scalata" }, { id: "pk-r2-belvedere-b", x: 17, y: 2, itemId: "schedona", qty: 2, power: "scalata", hidden: true }] },
  // Caput Mundi, south wood: a boulder to push out of the way (SPALLATA).
  { map: "capitale", edits: [[19, 21, "."], ...row(22, 18, 20, "."), [19, 23, "."]],
    spots: [{ id: "cap-masso-sud", kind: "boulder", x: 19, y: 22 }],
    pickups: [{ id: "pk-cap-cantiere", x: 18, y: 22, itemId: "dirSciopero", qty: 1, power: "spallata" }, { id: "pk-cap-cantiere-b", x: 20, y: 22, itemId: "maalox", qty: 2, power: "spallata" }] },
  // Caput Mundi, south wood: a ditch to bridge (DECRETO PONTE).
  { map: "capitale", edits: [[27, 21, "w"], ...row(22, 26, 27, ".")],
    pickups: [{ id: "pk-cap-fosso", x: 26, y: 22, itemId: "dirInciucio", qty: 1, power: "ponte" }, { id: "pk-cap-fosso-b", x: 27, y: 22, itemId: "caffe", qty: 3, power: "ponte", hidden: true }] }
];

export function applyPowerSites(registry: Record<string, MapDef>): void {
  for (const site of POWER_SITES) {
    const map = registry[site.map];
    const rows = map.tiles.map(r => r.split(""));
    for (const [x, y, ch] of site.edits) rows[y][x] = ch;
    map.tiles = rows.map(r => r.join(""));
    if (site.spots) map.spots = [...(map.spots ?? []), ...site.spots];
    if (site.pickups) map.pickups = [...map.pickups, ...site.pickups];
  }
}
