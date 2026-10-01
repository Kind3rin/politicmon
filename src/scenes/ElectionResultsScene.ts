import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import type { ElectionResult } from "../game/election";
import { drawScreenHeader } from "../ui/widgets";
import { drawCampaignBackdrop } from "../ui/campaignArt";

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
    drawCampaignBackdrop(screen, "election");
    drawScreenHeader(screen, "NOTTE ELETTORALE", this.revealed === 5 ? `${this.result.seats}/5 SEGGI` : `${this.revealed}/5 APERTI`);
    for (let i = 0; i < 5; i++) {
      screen.rect(70 + i * 32, 25, 27, 8, i < this.revealed ? this.result.districts[i]?.seat ? "#55a889" : "#d76458" : "#9aa0b8");
    }
    screen.rect(7, 37, 226, 11, "#17243d");
    screen.text("COLLEGIO   LOCALE   ±   FINALE", 13, 39, "#fffaf0");
    this.result.districts.forEach((district, index) => {
      const y = 56 + index * 18;
      screen.panel(7, y - 4, 226, 18, "card");
      if (index >= this.revealed) {
        screen.text("SCRUTINIO IN CORSO", 14, y, "#5f6d8a");
        return;
      }
      screen.text(LABELS[district.id], 13, y, "#10141f");
      screen.textRight(`${district.beforeRecount}%`, 110, y, "#17243d");
      const recount = district.recounted ? signedRecount(district.afterRecount - district.beforeRecount) : "—";
      screen.textRight(recount, 146, y, "#70470e");
      screen.textRight(`${district.afterRecount}% ${district.seat ? "VINTO" : "PERSO"}`, 226, y, district.seat ? "#26745d" : "#a0443e");
    });
    if (this.revealed === 5) {
      const won = this.result.ending === "government";
      screen.rect(7, 145, 226, 13, "#17243d");
      screen.text(won ? "MAGGIORANZA: GOVERNO" : "MINORANZA: OPPOSIZIONE", 12, 148, won ? "#63c99f" : "#ff9f95");
      screen.text("A/B CONTINUA", 12, 167, "#ffe38a");
    } else screen.text("A/B MOSTRA TUTTO", 12, 167, "#ffe38a");
  }
}

const signedRecount = (value: number): string => value > 0 ? `+${value}` : String(value);
