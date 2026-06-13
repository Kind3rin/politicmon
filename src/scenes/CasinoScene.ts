import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { addSondaggi, sondaggiColor } from "../game/governo";
import { saveGame, type GameState } from "../game/state";
import { Menu, MessageBox, GREY, INK, PAPER } from "../ui/widgets";

// CASINÒ DI PALAZZO — satira bonaria. Due attrazioni:
// - SLOT DEL CONSENSO: scommetti fondi, tre rulli di simboli politici.
// - BUNGA BUNGA CLUB: ingresso a pagamento, evento random che muove i SONDAGGI.

// Simboli dei rulli (glifi presenti nel bitmap font) + colore + nome satirico.
interface Reel {
  ch: string;
  color: string;
  name: string;
}
const REELS: Reel[] = [
  { ch: "V", color: "#e8c84a", name: "VOTO" },
  { ch: "S", color: "#7ad858", name: "SCRANNO" },
  { ch: "P", color: "#6aa8ff", name: "POLTRONA" },
  { ch: "M", color: "#d04848", name: "MAZZETTA" },
  { ch: "★", color: "#f4d34a", name: "STELLA" }
];

const BET = 100; // costo per giro di slot
const CLUB_FEE = 300; // ingresso al club

type Mode = "menu" | "slot" | "result";

export class CasinoScene implements Scene {
  private menu: Menu;
  private msg = new MessageBox();
  private mode: Mode = "menu";

