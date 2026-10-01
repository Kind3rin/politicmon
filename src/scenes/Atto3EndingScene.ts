import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { applyAtto3EndingReward, deriveAtto3Ending, type Atto3EndingDef } from "../game/atto3Ending";
import { campaignEpilogue } from "../game/campaignEpilogue";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader } from "../ui/widgets";
import { drawEpilogueBackdrop, drawEpiloguePage, epiloguePages } from "../ui/epilogueArt";

export class Atto3EndingScene implements Scene {
  readonly transparent = false;
  private page = 0;
  private finished = false;
  private ending: Atto3EndingDef;
  private pages: { title: string; lines: string[] }[];

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private onFinish: () => void) {
    const ending = deriveAtto3Ending(state);
    if (!ending) throw new Error("Atto3EndingScene richiede un risultato elettorale");
    this.ending = ending;
    this.pages = campaignEpilogue(state, ending).flatMap(section => epiloguePages(section.paragraphs).map(lines => ({ title: section.title, lines })));
  }

  update(): void {
    if (this.finished) return;
    if (this.input.wasPressed("b")) { this.page = Math.max(0, this.page - 1); audio.cancel(); return; }
    if (!this.input.wasPressed("a")) return;
    if (this.page < this.pages.length - 1) { this.page++; audio.confirm(); return; }
    this.finished = true;
    if (applyAtto3EndingReward(this.state, this.ending)) audio.catchJingle();
    saveGame(this.state); this.stack.pop(); this.onFinish();
  }

  draw(screen: Screen): void {
    drawEpilogueBackdrop(screen, this.ending.id);
    drawScreenHeader(screen, this.pages[this.page].title, `${this.page + 1}/${this.pages.length}`);
    drawEpiloguePage(screen, this.pages[this.page].lines);
    screen.text(this.page < this.pages.length - 1 ? "A: AVANTI   B: INDIETRO" : "A: POSTGAME   B: INDIETRO", 12, 167, "#fffaf0");
  }
}
