import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import {
  closeNativeKeyboard, nativeKeyboardAvailable,
  openNativeKeyboard, refocusNativeKeyboard, setNativeKeyboardValue
} from "../engine/nativeInput";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { loadNick, NICK_MAX, sanitizeNick, saveNick } from "../net/profile";
import { GREY, INK, PAPER } from "../ui/widgets";

// Tastiera a schermo per scegliere il nickname online (funziona anche su mobile,
// dove non c'è una tastiera fisica). Griglia di caratteri + CANC/FINE.
const ROWS = [
  "ABCDEFG",
  "HIJKLMN",
  "OPQRSTU",
  "VWXYZ_ ",
  "0123456",
  "789"
];
const SPECIAL = ["CANC", "FINE"];

// Pulsante FINE della modalità tastiera nativa (coord condivise update/draw).
const NATIVE_FINE = { x: (VIEW_W - 84) / 2, y: 92, w: 84, h: 18 };

export class NicknameScene implements Scene {
  private value: string;
  private row = 0;
  private col = 0;
  private time = 0;

  // Su touch usiamo la tastiera NATIVA del telefono (scrivere col d-pad è
  // lentissimo); la griglia a schermo resta il fallback desktop.
  private native = nativeKeyboardAvailable();

  constructor(
    private stack: SceneStack,
    private input: Input,
    private onDone: (nick: string) => void,
    private firstTime = false
  ) {
    this.value = loadNick();
  }

  onEnter(): void {
    if (!this.native) {
      return;
    }
    // Apre la tastiera di sistema. È dentro il gesto che ha aperto la scena
    // (tap/tasto), quindi iOS la mostra.
    this.native = openNativeKeyboard({
      initial: this.value,
      maxLength: NICK_MAX,
      sanitize: sanitizeNick,
      autocapitalize: "characters",
      onInput: (v) => {
        this.value = v;
      },
      onSubmit: () => this.commit()
    });
  }

  onExit(): void {
    closeNativeKeyboard();
  }

  private gridRows(): string[] {
    // Ultima "riga logica" sono i comandi speciali.
    return [...ROWS, SPECIAL.join("|")];
  }

  update(dt: number): void {
    this.time += dt;

    // Modalità tastiera nativa: la griglia non serve. A/START conferma, B esce,
    // il testo arriva via onInput. Un tap sullo schermo riapre la tastiera se
    // il sistema l'aveva chiusa (senza chiudere la scena).
    if (this.native) {
      if (this.input.wasPressed("a") || this.input.wasPressed("start")) {
        this.commit();
        return;
      }
      if (this.input.wasPressed("b")) {
        this.commit(); // niente "annulla" distruttivo: conferma il nome corrente
        return;
      }
      // Tap sul grande pulsante FINE (stesse coord della draw) = conferma.
      if (this.input.tapInRect(NATIVE_FINE.x, NATIVE_FINE.y, NATIVE_FINE.w, NATIVE_FINE.h)) {
        this.commit();
        return;
      }
      // Tap altrove sul canvas: il sistema aveva tolto il focus all'input
      // (tastiera chiusa) — lo ripristiniamo per riaprirla.
      if (this.input.tapInRect(0, 0, VIEW_W, VIEW_H)) {
        refocusNativeKeyboard();
      }
      return;
    }

    const rows = this.gridRows();
    if (this.input.wasPressed("up")) {
      this.row = (this.row + rows.length - 1) % rows.length;
      this.clampCol(rows);
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.row = (this.row + 1) % rows.length;
      this.clampCol(rows);
      audio.cursor();
    }
    if (this.input.wasPressed("left")) {
      const len = this.rowLen(rows);
      this.col = (this.col + len - 1) % len;
      audio.cursor();
    }
    if (this.input.wasPressed("right")) {
      const len = this.rowLen(rows);
      this.col = (this.col + 1) % len;
      audio.cursor();
    }
    if (this.input.wasPressed("b")) {
      this.backspace();
      return;
    }
    if (this.input.wasPressed("a")) {
      this.choose(rows);
    }
  }

