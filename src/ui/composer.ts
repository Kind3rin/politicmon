import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import {
  closeNativeKeyboard, nativeKeyboardAvailable, openNativeKeyboard,
  refocusNativeKeyboard, setNativeKeyboardValue
} from "../engine/nativeInput";
import { Screen, VIEW_W } from "../engine/screen";
import { GREY, INK, PAPER } from "./widgets";

// Composer condiviso da ChatScene e TalkScene: scrivere col pad è lento, quindi
// la vista di default è una griglia di FRASI RAPIDE (un tasto = messaggio
// inviato). La TASTIERA resta per il testo libero, le EMOTE (opzionali) per i
// fumetti in mappa. Tab in alto per cambiare vista + tasto INVIA per il testo
// composto. Supporta d-pad E tocco diretto (tap su frase/tasto/tab).

const KEY_ROWS = [
  "ABCDEFGHI",
  "JKLMNOPQR",
  "STUVWXYZ_",
  "0123456789",
  " ?!.,:-'"
];

// Frasi rapide: max 18 char (2 colonne da 114px, font 6px/char).
const PHRASES = [
  "CIAO!",
  "COME VA?",
  "SCAMBIAMO?",
  "TI SFIDO!",
  "DOVE SEI?",
  "ARRIVO!",
  "BELLA SQUADRA!",
  "GG!",
  "DEVO ANDARE",
  "A DOPO!"
];
const PHRASE_COLS = 2;
const PHRASE_ROWS = 5;

// Emote: max 2 caratteri (mp.ts tronca a 2), solo glifi presenti nel font 5x7.
const EMOTES: Array<{ ch: string; label: string }> = [
  { ch: "!", label: "CIAO" },
  { ch: "?", label: "BOH" },
  { ch: "★", label: "TOP" },
  { ch: "♪", label: "FESTA" },
  { ch: "▲", label: "SU" },
  { ch: "▼", label: "GIÙ" },
  { ch: "GG", label: "GG" },
  { ch: "OK", label: "OK" },
  { ch: "NO", label: "NO" },
  { ch: "€", label: "RICCO" },
  { ch: "!!", label: "WOW" }
];
const EMOTE_COLS = 6;

const MAX = 60;
// Passi orizzontali: tastiera 9 col da 24px, frasi 2 col da 114px, emote 6 da 39px.
const KX = 6;
const KEY_STEP = 24;
const PHRASE_STEP = 114;
const EMOTE_STEP = 39;
const ROW_H = 11;

type Tab = "frasi" | "keys" | "emote" | "tel";

export type ComposerEvent =
  | { kind: "phrase"; text: string }
  | { kind: "text"; text: string }
  | { kind: "emote"; emote: string };

// Altezza totale occupata dal composer (riga composizione + tab + griglia).
export const COMPOSER_H = 16 + 13 + PHRASE_ROWS * ROW_H;

export class Composer {
  text = "";
  private tab: Tab = "frasi";
  private area: "tabs" | "grid" = "grid";
  private tabIdx = 0;
  private row = 0;
  private col = 0;
  // y dell'ultima draw(): serve per l'hit-test dei tap (prima draw = nessun tap
  // possibile, il tap dura un frame).
  private y0 = -1000;
  // Tastiera nativa attiva (solo su touch, tab "TEL⌨"): il testo arriva dal
  // vero <input> del telefono, non dalla griglia a schermo.
  private hasNative = nativeKeyboardAvailable();
  private nativeOn = false;

  constructor(private withEmotes: boolean) {}

  // Etichette della riga tab. Su touch aggiunge "TEL⌨" (tastiera di sistema);
  // l'ultima è sempre INVIA.
  private tabs(): string[] {
    const base = this.withEmotes ? ["FRASI", "TASTIERA", "EMOTE"] : ["FRASI", "TASTIERA"];
    if (this.hasNative) {
      base.push("TEL⌨");
    }
    base.push("INVIA");
    return base;
  }

  // Da chiamare in onExit della scena: chiude la tastiera di sistema.
  dispose(): void {
    if (this.nativeOn) {
      closeNativeKeyboard();
      this.nativeOn = false;
    }
  }

  private openNative(): void {
    this.nativeOn = openNativeKeyboard({
      initial: this.text,
      maxLength: MAX,
      onInput: (v) => {
        this.text = v;
      }
      // onSubmit non chiude: l'INVIO della tastiera nativa lo gestisce la scena
      // via l'evento "text" quando l'utente tocca INVIA. (Molte tastiere non
      // hanno un vero submit in un input a riga singola.)
    });
  }

  // B premuto: cancella un carattere. false = niente da cancellare (la scena
  // decide se chiudersi).
  backspace(): boolean {
    if (this.text.length > 0) {
      this.text = this.text.slice(0, -1);
      if (this.nativeOn) {
        setNativeKeyboardValue(this.text);
      }
      audio.cancel();
      return true;
    }
    return false;
  }

