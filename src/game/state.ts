import type { Facing } from "../art/characters";
import type { Monster } from "./monster";
import { expForLevel, sanitizeMon, statsOf } from "./monster";
import { markHistoricalCheckpoints, newRunStats, normalizeRunStats, type RunStats } from "./runstats";
import { newCoalitionState, normalizeCoalitionState, type CoalitionState } from "./coalition";
import { newElectionState, normalizeElectionState, type ElectionState } from "./election";
import { newWeeklyCampaignState, normalizeWeeklyCampaign, type WeeklyCampaignState } from "./weeklyCampaign";

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
  // ---- v12: END-GAME (modalità difficile + torneo + boost campagna) ----
  hardMode: boolean; // MODALITÀ DIFFICILE scelta a inizio partita: IMMUTABILE dopo la creazione
  coppaWins: number; // trionfi alla COPPA DELLE POLTRONE (titolo permanente PORTAVOCE DEL POPOLO)
  boostExpBattles: number; // MANIFESTI OVUNQUE: battaglie rimanenti col bonus EXP campagna
  boostMoneyBattles: number; // SPOT IN PRIME TIME: battaglie rimanenti col bonus fondi dai trainer
  boostSondBattles: number; // COMIZIO OCEANICO: battaglie rimanenti col bonus SONDAGGI dalle vittorie
  // ---- v13: ACCESSIBILITÀ + money-sink terminale (LOTTO 2/3 round 42) ----
  reduceEffects: boolean; // RIDUCI EFFETTI: azzera shake/flash/urla-tremolo (l'informazione resta)
  reduceEffectsSet: boolean; // l'utente ha scelto esplicitamente? (distingue default-di-sistema da scelta)
  monumentLevel: number; // MONUMENTO AL CANDIDATO: money-sink cosmetico del LOTTO 3 (0..N, intero)
  // ---- v14: TELEMETRIA LOCALE DELLA RUN (mai inviata in rete) ----
  runStats: RunStats;
  // ---- v15: ATTO 3 / COALIZIONE (payload presente anche con feature flag off) ----
  coalition: CoalitionState;
  // ---- v16: TERRITORI / ELECTION NIGHT (inerte con feature flag off) ----
  election: ElectionState;
  // ---- v17: CAMPAGNA SETTIMANALE (stato separato dalla storia) ----
  weeklyCampaign: WeeklyCampaignState;
  // ---- v18: FORME MEME ottenute; la forma resta dopo la scadenza ----
  unlockedMemeForms: string[];
}

// Seed "di installazione": generato una volta e persistito nel save. Divide i
// giocatori in versione GOVERNO/OPPOSIZIONE (pari/dispari).
function rollBrowserSeed(): number {
  return 1 + Math.floor(Math.random() * (2 ** 31 - 1));
}

// ---- SLOT MULTIPLI DI SALVATAGGIO (3 slot) ----
// Ogni slot ha la sua chiave `politicmon-save-v18__sN` (+ `.bak`). Lo slot ATTIVO
// (0/1/2) è persistito a parte: saveGame/loadGame/hasSave/clearSave operano su di
// esso, così i ~70 call site esistenti non cambiano. La vecchia chiave senza
// suffisso (mono-slot) viene migrata nello slot 0 al primo accesso.
export const SLOT_COUNT = 3;
const SAVE_KEY_BASE = "politicmon-save-v18";
const ACTIVE_SLOT_KEY = "politicmon-active-slot";
// Chiave mono-slot storica (pre-multislot): migrata → slot 0.
const LEGACY_SINGLE_KEY = "politicmon-save-v13";
const LEGACY_SINGLE_BAK = "politicmon-save-v13.bak";

function slotKey(slot: number): string {
  return `${SAVE_KEY_BASE}__s${slot}`;
}
function slotBackupKey(slot: number): string {
  return `${SAVE_KEY_BASE}__s${slot}.bak`;
}

const PREVIOUS_SLOT_BASES = ["politicmon-save-v17", "politicmon-save-v16", "politicmon-save-v15", "politicmon-save-v14", "politicmon-save-v13"] as const;

function clampSlot(n: number): number {
  return Number.isInteger(n) && n >= 0 && n < SLOT_COUNT ? n : 0;
}

// localStorage può LANCIARE, non solo su setItem (quota): anche getItem/removeItem
// tirano SecurityError su Firefox "Non ricordare cronologia", cookie di terze parti
// bloccati, webview in lockdown o contesti sandboxed. Se un'eccezione qui sfugge dal
// costruttore di TitleScene (creato prima del game loop in main.ts), il canvas resta
// nero per sempre. Questi wrapper degradano a "nessun salvataggio" invece di crashare:
// il gioco parte come sessione in-memory (il progresso semplicemente non persiste).
function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage non disponibile: niente da rimuovere, nessun crash.
  }
}

