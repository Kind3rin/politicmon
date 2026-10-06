import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { SPECIES } from "../data/species";
import type { GameState } from "../game/state";
import { POWERS, POWER_ORDER, powerStatus, type PowerId } from "../game/powers";
import { readableCopy } from "../ui/kit/copy";
import { openUiSheet } from "../ui/kit/sheet";
import type { TouchAction } from "../engine/touchActions";
import type { UiPanel } from "../ui/kit";

/** Powers that are used from the list; the others work on what is in front of you. */
export const MENU_POWERS: readonly PowerId[] = ["comizio", "riflettori", "scappatoia", "volo"];

export class PowersScene implements Scene {
  readonly transparent = false;
  private closed = false;
  constructor(private stack: SceneStack, private input: Input, private state: GameState, private use: (id: PowerId) => void) {}

  private close(then?: () => void): void {
    if (this.closed || this.stack.top !== this) return;
    this.closed = true; this.input.reset(); this.stack.pop(); then?.();
  }

  get uiPanel(): UiPanel {
    const actions = POWER_ORDER.map((id): TouchAction => {
      const power = POWERS[id], status = powerStatus(this.state, id), menu = MENU_POWERS.includes(id);
      const meta = status.kind === "locked" ? `Si sblocca: ${power.unlock}` : status.kind === "nobody" ? `Serve un compagno ${status.need.map(t => t.toLocaleLowerCase("it")).join(", ")}` : power.does;
      const right = status.kind === "ready" ? SPECIES[status.user.speciesId].name : status.kind === "nobody" ? "Nessuno" : "Chiuso";
      const detail = () => openUiSheet(readableCopy(power.name), `${power.does}\n\nDove serve: ${power.where}\n\nChi lo usa: ${power.users === "any" ? "chiunque" : power.users.map(t => t.toLocaleLowerCase("it")).join(", ")}.\nCome si ottiene: ${power.unlock}`);
      return { label: readableCopy(power.name), hint: meta, disabled: false, onInspect: detail,
        facts: [{ label: "Quando", value: menu ? "Dal menu" : "Davanti all'ostacolo" }, { label: "Chi", value: right }],
        row: { kind: "item", right, meta, tone: power.type },
        run: () => {
          if (this.closed || this.stack.top !== this) return;
          if (status.kind !== "ready") { audio.cancel(); detail(); return; }
          if (!menu) { audio.confirm(); detail(); return; }
          audio.confirm(); this.close(() => this.use(id));
        } };
    });
    return { title: "Poteri", subtitle: "Niente mosse da insegnare: li sblocca la storia e li usa il primo compagno in forze col tipo giusto.", compact: true, actions,
      back: { label: "Indietro", run: () => { if (this.closed || this.stack.top !== this) return; this.input.reset(); audio.cancel(); this.close(); } } };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