  update(input: Input): ComposerEvent | null {
    const tapped = this.handleTap(input);
    if (tapped !== undefined) {
      return tapped;
    }
    this.navigate(input);
    if (input.wasPressed("a")) {
      return this.activate();
    }
    return null;
  }

  // ---- Navigazione d-pad ----

  private gridRows(): number {
    if (this.tab === "frasi") return PHRASE_ROWS;
    if (this.tab === "keys") return KEY_ROWS.length;
    if (this.tab === "tel") return 1; // riga fittizia (nessuna cella navigabile)
    return Math.ceil(EMOTES.length / EMOTE_COLS);
  }

  private gridCols(row: number): number {
    if (this.tab === "frasi") return PHRASE_COLS;
    if (this.tab === "keys") return KEY_ROWS[row]?.length ?? 0;
    if (this.tab === "tel") return 1;
    return Math.min(EMOTE_COLS, EMOTES.length - row * EMOTE_COLS);
  }

  private navigate(input: Input): void {
    const up = input.wasPressed("up");
    const down = input.wasPressed("down");
    const left = input.wasPressed("left");
    const right = input.wasPressed("right");
    if (!up && !down && !left && !right) {
      return;
    }
    audio.cursor();
    if (this.area === "tabs") {
      const n = this.tabs().length;
      if (left) this.tabIdx = (this.tabIdx + n - 1) % n;
      if (right) this.tabIdx = (this.tabIdx + 1) % n;
      if (down) {
        this.area = "grid";
        this.row = 0;
        this.col = Math.min(this.col, this.gridCols(0) - 1);
      }
      return;
    }
    // area "grid"
    if (up) {
      if (this.row === 0) {
        this.area = "tabs";
      } else {
        this.row -= 1;
        this.col = Math.min(this.col, this.gridCols(this.row) - 1);
      }
      return;
    }
    if (down && this.row < this.gridRows() - 1) {
      this.row += 1;
      this.col = Math.min(this.col, this.gridCols(this.row) - 1);
      return;
    }
    const cols = this.gridCols(this.row);
    if (left) this.col = (this.col + cols - 1) % cols;
    if (right) this.col = (this.col + 1) % cols;
  }

  // ---- Attivazione (A o tap-conferma) ----

  private activate(): ComposerEvent | null {
    if (this.area === "tabs") {
      const label = this.tabs()[this.tabIdx];
      if (label === "INVIA") {
        return this.emitText();
      }
      const prev = this.tab;
      this.tab =
        label === "FRASI" ? "frasi" :
        label === "TASTIERA" ? "keys" :
        label === "EMOTE" ? "emote" : "tel";
      // Lasciando/entrando nella tab TEL apri/chiudi la tastiera di sistema.
      if (this.tab === "tel" && !this.nativeOn) {
        this.openNative();
      } else if (prev === "tel" && this.tab !== "tel" && this.nativeOn) {
        closeNativeKeyboard();
        this.nativeOn = false;
      }
      this.area = "grid";
      this.row = 0;
      this.col = 0;
      audio.cursor();
      return null;
    }
    if (this.tab === "frasi") {
      const phrase = PHRASES[this.row * PHRASE_COLS + this.col];
      if (phrase) {
        audio.confirm();
        return { kind: "phrase", text: phrase };
      }
      return null;
    }
    if (this.tab === "keys") {
      const ch = KEY_ROWS[this.row][this.col];
      if (ch && this.text.length < MAX) {
        this.text += ch;
        audio.cursor();
      }
      return null;
    }
    if (this.tab === "tel") {
      // Nessuna griglia: A/tap riapre la tastiera se il sistema l'ha chiusa.
      refocusNativeKeyboard();
      return null;
    }
    const emote = EMOTES[this.row * EMOTE_COLS + this.col];
    if (emote) {
      audio.confirm();
      return { kind: "emote", emote: emote.ch };
    }
    return null;
  }

  private emitText(): ComposerEvent | null {
    const t = this.text.trim();
    if (!t) {
      audio.cancel();
      return null;
    }
    this.text = "";
    audio.confirm();
    return { kind: "text", text: t };
  }

  // ---- Tocco diretto ----

