import { MONSTER_ART } from "../art/monsters";
import { TYPE_COLORS } from "../data/poltypes";
import { DEX_ORDER, SPECIES, STARTERS } from "../data/species";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import { wrapText, GREY, INK, PAPER } from "../ui/widgets";

export class DexScene implements Scene {
  private index = 0;
  private detail = false;
  private scroll = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(): void {
    if (this.detail) {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) {
        audio.cancel();
        this.detail = false;
      }
      return;
    }
    if (this.input.wasPressed("up")) {
      this.index = (this.index + DEX_ORDER.length - 1) % DEX_ORDER.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % DEX_ORDER.length;
      audio.cursor();
    }
    const visibleRows = 10;
    if (this.index < this.scroll) {
      this.scroll = this.index;
    }
    if (this.index >= this.scroll + visibleRows) {
      this.scroll = this.index - visibleRows + 1;
    }
    if (this.input.wasPressed("b")) {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (this.input.wasPressed("a")) {
      const id = DEX_ORDER[this.index];
      if (this.state.dex[id]) {
        audio.confirm();
        this.detail = true;
      } else {
        audio.cancel();
      }
    }
  }

  draw(screen: Screen): void {
    screen.clear("#7a2828");
    if (this.detail) {
      this.drawDetail(screen);
      return;
    }
    const seen = Object.keys(this.state.dex).length;
    const caught = Object.values(this.state.dex).filter((v) => v === "caught").length;
    // Target REALISTICO: i 2 starter non scelti non sono ottenibili in un save,
    // quindi escluderli rende il Dex davvero completabile (e quindi motivante).
    const skipped = STARTERS.filter((s) => s !== this.state.starterId).length;
    const target = DEX_ORDER.length - skipped;
    screen.text("POLITICDEX", 8, 5, PAPER);
    screen.textRight(`VISTI ${seen}  ELETTI ${caught}/${target}`, VIEW_W - 8, 5, PAPER);
    screen.panel(4, 15, VIEW_W - 8, VIEW_H - 19);
    const visibleRows = 10;
    for (let row = 0; row < visibleRows; row += 1) {
      const i = this.scroll + row;
      if (i >= DEX_ORDER.length) {
        break;
      }
      const id = DEX_ORDER[i];
      const species = SPECIES[id];
      const status = this.state.dex[id];
      const y = 22 + row * 13;
      if (i === this.index) {
        screen.text("►", 10, y, INK);
      }
      screen.text(`N.${String(species.dexNum).padStart(2, "0")}`, 18, y, GREY);
      screen.text(status ? species.name : "??????????", 52, y, status ? INK : GREY);
      if (status === "caught") {
        screen.text("★", VIEW_W - 22, y, "#b04848");
      } else if (status === "seen") {
        screen.text("•", VIEW_W - 22, y, GREY);
      }
    }
    if (caught >= target) {
      screen.text("DEX COMPLETO! ORA SEI IL PALAZZO!", 12, VIEW_H - 12, "#e8c84a");
    }
  }

  private drawDetail(screen: Screen): void {
    const id = DEX_ORDER[this.index];
    const species = SPECIES[id];
    screen.clear("#7a2828");
    screen.panel(4, 4, VIEW_W - 8, VIEW_H - 8);
    const art = MONSTER_ART[id];
    if (art) {
      const h = art.art.length * 2;
      screen.sprite(`dex:${id}`, art, 16, 70 - h, { scale: 2 });
    }
    screen.text(`N.${String(species.dexNum).padStart(2, "0")} ${species.name}`, 76, 14, INK);
    screen.text(species.category, 76, 26, GREY);
    let tx = 76;
    for (const type of species.types) {
      screen.rect(tx, 38, type.length * 6 + 6, 11, TYPE_COLORS[type]);
      screen.text(type, tx + 3, 40, PAPER);
      tx += type.length * 6 + 10;
    }
    const lines = wrapText(species.dexLine, 35);
    for (let i = 0; i < lines.length && i < 6; i += 1) {
      screen.text(lines[i], 14, 80 + i * 11, INK);
    }
    if (this.state.dex[id] !== "caught") {
      screen.text("(Non ancora nella tua squadra)", 14, 138, GREY);
    }
    screen.text("A/B: indietro", 14, VIEW_H - 16, GREY);
  }
}
