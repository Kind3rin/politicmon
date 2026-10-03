import { MOVES } from "../data/moves";
import { ABILITIES } from "../data/abilities";
import { ITEMS } from "../data/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { effectiveStat, type Combatant, type DamageContext } from "../game/battle/sim";
import { damageRange, fieldTactics, moveTactics } from "../game/battle/tactics";
import { speciesOf } from "../game/monster";
import type { UiPanel, UiBlock } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";
import { moveDescription } from "../ui/kit/moveContent";

function tacticalCopy(text: string): string {
  return text.split(/(?<=[.!?])\s+/).map(sentence => readableCopy(sentence.replace(/\b(POLTRONA|GARANZIA|TELECAMERA)\b(?=\.)/g,
    id => ABILITIES[id.toLowerCase()]?.name ?? ITEMS[id.toLowerCase()]?.name ?? id))).join(" ");
}

export class BattleIntelScene implements Scene {
  private page: "move" | "field" | "recruit" = "move";
  private closed = false;
  private slots: Array<{ id: string; pp: number }>;
  constructor(private stack: SceneStack, private input: Input, private attacker: Combatant,
    private defender: Combatant, private index: number, private context?: DamageContext,
    private onSelect?: (index: number) => void, private recruitment: string[] = [],
    private opponentNotes: readonly string[] = [], private returnLabel = "LOTTA") {
    this.slots = attacker.mon.moves.length ? attacker.mon.moves : [{ id: "comizio", pp: 0 }];
    this.index = Math.max(0, Math.min(index, this.slots.length - 1));
  }
  private leave(): void {
    if (this.closed || this.stack.top !== this) return;
    this.closed = true; this.input.reset(); audio.cancel();
    this.onSelect?.(this.index); this.stack.pop();
  }
  get uiPanel(): UiPanel {
    const slot = this.slots[this.index], move = MOVES[slot.id];
    const pages: readonly ("move" | "field" | "recruit")[] = this.recruitment.length ? ["move", "field", "recruit"] : ["move", "field"];
    const names = { move: "Mossa", field: "Campo", recruit: "Reclutamento" };
    let blocks: UiBlock[];
    if (this.page === "move") {
      const range = damageRange(this.attacker, this.defender, move, this.context);
      const self = move.power === 0 && !move.effect?.status && move.effect?.stat?.target !== "foe";
      const notes = moveTactics(this.attacker, this.defender, move, this.context).slice(move.power > 0 ? 4 : 2, -1);
      blocks = [{ title: move.name, body: moveDescription(move), facts: [
        { label: "Tipo", value: move.type }, { label: "Categoria", value: move.category },
        { label: "Potenza", value: String(move.power) }, { label: "PP", value: `${slot.pp} di ${move.pp}` },
        { label: "Precisione", value: `${self ? 100 : move.accuracy}%` },
        { label: "Priorità", value: String(move.effect?.priority ?? 0) },
        ...(move.power > 0 ? [{ label: "Danno se colpisce", value: `${range.min}–${range.max} PV` },
          { label: "Efficacia", value: `×${range.typeMult}` }] : []) ] },
        ...(slot.pp <= 0 ? [{ title: "PP esauriti", body: this.attacker.mon.moves.length ? "Questa mossa non ha PP. Il dossier resta consultabile; la lettura non la ricarica." : "Nessuna mossa disponibile. Comizio è la mossa di riserva." }] : []),
        ...(notes.length ? [{ title: "Nello stato attuale", body: notes.map(tacticalCopy).join("\n\n") }] : []),
        { title: "Come leggere la stima", body: "Il danno non include colpi critici. Cambio, status e mosse nemiche possono modificarlo. Consultare il dossier non consuma un turno." }];
    } else if (this.page === "field") {
      const speed = effectiveStat(this.attacker, "spd"), foeSpeed = effectiveStat(this.defender, "spd");
      blocks = [{ title: "Ordine del turno", body: speed > foeSpeed ? "A parità di priorità agisci prima. Le mosse con priorità possono invertire l’ordine." : speed < foeSpeed ? "A parità di priorità agisce prima il nemico. Le mosse con priorità possono invertire l’ordine." : "A parità di priorità l’ordine è casuale.",
        facts: [{ label: "La tua velocità", value: String(speed) }, { label: "Velocità nemica", value: String(foeSpeed) }] },
        ...(this.opponentNotes.length ? [{ title: "La situazione", body: this.opponentNotes.flatMap(line => line.split(/(?<=[.!?])\s+/))
          .filter(sentence => !/\b(?:A (?:inizia|sfida)|B (?:torna|rinvia|annulla)|START sceglie)\b/.test(sentence)).map(tacticalCopy).join("\n\n") }] : []),
        { title: "Effetti del campo", body: fieldTactics(this.attacker, this.defender, this.context).slice(3).map(tacticalCopy).join("\n\n") }];
    } else blocks = [{ title: "Reclutamento", body: this.recruitment.filter(line => line !== "RECLUTAMENTO NELLO STATO ATTUALE:").map(tacticalCopy).join("\n\n") }];
    return { title: "Dossier tattico", subtitle: `${speciesOf(this.attacker.mon).name} contro ${speciesOf(this.defender.mon).name}. La lettura non usa mosse, oggetti o turni.`,
      tabs: pages.map(page => ({ label: names[page], run: () => { if (this.closed || this.stack.top !== this) return; this.page = page; this.input.reset(); audio.cursor(); } })),
      selectedTab: pages.indexOf(this.page), blocks,
      actions: this.page === "move" ? this.slots.map((candidate, index) => ({ label: MOVES[candidate.id].name,
        hint: index === this.index ? "Mossa nel dossier." : "Leggi questa mossa senza usarla.",
        facts: [{ label: "Tipo", value: MOVES[candidate.id].type }, { label: "PP", value: `${candidate.pp} di ${MOVES[candidate.id].pp}` }],
        run: () => { if (this.closed || this.stack.top !== this || this.page !== "move") return; this.index = index; this.input.reset(); audio.cursor(); } })) : [],
      selected: this.page === "move" ? this.index : undefined,
      back: { label: "Indietro", hint: this.returnLabel === "SQUADRA" ? "Torna alla squadra." : "Torna alla lotta.", run: () => this.leave() } };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