  // undefined = nessun tap rilevante (prosegui con il d-pad).
  private handleTap(input: Input): ComposerEvent | null | undefined {
    const tabsY = this.y0 + 16;
    const gridY = this.y0 + 29;
    // Tab: celle larghe quanto la label + margine.
    const labels = this.tabs();
    let x = KX;
    for (let i = 0; i < labels.length; i += 1) {
      const w = labels[i].length * 6 + 10;
      const tx = labels[i] === "INVIA" ? VIEW_W - w - 4 : x;
      if (input.tapInRect(tx - 2, tabsY - 2, w, 11)) {
        this.area = "tabs";
        this.tabIdx = i;
        return this.activate();
      }
      if (labels[i] !== "INVIA") {
        x += w + 6;
      }
    }
    // Tab TEL: nessuna griglia, il tap sull'area di testo riapre la tastiera.
    if (this.tab === "tel") {
      if (input.tapInRect(4, gridY - 2, VIEW_W - 8, ROW_H * 3)) {
        refocusNativeKeyboard();
        return null;
      }
      return undefined;
    }
    // Griglia della tab attiva.
    for (let r = 0; r < this.gridRows(); r += 1) {
      for (let c = 0; c < this.gridCols(r); c += 1) {
        const step = this.tab === "frasi" ? PHRASE_STEP : this.tab === "keys" ? KEY_STEP : EMOTE_STEP;
        const w = this.tab === "keys" ? 14 : step - 4;
        if (input.tapInRect(KX + c * step - 2, gridY + r * ROW_H - 2, w, ROW_H)) {
          this.area = "grid";
          this.row = r;
          this.col = c;
          return this.activate();
        }
      }
    }
    return undefined;
  }

  // ---- Draw ----

  draw(screen: Screen, y: number, time: number): void {
    this.y0 = y;
    // Riga di composizione (coda del testo, caret lampeggiante).
    const caret = Math.floor(time * 2) % 2 === 0 ? "_" : " ";
    screen.panel(4, y, VIEW_W - 8, 13);
    const composed = (this.text + caret).slice(-36);
    screen.text(composed || " ", 10, y + 4, this.text ? INK : GREY);

    // Riga tab.
    const tabsY = y + 16;
    const labels = this.tabs();
    let x = KX;
    for (let i = 0; i < labels.length; i += 1) {
      const label = labels[i];
      const w = label.length * 6 + 10;
      const tx = label === "INVIA" ? VIEW_W - w - 4 : x;
      const sel = this.area === "tabs" && this.tabIdx === i;
      if (sel) {
        screen.rect(tx - 2, tabsY - 2, w, 11, "#f4d34a");
      }
      const active =
        (label === "FRASI" && this.tab === "frasi") ||
        (label === "TASTIERA" && this.tab === "keys") ||
        (label === "EMOTE" && this.tab === "emote") ||
        (label === "TEL⌨" && this.tab === "tel");
      const color = sel ? INK : label === "INVIA" ? (this.text.trim() ? "#7ad858" : GREY) : active ? PAPER : GREY;
      screen.text(label, tx + 3, tabsY, color);
      if (active && !sel) {
        screen.rect(tx + 3, tabsY + 8, label.length * 6 - 1, 1, "#f4d34a");
      }
      if (label !== "INVIA") {
        x += w + 6;
      }
    }

    // Griglia della tab attiva.
    const gridY = y + 29;
    if (this.tab === "frasi") {
      for (let i = 0; i < PHRASES.length; i += 1) {
        const r = Math.floor(i / PHRASE_COLS);
        const c = i % PHRASE_COLS;
        const cx = KX + c * PHRASE_STEP;
        const cy = gridY + r * ROW_H;
        const sel = this.area === "grid" && this.row === r && this.col === c;
        if (sel) {
          screen.rect(cx - 2, cy - 2, PHRASE_STEP - 4, ROW_H, "#f4d34a");
        }
        screen.text(PHRASES[i], cx, cy, sel ? INK : PAPER);
      }
    } else if (this.tab === "keys") {
      for (let r = 0; r < KEY_ROWS.length; r += 1) {
        for (let c = 0; c < KEY_ROWS[r].length; c += 1) {
          const cx = KX + c * KEY_STEP;
          const cy = gridY + r * ROW_H;
          const sel = this.area === "grid" && this.row === r && this.col === c;
          if (sel) {
            screen.rect(cx - 2, cy - 1, 11, 10, "#f4d34a");
          }
          screen.text(KEY_ROWS[r][c] === " " ? "_" : KEY_ROWS[r][c], cx, cy, sel ? INK : PAPER);
        }
      }
    } else if (this.tab === "tel") {
      screen.text("TASTIERA DEL TELEFONO ATTIVA.", KX, gridY, PAPER);
      screen.text("Scrivi, poi tocca INVIA.", KX, gridY + ROW_H, GREY);
      screen.text("Sparita? Tocca qui.", KX, gridY + ROW_H * 2, GREY);
    } else {
      for (let i = 0; i < EMOTES.length; i += 1) {
        const r = Math.floor(i / EMOTE_COLS);
        const c = i % EMOTE_COLS;
        const cx = KX + c * EMOTE_STEP;
        const cy = gridY + r * ROW_H;
        const sel = this.area === "grid" && this.row === r && this.col === c;
        if (sel) {
          screen.rect(cx - 2, cy - 2, EMOTE_STEP - 4, ROW_H, "#f4d34a");
        }
        screen.text(`${EMOTES[i].ch}${EMOTES[i].label}`.slice(0, 6), cx, cy, sel ? INK : PAPER);
      }
    }
  }
}
