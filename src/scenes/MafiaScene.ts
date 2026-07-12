import { ITEMS } from "../data/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { addSondaggi, sondaggiColor } from "../game/governo";
import { healMonster } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { Menu, MessageBox, wrapText, GREY } from "../ui/widgets";

// RETROBOTTEGA DEL PADRINO — la "famiglia" come satira bonaria del clientelismo
// e delle raccomandazioni. NIENTE violenza/apologia: qui si comprano favori
// sottobanco che AIUTANO ma COMPROMETTONO (costano SONDAGGI, la rispettabilità).
//
//  - MERCATO NERO: DIRETTIVE rare a metà prezzo, ma -3 sondaggi a botta.
//  - RACCOMANDAZIONE: cura la squadra + un regalo, in cambio di fondi e sondaggi.
//  - PROTEZIONE (il "PIZZO"): paghi una volta e i candidati selvatici ti
//    disturbano di meno (flag mafia-protezione). Satira sul "ci pensiamo noi".
//  - SCOMMESSA CLANDESTINA: punti fondi su un cavallo truccato. Payout alto,
//    rischio alto.

interface BlackItem {
  itemId: string;
  price: number; // in € (metà del listino circa)
  sondaggi: number; // costo reputazionale
}
const BLACK_MARKET: BlackItem[] = [
  { itemId: "dirInciucio", price: 900, sondaggi: -3 },
  { itemId: "dirBunga", price: 1500, sondaggi: -4 },
  { itemId: "dirVaffa", price: 1100, sondaggi: -3 }
  // TESSERA DORATA rimossa dal mercato nero: era un canale duplicato a metà
  // prezzo (1400€) del negozio (3000€) e gonfiava l'offerta dell'item evolutivo.
  // Resta: negozio, loot raro (3%), e ricompense quest (CAPITANO, zona STRETTO).
];

const RACCOMANDAZIONE_COST = 400;
const PROTEZIONE_COST = 1200;
const BET_MIN = 200;

type Mode = "menu" | "market";

export function mafiaOptionDetails(index: number, protectionActive: boolean): string[] {
  switch (index) {
    case 0:
      return ["DIRETTIVE RARE A PREZZO RIDOTTO.", "OGNI ACQUISTO COSTA 3-4 SOND."];
    case 1:
      return ["CURA TUTTA LA SQUADRA.", "REGALO: 2 SCHEDE BLINDATE.", "COSTO: 400€ E -2 SOND."];
    case 2:
      return protectionActive
        ? ["PROTEZIONE GIÀ ATTIVA.", "GLI INCONTRI RESTANO RIDOTTI."]
        : ["RIDUCE GLI INCONTRI SELVATICI.", "EFFETTO PERMANENTE.", "COSTO: 1200€ E -5 SOND."];
    case 3:
      return ["PUNTATA FISSA: 200€.", "25% VINCI 600€; 22% PARI.", "53% PERDI TUTTO."];
    default:
      return ["TORNA AL CHIOSCO DEL PONTE."];
  }
}

