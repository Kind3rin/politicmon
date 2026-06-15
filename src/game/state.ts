import type { Facing } from "../art/characters";
import type { Monster } from "./monster";

export interface PlayerPos {
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
}

export interface GameState {
  party: Monster[];
  bag: Record<string, number>;
  dex: Record<string, "seen" | "caught">;
  flags: Record<string, boolean>;
  defeatedTrainers: string[];
  pickedItems: string[];
  pos: PlayerPos;
  starterId: string;
  money: number;
  badges: string[];
  sondaggi: number; // gradimento 0-100: sale con le vittorie, crolla con le figuracce
  ministri: Record<string, string>; // ministeroId -> uid del Politicmon incaricato
  bulldozed: string[]; // alberi abbattuti dalla RUSPA, chiavi "mapId:x:y"
  vehicle: string | null; // veicolo attivo: "monopattino" | "ruspa" | null
  rivalWins: number; // quante volte hai battuto il RIVALE GIANNI (memoria scontri)
  chips: number; // FICHE del casinò: valuta separata dai fondi (come i gettoni Pokémon)
}

export const SAVE_KEY = "politicmon-save-v6";
const LEGACY_KEYS = ["politicmon-save-v5", "politicmon-save-v4", "politicmon-save-v3"];

export function newGameState(): GameState {
  return {
    party: [],
    bag: { caffe: 3, scheda: 1, maalox: 1 },
    dex: {},
    flags: {},
    defeatedTrainers: [],
    pickedItems: [],
    pos: { mapId: "borgo", x: 14, y: 18, facing: "down" },
    starterId: "",
    money: 500,
    badges: [],
    sondaggi: 50,
    ministri: {},
    bulldozed: [],
    vehicle: null,
    rivalWins: 0,
    chips: 0
  };
}

export function markSeen(state: GameState, speciesId: string): void {
  if (!state.dex[speciesId]) {
    state.dex[speciesId] = "seen";
  }
}

export function markCaught(state: GameState, speciesId: string): void {
  state.dex[speciesId] = "caught";
}

export function saveGame(state: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function parseState(raw: string | null): GameState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!Array.isArray(parsed.party) || !parsed.pos) {
      return null;
    }
    parsed.money = parsed.money ?? 500;
    parsed.badges = parsed.badges ?? [];
    parsed.sondaggi = typeof parsed.sondaggi === "number" ? parsed.sondaggi : 50;
    parsed.ministri = parsed.ministri ?? {};
    parsed.bulldozed = Array.isArray(parsed.bulldozed) ? parsed.bulldozed : [];
    parsed.vehicle = parsed.vehicle ?? null;
    parsed.rivalWins = typeof parsed.rivalWins === "number" ? parsed.rivalWins : 0;
    parsed.chips = typeof parsed.chips === "number" ? parsed.chips : 0;
    return parsed;
  } catch {
    return null;
  }
}

export function loadGame(): GameState | null {
  const current = parseState(localStorage.getItem(SAVE_KEY));
  if (current) {
    return current;
  }
  // Migrazione dai salvataggi precedenti: stessi dati, campi nuovi al default.
  for (const key of LEGACY_KEYS) {
    const legacy = parseState(localStorage.getItem(key));
    if (legacy) {
      return legacy;
    }
  }
  return null;
}

export function hasSave(): boolean {
  if (localStorage.getItem(SAVE_KEY) !== null) {
    return true;
  }
  return LEGACY_KEYS.some((key) => localStorage.getItem(key) !== null);
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}
