import type { Input } from "../engine/input";
import { CHAR_W, LINE_H } from "../engine/font";
import { Screen, VIEW_H, VIEW_W, type Pixmap } from "../engine/screen";
import { audio } from "../engine/audio";
import { getSpriteImage } from "../engine/assets";

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
  icon?: Pixmap; // icona 12x12 opzionale, disegnata a sinistra della voce
  iconId?: string; // chiave di cache per lo sprite dell'icona
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
    this.hasIcons = this.items.some((it) => it.icon);
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
    screen.panel(x, y, w, h);
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
        screen.text("►", x + 7, rowY, INK);
      }
      if (item.icon) {
        // Icona 12x12 allineata alla riga (leggermente alzata per centrare).
        screen.sprite(item.iconId ?? `mi-${i}`, item.icon, x + 15, rowY - 3);
      }
      const rightW = item.rightLabel ? item.rightLabel.length * CHAR_W + 6 : 0;
      const labelX = x + 16 + iconPad;
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
