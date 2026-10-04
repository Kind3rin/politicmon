import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import type { TouchAction } from "../engine/touchActions";
import { FUEL_MAX, buyFuel, eur, fuelPrice, fuelQuote, priceLine } from "../game/fuel";
import { saveGame, type GameState } from "../game/state";
import type { UiPanel } from "../ui/kit";

/** The pump: today's price, a tank gauge, three ways to fill. */
export class FuelScene implements Scene {
  readonly expandedViewport = true;
  private closed = false;
  constructor(private stack: SceneStack, private input: Input, private state: GameState, private mapId: string) {}

  private get cents(): number { return fuelPrice(undefined, this.mapId); }

  private fill(wanted: number): void {
    if (this.closed || this.stack.top !== this) return;
    const quote = fuelQuote(this.state, wanted, this.cents);
    this.input.reset();
    if (!buyFuel(this.state, quote)) { audio.cancel(); return; }
    audio.confirm(); saveGame(this.state);
  }

  get uiPanel(): UiPanel {
    const cents = this.cents, state = this.state;
    const option = (label: string, wanted: number): TouchAction => {
      const quote = fuelQuote(state, wanted, cents);
      return { label, disabled: quote.litres <= 0, run: () => this.fill(wanted),
        row: { kind: "item", right: quote.litres > 0 ? `${quote.total} €` : "—",
          meta: quote.litres > 0 ? `${quote.litres} L a ${eur(cents)} al litro` : state.fuel >= FUEL_MAX ? "Serbatoio pieno" : "Fondi insufficienti" } };
    };
    return {
      title: "Benzinaio", subtitle: priceLine(cents),
      stats: [{ label: "Serbatoio", value: state.fuel, max: FUEL_MAX }],
      blocks: [{ title: "Oggi", facts: [{ label: "Prezzo al litro", value: eur(cents) }, { label: "Fondi", value: `${state.money} €` }] }],
      actions: [option("Pieno", FUEL_MAX), option("10 litri", 10), option("5 litri", 5)],
      back: { label: "Indietro", run: () => { if (this.closed || this.stack.top !== this) return; this.closed = true; this.input.reset(); audio.cancel(); this.stack.pop(); } }
    };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
