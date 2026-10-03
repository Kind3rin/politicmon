import { MOVES, moveSummary } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { TouchAction } from "../engine/touchActions";
import type { Screen } from "../engine/screen";
import { speciesOf, type Monster } from "../game/monster";
import { moveNotes } from "../game/supplyGuide";
import { drawScreenHeader, Menu, MessageBox, wrapText, INK } from "../ui/widgets";
import { drawMonsterSprite } from "../art/monsters";

export class TeachScene implements Scene {
  readonly expandedViewport = true;
  readonly touchLayout = "growth" as const;
  private menu: Menu;
  private msg = new MessageBox();
  private done = false;
  private confirm = false;
  private inspect = false;
  private page = 0;
  private scroll = 0;
  private viewHeight = 180;
  private replacement?: Monster["moves"][number];
  constructor(private stack: SceneStack, private input: Input, private mon: Monster, private moveId: string,
    private onLearned: () => void, private options: { source?: "level" | "directive" | "archive" } = {}) {
    this.menu = new Menu(mon.moves.map(slot => ({ label: MOVES[slot.id].name, rightLabel: `PP ${slot.pp}` })));
  }
  private get old() { return this.mon.moves.length >= 4 ? this.mon.moves[this.menu.index] : undefined; }
  private get phase() { return Number(this.confirm) + Number(this.inspect) * 2 + this.page * 4; }
  private lines(): string[] {
    const slot = this.page === 1 ? this.old : undefined;
    return moveNotes(this.mon, slot?.id ?? this.moveId, slot?.pp).flatMap(line => wrapText(line, 35));
  }
  private scrollText(delta: number): void { this.scroll = Math.max(0, Math.min(Math.max(0, this.lines().length - 9), this.scroll + delta)); }
  private close(): void { this.done = true; audio.cancel(); this.stack.pop(); }
  private learn(): void {
    if (this.done || this.stack.top !== this) return;
    if (this.confirm && this.old !== this.replacement) { this.confirm = false; return; }
    if (this.mon.moves.some(slot => slot.id === this.moveId)) { this.close(); return; }
    const slot = { id: this.moveId, pp: MOVES[this.moveId].pp };
    if (this.old) this.mon.moves[this.menu.index] = slot; else this.mon.moves.push(slot);
    this.done = true; this.onLearned(); audio.levelUp();
    this.msg.show([`${speciesOf(this.mon).name} adotta ${MOVES[this.moveId].name}.`], () => { if (this.stack.top === this) this.stack.pop(); }, true);
  }
  private choose(): void {
    if (this.old) { this.replacement = this.old; this.confirm = true; this.inspect = false; }
    else this.learn();
    audio.confirm();
  }
  get touchActions(): readonly TouchAction[] {
    const phase = this.phase, old = this.old;
    const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled: disabled || this.done, run: () => {
      if (disabled || this.done || this.stack.top !== this || phase !== this.phase || old !== this.old) return;
      this.input.reset(); run();
    } });
    const info = (page: number) => { this.inspect = true; this.page = page; this.scroll = 0; audio.cursor(); };
    if (this.inspect) return [action("NUOVA", "Tutti gli effetti", () => info(0)), action("ATTUALE", "Tutti gli effetti", () => info(1), !old),
      action("SU", "Testo precedente", () => this.scrollText(-1), this.scroll === 0), action("GIÙ", "Altri dettagli", () => this.scrollText(1), this.scroll >= this.lines().length - 9),
      action("INDIETRO", "Torna alla scelta", () => { this.inspect = false; }), action("RINUNCIA", "Nessuna perdita", () => this.close())];
    if (this.confirm) return [action("APPRENDI", "Gli altri PP restano", () => this.learn()), action("RIPENSA", "Altra mossa", () => { this.confirm = false; }),
      action("DETTAGLI", "Tutti gli effetti", () => info(0)),
      action("RINUNCIA", "Nessuna perdita", () => this.close())];
    if (this.mon.moves.length < 4) return [action("APPRENDI", "Nessuna perdita", () => this.choose()),
      action("DETTAGLI", "Tutti gli effetti", () => info(0)), action("RINUNCIA", "Nessuna perdita", () => this.close())];
    return [...this.mon.moves.map((slot, i) => action(MOVES[slot.id].name, `${MOVES[slot.id].type} · ${slot.pp} PP · sostituisci`, () => {
      if (this.mon.moves[i] !== slot) return;
      this.menu.index = i; this.choose();
    })), action("DETTAGLI", "Tutti gli effetti", () => info(0)), action("RINUNCIA", "Nessuna perdita", () => this.close())];
  }
  update(dt: number): void {
    if (this.msg.isOpen) { this.msg.update(dt, this.input, this.viewHeight); return; }
    if (this.done) return;
    if (this.inspect) {
      if (this.input.wasPressed("b") || this.input.wasPressed("start")) { this.inspect = false; return; }
      if (this.old && (this.input.wasPressed("left") || this.input.wasPressed("right"))) { this.page = 1 - this.page; this.scroll = 0; }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      this.scrollText(delta); return;
    }
    if (this.input.wasPressed("start")) { this.inspect = true; this.scroll = 0; return; }
    if (this.confirm) {
      if (this.input.wasPressed("b")) { this.confirm = false; return; }
      if (this.input.wasPressed("a")) this.learn(); return;
    }
    const action = this.mon.moves.length >= 4 ? this.menu.update(this.input) : this.input.wasPressed("a") ? "select" : this.input.wasPressed("b") ? "cancel" : null;
    if (action === "cancel") this.close(); if (action === "select") this.choose();
  }
  private card(screen: Screen, id: string, pp: number, y: number, label: string, h = 62): void {
    const move = MOVES[id]; screen.panel(6, y, 228, h, "card");
    screen.text(`${label}: ${move.name}`, 14, y + 6, INK);
    screen.text(`${move.type} / PP ${pp}/${move.pp} / ${move.accuracy}%`, 14, y + 19, "#59657d");
    wrapText(moveSummary(move).replace(/^DANNO /, "POTENZA "), 35).slice(0, 3).forEach((line, i) => screen.text(line, 14, y + 32 + i * 9, INK));
  }
  draw(screen: Screen): void {
    this.viewHeight = screen.height;
    screen.clear("#101b32");
    drawScreenHeader(screen, `${speciesOf(this.mon).name} LV${this.mon.level}`, this.options.source === "archive" ? "ARCHIVIO" : this.options.source === "level" ? "LIVELLO" : "DIRETTIVA");
    const extra = screen.height - 180, heroH = Math.round(extra * .4), top = 23 + heroH, cardH = 62 + Math.round(extra * .2);
    if (heroH > 0) drawMonsterSprite(screen, this.mon.speciesId, 80, 21, 80, heroH - 5);
    if (this.msg.isOpen) { this.card(screen, this.moveId, MOVES[this.moveId].pp, top, "APPRESA", cardH); this.msg.draw(screen); return; }
    if (this.inspect) {
      screen.panel(6, top, 228, screen.height - top - 15, "card"); this.lines().slice(this.scroll, this.scroll + 9).forEach((line, i) => screen.text(line, 14, top + 10 + i * 12, INK));
    } else {
      this.card(screen, this.moveId, MOVES[this.moveId].pp, top, "NUOVA", cardH);
      if (this.confirm && this.old) this.card(screen, this.old.id, this.old.pp, top + cardH + 4, "SCARTI", cardH);
      else if (this.mon.moves.length >= 4) { screen.text("QUALE MOSSA SOSTITUISCI?", 14, top + cardH + 4, "#fff3cc"); this.menu.draw(screen, 6, top + cardH + 16, 228, 14 + Math.round(extra * .04), 4); }
      else { screen.text("SLOT LIBERO", 14, top + cardH + 26, "#80d1b0"); screen.text("NESSUNA PERDITA", 14, top + cardH + 43, "#fff3cc"); }
    }
    const hint = screen.height > 180 ? this.inspect ? "EFFETTI DELLA MOSSA" : this.confirm ? "CONFERMA LA SOSTITUZIONE" : "SCEGLI QUI SOTTO" : this.inspect ? "◄►:MOSSA START/B:TORNA" : this.confirm ? "A:IMPARA B:RIPENSA" : "A:SCEGLI START:INFO B:RINUNCIA";
    screen.text(hint, 8, screen.height - 11, "#fff3cc");
  }
}
