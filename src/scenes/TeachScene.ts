import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import { sceneImage } from "../engine/assets";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { speciesOf, type Monster } from "../game/monster";
import { moveNotes } from "../game/supplyGuide";
import { drawScreenHeader, Menu, MessageBox, wrapText, INK } from "../ui/widgets";
const GREY = "#59657d";

export class TeachScene implements Scene {
  private menu: Menu;
  private msg = new MessageBox();
  private done = false;
  private inspect = false;
  private page = 0;
  private scroll = 0;
  private confirm = false;
  constructor(private stack: SceneStack, private input: Input, private mon: Monster, private moveId: string,
    private onLearned: () => void, private options: { source?: "level" | "directive" | "archive" } = {}) {
    this.menu = new Menu(mon.moves.map((slot) => ({ label: MOVES[slot.id].name, rightLabel: `PP ${slot.pp}` })));
  }
  private get old() { return this.mon.moves.length >= 4 ? this.mon.moves[this.menu.index] : undefined; }
  private lines(): string[] {
    const old = this.old, incoming = MOVES[this.moveId];
    const notes = this.page === 0 ? moveNotes(this.mon, this.moveId) : this.page === 1 ? old ? moveNotes(this.mon, old.id, old.pp) : ["SLOT LIBERO: NESSUNA MOSSA CANCELLATA."] :
      [`NUOVA: ${incoming.name}. PP ${incoming.pp}/${incoming.pp}.`, old ? `SCARTI: ${MOVES[old.id].name}, INCLUSI I SUOI ${old.pp} PP RESIDUI.` : "AGGIUNGI SENZA PERDERE ALTRE MOSSE.",
        "GLI ALTRI PP, I PV, LO STATUS E L'OGGETTO RESTANO UGUALI.", this.options.source === "level" ? "APPRENDIMENTO DA LIVELLO. RINUNCIARE NON ANNULLA IL LIVELLO GUADAGNATO." : this.options.source === "archive" ? "RIPRENDERE UNA LINEA NON COSTA FONDI O OGGETTI." : "LA DIRETTIVA NON SI CONSUMA: PUOI RIUSARLA SU ALTRI CANDIDATI.",
        ...(this.options.source === "archive" ? ["ARCHIVIO GRATUITO: MOSSA DELLA FORMA ATTUALE, GIÀ DISPONIBILE AL TUO LIVELLO."] : []), "POTENZA NON È DANNO FINALE: CONTANO STATISTICHE, TIPO E ABILITÀ."];
    return notes.flatMap((line) => wrapText(line, 35));
  }
  private learn(): void {
    const move = MOVES[this.moveId];
    if (this.mon.moves.some(slot => slot.id === this.moveId)) { this.done = true; this.stack.pop(); return; }
    if (this.old) this.mon.moves[this.menu.index] = { id: this.moveId, pp: move.pp };
    else this.mon.moves.push({ id: this.moveId, pp: move.pp });
    this.done = true; this.onLearned(); audio.levelUp();
    this.msg.show([`${speciesOf(this.mon).name} adotta ${move.name}.`], () => this.stack.pop(), true);
  }
  private choose(): void {
    if (this.old) this.confirm = true;
    else this.learn();
    audio.confirm();
  }
  update(dt: number): void {
    if (this.msg.isOpen) { this.msg.update(dt, this.input); return; }
    if (this.done) return;
    if (this.confirm) {
      if (this.input.wasPressed("b")) { this.confirm = false; audio.cancel(); return; }
      if (!this.input.wasPressed("a")) return;
      this.learn();
      return;
    }
    if (this.input.wasPressed("start")) { this.inspect = !this.inspect; this.scroll = 0; audio.cursor(); return; }
    if (this.inspect) {
      if (this.input.wasPressed("b")) { this.inspect = false; return; }
      const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
      if (dir) { this.page = (this.page + dir + 3) % 3; this.scroll = 0; audio.cursor(); return; }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      if (delta) this.scroll = Math.max(0, Math.min(Math.max(0, this.lines().length - 9), this.scroll + delta));
      if (this.input.wasPressed("a")) this.choose();
      return;
    }
    const action = this.mon.moves.length >= 4 ? this.menu.update(this.input) : this.input.wasPressed("a") ? "select" : this.input.wasPressed("b") ? "cancel" : null;
    if (action === "cancel") { this.done = true; this.stack.pop(); audio.cancel(); }
    if (action === "select") this.choose();
  }
  draw(screen: Screen): void {
    screen.clear("#101b32"); const bg = sceneImage("ui:teach", "ui/teach.png"); if (bg) screen.image(bg);
    drawScreenHeader(screen, this.options.source === "archive" ? "RIPRENDI UNA LINEA" : this.options.source === "level" ? "NUOVA LINEA AL LIVELLO" : "DIRETTIVA DI PARTITO");
    if (this.msg.isOpen) { screen.clear("#101b32"); this.msg.draw(screen); return; }
    const move = MOVES[this.moveId];
    if (this.confirm || this.inspect) {
      screen.panel(6, 24, 228, 141, "card");
      screen.text(this.confirm ? "CONFERMI LA NUOVA LINEA?" : ["MOSSA NUOVA", "MOSSA ATTUALE", "COSA CAMBIA"][this.page], 14, 31, "#8c5b12");
      const lines = this.confirm ? [`${speciesOf(this.mon).name} L${this.mon.level}`, "IMPARA:", ...wrapText(move.name, 35), ...(this.old ? ["CANCELLA:", ...wrapText(MOVES[this.old.id].name, 35)] : ["OCCUPA UNO SLOT LIBERO."]), "NUOVI PP AL MASSIMO.", "ALTRE MOSSE INVARIATE."] : this.lines();
      lines.slice(this.confirm ? 0 : this.scroll, (this.confirm ? 0 : this.scroll) + 9).forEach((line, i) => screen.text(line, 14, 45 + i * 10, INK));
      if (!this.confirm) screen.text(`SU/GIU: ${this.scroll + 1}/${Math.max(1, lines.length - 8)}`, 14, 151, GREY);
      screen.text(this.confirm ? "A:CONFERMA B:RIPENSA" : "◄►:PAGINA A:SCEGLI B:LISTA", 8, 169, "#fff3cc");
      return;
    }
    screen.panel(6, 23, 228, 52, "card");
    screen.text(`${speciesOf(this.mon).name} L${this.mon.level}`, 14, 29, GREY);
    wrapText(`NUOVA: ${move.name}`, 35).forEach((line, i) => screen.text(line, 14, 42 + i * 9, INK));
    if (this.mon.moves.length >= 4) {
      screen.text("QUALE LINEA ARCHIVI?", 14, 80, "#fff3cc");
      this.menu.draw(screen, 6, 92, 228, 14, 4);
    } else {
      screen.panel(6, 86, 228, 76, "card");
      screen.text("SLOT LIBERO: NESSUNA PERDITA.", 14, 100, INK);
      screen.text("START: LEGGI LA MOSSA PRIMA.", 14, 116, GREY);
    }
    screen.text("A:SCEGLI START:CONFRONTA B:RINUNCIA", 8, 169, "#fff3cc");
  }
}
