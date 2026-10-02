import { MOVES } from "../data/moves";
import { sceneImage } from "../engine/assets";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { archivedMoves } from "../game/moveArchive";
import { speciesOf, type Monster } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader, Menu, INK, GREY } from "../ui/widgets";
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
  update(): void {
    this.refresh();
    if (this.input.wasPressed("b")) { audio.cancel(); this.stack.pop(); return; }
    if (!this.ids.length) return;
    if (this.menu.update(this.input) !== "select") return;
    const id = this.ids[this.menu.index];
    this.stack.push(new TeachScene(this.stack, this.input, this.mon, id, () => { saveGame(this.state); this.refresh(); }, { source: "archive" }));
  }
  draw(screen: Screen): void {
    screen.clear("#101b32"); const bg = sceneImage("ui:recall", "ui/recall.png"); if (bg) screen.image(bg);
    drawScreenHeader(screen, "ARCHIVIO DELLE LINEE");
    screen.panel(6, 23, 228, 40, "card");
    screen.text(`${speciesOf(this.mon).name} L${this.mon.level}`, 14, 29, INK);
    screen.text("GIÀ DISPONIBILI A QUESTO LIVELLO.", 14, 42, GREY);
    if (this.ids.length) this.menu.draw(screen, 6, 69, 228, 15, 4);
    else { screen.panel(6, 69, 228, 64, "card"); screen.text("NESSUNA LINEA DA RIPRENDERE.", 14, 88, INK); }
    screen.rect(4, 143, 232, 21, "#101b32");
    screen.rect(4, 167, 232, 12, "#101b32");
    screen.text("GRATIS. CONFRONTO PRIMA DI CAMBIARE.", 8, 144, "#fff3cc");
    screen.text("IL TRITACARTE È STACCATO.", 8, 152, "#b7cedc");
    screen.text("A:CONFRONTA B:SQUADRA", 8, 169, "#fff3cc");
  }
}
