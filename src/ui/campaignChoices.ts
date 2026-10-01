import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { CAMPAIGN_CHOICES, commitCampaignDecision, previewCampaignDecision, signed, type CampaignKind, type DecisionPreview } from "../game/campaignDecisions";
import { saveGame, type GameState } from "../game/state";
import { drawCampaignBackdrop } from "./campaignArt";
import { drawScreenHeader, wrapText } from "./widgets";

export class CampaignChoiceScene implements Scene {
  readonly transparent = false;
  private index: number;
  private reviewing = false;
  private page = 0;
  private result: DecisionPreview | null = null;
  private error = "";

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private kind: CampaignKind, initial = 0) {
    this.index = initial;
  }
  private dossier(preview: DecisionPreview): string[][] {
    const paragraphs = preview.ok ? [...preview.lines, ...(this.result ? [CAMPAIGN_CHOICES[this.kind].closing] : [])] : [preview.error];
    const pages: string[][] = [[]];
    for (const paragraph of paragraphs) {
      const lines = wrapText(paragraph.toUpperCase(), 34);
      if (pages.at(-1)!.length + lines.length > 9) pages.push([]);
      pages.at(-1)!.push(...lines);
    }
    return pages;
  }
  update(): void {
    const preview = this.result ?? previewCampaignDecision(this.state, this.kind, this.index);
    const pages = this.dossier(preview).length;
    if (this.reviewing || this.result) {
      if (this.input.wasPressed("left") || this.input.wasPressed("up")) { this.page = Math.max(0, this.page - 1); audio.cursor(); }
      if (this.input.wasPressed("right") || this.input.wasPressed("down")) { this.page = Math.min(pages - 1, this.page + 1); audio.cursor(); }
      if (this.input.wasPressed("b")) {
        if (this.result) this.stack.pop();
        else { this.reviewing = false; this.page = 0; audio.cancel(); }
        return;
      }
      if (!this.input.wasPressed("a")) return;
      if (this.page < pages - 1) { this.page++; audio.cursor(); return; }
      if (this.result) { this.stack.pop(); return; }
      const result = commitCampaignDecision(this.state, this.kind, this.index);
      if (!result.ok) { this.error = result.error; this.reviewing = false; this.page = 0; audio.cancel(); return; }
      this.result = result; this.page = 0; saveGame(this.state); audio.confirm(); return;
    }
    const count = CAMPAIGN_CHOICES[this.kind].keys.length;
    if (this.input.wasPressed("up") || this.input.wasPressed("left")) { this.index = (this.index + count - 1) % count; this.error = ""; audio.cursor(); }
    if (this.input.wasPressed("down") || this.input.wasPressed("right")) { this.index = (this.index + 1) % count; this.error = ""; audio.cursor(); }
    if (this.input.wasPressed("b")) { this.stack.pop(); return; }
    if (!this.input.wasPressed("a")) return;
    const fresh = previewCampaignDecision(this.state, this.kind, this.index);
    if (!fresh.ok) { this.error = fresh.error; audio.cancel(); return; }
    this.reviewing = true; this.page = 0; audio.cursor();
  }
  draw(screen: Screen): void {
    const chapter = CAMPAIGN_CHOICES[this.kind];
    const preview = this.result ?? previewCampaignDecision(this.state, this.kind, this.index);
    drawCampaignBackdrop(screen, this.kind);
    drawScreenHeader(screen, chapter.title, `${this.state.money}€`);
    if (this.reviewing || this.result) {
      const lines = this.dossier(preview), pages = lines.length;
      this.page = Math.min(this.page, pages - 1);
      screen.panel(8, 25, 224, 132, "card");
      screen.rect(14, 30, 212, 14, this.result ? "#55a889" : "#f4d34a");
      screen.text(this.result ? "SCELTA REGISTRATA" : chapter.labels[this.index], 18, 34, "#10141f");
      screen.textRight(`${this.page + 1}/${pages}`, 220, 34, "#10141f");
      lines[this.page].forEach((line, i) => screen.text(line, 18, 51 + i * 11, "#17243d"));
      const action = this.page < pages - 1 ? "A AVANTI" : this.result ? "A CONTINUA" : "A CONFERMA";
      screen.text(`${action} · ${this.result ? "B ESCI" : "B ANNULLA"} · ◄ ►`, 8, 167, "#ffe38a");
      return;
    }
    const width = Math.floor(224 / chapter.keys.length);
    chapter.labels.forEach((label, i) => {
      const selected = i === this.index;
      screen.panel(8 + i * width, 25, width - 3, 19, "card");
      if (selected) screen.rect(10 + i * width, 27, width - 7, 15, "#f4d34a");
      screen.textFit(label, 14 + i * width, 31, width - 14, "#10141f");
    });
    screen.panel(86, 51, 146, 106, "card");
    screen.text("EFFETTI REALI", 94, 60, "#17243d");
    if (preview.ok) {
      const stats = [`FONDI ${signed(preview.moneyDelta)}€`, `SONDAGGI ${signed(preview.pollsDelta)}`,
        ...(this.kind === "photo" ? [`CENTRO ${signed(preview.localDelta)}`] : []), `COESIONE ${signed(preview.cohesionDelta)}`];
      stats.forEach((line, i) => screen.text(line, 94, 77 + i * 13, "#17243d"));
      const note = preview.repairTarget ? "PATTO RIPARATO ORA" : preview.patch.broken.length
        ? `${preview.patch.broken.length} PATTI ROTTI` : preview.patch.strained.length ? `${preview.patch.strained.length} PATTI TESI` : "PATTI INVARIATI";
      screen.text(note, 94, 135, preview.cohesionDelta < 0 ? "#a0443e" : "#26745d");
    } else wrapText(preview.error, 21).forEach((line, i) => screen.text(line, 94, 80 + i * 12, "#a0443e"));
    screen.textFit(this.error || "A DOSSIER · B ESCI · ◄ ► SCEGLI", 8, 167, 224, this.error ? "#ffb0a8" : "#ffe38a");
  }
}
