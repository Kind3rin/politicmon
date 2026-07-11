import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { resolveDiplomacyChoice, type DiplomacyChoice } from "../game/diplomacyChapter";
import { saveGame, type GameState } from "../game/state";
import { drawChoicePreview, drawScreenHeader } from "../ui/widgets";

const CHOICES: readonly DiplomacyChoice[] = ["loyalty", "autonomy", "home"];

export class DiplomacyChoiceScene implements Scene {
  readonly transparent = false;
  private index: number;
  private error = "";
  private result: string[] | null = null;

  constructor(private stack: SceneStack, private input: Input, private state: GameState, initial: DiplomacyChoice) {
    this.index = Math.max(0, CHOICES.indexOf(initial));
  }

  update(): void {
    if (this.result) {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) this.stack.pop();
      return;
    }
    if (this.input.wasPressed("up")) { this.index = (this.index + 2) % 3; audio.cursor(); }
    if (this.input.wasPressed("down")) { this.index = (this.index + 1) % 3; audio.cursor(); }
    if (this.input.wasPressed("b")) { this.stack.pop(); return; }
    if (!this.input.wasPressed("a")) return;
    const resolved = resolveDiplomacyChoice({
      choice: CHOICES[this.index], coalition: this.state.coalition,
      money: this.state.money, sondaggi: this.state.sondaggi, flags: this.state.flags
    });
    if (!resolved.ok) {
      this.error = resolved.error === "insufficient_funds" ? "SERVONO 500€ PER RIPARARE" : "SCELTA GIÀ REGISTRATA";
      audio.cancel(); return;
    }
    this.state.coalition = resolved.patch.coalition;
    this.state.money = resolved.patch.money;
    this.state.sondaggi = resolved.patch.sondaggi;
    Object.assign(this.state.flags, resolved.patch.flags);
    saveGame(this.state); audio.confirm();
    const repair = resolved.patch.repairTarget ? `TOKEN RIPARA: ${resolved.patch.repairTarget.toUpperCase()}.` : "";
    this.result = ["SCELTA DIPLOMATICA REGISTRATA.", repair || `LINEE TESE ${resolved.patch.strained.length} · ROTTE ${resolved.patch.broken.length}.`, "LA TERRAZZA-STUDIO È APERTA."];
  }

  draw(screen: Screen): void {
    screen.clear("#10141f");
    drawScreenHeader(screen, "TEMPTATION DIPLOMACY", `FONDI ${this.state.money}€`);
    drawChoicePreview(screen, 8, 26, 224, "FEDELTÀ", [
      { label: "FONDI", value: "+800 BASE", tone: "good" }, { label: "RISCHIO", value: "LINEA ROSSA 12", tone: "bad" }
    ], this.index === 0);
    drawChoicePreview(screen, 8, 73, 224, "AUTONOMIA", [
      { label: "SE C'È UN TESO", value: "-500€ + RIPARA", tone: "bad" }, { label: "ALTRIMENTI", value: "+500 BASE", tone: "good" }
    ], this.index === 1);
    drawChoicePreview(screen, 8, 120, 224, "CONSENSO", [
      { label: "SONDAGGI", value: "+4", tone: "good" }, { label: "RISCHIO", value: "LINEA ROSSA 13", tone: "bad" }
    ], this.index === 2);
    screen.rect(0, 165, 240, 15, "#10141f");
    screen.text(this.error || "SU/GIU SCEGLI · A OK · B ESCI", 8, 169, this.error ? "#ffb0a8" : "#ffe38a");
    if (this.result) {
      screen.panel(10, 50, 220, 84, "dialog");
      this.result.forEach((line, i) => screen.text(line, 17, 68 + i * 19, i === 1 ? "#a36a16" : "#10141f"));
    }
  }
}
