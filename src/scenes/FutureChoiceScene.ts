import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { resolveFutureChoice, type FutureChoice } from "../game/futureChapter";
import { saveGame, type GameState } from "../game/state";
import { drawChoicePreview, drawScreenHeader } from "../ui/widgets";

const CHOICES: readonly FutureChoice[] = ["alliance", "distance", "opposition"];

export class FutureChoiceScene implements Scene {
  readonly transparent = false;
  private index = 0;
  private error = "";
  private result: string[] | null = null;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(): void {
    if (this.result) {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) this.stack.pop();
      return;
    }
    if (this.input.wasPressed("up")) { this.index = (this.index + 2) % 3; audio.cursor(); }
    if (this.input.wasPressed("down")) { this.index = (this.index + 1) % 3; audio.cursor(); }
    if (this.input.wasPressed("b")) { this.stack.pop(); return; }
    if (!this.input.wasPressed("a")) return;
    const resolved = resolveFutureChoice({
      choice: CHOICES[this.index], coalition: this.state.coalition,
      money: this.state.money, sondaggi: this.state.sondaggi, flags: this.state.flags
    });
    if (!resolved.ok) {
      this.error = ({ already_resolved: "SCELTA GIÀ REGISTRATA", insufficient_funds: "SERVONO 800€", coalition_full: "COALIZIONE GIÀ PIENA" } as const)[resolved.error];
      audio.cancel();
      return;
    }
    this.state.coalition = resolved.patch.coalition;
    this.state.money = resolved.patch.money;
    this.state.sondaggi = resolved.patch.sondaggi;
    Object.assign(this.state.flags, resolved.patch.flags);
    saveGame(this.state);
    audio.confirm();
    const impact = resolved.patch.strained.length || resolved.patch.broken.length
      ? `LINEE ROSSE: ${resolved.patch.strained.length} TESE, ${resolved.patch.broken.length} ROTTE.`
      : "NESSUNA LINEA ROSSA COLPITA.";
    this.result = ["SCELTA REGISTRATA.", impact, "IL PALCO È APERTO. IL FUTURO, MENO."];
  }

  draw(screen: Screen): void {
    screen.clear("#10141f");
    drawScreenHeader(screen, "FUTURO ANTERIORE", `FONDI ${this.state.money}€`);
    drawChoicePreview(screen, 8, 26, 224, "ALLEANZA", [
      { label: "ALLEATO", value: "GENERORSO", tone: "good" },
      { label: "COSTO", value: "800€", tone: "bad" }
    ], this.index === 0);
    drawChoicePreview(screen, 8, 73, 224, "DISTANZA", [
      { label: "FONDI", value: "+600 BASE", tone: "good" },
      { label: "LINEE ROSSE", value: "NESSUNA", tone: "neutral" }
    ], this.index === 1);
    drawChoicePreview(screen, 8, 120, 224, "CONTRASTO", [
      { label: "SONDAGGI", value: "+2", tone: "good" },
      { label: "RISCHIO", value: "LINEA ROSSA 11", tone: "bad" }
    ], this.index === 2);
    screen.rect(0, 165, 240, 15, "#10141f");
    screen.text(this.error || "SU/GIU SCEGLI · A OK · B ESCI", 8, 169, this.error ? "#ffb0a8" : "#ffe38a");
    if (this.result) {
      screen.panel(12, 50, 216, 84, "dialog");
      this.result.forEach((line, i) => screen.text(line, 20, 69 + i * 18, i === 1 ? "#a36a16" : "#10141f"));
    }
  }
}
