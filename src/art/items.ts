import type { Pixmap } from "../engine/screen";
import { ITEMS } from "../data/items";
import { MOVES } from "../data/moves";
import { TYPE_COLORS } from "../data/poltypes";

// Icone pixel-art 12x12 per gli oggetti, disegnate da codice (niente asset
// binari, coerente col resto del gioco). Ogni icona è un Pixmap {art, pal}.
// Caratteri: '.' / ' ' = trasparente. Le scene le disegnano con screen.sprite().

const ICON_W = 12;

// Palette condivisa delle icone (toni piatti stile GBA + contorno scuro).
const PAL: Record<string, string> = {
  K: "#1a1726", // contorno scuro
  // carta / schede
  w: "#f4f1e4", // bianco carta
  W: "#d8d2bc", // ombra carta
  r: "#d23b3b", // rosso scheda/croce
  // legno/bordi
  b: "#6b4a2a",
  // metallo / oro
  o: "#f0d040", // oro chiaro
  O: "#b89018", // oro scuro
  // tazzina caffè
  c: "#3a2418", // caffè scuro
  C: "#6b4226", // caffè chiaro
  p: "#e8e3d6", // porcellana
  P: "#bcb6a4", // porcellana ombra
  // spritz / bicchiere
  a: "#ff8a3c", // arancione spritz
  A: "#d96a1e", // arancione scuro
  g: "#bfe6ff", // vetro
  // mojito
  m: "#8fd96a", // verde menta
  M: "#5aa83a",
  // flacone maalox
  l: "#7fc8e0", // azzurro flacone
  L: "#4a96b4",
  // fascia tricolore (divisa)
  v: "#2e9e5b", // verde
  // (bianco = w, rosso = r già definiti)
  // generico
  s: "#9aa0b0", // grigio acciaio
  S: "#6b7080",
  // direttiva: il colore del tipo va in 'T'/'t' iniettato a runtime
  T: "#cccccc",
  t: "#888888"
};

function ic(art: string[], extra?: Record<string, string>): Pixmap {
  // Tutte le righe a 12 colonne (pad difensivo).
  const norm = art.map((r) => (r.length < ICON_W ? r + " ".repeat(ICON_W - r.length) : r.slice(0, ICON_W)));
  return { art: norm, pal: extra ? { ...PAL, ...extra } : PAL };
}

// ---- SCHEDA ELETTORALE (ball) ----
const SCHEDA = ic([
  "  KKKKKKKK  ",
  " KwwwwwwwwK ",
  " KwKwKwKwwK ",
  " KwwwwwwwwK ",
  " KwKKKwwwwK ",
  " KwwwwwKKwK ",
  " KwKKwwwwwK ",
  " KwwwwwKKwK ",
  " KwrrwwwwwK ",
  " KwrrwwWWwK ",
  " KWWWWWWWWK ",
  "  KKKKKKKK  "
]);

// ---- SCHEDA BLINDATA (ball forte) — bordo oro ----
const SCHEDONA = ic([
  "  OOOOOOOO  ",
  " OwwwwwwwwO ",
  " OwKwKwKwwO ",
  " OwwwwwwwwO ",
  " OwKKKwwwwO ",
  " OwwwwwOOwO ",
  " OwKKwwwwwO ",
  " OwwwwwOOwO ",
  " OorrwwwwoO ",
  " OorrwwooOO ",
  " OOOOOOOOOO ",
  "  OOOOOOOO  "
]);

// ---- CAFFÈ DEL BAR SPORT (heal) — tazzina ----
const CAFFE = ic([
  "            ",
  "   ccc      ",
  "  KKKKKK    ",
  " KpcccccpK  ",
  " KpcCCCcpKp ",
  " KpcCCCcpKp ",
  " KpccccccK  ",
  " KPpppppPK  ",
  "  KPPPPPK   ",
  "  KbbbbbK   ",
  "   KKKKK    ",
  "            "
]);

