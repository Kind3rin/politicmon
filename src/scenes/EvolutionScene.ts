import { drawMonsterSprite } from "../art/monsters";
import { SPECIES } from "../data/species";
import { sceneImage } from "../engine/assets";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { evolutionComparison } from "../game/evolutionGuide";
import type { Monster } from "../game/monster";
import { drawScreenHeader, wrapText, INK } from "../ui/widgets";

export interface EvolutionOptions {
  mon?: Monster;
  reduceEffects?: boolean;
  battleSpeed?: 1 | 2;
  onDecline?: () => void;
}
const PAGES = ["VALORI", "TIPI/ABILITÀ", "MOSSE"];

export class EvolutionScene implements Scene {
  private time = 0;
  private phase = 0;
  private phaseT = 0;
  private done = false;
  private review: boolean;
  private page = 0;
  private scroll = 0;

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
  update(dt: number): void {
    if (this.done) return;
    if (!this.options.reduceEffects) this.time += dt;
    if (this.review) {
      if (this.input.wasPressed("b")) { audio.cancel(); this.finish(false); return; }
      const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
      if (dir) { this.page = (this.page + dir + PAGES.length) % PAGES.length; this.scroll = 0; audio.cursor(); return; }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      if (delta) { this.scroll = Math.max(0, Math.min(Math.max(0, this.lines().length - 7), this.scroll + delta)); audio.cursor(); return; }
      if (this.input.wasPressed("a")) { this.review = false; this.phaseT = 0; audio.confirm(); }
      return;
    }
    if (this.phase === 3) {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) this.finish(true);
      return;
    }
    this.phaseT += dt * (this.options.battleSpeed ?? 1);
    const durations = this.options.reduceEffects ? [0.35, 0.65, 0.25] : [0.7, 1.8, 0.35];
    if ((this.phase >= 1 && this.input.wasPressed("a")) || this.phaseT >= durations[this.phase]) {
      this.phase = this.input.wasPressed("a") ? 3 : this.phase + 1;
      this.phaseT = 0;
      if (this.phase === 3) audio.evolveJingle();
    }
  }
  draw(screen: Screen): void {
    screen.clear("#101b32");
    const art = sceneImage("ui:evolution", "ui/evolution.png");
    if (art) screen.image(art, 0, 0, 240, 180);
    drawScreenHeader(screen, this.review ? "SCELTA DI CARRIERA" : "CAMBIO DI CASACCA");
    if (this.review) { this.drawReview(screen); return; }
    const showNew = this.phase >= 2 || (this.phase === 1 && this.phaseT > 0.9);
    const id = showNew ? this.toId : this.fromId;
    if (!this.options.reduceEffects && this.phase === 1) {
      for (let i = 0; i < 10; i++) {
        const x = Math.round(35 + i * 18 + Math.sin(this.time + i) * 4);
        const y = Math.round(120 - ((this.phaseT * 40 + i * 13) % 85));
        screen.rect(x, y, 3, 2, i % 2 ? "#e6b944" : "#72d4c0");
      }
    }
    screen.textCenter(this.phase === 3 ? SPECIES[this.toId].name : "LA LINEA CAMBIA. IL VERBALE RESTA.", 120, 25, "#fff3cc");
    drawMonsterSprite(screen, id, 70, 36, 100, 89, { animationTime: this.options.reduceEffects ? 0 : this.time });
    screen.panel(6, 132, 228, 29, "card");
    const quote = this.phase === 3 ? "Stesso tesserato. Nuova carta intestata." : "Si approva il nuovo simbolo. Il carattere era già quello.";
    wrapText(quote, 35).forEach((line, i) => screen.text(line, 14, 139 + i * 9, INK));
    screen.textCenter(this.phase === 3 ? "A/B: CONTINUA" : "A: SALTA L'ANIMAZIONE", 120, 169, "#fff3cc");
  }
  private drawReview(screen: Screen): void {
    for (const [id, x] of [[this.fromId, 8], [this.toId, 128]] as const) {
      screen.rect(x, 21, 104, 57, "#101b32");
      screen.frame(x, 21, 104, 57, "#d3a745");
      screen.textCenter(SPECIES[id].name, x + 52, 25, "#fff3cc");
      drawMonsterSprite(screen, id, x + 28, 36, 48, 37);
    }
    screen.panel(6, 82, 228, 83, "card");
    screen.text(`◄ ${PAGES[this.page]} ►`, 14, 88, "#8c5b12");
    const lines = this.lines();
    lines.slice(this.scroll, this.scroll + 7).forEach((line, i) => screen.text(line, 14, 97 + i * 8, INK));
    screen.textCenter(`SU/GIU: TESTO ${this.scroll + 1}/${Math.max(1, lines.length - 6)}`, 120, 154, "#59657d");
    screen.text("A: EVOLVI   B: ORA NO", 8, 169, "#fff3cc");
  }
}
