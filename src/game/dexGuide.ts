import { MAPS } from "../data/maps";
import { SPECIES, STARTERS, type EvolutionRule } from "../data/species";
import { ITEMS } from "../data/items";
import { TYPE_ORDER, typeMultiplier } from "../data/poltypes";
import type { FeatureId } from "./features";
import type { GameState } from "./state";
import { speciesAvailable } from "./version";

export type DexFilter = "all" | "seen" | "caught" | "missing" | "here";
export const DEX_FILTERS: readonly DexFilter[] = ["all", "seen", "caught", "missing", "here"];
export const DEX_FILTER_LABELS: Record<DexFilter, string> = { all: "TUTTI", seen: "VISTI", caught: "ELETTI", missing: "MANCANTI", here: "QUI" };

// Follow the same gates as travel. A field guide must not send a player through
// a closed border or promise encounters exclusive to another version.
export function reachableDexMaps(state: GameState, features: Partial<Record<FeatureId, boolean>> = {}): Set<string> {
  const found = new Set<string>();
  const queue = [state.pos.mapId];
  while (queue.length) {
    const id = queue.shift()!;
    const map = MAPS[id];
    if (!map || found.has(id)) continue;
    found.add(id);
    for (const warp of map.warps) {
      if ((warp.requiresBadges ?? 0) > state.badges.length || (warp.requiresFlag && !state.flags[warp.requiresFlag]) || (warp.requiresFeature && features[warp.requiresFeature] === false)) continue;
      queue.push(warp.toMap);
    }
    for (const edge of Object.values(map.edges ?? {})) if ((edge.requiresBadges ?? 0) <= state.badges.length) queue.push(edge.toMap);
  }
  return found;
}

export function dexHabitats(id: string, state: GameState, reachable = reachableDexMaps(state)) {
  if (!speciesAvailable(id, state.browserSeed)) return [];
  return Object.values(MAPS).flatMap((map) => {
    if (!reachable.has(map.id)) return [];
    const pool = (map.encounters ?? []).filter((e) => e.weight > 0 && speciesAvailable(e.speciesId, state.browserSeed));
    const hits = pool.filter((e) => e.speciesId === id);
    if (!hits.length) return [];
    const weight = hits.reduce((n, e) => n + e.weight, 0);
    return [{ mapId: map.id, name: map.name, minLv: Math.min(...hits.map((e) => e.minLv)), maxLv: Math.max(...hits.map((e) => e.maxLv)), share: weight / pool.reduce((n, e) => n + e.weight, 0) }];
  }).sort((a, b) => Number(b.mapId === state.pos.mapId) - Number(a.mapId === state.pos.mapId) || b.share - a.share);
}

export function dexMatches(id: string, filter: DexFilter, state: GameState): boolean {
  if (filter === "seen") return !!state.dex[id];
  if (filter === "caught") return state.dex[id] === "caught";
  if (filter === "missing") return state.dex[id] !== "caught";
  if (filter === "here") return speciesAvailable(id, state.browserSeed) && !!MAPS[state.pos.mapId]?.encounters?.some((e) => e.speciesId === id && e.weight > 0);
  return true;
}

export function evolutionCondition(rule: EvolutionRule, previous: readonly EvolutionRule[] = []): string {
  const bits: string[] = [];
  if (rule.level !== undefined) bits.push(`LIVELLO ${rule.level}`);
  if (rule.item) bits.push(`USA ${ITEMS[rule.item]?.name ?? rule.item.toUpperCase()}`);
  if (rule.trade) bits.push("SCAMBIO ONLINE");
  if (rule.minSondaggi !== undefined) bits.push(`SONDAGGI DA ${rule.minSondaggi}`);
  if (rule.maxSondaggi !== undefined) bits.push(`SONDAGGI FINO A ${rule.maxSondaggi}`);
  // Unconditional fallback branches still have a political condition because
  // the first eligible rule wins in levelEvolution. Show that actual boundary.
  if (rule.level !== undefined && rule.minSondaggi === undefined && rule.maxSondaggi === undefined) {
    const fork = previous.find((r) => r.level === rule.level && r.minSondaggi !== undefined);
    if (fork) bits.push(`SONDAGGI SOTTO ${fork.minSondaggi}`);
  }
  return bits.join(" + ");
}

export function dexAcquisitionNotes(id: string, state: GameState, reachable = reachableDexMaps(state)): string[] {
  if (!speciesAvailable(id, state.browserSeed)) return ["ESCLUSIVA DELL'ALTRA VERSIONE.", "SCAMBIO ONLINE CON UN ALTRO GIOCATORE: PARLA > SCAMBIO."];
  const locations = dexHabitats(id, state, reachable);
  const notes: string[] = [];
  if (locations.length) {
    notes.push("INCONTRI SELVATICI ACCESSIBILI:");
    for (const h of locations) notes.push(`${h.name}: LV ${h.minLv}-${h.maxLv}, ${h.share < .05 ? "RARISSIMO" : h.share < .15 ? "RARO" : h.share < .3 ? "REGOLARE" : "COMUNE"}.`);
    notes.push("LA RARITÀ È NEL POOL, NON LA PROBABILITÀ PER PASSO.");
  }
  for (const map of Object.values(MAPS)) if (reachable.has(map.id)) for (const npc of map.npcs) {
    const legend = npc.legendary;
    if (legend?.speciesId !== id || (npc.showIfFlag && !state.flags[npc.showIfFlag]) || (npc.hideIfFlag && state.flags[npc.hideIfFlag])) continue;
    notes.push(`${map.name}: INCONTRO UNICO ${state.flags[legend.flag] ? "GIÀ RISOLTO" : "DA CERCARE"}.`);
  }
  const parents = Object.values(SPECIES).filter((s) => s.evolutions?.some((r) => r.id === id));
  for (const parent of parents) for (const [i, rule] of (parent.evolutions ?? []).entries()) if (rule.id === id) notes.push(`DA ${parent.name}: ${evolutionCondition(rule, parent.evolutions?.slice(0, i))}.`);
  if (STARTERS.some((starter) => starter === id)) notes.push(state.starterId === id ? "IL TUO STARTER." : "STARTER NON SCELTO: SCAMBIO CON UN ALTRO GIOCATORE.");
  if (!notes.length) notes.push("NESSUN INCONTRO ACCESSIBILE ORA. ESPLORA E APRI NUOVI PERCORSI.");
  return notes;
}

export function defensiveMatchups(id: string) {
  return TYPE_ORDER.map((type) => ({ type, mult: typeMultiplier(type, SPECIES[id].types) }));
}
