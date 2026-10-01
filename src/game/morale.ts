import type { GameState } from "./state";

export const PROMISES = {
  bus: { title: "CORSA DEL BORGO", cost: 180, steps: 3 },
  sportello: { title: "SPORTELLO APERTO", cost: 260, steps: 3 },
  traghetto: { title: "MOLO ACCESSIBILE", cost: 450, steps: 3 }
} as const;
export type PromiseId = keyof typeof PROMISES;
export type PromiseStatus = "pending" | "kept" | "broken" | "repaired";
export interface CivicPromise { id: PromiseId; dueAt: number; status: PromiseStatus; }
export interface MoraleRecord { label: string; trust: number; cohesion: number; }
export interface MoraleState {
  trust: number;
  cohesion: number;
  progress: number;
  promises: CivicPromise[];
  decisions: string[];
  history: MoraleRecord[];
}

const bounded = (value: unknown, fallback: number, max = 100): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : fallback;

export function newMoraleState(): MoraleState {
  return { trust: 50, cohesion: 60, progress: 0, promises: [], decisions: [], history: [] };
}

export function normalizeMorale(value: unknown): MoraleState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return newMoraleState();
  const raw = value as Partial<MoraleState>;
  const seen = new Set<string>();
  const promises: CivicPromise[] = [];
  for (const entry of Array.isArray(raw.promises) ? raw.promises : []) {
    if (!entry || !Object.hasOwn(PROMISES, entry.id) || seen.has(entry.id)) continue;
    seen.add(entry.id);
    promises.push({ id: entry.id, dueAt: bounded(entry.dueAt, 3, 10000), status: ["pending", "kept", "broken", "repaired"].includes(entry.status) ? entry.status : "pending" });
  }
  return {
    trust: bounded(raw.trust, 50), cohesion: bounded(raw.cohesion, 60), progress: bounded(raw.progress, 0, 10000), promises,
    decisions: Array.isArray(raw.decisions) ? [...new Set(raw.decisions.filter((id): id is string => typeof id === "string" && /^[a-z0-9:_-]{1,80}$/.test(id)))].slice(-128) : [],
    history: Array.isArray(raw.history) ? raw.history.filter((row) => row && typeof row.label === "string").slice(-6).map((row) => ({ label: row.label.slice(0, 38), trust: bounded(row.trust + 100, 100, 200) - 100, cohesion: bounded(row.cohesion + 100, 100, 200) - 100 })) : []
  };
}

export function changeMorale(state: GameState, label: string, trust = 0, cohesion = 0): void {
  const before = state.morale;
  const nextTrust = bounded(before.trust + trust, before.trust);
  const nextCohesion = bounded(before.cohesion + cohesion, before.cohesion);
  state.morale = { ...before, trust: nextTrust, cohesion: nextCohesion,
    history: [...before.history, { label: label.slice(0, 38), trust: nextTrust - before.trust, cohesion: nextCohesion - before.cohesion }].slice(-6) };
}

// I sondaggi misurano l'attenzione; questi valori ricordano COME l'hai ottenuta.
// Bonus contenuti e nessuna perdita di turni/HP: il PvP resta indipendente.
export function moraleExpMultiplier(morale: MoraleState): number {
  return morale.cohesion >= 70 ? 1.08 : morale.cohesion < 30 ? 0.92 : 1;
}
export function trustPriceAdjustment(morale: MoraleState): number {
  return morale.trust >= 70 ? -0.05 : morale.trust < 30 ? 0.05 : 0;
}

export function pledgePromise(state: GameState, id: PromiseId): boolean {
  if (state.morale.promises.some((promise) => promise.id === id)) return false;
  state.morale = { ...state.morale, promises: [...state.morale.promises, { id, status: "pending", dueAt: state.morale.progress + PROMISES[id].steps }] };
  return true;
}

export function promiseCost(promise: CivicPromise): number {
  return Math.round(PROMISES[promise.id].cost * (promise.status === "broken" ? 1.5 : 1));
}

export function keepPromise(state: GameState, id: PromiseId): "kept" | "repaired" | "funds" | "unavailable" {
  const promise = state.morale.promises.find((entry) => entry.id === id);
  if (!promise || (promise.status !== "pending" && promise.status !== "broken")) return "unavailable";
  const cost = promiseCost(promise);
  if (state.money < cost) return "funds";
  state.money -= cost;
  const status = promise.status === "broken" ? "repaired" : "kept";
  state.morale = { ...state.morale, promises: state.morale.promises.map((entry) => entry.id === id ? { ...entry, status } : entry) };
  changeMorale(state, `${status === "kept" ? "MANTENUTA" : "RIPARATA"}: ${PROMISES[id].title}`, status === "kept" ? 12 : 7, status === "kept" ? 6 : 3);
  return status;
}

// Avanza SOLO battendo un allenatore nuovo della storia. Rivincite e selvatici
// non consumano la scadenza e non permettono di coltivare fiducia all'infinito.
export function advanceMoraleProgress(state: GameState): string[] {
  const progress = state.morale.progress + 1;
  const due = state.morale.promises.filter((promise) => promise.status === "pending" && promise.dueAt <= progress);
  state.morale = { ...state.morale, progress, promises: state.morale.promises.map((promise) => due.includes(promise) ? { ...promise, status: "broken" } : promise) };
  for (const promise of due) changeMorale(state, `SCADUTA: ${PROMISES[promise.id].title}`, -12, -6);
  return due.map((promise) => `${PROMISES[promise.id].title}: promessa scaduta. Fiducia -12, coesione -6. Puoi ancora rimediare dal menu MORALE.`);
}

export function moraleEpilogue(morale: MoraleState): string[] {
  const kept = morale.promises.filter((promise) => promise.status === "kept").length;
  const repaired = morale.promises.filter((promise) => promise.status === "repaired").length;
  const open = morale.promises.filter((promise) => promise.status === "pending" || promise.status === "broken").length;
  return [
    morale.trust >= 70 ? "TI AFFIDANO UN PROBLEMA, NON SOLO UN VOTO." : morale.trust < 30 ? "TI RICONOSCONO. CHIEDONO UNA RICEVUTA." : "IL QUARTIERE ASPETTA IL PROSSIMO VERBALE.",
    morale.cohesion >= 70 ? "LA SQUADRA RESTA ANCHE A CAMERE SPENTE." : morale.cohesion < 30 ? "LA SQUADRA HA GIÀ APERTO TRE CHAT NUOVE." : "I VOLONTARI CHIEDONO UNA DATA, NON UNO SLOGAN.",
    `${kept} MANTENUTE. ${repaired} RIPARATE. ${open} APERTE.`
  ];
}
