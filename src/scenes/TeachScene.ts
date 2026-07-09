import { MOVES, moveSummary, moveKindLabel } from "../data/moves";
import { TYPE_COLORS } from "../data/poltypes";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { speciesOf, type Monster } from "../game/monster";
import { Menu, MessageBox, clipToWidth, GREY, INK, PAPER } from "../ui/widgets";

// Insegna una mossa (DIRETTIVA DI PARTITO) a un POLITICMON compatibile.
// Se ha già 4 mosse, chiede quale sostituire. La direttiva è riutilizzabile,
// quindi non viene consumata qui: lo decide il chiamante (BagScene).
export class TeachScene implements Scene {
  private menu: Menu;
  private msg = new MessageBox();
  private done = false;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private mon: Monster,
    private moveId: string,
    private onLearned: () => void
  ) {
    this.menu = new Menu(
      this.mon.moves.map((slot) => ({
        label: MOVES[slot.id].name,
        rightLabel: `PP ${MOVES[slot.id].pp}`
      }))
    );
    if (this.mon.moves.length < 4) {
      // Spazio libero: impara subito.
      this.learnInSlot(-1);
    }
  }

  private learnInSlot(replaceIndex: number): void {
    const move = MOVES[this.moveId];
    const name = speciesOf(this.mon).name;
    if (replaceIndex < 0) {
      this.mon.moves.push({ id: this.moveId, pp: move.pp });
      this.msg.show([`${name} studia la direttiva...`, `Impara ${move.name}!`], () => {
        this.finish();
      });
    } else {
      const old = MOVES[this.mon.moves[replaceIndex].id];
      this.mon.moves[replaceIndex] = { id: this.moveId, pp: move.pp };
      this.msg.show(
        [`${name} archivia ${old.name}...`, `...e adotta la linea: ${move.name}!`],
        () => this.finish()
      );
    }
    audio.levelUp();
    this.onLearned();
  }

  private finish(): void {
    this.done = true;
    this.stack.pop();
  }

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    if (this.done || this.mon.moves.length < 4) {
      return; // in attesa che il messaggio chiuda e si torni indietro
    }
    const action = this.menu.update(this.input);
    if (action === "cancel") {
      const name = speciesOf(this.mon).name;
      this.msg.show([`${name} resta sulle sue posizioni.`], () => this.finish());
      return;
    }
    if (action === "select") {
      this.learnInSlot(this.menu.index);
    }
  }

  draw(screen: Screen): void {
    screen.clear("#2e3a4e");
    const move = MOVES[this.moveId];
    screen.text("DIRETTIVA DI PARTITO", 8, 6, PAPER);
    screen.text(`${speciesOf(this.mon).name} può imparare:`, 8, 20, PAPER);

    // Scheda della mossa in arrivo. Riepilogo su riga PROPRIA (y58): prima era
    // su y48 right-aligned e collideva con la kind-label (SPECIALE/FISICO/...),
    // il cui bordo destro superava il bordo sinistro del riepilogo.
    screen.panel(8, 30, VIEW_W - 16, 40);
    screen.text(move.name, 16, 37, INK);
    const typeLabel = move.type.slice(0, 9);
    screen.text(typeLabel, 16, 48, INK);
    screen.rect(16, 56, typeLabel.length * 6, 1, TYPE_COLORS[move.type]);
    screen.text(moveKindLabel(move), 16 + typeLabel.length * 6 + 10, 48, GREY);
    screen.text(moveSummary(move).slice(0, 36), 16, 60, GREY);

    if (this.mon.moves.length >= 4 && !this.done) {
      screen.text("Quale linea abbandona?", 8, 74, PAPER);
      this.menu.draw(screen, 8, 84, VIEW_W - 16);
      const sel = this.mon.moves[this.menu.index];
      if (sel) {
        const m = MOVES[sel.id];
        // Tronca con ellissi invece di scartare muto la 2a riga del riepilogo.
        screen.text(clipToWidth(moveSummary(m), 216), 12, VIEW_H - 22, GREY);
      }
      screen.text("A: sostituisci  B: lascia perdere", 8, VIEW_H - 10, GREY);
    }
    this.msg.draw(screen);
  }
}
