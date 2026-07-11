import type { Input } from "../engine/input";
import { CHAR_W, LINE_H } from "../engine/font";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { audio } from "../engine/audio";
import { getSpriteImage } from "../engine/assets";
import type { CoalitionChannel, MembershipStatus } from "../game/coalition";
import type { DistrictId, DistrictState } from "../game/election";

export const INK = "#10141f";
export const PAPER = "#f8f8f0";
export const GREY = "#9aa0b8";

export interface AllyCardView {
  readonly name: string;
  readonly tag: string;
  readonly bonusLabel: string;
  readonly malusLabel: string;
  readonly lineRedLabel: string;
  readonly status: MembershipStatus | "candidate" | "broken";
  readonly selected?: boolean;
}

export function drawLineRedChip(screen: Screen, x: number, y: number, label: string, active = false): void {
  const w = Math.max(32, Math.min(112, 14 + clipToWidth(label, 96).length * CHAR_W));
  const bg = active ? "#ffe0d5" : "#fff0bd";
  const border = active ? "#bd3d35" : "#b77718";
  screen.rect(x + 2, y, w - 4, 12, border);
  screen.rect(x, y + 2, w, 8, border);
  screen.rect(x + 2, y + 2, w - 4, 8, bg);
  screen.text(`! ${clipToWidth(label, w - 18)}`, x + 6, y + 3, active ? "#8f251f" : "#70470e");
}

export function drawAllyCard(screen: Screen, x: number, y: number, w: number, view: AllyCardView): void {
  const h = 42;
  screen.panel(x, y, w, h, "card");
  if (view.selected) {
    screen.frame(x + 1, y + 1, w - 2, h - 2, "#e6b944");
    screen.rect(x + 4, y + 4, 4, h - 8, "#e6b944");
  }
  const statusLabel = view.status === "candidate" ? "LIBERO" : view.status === "broken" ? "ROTTO" : view.status.toUpperCase();
  screen.text(clipToWidth(view.name, w - 78), x + 9, y + 8, INK);
  screen.textRight(clipToWidth(`${view.tag} ${statusLabel}`, 66), x + w - 8, y + 8, view.status === "broken" ? "#bd3d35" : "#497b65");
  screen.text(clipToWidth(`+ ${view.bonusLabel}`, Math.floor((w - 22) / 2)), x + 9, y + 20, "#26745d");
  screen.textRight(clipToWidth(`- ${view.malusLabel}`, Math.floor((w - 22) / 2)), x + w - 8, y + 20, "#a0443e");
  drawLineRedChip(screen, x + 8, y + 28, view.lineRedLabel, view.status === "strained" || view.status === "broken");
}

export function drawConsensusBar(screen: Screen, x: number, y: number, w: number, value: number, label = "CONSENSO"): void {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  screen.text(clipToWidth(label, w - 48), x, y, INK);
  screen.textRight(`${safe}%`, x + w, y, safe > 50 ? "#26745d" : safe === 50 ? "#9a6716" : "#a0443e");
  screen.rect(x, y + 11, w, 7, "#17243d");
  screen.rect(x + 1, y + 12, w - 2, 5, "#d5d8dd");
  screen.rect(x + 1, y + 12, Math.round((w - 2) * safe / 100), 5, safe > 50 ? "#55a889" : safe === 50 ? "#e6b944" : "#d76458");
  const thresholdX = x + 1 + Math.round((w - 2) * 0.5);
  screen.rect(thresholdX, y + 10, 1, 9, "#10141f");
}

const DISTRICT_LABELS: Readonly<Record<DistrictId, string>> = {
  nord: "NORD", centro: "CENTRO", sud: "SUD", isole: "ISOLE", feed: "FEED"
};

export function drawDistrictMap(screen: Screen, x: number, y: number, districts: readonly DistrictState[], selected: DistrictId | null = null): void {
  for (let i = 0; i < 5; i += 1) {
    const district = districts[i];
    if (!district) continue;
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = x + col * 72;
    const cy = y + row * 31;
    screen.panel(cx, cy, 68, 27, "card");
    if (district.id === selected) screen.frame(cx + 2, cy + 2, 64, 23, "#e0a92f");
    screen.text(DISTRICT_LABELS[district.id], cx + 7, cy + 7, INK);
    screen.textRight(String(district.localConsensus), cx + 60, cy + 7, district.localConsensus >= 50 ? "#26745d" : "#a0443e");
    screen.text(`${district.outcomes.length}/2`, cx + 7, cy + 17, GREY);
  }
}

