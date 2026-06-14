import type { Input } from "../engine/input";
import { CHAR_W, LINE_H } from "../engine/font";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { audio } from "../engine/audio";

export const INK = "#10141f";
export const PAPER = "#f8f8f0";
export const GREY = "#9aa0b8";

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
  const words = text.split(" ");
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
      this.chars = Math.min(total, this.chars + dt * 60);
      if (advance) {
        this.chars = total;
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

  // Tempo per far lampeggiare l'indicatore "continua".
  private blink = 0;

  draw(screen: Screen): void {
    if (!this.isOpen) {
      return;
    }
    this.blink += 1;
    const boxY = VIEW_H - 44;
    screen.panel(0, boxY, VIEW_W, 44);
    const page = this.pages[this.pageIndex];
    let remaining = Math.floor(this.chars);
    for (let i = 0; i < page.length; i += 1) {
      const line = page[i];
      const visible = line.slice(0, Math.max(0, remaining));
      remaining -= line.length;
      screen.text(visible, 10, boxY + 10 + i * (LINE_H + 4), INK);
    }
    const total = page.join("").length;
    if (this.chars >= total) {
      // Freccia lampeggiante: segnala chiaramente che si può proseguire.
      if (Math.floor(this.blink / 20) % 2 === 0) {
        screen.text("▼", VIEW_W - 16, boxY + 32, INK);
      }
      // Hint discreto: come avanzare (utile per i nuovi giocatori).
      const more = this.pageIndex < this.pages.length - 1;
      screen.text(more ? "A: AVANTI" : "A: OK", 10, boxY + 33, GREY);
    }
  }
}

export interface MenuItem {
  label: string;
  rightLabel?: string;
  disabled?: boolean;
}

// Menu verticale con cursore.
export class Menu {
  index = 0;
  // Geometria dell'ultima draw(): serve per il tocco diretto sulle voci.
  private geom: { x: number; y: number; w: number; rowH: number } | null = null;

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
    const { x, y, w, rowH } = this.geom;
    const h = this.items.length * rowH + 14;
    const tap = input.consumeTap();
    if (!tap) {
      return undefined;
    }
    if (tap.x < x || tap.x >= x + w || tap.y < y || tap.y >= y + h) {
      return undefined; // tocco fuori dal menu: lascia decidere alla scena
    }
    const row = Math.floor((tap.y - (y + 8) + rowH / 2) / rowH);
    if (row < 0 || row >= this.items.length) {
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

  draw(screen: Screen, x: number, y: number, w: number, rowH = 13): void {
    this.geom = { x, y, w, rowH };
    const h = this.items.length * rowH + 14;
    screen.panel(x, y, w, h);
    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      const rowY = y + 8 + i * rowH;
      const color = item.disabled ? GREY : INK;
      if (i === this.index) {
        screen.text("►", x + 7, rowY, INK);
      }
      // Spazio disponibile per la label: dal margine sinistro (x+16) al bordo
      // destro del box (x+w-8), meno la rightLabel se presente. Così le voci
      // lunghe vengono troncate dentro al pannello invece di sforare.
      const rightW = item.rightLabel ? item.rightLabel.length * CHAR_W + 6 : 0;
      const labelMaxW = w - 24 - rightW;
      screen.text(clipToWidth(item.label, labelMaxW), x + 16, rowY, color);
      if (item.rightLabel) {
        screen.textRight(item.rightLabel, x + w - 8, rowY, color);
      }
    }
  }

  measureHeight(rowH = 13): number {
    return this.items.length * rowH + 14;
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
  const fillW = Math.round((width - 2) * ratio);
  const color = ratio > 0.5 ? "#48b848" : ratio > 0.2 ? "#d8b838" : "#d04848";
  screen.text("PV", x - 14, y - 1, INK);
  screen.frame(x, y, width, 7, INK);
  screen.rect(x + 1, y + 1, width - 2, 5, "#c8c8c0");
  if (fillW > 0) {
    screen.rect(x + 1, y + 1, fillW, 5, color);
  }
}