// ---- SPRITZ APERITIVO (heal) — calice arancione ----
const SPRITZ = ic([
  "  KKKKKKKK  ",
  "  KgaaaaaK  ",
  "  KaaaaaaK  ",
  "  KaaaaArK  ",
  "  KAaaaaAK  ",
  "   KAaaAK   ",
  "    KaaK    ",
  "    KaaK    ",
  "    KaaK    ",
  "   KssssK   ",
  "  KsssssssK ",
  "   KKKKKKK  "
]);

// ---- MOJITO DEL PAPEETE (heal full) — bicchiere verde con foglia ----
const MOJITO = ic([
  " m  KmK     ",
  "  KmmmmK    ",
  "  KgmmmgK   ",
  "  KgmMmgK   ",
  "  KgmmmgK   ",
  "  KgMmMgK   ",
  "  KgmmmgK   ",
  "  KgmMmgK   ",
  "  KgggggK   ",
  "  KggggggK  ",
  "   KKKKK    ",
  "            "
]);

// ---- MAALOX DI STATO (cure) — flacone con croce ----
const MAALOX = ic([
  "    KKKK    ",
  "    KssK    ",
  "   KLLLLK   ",
  "  KLllllLK  ",
  "  KlrrrrlK  ",
  "  KlrwwrlK  ",
  "  KlrwwrlK  ",
  "  KlrrrrlK  ",
  "  KlllllLK  ",
  "  KLllllLK  ",
  "   KLLLLK   ",
  "    KKKK    "
]);

// ---- TESSERA DORATA (evo) — tessera oro con stella ----
const TESSERA = ic([
  "            ",
  " KKKKKKKKKK ",
  " KOOOOOOOOK ",
  " KOooooooOK ",
  " KOoKKwooOK ",
  " KOowwKooOK ",
  " KOoKwwwoOK ",
  " KOowwKKoOK ",
  " KOooooooOK ",
  " KOOOOOOOOK ",
  " KKKKKKKKKK ",
  "            "
]);

// ---- DIVISA EQUA (key) — fascia tricolore ----
const DIVISA = ic([
  "  KKKKKKKK  ",
  " KvvvwwwrrK ",
  " KvvvwwwrrK ",
  " KvvvwwwrrK ",
  "  KvvwwwrK  ",
  "   KvwwrK   ",
  "    KwrK    ",
  "    KOOK    ",
  "   KOooOK   ",
  "   KOooOK   ",
  "    KOOK    ",
  "     KK     "
]);

// ---- DIRETTIVA DI PARTITO (tm) — cartella/documento, banda colore tipo ----
// Il colore della banda (T/t) viene iniettato col colore del TIPO della mossa.
const DIRETTIVA = [
  "  KKKKKKKK  ",
  " KwwwwwwwwK ",
  " KwTTTTTTwK ",
  " KwTttttTwK ",
  " KwTTTTTTwK ",
  " KwwwwwwwwK ",
  " KwKKwKKwwK ",
  " KwwwwwwwwK ",
  " KwKKwKKwwK ",
  " KwwwwwwwwK ",
  " KWWWWWWWWK ",
  "  KKKKKKKK  "
];

function shade(hex: string, f: number): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  const c = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const STATIC: Record<string, Pixmap> = {
  scheda: SCHEDA,
  schedona: SCHEDONA,
  caffe: CAFFE,
  spritz: SPRITZ,
  mojito: MOJITO,
  maalox: MAALOX,
  tessera: TESSERA,
  divisa: DIVISA
};

const iconCache = new Map<string, Pixmap>();

/** Icona 12x12 dell'oggetto. Le DIRETTIVE prendono il colore del loro tipo. */
export function itemIcon(itemId: string): Pixmap {
  const cached = iconCache.get(itemId);
  if (cached) {
    return cached;
  }
  let pix: Pixmap;
  const item = ITEMS[itemId];
  if (item && item.kind === "tm" && item.moveId) {
    const type = MOVES[item.moveId]?.type;
    const base = (type && TYPE_COLORS[type]) || "#9aa0b0";
    pix = ic(DIRETTIVA, { T: base, t: shade(base, 0.6) });
  } else {
    pix = STATIC[itemId] ?? SCHEDA;
  }
  iconCache.set(itemId, pix);
  return pix;
}

export const ITEM_ICON_SIZE = ICON_W;