  // Animazione rulli.
  private spinning = false;
  private spinT = 0;
  private reelIdx = [0, 0, 0];
  private locked = [false, false, false];
  private lastWin = 0;
  private time = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.menu = new Menu([
      { label: "SLOT DEL CONSENSO", rightLabel: `${BET}€` },
      { label: "BUNGA BUNGA CLUB", rightLabel: `${CLUB_FEE}€` },
      { label: "ESCI" }
    ]);
  }

  update(dt: number): void {
    this.time += dt;
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    if (this.mode === "slot") {
      this.updateSlot(dt);
      return;
    }
    // Menu principale.
    const action = this.menu.update(this.input);
    if (action === "cancel") {
      this.stack.pop();
      return;
    }
    if (action !== "select") {
      return;
    }
    if (this.menu.index === 0) {
      this.startSlot();
    } else if (this.menu.index === 1) {
      this.enterClub();
    } else {
      this.stack.pop();
    }
  }

  // ---- SLOT ----

  private startSlot(): void {
    if (this.state.money < BET) {
      audio.cancel();
      this.msg.show(["Fondi insufficienti.", "Nemmeno il casinò fa credito a un candidato al verde."]);
      return;
    }
    this.state.money -= BET;
    audio.confirm();
    this.mode = "slot";
    this.spinning = true;
    this.spinT = 0;
    this.locked = [false, false, false];
    this.lastWin = 0;
  }

  private updateSlot(dt: number): void {
    if (!this.spinning) {
      // Mostra esito, premi A/B per tornare.
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) {
        this.mode = "menu";
      }
      return;
    }
    this.spinT += dt;
    // I rulli si fermano a scaglioni (0.7s, 1.1s, 1.5s).
    const stops = [0.7, 1.1, 1.5];
    for (let i = 0; i < 3; i += 1) {
      if (!this.locked[i] && this.spinT >= stops[i]) {
        this.locked[i] = true;
        this.reelIdx[i] = Math.floor(Math.random() * REELS.length);
        audio.cursor();
      }
      if (!this.locked[i]) {
        // Scorrimento veloce mentre gira.
        this.reelIdx[i] = Math.floor(this.spinT * 24 + i) % REELS.length;
      }
    }
    if (this.locked.every(Boolean)) {
      this.spinning = false;
      this.resolveSlot();
    }
  }

  private resolveSlot(): void {
    const [a, b, c] = this.reelIdx;
    let win = 0;
    let text: string[];
    if (a === b && b === c) {
      // Tris: payout per simbolo.
      const mult = REELS[a].ch === "★" ? 30 : REELS[a].ch === "V" ? 12 : 8;
      win = BET * mult;
      this.state.flags["casino-jackpot"] = true; // sblocca la side quest
      text = [`TRIS DI ${REELS[a].name}!`, `Il banco capitola: vinci ${win}€!`];
      if (REELS[a].ch === "M") {
        // La mazzetta porta soldi ma fa scandalo: -3 sondaggi.
        addSondaggi(this.state, -3);
        text.push("...ma tre MAZZETTE fanno notizia: -3 sondaggi.");
      }
    } else if (a === b || b === c || a === c) {
      win = BET * 2;
      text = ["Doppia coppia di consensi!", `Recuperi ${win}€. Meglio di niente.`];
    } else {
      text = ["Niente da fare.", "I sondaggi del banco erano truccati. Come sempre."];
    }
    this.lastWin = win;
    if (win > 0) {
      this.state.money += win;
      audio.catchJingle();
    } else {
      audio.cancel();
    }
    saveGame(this.state);
    this.msg.show(text);
  }

  // ---- BUNGA BUNGA CLUB ----

  private enterClub(): void {
    if (this.state.money < CLUB_FEE) {
      audio.cancel();
      this.msg.show(["Ingresso negato.", "Il buttafuori conosce i tuoi conti meglio di te."]);
      return;
    }
    this.state.money -= CLUB_FEE;
    audio.confirm();
    // Evento satirico random: muove i SONDAGGI (parodia, niente esplicito).
    const events: Array<{ d: number; lines: string[] }> = [
      { d: 8, lines: ["Festa elegante, foto coi vip, karaoke di partito.", "I gossip ti dipingono come 'simpatico': +8 sondaggi!"] },
      { d: 5, lines: ["Barzellette, cori e una stretta di mano di troppo.", "Il pubblico si diverte: +5 sondaggi."] },
      { d: -6, lines: ["Un video imbarazzante finisce online entro l'alba.", "Lo scandalo monta: -6 sondaggi. Era prevedibile."] },
      { d: -3, lines: ["Conto salatissimo, polemiche sui rimborsi.", "I retroscenisti rosicchiano: -3 sondaggi."] },
      { d: 0, lines: ["Serata fiacca, nessuno ti riconosce.", "Zero gossip, zero sondaggi. Soldi buttati."] }
    ];
    const ev = events[Math.floor(Math.random() * events.length)];
    const now = addSondaggi(this.state, ev.d);
    saveGame(this.state);
    this.msg.show([...ev.lines, `SONDAGGI ora al ${now}%.`]);
  }

  // ---- Draw ----

  draw(screen: Screen): void {
    screen.clear("#241433");
    // Luci kitsch (lampeggio decorativo basato sul timer interno).
    for (let i = 0; i < 12; i += 1) {
      const on = (Math.floor(this.time * 5) + i) % 2 === 0;
      screen.rect(8 + i * 19, 4, 8, 3, on ? "#f4d34a" : "#7a4a2a");
    }
    screen.text("CASINÒ DI PALAZZO", 8, 12, "#f4d34a");
    screen.textRight(`${this.state.money}€`, VIEW_W - 8, 12, "#e8c84a");
    screen.text(`SOND ${this.state.sondaggi}%`, 8, 22, sondaggiColor(this.state.sondaggi));

    if (this.mode === "slot") {
      this.drawSlot(screen);
    } else {
      this.menu.draw(screen, 14, 40, VIEW_W - 28);
      screen.text("Gioca col consenso: il banco vince.", 14, VIEW_H - 30, GREY);
      screen.text("A: gioca  B: esci", 8, VIEW_H - 10, GREY);
    }
    this.msg.draw(screen);
  }

  private drawSlot(screen: Screen): void {
    // Tre rulli con il simbolo corrente, grande e colorato.
    const y = 50;
    screen.panel(40, y, VIEW_W - 80, 56);
    for (let i = 0; i < 3; i += 1) {
      const rx = 56 + i * 50;
      screen.frame(rx - 4, y + 12, 34, 32, INK);
      screen.rect(rx - 3, y + 13, 32, 30, "#10141f");
      const reel = REELS[this.reelIdx[i]];
      screen.text(reel.ch, rx + 5, y + 20, reel.color, 2);
      if (this.locked[i] && !this.spinning) {
        screen.text(reel.name.slice(0, 5), rx - 3, y + 46, GREY);
      }
    }
    if (!this.spinning) {
      screen.text(
        this.lastWin > 0 ? `VINCI ${this.lastWin}€!` : "Ritenta...",
        14, VIEW_H - 24, this.lastWin > 0 ? "#7ad858" : GREY
      );
      screen.text("A/B: continua", 8, VIEW_H - 10, GREY);
    } else {
      screen.text("Girano i rulli del consenso...", 14, VIEW_H - 24, PAPER);
    }
  }
}
