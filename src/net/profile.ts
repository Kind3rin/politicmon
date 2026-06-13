// Profilo online del giocatore: nickname persistente (vale tra partite diverse,
// quindi è separato dal salvataggio di gioco). Solo MAIUSCOLE/numeri, perché il
// bitmap font del gioco non ha minuscole.

const KEY = "politicmon-nick";
const MAX = 12;

// Nick satirici di riserva, se l'utente non ne sceglie uno.
const FALLBACKS = [
  "ONOREVOLE", "CANDIDATO", "TROMBATO", "PORTABORSE", "MINISTRO", "TRANSFUGA"
];

export function sanitizeNick(raw: string): string {
  const up = (raw ?? "").toUpperCase();
  let out = "";
  for (const ch of up) {
    if ((ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === " " || ch === "_") {
      out += ch;
    }
    if (out.length >= MAX) {
      break;
    }
  }
  return out.trim();
}

export function hasNick(): boolean {
  try {
    return Boolean(localStorage.getItem(KEY));
  } catch {
    return false;
  }
}

export function loadNick(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (v) {
      return v;
    }
  } catch {
    // ignore
  }
  return "";
}

export function saveNick(nick: string): string {
  const clean = sanitizeNick(nick) || randomNick();
  try {
    localStorage.setItem(KEY, clean);
  } catch {
    // ignore
  }
  return clean;
}

export function randomNick(): string {
  // Indice stabile per sessione senza Math.random nei moduli condivisi: usa
  // l'ora corrente solo qui (runtime di gioco, non workflow).
  const i = Math.floor(performance.now()) % FALLBACKS.length;
  const n = (Math.floor(performance.now() / 7) % 99) + 1;
  return `${FALLBACKS[i]}${n}`;
}

export const NICK_MAX = MAX;