export interface ChoicePreviewLine {
  readonly label: string;
  readonly value: string;
  readonly tone?: "good" | "bad" | "neutral";
}

export function drawChoicePreview(screen: Screen, x: number, y: number, w: number, title: string, lines: readonly ChoicePreviewLine[], selected = false): void {
  const visible = lines.slice(0, 3);
  const h = 22 + visible.length * 11;
  screen.panel(x, y, w, h, "menu");
  if (selected) {
    screen.frame(x + 1, y + 1, w - 2, h - 2, "#e6b944");
    screen.rect(x + 4, y + 4, w - 8, 13, "#f4d34a");
  }
  screen.text(clipToWidth(`${selected ? "> " : "  "}${title}`, w - 70), x + 9, y + 8, INK);
  if (selected) screen.textRight("SCELTA", x + w - 9, y + 8, "#70470e");
  let cy = y + 20;
  for (const line of visible) {
    const color = line.tone === "good" ? "#26745d" : line.tone === "bad" ? "#a0443e" : GREY;
    const labelWidth = Math.min(line.label.length * CHAR_W, Math.floor((w - 26) * 0.58));
    const valueWidth = w - 26 - labelWidth;
    screen.text(clipToWidth(line.label, labelWidth), x + 9, cy, color);
    screen.textRight(clipToWidth(line.value, valueWidth), x + w - 9, cy, color);
    cy += 11;
  }
}

export function coalitionChannelLabel(channel: CoalitionChannel): string {
  return ({ funds: "FONDI", sondaggiGain: "SONDAGGI", territoryGain: "TERRITORIO", shopPrice: "PREZZI" } as const)[channel];
}

// Intestazione condivisa delle schermate di gestione: fascia compatta ad alto
// contrasto, bordo oro e contenuto chiaro. Evita cinque varianti quasi uguali.
export function drawScreenHeader(
  screen: Screen,
  title: string,
  right = "",
  rightColor = "#ffe38a"
): void {
  screen.rect(0, 0, VIEW_W, 17, "#17243d");
  screen.rect(0, 15, VIEW_W, 2, "#e6b944");
  screen.text(clipToWidth(title, right ? 132 : VIEW_W - 16), 8, 5, "#fffaf0");
  if (right) {
    screen.textRight(right, VIEW_W - 8, 5, rightColor);
  }
}

// Accessibilità (RIDUCI EFFETTI): quando true, le parole "urlate" nel box di
// dialogo restano ROSSE e MAIUSCOLE (l'enfasi/informazione resta) ma NON tremano.
// Flag di modulo perché MessageBox è istanziato in decine di scene senza stato:
// lo si aggiorna una volta al load/toggle con setReduceMotion.
let reduceMotion = false;
export function setReduceMotion(on: boolean): void {
  reduceMotion = on;
}

// Tronca una stringa perché stia in `maxWidth` px (font 5x7), aggiungendo "…"
// se serve. Usato dai menu per non far sforare le voci lunghe oltre il box.
export function clipToWidth(text: string, maxWidth: number): string {
  const maxChars = Math.floor(maxWidth / CHAR_W);
  if (maxChars <= 0) {
    return "";
  }
  if (text.length <= maxChars) {
    return text;
  }
  if (maxChars === 1) {
    return "…";
  }
  return text.slice(0, maxChars - 1) + "…";
}

