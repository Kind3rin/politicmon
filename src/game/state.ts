import type { Facing } from "../art/characters";
import type { Monster } from "./monster";
import { expForLevel, statsOf } from "./monster";

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
  lastBar: string; // id dell'ultima città-con-bar visitata: respawn al KO totale
  zoneRewardsClaimed: string[]; // id zone Dex già ricompensate al 100% catture
  stepsTotal: number; // contatore passi PERSISTENTE: orologio dei cooldown di RIVINCITA
  trainerRematch: Record<string, number>; // trainerId -> stepsTotal all'ultima vittoria (cooldown rematch)
  lastDailyDate: string; // data LOCALE YYYY-MM-DD dell'ultima SFIDA DEL GIORNO vinta ("" = mai)
  repellentSteps: number; // passi rimanenti di repellente attivo (SPRAY ANTI-COMIZIO)
  dailyStreak: number; // giorni consecutivi di SFIDA DEL GIORNO vinte
  duelWins: number; // duelli PvP vinti (scritti a duello CHIUSO, mai durante)
  duelLosses: number; // duelli PvP persi
  dailyQuestsDone: string[]; // id missioni giornaliere completate oggi ("YYYY-MM-DD:idx")
  lastDailyQuestDate: string; // data locale YYYY-MM-DD del reset missioni giornaliere
  browserSeed: number; // 0 = non inizializzato; intero 1..2^31-1, divide i giocatori in versione A/B
}

// Seed "di installazione": generato una volta e persistito nel save. Divide i
// giocatori in versione GOVERNO/OPPOSIZIONE (pari/dispari).
function rollBrowserSeed(): number {
  return 1 + Math.floor(Math.random() * (2 ** 31 - 1));
}

export const SAVE_KEY = "politicmon-save-v11";
// Copia dell'ULTIMO valore valido salvato: loadGame la prova se il primario
// non parsa (localStorage troncato/corrotto).
const BACKUP_KEY = "politicmon-save-v11.bak";
const LEGACY_KEYS = [
  "politicmon-save-v10",
  "politicmon-save-v9",
  "politicmon-save-v8",
  "politicmon-save-v7",
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
    boxed: [],
    lastBar: "borgo",
    zoneRewardsClaimed: [],
    stepsTotal: 0,
    trainerRematch: {},
    lastDailyDate: "",
    repellentSteps: 0,
    dailyStreak: 0,
    duelWins: 0,
    duelLosses: 0,
    dailyQuestsDone: [],
    lastDailyQuestDate: "",
    browserSeed: rollBrowserSeed()
  };
}

