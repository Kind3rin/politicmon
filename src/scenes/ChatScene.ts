import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { mp } from "../net/mp";
import { Composer } from "../ui/composer";
import { GREY, INK } from "../ui/widgets";

// Chat di zona. In alto lo storico dei messaggi della mappa, sotto il Composer
// condiviso (FRASI rapide di default, TASTIERA per il testo libero, EMOTE).
// Inviare NON chiude la scena: si resta in chat a leggere le risposte
// (prima frasi/emote chiudevano subito — pessimo per conversare). Si esce con
// START, o con B a testo vuoto.
export class ChatScene implements Scene {
  private composer = new Composer(true);
  private time = 0;
  private toast = "";
  private toastT = 0;

  constructor(private stack: SceneStack, private input: Input) {}

  update(dt: number): void {
    this.time += dt;
    if (this.toastT > 0) {
      this.toastT = Math.max(0, this.toastT - dt);
    }
    if (this.input.wasPressed("start")) {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (this.input.wasPressed("b")) {
      if (!this.composer.backspace()) {
        audio.cancel();
        this.stack.pop();
      }
      return;
    }
    const ev = this.composer.update(this.input);
    if (!ev) {
      return;
    }
    if (ev.kind === "emote") {
      mp.sendEmote(ev.emote);
      // L'emote appare come fumetto in mappa, non in chat: feedback locale.
      this.toast = "EMOTE INVIATA!";
      this.toastT = 1.5;
    } else {
      // Frase rapida o testo composto: sendChat fa già l'eco locale in mp.chat.
      mp.sendChat(ev.text);
    }
  }

  draw(screen: Screen): void {
    screen.clear("#16203a");
    screen.text("CHAT DI ZONA", 8, 5, "#f4d34a");
    if (this.toastT > 0) {
      screen.text(this.toast, 90, 5, "#7ad858");
    } else {
      screen.textRight(mp.connected ? `ONLINE ${mp.onlineCount + 1}` : "OFFLINE", VIEW_W - 8, 5,
        mp.connected ? "#7ad858" : GREY);
    }

    // Storico messaggi recenti (6 righe).
    screen.panel(4, 13, VIEW_W - 8, 50);
    const lines = mp.chat.slice(-6);
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      // Nick risolto al disegno (non congelato): una riga arrivata prima del
      // profilo del peer non resta "???". Troncato a 8 char per lasciare spazio
      // al testo del messaggio nei 37 char che stanno nel pannello.
      const rawNick = mp.chatNick(l);
      const nick = rawNick.length > 8 ? rawNick.slice(0, 8) : rawNick;
      const text = `${nick}: ${l.text}`.slice(0, 37);
      screen.text(text, 9, 18 + i * 8, INK);
    }
    if (lines.length === 0) {
      screen.text("NESSUN MESSAGGIO. ROMPI IL GHIACCIO!", 9, 18, GREY);
    }

    this.composer.draw(screen, 66, this.time);
    screen.text("A:SCEGLI  B:CANC.  START:ESCI", 6, VIEW_H - 8, GREY);
  }
}