// Spezza il testo in righe che stanno nel box di dialogo.
export function wrapText(text: string, maxChars: number): string[] {
  // Una singola parola più lunga di maxChars (URL, nome incollato) non ha spazi
  // su cui spezzare: la si taglia a pezzi di maxChars, altrimenti sforerebbe il
  // box a destra. Pre-passaggio prima del wrap sugli spazi.
  const words: string[] = [];
  for (const raw of text.split(" ")) {
    let w = raw;
    while (w.length > maxChars) {
      words.push(w.slice(0, maxChars));
      w = w.slice(maxChars);
    }
    words.push(w);
  }
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

// Box messaggi in stile Pokémon con effetto macchina da scrivere.
export class MessageBox {
  private pages: string[][] = [];
  private pageIndex = 0;
  private chars = 0;
  private done = false;
  onFinished: (() => void) | null = null;

  get isOpen(): boolean {
    return this.pages.length > 0;
  }

  // Accoda messaggi; ogni stringa diventa una o più pagine da 2 righe.
  show(messages: string[], onFinished?: () => void): void {
    this.pages = [];
    for (const message of messages) {
      const lines = wrapText(message, 36);
      for (let i = 0; i < lines.length; i += 2) {
        this.pages.push(lines.slice(i, i + 2));
      }
    }
    this.pageIndex = 0;
    this.chars = 0;
    this.done = this.pages.length === 0;
    this.onFinished = onFinished ?? null;
    if (this.done) {
      onFinished?.();
    }
  }

  close(): void {
    this.pages = [];
    this.pageIndex = 0;
  }

  update(dt: number, input: Input): void {
    if (!this.isOpen) {
      return;
    }
    // Toccare il box di dialogo avanza/completa la pagina (come premere A).
    const boxY = VIEW_H - 44;
    const tapped = input.tapInRect(0, boxY, VIEW_W, 44);
    const advance = input.wasPressed("a") || input.wasPressed("b") || tapped;
    const page = this.pages[this.pageIndex];
    const total = page.join("").length;
    if (this.chars < total) {
      const before = Math.floor(this.chars);
      this.chars = Math.min(total, this.chars + dt * 60);
      if (advance) {
        this.chars = total;
      } else {
        // Tick sonoro leggero del "typewriter": un cue ogni ~3 caratteri
        // rivelati (non a ogni frame), come le vecchie caselle di testo.
        const after = Math.floor(this.chars);
        if (after < total && Math.floor(after / 3) !== Math.floor(before / 3)) {
          audio.textTick();
        }
      }
      return;
    }
    if (advance) {
      audio.cursor();
      if (this.pageIndex < this.pages.length - 1) {
        this.pageIndex += 1;
        this.chars = 0;
      } else {
        const callback = this.onFinished;
        this.close();
        callback?.();
      }
    }
  }

  // Tempo per far lampeggiare l'indicatore "continua" e agitare le urla.
  private blink = 0;

  // Una parola "urlata" (BREAKING NEWS!, SUPER EFFICACE!): tutta MAIUSCOLA e
  // seguita da "!". Riceve un micro-tremolio per dare enfasi.
  private static isShout(word: string): boolean {
    const bare = word.replace(/[!]+$/, "");
    return word.endsWith("!") && bare.length >= 2 && /[A-ZÀÈÉÌÒÙ]/.test(bare) && bare === bare.toUpperCase();
  }

  // La riga contiene almeno una parola urlata? (evita il render token-per-token
  // quando non serve).
  private static hasShout(line: string): boolean {
    return line.split(" ").some((w) => MessageBox.isShout(w));
  }

  draw(screen: Screen): void {
    if (!this.isOpen) {
      return;
    }
    this.blink += 1;
    const boxY = VIEW_H - 44;
    screen.panel(2, boxY, VIEW_W - 4, 42, "dialog");
    const page = this.pages[this.pageIndex];
    let remaining = Math.floor(this.chars);
    for (let i = 0; i < page.length; i += 1) {
      const line = page[i];
      const shown = Math.max(0, remaining);
      const visible = line.slice(0, shown);
      const lineY = boxY + 9 + i * (LINE_H + 4);
      // Rende la riga token per token: le parole URLATE! tremano leggermente,
      // il resto è testo normale (nessun costo se la riga non ha urla).
      if (MessageBox.hasShout(line)) {
        let cx = 12;
        let idx = 0; // indice carattere nella riga completa
        const words = line.split(" ");
        for (let w = 0; w < words.length; w += 1) {
          const word = words[w] + (w < words.length - 1 ? " " : "");
          const wordVisible = word.slice(0, Math.max(0, shown - idx));
          if (wordVisible.length > 0) {
            const shout = MessageBox.isShout(words[w]);
            // RIDUCI EFFETTI: niente tremolio (testo statico), colore ed enfasi restano.
            const jx = shout && !reduceMotion ? Math.round(Math.sin(this.blink * 0.9 + w) * 1) : 0;
            const jy = shout && !reduceMotion ? Math.round(Math.cos(this.blink * 1.1 + w) * 1) : 0;
            screen.text(wordVisible, cx + jx, lineY + jy, shout ? "#d84848" : INK);
          }
          cx += word.length * CHAR_W;
          idx += word.length;
        }
      } else {
        screen.text(visible, 12, lineY, INK);
      }
      remaining -= line.length;
    }
    const total = page.join("").length;
    if (this.chars >= total) {
      // Freccia lampeggiante: segnala chiaramente che si può proseguire.
      if (Math.floor(this.blink / 20) % 2 === 0) {
        screen.text("▼", VIEW_W - 16, boxY + 30, INK);
      }
      // Hint discreto: come avanzare (utile per i nuovi giocatori).
      const more = this.pageIndex < this.pages.length - 1;
      screen.text(more ? "A: AVANTI" : "A: OK", 12, boxY + 30, GREY);
    }
  }
}

export interface MenuItem {
  label: string;
  rightLabel?: string;
  disabled?: boolean;
  iconPath?: string;
  iconId?: string;
}

// Menu verticale con cursore.
export class Menu {
  index = 0;
  // Finestra di scorrimento: prima voce visibile quando la lista è più lunga
  // del numero di righe mostrabili (impostato in draw via maxVisible).
  private scroll = 0;
  // Geometria dell'ultima draw(): serve per il tocco diretto sulle voci.
  private geom: { x: number; y: number; w: number; rowH: number; first: number } | null = null;

  constructor(public items: MenuItem[]) {}

  update(input: Input): "select" | "cancel" | null {
    // Tocco diretto su una voce (puntatore): tap su una voce diversa la
    // seleziona, tap di nuovo sulla voce già evidenziata = conferma.
    const touchResult = this.handleTap(input);
    if (touchResult !== undefined) {
      return touchResult;
    }
    if (this.items.length === 0) {
      if (input.wasPressed("b")) {
        return "cancel";
      }
      return null;
    }
    if (input.wasPressed("up")) {
      this.index = (this.index + this.items.length - 1) % this.items.length;
      audio.cursor();
    }
    if (input.wasPressed("down")) {
      this.index = (this.index + 1) % this.items.length;
      audio.cursor();
    }
    if (input.wasPressed("a")) {
      if (this.items[this.index]?.disabled) {
        audio.cancel();
        return null;
      }
      audio.confirm();
      return "select";
    }
    if (input.wasPressed("b")) {
      audio.cancel();
      return "cancel";
    }
    return null;
  }

  // Gestisce il tocco sul pannello del menu. Restituisce undefined se non c'è
  // stato un tap rilevante (così update() prosegue con tastiera/d-pad).
  private handleTap(input: Input): "select" | "cancel" | null | undefined {
    if (!this.geom || this.items.length === 0) {
      return undefined;
    }
    const { x, y, w, rowH, first } = this.geom;
    const visible = this.lastVisibleCount();
    const h = visible * rowH + 14;
    const tap = input.consumeTap();
    if (!tap) {
      return undefined;
    }
    if (tap.x < x || tap.x >= x + w || tap.y < y || tap.y >= y + h) {
      return undefined; // tocco fuori dal menu: lascia decidere alla scena
    }
    const rowOnScreen = Math.floor((tap.y - (y + 8) + rowH / 2) / rowH);
    const row = first + rowOnScreen;
    if (rowOnScreen < 0 || row < 0 || row >= this.items.length) {
      return undefined;
    }
    input.clearTap();
    if (row === this.index) {
      if (this.items[this.index]?.disabled) {
        audio.cancel();
        return null;
      }
      audio.confirm();
      return "select";
    }
    this.index = row;
    audio.cursor();
    return null;
  }

  // Numero di righe visibili date altezza riga e finestra max impostata in draw.
  private maxVisible = Infinity;
  private hasIcons = false;

  private lastVisibleCount(): number {
    return Math.min(this.items.length, this.maxVisible);
  }

  // `maxVisible`: se la lista è più lunga, scorre mostrando solo questa finestra
  // (con frecce ▲▼). Evita che liste lunghe (borsa/shop) sforino lo schermo.
  draw(screen: Screen, x: number, y: number, w: number, rowH = 13, maxVisible = Infinity): void {
    this.maxVisible = maxVisible;
    this.hasIcons = this.items.some((it) => it.iconPath);
    const visible = Math.min(this.items.length, maxVisible);
    // Tieni il cursore nella finestra visibile.
    if (this.index < this.scroll) {
      this.scroll = this.index;
    } else if (this.index >= this.scroll + visible) {
      this.scroll = this.index - visible + 1;
    }
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, this.items.length - visible)));
    const first = this.scroll;
    this.geom = { x, y, w, rowH, first };
    const h = visible * rowH + 14;
    screen.panel(x, y, w, h, "menu");
    const iconPad = this.hasIcons ? 16 : 0;
    for (let row = 0; row < visible; row += 1) {
      const i = first + row;
      const item = this.items[i];
      if (!item) {
        break;
      }
      const rowY = y + 8 + row * rowH;
      const color = item.disabled ? GREY : INK;
      if (i === this.index) {
        screen.rect(x + 5, rowY - 3, w - 10, rowH, "#fff0bd");
        screen.rect(x + 5, rowY - 3, 2, rowH, "#e0a92f");
        screen.text("►", x + 8, rowY, "#8c5b12");
      }
      if (item.iconPath) {
        const icon = getSpriteImage(item.iconId ?? `mi-${i}`, item.iconPath);
        if (icon) {
          const s = Math.min(12 / icon.width, 12 / icon.height);
          const dw = icon.width * s;
          const dh = icon.height * s;
          screen.imageSprite(icon, x + 15 + (12 - dw) / 2, rowY - 3 + (12 - dh) / 2, { scaleX: s, scaleY: s });
        }
      }
      const rightW = item.rightLabel ? item.rightLabel.length * CHAR_W + 6 : 0;
      const labelX = x + 18 + iconPad;
      const labelMaxW = w - 24 - iconPad - rightW;
      screen.text(clipToWidth(item.label, labelMaxW), labelX, rowY, color);
      if (item.rightLabel) {
        screen.textRight(item.rightLabel, x + w - 8, rowY, color);
      }
    }
    // Indicatori di scorrimento.
    if (first > 0) {
      screen.text("▲", x + w - 12, y + 4, GREY);
    }
    if (first + visible < this.items.length) {
      screen.text("▼", x + w - 12, y + h - 10, GREY);
    }
  }

  measureHeight(rowH = 13, maxVisible = Infinity): number {
    return Math.min(this.items.length, maxVisible) * rowH + 14;
  }

  measureWidth(): number {
    let max = 0;
    for (const item of this.items) {
      const len = item.label.length + (item.rightLabel ? item.rightLabel.length + 1 : 0);
      max = Math.max(max, len);
    }
    return max * CHAR_W + 30;
  }
}

export function drawHpBar(
  screen: Screen,
  x: number,
  y: number,
  width: number,
  current: number,
  max: number
): void {
  const ratio = Math.max(0, Math.min(1, current / max));
  const hpFrame = getSpriteImage("ui:hpbar", "ui/hpbar.png");
  const insetX = hpFrame ? Math.max(2, Math.round(width * 0.045)) : 1;
  const insetY = hpFrame ? 2 : 1;
  const innerH = hpFrame ? 3 : 5;
  const fillW = Math.round((width - insetX * 2) * ratio);
  const color = ratio > 0.5 ? "#48b848" : ratio > 0.2 ? "#d8b838" : "#d04848";
  screen.text("PV", x - 14, y - 1, INK);
  if (hpFrame) {
    screen.imageSprite(hpFrame, x, y, { scaleX: width / hpFrame.width, scaleY: 7 / hpFrame.height });
  } else {
    screen.frame(x, y, width, 7, INK);
  }
  screen.rect(x + insetX, y + insetY, width - insetX * 2, innerH, "#c8c8c0");
  if (fillW > 0) {
    screen.rect(x + insetX, y + insetY, fillW, innerH, color);
  }
}
