import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { TYPE_COLORS, TYPE_ORDER, typeRelations, type PolType } from "../data/poltypes";
import { GREY, PAPER } from "../ui/widgets";

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
    const w = label.length * 6 + 6;
    screen.rect(x, y, w, 11, TYPE_COLORS[label]);
    screen.text(label, x + 3, y + 2, PAPER);
    return w;
  }

  draw(screen: Screen): void {
    screen.clear("#222a3a");
    screen.text("GUIDA TIPI", 8, 5, PAPER);
    screen.text("Il tipo conta: scegli e leggi i match.", 8, 14, GREY);

    // Colonna sinistra: lista degli 8 tipi (attaccante selezionato).
    for (let i = 0; i < TYPE_ORDER.length; i += 1) {
      const t = TYPE_ORDER[i];
      const y = 26 + i * 16;
      const sel = i === this.index;
      if (sel) {
        screen.rect(4, y - 1, 96, 14, "#3a4a64");
        screen.frame(4, y - 1, 96, 14, "#f0c040");
      }
      this.chip(screen, t, 8, y);
    }

    // Pannello destro: relazioni del tipo selezionato.
    const attacker = TYPE_ORDER[this.index];
    const rel = typeRelations(attacker);
    const px = 106;
    screen.panel(px, 24, VIEW_W - px - 4, VIEW_H - 24 - 22);
    screen.text("FORTE CONTRO:", px + 6, 30, "#7ad858");
    let cx = px + 6;
    let cy = 40;
    if (rel.strong.length === 0) {
      screen.text("nessuno", cx, cy, GREY);
    } else {
      for (const t of rel.strong) {
        if (cx + t.length * 6 + 8 > VIEW_W - 8) {
          cx = px + 6;
          cy += 13;
        }
        cx += this.chip(screen, t, cx, cy) + 3;
      }
    }
    const wy = cy + 18;
    screen.text("DEBOLE CONTRO:", px + 6, wy, "#d86868");
    let dx = px + 6;
    let dy = wy + 10;
    if (rel.weak.length === 0) {
      screen.text("nessuno", dx, dy, GREY);
    } else {
      for (const t of rel.weak) {
        if (dx + t.length * 6 + 8 > VIEW_W - 8) {
          dx = px + 6;
          dy += 13;
        }
        dx += this.chip(screen, t, dx, dy) + 3;
      }
    }

    screen.text("In lotta: ▲ super  ▼ poco efficace.", 8, VIEW_H - 18, GREY);
    screen.text("Su/Giù: scegli   A/B: chiudi", 8, VIEW_H - 9, GREY);
  }
}