// Ritorna true se la specie era SCONOSCIUTA (prima vista): serve a mostrare il
// banner "UN VOLTO MAI VISTO!" nel momento della scoperta.
export function markSeen(state: GameState, speciesId: string): boolean {
  if (!state.dex[speciesId]) {
    state.dex[speciesId] = "seen";
    return true;
  }
  return false;
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
    // Prima di sovrascrivere, conserva il valore precedente (che era valido
    // quando è stato scritto) come backup anti-corruzione.
    const prev = localStorage.getItem(SAVE_KEY);
    if (prev !== null) {
      try {
        localStorage.setItem(BACKUP_KEY, prev);
      } catch {
        // Quota piena per il backup: il salvataggio primario resta prioritario.
      }
    }
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

// Valida una entry di dailyQuestsDone ("id:count" o "id:done"). Deve essere una
// stringa con almeno un "id" non vuoto e un suffisso "done" oppure un intero
// 0..99999 (coerente con parseEntry in dailyquests.ts, che fa Number(val)||0).
function isValidDailyQuestEntry(entry: unknown): entry is string {
  if (typeof entry !== "string") {
    return false;
  }
  const idx = entry.indexOf(":");
  if (idx <= 0 || idx === entry.length - 1) {
    return false; // manca ":", id vuoto, oppure suffisso vuoto
  }
  const suffix = entry.slice(idx + 1);
  if (suffix === "done") {
    return true;
  }
  // Solo cifre (niente segno/decimali/spazi), range 0..99999.
  if (!/^\d+$/.test(suffix)) {
    return false;
  }
  const n = Number(suffix);
  return n >= 0 && n <= 99999;
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
    parsed.lastBar = typeof parsed.lastBar === "string" ? parsed.lastBar : "borgo";
    parsed.zoneRewardsClaimed = Array.isArray(parsed.zoneRewardsClaimed) ? parsed.zoneRewardsClaimed : [];
    parsed.stepsTotal =
      typeof parsed.stepsTotal === "number" && !Number.isNaN(parsed.stepsTotal) ? parsed.stepsTotal : 0;
    parsed.trainerRematch =
      parsed.trainerRematch && typeof parsed.trainerRematch === "object" && !Array.isArray(parsed.trainerRematch)
        ? parsed.trainerRematch
        : {};
    parsed.lastDailyDate = typeof parsed.lastDailyDate === "string" ? parsed.lastDailyDate : "";
    parsed.repellentSteps =
      typeof parsed.repellentSteps === "number" && !Number.isNaN(parsed.repellentSteps)
        ? Math.max(0, parsed.repellentSteps)
        : 0;
    parsed.dailyStreak = typeof parsed.dailyStreak === "number" && !Number.isNaN(parsed.dailyStreak) ? parsed.dailyStreak : 0;
    parsed.duelWins = typeof parsed.duelWins === "number" && !Number.isNaN(parsed.duelWins) ? parsed.duelWins : 0;
    parsed.duelLosses = typeof parsed.duelLosses === "number" && !Number.isNaN(parsed.duelLosses) ? parsed.duelLosses : 0;
    // Entry "id:count"/"id:done" (dailyquests.ts parseEntry): scarta le entry
    // malformate. Il suffisso dopo ":" dev'essere "done" oppure un intero
    // 0..99999 (un count gigante/negativo/NaN non deve sopravvivere al load).
    parsed.dailyQuestsDone = Array.isArray(parsed.dailyQuestsDone)
      ? parsed.dailyQuestsDone.filter(isValidDailyQuestEntry)
      : [];
    parsed.lastDailyQuestDate = typeof parsed.lastDailyQuestDate === "string" ? parsed.lastDailyQuestDate : "";
    parsed.browserSeed =
      typeof parsed.browserSeed === "number" && Number.isInteger(parsed.browserSeed) && parsed.browserSeed > 0
        ? parsed.browserSeed
        : 0;
    // heldItem (v11, opzionale): tutto ciò che non è una stringa viene rimosso.
    for (const mon of [...parsed.party, ...parsed.boxed]) {
      if (mon.heldItem !== undefined && typeof mon.heldItem !== "string") {
        delete mon.heldItem;
      }
    }

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
        // Stessa rete di sicurezza sull'EXP: un valore non-numerico/NaN bloccherebbe
        // silenziosamente il leveling. Lo riportiamo al minimo del livello corrente.
        if (typeof mon.exp !== "number" || Number.isNaN(mon.exp)) {
          mon.exp = expForLevel(mon.level);
        }
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

// browserSeed=0 (save pre-v11 o campo assente): genera e persisti subito,
// così il seed resta stabile per sempre.
function ensureBrowserSeed(state: GameState): void {
  if (state.browserSeed === 0) {
    state.browserSeed = rollBrowserSeed();
    saveGame(state);
  }
}

export function loadGame(): GameState | null {
  const current = parseState(localStorage.getItem(SAVE_KEY));
  if (current) {
    ensureBrowserSeed(current);
    return current;
  }
  // Primario corrotto/assente: prova il backup dell'ultima scrittura valida.
  const backup = parseState(localStorage.getItem(BACKUP_KEY));
  if (backup) {
    saveGame(backup);
    ensureBrowserSeed(backup);
    return backup;
  }
  // Migrazione dai salvataggi precedenti: stessi dati, campi nuovi al default.
  for (const key of LEGACY_KEYS) {
    const legacy = parseState(localStorage.getItem(key));
    if (legacy) {
      // Ri-persisti subito sotto la chiave corrente e rimuovi la vecchia,
      // così la migrazione avviene una sola volta.
      saveGame(legacy);
      localStorage.removeItem(key);
      ensureBrowserSeed(legacy);
      return legacy;
    }
  }
  return null;
}

// ---- Export/import del salvataggio come "CODICE SALVATAGGIO" ----
// btoa richiede byte latin1: il JSON può contenere caratteri accentati, quindi
// si passa per encodeURIComponent (schema classico, simmetrico in import).

export function exportSaveCode(state: GameState): string {
  return btoa(encodeURIComponent(JSON.stringify(state)));
}

// Valida e ritorna lo stato importato (null se il codice non è un save valido).
// NON persiste: la conferma di sovrascrittura spetta alla UI.
export function importSaveCode(code: string): GameState | null {
  try {
    return parseState(decodeURIComponent(atob(code.trim())));
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  if (localStorage.getItem(SAVE_KEY) !== null) {
    return true;
  }
  return LEGACY_KEYS.some((key) => localStorage.getItem(key) !== null);
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(BACKUP_KEY);
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}
