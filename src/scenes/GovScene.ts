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
import { drawScreenHeader, wrapText, MessageBox, GREY, INK } from "../ui/widgets";
import { PartyScene } from "./PartyScene";

// Il GOVERNO OMBRA: ogni Politicmon può ricoprire un ministero con bonus
// passivo. Se il ministro va KO, l'incarico resta ma il bonus si sospende.
export class GovScene implements Scene {
  private index = 0;
  private msg = new MessageBox();

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    // Prima apertura in assoluto: riga guida che spiega la meccanica (hint UX).
    if (!this.state.flags["hint-governo"]) {
      this.state.flags["hint-governo"] = true;
      saveGame(this.state);
      this.msg.show([
        "GOVERNO OMBRA: nomina un POLITICMON della squadra a ogni ministero.",
        "Ogni incarico dà un BONUS passivo ma anche un piccolo COSTO: valuta il netto.",
        "Se il ministro va KO l'effetto si sospende. Rinomina lo stesso = lo sfiduci."
      ]);
    }
  }

  update(dt = 0): void {
    // Riga guida iniziale: fino a che è aperta, blocca il resto.
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
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
    screen.clear("#e5eee2");
    const sond = this.state.sondaggi;
    drawScreenHeader(screen, "GOVERNO OMBRA", `SONDAGGI ${sond}%`, sondaggiColor(sond));

    screen.panel(4, 18, VIEW_W - 8, 99, "card");
    for (let i = 0; i < MINISTERO_ORDER.length; i += 1) {
      const id = MINISTERO_ORDER[i];
      const def = MINISTERI[id];
      const mon = ministroDi(this.state, id);
      const y = 22 + i * 15;
      if (i === this.index) {
        screen.rect(8, y - 3, VIEW_W - 16, 12, "#fff0bd");
        screen.rect(8, y - 3, 2, 12, "#e0a92f");
        screen.text("►", 10, y, "#8c5b12");
      }
      screen.text(def.name, 18, y, INK);
      if (mon) {
        const ko = mon.hp <= 0;
        screen.textRight(`${speciesOf(mon).name}${ko ? " KO" : ""}`, VIEW_W - 14, y, ko ? "#d04848" : "#2a6a3a");
      } else {
        screen.textRight("---", VIEW_W - 14, y, GREY);
      }
    }

    const selected = MINISTERI[MINISTERO_ORDER[this.index]];
    screen.panel(4, 119, VIEW_W - 8, 40, "card");
    // BONUS (verde) + MALUS (rosso): la scelta del ministero è un compromesso.
    const bonus = wrapText(selected.desc, 36);
    const malus = wrapText(selected.malus, 36);
    let ly = 125;
    for (let i = 0; i < Math.min(2, bonus.length); i += 1) {
      screen.text(bonus[i], 12, ly, "#7ad858");
      ly += 8;
    }
    for (let i = 0; i < Math.min(2, malus.length); i += 1) {
      screen.text(malus[i], 12, ly, "#e08a6a");
      ly += 8;
    }

    const selectedMinister = ministroDi(this.state, MINISTERO_ORDER[this.index]);
    if (selectedMinister && selectedMinister.hp <= 0) {
      screen.text("BONUS SOSPESO: MINISTRO KO", 8, VIEW_H - 18, "#d04848");
    } else {
      screen.text(`LINEA: ${sondaggiLabel(sond)}`, 8, VIEW_H - 18, GREY);
    }
    screen.text("A: nomina/sfiducia  B: chiudi", 8, VIEW_H - 9, GREY);
    this.msg.draw(screen);
  }
}