  private rowLen(rows: string[]): number {
    return this.row === rows.length - 1 ? SPECIAL.length : ROWS[this.row].length;
  }

  private clampCol(rows: string[]): void {
    this.col = Math.min(this.col, this.rowLen(rows) - 1);
  }

  private backspace(): void {
    if (this.value.length > 0) {
      this.value = this.value.slice(0, -1);
      // Tieni allineato l'input nativo (se aperto), così la tastiera non
      // "reintroduce" il carattere cancellato.
      setNativeKeyboardValue(this.value);
      audio.cancel();
    }
  }

  private commit(): void {
    const saved = saveNick(this.value);
    this.value = saved;
    audio.confirm();
    this.stack.pop();
    this.onDone(saved);
  }

  private choose(rows: string[]): void {
    if (this.row === rows.length - 1) {
      // Riga comandi.
      if (SPECIAL[this.col] === "CANC") {
        this.backspace();
      } else {
        this.commit();
      }
      return;
    }
    const ch = ROWS[this.row][this.col];
    if (ch && this.value.length < NICK_MAX) {
      const next = sanitizeNick(this.value + ch);
      if (next.length > this.value.length) {
        this.value = next;
        audio.cursor();
      }
    } else {
      audio.cancel();
    }
  }

  draw(screen: Screen): void {
    screen.clear("#1c2740");
    screen.text(this.firstTime ? "SCEGLI IL TUO NOME ONLINE" : "CAMBIA NOME ONLINE", 8, 8, "#f4d34a");

    // Riquadro del nome in costruzione, con cursore lampeggiante.
    screen.panel(8, 20, VIEW_W - 16, 22);
    const caret = Math.floor(this.time * 2) % 2 === 0 ? "_" : " ";
    screen.text((this.value || "") + caret, 16, 28, INK);
    screen.text(`${this.value.length}/${NICK_MAX}`, VIEW_W - 46, 30, GREY);

    // Modalità tastiera nativa: niente griglia, solo istruzioni + un grande
    // pulsante FINE toccabile (il resto lo fa la tastiera di sistema).
    if (this.native) {
      screen.text("USA LA TASTIERA DEL TELEFONO.", 16, 54, PAPER);
      screen.text("Non appare? Tocca lo schermo.", 16, 66, GREY);
      const { x, y, w, h } = NATIVE_FINE;
      screen.rect(x, y, w, h, "#f4d34a");
      screen.text("FINE", x + w / 2 - 12, y + 6, INK);
      screen.text("A/INVIO: conferma", 8, VIEW_H - 10, GREY);
      return;
    }

    // Griglia caratteri.
    const rows = this.gridRows();
    const startY = 50;
    for (let r = 0; r < ROWS.length; r += 1) {
      const chars = ROWS[r];
      for (let c = 0; c < chars.length; c += 1) {
        const x = 18 + c * 30;
        const y = startY + r * 16;
        const sel = this.row === r && this.col === c;
        if (sel) {
          screen.rect(x - 4, y - 2, 16, 13, "#f4d34a");
        }
        screen.text(chars[c] === " " ? "[_]"[0] : chars[c], x, y, sel ? INK : PAPER);
      }
    }
    // Riga comandi CANC / FINE.
    const cy = startY + ROWS.length * 16 + 2;
    for (let c = 0; c < SPECIAL.length; c += 1) {
      const x = 18 + c * 90;
      const sel = this.row === rows.length - 1 && this.col === c;
      if (sel) {
        screen.rect(x - 4, cy - 2, SPECIAL[c].length * 6 + 8, 13, "#f4d34a");
      }
      screen.text(SPECIAL[c], x, cy, sel ? INK : PAPER);
    }

    screen.text("A: scegli  B: cancella", 8, VIEW_H - 10, GREY);
  }
}
