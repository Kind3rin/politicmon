import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import type { Combatant, DamageContext } from "../game/battle/sim";
import { fieldTactics, moveTactics } from "../game/battle/tactics";
import { drawScreenHeader, GREY, INK, wrapText } from "../ui/widgets";

export class BattleIntelScene implements Scene {
  private page = 0;
  private scroll = 0;
  private slots: Array<{ id: string; pp: number }>;
  constructor(private stack: SceneStack, private input: Input, private attacker: Combatant, private defender: Combatant, private index: number, private context?: DamageContext, private onSelect?: (index: number) => void, private recruitment: string[] = [], private opponentNotes: readonly string[] = []) {
    this.slots = attacker.mon.moves.length ? attacker.mon.moves : [{ id: "comizio", pp: 0 }];
    this.index = Math.min(index, this.slots.length - 1);
  }
  private lines(): string[] {
    const notes = this.page === 2 ? this.recruitment : this.page === 1 ? [...this.opponentNotes, ...fieldTactics(this.attacker, this.defender, this.context)] : moveTactics(this.attacker, this.defender, MOVES[this.slots[this.index].id], this.context);
    return notes.flatMap((s) => wrapText(s, 35));
  }
  update(): void {
    if (this.input.wasPressed("b") || this.input.wasPressed("start")) { this.onSelect?.(this.index); this.stack.pop(); audio.cancel(); return; }
    if (this.input.wasPressed("a")) { this.page = (this.page + 1) % (this.recruitment.length ? 3 : 2); this.scroll = 0; audio.cursor(); return; }
    const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
    if (dir) { this.index = (this.index + dir + this.slots.length) % this.slots.length; this.scroll = 0; audio.cursor(); return; }
    const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
    if (delta) { this.scroll = Math.max(0, Math.min(this.lines().length - 9, this.scroll + delta)); audio.cursor(); }
  }
  draw(screen: Screen): void {
    screen.clear("#efe6da"); drawScreenHeader(screen, "DOSSIER TATTICO", ["MOSSA", "CAMPO", "RECLUTA"][this.page]);
    screen.panel(4, 18, 232, 158, "card");
    const slot = this.slots[this.index]; const move = MOVES[slot.id];
    screen.textFit(move.name, 14, 26, 161, INK);
    screen.textRight(`PP ${slot.pp}/${move.pp}`, 226, 26, slot.pp ? GREY : "#b04848");
    screen.text(`◄ ${this.index + 1}/${this.slots.length} ►`, 14, 39, "#8c5b12");
    screen.textRight(`A: ${["MOSSA", "CAMPO", "RECLUTA"][(this.page + 1) % (this.recruitment.length ? 3 : 2)]}`, 226, 39, GREY);
    const lines = this.lines();
    for (const [i, line] of lines.slice(this.scroll, this.scroll + 9).entries()) screen.text(line, 14, 55 + i * 10, INK);
    screen.text(lines.length > 9 ? `SU/GIU: TESTO ${this.scroll + 1}/${lines.length - 8}` : "LEGGERE NON CONSUMA UN TURNO", 14, 151, GREY);
    screen.text("◄►: MOSSE   B/START: LOTTA", 14, 164, GREY);
  }
}
