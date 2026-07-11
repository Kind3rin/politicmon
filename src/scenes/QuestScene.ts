import { currentQuest, QUESTS } from "../data/quests";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { dailyQuestStatus, type DailyQuestStatus } from "../game/dailyquests";
import type { GameState } from "../game/state";
import { drawScreenHeader, wrapText, GREY, INK } from "../ui/widgets";

export class QuestScene implements Scene {
  private index = 0;
  private daily: DailyQuestStatus[];

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    // Apri sempre sulla missione PRINCIPALE che guida davvero HUD e freccia.
    // Una side quest incompleta precedente non deve rubare il focus e far
    // sembrare che la campagna sia tornata indietro.
    const guided = currentQuest(this.state);
    const guidedIndex = guided ? QUESTS.findIndex((quest) => quest.id === guided.id) : -1;
    this.index = guidedIndex === -1 ? 0 : guidedIndex;
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
    screen.clear("#e7ebf2");
    const current = currentQuest(this.state);
    drawScreenHeader(screen, "MISSIONI");
    screen.text("PROSSIMO PASSO", 8, 21, "#8c5b12");
    screen.panel(4, 30, VIEW_W - 8, 36, "card");
    if (current) {
      screen.text(clip(current.title, 36), 12, 34, INK);
      // Step INTERO su max 2 righe (prima mostrava solo lines[0]: la 2ª riga di
      // uno step lungo spariva). 37 char/riga stanno nel pannello.
      const lines = wrapText(current.step, 37);
      screen.text(lines[0] ?? "", 12, 44, INK);
      if (lines[1]) {
        screen.text(lines[1], 12, 53, INK);
      }
    } else {
      screen.text("CAMPAGNA COMPLETATA!", 12, 36, INK);
      screen.text("ORA RIEMPI IL POLITICDEX.", 12, 48, INK);
    }

    // MISSIONI DEL GIORNO: 3 micro-obiettivi con progresso e ricompensa.
    screen.text("DEL GIORNO", 8, 70, "#3f7d50");
    screen.textRight("RESET A MEZZANOTTE", VIEW_W - 8, 70, GREY);
    screen.panel(4, 78, VIEW_W - 8, 37, "card");
    for (let i = 0; i < this.daily.length; i += 1) {
      const d = this.daily[i];
      const y = 83 + i * 10;
      screen.text(d.done ? "★" : "•", 10, y, d.done ? "#3f9a5c" : GREY);
      screen.text(clip(d.quest.title, 24), 19, y, d.done ? GREY : INK);
      screen.textRight(
        d.done ? `+${d.quest.reward}€` : `${d.count}/${d.quest.target}`,
        VIEW_W - 12, y,
        d.done ? "#3f9a5c" : "#b04848"
      );
    }

    screen.text("PERCORSO CAMPAGNA", 8, 117, "#17243d");
    screen.panel(4, 125, VIEW_W - 8, 43, "card");
    // Finestra scorrevole: mostra fino a 5 voci attorno all'indice.
    const rows = 4;
    const start = Math.max(0, Math.min(this.index - 2, QUESTS.length - rows));
    for (let r = 0; r < rows && start + r < QUESTS.length; r += 1) {
      const i = start + r;
      const quest = QUESTS[i];
      const done = quest.isDone(this.state);
      const y = 130 + r * 9;
      if (i === this.index) {
        screen.rect(8, y - 2, VIEW_W - 16, 9, "#fff0bd");
        screen.text("►", 9, y, "#8c5b12");
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
      screen.text("▲", VIEW_W - 16, 127, GREY);
    }
    screen.text("SU/GIU: LISTA   A/B: CHIUDI", 8, VIEW_H - 9, GREY);
  }
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max + 1);
  const boundary = cut.lastIndexOf(" ");
  return (boundary >= Math.floor(max * 0.55) ? cut.slice(0, boundary) : value.slice(0, max)).trimEnd();
}
