import { ITEMS } from "../data/items";
import { drawItemIcon } from "../art/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import { shopPrice } from "../game/governo";
import { buySupplies, purchaseLimit, shopStock } from "../game/supplyGuide";
import { SupplyView } from "../ui/SupplyView";
import { drawScreenHeader, MessageBox, wrapText, INK } from "../ui/widgets";
const GREY = "#59657d";

export class ShopScene implements Scene {
  private view: SupplyView;
  private msg = new MessageBox();
  private quote: { id: string; quantity: number } | null = null;
  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.view = new SupplyView(state, true);
    this.refresh();
  }
  private refresh(): void {
    this.view.sync(shopStock(this.state), (id) => ITEMS[id].reusable && (this.state.bag[id] ?? 0) > 0 ? "GIÀ TUA" : `${shopPrice(this.state, ITEMS[id])}€`);
  }
  update(dt: number): void {
    if (this.msg.isOpen) { this.msg.update(dt, this.input); return; }
    if (this.quote) {
      const quote = this.quote, item = ITEMS[quote.id], max = purchaseLimit(this.state, item);
      if (this.input.wasPressed("b")) { this.quote = null; audio.cancel(); return; }
      const delta = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : this.input.wasPressed("up") ? 10 : this.input.wasPressed("down") ? -10 : 0;
      quote.quantity = Math.max(1, Math.min(Math.max(1, max), quote.quantity + delta));
      if (delta) audio.cursor();
      if (this.input.wasPressed("a")) {
        this.quote = null;
        if (!buySupplies(this.state, quote.id, quote.quantity)) { audio.cancel(); this.msg.show(["Preventivo scaduto: controlla fondi e disponibilità."]); return; }
        saveGame(this.state); this.refresh(); audio.confirm();
        this.msg.show([`${quote.quantity} x ${item.name} in borsa.`, "Lo scontrino è lungo. Almeno questa promessa è misurabile."]);
      }
      return;
    }
    this.refresh();
    const action = this.view.update(this.input); this.refresh();
    if (action === "cancel") { this.stack.pop(); return; }
    const id = this.view.selected;
    if (action !== "select" || !id) return;
    const item = ITEMS[id];
    if (!purchaseLimit(this.state, item)) {
      audio.cancel();
      this.msg.show([item.reusable && (this.state.bag[id] ?? 0) > 0 ? "Direttiva già in archivio: puoi riusarla dalla borsa." : "Fondi insufficienti. Il POS non legge i programmi elettorali."]);
      return;
    }
    this.quote = { id, quantity: 1 };
  }
  draw(screen: Screen): void {
    if (this.msg.isOpen) { screen.clear("#101b32"); this.msg.draw(screen); return; }
    if (!this.quote) { this.refresh(); this.view.draw(screen); return; }
    const { id, quantity } = this.quote, item = ITEMS[id], price = shopPrice(this.state, item), total = price * quantity;
    screen.clear("#101b32"); drawScreenHeader(screen, "PREVENTIVO", `${this.state.money}€`);
    screen.panel(6, 24, 228, 141, "card"); drawItemIcon(screen, id, 188, 28, 32);
    wrapText(item.name, 27).forEach((line, i) => screen.text(line, 14, 32 + i * 9, INK));
    screen.text(`QUANTITÀ: ${quantity}/${purchaseLimit(this.state, item)}`, 14, 65, INK);
    screen.text(`UNITARIO: ${price} EURO`, 14, 78, GREY);
    screen.text(`TOTALE: ${total} EURO`, 14, 94, "#8c5b12");
    screen.text(`RESTANO: ${this.state.money - total} EURO`, 14, 107, INK);
    screen.text(`GIÀ IN BORSA: ${this.state.bag[id] ?? 0}`, 14, 120, GREY);
    screen.text(item.reusable ? "RIUSABILE: UNA COPIA BASTA." : "NESSUNO SCONTO PER QUANTITÀ.", 14, 140, GREY);
    screen.text("◄►:1 SU/GIU:10 A:COMPRA B:INDIETRO", 8, 169, "#fff3cc");
  }
}
