import { ITEMS } from "../data/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { sceneImage } from "../engine/assets";
import { addSondaggi, sondaggiColor } from "../game/governo";
import { bumpDailyQuest } from "../game/dailyquests";
import { saveGame, type GameState } from "../game/state";
import { Menu, MessageBox, GREY, INK, PAPER } from "../ui/widgets";

// CASINÒ DI PALAZZO — satira bonaria. Ora con FICHE (valuta separata, come i
// gettoni Pokémon) per proteggere il budget della campagna, premi esclusivi
// comprabili solo qui, e statistiche di sessione.
//
//  - CAMBIO FICHE: converti € in FICHE (e viceversa) — il banco trattiene una
//    piccola percentuale, così non è arbitraggio infinito.
//  - SLOT DEL CONSENSO: scommetti FICHE, tre rulli di simboli politici.
//  - BUNGA BUNGA CLUB: ingresso in FICHE, evento random € + SONDAGGI.
//  - PREMI DI PALAZZO: spendi le FICHE vinte per oggetti rari (direttive, TESSERA).

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

const BET = 5; // costo per giro di slot, in FICHE
const CLUB_FEE = 15; // ingresso al club, in FICHE
const CHANGE_STEP = 100; // € convertiti per click
const CHIPS_PER_STEP = 90; // FICHE ottenute per CHANGE_STEP € (10% di commissione)

// Premi acquistabili SOLO col casinò: oggetti rari a prezzo in FICHE.
interface Prize {
  itemId: string;
  chips: number;
}
const PRIZES: Prize[] = [
  { itemId: "schedona", chips: 20 },
  { itemId: "maalox", chips: 25 },
  { itemId: "dirGreen", chips: 120 },
  { itemId: "dirSciopero", chips: 150 },
  { itemId: "dirBunga", chips: 280 },
  { itemId: "tessera", chips: 400 }
];

type Mode = "menu" | "slot" | "change" | "prizes";

export class CasinoScene implements Scene {
  private menu: Menu;
  private changeMenu: Menu;
  private prizeMenu: Menu;
  private msg = new MessageBox();
  private mode: Mode = "menu";

  // Animazione rulli.
  private spinning = false;
  private spinT = 0;
  private reelIdx = [0, 0, 0];
  private locked = [false, false, false];
  private lastWin = 0;
  private time = 0;
  private winFlash = 0;

