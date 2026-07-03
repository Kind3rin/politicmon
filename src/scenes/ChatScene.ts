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
    screen.text("CHAT DI ZONA", 8, 5, "#f4d34a");
    screen.textRight(mp.connected ? `ONLINE ${mp.onlineCount + 1}` : "OFFLINE", VIEW_W - 8, 5,
      mp.connected ? "#7ad858" : GREY);

    // Storico messaggi recenti (pannello compatto in alto).
    screen.panel(4, 13, VIEW_W - 8, 34);
    const lines = mp.chat.slice(-3);
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      const text = `${l.nick}: ${l.text}`.slice(0, 37);
      screen.text(text, 9, 18 + i * 9, INK);
    }
    if (lines.length === 0) {
      screen.text("NESSUN MESSAGGIO. ROMPI IL GHIACCIO!", 9, 18, GREY);
    }

    // Riga di composizione (una sola riga, caret lampeggiante). Pannello alto
    // 15px: la cornice 9-slice mangia ~4px per lato, il testo a y+6 resta dentro.
    const caret = Math.floor(this.time * 2) % 2 === 0 ? "_" : " ";
    screen.panel(4, 49, VIEW_W - 8, 15);
    const composed = (this.text + caret).slice(0, 37);
    screen.text(composed || " ", 10, 55, this.text ? INK : GREY);

    // Tastiera: 9 colonne a passo 24 partono da x=6 → l'ultima (idx 8) sta a
    // 6+8*24=198, i glifi restano dentro i 240px. Righe a passo 11 da y=68.
    const KX = 6;
    const ky = 68;
    for (let r = 0; r < KEY_ROWS.length; r += 1) {
      for (let c = 0; c < KEY_ROWS[r].length; c += 1) {
        const x = KX + c * 24;
        const y = ky + r * 11;
        const sel = this.section === "keys" && this.row === r && this.col === c;
        if (sel) {
          screen.rect(x - 2, y - 1, 11, 10, "#f4d34a");
        }
        screen.text(KEY_ROWS[r][c] === " " ? "_" : KEY_ROWS[r][c], x, y, sel ? INK : PAPER);
      }
    }

    // Emote rapide: 2 righe da EMOTE_COLS a passo 39 (6*39=234, dentro i 240).
    // Ogni cella ha larghezza fissa: nessuna sovrapposizione tra label vicine.
    const ey = ky + KEY_ROWS.length * 11 + 3;
    const ECW = 39;
    for (let i = 0; i < EMOTES.length; i += 1) {
      const x = KX + (i % EMOTE_COLS) * ECW;
      const y = ey + Math.floor(i / EMOTE_COLS) * 10;
      const label = `${EMOTES[i].ch}${EMOTES[i].label}`.slice(0, 6);
      const sel = this.section === "emote" && this.col === i;
      if (sel) {
        screen.rect(x - 2, y - 1, ECW - 3, 9, "#f4d34a");
      }
      screen.text(label, x, y, sel ? INK : PAPER);
    }

    // Tasto INVIA su riga propria (y=161), lontano dalla riga help (y=173):
    // niente più collisione con START.
    const sendY = ey + 2 * 10 + 3;
    const selSend = this.section === "send";
    if (selSend) {
      screen.rect(VIEW_W - 58, sendY - 1, 52, 9, "#f4d34a");
    }
    screen.text("▶ INVIA", VIEW_W - 54, sendY, selSend ? INK : "#7ad858");
    screen.text("A:SCEGLI  B:CANC.  START:ESCI", 6, VIEW_H - 8, GREY);
  }
}
