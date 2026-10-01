import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import { TYPE_COLORS, typeLabelColor, TYPE_ORDER, typeRelations, typeIcon, type PolType } from "../data/poltypes";
import { drawScreenHeader, PAPER } from "../ui/widgets";

// GUIDA TIPI: spiega il sistema politico di efficacia (chi batte chi). Scegli
// un tipo attaccante col d-pad; vedi contro chi è FORTE e contro chi è DEBOLE.
export class TypesScene implements Scene {
  private index = 0;

  constructor(
    private stack: SceneStack,
    private input: Input
  ) {}

  update(): void {
    if (this.input.wasPressed("b") || this.input.wasPressed("a")) {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (this.input.wasPressed("up")) {
      this.index = (this.index + TYPE_ORDER.length - 1) % TYPE_ORDER.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % TYPE_ORDER.length;
      audio.cursor();
    }
  }

  private chip(screen: Screen, label: PolType, x: number, y: number): number {
    const icon = typeIcon(label);
    const iconW = icon ? 11 : 0;
    const w = label.length * 6 + 6 + iconW;
    screen.rect(x, y, w, 11, TYPE_COLORS[label]);
    if (icon) {
      screen.imageSprite(icon, x + 1, y + 1, { scaleX: 9 / icon.width, scaleY: 9 / icon.height });
    }
    screen.text(label, x + 3 + iconW, y + 2, typeLabelColor(label));
    return w;
  }

  draw(screen: Screen): void {
    screen.clear("#112037");
    drawScreenHeader(screen, "GUIDA AI TIPI", `${this.index + 1}/${TYPE_ORDER.length}`);
    screen.text("SCEGLI IL TIPO DELLA MOSSA", 8, 23, PAPER);
    for (let i = 0; i < TYPE_ORDER.length; i += 1) {
      const y = 36 + i * 14;
      const selected = i === this.index;
      if (selected) {
        screen.rect(4, y - 1, 97, 13, "#263a51");
        screen.frame(4, y - 1, 97, 13, "#e6b944");
      }
      this.chip(screen, TYPE_ORDER[i], 8, y);
    }
    const rel = typeRelations(TYPE_ORDER[this.index]);
    screen.panel(105, 34, 129, 121, "card");
    screen.text("DANNO x2", 112, 41, "#23654e");
    let y = 53;
    if (!rel.strong.length) screen.text("NESSUNO", 112, y, "#526279");
    for (const type of rel.strong) { this.chip(screen, type, 112, y); y += 13; }
    y = Math.max(82, y + 7);
    screen.text("DANNO x0,5", 112, y, "#8c3544");
    y += 12;
    if (!rel.weak.length) screen.text("NESSUNO", 112, y, "#526279");
    for (const type of rel.weak) { this.chip(screen, type, 112, y); y += 13; }
    screen.text("GLI ALTRI TIPI: DANNO x1", 8, 158, PAPER);
    screen.text("SU/GIU: SCEGLI   A/B: CHIUDI", 8, 170, "#a9b9ca");
  }
}
