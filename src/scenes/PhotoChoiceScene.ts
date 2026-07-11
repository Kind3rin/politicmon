import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { resolvePhotoEvent, type PhotoChoice } from "../game/photoEvent";
import { saveGame, type GameState } from "../game/state";
import { drawChoicePreview, drawScreenHeader } from "../ui/widgets";
import { ALLY_CATALOG } from "../game/coalition";

export class PhotoChoiceScene implements Scene {
  readonly transparent = true;
  private index = 0;
  private resolved: string[] | null = null;
  private error = "";

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(): void {
    if (this.resolved) {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) this.stack.pop();
      return;
    }
    if (this.input.wasPressed("up") || this.input.wasPressed("down")) {
      this.index = 1 - this.index;
      audio.cursor();
    }
    if (this.input.wasPressed("b")) {
      this.stack.pop();
      return;
    }
    if (!this.input.wasPressed("a")) return;
    const choice: PhotoChoice = this.index === 0 ? "stringetevi" : "panoramica";
    const result = resolvePhotoEvent({ choice, coalition: this.state.coalition, election: this.state.election, money: this.state.money, flags: this.state.flags });
    if (!result.ok) {
      audio.cancel();
      this.error = ({ already_resolved: "SCELTA GIÀ SALVATA", candidates_unseen: "PARLA CON TUTTI I CANDIDATI", coalition_incomplete: "SERVONO ESATTAMENTE DUE NOMI", insufficient_funds: "FONDI INSUFFICIENTI: SERVONO 800€", territory_conflict: "AZIONE TERRITORIO GIÀ USATA" } as const)[result.error];
      return;
    }
    this.state.coalition = result.patch.coalition;
    this.state.election = result.patch.election;
    this.state.money = result.patch.money;
    Object.assign(this.state.flags, result.patch.flags);
    saveGame(this.state);
    audio.confirm();
    this.resolved = [
      `CONSENSO CENTRO +${result.patch.localDelta}.`,
      result.patch.strained.length ? "UNA LINEA ROSSA È ORA TESA." : "LA COALIZIONE RESTA OPERATIVA.",
      "LA FOTO È PRONTA. IL COSTO PURE."
    ];
  }

  draw(screen: Screen): void {
    screen.rect(0, 17, 240, 163, "#10141f");
    drawScreenHeader(screen, "FOTO INCOMPLETA", `FONDI ${this.state.money}€`);
    if (this.resolved) {
      screen.panel(8, 31, 224, 112, "dialog");
      this.resolved.forEach((line, i) => screen.text(line, 16, 48 + i * 22, i === 1 ? "#b77718" : "#10141f"));
      screen.text("A: CONTINUA", 16, 128, "#497b65");
      return;
    }
    drawChoicePreview(screen, 8, 29, 224, "STRINGETEVI", [
      { label: "CONSENSO CENTRO", value: "+4", tone: "good" },
      { label: "COSTO", value: "0€", tone: "neutral" },
      { label: "LINEA ROSSA", value: "NESSUNA", tone: "neutral" }
    ], this.index === 0);
    const photoRisk = this.state.coalition.members.some((member) =>
      ALLY_CATALOG[member.allyId].lineRedEventIndexes.includes(13)
    ) ? "1 ALLEATO SI TENDE" : "NESSUN ALLEATO";
    drawChoicePreview(screen, 8, 86, 224, "PANORAMICA", [
      { label: "CONSENSO CENTRO", value: "+12", tone: "good" },
      { label: "COSTO", value: "800€", tone: "bad" },
      { label: "LINEA ROSSA", value: photoRisk, tone: photoRisk === "NESSUN ALLEATO" ? "neutral" : "bad" }
    ], this.index === 1);
    screen.text(this.error || "SU/GIU SCEGLI · A OK · B ESCI", 12, 158, this.error ? "#ffb0a8" : "#ffe38a");
  }
}
