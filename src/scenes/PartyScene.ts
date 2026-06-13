import { MONSTER_ART } from "../art/monsters";
import { MOVES, STATUS_LABELS } from "../data/moves";
import { TYPE_COLORS } from "../data/poltypes";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { speciesOf, statsOf, type Monster } from "../game/monster";
import type { GameState } from "../game/state";
import { drawHpBar, wrapText, GREY, INK, PAPER } from "../ui/widgets";

export interface PartyOptions {
  mode: "view" | "battle-switch" | "forced-switch" | "use-item";
  currentUid?: string;
  title?: string; // intestazione personalizzata (es. nomina di un ministro)
  onChoose?: (mon: Monster) => void;
}

export class PartyScene implements Scene {
  private index = 0;
  private summary: Monster | null = null;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: PartyOptions
  ) {}

  update(): void {
    const party = this.state.party;
    if (this.summary) {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) {
        audio.cancel();
        this.summary = null;
      }
      return;
    }
    if (this.input.wasPressed("up")) {
      this.index = (this.index + party.length - 1) % party.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % party.length;
      audio.cursor();
    }
    if (this.input.wasPressed("b") && this.opts.mode !== "forced-switch") {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (this.input.wasPressed("a")) {
      const mon = party[this.index];
      if (!mon) {
        return;
      }
      if (this.opts.mode === "view") {
        audio.confirm();
        this.summary = mon;
        return;
      }
      if (this.opts.mode === "battle-switch" || this.opts.mode === "forced-switch") {
        if (mon.hp <= 0 || mon.uid === this.opts.currentUid) {
          audio.cancel();
          return;
        }
        audio.confirm();
        this.stack.pop();
        this.opts.onChoose?.(mon);
        return;
      }
      if (this.opts.mode === "use-item") {
        audio.confirm();
        this.stack.pop();
        this.opts.onChoose?.(mon);
      }
    }
  }

  draw(screen: Screen): void {
    screen.clear("#2e3e52");
    if (this.summary) {
      this.drawSummary(screen, this.summary);
      return;
    }
    screen.text(
      this.opts.title ??
        (this.opts.mode === "forced-switch"
          ? "Scegli il prossimo candidato!"
          : this.opts.mode === "use-item"
            ? "Su chi lo usi?"
            : "LA TUA SQUADRA"),
      8, 5, PAPER
    );
    const party = this.state.party;
    for (let i = 0; i < party.length; i += 1) {
      const mon = party[i];
      const y = 16 + i * 23;
      const selected = i === this.index;
      screen.rect(4, y, VIEW_W - 8, 22, selected ? "#f8f8f0" : "#3a4c64");
      if (selected) {
        screen.frame(4, y, VIEW_W - 8, 22, INK);
      }
      const art = MONSTER_ART[mon.speciesId];
      if (art) {
        const h = art.art.length;
        screen.sprite(`party:${mon.speciesId}`, art, 8, y + 21 - Math.min(21, h) - (h > 21 ? 0 : 1), {
          scale: 1
        });
      }
      const ink = selected ? INK : PAPER;
      screen.text(speciesOf(mon).name, 36, y + 3, ink);
      screen.textRight(`L${mon.level}`, VIEW_W - 64, y + 3, ink);
      drawHpBar(screen, 50, y + 13, 70, mon.hp, statsOf(mon).hp);
      screen.textRight(`${mon.hp}/${statsOf(mon).hp}`, VIEW_W - 14, y + 13, ink);
      if (mon.status) {
        screen.rect(VIEW_W - 32, y + 2, 17, 9, "#b04848");
        screen.text(STATUS_LABELS[mon.status], VIEW_W - 31, y + 3, PAPER);
      }
      if (mon.hp <= 0) {
        screen.text("KO", VIEW_W - 56, y + 3, "#d04848");
      }
    }
    screen.text(this.opts.mode === "view" ? "A: dettagli  B: chiudi" : "A: scegli", 8, VIEW_H - 10, GREY);
  }

  private drawSummary(screen: Screen, mon: Monster): void {
    const species = speciesOf(mon);
    screen.clear("#2e3e52");
    screen.panel(4, 4, VIEW_W - 8, VIEW_H - 8);
    const art = MONSTER_ART[mon.speciesId];
    if (art) {
      const h = art.art.length * 2;
      screen.sprite(`summary:${mon.speciesId}`, art, 14, 62 - h, { scale: 2 });
    }
    screen.text(species.name, 70, 12, INK);
    screen.text(`L${mon.level}  ${species.category}`, 70, 22, GREY);
    let tx = 70;
    for (const type of species.types) {
      screen.rect(tx, 32, type.length * 6 + 6, 11, TYPE_COLORS[type]);
      screen.text(type, tx + 3, 34, PAPER);
      tx += type.length * 6 + 10;
    }
    const stats = statsOf(mon);
    const rows: Array<[string, number]> = [
      ["PV", stats.hp], ["GRINTA", stats.atk], ["FACCIA TOSTA", stats.def],
      ["RETORICA", stats.spc], ["OPPORTUN.", stats.spd]
    ];
    for (let i = 0; i < rows.length; i += 1) {
      screen.text(rows[i][0], 70, 48 + i * 10, INK);
      screen.textRight(String(rows[i][1]), 226, 48 + i * 10, INK);
    }
    screen.text("MOSSE:", 14, 72, GREY);
    for (let i = 0; i < mon.moves.length; i += 1) {
      const slot = mon.moves[i];
      const move = MOVES[slot.id];
      screen.text(move.name, 14, 84 + i * 10, INK);
      screen.textRight(`PP ${slot.pp}/${move.pp}`, 226, 84 + i * 10, GREY);
    }
    const dexLines = wrapText(species.dexLine, 36);
    for (let i = 0; i < Math.min(2, dexLines.length); i += 1) {
      screen.text(dexLines[i], 14, 128 + i * 10, GREY);
    }
    screen.text("A/B: indietro", 14, VIEW_H - 18, GREY);
  }
}
