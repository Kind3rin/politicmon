import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { MAPS } from "../data/maps";
import { SPECIES } from "../data/species";
import type { GameState } from "../game/state";
import { saveGame } from "../game/state";
import { SLOTS, clockText, gameClock, hoursText, shiftToTune, slotAtHour, hourOf, type SlotDef } from "../game/palinsesto";
import { readableCopy } from "../ui/kit/copy";
import { openUiSheet } from "../ui/kit/sheet";
import type { TouchAction } from "../engine/touchActions";
import type { UiPanel } from "../ui/kit";

/** The day as four TV slots, and the remote control: tuning one moves the game clock to the middle of it. */
export class PalinsestoScene implements Scene {
  readonly transparent = false;
  private closed = false;
  constructor(private stack: SceneStack, private input: Input, private state: GameState, private clock: () => Date = () => new Date()) {}

  private close(): void {
    if (this.closed || this.stack.top !== this) return;
    this.closed = true; this.input.reset(); this.stack.pop();
  }

  /** The candidates of this map that are only seen in `slot`, by name once the player has met them. */
  private onlyHere(slot: SlotDef): { count: number; known: string[] } {
    const mine = (MAPS[this.state.pos.mapId]?.encounters ?? []).filter(entry => entry.slots?.includes(slot.id));
    return { count: mine.length, known: mine.filter(entry => this.state.dex[entry.speciesId]).map(entry => SPECIES[entry.speciesId].name) };
  }

  private tune(slot: SlotDef): void {
    this.state.clockShift = shiftToTune(slot, this.clock());
    saveGame(this.state);
    audio.confirm();
    this.close();
  }

  get uiPanel(): UiPanel {
    const now = gameClock(this.state, this.clock()), slot = slotAtHour(hourOf(now));
    const actions = SLOTS.map((entry): TouchAction => {
      const here = this.onlyHere(entry), current = entry.id === slot.id;
      const exclusive = here.count ? `Qui, solo a quest'ora: ${here.count === 1 ? "un candidato" : `${here.count} candidati`}${here.known.length ? ` (${here.known.join(", ")})` : ""}.` : "";
      const detail = () => openUiSheet(`${entry.name} · ${readableCopy(entry.show)}`, [
        entry.blurb, `In onda: ${entry.types.map(t => t.toLocaleLowerCase("it")).join(" e ")}: nell'erba se ne incontrano il doppio.`,
        "Alcuni candidati e alcuni sfidanti si vedono solo in questa fascia.", exclusive
      ].filter(Boolean).join("\n\n"), current ? [] : [{ label: "Sintonizza col telecomando", run: () => this.tune(entry) }]);
      return { label: entry.name, hint: `${readableCopy(entry.show)} · ${hoursText(entry)}`, onInspect: detail,
        row: { kind: "item", tone: entry.types[0], types: entry.types, right: current ? "Adesso" : "Sintonizza", meta: `${readableCopy(entry.show)} · ${hoursText(entry)}${here.count ? ` · ${here.count === 1 ? "1 candidato" : `${here.count} candidati`} solo qui` : ""}` },
        run: () => {
          if (this.closed || this.stack.top !== this) return;
          audio.cursor(); detail();
        } };
    });
    return { title: "Palinsesto", compact: true, actions,
      subtitle: `Adesso sono le ${clockText(now)}: ${slot.name}, ${readableCopy(slot.show)}. Ogni fascia mette in onda due tipi e porta candidati e sfidanti suoi. Tocca una fascia per cambiare canale col telecomando.`,
      back: { label: "Indietro", run: () => { if (this.closed || this.stack.top !== this) return; this.input.reset(); audio.cancel(); this.close(); } } };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}

