import { currentQuest, QUESTS } from "../data/quests";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import { wrapText, GREY, INK, PAPER } from "../ui/widgets";

export class QuestScene implements Scene {
  private index = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    const firstOpen = QUESTS.findIndex((q) => !q.isDone(this.state));
    this.index = firstOpen === -1 ? 0 : firstOpen;
  }

  update(): void {
    if (this.input.wasPressed("b") || this.input.wasPressed("a")) {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (this.input.wasPressed("up")) {
      this.index = (this.index + QUESTS.length - 1) % QUESTS.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % QUESTS.length;
      audio.cursor();
    }
  }

  draw(screen: Screen): void {
    screen.clear("#26344f");
    const current = currentQuest(this.state);
    screen.text("PROSSIMO PASSO", 8, 5, "#e8c84a");
    screen.panel(4, 16, VIEW_W - 8, 58);
    if (current) {
      screen.text(current.title, 12, 24, INK);
      const lines = wrapText(current.step, 34);
      for (let i = 0; i < Math.min(2, lines.length); i += 1) {
        screen.text(lines[i], 12, 38 + i * 10, INK);
      }
      screen.text("SU/GIU: LISTA   A/B: CHIUDI", 12, 62, GREY);
    } else {
      screen.text("CAMPAGNA COMPLETATA!", 12, 28, INK);
      screen.text("ORA RIEMPI IL POLITICDEX.", 12, 42, INK);
    }

    screen.text("PERCORSO CAMPAGNA", 8, 80, PAPER);
    screen.panel(4, 90, VIEW_W - 8, VIEW_H - 94);
    // Finestra scorrevole: mostra fino a 7 voci attorno all'indice.
    const rows = 7;
    const start = Math.max(0, Math.min(this.index - 3, QUESTS.length - rows));
    for (let r = 0; r < rows && start + r < QUESTS.length; r += 1) {
      const i = start + r;
      const quest = QUESTS[i];
      const done = quest.isDone(this.state);
      const y = 98 + r * 9;
      if (i === this.index) {
        screen.text("►", 9, y, INK);
      }
      const isCurrent = current?.id === quest.id;
      const marker = done ? "★" : isCurrent ? "!" : quest.side ? "+" : "•";
      const mColor = done ? "#3f9a5c" : isCurrent ? "#b04848" : quest.side ? "#6aa8ff" : GREY;
      screen.text(marker, 18, y, mColor);
      const title = quest.side ? `${clip(quest.title, 21)}` : clip(quest.title, 22);
      screen.text(title, 28, y, done ? GREY : isCurrent ? INK : "#485068");
    }
    if (start + rows < QUESTS.length) {
      screen.text("▼", VIEW_W - 16, VIEW_H - 12, GREY);
    }
    if (start > 0) {
      screen.text("▲", VIEW_W - 16, 96, GREY);
    }
  }
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
