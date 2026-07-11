import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import {
  playerOpponent, roundLabel, COPPA_PLAYER_NAME, COPPA_TITLE, type TournamentState
} from "../game/tournament";
import type { CoppaRule } from "../game/tournament";
import { audio } from "../engine/audio";
import { GREY, INK, PAPER } from "../ui/widgets";

// COPPA DELLE POLTRONE — schermata del TABELLONE. Puramente informativa: mostra
// il round corrente, i partecipanti ancora in gara e chi affronti tu. Premendo
// A (COMBATTI) si chiude e la WorldScene avvia il match del round (callback
// `next`). Con B si esce dal torneo (rinuncia): la tassa resta persa.
export class TournamentScene implements Scene {
  readonly transparent = true;
  private time = 0;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private tourney: TournamentState,
    private next: () => void,
    private abort: () => void,
    private rule?: CoppaRule
  ) {}

  update(dt: number): void {
    this.time += dt;
    if (this.input.wasPressed("a")) {
      audio.confirm();
      this.stack.pop();
      this.next();
      return;
    }
    if (this.input.wasPressed("b")) {
      // Rinuncia: chiude solo la schermata; il torneo resta "in corso" ma senza
      // avanzare — la WorldScene lo abbandona alla prossima interazione. Per non
      // lasciare uno stato ambiguo, trattiamo B come "esci dal torneo".
      audio.cancel();
      this.stack.pop();
      this.abort();
      return;
    }
  }

  draw(screen: Screen): void {
    screen.dim(0.62);
    screen.panel(10, 8, VIEW_W - 20, VIEW_H - 16);
    screen.textCenter("COPPA DELLE POLTRONE", VIEW_W / 2, 14, "#f4d34a");
    screen.textCenter(roundLabel(this.tourney), VIEW_W / 2, 24, PAPER);
    if (this.rule) screen.textCenter(`REGOLA: ${this.rule.name}`, VIEW_W / 2, 31, "#7ad858");
    screen.rect(18, 38, VIEW_W - 36, 1, GREY);

    // Elenco dei partecipanti ancora in gara. Il giocatore è evidenziato.
    const entries = this.tourney.alive;
    const opp = playerOpponent(this.tourney);
    let y = 43;
    screen.text("IN GARA:", 18, y, INK);
    y += 12;
    const col2 = VIEW_W / 2 + 4;
    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i];
      const name = e.isPlayer ? COPPA_PLAYER_NAME : e.ghost?.name ?? "?";
      const x = i % 2 === 0 ? 22 : col2;
      const row = Math.floor(i / 2);
      const ry = y + row * 11;
      const color = e.isPlayer ? "#7ad858" : INK;
      // Puntino: verde per te, grigio per i fantasmi.
      screen.rect(x - 6, ry + 1, 3, 3, e.isPlayer ? "#7ad858" : GREY);
      screen.text(name.slice(0, 16), x, ry, color);
    }
    y += Math.ceil(entries.length / 2) * 11 + 6;

    // Il tuo avversario del round.
    if (opp) {
      screen.rect(18, y, VIEW_W - 36, 1, GREY);
      y += 6;
      // Battito lampeggiante per attirare l'occhio sul match imminente.
      const blink = Math.floor(this.time * 2) % 2 === 0;
      screen.text("IL TUO MATCH:", 18, y, INK);
      screen.text(`${COPPA_PLAYER_NAME} vs ${opp.name}`.slice(0, 26), 18, y + 11, blink ? "#f4d34a" : PAPER);
    }

    // Titolo già conquistato in precedenza.
    if (this.state.coppaWins > 0) {
      screen.text(`${COPPA_TITLE}: ${this.state.coppaWins}`.slice(0, 34), 18, VIEW_H - 36, GREY);
    }
    screen.textCenter("A COMBATTI   B RINUNCIA", VIEW_W / 2, VIEW_H - 24, GREY);
  }
}
