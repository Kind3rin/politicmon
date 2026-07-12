import { ACHIEVEMENTS, isUnlocked, unlockedCount } from "../game/achievements";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import { drawScreenHeader, wrapText, GREY, INK } from "../ui/widgets";

// Schermata TRAGUARDI (menu pausa): elenco satirico degli obiettivi, con
// dettaglio della voce selezionata e contatore di completamento.
export class AchievementsScene implements Scene {
  private index = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(): void {
    if (this.input.wasPressed("b") || this.input.wasPressed("a")) {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (this.input.wasPressed("up")) {
      this.index = (this.index + ACHIEVEMENTS.length - 1) % ACHIEVEMENTS.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % ACHIEVEMENTS.length;
      audio.cursor();
    }
  }

  draw(screen: Screen): void {
    screen.clear("#eee8f2");
    const done = unlockedCount(this.state);
    drawScreenHeader(screen, "TRAGUARDI", `${done}/${ACHIEVEMENTS.length}`);

    // Dettaglio della voce selezionata.
    const sel = ACHIEVEMENTS[this.index];
    const unlocked = isUnlocked(this.state, sel.id);
    screen.panel(4, 19, VIEW_W - 8, 50, "card");
    // Clip del nome per non invadere la ricompensa a destra (bordo sx ~184).
    screen.textFit(unlocked ? sel.name : "???", 12, 24, 168, unlocked ? INK : GREY);
    screen.textRight(`+${sel.reward}€`, VIEW_W - 14, 24, unlocked ? "#3f9a5c" : GREY);
    const lines = wrapText(sel.desc, 34);
    for (let i = 0; i < Math.min(2, lines.length); i += 1) {
      screen.text(lines[i], 12, 38 + i * 10, unlocked ? INK : "#7a7a92");
    }
    screen.text(unlocked ? "SBLOCCATO!" : "DA SBLOCCARE", 12, 56, unlocked ? "#3f9a5c" : GREY);

    // Lista scorrevole (fino a 8 righe attorno all'indice).
    screen.panel(4, 72, VIEW_W - 8, VIEW_H - 76, "card");
    const rows = 8;
    const start = Math.max(0, Math.min(this.index - 4, ACHIEVEMENTS.length - rows));
    for (let r = 0; r < rows && start + r < ACHIEVEMENTS.length; r += 1) {
      const i = start + r;
      const a = ACHIEVEMENTS[i];
      const ok = isUnlocked(this.state, a.id);
      const y = 78 + r * 9;
      if (i === this.index) {
        screen.rect(8, y - 2, VIEW_W - 16, 9, "#fff0bd");
        screen.text("►", 9, y, "#8c5b12");
      }
      screen.text(ok ? "★" : "-", 18, y, ok ? "#e8c84a" : GREY);
      const title = ok ? clip(a.name, 28) : "?????????";
      screen.text(title, 28, y, ok ? INK : "#555068");
    }
    if (start + rows < ACHIEVEMENTS.length) {
      screen.text("▼", VIEW_W - 16, VIEW_H - 12, GREY);
    }
    if (start > 0) {
      screen.text("▲", VIEW_W - 16, 76, GREY);
    }
  }
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
