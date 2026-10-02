import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { claimTechnoReward, newTechnoRun, pressTechno, TECHNO_BEAT_SECONDS, TECHNO_SEQUENCE, TECHNO_WINDOW_SECONDS, technoInWindow, technoPressFeedback, technoReward, tickTechno, type TechnoButton, type TechnoRun } from "../game/genovaTechno";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader } from "../ui/widgets";
import { drawEpilogueBackdrop, drawEpiloguePage } from "../ui/epilogueArt";

const BUTTONS: readonly TechnoButton[] = ["up", "down", "left", "right", "a"];
const LABEL: Record<TechnoButton, string> = { up: "SU", down: "GIÙ", left: "SINISTRA", right: "DESTRA", a: "A" };

export class GenovaTechnoScene implements Scene {
  readonly transparent = false;
  private run: TechnoRun;
  private phase: "ready" | "play" | "pause" | "result" = "ready";
  private paid = { money: 0, sondaggi: 0 };
  private feedback = "";
  private outcomes: boolean[] = [];
  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.run = newTechnoRun(state.reduceEffects);
  }
  update(dt: number): void {
    if (this.phase === "ready") {
      if (this.input.wasPressed("b")) { this.stack.pop(); return; }
      if (this.input.wasPressed("left") || this.input.wasPressed("right")) this.run = newTechnoRun(!this.run.reducedMotion);
      if (this.input.wasPressed("a")) { this.phase = "play"; audio.confirm(); }
      return;
    }
    if (this.phase === "pause") {
      if (this.input.wasPressed("b")) this.stack.pop();
      else if (this.input.wasPressed("a")) this.phase = "play";
      return;
    }
    if (this.phase === "result") {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) this.stack.pop();
      return;
    }
    if (this.input.wasPressed("b")) { this.phase = "pause"; return; }
    const pressed = BUTTONS.find(button => this.input.wasPressed(button));
    const before = this.run;
    if (pressed) {
      this.run = pressTechno(before, pressed);
      this.feedback = technoPressFeedback(before, pressed);
      if (this.run !== before) this.run.hits > before.hits ? audio.confirm() : audio.cancel();
    }
    if (this.run === before) this.run = tickTechno(this.run, dt);
    if (this.feedback === "TROPPO PRESTO: ASPETTA" && technoInWindow(this.run)) this.feedback = "";
    if (!pressed && this.run.misses > before.misses) { this.feedback = "BATTUTA PERSA"; audio.cancel(); }
    if (this.run.index > before.index) this.outcomes.push(this.run.hits > before.hits);
    if (this.run.complete) {
      this.paid = claimTechnoReward(this.state, this.run);
      if (this.paid.money) saveGame(this.state);
      this.phase = "result";
    }
  }
  draw(screen: Screen): void {
    drawEpilogueBackdrop(screen, "techno");
    drawScreenHeader(screen, "GENOVA TECHNO", this.phase === "play" ? `${this.run.index + 1}/6` : this.phase === "result" ? "ESITO" : "PALCO");
    if (this.phase === "ready") {
      const selected = this.run.reducedMotion ? "► SENZA TIMER" : "► A TEMPO";
      drawEpiloguePage(screen, ["ORE 23: IL BEAT SALVA IL PAESE.", "ORE 8: IL CONTABILE SALVA LA FATTURA.", this.run.reducedMotion ? "SEGUI IL TASTO, SENZA SCADENZA." : "PREMI IL TASTO NELLA ZONA VERDE.", "SEI BATTUTE. B METTE IN PAUSA.", "IN PAUSA, B ESCE SENZA PREMIO.", this.state.flags["genova-techno-complete"] ? "ALLENAMENTO: PREMIO GIÀ RITIRATO." : "6 HIT: 1200€; 3-5: 600€; 0-2: 200€.", selected]);
      screen.text("SIN/DES: MODO   A: VIA   B: ESCI", 12, 167, "#fffaf0");
    } else if (this.phase === "pause") {
      drawEpiloguePage(screen, ["PROVA IN PAUSA. IL TEMPO È FERMO.", "A: RIPRENDI LA STESSA BATTUTA.", "B: ESCI SENZA PREMIO.", "IL DJ LA CHIAMA RIFLESSIONE."]);
      screen.text("A: RIPRENDI   B: ESCI", 12, 167, "#fffaf0");
    } else if (this.phase === "result") {
      drawEpiloguePage(screen, [technoReward(this.run.hits).grade, `BATTUTE GIUSTE ${this.run.hits}/6.`, `ACCREDITATI ${this.paid.money}€.`, `SONDAGGI +${this.paid.sondaggi}.`, this.paid.money ? "IL PREMIO NON È RIPETIBILE." : "ALLENAMENTO: NESSUN NUOVO PREMIO.", "I DEBITI NON SEGUONO IL TEMPO."]);
      screen.text("A/B: TORNA AL PORTO", 12, 167, "#fffaf0");
    } else {
      for (let i = 0; i < TECHNO_SEQUENCE.length; i++) {
        const x = 24 + i * 33;
        const color = i < this.run.index ? this.outcomes[i] ? "#55a889" : "#d76d54" : i === this.run.index ? "#ffe38a" : "#42536a";
        screen.rect(x, 24, 28, 13, color);
        screen.textCenter(({left:"SIN",right:"DES",up:"SU",down:"GIÙ",a:"A"} as const)[TECHNO_SEQUENCE[i]], x + 14, 27, i <= this.run.index ? "#17243d" : "#fffaf0");
      }
      screen.panel(40, 43, 160, 52, "card");
      const label = LABEL[TECHNO_SEQUENCE[this.run.index]];
      screen.textCenter(label, 120, 58, "#17243d", label.length > 5 ? 2 : 3);
      screen.rect(16, 104, 208, 42, "#17243d");
      if (this.run.reducedMotion) screen.text("PREMI QUANDO VUOI", 58, 112, "#fffaf0");
      else {
        screen.rect(24, 112, 192, 8, "#68758a");
        const windowWidth = 192 * 2 * TECHNO_WINDOW_SECONDS / TECHNO_BEAT_SECONDS;
        screen.rect(120 - windowWidth / 2, 112, windowWidth, 8, "#55a889");
        screen.rect(24 + 190 * (1 - this.run.remaining / TECHNO_BEAT_SECONDS), 109, 2, 14, "#ffe38a");
        screen.text(technoInWindow(this.run) ? "ORA!" : "ASPETTA", 98, 129, "#fffaf0");
      }
      screen.textCenter(this.feedback || "SEGUI IL TASTO", 120, 149, "#fffaf0");
      screen.text(`GIUSTE ${this.run.hits}  ERRORI ${this.run.misses}  B: PAUSA`, 12, 167, "#fffaf0");
    }
  }
}
