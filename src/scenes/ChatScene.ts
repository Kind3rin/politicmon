import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { mp } from "../net/mp";
import { GREY, INK, PAPER } from "../ui/widgets";

// Chat di zona + emote rapide. In alto lo storico dei messaggi della mappa, in
// basso una tastiera per comporre e una riga di emote satiriche da inviare al volo.
const KEY_ROWS = [
  "ABCDEFGHI",
  "JKLMNOPQR",
  "STUVWXYZ_",
  "0123456789",
  // Ultima riga riempita (prima erano solo 5 tasti → 2/3 di riga "morta" al touch).
  " ?!.,:-'"
];
// Emote: max 2 caratteri (mp.ts tronca a 2), solo glifi presenti nel font 5x7.
// Due righe da EMOTE_COLS nella UI.
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

type Section = "keys" | "emote" | "send";

export class ChatScene implements Scene {
  private text = "";
  private row = 0;
  private col = 0;
  private section: Section = "keys";
  private time = 0;

  constructor(private stack: SceneStack, private input: Input) {}

  update(dt: number): void {
    this.time += dt;
    if (this.input.wasPressed("b")) {
      if (this.text.length > 0) {
        this.text = this.text.slice(0, -1);
        audio.cancel();
      } else {
        audio.cancel();
        this.stack.pop();
      }
      return;
    }
    if (this.input.wasPressed("start")) {
      this.stack.pop();
      return;
    }
    this.navigate();
    if (this.input.wasPressed("a")) {
      this.activate();
    }
  }

  private navigate(): void {
    const up = this.input.wasPressed("up");
    const down = this.input.wasPressed("down");
    const left = this.input.wasPressed("left");
    const right = this.input.wasPressed("right");
    if (!up && !down && !left && !right) {
      return;
    }
    audio.cursor();
    if (this.section === "keys") {
      if (left) this.col -= 1;
      if (right) this.col += 1;
      if (up) this.row -= 1;
      if (down) this.row += 1;
      if (this.row < 0) {
        this.row = 0;
      }
      if (this.row >= KEY_ROWS.length) {
        // Sotto la tastiera: passa alla riga emote.
        this.section = "emote";
        this.row = KEY_ROWS.length - 1;
        this.col = 0;
        return;
      }
      const len = KEY_ROWS[this.row].length;
      this.col = (this.col + len) % len;
    } else if (this.section === "emote") {
      // Griglia 2 righe x EMOTE_COLS: su/giù cambiano riga, ai bordi si esce
      // verso tastiera (su) o INVIA (giù).
      if (up) {
        if (this.col >= EMOTE_COLS) {
          this.col -= EMOTE_COLS;
        } else {
          this.section = "keys";
          this.col = 0;
        }
        return;
      }
      if (down) {
        if (this.col + EMOTE_COLS < EMOTES.length) {
          this.col += EMOTE_COLS;
        } else {
          this.section = "send";
        }
        return;
      }
      if (right && this.col === EMOTES.length - 1) {
        this.section = "send";
        return;
      }
      if (left) this.col = Math.max(0, this.col - 1);
      if (right) this.col = Math.min(EMOTES.length - 1, this.col + 1);
    } else {
      // sezione "send"
      if (up) {
        this.section = "emote";
        this.col = 0;
      }
    }
  }

  private activate(): void {
    if (this.section === "keys") {
      const ch = KEY_ROWS[this.row][this.col];
      if (ch && this.text.length < MAX) {
        this.text += ch;
        audio.cursor();
      }
    } else if (this.section === "emote") {
      mp.sendEmote(EMOTES[this.col].ch);
      audio.confirm();
      this.stack.pop(); // emote = invio rapido, chiude la chat
    } else {
      this.sendText();
    }
  }

  private sendText(): void {
    const t = this.text.trim();
    if (t) {
      mp.sendChat(t);
      audio.confirm();
    }
    this.stack.pop();
  }

  draw(screen: Screen): void {
    screen.clear("#16203a");
    screen.text("CHAT DI ZONA", 8, 6, "#f4d34a");
    screen.textRight(mp.connected ? `ONLINE ${mp.onlineCount + 1}` : "OFFLINE", VIEW_W - 8, 6,
      mp.connected ? "#7ad858" : GREY);

    // Storico messaggi recenti.
    screen.panel(4, 16, VIEW_W - 8, 52);
    const lines = mp.chat.slice(-4);
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      const text = `${l.nick}: ${l.text}`.slice(0, 36);
      screen.text(text, 10, 24 + i * 10, INK);
    }
    if (lines.length === 0) {
      screen.text("Nessun messaggio. Rompi il ghiaccio!", 10, 24, GREY);
    }

    // Riga di composizione.
    const caret = Math.floor(this.time * 2) % 2 === 0 ? "_" : " ";
    screen.panel(4, 70, VIEW_W - 8, 16);
    screen.text((this.text + caret).slice(0, 36), 10, 76, INK);

    // Tastiera.
    const ky = 92;
    for (let r = 0; r < KEY_ROWS.length; r += 1) {
      for (let c = 0; c < KEY_ROWS[r].length; c += 1) {
        const x = 10 + c * 24;
        const y = ky + r * 11;
        const sel = this.section === "keys" && this.row === r && this.col === c;
        if (sel) {
          screen.rect(x - 3, y - 1, 13, 10, "#f4d34a");
        }
        screen.text(KEY_ROWS[r][c] === " " ? "_" : KEY_ROWS[r][c], x, y, sel ? INK : PAPER);
      }
    }

    // Emote rapide: griglia 2 righe x EMOTE_COLS.
    const ey = ky + KEY_ROWS.length * 11 + 2;
    for (let i = 0; i < EMOTES.length; i += 1) {
      const x = 10 + (i % EMOTE_COLS) * 38;
      const y = ey + Math.floor(i / EMOTE_COLS) * 10;
      const label = `${EMOTES[i].ch}${EMOTES[i].label}`.slice(0, 6);
      const sel = this.section === "emote" && this.col === i;
      if (sel) {
        screen.rect(x - 3, y - 1, label.length * 6 + 6, 9, "#f4d34a");
      }
      screen.text(label, x, y, sel ? INK : PAPER);
    }

    // Tasto invia.
    const selSend = this.section === "send";
    if (selSend) {
      screen.rect(VIEW_W - 64, VIEW_H - 12, 56, 11, "#f4d34a");
    }
    screen.text("► INVIA", VIEW_W - 60, VIEW_H - 11, selSend ? INK : "#7ad858");
    screen.text("A: scegli  B: cancella  START: esci", 8, VIEW_H - 11, GREY);
  }
}
