import { hashDate, localDateKey } from "./daily";
import { saveGame, type GameState } from "./state";

// -------------------------------------------------- MISSIONI GIORNALIERE
// Pool di micro-missioni; ogni giorno 3 vengono pescate deterministicamente
// dalla data (hashDate: stesse missioni per tutti, ovunque). Il progresso vive
// in GameState.dailyQuestsDone (string[], save v11) con entry "id:count" mentre
// è in corso e "id:done" a completamento — NESSUNA migrazione nuova. Il reset
// avviene quando lastDailyQuestDate != oggi (data locale).

export interface DailyQuestDef {
  id: string;
  title: string; // ITALIANO MAIUSCOLO, breve (entra nella QuestScene)
  target: number; // quante volte va ripetuta l'azione
  reward: number; // € accreditati al completamento
}

export const DAILY_QUEST_POOL: DailyQuestDef[] = [
  { id: "win2", title: "VINCI 2 BATTAGLIE", target: 2, reward: 200 },
  { id: "catch1", title: "CATTURA 1 POLITICMON", target: 1, reward: 250 },
  { id: "steps300", title: "CAMMINA 300 PASSI", target: 300, reward: 150 },
  { id: "slot1", title: "VINCI ALLE SLOT 1 VOLTA", target: 1, reward: 200 },
  { id: "social1", title: "FAI 1 SCAMBIO O DUELLO", target: 1, reward: 300 },
  { id: "item1", title: "USA 1 OGGETTO IN LOTTA", target: 1, reward: 150 }
];

// Le 3 missioni del giorno: indici DISTINTI pescati dall'hash della data
// (stesso schema a sonda lineare della SFIDA DEL GIORNO in daily.ts).
export function todaysDailyQuests(dateKey = localDateKey()): DailyQuestDef[] {
  const h = hashDate(`${dateKey}:missioni`);
  const picks: number[] = [];
  for (const seed of [h, Math.floor(h / 7), Math.floor(h / 13)]) {
    let i = seed % DAILY_QUEST_POOL.length;
    while (picks.includes(i)) {
      i = (i + 1) % DAILY_QUEST_POOL.length;
    }
    picks.push(i);
  }
  return picks.map((i) => DAILY_QUEST_POOL[i]);
}

// Reset a mezzanotte locale: azzera i progressi e aggiorna la data. Chiamata
// da ogni punto d'ingresso (bump + UI), così il primo tocco del giorno pulisce.
export function ensureDailyQuestReset(state: GameState): void {
  const today = localDateKey();
  if (state.lastDailyQuestDate !== today) {
    state.lastDailyQuestDate = today;
    state.dailyQuestsDone = [];
  }
}

function parseEntry(state: GameState, questId: string): { index: number; count: number; done: boolean } {
  for (let i = 0; i < state.dailyQuestsDone.length; i += 1) {
    const [id, val] = state.dailyQuestsDone[i].split(":");
    if (id === questId) {
      return { index: i, count: val === "done" ? 0 : Number(val) || 0, done: val === "done" };
    }
  }
  return { index: -1, count: 0, done: false };
}

export interface DailyQuestStatus {
  quest: DailyQuestDef;
  count: number;
  done: boolean;
}

// Stato delle 3 missioni di oggi (per la QuestScene).
export function dailyQuestStatus(state: GameState): DailyQuestStatus[] {
  ensureDailyQuestReset(state);
  return todaysDailyQuests().map((quest) => {
    const e = parseEntry(state, quest.id);
    return { quest, count: e.done ? quest.target : Math.min(quest.target, e.count), done: e.done };
  });
}

// Toast non bloccanti da mostrare nel mondo (consumati da WorldScene): le
// missioni si completano anche dentro battaglia/casinò, dove non c'è banner.
const pendingToasts: Array<{ title: string; sub: string }> = [];

export function consumeDailyToast(): { title: string; sub: string } | null {
  return pendingToasts.shift() ?? null;
}

// Avanza una missione di `amount`. No-op se la missione non è tra le 3 di oggi
// o è già completata. Al completamento accredita la ricompensa, salva e accoda
// il toast "MISSIONE COMPLETATA".
export function bumpDailyQuest(state: GameState, questId: string, amount = 1): boolean {
  ensureDailyQuestReset(state);
  const quest = todaysDailyQuests().find((q) => q.id === questId);
  if (!quest) {
    return false;
  }
  const e = parseEntry(state, questId);
  if (e.done) {
    return false;
  }
  const count = e.count + amount;
  if (count >= quest.target) {
    const entry = `${questId}:done`;
    if (e.index >= 0) {
      state.dailyQuestsDone[e.index] = entry;
    } else {
      state.dailyQuestsDone.push(entry);
    }
    state.money += quest.reward;
    saveGame(state);
    pendingToasts.push({ title: "MISSIONE COMPLETATA!", sub: `${quest.title} +${quest.reward}€` });
    return true;
  }
  const entry = `${questId}:${count}`;
  if (e.index >= 0) {
    state.dailyQuestsDone[e.index] = entry;
  } else {
    state.dailyQuestsDone.push(entry);
  }
  return false;
}
