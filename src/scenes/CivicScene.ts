import type { CivicChoice, CivicEvent } from "../data/civicEvents";
import { sceneImage } from "../engine/assets";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { TouchAction } from "../engine/touchActions";
import type { Screen } from "../engine/screen";
import { resolveCivicChoice } from "../game/civicChoices";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader, MessageBox, wrapText } from "../ui/widgets";
import { PROMISES } from "../game/morale";

export class CivicScene implements Scene {
  private index = 0;
  private msg = new MessageBox();
  constructor(private stack: SceneStack, private input: Input, private state: GameState, private event: CivicEvent) {}

  private preview(choice: CivicChoice): string {
    const delta = (value: number) => `${value >= 0 ? "+" : ""}${value}`;
    const commitment = choice.promise && !choice.fulfill ? ` ${PROMISES[choice.promise].steps}SF` : "";
    return `${choice.cost}€ S${delta(choice.polls)} F${delta(choice.fulfill ? 12 : choice.trust)} C${delta(choice.fulfill ? 6 : choice.cohesion)}${commitment}`;
  }

  get touchActions(): readonly TouchAction[] {
    if (this.msg.isOpen) return [{ label: "CONTINUA", hint: "Leggi le conseguenze", run: () => this.msg.advance() }];
    return [
      ...this.event.choices.map((choice, index) => ({ label: choice.label, hint: this.preview(choice), disabled: this.state.money < choice.cost, run: () => this.choose(index) })),
      { label: "ESCI", hint: "Nessuna scelta effettuata", run: () => this.stack.pop() }
    ];
  }

  private choose(index: number): void {
    if (this.msg.isOpen) return;
    this.index = index;
    const result = resolveCivicChoice(this.state, this.event.id, index);
    if (result.ok) { saveGame(this.state); audio.confirm(); }
    else audio.cancel();
    this.msg.show(result.lines, result.ok ? () => this.stack.pop() : undefined);
  }

  update(dt: number): void {
    if (this.msg.isOpen) { this.msg.update(dt, this.input); return; }
    if (this.input.wasPressed("b")) { this.stack.pop(); return; }
    if (this.input.wasPressed("up")) { this.index = (this.index + this.event.choices.length - 1) % this.event.choices.length; audio.cursor(); }
    if (this.input.wasPressed("down")) { this.index = (this.index + 1) % this.event.choices.length; audio.cursor(); }
    for (let index = 0; index < this.event.choices.length; index++) {
      if (this.input.tapInRect(6, 89 + index * 25, 228, 24)) { this.choose(index); return; }
    }
    if (this.input.wasPressed("a")) this.choose(this.index);
  }

  draw(screen: Screen): void {
    screen.clear("#10141f");
    drawScreenHeader(screen, this.event.title);
    screen.text(`FID ${this.state.morale.trust}  COE ${this.state.morale.cohesion}  ${this.state.money}€`, 8, 19, "#ffe38a");
    const art = sceneImage(`civic:${this.event.art}`, `ui/civic/${this.event.art}.png`);
    if (art) screen.image(art, 8, 32, 80, 45);
    else screen.rect(8, 32, 80, 45, "#3d5260");
    screen.text("A:SCEGLI B:ESCI", 8, 80, "#ffe38a");
    let y = 32;
    for (const line of wrapText(this.event.lines.join(" "), 23)) { screen.text(line, 96, y, "#e7ebf2"); y += 9; }
    this.event.choices.forEach((choice, index) => {
      const cy = 89 + index * 25;
      screen.panel(6, cy, 228, 24, "card");
      if (index === this.index) screen.frame(7, cy + 1, 226, 22, "#e6b944");
      screen.text(`${index === this.index ? "►" : " "} ${choice.label}`, 11, cy + 4, "#10141f");
      screen.text(this.preview(choice), 17, cy + 14, "#476c69");
    });
    screen.text("S:SOND F:FIDUCIA C:COESIONE", 8, 169, "#ffe38a");
    this.msg.draw(screen);
  }
}
