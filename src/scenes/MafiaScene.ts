import { ITEMS } from "../data/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { addSondaggi } from "../game/governo";
import { healMonster } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { changeMorale } from "../game/morale";
import type { UiPanel, UiBlock } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";

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
  private mode: Mode = "menu";
  private pending: { market: boolean; index: number } | null = null;
  private receipt: UiBlock[] | null = null;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  private live(): boolean { return this.stack.top === this; }
  private back(): void {
    if (!this.live()) return;
    this.input.reset(); audio.cancel();
    if (this.receipt) this.receipt = null;
    else if (this.pending) this.pending = null;
    else if (this.mode === "market") this.mode = "menu";
    else this.stack.pop();
  }
  private review(market: boolean, index: number): void {
    if (!this.live() || this.pending || this.receipt) return;
    this.pending = { market, index }; this.input.reset(); audio.confirm();
  }
  private terms(choice: NonNullable<MafiaScene["pending"]>) {
    const deal = choice.market ? BLACK_MARKET[choice.index] : undefined;
    return {
      deal,
      cost: deal?.price ?? [0, RACCOMANDAZIONE_COST, PROTEZIONE_COST, BET_MIN][choice.index],
      polls: deal ? -deal.sondaggi : [0, 2, 5, 0][choice.index],
      trust: deal ? 5 : [0, 6, 10, 0][choice.index],
      cohesion: deal ? 2 : [0, 3, 5, 0][choice.index]
    };
  }
  private unavailable(choice: NonNullable<MafiaScene["pending"]>): string | undefined {
    const { deal, cost } = this.terms(choice);
    if (choice.market && !deal) return "Questa direttiva non è disponibile.";
    if (!choice.market && choice.index === 2 && this.state.flags["mafia-protezione"]) return "Protezione già attiva. Non devi pagare di nuovo.";
    if (deal && ITEMS[deal.itemId]?.reusable && (this.state.bag[deal.itemId] ?? 0) > 0) return "Direttiva già tua: puoi riutilizzarla dalla borsa.";
    if (this.state.money < cost) return `Mancano ${cost - this.state.money} €.`;
    return undefined;
  }
  private commit(choice: NonNullable<MafiaScene["pending"]>): void {
    if (!this.live() || this.pending !== choice || this.receipt) return;
    this.pending = null; this.input.reset();
    const reason = this.unavailable(choice);
    if (reason) { audio.cancel(); this.receipt = [{ title: "Affare non concluso", body: reason }]; return; }
    const before = { money: this.state.money, polls: this.state.sondaggi, trust: this.state.morale.trust, cohesion: this.state.morale.cohesion };
    const { deal, cost, polls, trust, cohesion } = this.terms(choice);
    this.state.money -= cost;
    let title: string, body: string;
    if (deal) {
      this.state.bag[deal.itemId] = (this.state.bag[deal.itemId] ?? 0) + 1;
      title = "Direttiva in borsa"; body = `${readableCopy(ITEMS[deal.itemId].name)} acquisita. La fattura arriverà quando il commercialista troverà un sinonimo di favore.`;
      changeMorale(this.state, "FAVORE SOTTOBANCO", -trust, -cohesion); audio.confirm();
    } else if (choice.index === 1) {
      for (const mon of this.state.party) healMonster(mon);
      this.state.bag.schedona = (this.state.bag.schedona ?? 0) + 2;
      title = "Raccomandazione ottenuta"; body = "Squadra curata: PV, PP e condizioni ripristinati. Due schede blindate in borsa. Il centralino non rispondeva; al numero privato è bastato uno squillo.";
      changeMorale(this.state, "RACCOMANDAZIONE", -trust, -cohesion); audio.heal();
    } else if (choice.index === 2) {
      this.state.flags["mafia-protezione"] = true;
      title = "Protezione attiva"; body = "Gli incontri selvatici sono ridotti in modo permanente. Sul contratto c’è scritto libertà di circolazione. La firma è già la tua.";
      changeMorale(this.state, "PROTEZIONE PRIVATA", -trust, -cohesion); audio.confirm();
    } else {
      const roll = Math.random();
      title = "Risultato della scommessa";
      if (roll < 0.25) { this.state.money += BET_MIN * 3; audio.catchJingle(); body = "Incasso lordo: 600 €. Il cavallo ha vinto. Il fantino ringrazia la cabina di regia."; }
      else if (roll < 0.47) { this.state.money += BET_MIN; audio.cursor(); body = "Incasso lordo: 200 €. Puntata restituita. La commissione ha dichiarato vincitori tutti, tranne chi aspettava un premio."; }
      else { audio.cancel(); body = "Incasso lordo: 0 €. Persi 200 €. Il cavallo si è fermato a metà pista: attende il decreto attuativo."; }
    }
    if (polls) addSondaggi(this.state, -polls);
    saveGame(this.state);
    this.receipt = [{ title, body }, { title: "Effetti registrati", facts: [
      { label: "Fondi", value: `${before.money} → ${this.state.money} €` },
      { label: "Sondaggi", value: `${before.polls} → ${this.state.sondaggi}%` },
      { label: "Fiducia", value: `${before.trust} → ${this.state.morale.trust}` },
      { label: "Coesione", value: `${before.cohesion} → ${this.state.morale.cohesion}` }
    ] }];
  }

  get uiPanel(): UiPanel {
    const back = { label: "Indietro", run: () => this.back() };
    if (this.receipt) return { title: "Retrobottega", blocks: this.receipt,
      actions: [{ label: "Continua", run: () => { if (this.live() && this.receipt) { this.receipt = null; this.input.reset(); } } }], primary: 0, back };
    const choice = this.pending;
    if (choice) {
      const { deal, cost, polls, trust, cohesion } = this.terms(choice), reason = this.unavailable(choice);
      const betting = !choice.market && choice.index === 3;
      const title = deal ? readableCopy(ITEMS[deal.itemId].name) : ["", "Raccomandazione", "Protezione", "Scommessa clandestina"][choice.index];
      const body = deal ? ITEMS[deal.itemId].desc : choice.index === 1
        ? "Ripristina PV, PP e condizioni di tutta la squadra. Ricevi anche due schede blindate."
        : choice.index === 2 ? "Riduce gli incontri selvatici in modo permanente. Si paga una sola volta."
        : "Puntata fissa di 200 €. Il risultato è casuale: nessun incasso è garantito.";
      return { title, blocks: [{ title: "Cosa ottieni", body },
        { title: "Costo e conseguenze", facts: [
          { label: "Costo", value: `${cost} €` },
          { label: "Fondi dopo", value: this.state.money >= cost ? `${this.state.money} → ${this.state.money - cost} €` : "Fondi insufficienti" },
          { label: "Sondaggi", value: `${this.state.sondaggi} → ${Math.max(0, this.state.sondaggi - polls)}%` },
          { label: "Fiducia", value: `${this.state.morale.trust} → ${Math.max(0, this.state.morale.trust - trust)}` },
          { label: "Coesione", value: `${this.state.morale.cohesion} → ${Math.max(0, this.state.morale.cohesion - cohesion)}` }
        ] }, betting ? { title: "Possibili incassi", facts: [
          { label: "25% dei casi", value: "600 € lordi · +400 € netti" },
          { label: "22% dei casi", value: "200 € lordi · in pari" },
          { label: "53% dei casi", value: "0 € · perdi 200 €" }
        ], body: "Il banco trattiene in media 6 € per puntata." }
        : { title: "Il prezzo del favore", body: "La fila resta fuori. La porta laterale non emette un numero di attesa. Meno fiducia può rincarare i negozi; meno coesione può rallentare l’esperienza della squadra." }],
        actions: [{ label: betting ? "Punta 200 €" : "Concludi l’affare", disabled: Boolean(reason), hint: reason, run: () => this.commit(choice) }], primary: 0, back };
    }
    const wallet: UiBlock = { title: "La tua situazione", facts: [
      { label: "Fondi", value: `${this.state.money} €` }, { label: "Sondaggi", value: `${this.state.sondaggi}%` },
      { label: "Fiducia", value: String(this.state.morale.trust) }, { label: "Coesione", value: String(this.state.morale.cohesion) }
    ] };
    if (this.mode === "market") return { title: "Mercato nero", subtitle: "Direttive rare. Il prezzo sul cartellino è solo una parte del costo.", blocks: [wallet], positioned: true,
      actions: BLACK_MARKET.map((deal, index) => ({ label: readableCopy(ITEMS[deal.itemId].name), hint: ITEMS[deal.itemId].desc,
        facts: [{ label: "Prezzo", value: `${deal.price} €` }, { label: "Sondaggi", value: String(deal.sondaggi) }],
        run: () => this.review(true, index) })), back };
    return { title: "Retrobottega del Padrino", subtitle: "Qui il merito ha un ingresso riservato.", blocks: [wallet], positioned: true,
      actions: [
        { label: "Mercato nero", hint: "Tre direttive rare. Ogni acquisto costa anche sondaggi, fiducia e coesione.", run: () => { if (this.live() && !this.pending && !this.receipt) { this.mode = "market"; this.input.reset(); } } },
        { label: "Raccomandazione", hint: "Cura la squadra e ricevi due schede blindate.", facts: [{ label: "Costo", value: "400 €" }], run: () => this.review(false, 1) },
        { label: "Protezione", hint: this.state.flags["mafia-protezione"] ? "Già attiva: incontri selvatici ridotti. Nessun altro pagamento." : "Meno incontri selvatici, in modo permanente.", disabled: Boolean(this.state.flags["mafia-protezione"]), facts: [{ label: "Costo", value: this.state.flags["mafia-protezione"] ? "Già pagato" : "1200 €" }], run: () => this.review(false, 2) },
        { label: "Scommessa clandestina", hint: "25% vinci, 22% in pari, 53% perdi la puntata.", facts: [{ label: "Puntata fissa", value: "200 €" }], run: () => this.review(false, 3) }
      ], back };
  }
  update(_dt: number): void {}
  draw(screen: Screen): void { screen.clear("#101c30"); }
}