  // Statistiche di sessione (non salvate: valgono per la visita corrente).
  private sessionStart: number;
  private spins = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.sessionStart = state.chips;
    this.menu = new Menu([
      { label: "SLOT DEL CONSENSO", rightLabel: `${BET} FICHE` },
      { label: "BUNGA BUNGA CLUB", rightLabel: `${CLUB_FEE} FICHE` },
      { label: "CAMBIO FICHE" },
      { label: "PREMI DI PALAZZO" },
      { label: "ESCI" }
    ]);
    this.changeMenu = new Menu([
      { label: `COMPRA ${CHIPS_PER_STEP} FICHE`, rightLabel: `${CHANGE_STEP}€` },
      { label: `VENDI ${CHIPS_PER_STEP} FICHE`, rightLabel: `${CHANGE_STEP - 20}€` },
      { label: "INDIETRO" }
    ]);
    this.prizeMenu = this.buildPrizeMenu();
  }

  private buildPrizeMenu(): Menu {
    const items = PRIZES.map((p) => ({
      label: ITEMS[p.itemId]?.name ?? p.itemId,
      rightLabel: `${p.chips}F`
    }));
    items.push({ label: "INDIETRO", rightLabel: "" });
    return new Menu(items);
  }

  update(dt: number): void {
    this.time += dt;
    this.winFlash = Math.max(0, this.winFlash - dt);
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    if (this.mode === "slot") {
      this.updateSlot(dt);
      return;
    }
    if (this.mode === "change") {
      this.updateChange();
      return;
    }
    if (this.mode === "prizes") {
      this.updatePrizes();
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
    switch (this.menu.index) {
      case 0:
        this.startSlot();
        break;
      case 1:
        this.enterClub();
        break;
      case 2:
        this.changeMenu.index = 0;
        this.mode = "change";
        break;
      case 3:
        this.prizeMenu.index = 0;
        this.mode = "prizes";
        break;
      default:
        this.stack.pop();
    }
  }

  // ---- CAMBIO FICHE ----

  private updateChange(): void {
    const action = this.changeMenu.update(this.input);
    if (action === "cancel" || (action === "select" && this.changeMenu.index === 2)) {
      this.mode = "menu";
      return;
    }
    if (action !== "select") {
      return;
    }
    if (this.changeMenu.index === 0) {
      // Compra fiche con €.
      if (this.state.money < CHANGE_STEP) {
        audio.cancel();
        this.msg.show(["Fondi insufficienti.", `Servono ${CHANGE_STEP}€ per ${CHIPS_PER_STEP} FICHE.`]);
        return;
      }
      this.state.money -= CHANGE_STEP;
      this.state.chips += CHIPS_PER_STEP;
      audio.confirm();
      saveGame(this.state);
    } else {
      // Rivendi fiche (a un cambio peggiore: la casa trattiene).
      if (this.state.chips < CHIPS_PER_STEP) {
        audio.cancel();
        this.msg.show(["Non hai abbastanza FICHE da cambiare."]);
        return;
      }
      this.state.chips -= CHIPS_PER_STEP;
      this.state.money += CHANGE_STEP - 20;
      audio.confirm();
      saveGame(this.state);
    }
  }

  // ---- PREMI ----

  private updatePrizes(): void {
    const action = this.prizeMenu.update(this.input);
    if (action === "cancel" || (action === "select" && this.prizeMenu.index === PRIZES.length)) {
      this.mode = "menu";
      return;
    }
    if (action !== "select") {
      return;
    }
    const prize = PRIZES[this.prizeMenu.index];
    if (!prize) {
      return;
    }
    if (this.state.chips < prize.chips) {
      audio.cancel();
      this.msg.show(["FICHE insufficienti.", "Gioca ancora un po', aspirante statista."]);
      return;
    }
    this.state.chips -= prize.chips;
    this.state.bag[prize.itemId] = (this.state.bag[prize.itemId] ?? 0) + 1;
    audio.catchJingle();
    this.winFlash = 0.5;
    saveGame(this.state);
    this.msg.show([`Riscatti: ${ITEMS[prize.itemId]?.name ?? prize.itemId}!`, "È nella tua BORSA."]);
  }

  // ---- SLOT ----

  private startSlot(): void {
    if (this.state.chips < BET) {
      audio.cancel();
      this.msg.show([
        "FICHE insufficienti.",
        "Passa al CAMBIO FICHE: il consenso si compra, ma le FICHE pure."
      ]);
      return;
    }
    this.state.chips -= BET;
    this.spins += 1;
    audio.confirm();
    this.mode = "slot";
    this.spinning = true;
    this.spinT = 0;
    this.locked = [false, false, false];
    this.lastWin = 0;
  }

  private updateSlot(dt: number): void {
    if (!this.spinning) {
      if (this.input.wasPressed("a")) {
        // Rigioca subito se hai ancora FICHE, altrimenti torna al menu.
        if (this.state.chips >= BET) {
          this.startSlot();
        } else {
          this.mode = "menu";
        }
        return;
      }
      if (this.input.wasPressed("b")) {
        this.mode = "menu";
      }
      return;
    }
    this.spinT += dt;
    const stops = [0.7, 1.1, 1.5];
    for (let i = 0; i < 3; i += 1) {
      if (!this.locked[i] && this.spinT >= stops[i]) {
        this.locked[i] = true;
        this.reelIdx[i] = Math.floor(Math.random() * REELS.length);
        audio.cursor();
      }
      if (!this.locked[i]) {
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
    let win = 0; // in FICHE
    let text: string[];
    if (a === b && b === c) {
      const mult = REELS[a].ch === "★" ? 30 : REELS[a].ch === "V" ? 10 : 8;
      win = BET * mult;
      this.state.flags["casino-jackpot"] = true; // sblocca la side quest
      text = [`TRIS DI ${REELS[a].name}!`, `Il banco capitola: ${win} FICHE!`];
      if (REELS[a].ch === "M") {
        addSondaggi(this.state, -3);
        text.push("...ma tre MAZZETTE fanno notizia: -3 sondaggi.");
      }
    } else if (a === b || b === c || a === c) {
      // La coppia RESTITUISCE la posta (1x), non la raddoppia: col 2x la slot
      // aveva EV ~1.4 (stampa-soldi). Ora EV ~0.99, il banco vince di un soffio.
      win = BET;
      text = ["Doppia coppia di consensi!", `Recuperi la posta: ${win} FICHE.`];
    } else {
      text = ["Niente da fare.", "I sondaggi del banco erano truccati. Come sempre."];
    }
    this.lastWin = win;
    if (win > 0) {
      this.state.chips += win;
      this.winFlash = 0.6;
      bumpDailyQuest(this.state, "slot1"); // missione "VINCI ALLE SLOT"
      audio.catchJingle();
    } else {
      audio.cancel();
    }
    saveGame(this.state);
    this.msg.show(text);
  }

  // ---- BUNGA BUNGA CLUB ----

  private enterClub(): void {
    if (this.state.chips < CLUB_FEE) {
      audio.cancel();
      this.msg.show(["Ingresso negato.", "Il buttafuori vuole FICHE, non promesse."]);
      return;
    }
    this.state.chips -= CLUB_FEE;
    audio.confirm();
    // Evento satirico random: ora muove SIA € SIA sondaggi (profilo di rischio
    // diverso dalle slot). Niente esplicito, satira bonaria.
    const events: Array<{ d: number; money: number; lines: string[] }> = [
      { d: 8, money: 600, lines: ["Festa elegante, foto coi vip, sponsor entusiasti.", "Simpatia alle stelle: +8 sondaggi e +600€ di donazioni!"] },
      { d: 5, money: 200, lines: ["Barzellette, cori e qualche stretta di mano.", "Il pubblico si diverte: +5 sondaggi, +200€."] },
      { d: -6, money: -200, lines: ["Un video imbarazzante finisce online entro l'alba.", "Scandalo e cause: -6 sondaggi e -200€ di avvocati."] },
      { d: -3, money: 0, lines: ["Conto salatissimo, polemiche sui rimborsi.", "I retroscenisti rosicchiano: -3 sondaggi."] },
      { d: 0, money: 0, lines: ["Serata fiacca, nessuno ti riconosce.", "Zero gossip. FICHE buttate."] },
      { d: 6, money: 0, lines: ["Un imitatore ti scambia per il vero leader.", "Foto coi fan dell'imitatore: +6 sondaggi, gratis."] },
      { d: -4, money: 150, lines: ["Tavolo coi soliti palazzinari: brindisi e strette di mano.", "+150€ di 'donazioni', ma qualcuno fotografa: -4 sondaggi."] },
      { d: 2, money: -100, lines: ["Karaoke istituzionale: canti l'inno fuori tempo.", "Simpatico ma stonato: +2 sondaggi, -100€ di sala."] },
      { d: -2, money: 0, lines: ["Discorso troppo lungo: metà sala si addormenta.", "Il video del russare gira: -2 sondaggi."] }
    ];
    const ev = events[Math.floor(Math.random() * events.length)];
    const now = addSondaggi(this.state, ev.d);
    this.state.money = Math.max(0, this.state.money + ev.money);
    if (ev.money > 0 || ev.d > 0) {
      audio.catchJingle();
      this.winFlash = 0.5;
    }
    saveGame(this.state);
    const cassa = ev.money !== 0 ? `Cassa: ${ev.money > 0 ? "+" : ""}${ev.money}€. ` : "";
    this.msg.show([...ev.lines, `${cassa}SONDAGGI ora al ${now}%.`]);
  }

  // ---- Draw ----

  draw(screen: Screen): void {
    screen.clear("#241433");
    // Luci kitsch.
    for (let i = 0; i < 12; i += 1) {
      const on = (Math.floor(this.time * 5) + i) % 2 === 0;
      screen.rect(8 + i * 19, 4, 8, 3, on ? "#f4d34a" : "#7a4a2a");
    }
    screen.text("CASINÒ DI PALAZZO", 8, 12, "#f4d34a");
    // HUD: FICHE (in evidenza) + € + sondaggi.
    screen.textRight(`${this.state.chips} FICHE`, VIEW_W - 8, 12, this.winFlash > 0 ? "#7ad858" : "#f4d34a");
    screen.text(`${this.state.money}€`, 8, 22, "#e8c84a");
    screen.textRight(`SOND ${this.state.sondaggi}%`, VIEW_W - 8, 22, sondaggiColor(this.state.sondaggi));

    if (this.mode === "slot") {
      this.drawSlot(screen);
    } else if (this.mode === "change") {
      this.changeMenu.draw(screen, 14, 40, VIEW_W - 28);
      screen.text("Le FICHE proteggono i tuoi fondi.", 14, VIEW_H - 22, GREY);
      screen.text("A: conferma  B: indietro", 8, VIEW_H - 10, GREY);
    } else if (this.mode === "prizes") {
      this.prizeMenu.draw(screen, 14, 36, VIEW_W - 28);
      const prize = PRIZES[this.prizeMenu.index];
      if (prize) {
        const can = this.state.chips >= prize.chips;
        screen.text(can ? "Puoi riscattarlo!" : "FICHE insufficienti.", 14, VIEW_H - 22, can ? "#7ad858" : "#d04848");
      }
      screen.text("A: riscatta  B: indietro", 8, VIEW_H - 10, GREY);
    } else {
      this.menu.draw(screen, 14, 36, VIEW_W - 28);
      // Mobile slot PixelLab come decoro della schermata menu (spazio libero in
      // basso a destra): dà identità da casinò senza coprire testo/menu.
      const cab = sceneImage("ui:slot", "ui/slot_cabinet.png");
      if (cab) {
        const dh = 48;
        const dw = cab.width * (dh / cab.height);
        screen.imageSprite(cab, VIEW_W - 12 - dw, VIEW_H - 30 - dh, { scaleX: dh / cab.height, scaleY: dh / cab.height });
      }
      screen.text("Il banco vince. Ma i premi sono reali.", 14, VIEW_H - 22, GREY);
      screen.text("A: scegli  B: esci", 8, VIEW_H - 10, GREY);
    }
    this.msg.draw(screen);
  }

  private drawSlot(screen: Screen): void {
    const y = 46;
    screen.panel(40, y, VIEW_W - 80, 54);
    for (let i = 0; i < 3; i += 1) {
      const rx = 56 + i * 50;
      screen.frame(rx - 4, y + 10, 34, 32, INK);
      screen.rect(rx - 3, y + 11, 32, 30, "#10141f");
      const reel = REELS[this.reelIdx[i]];
      screen.text(reel.ch, rx + 5, y + 18, reel.color, 2);
      if (this.locked[i] && !this.spinning) {
        screen.text(reel.name.slice(0, 5), rx - 3, y + 44, GREY);
      }
    }
    // Stats di sessione: quante giocate e bilancio FICHE rispetto all'ingresso.
    const net = this.state.chips - this.sessionStart;
    const netColor = net > 0 ? "#7ad858" : net < 0 ? "#d04848" : GREY;
    screen.text(`GIRI: ${this.spins}`, 14, VIEW_H - 34, GREY);
    screen.textRight(`SESSIONE: ${net >= 0 ? "+" : ""}${net} FICHE`, VIEW_W - 8, VIEW_H - 34, netColor);

    if (!this.spinning) {
      screen.text(
        this.lastWin > 0 ? `VINCI ${this.lastWin} FICHE!` : "Ritenta...",
        14, VIEW_H - 22, this.lastWin > 0 ? "#7ad858" : GREY
      );
      screen.text("A: rigioca  B: esci", 8, VIEW_H - 10, GREY);
    } else {
      screen.text("Girano i rulli del consenso...", 14, VIEW_H - 22, PAPER);
    }
  }
}