export class MafiaScene implements Scene {
  private menu: Menu;
  private marketMenu: Menu;
  private msg = new MessageBox();
  private mode: Mode = "menu";
  private time = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.menu = this.buildMenu();
    this.marketMenu = this.buildMarketMenu();
  }

  private buildMenu(): Menu {
    const protezione = this.state.flags["mafia-protezione"]
      ? "PROTEZIONE: ATTIVA"
      : `PROTEZIONE (PIZZO)`;
    return new Menu([
      { label: "MERCATO NERO" },
      { label: "RACCOMANDAZIONE", rightLabel: `${RACCOMANDAZIONE_COST}€` },
      { label: protezione, rightLabel: this.state.flags["mafia-protezione"] ? "" : `${PROTEZIONE_COST}€` },
      { label: "SCOMMESSA CLANDESTINA", rightLabel: `${BET_MIN}€+` },
      { label: "ESCI" }
    ]);
  }

  private buildMarketMenu(): Menu {
    const items = BLACK_MARKET.map((b) => ({
      label: ITEMS[b.itemId]?.name ?? b.itemId,
      rightLabel: `${b.price}€`
    }));
    items.push({ label: "INDIETRO", rightLabel: "" });
    return new Menu(items);
  }

  update(dt: number): void {
    this.time += dt;
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    if (this.mode === "market") {
      this.updateMarket();
      return;
    }
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
        this.marketMenu.index = 0;
        this.mode = "market";
        break;
      case 1:
        this.raccomandazione();
        break;
      case 2:
        this.protezione();
        break;
      case 3:
        this.scommessa();
        break;
      default:
        this.stack.pop();
    }
  }

  // ---- MERCATO NERO ----

  private updateMarket(): void {
    const action = this.marketMenu.update(this.input);
    if (action === "cancel" || (action === "select" && this.marketMenu.index === BLACK_MARKET.length)) {
      this.mode = "menu";
      return;
    }
    if (action !== "select") {
      return;
    }
    const deal = BLACK_MARKET[this.marketMenu.index];
    if (!deal) {
      return;
    }
    const item = ITEMS[deal.itemId];
    if (item?.reusable && (this.state.bag[deal.itemId] ?? 0) > 0) {
      audio.cancel();
      this.msg.show(["Quella DIRETTIVA ce l'hai già.", "La famiglia non fa il bis sugli stessi affari."]);
      return;
    }
    if (this.state.money < deal.price) {
      audio.cancel();
      this.msg.show(["Fondi insufficienti.", "Il PADRINO non fa credito. Torna quando hai i contanti."]);
      return;
    }
    this.state.money -= deal.price;
    this.state.bag[deal.itemId] = (this.state.bag[deal.itemId] ?? 0) + 1;
    const now = addSondaggi(this.state, deal.sondaggi);
    audio.confirm();
    saveGame(this.state);
    this.msg.show([
      `Affare fatto: ${item?.name ?? deal.itemId}.`,
      `Ma certi giri si pagano: ${deal.sondaggi} sondaggi (ora ${now}%).`
    ]);
  }

  // ---- RACCOMANDAZIONE ----

  private raccomandazione(): void {
    if (this.state.money < RACCOMANDAZIONE_COST) {
      audio.cancel();
      this.msg.show(["Servono contanti per certe cortesie.", `Costo: ${RACCOMANDAZIONE_COST}€.`]);
      return;
    }
    this.state.money -= RACCOMANDAZIONE_COST;
    for (const mon of this.state.party) {
      healMonster(mon);
    }
    this.state.bag.schedona = (this.state.bag.schedona ?? 0) + 2;
    const now = addSondaggi(this.state, -2);
    audio.heal();
    saveGame(this.state);
    this.msg.show([
      "Una telefonata giusta e tutto si sistema.",
      "Squadra rimessa a nuovo e 2 SCHEDE BLINDATE in omaggio.",
      `La rispettabilità però scende: -2 sondaggi (ora ${now}%).`
    ]);
  }

  // ---- PROTEZIONE (PIZZO) ----

  private protezione(): void {
    if (this.state.flags["mafia-protezione"]) {
      audio.cancel();
      this.msg.show(["Sei già sotto la nostra ala.", "I candidati molesti sanno che sei dei nostri."]);
      return;
    }
    if (this.state.money < PROTEZIONE_COST) {
      audio.cancel();
      this.msg.show(["Il PIZZO è il PIZZO.", `Servono ${PROTEZIONE_COST}€. Niente sconti, è una questione di principio.`]);
      return;
    }
    this.state.money -= PROTEZIONE_COST;
    this.state.flags["mafia-protezione"] = true;
    const now = addSondaggi(this.state, -5);
    audio.confirm();
    saveGame(this.state);
    this.menu = this.buildMenu();
    this.msg.show([
      "Da oggi sei sotto PROTEZIONE: meno seccatori per strada.",
      "I candidati selvatici ti danno tregua.",
      `Ma la cosa si sa: -5 sondaggi (ora ${now}%).`
    ]);
  }

  // ---- SCOMMESSA CLANDESTINA ----

  private scommessa(): void {
    if (this.state.money < BET_MIN) {
      audio.cancel();
      this.msg.show(["Per giocare ci vogliono almeno " + BET_MIN + "€.", "Niente fiches qui: solo contanti."]);
      return;
    }
    this.state.money -= BET_MIN;
    // 25% vinci 3x lordo (=+2x netto), 22% pari, 53% perdi tutto → EV ~0.97
    // (il banco vince di poco). Prima era 40/25/35 = EV 1.45, money infinito.
    const roll = Math.random();
    let text: string[];
    if (roll < 0.25) {
      const win = BET_MIN * 3;
      this.state.money += win;
      audio.catchJingle();
      text = ["Il cavallo giusto! La corsa era... orientata.", `Incassi ${win}€. Non chiedere come.`];
    } else if (roll < 0.47) {
      this.state.money += BET_MIN;
      audio.cursor();
      text = ["Fotofinish: ti ridanno la posta.", "Stavolta è andata in pari. Tira un sospiro."];
    } else {
      audio.cancel();
      text = ["Il tuo cavallo si è fermato a metà pista.", `Persi ${BET_MIN}€. La casa vince, sempre.`];
    }
    saveGame(this.state);
    this.msg.show(text);
  }

  // ---- Draw ----

  draw(screen: Screen): void {
    screen.clear("#1a1410");
    // Atmosfera fumosa: lampada calda in alto.
    screen.rect(0, 0, VIEW_W, 10, "#2a1e14");
    screen.text("RETROBOTTEGA DEL PADRINO", 8, 10, "#c8a85a");
    screen.textRight(`${this.state.money}€`, VIEW_W - 8, 10, "#e8c84a");
    screen.text(`SOND ${this.state.sondaggi}%`, 8, 20, sondaggiColor(this.state.sondaggi));

    if (this.mode === "market") {
      this.marketMenu.draw(screen, 14, 34, VIEW_W - 28);
      const deal = BLACK_MARKET[this.marketMenu.index];
      if (deal) {
        const item = ITEMS[deal.itemId];
        screen.panel(10, 103, VIEW_W - 20, 57, "card");
        const details = wrapText((item?.desc ?? "DIRETTIVA RISERVATA.").toUpperCase(), 34).slice(0, 4);
        details.forEach((line, i) => screen.text(line, 14, 107 + i * 9, i === 0 ? "#cfe6ff" : GREY));
        screen.text(`COSTO ${deal.price}€  RISCHIO ${deal.sondaggi} SOND.`, 14, 148, "#d04848");
      }
      screen.text("A: COMPRA  B: INDIETRO", 8, VIEW_H - 10, GREY);
    } else {
      this.menu.draw(screen, 14, 34, VIEW_W - 28);
      screen.panel(10, 114, VIEW_W - 20, 46, "card");
      const details = mafiaOptionDetails(this.menu.index, Boolean(this.state.flags["mafia-protezione"]));
      details.forEach((line, i) => screen.text(line, 14, 118 + i * 9, i === details.length - 1 ? "#d8a850" : "#cfe6ff"));
      screen.text("A: SCEGLI  B: ESCI", 8, VIEW_H - 10, GREY);
    }
    this.msg.draw(screen);
  }
}
