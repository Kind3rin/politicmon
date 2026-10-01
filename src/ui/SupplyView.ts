import { ITEMS } from "../data/items";
import { drawItemIcon, itemIconKey, itemIconPath } from "../art/items";
import { sceneImage } from "../engine/assets";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Screen } from "../engine/screen";
import type { GameState } from "../game/state";
import { SUPPLY_FILTERS, supplyMatches, supplyNotes } from "../game/supplyGuide";
import { Menu, drawScreenHeader, wrapText, INK } from "./widgets";
const GREY = "#59657d";

// Shared inventory/retail layout. Reading a page never invokes an item action.
export class SupplyView {
  menu = new Menu([]);
  ids: string[] = [];
  filter = 0;
  inspect = false;
  page = 0;
  scroll = 0;
  private signature = "";
  constructor(private state: GameState, private shop = false, private inBattle = false) {}
  get selected(): string | undefined { return this.ids[this.menu.index]; }
  sync(stock: string[], right: (id: string) => string): void {
    const ids = stock.filter((id) => supplyMatches(ITEMS[id], this.filter));
    const signature = JSON.stringify(ids.map((id) => [id, right(id)]));
    if (signature === this.signature) return;
    const selected = this.selected, index = this.menu.index;
    this.signature = signature; this.ids = ids;
    this.menu = new Menu(ids.map((id) => ({ label: ITEMS[id].name, rightLabel: right(id), iconId: itemIconKey(id), iconPath: itemIconPath(id) ?? undefined })));
    this.menu.index = Math.max(0, Math.min(ids.length - 1, selected && ids.includes(selected) ? ids.indexOf(selected) : index));
    this.scroll = 0;
  }
  lines(): string[] {
    const item = ITEMS[this.selected ?? ""];
    return item ? supplyNotes(this.state, item, this.page, this.inBattle).flatMap((note) => wrapText(note, 35)) : [];
  }
  update(input: Input): "select" | "cancel" | null {
    if (input.wasPressed("start") && this.selected) { this.inspect = !this.inspect; this.scroll = 0; audio.cursor(); return null; }
    const dir = input.wasPressed("right") ? 1 : input.wasPressed("left") ? -1 : 0;
    if (dir) {
      if (this.inspect) this.page = (this.page + dir + 3) % 3;
      else this.filter = (this.filter + dir + SUPPLY_FILTERS.length) % SUPPLY_FILTERS.length;
      this.scroll = 0; audio.cursor(); return null;
    }
    if (!this.inspect) return this.menu.update(input);
    if (input.wasPressed("b")) { this.inspect = false; audio.cancel(); return null; }
    const delta = input.wasPressed("down") ? 1 : input.wasPressed("up") ? -1 : 0;
    if (delta) { this.scroll = Math.max(0, Math.min(Math.max(0, this.lines().length - 8), this.scroll + delta)); audio.cursor(); }
    if (input.wasPressed("a")) return "select";
    return null;
  }
  draw(screen: Screen): void {
    screen.clear("#101b32");
    const id = this.shop ? "shop" : "bag", bg = sceneImage(`ui:${id}`, `ui/${id}.png`);
    if (bg) screen.image(bg);
    drawScreenHeader(screen, this.shop ? "DISCOUNT ELETTORALE" : "RISERVE DI CAMPAGNA", this.shop ? `${this.state.money}€` : this.inBattle ? "IN LOTTA" : "BORSA");
    const item = ITEMS[this.selected ?? ""];
    if (this.inspect && item) {
      screen.panel(6, 22, 228, 41, "card");
      wrapText(item.name, 27).forEach((line, i) => screen.text(line, 14, 28 + i * 9, INK));
      screen.text(`IN BORSA: ${this.state.bag[item.id] ?? 0}`, 14, 50, GREY);
      drawItemIcon(screen, item.id, 192, 26, 32);
      screen.panel(6, 67, 228, 98, "card");
      screen.text(["EFFETTO", "SQUADRA", "PREZZI"][this.page], 14, 73, "#8c5b12");
      const lines = this.lines(); this.scroll = Math.min(this.scroll, Math.max(0, lines.length - 8));
      lines.slice(this.scroll, this.scroll + 8).forEach((line, i) => screen.text(line, 14, 84 + i * 8, INK));
      screen.text(`SU/GIU: ${this.scroll + 1}/${Math.max(1, lines.length - 7)}`, 14, 154, GREY);
      screen.text(this.shop ? "A:ACQUISTA ◄►:PAGINA B:LISTA" : "A:USA ◄►:PAGINA B:LISTA", 8, 169, "#fff3cc");
      return;
    }
    screen.rect(6, 24, 228, 17, "#17243d");
    screen.text(this.shop ? "PREZZI PICCOLI. SCONTRINI LUNGHI." : "IL PROGRAMMA NON CURA I PV.", 14, 29, "#fff3cc");
    screen.rect(6, 45, 228, 13, "#17243d");
    screen.text(`◄ ${SUPPLY_FILTERS[this.filter]} ►`, 14, 48, "#ffe38a");
    screen.textRight(`${this.ids.length} VOCI`, 224, 48, "#fff3cc");
    if (item) {
      this.menu.draw(screen, 6, 60, 228, 14, 4);
      screen.panel(6, 133, 228, 32, "card");
      wrapText(item.desc, 35).slice(0, 2).forEach((line, i) => screen.text(line, 14, 138 + i * 9, INK));
    } else {
      screen.panel(6, 60, 228, 105, "card");
      screen.text("NESSUN OGGETTO IN QUESTA CATEGORIA.", 14, 87, INK);
      screen.text("◄►: CAMBIA FILTRO", 14, 101, GREY);
    }
    screen.text(this.shop ? "A:ACQUISTA START:INFO B:ESCI" : "A:USA START:INFO B:ESCI", 8, 169, "#fff3cc");
  }
}
