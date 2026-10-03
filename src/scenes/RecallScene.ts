import { companionHint } from "../ui/kit/companionContent";
import { MOVES } from "../data/moves";
import type { TouchAction } from "../engine/touchActions";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { archivedMoves } from "../game/moveArchive";
import { speciesOf, type Monster } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { Menu } from "../ui/widgets";
import type { UiPanel } from "../ui/kit";
import { moveDescription } from "../ui/kit/moveContent";
import { readableCopy } from "../ui/kit/copy";
import { TeachScene } from "./TeachScene";

export class RecallScene implements Scene {
  private menu = new Menu([]);
  private ids: string[] = [];
  constructor(private stack: SceneStack, private input: Input, private state: GameState, private mon: Monster) { this.refresh(); }
  private refresh(): void {
    this.ids = archivedMoves(this.mon);
    this.menu.items = this.ids.map((id) => ({ label: MOVES[id].name, rightLabel: `${MOVES[id].pp}PP` }));
    this.menu.index = Math.min(this.menu.index, Math.max(0, this.ids.length - 1));
  }
  private open(id: string): void {
    if (this.stack.top !== this || !this.state.party.includes(this.mon) || !archivedMoves(this.mon).includes(id)) return;
    this.input.reset(); audio.confirm();
    this.stack.push(new TeachScene(this.stack, this.input, this.mon, id, () => { saveGame(this.state); this.refresh(); }, { source: "archive", party: this.state.party }));
  }
  get touchActions(): readonly TouchAction[] {
    this.refresh(); const page = Math.floor(this.menu.index / 4);
    const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled, run: () => {
      if (disabled || this.stack.top !== this || page !== Math.floor(this.menu.index / 4)) return;
      this.input.reset(); run();
    } });
    return [...Array.from({ length: 4 }, (_, i) => {
      const id = this.ids[page * 4 + i];
      return action(id ? MOVES[id].name : "—", id ? `${MOVES[id].type} · ${MOVES[id].pp} PP · gratis` : "Nessuna mossa", () => { if (id) this.open(id); }, !id);
    }), action("ALTRI", "Altre mosse disponibili", () => { this.menu.index = (page + 1) * 4 < this.ids.length ? (page + 1) * 4 : 0; }, this.ids.length <= 4),
      action("INDIETRO", "Torna alla squadra", () => this.stack.pop())];
  }
  get uiPanel(): UiPanel {
    this.refresh();
    return {
      title: `${speciesOf(this.mon).name}: archivio`,
      subtitle: companionHint(this.mon, this.state.party, "Riprendi gratis una mossa già sbloccata. Le mosse attuali cambiano solo dopo la scelta successiva."),
      blocks: this.ids.length ? [] : [{ title: "Nessuna mossa da recuperare", body: "Le mosse sbloccate di questa forma sono già nel repertorio. Qui compaiono quelle sbloccate che non stai usando." }],
      actions: this.ids.map(id => {
        const move = MOVES[id];
        return { label: readableCopy(move.name), group: "Mosse recuperabili", hint: moveDescription(move),
          icon: `/sprites/ui/type_${move.type.toLocaleLowerCase('it')}.png`,
          facts: [{ label: "Tipo", value: move.type }, { label: "Potenza", value: move.power ? String(move.power) : "—" },
            { label: "PP", value: String(move.pp) }, { label: "Precisione", value: `${move.accuracy}%` }],
          run: () => this.open(id) };
      }), selected: this.menu.index,
      back: { label: "Indietro", hint: "Torna alla scheda del compagno.", run: () => {
        if (this.stack.top !== this) return;
        this.input.reset(); audio.cancel(); this.stack.pop();
      } }
    };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
