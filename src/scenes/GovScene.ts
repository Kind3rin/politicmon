import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import {
  assegnaMinistro, MINISTERI, MINISTERO_ORDER, ministroDi, rimuoviMinistro,
  sondaggiColor, sondaggiLabel
} from "../game/governo";
import { speciesOf } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { wrapText, GREY, INK, PAPER } from "../ui/widgets";
import { PartyScene } from "./PartyScene";

// Il GOVERNO OMBRA: ogni Politicmon può ricoprire un ministero con bonus
// passivo. Se il ministro va KO, l'incarico resta ma il bonus si sospende.
export class GovScene implements Scene {
  private index = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(): void {
    if (this.input.wasPressed("up")) {
      this.index = (this.index + MINISTERO_ORDER.length - 1) % MINISTERO_ORDER.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % MINISTERO_ORDER.length;
      audio.cursor();
    }
    if (this.input.wasPressed("b")) {
      audio.cancel();
      saveGame(this.state);
      this.stack.pop();
      return;
    }
    if (this.input.wasPressed("a")) {
      if (this.state.party.length === 0) {
        audio.cancel();
        return;
      }
      audio.confirm();
      const ministero = MINISTERO_ORDER[this.index];
      this.stack.push(
        new PartyScene(this.stack, this.input, this.state, {
          mode: "use-item",
          title: `Chi nomini ${MINISTERI[ministero].name}?`,
          onChoose: (mon) => {
            // Riselezionare il ministro in carica equivale a sfiduciarlo.
            if (this.state.ministri[ministero] === mon.uid) {
              rimuoviMinistro(this.state, ministero);
            } else {
              assegnaMinistro(this.state, ministero, mon);
            }
            saveGame(this.state);
          }
        })
      );
    }
  }

  draw(screen: Screen): void {
    screen.clear("#2e3a2e");
    screen.text("GOVERNO OMBRA", 8, 5, PAPER);
    const sond = this.state.sondaggi;
    screen.textRight(`SONDAGGI ${sond}%`, VIEW_W - 8, 5, sondaggiColor(sond));

    screen.panel(4, 15, VIEW_W - 8, 102);
    for (let i = 0; i < MINISTERO_ORDER.length; i += 1) {
      const id = MINISTERO_ORDER[i];
      const def = MINISTERI[id];
      const mon = ministroDi(this.state, id);
      const y = 22 + i * 15;
      if (i === this.index) {
        screen.text("►", 10, y, INK);
      }
      screen.text(def.name, 18, y, INK);
      if (mon) {
        const ko = mon.hp <= 0;
        screen.textRight(speciesOf(mon).name, VIEW_W - 14, y, ko ? "#d04848" : "#2a6a3a");
        if (ko) {
          screen.textRight("KO", VIEW_W - 14, y + 7, "#d04848");
        }
      } else {
        screen.textRight("---", VIEW_W - 14, y, GREY);
      }
    }

    const selected = MINISTERI[MINISTERO_ORDER[this.index]];
    screen.panel(4, 119, VIEW_W - 8, 40);
    const lines = wrapText(selected.desc, 36);
    for (let i = 0; i < Math.min(3, lines.length); i += 1) {
      screen.text(lines[i], 12, 127 + i * 10, INK);
    }

    screen.text(`LINEA DEL PARTITO: ${sondaggiLabel(sond)}`, 8, VIEW_H - 18, GREY);
    screen.text("A: nomina/sfiducia  B: chiudi", 8, VIEW_H - 9, GREY);
  }
}
