import { drawMonsterSprite } from "../art/monsters";
import { SPECIES } from "../data/species";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import type { TouchAction } from "../engine/touchActions";
import { evolutionSummary, evolutionComparison } from "../game/evolutionGuide";
import type { Monster } from "../game/monster";
import { drawScreenHeader, wrapText, INK } from "../ui/widgets";
import { drawCareerStage, careerPodiumY } from "../ui/careerStage";

export interface EvolutionOptions {
  mon?: Monster;
  reduceEffects?: boolean;
  battleSpeed?: 1 | 2;
  onDecline?: () => void;
}
const PAGES = ["VALORI", "TIPI/ABILITÀ", "MOSSE"];

export class EvolutionScene implements Scene {
  readonly expandedViewport = true;
  readonly touchLayout = "growth" as const;
  private time = 0;
  private phase = 0;
  private phaseT = 0;
  private done = false;
  private review: boolean;
  private inspecting = false;
  private page = 0;
  private scroll = 0;
  private visibleLines = 7;

  constructor(private stack: SceneStack, private input: Input, private fromId: string, private toId: string, private onDone: () => void, private options: EvolutionOptions = {}) {
    this.review = !!options.mon;
  }
  private lines(): string[] {
    return this.options.mon ? evolutionComparison(this.options.mon, this.toId, this.page).flatMap((line) => wrapText(line, 35)) : [];
  }
  private finish(accepted: boolean): void {
    if (this.done) return;
    this.done = true;
    this.stack.pop();
    if (accepted) this.onDone();
    else this.options.onDecline?.();
  }
  private accept(): void { this.review = false; this.phaseT = 0; audio.confirm(); }
  get touchActions(): readonly TouchAction[] | undefined {
    if (this.done) return undefined;
    const review = this.review, inspecting = this.inspecting, page = this.page, phase = this.phase;
    const action = (label: string, run: () => void, disabled = false): TouchAction => ({ label, disabled, run: () => {
      if (disabled || this.done || this.review !== review || this.inspecting !== inspecting || this.page !== page || this.phase !== phase || this.stack.top !== this) return;
      this.input.reset(); run();
    } });
    if (!this.review) return [action(this.phase === 3 ? "CONTINUA" : "SALTA", () => {
      if (this.phase === 3) this.finish(true);
      else { this.phase = 3; this.phaseT = 0; audio.evolveJingle(); }
    })];
    if (this.inspecting) return [
      ...PAGES.map((label, page) => action(label, () => { this.page = page; this.scroll = 0; })),
      action("SCORRI", () => { this.scroll = this.scroll < this.lines().length - this.visibleLines ? this.scroll + 1 : 0; }, this.lines().length <= this.visibleLines),
      action("EVOLVI", () => this.accept()), action("INDIETRO", () => { this.inspecting = false; })];
    return [action("EVOLVI", () => this.accept()), action("ORA NO", () => this.finish(false)), action("DETTAGLI", () => { this.inspecting = true; })];
  }
  update(dt: number): void {
    if (this.done) return;
    if (!this.options.reduceEffects) this.time += dt;
    if (this.review) {
      if (this.input.wasPressed("b")) { audio.cancel(); if (this.inspecting) this.inspecting = false; else this.finish(false); return; }
      if (this.input.wasPressed("start")) { this.inspecting = !this.inspecting; return; }
      const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
      if (this.inspecting && dir) { this.page = (this.page + dir + PAGES.length) % PAGES.length; this.scroll = 0; audio.cursor(); return; }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      if (this.inspecting && delta) { this.scroll = Math.max(0, Math.min(Math.max(0, this.lines().length - this.visibleLines), this.scroll + delta)); audio.cursor(); return; }
      if (this.input.wasPressed("a")) this.accept();
      return;
    }
    this.phaseT += dt * (this.options.battleSpeed ?? 1);
    if (this.phase === 3) {
      if (this.phaseT >= 1.1 || this.input.wasPressed("a") || this.input.wasPressed("b")) this.finish(true);
      return;
    }
    const durations = this.options.reduceEffects ? [0.35, 0.65, 0.25] : [0.7, 1.8, 0.35];
    if ((this.phase >= 1 && this.input.wasPressed("a")) || this.phaseT >= durations[this.phase]) {
      this.phase = this.input.wasPressed("a") ? 3 : this.phase + 1;
      this.phaseT = 0;
      if (this.phase === 3) audio.evolveJingle();
    }
  }
  draw(screen: Screen): void {
    const frame = this.review ? 0 : this.options.reduceEffects ? (this.phase >= 2 ? 3 : 0) : this.phase;
    drawCareerStage(screen, frame);
    drawScreenHeader(screen, this.review ? "SCELTA DI CARRIERA" : "CAMBIO DI CASACCA");
    if (this.review) { this.drawReview(screen); return; }
    const showNew = this.phase >= 2 || (this.phase === 1 && this.phaseT > 0.9);
    const id = showNew ? this.toId : this.fromId;
    const bottom = careerPodiumY(screen.height), size = screen.height > 180 ? Math.min(144, bottom - 55) : 100;
    screen.rect(6, 22, 228, 12, "#101b32");
    screen.textCenter(this.phase === 3 ? SPECIES[this.toId].name : "CAMBIA IL SIMBOLO. RESTANO I PP.", 120, 25, "#fff3cc");
    drawMonsterSprite(screen, id, 120 - size / 2, bottom - size * .89, size, size * .89, { animationTime: this.options.reduceEffects ? 0 : this.time });
    const y = screen.height - (screen.height > 180 ? 97 : 48);
    screen.panel(6, y, 228, screen.height > 180 ? 76 : 29, "card");
    const quotes: Record<string, string> = { giorgiagon: "IL LEGGIO È CRESCIUTO.\nLA DOMANDA È RIMASTA.", schleinix: "LA RIUNIONE È APERTA.\nIL SIMBOLO È GIÀ CAMBIATO.", renzilla: "NUOVA SIGLA.\nSTESSO NUMERO DI TELEFONO." };
    const quote = this.phase === 3 ? (quotes[this.toId] ?? "STESSO TESSERATO.\nNUOVA CARTA INTESTATA.") : "IL SIMBOLO CAMBIA.\nI PP NON SI RICARICANO.";
    quote.split("\n").forEach((line, i) => screen.text(line, 14, y + 7 + i * 9, INK));
    if (screen.height > 180 && this.phase === 3 && this.options.mon) {
      const next = evolutionSummary(this.options.mon, this.toId)[3];
      wrapText(next, 35).forEach((line, i) => screen.text(line, 14, y + 36 + i * 10, "#26745d"));
    }
    screen.textCenter(this.phase === 3 ? "LA CARRIERA CONTINUA" : "A: SALTA L'ANIMAZIONE", 120, screen.height - 11, "#fff3cc");
  }
  private drawReview(screen: Screen): void {
    const extra = screen.height - 180, heroH = 57 + Math.round(extra * .55), panelY = 82 + Math.round(extra * .55), panelH = screen.height - panelY - 15;
    for (const [id, x] of [[this.fromId, 8], [this.toId, 128]] as const) {
      screen.rect(x, 21, 104, heroH, "#101b32");
      screen.frame(x, 21, 104, heroH, "#d3a745");
      screen.textCenter(SPECIES[id].name, x + 52, 25, "#fff3cc");
      const size = Math.min(96, heroH - 20);
      drawMonsterSprite(screen, id, x + (104 - size) / 2, 36, size, heroH - 20);
    }
    screen.panel(6, panelY, 228, panelH, "card");
    if (!this.inspecting && this.options.mon) {
      evolutionSummary(this.options.mon, this.toId).forEach((line, i) => wrapText(line, 35).slice(0, 2).forEach((part, j) => screen.text(part, 14, panelY + 7 + i * (panelH - 11) / 4 + j * 8, INK)));
      screen.text(screen.height > 180 ? "PUOI RINVIARE SENZA PERDITE" : "A: EVOLVI  B: ORA NO  MENU: DATI", 8, screen.height - 11, "#fff3cc");
      return;
    }
    screen.text(`◄ ${PAGES[this.page]} ►`, 14, panelY + 6, "#8c5b12");
    const lines = this.lines();
    this.visibleLines = Math.floor((panelH - 27) / 8);
    this.scroll = Math.min(this.scroll, Math.max(0, lines.length - this.visibleLines));
    lines.slice(this.scroll, this.scroll + this.visibleLines).forEach((line, i) => screen.text(line, 14, panelY + 15 + i * 8, INK));
    screen.textCenter(`TESTO ${this.scroll + 1}/${Math.max(1, lines.length - this.visibleLines + 1)}`, 120, screen.height - 26, "#59657d");
    screen.text(screen.height > 180 ? "PP E STATUS RESTANO CON TE" : "A: EVOLVI   B: CONFRONTO", 8, screen.height - 11, "#fff3cc");
  }
}
