import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { mp } from "../net/mp";
import { TALK_INVITE_TIMEOUT, type DuelMsg } from "../net/duelproto";
import { loadNick } from "../net/profile";
import { drawNetworkBackdrop } from "../ui/socialArt";
import { Composer } from "../ui/composer";
import { drawScreenHeader, wrapText, INK, PAPER, MessageBox } from "../ui/widgets";

// DIALOGO 1:1 con un giocatore remoto: entrambi restano fermi (la scena copre
// il mondo, quindi niente movimento né sendMove) finché uno dei due non chiude.
// Il protocollo viaggia sul canale duello (talk-* in duelproto.ts) per non
// toccare mp.ts; duelBusy=true auto-declina inviti duello/scambio in arrivo.
// Chi invita (host) attende talk-accept; chi accetta (guest) parte già attivo.

export interface TalkOptions {
  peerId: string;
  peerNick: string;
  talkId: string;
  role: "host" | "guest";
}

interface TalkLine {
  me: boolean;
  text: string;
}

export class TalkScene implements Scene {
  private composer = new Composer(false);
  private msg = new MessageBox();
  private lines: TalkLine[] = [];
  private waiting: boolean;
  private waitT = TALK_INVITE_TIMEOUT;
  private closing = false;
  private time = 0;
  private history = false;
  private historyPage = 0;

  private prevOnDuel: typeof mp.onDuel = null;
  private prevOnPeerGone: typeof mp.onPeerGone = null;

  constructor(private stack: SceneStack, private input: Input, private opts: TalkOptions) {
    this.waiting = opts.role === "host";
  }

  onEnter(): void {
    mp.duelBusy = true; // inviti duello/scambio in arrivo -> auto-decline
    this.prevOnDuel = mp.onDuel;
    this.prevOnPeerGone = mp.onPeerGone;
    mp.onDuel = (msg, peerId) => this.onTalkMsg(msg, peerId);
    mp.onPeerGone = (peerId) => {
      if (peerId === this.opts.peerId) {
        this.end("SI È SCOLLEGATO. FINE DEL CONFRONTO.");
      }
    };
    if (this.opts.role === "host") {
      mp.sendDuel({ v: 1, duelId: this.opts.talkId, type: "talk-invite", nick: loadNick() || "ANONIMO" }, this.opts.peerId);
    } else {
      mp.sendDuel({ v: 1, duelId: this.opts.talkId, type: "talk-accept" }, this.opts.peerId);
    }
  }

  onExit(): void {
    mp.duelBusy = false;
    mp.onDuel = this.prevOnDuel;
    mp.onPeerGone = this.prevOnPeerGone;
    this.composer.dispose(); // chiude la tastiera di sistema se aperta
  }

  private onTalkMsg(msg: DuelMsg, peerId: string): void {
    // Un ALTRO invito a parlare mentre siamo già in dialogo: occupato.
    if (msg.type === "talk-invite" && !(peerId === this.opts.peerId && msg.duelId === this.opts.talkId)) {
      mp.sendDuel({ v: 1, duelId: msg.duelId, type: "talk-decline", reason: "OCCUPATO" }, peerId);
      return;
    }
    if (peerId !== this.opts.peerId || msg.duelId !== this.opts.talkId) {
      return; // messaggi duello estranei: non nostri, li ignoriamo
    }
    switch (msg.type) {
      case "talk-accept":
        this.waiting = false;
        audio.confirm();
        return;
      case "talk-decline":
        this.end(msg.reason === "OCCUPATO"
          ? `${this.opts.peerNick} È OCCUPATO IN UN ALTRO DIBATTITO.`
          : `${this.opts.peerNick} HA RIFIUTATO IL CONFRONTO.`);
        return;
      case "talk-line": {
        // Testo dal filo MAI fidato: coerce a stringa e tronca.
        const text = String(msg.text ?? "").slice(0, 80);
        if (text) {
          this.waiting = false; // una riga vale come accettazione implicita
          this.lines.push({ me: false, text });
          this.trimLines();
          audio.cursor();
        }
        return;
      }
      case "talk-end":
        this.end(`${this.opts.peerNick} HA CHIUSO LA CONVERSAZIONE.`);
        return;
      default:
        return;
    }
  }

  // Chiusura dal lato remoto (decline/end/disconnessione): notifica e pop.
  private end(text: string): void {
    if (this.closing) {
      return;
    }
    this.closing = true;
    audio.cancel();
    this.msg.show([text], () => this.stack.pop());
  }

