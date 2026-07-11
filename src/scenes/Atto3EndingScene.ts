import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { applyAtto3EndingReward, deriveAtto3Ending, type Atto3EndingDef } from "../game/atto3Ending";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader, wrapText } from "../ui/widgets";

export class Atto3EndingScene implements Scene {
  readonly transparent = false;
  private page = 0;
  private ending: Atto3EndingDef;

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private onFinish: () => void) {
    const ending = deriveAtto3Ending(state);
    if (!ending) throw new Error("Atto3EndingScene richiede un risultato elettorale");
    this.ending = ending;
  }

  update(): void {
    if (!this.input.wasPressed("a") && !this.input.wasPressed("b")) return;
    if (this.page < 3) { this.page += 1; audio.confirm(); return; }
    if (applyAtto3EndingReward(this.state, this.ending)) audio.catchJingle();
    saveGame(this.state); this.stack.pop(); this.onFinish();
  }

  draw(screen: Screen): void {
    screen.clear(this.ending.id.includes("fractured") ? "#3d2939" : "#173e42");
    const headings = [this.ending.title, "GOVERNO OMBRA", "CREDITI", "POST-GAME"];
    drawScreenHeader(screen, headings[this.page], `${this.page + 1}/4`);
    screen.panel(8, 30, 224, 116, "dialog");
    const ministers = Object.keys(this.state.ministri);
    const paragraphs = this.page === 0
      ? [this.ending.subtitle, ...this.ending.lines]
      : this.page === 1
        ? [ministers.length ? `${ministers.length} MINISTERI RESTANO ASSEGNATI.` : "NESSUN MINISTERO ERA ASSEGNATO.", "IL GOVERNO OMBRA CONTINUA A DARE I SUOI BONUS NEL POST-GAME."]
        : this.page === 2
          ? ["POLITICMON", "IDEA, CODICE E SATIRA: LUCA TIENGO + CODEX", "PIXEL ART: PIXELLAB, DIREZIONE ARTISTICA COERENTE GBA", "GRAZIE PER AVER VOTATO. PIÙ O MENO."]
          : ["PREMIO: 2500€ + 2 SCHEDE BLINDATE.", "SBLOCCATO UN COSMETICO DELL'EPILOGO.", "PUOI TORNARE OVUNQUE: QUEST, DEX, COPPA E ONLINE RESTANO ATTIVI."];
    let y = 42;
    for (const paragraph of paragraphs) {
      for (const line of wrapText(paragraph, 33)) { screen.text(line, 15, y, "#10141f"); y += 11; }
      y += 5;
    }
    screen.text(this.page < 3 ? "A: CONTINUA   B: CONTINUA" : "A: TORNA AL POST-GAME", 12, 158, "#ffe38a");
  }
}
