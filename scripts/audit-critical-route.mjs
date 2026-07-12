import { MAPS } from "../src/data/maps.ts";
import { QUESTS } from "../src/data/quests.ts";

const graph = new Map(Object.keys(MAPS).map((id) => [id, new Set()]));
for (const [id, map] of Object.entries(MAPS)) {
  for (const warp of map.warps ?? []) graph.get(id).add(warp.toMap);
  for (const edge of Object.values(map.edges ?? {})) {
    if (edge) graph.get(id).add(edge.toMap);
  }
}

function shortestPath(from, to) {
  const queue = [[from]];
  const visited = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const current = path.at(-1);
    if (current === to) return path;
    for (const next of graph.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push([...path, next]);
    }
  }
  return null;
}

let current = "borgo";
let failed = false;
let maxTransit = 0;
const routes = [];
for (const quest of QUESTS.filter((entry) => !entry.side && entry.target)) {
  const path = shortestPath(current, quest.target.mapId);
  if (!path) {
    console.error(`IRRAGGIUNGIBILE: ${quest.id} (${current} -> ${quest.target.mapId})`);
    failed = true;
    continue;
  }
  const transit = path.length - 1;
  maxTransit = Math.max(maxTransit, transit);
  routes.push({ id: quest.id, transit, path });
  current = quest.target.mapId;
}

console.log(`PERCORSO CRITICO — ${routes.length} OBIETTIVI`);
for (const route of routes) {
  console.log(`${route.id.padEnd(25)} ${route.transit} transiti | ${route.path.join(" > ")}`);
}
console.log(`MASSIMO TRA OBIETTIVI: ${maxTransit} transiti`);

// Due mappe di transito sono il massimo approvato: oltre significherebbe
// ripercorrere una porzione consistente del mondo senza nuovo obiettivo.
if (maxTransit > 2) {
  console.error("FAIL: tratto critico con backtracking superiore a 2 mappe.");
  failed = true;
}
if (failed) process.exit(1);