  // Uscita locale: avvisa il peer e chiudi subito.
  private leave(): void {
    if (this.closing) {
      return;
    }
    this.closing = true;
    mp.sendDuel({ v: 1, duelId: this.opts.talkId, type: "talk-end" }, this.opts.peerId);
    audio.cancel();
    this.stack.pop();
  }

  private trimLines(): void {
    if (this.lines.length > 40) {
      this.lines.splice(0, this.lines.length - 40);
    }
  }

  update(dt: number): void {
    this.time += dt;
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    if (this.closing) {
      return;
    }
    if (this.waiting) {
      this.waitT -= dt;
      if (this.waitT <= 0) {
        this.end(`${this.opts.peerNick} NON RISPONDE. SARÀ IN CONFERENZA STAMPA.`);
        return;
      }
      // In attesa si può solo annullare.
      if (this.input.wasPressed("b") || this.input.wasPressed("start")) {
        this.leave();
      }
      return;
    }
    if (this.history) {
      if (this.input.wasPressed("start")) { this.leave(); return; }
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) { this.history = false; return; }
      const pages = Math.max(1, Math.ceil(this.historyLines().length / 12));
      if (this.input.wasPressed("left") || this.input.wasPressed("up")) this.historyPage = Math.max(0, this.historyPage - 1);
      if (this.input.wasPressed("right") || this.input.wasPressed("down")) this.historyPage = Math.min(pages - 1, this.historyPage + 1);
      return;
    }
    if (this.input.wasPressed("start")) {
      this.history = true;
      this.historyPage = Math.max(0, Math.ceil(this.historyLines().length / 12) - 1);
      return;
    }
    if (this.input.wasPressed("b")) {
      if (!this.composer.backspace()) {
        this.leave();
      }
      return;
    }
    const ev = this.composer.update(this.input);
    if (ev && (ev.kind === "phrase" || ev.kind === "text")) {
      mp.sendDuel({ v: 1, duelId: this.opts.talkId, type: "talk-line", text: ev.text }, this.opts.peerId);
      this.lines.push({ me: true, text: ev.text });
      this.trimLines();
    }
  }

  private historyLines(): {text: string; me: boolean}[] {
    return this.lines.flatMap(line => wrapText(`${line.me ? "TU" : this.opts.peerNick}: ${line.text}`, 36).map(text => ({text, me: line.me})));
  }

  draw(screen: Screen): void {
    drawNetworkBackdrop(screen);
    drawScreenHeader(screen, this.history ? "STORICO DEL CONFRONTO" : "CONFRONTO", this.opts.peerNick);
    const lines = this.historyLines();
    if (this.history) {
      const pages = Math.max(1, Math.ceil(lines.length / 12));
      this.historyPage = Math.min(this.historyPage, pages - 1);
      screen.panel(4, 22, VIEW_W - 8, 129, "card");
      const page = lines.slice(this.historyPage * 12, (this.historyPage + 1) * 12);
      page.forEach((line,i) => screen.text(line.text, 10, 31 + i * 9, line.me ? "#2a5a8a" : INK));
      if (!page.length) screen.text("IL VERBALE ASPETTA LA PRIMA FRASE.", 10, 31, "#526279");
      screen.textRight(`${this.historyPage + 1}/${pages}`, VIEW_W - 8, 156, PAPER);
      screen.text("FRECCE: PAGINA  A/B: SCRIVI", 6, 156, PAPER);
      screen.text("START: CHIUDI IL CONFRONTO", 6, 171, "#a9b9ca");
    } else {
      screen.panel(4, 19, VIEW_W - 8, 46, "card");
      if (this.waiting) {
        screen.textFit(`IN ATTESA DI ${this.opts.peerNick}`, 10, 28, 216, INK);
        screen.text(`${Math.max(0,Math.ceil(this.waitT))} SECONDI`, 10, 43, "#526279");
      } else {
        lines.slice(-4).forEach((line,i) => screen.text(line.text, 10, 27 + i * 8, line.me ? "#2a5a8a" : INK));
        if (!lines.length) screen.text("LA RIUNIONE HA FINALMENTE UN TU.", 10, 27, "#526279");
        screen.rect(4, 69, VIEW_W - 8, 86, "#17243d");
        this.composer.draw(screen, 69, this.time);
      }
      screen.text(this.waiting ? "B/START: ANNULLA" : "A: SCEGLI  B: CANC./ESCI", 6, VIEW_H - 17, "#a9b9ca");
      if (!this.waiting) screen.text("START: STORICO COMPLETO", 6, VIEW_H - 8, "#a9b9ca");
    }
    this.msg.draw(screen);
  }
}
