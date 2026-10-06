import type { MapDef, PickupDef, PowerSpot } from "./types";

/**
 * Where the field powers matter: small glades and nooks cut into the woods, sealed in a way that one power opens.
 * Each has something worth the detour, and none of them is on the way to anywhere: the road never needs a power.
 * Applied to the registry once, so the maps stay readable as drawn.
 */
interface Site { map: string; edits: [number, number, string][]; spots?: PowerSpot[]; pickups?: PickupDef[] }

const row = (y: number, x0: number, x1: number, ch: string): [number, number, string][] => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y, ch]);

type Reward = { id: string; itemId: string; qty: number; hidden?: boolean };

/**
 * A nook in the two-tile wood along a map's side edge, off the road: `W` is the west edge, `E` the east.
 * `tape` is a ribbon across the way in; `ditch` a channel to bridge; `boulder` a stone to push out to the very edge, with the treasure under it.
 */
function edgeNook(map: string, width: number, side: "W" | "E", y: number, kind: "tape" | "ditch" | "boulder", rewards: [Reward, Reward]): Site {
  const x1 = side === "W" ? 1 : width - 2, x0 = side === "W" ? 0 : width - 1, power = kind === "tape" ? "taglio" : kind === "ditch" ? "ponte" : "spallata";
  if (kind === "boulder") {
    // The treasure is under the stone: push it out to the edge, step where it was.
    return { map, edits: [[x1, y, "."], [x0, y, "."]], spots: [{ id: `${map}-masso-${side}${y}`, kind: "boulder", x: x1, y }],
      pickups: [{ ...rewards[0], x: x1, y, power, hidden: true }] };
  }
  return { map, edits: [[x1, y, kind === "ditch" ? "w" : "."], [x0, y - 1, "."], [x0, y, "."], [x0, y + 1, "."]],
    spots: kind === "tape" ? [{ id: `${map}-nastro-${side}${y}`, kind: "tape", x: x1, y }] : undefined,
    pickups: [{ ...rewards[0], x: x0, y: y - 1, power }, { ...rewards[1], x: x0, y: y + 1, power }] };
}

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
  ,
  // The nooks along the edges of the older maps: worth a trip back once the powers are open (the state flight makes it short).
  edgeNook("borgo", 30, "W", 2, "tape", [{ id: "pk-nook-borgo-a", itemId: "telecamera", qty: 1 }, { id: "pk-nook-borgo-b", itemId: "spritz", qty: 2, hidden: true }]),
  edgeNook("route1", 29, "W", 14, "ditch", [{ id: "pk-nook-r1-a", itemId: "sondtruccato", qty: 1 }, { id: "pk-nook-r1-b", itemId: "schedona", qty: 2, hidden: true }]),
  edgeNook("mediopoli", 30, "E", 3, "boulder", [{ id: "pk-nook-med-a", itemId: "dirWhatever", qty: 1 }, { id: "pk-nook-med-b", itemId: "gilet", qty: 1 }]),
  edgeNook("eurotown", 30, "W", 9, "tape", [{ id: "pk-nook-eu-a", itemId: "agendarossa", qty: 1 }, { id: "pk-nook-eu-b", itemId: "mojito", qty: 2, hidden: true }]),
  edgeNook("route3", 29, "E", 20, "tape", [{ id: "pk-nook-r3-a", itemId: "caffettiera", qty: 1 }, { id: "pk-nook-r3-b", itemId: "dirPiazza", qty: 1 }]),
  edgeNook("antenna", 30, "E", 14, "ditch", [{ id: "pk-nook-ant-a", itemId: "dirGreen", qty: 1 }, { id: "pk-nook-ant-b", itemId: "maalox", qty: 2, hidden: true }])
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