let activeSlot = -1; // -1 = non ancora letto da localStorage

export function getActiveSlot(): number {
  if (activeSlot < 0) {
    const raw = (() => {
      try {
        return localStorage.getItem(ACTIVE_SLOT_KEY);
      } catch {
        return null;
      }
    })();
    activeSlot = clampSlot(raw !== null ? Number(raw) : 0);
  }
  return activeSlot;
}

export function setActiveSlot(slot: number): void {
  activeSlot = clampSlot(slot);
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, String(activeSlot));
  } catch {
    // Quota/permessi: lo slot resta valido in memoria per questa sessione.
  }
}

// Chiave dello slot ATTIVO (la usano save/load). Prima migra la vecchia chiave
// mono-slot nello slot 0, così un salvataggio pre-multislot non si perde.
function migrateSingleSlotOnce(): void {
  try {
    const old = localStorage.getItem(LEGACY_SINGLE_KEY);
    // Migra solo se lo slot 0 è vuoto e la vecchia chiave esiste ed è "pura"
    // (non è già una chiave slot: quelle hanno il suffisso "__sN").
    if (old !== null && localStorage.getItem(slotKey(0)) === null) {
      localStorage.setItem(slotKey(0), old);
      const oldBak = localStorage.getItem(LEGACY_SINGLE_BAK);
      if (oldBak !== null) {
        localStorage.setItem(slotBackupKey(0), oldBak);
      }
    }
    // Rimuovi le vecchie chiavi mono-slot (dopo la copia) per non migrare due volte.
    if (old !== null) {
      localStorage.removeItem(LEGACY_SINGLE_KEY);
      localStorage.removeItem(LEGACY_SINGLE_BAK);
    }
  } catch {
    // localStorage non disponibile: niente migrazione, load fallirà pulito.
  }
}

const LEGACY_KEYS = [
  "politicmon-save-v12",
  "politicmon-save-v11",
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
    browserSeed: rollBrowserSeed(),
    hardMode: false,
    coppaWins: 0,
    boostExpBattles: 0,
    boostMoneyBattles: 0,
    boostSondBattles: 0,
    // Default iniziale: se il sistema chiede meno animazioni, parti con RIDUCI
    // EFFETTI attivo. reduceEffectsSet resta false: è un default, non una scelta,
    // quindi il toggle in OPZIONI conta ancora come prima decisione esplicita.
    reduceEffects: prefersReducedMotion(),
    reduceEffectsSet: false,
    monumentLevel: 0,
    runStats: newRunStats(),
    coalition: newCoalitionState(),
    election: newElectionState(),
    weeklyCampaign: newWeeklyCampaignState(),
    unlockedMemeForms: []
  };
}

// Preferenza di sistema "meno animazioni possibili" (prefers-reduced-motion).
// Difensiva fuori dal browser (SSR/test): torna false se matchMedia non c'è.
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
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

