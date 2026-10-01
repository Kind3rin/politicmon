import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { claimTechnoReward, newTechnoRun, pressTechno, TECHNO_BEAT_SECONDS, TECHNO_SEQUENCE, TECHNO_WINDOW_SECONDS, technoInWindow, technoReward, tickTechno, type TechnoButton, type TechnoRun } from "../game/genovaTechno";
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
      this.feedback = this.run === before ? "ASPETTA LA ZONA VERDE" : this.run.hits > before.hits ? "A TEMPO!" : "FUORI TEMPO";
      if (this.run !== before) this.run.hits > before.hits ? audio.confirm() : audio.cancel();
    }
    if (this.run === before) this.run = tickTechno(this.run, dt);
    if (!pressed && this.run.misses > before.misses) { this.feedback = "BATTUTA PERSA"; audio.cancel(); }
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
      drawEpiloguePage(screen, ["IL PODIO È DIVENTATO UN DJ SET.", "IL MODERATORE CHIEDE AL BASSO", "DI RISPETTARE IL CONTRADDITTORIO.", this.run.reducedMotion ? "SEGUI IL TASTO, SENZA SCADENZA." : "PREMI IL TASTO NELLA ZONA VERDE.", "SEI BATTUTE. PREMIO UNA SOLA VOLTA.", this.state.flags["genova-techno-complete"] ? "PREMIO GIÀ RITIRATO: ALLENAMENTO." : "6 HIT: 1200€; 3-5: 600€; 0-2: 200€.", selected]);
      screen.text("SIN/DES: MODO   A: VIA   B: ESCI", 12, 167, "#fffaf0");
    } else if (this.phase === "pause") {
      drawEpiloguePage(screen, ["PROVA IN PAUSA. IL TEMPO È FERMO.", "A: RIPRENDI LA STESSA BATTUTA.", "B: ESCI SENZA PREMIO.", "IL DJ CHIAMA QUESTA PAUSA UN DROP.", "IL PORTAVOCE: UNA RIFLESSIONE."]);
      screen.text("A: RIPRENDI   B: ESCI", 12, 167, "#fffaf0");
    } else if (this.phase === "result") {
      drawEpiloguePage(screen, [technoReward(this.run.hits).grade, `BATTUTE GIUSTE ${this.run.hits}/6.`, `ACCREDITATI ${this.paid.money}€.`, `SONDAGGI +${this.paid.sondaggi}.`, this.paid.money ? "IL PREMIO NON È RIPETIBILE." : "ALLENAMENTO: NESSUN NUOVO PREMIO.", "IL VERBALE REGISTRA SEI INTERVENTI.", "NESSUNO HA CHIESTO UN EMENDAMENTO."]);
      screen.text("A/B: TORNA AL PORTO", 12, 167, "#fffaf0");
    } else {
      screen.panel(40, 30, 160, 65, "card");
      const label = LABEL[TECHNO_SEQUENCE[this.run.index]];
      screen.textCenter(label, 120, 48, "#17243d", label.length > 5 ? 2 : 3);
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
