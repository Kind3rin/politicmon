import { currentQuest, QUESTS } from "../data/quests";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { dailyQuestStatus, type DailyQuestStatus } from "../game/dailyquests";
import type { GameState } from "../game/state";
import { wrapText, GREY, INK, PAPER } from "../ui/widgets";

export class QuestScene implements Scene {
  private index = 0;
  private daily: DailyQuestStatus[];

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    const firstOpen = QUESTS.findIndex((q) => !q.isDone(this.state));
    this.index = firstOpen === -1 ? 0 : firstOpen;
    // MISSIONI DEL GIORNO: 3 dal pool, deterministiche dalla data (reset al
    // primo accesso del giorno, dentro dailyQuestStatus).
    this.daily = dailyQuestStatus(this.state);
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
    screen.panel(4, 14, VIEW_W - 8, 32);
    if (current) {
      screen.text(clip(current.title, 36), 12, 20, INK);
      const lines = wrapText(current.step, 34);
      screen.text(lines[0] ?? "", 12, 32, INK);
    } else {
      screen.text("CAMPAGNA COMPLETATA!", 12, 20, INK);
      screen.text("ORA RIEMPI IL POLITICDEX.", 12, 32, INK);
    }

    // MISSIONI DEL GIORNO: 3 micro-obiettivi con progresso e ricompensa.
    screen.text("DEL GIORNO", 8, 52, "#7ad858");
    screen.textRight("RESET A MEZZANOTTE", VIEW_W - 8, 52, GREY);
    screen.panel(4, 60, VIEW_W - 8, 40);
    for (let i = 0; i < this.daily.length; i += 1) {
      const d = this.daily[i];
      const y = 66 + i * 11;
      screen.text(d.done ? "★" : "•", 10, y, d.done ? "#3f9a5c" : GREY);
      screen.text(clip(d.quest.title, 24), 19, y, d.done ? GREY : INK);
      screen.textRight(
        d.done ? `+${d.quest.reward}€` : `${d.count}/${d.quest.target}`,
        VIEW_W - 12, y,
        d.done ? "#3f9a5c" : "#b04848"
      );
    }

    screen.text("PERCORSO CAMPAGNA", 8, 106, PAPER);
    screen.panel(4, 114, VIEW_W - 8, VIEW_H - 126);
    // Finestra scorrevole: mostra fino a 5 voci attorno all'indice.
    const rows = 5;
    const start = Math.max(0, Math.min(this.index - 2, QUESTS.length - rows));
    for (let r = 0; r < rows && start + r < QUESTS.length; r += 1) {
      const i = start + r;
      const quest = QUESTS[i];
      const done = quest.isDone(this.state);
      const y = 121 + r * 9;
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
      screen.text("▼", VIEW_W - 16, VIEW_H - 20, GREY);
    }
    if (start > 0) {
      screen.text("▲", VIEW_W - 16, 116, GREY);
    }
    screen.text("SU/GIU: LISTA   A/B: CHIUDI", 8, VIEW_H - 9, GREY);
  }
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