export function getActiveState(): GameState | null {
  return activeState;
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
  const slot = getActiveSlot();
  const key = slotKey(slot);
  const bak = slotBackupKey(slot);
  try {
    // Prima di sovrascrivere, conserva il valore precedente (che era valido
    // quando è stato scritto) come backup anti-corruzione.
    const prev = localStorage.getItem(key);
    if (prev !== null) {
      try {
        localStorage.setItem(bak, prev);
      } catch {
        // Quota piena per il backup: il salvataggio primario resta prioritario.
      }
    }
    localStorage.setItem(key, serializeGameState(state));
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

// Ripristino da backup: il primario corrente è già noto come corrotto, quindi
// NON va ruotato sopra il backup valido (saveGame lo farebbe per una save normale).
function restorePrimaryFromBackup(slot: number, state: GameState): void {
  try {
    localStorage.setItem(slotKey(slot), serializeGameState(state));
  } catch {
    // Il caricamento in memoria resta valido anche con storage non scrivibile.
  }
}

// v13/v14/v15 avevano già tre slot: migra ciascuno nello slot v16 omologo senza
// mescolare campagne. La versione più recente vince; la copia precede la rimozione.
function migratePreviousSlotOnce(slot: number): void {
  try {
    const currentKey = slotKey(slot);
    for (const base of PREVIOUS_SLOT_BASES) {
      const oldKey = `${base}__s${slot}`;
      const oldBackupKey = `${oldKey}.bak`;
      const old = localStorage.getItem(oldKey);
      if (old !== null && localStorage.getItem(currentKey) === null) {
        localStorage.setItem(currentKey, old);
        const oldBak = localStorage.getItem(oldBackupKey);
        if (oldBak !== null) localStorage.setItem(slotBackupKey(slot), oldBak);
      }
      if (old !== null) {
        localStorage.removeItem(oldKey);
        localStorage.removeItem(oldBackupKey);
      }
    }
  } catch {
    // Storage indisponibile: load degrada alla sessione in memoria.
  }
}

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

export interface ParseGameStateOptions {
  // Il parser puro non consulta window/matchMedia. Il chiamante browser passa
  // esplicitamente la preferenza di sistema; test e tool usano false di default.
  reduceMotionDefault?: boolean;
}

// Parser/normalizzatore PURO: nessun accesso a localStorage, clock o RNG.
// Il JSON in input non viene mutato (JSON.parse crea un nuovo oggetto).
export function parseGameState(
  raw: string | null,
  options: ParseGameStateOptions = {}
): GameState | null {
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
    // ---- v12: campi END-GAME (default difensivi; un save v11 migra a false/0) ----
    parsed.hardMode = parsed.hardMode === true; // solo true esplicito attiva la modalità
    parsed.coppaWins =
      typeof parsed.coppaWins === "number" && !Number.isNaN(parsed.coppaWins) ? Math.max(0, parsed.coppaWins) : 0;
    // Contatori boost campagna: interi >=0. Un valore non-numerico/negativo → 0.
    const clampBoost = (v: unknown): number =>
      typeof v === "number" && !Number.isNaN(v) ? Math.max(0, Math.floor(v)) : 0;
    parsed.boostExpBattles = clampBoost(parsed.boostExpBattles);
    parsed.boostMoneyBattles = clampBoost(parsed.boostMoneyBattles);
    parsed.boostSondBattles = clampBoost(parsed.boostSondBattles);
    // ---- v13: accessibilità + money-sink terminale (default difensivi) ----
    // reduceEffectsSet=true SOLO se il save conteneva già una scelta esplicita.
    // Un save v12 (campi assenti) migra a: reduceEffectsSet=false e reduceEffects
    // = preferenza di sistema (prefers-reduced-motion), così onboarding accessibile
    // senza sovrascrivere scelte future dell'utente.
    parsed.reduceEffectsSet = parsed.reduceEffectsSet === true;
    parsed.reduceEffects = parsed.reduceEffectsSet
      ? parsed.reduceEffects === true
      : typeof parsed.reduceEffects === "boolean"
        ? parsed.reduceEffects
        : (options.reduceMotionDefault ?? false);
    // Clamp a 0..3 (MONUMENT_MAX): un save importato/manomesso con un valore
    // fuori range farebbe crashare MonumentScene.draw (MONUMENT_STAGES[lv]
    // undefined → .flatMap su undefined). La costante 3 è duplicata da
    // MonumentScene per non far dipendere state.ts (basso livello) da una scena.
    parsed.monumentLevel =
      typeof parsed.monumentLevel === "number" && !Number.isNaN(parsed.monumentLevel)
        ? Math.max(0, Math.min(3, Math.floor(parsed.monumentLevel)))
        : 0;
    const hadRunStats = Boolean(parsed.runStats && typeof parsed.runStats === "object");
    parsed.runStats = normalizeRunStats(parsed.runStats);
    parsed.coalition = normalizeCoalitionState(parsed.coalition);
    parsed.election = normalizeElectionState(parsed.election);
    parsed.weeklyCampaign = normalizeWeeklyCampaign(parsed.weeklyCampaign);
    parsed.unlockedMemeForms = Array.isArray(parsed.unlockedMemeForms)
      ? [...new Set(parsed.unlockedMemeForms.filter((id): id is string => typeof id === "string"))].slice(0, 64)
      : [];
    if (!hadRunStats) {
      markHistoricalCheckpoints(parsed);
    }
    // Rete di sicurezza su OGNI mostro (party E box) PRIMA di toccare hp/exp:
    // uno speciesId o una mossa inesistente (save importato via CODICE o cross-version)
    // farebbe crashare statsOf/healMonster/move-menu. Va qui perché le reti hp/exp
    // sotto chiamano statsOf, che richiede uno speciesId valido.
    for (const mon of [...parsed.party, ...parsed.boxed]) {
      sanitizeMon(mon);
    }
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

// Adapter browser: mantiene il comportamento storico per save/import v12 senza
// scelta accessibilità, ma lascia il parser esportato deterministico e testabile.
function parseState(raw: string | null): GameState | null {
  return parseGameState(raw, { reduceMotionDefault: prefersReducedMotion() });
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
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
  migratePreviousSlotOnce(getActiveSlot());
  migrateSingleSlotOnce();
  const slot = getActiveSlot();
  const current = parseState(lsGet(slotKey(slot)));
  if (current) {
    ensureBrowserSeed(current);
    return current;
  }
  // Primario corrotto/assente: prova il backup dell'ultima scrittura valida.
  const backup = parseState(lsGet(slotBackupKey(slot)));
  if (backup) {
    restorePrimaryFromBackup(slot, backup);
    ensureBrowserSeed(backup);
    return backup;
  }
  // Migrazione dai salvataggi precedenti (v3-v12, mono-slot): confluiscono SOLO
  // nello slot 0, come da comportamento storico. Chi ha selezionato uno slot
  // vuoto diverso non deve vedersi apparire un vecchio save lì.
  if (slot === 0) {
    for (const key of LEGACY_KEYS) {
      const legacy = parseState(lsGet(key));
      if (legacy) {
        saveGame(legacy);
        lsRemove(key);
        ensureBrowserSeed(legacy);
        return legacy;
      }
    }
  }
  return null;
}

// ---- Export/import del salvataggio come "CODICE SALVATAGGIO" ----
// btoa richiede byte latin1: il JSON può contenere caratteri accentati, quindi
// si passa per encodeURIComponent (schema classico, simmetrico in import).

export function exportSaveCode(state: GameState): string {
  return btoa(encodeURIComponent(serializeGameState(state)));
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

// C'è un salvataggio nello slot ATTIVO? (usata dal flusso "CONTINUA" storico).
export function hasSave(): boolean {
  migratePreviousSlotOnce(getActiveSlot());
  migrateSingleSlotOnce();
  const slot = getActiveSlot();
  if (lsGet(slotKey(slot)) !== null) {
    return true;
  }
  if (lsGet(slotBackupKey(slot)) !== null) {
    return true;
  }
  // Solo lo slot 0 eredita i vecchi save mono-slot (v3-v12).
  return slot === 0 && LEGACY_KEYS.some((key) => lsGet(key) !== null);
}

// C'è un salvataggio in UNO SPECIFICO slot? (usata dal selettore slot in UI).
export function hasSaveInSlot(slot: number): boolean {
  const s = clampSlot(slot);
  migratePreviousSlotOnce(s);
  migrateSingleSlotOnce();
  if (lsGet(slotKey(s)) !== null || lsGet(slotBackupKey(s)) !== null) {
    return true;
  }
  return s === 0 && LEGACY_KEYS.some((key) => lsGet(key) !== null);
}

// Almeno uno slot ha un salvataggio? (per decidere se mostrare "CONTINUA").
export function hasAnySave(): boolean {
  for (let s = 0; s < SLOT_COUNT; s += 1) {
    if (hasSaveInSlot(s)) {
      return true;
    }
  }
  return false;
}

export interface SlotSummary {
  slot: number;
  exists: boolean;
  nick?: string;
  level: number; // livello del capo-squadra (0 se party vuoto)
  badges: number;
  money: number;
  sondaggi: number;
  mapId: string;
  hardMode: boolean;
}

// Riepilogo leggibile di uno slot per la UI (senza caricarlo come partita attiva).
export function slotSummary(slot: number): SlotSummary {
  const s = clampSlot(slot);
  migratePreviousSlotOnce(s);
  migrateSingleSlotOnce();
  let raw = lsGet(slotKey(s));
  if (raw === null && s === 0) {
    // Slot 0 può ospitare un vecchio save legacy non ancora migrato: leggilo per il riepilogo.
    for (const key of LEGACY_KEYS) {
      const v = lsGet(key);
      if (v !== null) {
        raw = v;
        break;
      }
    }
  }
  const st = parseState(raw ?? lsGet(slotBackupKey(s)));
  if (!st) {
    return { slot: s, exists: false, level: 0, badges: 0, money: 0, sondaggi: 0, mapId: "", hardMode: false };
  }
  const level = st.party.length > 0 ? Math.max(...st.party.map((m) => m.level)) : 0;
  return {
    slot: s,
    exists: true,
    level,
    badges: st.badges.length,
    money: st.money,
    sondaggi: st.sondaggi,
    mapId: st.pos.mapId,
    hardMode: st.hardMode
  };
}

// Cancella lo slot ATTIVO (usata dal "CANCELLA DOSSIER" storico).
export function clearSave(): void {
  clearSlot(getActiveSlot());
}

// Cancella uno SPECIFICO slot (usata dal selettore slot in UI).
export function clearSlot(slot: number): void {
  const s = clampSlot(slot);
  lsRemove(slotKey(s));
  lsRemove(slotBackupKey(s));
  // Evita che uno slot legacy non ancora migrato "resusciti" al prossimo load.
  for (const base of PREVIOUS_SLOT_BASES) {
    lsRemove(`${base}__s${s}`);
    lsRemove(`${base}__s${s}.bak`);
  }
  // Solo lo slot 0 poteva ereditare i vecchi save mono-slot: puliscili con lui.
  if (s === 0) {
    for (const key of LEGACY_KEYS) {
      lsRemove(key);
    }
  }
}
