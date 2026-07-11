import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader, wrapText } from "../ui/widgets";

export type SliceEnding = "stable" | "fractured";

export function deriveSliceEnding(state: GameState): SliceEnding {
  return state.coalition.members.some((member) => member.status === "strained") ? "fractured" : "stable";
}

export class SliceEndingScene implements Scene {
  readonly transparent = false;
  private ending: SliceEnding;
  private lines: string[];

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private onFinish: () => void) {
    this.ending = deriveSliceEnding(state);
    this.lines = this.ending === "stable"
      ? ["FOTO DI COALIZIONE: STABILE.", "DUE POSTI, TRE PROMESSE E NESSUNA SEDIA LANCIATA.", "IL CAMPO REGGE. FINO AL PROSSIMO COMUNICATO."]
      : ["FOTO DI COALIZIONE: FRATTURATA.", "SONO TUTTI NEL FRAME, MA QUALCUNO HA GIÀ CHIESTO IL RITAGLIO.", "LA LINEA ROSSA RESTA VISIBILE ANCHE IN BIANCO E NERO."];
  }

  update(): void {
    if (!this.input.wasPressed("a") && !this.input.wasPressed("b")) return;
    this.state.flags[`campo-slice-ending:${this.ending}`] = true;
    this.state.flags["campo-photo-complete"] = true;
    this.state.flags["atto3-slice-complete"] = true;
    saveGame(this.state);
    audio.catchJingle();
    this.stack.pop();
    this.onFinish();
  }

  draw(screen: Screen): void {
    screen.clear(this.ending === "stable" ? "#254a42" : "#4a303c");
    drawScreenHeader(screen, "FINE VERTICAL SLICE", this.ending === "stable" ? "COESA" : "TESA");
    screen.panel(8, 30, 224, 116, "dialog");
    let y = 45;
    for (const paragraph of this.lines) {
      for (const line of wrapText(paragraph, 34)) {
        screen.text(line, 16, y, "#10141f");
        y += 11;
      }
      y += 5;
    }
    screen.text("A: TORNA A BRUXELLES", 16, 157, "#ffe38a");
  }
}
