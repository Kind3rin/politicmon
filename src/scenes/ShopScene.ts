import { BAG_ORDER, ITEMS, SHOP_DIRECTIVES } from "../data/items";
import { itemIcon, drawItemIcon } from "../art/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import { hasMinistro, shopPrice } from "../game/governo";
import { Menu, MessageBox, wrapText, GREY, INK, PAPER } from "../ui/widgets";

export class ShopScene implements Scene {
  private menu: Menu;
  private itemIds: string[];
  private msg = new MessageBox();

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    // I prezzi seguono i sondaggi e gli accordi del Min. Esteri.
    // Solo alcune DIRETTIVE sono in vendita; le altre si trovano in giro.
    this.itemIds = BAG_ORDER.filter((id) => {
      const item = ITEMS[id];
      if (item.price === undefined) {
        return false;
      }
      if (item.kind === "tm") {
        return SHOP_DIRECTIVES.includes(id);
      }
      return true;
    });
    this.menu = new Menu(
      this.itemIds.map((id) => ({
        label: ITEMS[id].name,
        rightLabel: `${shopPrice(this.state, ITEMS[id])}€`,
        icon: itemIcon(id),
        iconId: `shop-${id}`
      }))
    );
  }

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
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
    const itemId = this.itemIds[this.menu.index];
    const item = ITEMS[itemId];
    // Le DIRETTIVE sono riutilizzabili: una sola copia in archivio basta.
    if (item.reusable && (this.state.bag[itemId] ?? 0) > 0) {
      audio.cancel();
      this.msg.show(["Hai già questa DIRETTIVA in archivio.", "Riusala dalla BORSA quante volte vuoi."]);
      return;
    }
    const price = shopPrice(this.state, item);
    if (this.state.money < price) {
      audio.cancel();
      this.msg.show(["Fondi insufficienti.", "Hai provato a pagare in promesse: rifiutate."]);
      return;
    }
    this.state.money -= price;
    this.state.bag[itemId] = (this.state.bag[itemId] ?? 0) + 1;
    audio.confirm();
    saveGame(this.state);
    this.msg.show([`Comprato: ${item.name}!`]);
  }

  draw(screen: Screen): void {
    screen.clear("#2e4434");
    screen.text("DISCOUNT ELETTORALE", 8, 6, PAPER);
    screen.textRight(`${this.state.money}€`, VIEW_W - 8, 6, "#e8c84a");
    const MAX_VIS = 6; // finestra scorrevole: lascia spazio al pannello descrizione
    this.menu.draw(screen, 10, 20, VIEW_W - 20, 13, MAX_VIS);
    const item = ITEMS[this.itemIds[this.menu.index]];
    if (item) {
      // "Ne possiedi" va nell'header (accanto ai fondi): libera spazio nel
      // pannello per mostrare la descrizione COMPLETA (prima troncata a 2 righe).
      screen.text(`Hai: ${this.state.bag[item.id] ?? 0}`, 8, 14, GREY);
      const y = 24 + this.menu.measureHeight(13, MAX_VIS);
      // Icona oggetto (24x24) a sinistra; descrizione a destra dell'icona.
      const lines = wrapText(item.desc, 28);
      const shown = Math.min(3, lines.length);
      const panelH = Math.max(30, 10 + shown * 10);
      screen.panel(10, y, VIEW_W - 20, panelH);
      drawItemIcon(screen, item.id, 16, y + Math.floor((panelH - 24) / 2), 24);
      for (let i = 0; i < shown; i += 1) {
        screen.text(lines[i], 44, y + 6 + i * 10, INK);
      }
    }
    const note =
      this.state.sondaggi >= 70
        ? "Sconto popolarità -10%!"
        : this.state.sondaggi < 30
          ? "Sovrapprezzo rischio flop +15%."
          : "";
    const esteri = hasMinistro(this.state, "esteri") ? " Min. Esteri -20%!" : "";
    if (note || esteri) {
      screen.text(`${note}${esteri}`.trim().slice(0, 34), 8, VIEW_H - 20, "#e8c84a");
    }
    screen.text("A: compra  B: esci", 8, VIEW_H - 10, GREY);
    this.msg.draw(screen);
  }
}
