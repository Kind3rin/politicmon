import { writeFileSync } from "node:fs";
import { MAPS } from "../src/data/maps.ts";

const labels = Object.fromEntries(Object.values(MAPS).map(map => [map.id, map.name]));
writeFileSync("src/data/maps/names.ts",
  "// Generated lightweight labels. Run: node --import tsx scripts/sync-map-labels.mjs\n" +
  "// The content test checks these against the authoritative world registry.\n" +
  "export const MAP_NAMES: Readonly<Record<string, string>> = Object.assign(Object.create(null), " + JSON.stringify(labels, null, 2) + ");\n");
