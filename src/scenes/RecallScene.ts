import { MOVES } from "../data/moves";
import type { TouchAction } from "../engine/touchActions";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { archivedMoves } from "../game/moveArchive";
import { speciesOf, type Monster } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader, Menu } from "../ui/widgets";
import { TeachScene } from "./TeachScene";

export class RecallScene implements Scene {
  private menu = new Menu([]);
  private ids: string[] = [];
  constructor(private stack: SceneStack, private input: Input, private state: GameState, private mon: Monster) { this.refresh(); }
  private refresh(): void {
    this.ids = archivedMoves(this.mon);
    this.menu.items = this.ids.map((id) => ({ label: MOVES[id].name, rightLabel: `${MOVES[id].pp}PP` }));
    this.menu.index = Math.min(this.menu.index, Math.max(0, this.ids.length - 1));
  }
  private open(id: string): void {
    if (this.stack.top !== this || !archivedMoves(this.mon).includes(id)) return;
    this.input.reset(); audio.confirm();
    this.stack.push(new TeachScene(this.stack, this.input, this.mon, id, () => { saveGame(this.state); this.refresh(); }, { source: "archive" }));
  }
  get touchActions(): readonly TouchAction[] {
    this.refresh(); const page = Math.floor(this.menu.index / 4);
    const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled, run: () => {
      if (disabled || this.stack.top !== this || page !== Math.floor(this.menu.index / 4)) return;
      this.input.reset(); run();
    } });
    return [...Array.from({ length: 4 }, (_, i) => {
      const id = this.ids[page * 4 + i];
      return action(id ? MOVES[id].name : "—", id ? `${MOVES[id].type} · ${MOVES[id].pp} PP · gratis` : "Nessuna mossa", () => { if (id) this.open(id); }, !id);
    }), action("ALTRI", "Altre mosse disponibili", () => { this.menu.index = (page + 1) * 4 < this.ids.length ? (page + 1) * 4 : 0; }, this.ids.length <= 4),
      action("INDIETRO", "Torna alla squadra", () => this.stack.pop())];
  }
  update(): void {
    this.refresh();
    if (this.input.wasPressed("b")) { audio.cancel(); this.stack.pop(); return; }
    if (!this.ids.length) return;
    if (this.menu.update(this.input) !== "select") return;
    this.open(this.ids[this.menu.index]);
  }
  draw(screen: Screen): void {
    screen.clear("#101b32");
    drawScreenHeader(screen, `${speciesOf(this.mon).name} LV${this.mon.level}`, "ARCHIVIO");
    if (this.ids.length) this.menu.draw(screen, 6, 30, 228, 15, 4);
    else screen.text("NESSUNA MOSSA.", 14, 49, "#fff3cc");
    screen.text("TRITACARTE SPENTO.", 8, 152, "#b7cedc");
    screen.text("A:CONFRONTA B:SQUADRA", 8, 169, "#fff3cc");
  }
}
