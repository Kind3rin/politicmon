import { MONSTER_ART, drawMonsterSprite } from "../art/monsters";
import { MOVES, STATUS_LABELS } from "../data/moves";
import { TYPE_COLORS } from "../data/poltypes";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { canLearnMove, nextEvolutionLevel, speciesOf, statsOf, type Monster } from "../game/monster";
import type { GameState } from "../game/state";
import { drawHpBar, wrapText, GREY, INK, PAPER } from "../ui/widgets";

export interface PartyOptions {
  mode: "view" | "battle-switch" | "forced-switch" | "use-item";
  currentUid?: string;
  title?: string; // intestazione personalizzata (es. nomina di un ministro)
  // Quando si sta usando una DIRETTIVA: marca chi può impararla (✓/✗ in lista).
  directiveMoveId?: string;
  onChoose?: (mon: Monster) => void;
}

export class PartyScene implements Scene {
  private index = 0;
  private summary: Monster | null = null;
  private moveFrom: number | null = null; // slot "preso" per lo scambio (mode view)

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
    // Riordino squadra (solo nel menu PARTY): START prende lo slot, START su un
    // altro lo scambia. Il primo della lista combatte per primo.
    if (this.opts.mode === "view" && this.input.wasPressed("start") && party.length > 1) {
      if (this.moveFrom === null) {
        this.moveFrom = this.index;
        audio.confirm();
      } else if (this.moveFrom === this.index) {
        this.moveFrom = null;
        audio.cancel();
      } else {
        const tmp = party[this.moveFrom];
        party[this.moveFrom] = party[this.index];
        party[this.index] = tmp;
        this.moveFrom = null;
        audio.confirm();
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
    if (this.input.wasPressed("b")) {
      // In modalità "sposta" B annulla lo spostamento invece di uscire.
      if (this.moveFrom !== null) {
        this.moveFrom = null;
        audio.cancel();
        return;
      }
      if (this.opts.mode !== "forced-switch") {
        audio.cancel();
        this.stack.pop();
        return;
      }
    }
    if (this.input.wasPressed("a")) {
      const mon = party[this.index];
      if (!mon) {
        return;
      }
      if (this.opts.mode === "view") {
        audio.confirm();
        this.moveFrom = null;
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
      const picked = i === this.moveFrom;
      screen.rect(4, y, VIEW_W - 8, 22, selected ? "#f8f8f0" : "#3a4c64");
      if (picked) {
        // Slot "preso" per lo scambio: cornice gialla evidente.
        screen.frame(4, y, VIEW_W - 8, 22, "#f0c040");
        screen.frame(5, y + 1, VIEW_W - 10, 20, "#f0c040");
      } else if (selected) {
        screen.frame(4, y, VIEW_W - 8, 22, this.moveFrom !== null ? "#f0c040" : INK);
      }
      // Mini-sprite nello slot lista (box 26x21, ancorato in basso).
      drawMonsterSprite(screen, mon.speciesId, MONSTER_ART[mon.speciesId], 6, y + 1, 26, 21);
      const ink = selected ? INK : PAPER;
      screen.text(speciesOf(mon).name, 36, y + 3, ink);
      screen.textRight(`L${mon.level}`, VIEW_W - 64, y + 3, ink);
      drawHpBar(screen, 50, y + 13, 70, mon.hp, statsOf(mon).hp);
      screen.textRight(`${mon.hp}/${statsOf(mon).hp}`, VIEW_W - 14, y + 13, ink);
      // Compatibilità con la direttiva in uso: chi può impararla è evidenziato.
      if (this.opts.directiveMoveId) {
        const ok = canLearnMove(mon, this.opts.directiveMoveId);
        const tag = ok ? "OK" : "NO";
        screen.rect(VIEW_W - 32, y + 2, 17, 9, ok ? "#3a8c4a" : "#5a5a5a");
        screen.text(tag, VIEW_W - 30, y + 3, PAPER);
      } else if (mon.status) {
        screen.rect(VIEW_W - 32, y + 2, 17, 9, "#b04848");
        screen.text(STATUS_LABELS[mon.status], VIEW_W - 31, y + 3, PAPER);
      }
      if (mon.hp <= 0) {
        screen.text("KO", VIEW_W - 56, y + 3, "#d04848");
      }
    }
    const hint = this.opts.mode !== "view"
      ? "A: scegli"
      : this.moveFrom !== null
        ? "START: scambia qui  B: annulla"
        : "A: dettagli  START: sposta  B: chiudi";
    screen.text(hint, 8, VIEW_H - 10, GREY);
  }

  private drawSummary(screen: Screen, mon: Monster): void {
    const species = speciesOf(mon);
    screen.clear("#2e3e52");
    screen.panel(4, 4, VIEW_W - 8, VIEW_H - 8);
    drawMonsterSprite(screen, mon.speciesId, MONSTER_ART[mon.speciesId], 8, 8, 56, 54);
    screen.text(species.name, 70, 12, INK);
    screen.text(`L${mon.level}  ${species.category}`, 70, 22, GREY);
    // Anticipa la prossima evoluzione: dà il gancio "ancora un livello".
    const evoLv = nextEvolutionLevel(mon);
    if (evoLv !== undefined) {
      screen.textRight(`EVOLVE a L${evoLv}`, 226, 22, "#e8c84a");
    }
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
