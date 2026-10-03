import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { speciesOf, statsOf, type Monster } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import type { UiPanel, UiBlock } from "../ui/kit";

export class BoxScene implements Scene {
  private side: "party" | "box" = "party";
  private selected?: Monster;
  private notice?: UiBlock;
  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}
  private list(side: "party" | "box") { return side === "party" ? this.state.party : this.state.boxed; }
  private canMove(side: "party" | "box"): boolean {
    return side === "party" ? this.state.party.length > 1 : this.state.party.length < 6;
  }
  private move(mon: Monster, side: "party" | "box"): void {
    if (this.stack.top !== this || this.side !== side || this.selected !== mon || !this.canMove(side)) return;
    const from = this.list(side), index = from.indexOf(mon);
    if (index < 0) { this.selected = undefined; return; }
    this.selected = undefined; this.input.reset();
    const before = { party: this.state.party.length, box: this.state.boxed.length };
    from.splice(index, 1); this.list(side === "party" ? "box" : "party").push(mon);
    saveGame(this.state); audio.confirm();
    this.notice = { title: "Spostamento completato", body: `${speciesOf(mon).name} ${side === "party" ? "è nel Circolo" : "entra in squadra"}. PV, PP, status e oggetto restano uguali.`,
      facts: [{ label: "Squadra", value: `${before.party} → ${this.state.party.length} di 6` },
        { label: "Circolo", value: `${before.box} → ${this.state.boxed.length}` }] };
  }
  get uiPanel(): UiPanel {
    const mon = this.selected, side = this.side;
    const back = { label: "Indietro", run: () => {
      if (this.stack.top !== this || this.selected !== mon || this.side !== side) return;
      this.input.reset(); audio.cancel();
      if (mon) this.selected = undefined; else this.stack.pop();
    } };
    if (mon) return {
      title: speciesOf(mon).name, portrait: { src: `/sprites/monsters/${mon.speciesId}.png`, label: speciesOf(mon).name },
      subtitle: side === "party" ? "Manda questo compagno al Circolo." : "Porta questo compagno in squadra.",
      blocks: [{ title: "Prima e dopo", body: "Lo spostamento non cura e non cambia le mosse. Tieni almeno un compagno in squadra.",
        facts: [{ label: "Squadra", value: `${this.state.party.length} → ${this.state.party.length + (side === "party" ? -1 : 1)} di 6` },
          { label: "Circolo", value: `${this.state.boxed.length} → ${this.state.boxed.length + (side === "party" ? 1 : -1)}` },
          { label: "PV", value: `${mon.hp} di ${statsOf(mon).hp}` }, { label: "Livello", value: String(mon.level) }] }],
      actions: [{ label: side === "party" ? "Manda al Circolo" : "Aggiungi alla squadra", disabled: !this.canMove(side) || !this.list(side).includes(mon),
        run: () => this.move(mon, side) }], primary: 0, back
    };
    const list = this.list(side);
    return { title: "Circolo di partito", subtitle: "La squadra viaggia con te. Il Circolo conserva i compagni di riserva.",
      tabs: [{ label: `Squadra · ${this.state.party.length} di 6`, run: () => { if (this.stack.top !== this || this.selected) return; this.side = "party"; this.notice = undefined; this.input.reset(); audio.cursor(); } },
        { label: `Circolo · ${this.state.boxed.length}`, run: () => { if (this.stack.top !== this || this.selected) return; this.side = "box"; this.notice = undefined; this.input.reset(); audio.cursor(); } }], selectedTab: side === "party" ? 0 : 1,
      blocks: [...(this.notice ? [this.notice] : []), ...(!list.length ? [{ title: "Circolo vuoto", body: "Quando la squadra è piena, i nuovi compagni arrivano qui. Puoi anche spostarli dalla squadra." }] : [])],
      actions: list.map(mon => ({ label: speciesOf(mon).name, icon: `/sprites/monsters/${mon.speciesId}.png`, group: side === "party" ? "In squadra" : "Nel Circolo",
        hint: !this.canMove(side) ? side === "party" ? "È il tuo ultimo compagno. Deve restare in squadra." : "La squadra è piena. Prima manda un compagno al Circolo." : side === "party" ? "Controlla lo spostamento al Circolo." : "Controlla l’ingresso in squadra.",
        facts: [{ label: "Livello", value: String(mon.level) }, { label: "PV", value: `${mon.hp} di ${statsOf(mon).hp}` },
          { label: "Tipo", value: speciesOf(mon).types.join(" · ") }, { label: "Stato", value: mon.status ?? "In forma" }], disabled: !this.canMove(side),
        run: () => { if (this.stack.top !== this || this.selected || this.side !== side || !this.list(side).includes(mon) || !this.canMove(side)) return; this.selected = mon; this.input.reset(); audio.confirm(); } })), back
    };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
