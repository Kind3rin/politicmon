import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import type { ElectionResult } from "../game/election";
import { drawScreenHeader } from "../ui/widgets";

const LABELS = { nord: "NORD", centro: "CENTRO", sud: "SUD", isole: "ISOLE", feed: "FEED" } as const;

export class ElectionResultsScene implements Scene {
  readonly transparent = false;
  private revealed = 0;
  private elapsed = 0;

  constructor(private stack: SceneStack, private input: Input, private result: ElectionResult, private onDone: () => void) {}

  update(dt: number): void {
    this.elapsed += dt;
    if (this.revealed < 5 && this.elapsed >= 0.65) {
      this.elapsed = 0; this.revealed += 1; audio.confirm();
    }
    if (!this.input.wasPressed("a") && !this.input.wasPressed("b")) return;
    if (this.revealed < 5) { this.revealed = 5; audio.confirm(); return; }
    this.stack.pop(); this.onDone();
  }

  draw(screen: Screen): void {
    screen.clear("#10141f");
    drawScreenHeader(screen, "ELECTION NIGHT", `${this.result.seats}/5 SEGGI`);
    screen.text("COLLEGIO   LOCALE  RICONTO  TOTALE", 8, 25, "#ffe38a");
    this.result.districts.forEach((district, index) => {
      const y = 42 + index * 20;
      screen.panel(7, y - 4, 226, 18, "card");
      if (index >= this.revealed) {
        screen.text("SCRUTINIO IN CORSO...", 14, y, "#7b849d");
        return;
      }
      screen.text(LABELS[district.id], 13, y, "#10141f");
      screen.textRight(`${district.beforeRecount}%`, 117, y, "#26745d");
      const recount = district.recounted ? (this.result.bossWon ? "+1" : "-1") : "—";
      screen.textRight(recount, 153, y, district.recounted ? "#a46b12" : "#7b849d");
      screen.textRight(`${district.afterRecount}% ${district.seat ? "VINTO" : "PERSO"}`, 226, y, district.seat ? "#26745d" : "#a0443e");
    });
    if (this.revealed === 5) {
      const won = this.result.ending === "government";
      screen.text(won ? "MAGGIORANZA: GOVERNO" : "MINORANZA: OPPOSIZIONE", 12, 148, won ? "#63c99f" : "#ff9f95");
      screen.text("A CONTINUA", 12, 163, "#ffe38a");
    } else screen.text("A MOSTRA TUTTO", 12, 163, "#ffe38a");
  }
}
