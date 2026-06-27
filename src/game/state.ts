import type { Facing } from "../art/characters";
import type { Monster } from "./monster";
import { statsOf } from "./monster";

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
  boxed: Monster[]; // CIRCOLO DI PARTITO: mostri catturati con la squadra piena (box PC)
}

export const SAVE_KEY = "politicmon-save-v7";
const LEGACY_KEYS = [
  "politicmon-save-v6",
  "politicmon-save-v5",
  "politicmon-save-v4",
  "politicmon-save-v3"
];

export function newGameState(): GameState {
  return {
    party: [],
    bag: { caffe: 6, scheda: 2, maalox: 1 },
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
    chips: 0,
    boxed: []
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

// Stato di gioco "attivo" registrato dalla scena di mondo: serve a main.ts per
// salvare quando l'app va in background / viene chiusa (su mobile l'OS può
// uccidere la scheda senza preavviso). null finché non c'è una partita in corso.
let activeState: GameState | null = null;

export function setActiveState(state: GameState | null): void {
  activeState = state;
}

// Salva lo stato attivo se esiste una partita reale in corso. Chiamata dagli
// handler di lifecycle (visibilitychange/pagehide). Non sovrascrive un save
// valido quando si è ancora alla schermata del titolo (party vuoto).
export function flushActiveState(): void {
  if (activeState && activeState.party.length > 0) {
    saveGame(activeState);
  }
}

export function saveGame(state: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    // Quota piena o serializzazione fallita: logga una volta (non spammare).
    if (!saveFailedLogged) {
      console.warn("[save] salvataggio fallito", err);
      saveFailedLogged = true;
    }
    return false;
  }
}

let saveFailedLogged = false;

function parseState(raw: string | null): GameState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!Array.isArray(parsed.party) || !parsed.pos) {
      return null;
    }
    // Default difensivo di OGNI campo: un save parziale/legacy non deve mai
    // lasciare una collection undefined (crash a runtime fuori dal try/catch).
    parsed.bag = parsed.bag ?? { caffe: 6, scheda: 2, maalox: 1 };
    parsed.dex = parsed.dex ?? {};
    parsed.flags = parsed.flags ?? {};
    parsed.defeatedTrainers = Array.isArray(parsed.defeatedTrainers) ? parsed.defeatedTrainers : [];
    parsed.pickedItems = Array.isArray(parsed.pickedItems) ? parsed.pickedItems : [];
    parsed.starterId = parsed.starterId ?? "";
    parsed.money = parsed.money ?? 500;
    parsed.badges = Array.isArray(parsed.badges) ? parsed.badges : [];
    parsed.sondaggi = typeof parsed.sondaggi === "number" ? parsed.sondaggi : 50;
    parsed.ministri = parsed.ministri ?? {};
    parsed.bulldozed = Array.isArray(parsed.bulldozed) ? parsed.bulldozed : [];
    parsed.vehicle = parsed.vehicle ?? null;
    parsed.rivalWins = typeof parsed.rivalWins === "number" ? parsed.rivalWins : 0;
    parsed.chips = typeof parsed.chips === "number" ? parsed.chips : 0;
    parsed.boxed = Array.isArray(parsed.boxed) ? parsed.boxed : [];

    // Rete di sicurezza sugli HP: un mon caricato non deve avere hp invalido, e
    // il party non può essere interamente svenuto al load. Succede se l'app
    // viene uccisa in background mentre una lotta persa è in corso (il flush di
    // lifecycle salva il party a 0 HP prima che onBattleEnd lo curi al risveglio).
    if (parsed.party.length > 0) {
      for (const mon of parsed.party) {
        const max = statsOf(mon).hp;
        if (typeof mon.hp !== "number" || Number.isNaN(mon.hp)) {
          mon.hp = max;
        }
        mon.hp = Math.max(0, Math.min(max, mon.hp));
      }
      if (parsed.party.every((m) => m.hp <= 0)) {
        for (const mon of parsed.party) {
          mon.hp = statsOf(mon).hp;
          mon.status = null;
        }
      }
    }
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
      // Ri-persisti subito sotto la chiave corrente e rimuovi la vecchia,
      // così la migrazione avviene una sola volta.
      saveGame(legacy);
      localStorage.removeItem(key);
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
