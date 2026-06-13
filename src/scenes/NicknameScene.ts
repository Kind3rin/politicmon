import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
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

export class NicknameScene implements Scene {
  private value: string;
  private row = 0;
  private col = 0;
  private time = 0;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private onDone: (nick: string) => void,
    private firstTime = false
  ) {
    this.value = loadNick();
  }

  private gridRows(): string[] {
    // Ultima "riga logica" sono i comandi speciali.
    return [...ROWS, SPECIAL.join("|")];
  }

  update(dt: number): void {
    this.time += dt;
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
