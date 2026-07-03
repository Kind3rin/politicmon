import type { TrainerDef } from "../data/trainers";
import type { GameState } from "./state";

// ---------------------------------------------------------- SFIDA DEL GIORNO
// Una sfida al giorno REALE contro l'OPINIONISTA PERPETUA a Caput Mundi: team
// deterministico dal giorno (stessa sfida per tutti, retry libero in caso di
// sconfitta), premio fisso 500€ + item minore a rotazione (audit C5).
// lastDailyDate è scritta SOLO alla vittoria, con la data LOCALE (mai UTC).

// Data LOCALE in formato YYYY-MM-DD: MAI toISOString() (alle 00:30 italiane
// darebbe il giorno prima, UTC). Il cambio orologio è cheat accettato.
export function localDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Pool di specie mid/late-game per il panel del giorno.
const DAILY_POOL = [
  "mediocrate", "telecrate", "contemorfo", "calendrone", "ursulax",
  "tajacolomba", "macronfox", "bojoon", "conteblob", "generorso"
];

// Data locale del giorno PRIMA di una dateKey (YYYY-MM-DD): calcolata sui
// componenti locali (mai -86400000 ms: il cambio ora legale sballerebbe).
export function prevDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return localDateKey(new Date(y || 2026, (m || 1) - 1, (d || 1) - 1));
}

// Hash deterministico della data: stessa sfida per tutti nello stesso giorno.
export function hashDate(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Costruisce l'avversaria del giorno: 3 specie DISTINTE pescate dal pool con
// l'hash della data, livelli scalati sul massimo del party +2 (clamp 10-55:
// mai oltre il level cap del giocatore, audit C2/R42).
export function buildDailyTrainer(state: GameState, dateKey: string): TrainerDef {
  const h = hashDate(dateKey);
  const picks: string[] = [];
  for (const seed of [h, Math.floor(h / 7), Math.floor(h / 13)]) {
    let i = seed % DAILY_POOL.length;
    while (picks.includes(DAILY_POOL[i])) {
      i = (i + 1) % DAILY_POOL.length;
    }
    picks.push(DAILY_POOL[i]);
  }
  const maxParty = state.party.reduce((m, mon) => Math.max(m, mon.level), 5);
  const top = Math.max(10, Math.min(55, maxParty + 2));
  const team: Array<[string, number]> = [
    [picks[0], Math.max(2, top - 2)],
    [picks[1], Math.max(2, top - 1)],
    [picks[2], top]
  ];
  return {
    // id "daily:YYYY-MM-DD": MAI registrato in defeatedTrainers (ripetibile).
    id: `daily:${dateKey}`,
    name: "OPINIONISTA PERPETUA",
    pal: "journalist",
    team,
    intro: ["Siamo in DIRETTA. Niente giri di parole."],
    defeat: ["E anche oggi il titolo lo scrivi tu."],
    money: 500 // premio fisso (audit C5); beneficia del Min. Economia come tutti
  };
}

// ---------------------------------------------------------- MOSTRO DEL GIORNO
// Ogni giorno, in ogni zona con incontri, UNA specie del pool locale è "avvistata"
// (weight x4 in WorldScene). Deterministico da data+mappa: stesso avvistamento
// per tutti i giocatori, zero stato salvato.
export const DAILY_BOOST_MULT = 4;

export function dailyBoostSpeciesId(
  mapId: string,
  entries: Array<{ speciesId: string }>,
  dateKey = localDateKey()
): string | null {
  if (entries.length === 0) {
    return null;
  }
  return entries[hashDate(`${dateKey}:${mapId}`) % entries.length].speciesId;
}

// Item del giorno: rotazione deterministica sul giorno della settimana, SOLO
// consumabili comuni (mai schedona/tessera: niente farming di rarità).
export function dailyRewardItem(dateKey: string): { itemId: string; qty: number } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const day = new Date(y || 2026, (m || 1) - 1, d || 1).getDay(); // 0 = domenica
  const table: Array<{ itemId: string; qty: number }> = [
    { itemId: "spritz", qty: 2 }, // domenica
    { itemId: "caffe", qty: 3 }, // lunedì
    { itemId: "scheda", qty: 2 }, // martedì
    { itemId: "spritz", qty: 1 }, // mercoledì
    { itemId: "caffe", qty: 2 }, // giovedì
    { itemId: "scheda", qty: 3 }, // venerdì
    { itemId: "spritz", qty: 2 } // sabato
  ];
  return table[((day % 7) + 7) % 7];
}
