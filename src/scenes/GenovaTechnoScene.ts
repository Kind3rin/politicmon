import type { Input, Button } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { newTechnoRun, pressTechno, TECHNO_BEAT_SECONDS, TECHNO_SEQUENCE, technoReward, tickTechno, type TechnoButton, type TechnoRun } from "../game/genovaTechno";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader } from "../ui/widgets";

const BUTTONS: readonly TechnoButton[] = ["up", "down", "left", "right", "a"];
const LABEL: Record<TechnoButton, string> = { up: "SU", down: "GIÙ", left: "SINISTRA", right: "DESTRA", a: "A" };

export class GenovaTechnoScene implements Scene {
  readonly transparent = false;
  private run: TechnoRun;
  private applied = false;
  private reward = technoReward(0);

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.run = newTechnoRun(state.reduceEffects);
  }

  update(dt: number): void {
    if (this.run.complete) {
      if (!this.applied) this.applyResult();
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) this.stack.pop();
      return;
    }
    let pressed: TechnoButton | null = null;
    for (const button of BUTTONS) if (this.input.wasPressed(button as Button)) { pressed = button; break; }
    if (pressed) {
      const hit = TECHNO_SEQUENCE[this.run.index] === pressed;
      this.run = pressTechno(this.run, pressed);
      hit ? audio.confirm() : audio.cancel();
    } else {
      const next = tickTechno(this.run, dt);
      if (next.misses > this.run.misses) audio.cancel();
      this.run = next;
    }
  }

  private applyResult(): void {
    this.applied = true;
    this.reward = technoReward(this.run.hits);
    if (!this.state.flags["genova-techno-complete"]) {
      this.state.flags["genova-techno-complete"] = true;
      this.state.flags[`genova-techno:${this.reward.grade.toLowerCase().replaceAll(" ", "-")}`] = true;
      this.state.money += this.reward.money;
      this.state.sondaggi = Math.min(100, this.state.sondaggi + this.reward.sondaggi);
      saveGame(this.state);
    }
  }

  draw(screen: Screen): void {
    screen.clear("#15102d");
    drawScreenHeader(screen, "GENOVA TECHNO", this.run.reducedMotion ? "SENZA TIMER" : `BEAT ${this.run.index + 1}/6`);
    if (this.run.complete) {
      screen.panel(18, 42, 204, 101, "dialog");
      screen.text(this.reward.grade, 70, 60, this.reward.grade === "FUORI TEMPO" ? "#a0443e" : "#26745d");
      screen.text(`BATTUTE GIUSTE ${this.run.hits}/6`, 42, 82, "#10141f");
      screen.text(`PREMIO ${this.reward.money}€`, 42, 99, "#26745d");
      screen.text(`SONDAGGI +${this.reward.sondaggi}`, 42, 116, "#26745d");
      screen.text("A: CONTINUA", 72, 153, "#ffe38a");
      return;
    }
    screen.text("SEGUI IL MAXISCHERMO", 46, 31, "#86e8e0");
    screen.panel(70, 53, 100, 76, "card");
    const expected = TECHNO_SEQUENCE[this.run.index];
    const cueScale = LABEL[expected].length > 5 ? 2 : 3;
    screen.textCenter(LABEL[expected], 120, 78, "#10141f", cueScale);
    if (!this.run.reducedMotion) {
      const width = Math.round(88 * this.run.remaining / TECHNO_BEAT_SECONDS);
      screen.rect(76, 116, 88, 5, "#d8d8d8");
      screen.rect(76, 116, width, 5, this.run.remaining < 0.4 ? "#d04848" : "#4abf9b");
    } else {
      screen.text("PREMI QUANDO VUOI", 65, 137, "#ffe38a");
    }
    screen.text(`GIUSTE ${this.run.hits} · ERRORI ${this.run.misses}`, 53, 157, "#fffaf0");
  }
}
