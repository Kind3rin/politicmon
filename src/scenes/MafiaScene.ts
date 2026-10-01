import { ITEMS } from "../data/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { addSondaggi } from "../game/governo";
import { healMonster } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { Menu, MessageBox, wrapText } from "../ui/widgets";
import { drawEpilogueBackdrop, drawEpiloguePage, epiloguePages } from "../ui/epilogueArt";
import { drawScreenHeader } from "../ui/widgets";
import { changeMorale } from "../game/morale";

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
      return ["DIRETTIVE RARE A PREZZO RIDOTTO.", "OGNI ACQUISTO COSTA 3-4 SOND.", "FIDUCIA -5 / COESIONE -2."];
    case 1:
      return ["CURA TUTTA LA SQUADRA.", "REGALO: 2 SCHEDE BLINDATE.", "COSTO: 400€ E -2 SOND.", "FIDUCIA -6 / COESIONE -3."];
    case 2:
      return protectionActive
        ? ["PROTEZIONE GIÀ ATTIVA.", "GLI INCONTRI RESTANO RIDOTTI."]
        : ["RIDUCE GLI INCONTRI SELVATICI.", "EFFETTO PERMANENTE.", "COSTO: 1200€ E -5 SOND.", "FIDUCIA -10 / COESIONE -5."];
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
  private pending: { market: boolean; index: number; pages: string[][] } | null = null;
  private page = 0;

  private review(market: boolean, index: number): void {
    const deal = market ? BLACK_MARKET[index] : null;
    const alreadyProtected = !market && index === 2 && Boolean(this.state.flags["mafia-protezione"]);
    const cost = alreadyProtected ? 0 : deal?.price ?? [0, RACCOMANDAZIONE_COST, PROTEZIONE_COST, BET_MIN][index];
    const loss = alreadyProtected ? 0 : deal ? -deal.sondaggi : [0, 2, 5, 0][index];
    const trust = alreadyProtected ? 0 : deal ? 5 : [0, 6, 10, 0][index], cohesion = alreadyProtected ? 0 : deal ? 2 : [0, 3, 5, 0][index];
    const paragraphs = deal ? [(ITEMS[deal.itemId]?.desc ?? "DIRETTIVA RISERVATA.").toUpperCase(), `ACQUISTO: ${ITEMS[deal.itemId]?.name}.`] : mafiaOptionDetails(index, Boolean(this.state.flags["mafia-protezione"]));
    this.pending = { market, index, pages: epiloguePages([...paragraphs,
      `COSTO ${cost}€. FONDI ATTUALI ${this.state.money}€.`,
      `PERDITA REALE: SOND ${Math.min(this.state.sondaggi, loss)}, FID ${Math.min(this.state.morale.trust, trust)}, COE ${Math.min(this.state.morale.cohesion, cohesion)}.`,
      index === 3 && !market ? "INCASSI LORDI: 600€, 200€ O 0€. IL BANCO TRATTIENE IN MEDIA 6€ SU OGNI PUNTATA." : "LA FILA RESTA FUORI. LA PORTA LATERALE NON EMETTE UN NUMERO DI ATTESA.",
      "A ALLA FINE CONFERMA. B ANNULLA."])};
    this.page = 0;
  }

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
    if (this.pending) {
      if (this.input.wasPressed("b")) { this.pending = null; return; }
      if (!this.input.wasPressed("a")) return;
      if (this.page < this.pending.pages.length - 1) { this.page++; return; }
      const selected = this.pending; this.pending = null;
      if (selected.market) this.buyMarket(selected.index);
      else if (selected.index === 1) this.raccomandazione();
      else if (selected.index === 2) this.protezione();
      else this.scommessa();
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
        this.review(false, 1);
        break;
      case 2:
        this.review(false, 2);
        break;
      case 3:
        this.review(false, 3);
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
    this.review(true, this.marketMenu.index);
  }

  private buyMarket(index: number): void {
    const deal = BLACK_MARKET[index];
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
    const beforeSond = this.state.sondaggi;
    const now = addSondaggi(this.state, deal.sondaggi);
    changeMorale(this.state, "FAVORE SOTTOBANCO", -5, -2);
    audio.confirm();
    saveGame(this.state);
    this.msg.show([
      `Affare fatto: ${item?.name ?? deal.itemId}.`,
      `Ma certi giri si pagano: ${now - beforeSond} sondaggi (ora ${now}%).`,
      this.moraleReceipt()
    ]);
  }

  // ---- RACCOMANDAZIONE ----

  private moraleReceipt(): string {
    const record = this.state.morale.history.at(-1)!;
    return `Fiducia ${record.trust}, coesione ${record.cohesion}. La fila ha visto la porta laterale.`;
  }

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
    const beforeSond = this.state.sondaggi;
    const now = addSondaggi(this.state, -2);
    changeMorale(this.state, "RACCOMANDAZIONE", -6, -3);
    audio.heal();
    saveGame(this.state);
    this.msg.show([
      "Una telefonata giusta e tutto si sistema.",
      "Squadra rimessa a nuovo e 2 SCHEDE BLINDATE in omaggio.",
      `La rispettabilità però scende: ${now - beforeSond} sondaggi (ora ${now}%).`,
      this.moraleReceipt()
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
    const beforeSond = this.state.sondaggi;
    const now = addSondaggi(this.state, -5);
    changeMorale(this.state, "PROTEZIONE PRIVATA", -10, -5);
    audio.confirm();
    saveGame(this.state);
    this.menu = this.buildMenu();
    this.msg.show([
      "Da oggi sei sotto PROTEZIONE: meno seccatori per strada.",
      "I candidati selvatici ti danno tregua.",
      `Ma la cosa si sa: ${now - beforeSond} sondaggi (ora ${now}%).`,
      this.moraleReceipt()
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
    drawEpilogueBackdrop(screen, "mafia");
    drawScreenHeader(screen, "RETROBOTTEGA DEL PADRINO", `${this.state.money}€`);
    if (this.pending) {
      drawEpiloguePage(screen, this.pending.pages[this.page]);
      screen.text(this.page === this.pending.pages.length - 1 ? "A: CONFERMA   B: ANNULLA" : "A: AVANTI   B: ANNULLA", 12, 167, "#fffaf0");
      return;
    }
    screen.rect(0, 17, VIEW_W, 13, "#17243d");
    screen.text(`SOND ${this.state.sondaggi}%`, 8, 20, "#fffaf0");

    if (this.mode === "market") {
      this.marketMenu.draw(screen, 14, 34, VIEW_W - 28);
      const deal = BLACK_MARKET[this.marketMenu.index];
      if (deal) {
        const item = ITEMS[deal.itemId];
        screen.panel(10, 103, VIEW_W - 20, 57, "card");
        const details = wrapText((item?.desc ?? "DIRETTIVA RISERVATA.").toUpperCase(), 34).slice(0, 3);
        details.forEach((line, i) => screen.text(line, 14, 107 + i * 9, "#10141f"));
        screen.text(`COSTO ${deal.price}€ / ${deal.sondaggi} SOND`, 14, 139, "#d04848");
        screen.text("FIDUCIA -5 / COESIONE -2", 14, 150, "#d04848");
      }
      screen.text("A: DOSSIER  B: INDIETRO", 8, VIEW_H - 13, "#fffaf0");
    } else {
      this.menu.draw(screen, 14, 34, VIEW_W - 28);
      screen.panel(10, 114, VIEW_W - 20, 46, "card");
      const details = mafiaOptionDetails(this.menu.index, Boolean(this.state.flags["mafia-protezione"]));
      details.forEach((line, i) => screen.text(line, 14, 118 + i * 9, i === details.length - 1 ? "#99531e" : "#10141f"));
      screen.text("A: DOSSIER  B: ESCI", 8, VIEW_H - 13, "#fffaf0");
    }
    this.msg.draw(screen);
  }
}
