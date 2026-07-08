import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { mp } from "../net/mp";
import { TALK_INVITE_TIMEOUT, type DuelMsg } from "../net/duelproto";
import { loadNick } from "../net/profile";
import { Composer } from "../ui/composer";
import { GREY, INK, MessageBox } from "../ui/widgets";

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
    if (this.input.wasPressed("start")) {
      this.leave();
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

  draw(screen: Screen): void {
    screen.clear("#1a2a1e");
    const nick = this.opts.peerNick.slice(0, 12);
    screen.text(`DIALOGO: ${nick}`, 8, 5, "#f4d34a");

    // Storico del dialogo (6 righe, TU: / NICK:).
    screen.panel(4, 13, VIEW_W - 8, 50);
    if (this.waiting) {
      const blink = Math.floor(this.time * 2) % 2 === 0;
      screen.text(`IN ATTESA DI ${nick}...`, 9, 18, blink ? INK : GREY);
      screen.text(`(${Math.ceil(this.waitT)}s)`, 9, 28, GREY);
    } else {
      const recent = this.lines.slice(-6);
      for (let i = 0; i < recent.length; i += 1) {
        const l = recent[i];
        const who = l.me ? "TU" : nick.slice(0, 8);
        screen.text(`${who}: ${l.text}`.slice(0, 37), 9, 18 + i * 8, l.me ? "#2a5a8a" : INK);
      }
      if (recent.length === 0) {
        screen.text("SIETE FACCIA A FACCIA. PARLA!", 9, 18, GREY);
      }
    }

    if (!this.waiting) {
      this.composer.draw(screen, 66, this.time);
    }
    screen.text(this.waiting ? "B:ANNULLA" : "A:SCEGLI  B:CANC.  START:CHIUDI", 6, VIEW_H - 8, GREY);
    this.msg.draw(screen);
  }
}
