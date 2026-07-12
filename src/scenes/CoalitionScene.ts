import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { ALLY_CATALOG, addAlly, removeAlly, type AllyId } from "../game/coalition";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader } from "../ui/widgets";

const R1_CANDIDATES: readonly AllyId[] = ["campo_secretary", "quantum_centrist", "civic_mayor"];
const LABELS: Readonly<Record<AllyId, { name: string; lineRed: string; photoRisk: string }>> = {
  campo_secretary: { name: "SEGRETARIA DEL CAMPO", lineRed: "AUTONOMIA", photoRisk: "NESSUNO" },
  quantum_centrist: { name: "CENTRISTA QUANTICO", lineRed: "POLARIZZAZIONE", photoRisk: "PANORAMICA" },
  steel_governor: { name: "GOVERNATRICE D'ACCIAIO", lineRed: "CAMPO LARGO", photoRisk: "PANORAMICA" },
  civic_mayor: { name: "SINDACA CIVICA", lineRed: "PARTITI NAZIONALI", photoRisk: "NESSUNO" },
  generorso: { name: "GENERORSO", lineRed: "RIASSORBIMENTO", photoRisk: "PANORAMICA" }
};

const EFFECT_TEXT: Readonly<Record<AllyId, { bonus: string; cost: string }>> = {
  campo_secretary: { bonus: "CONSENSO LOCALE +10%", cost: "FONDI OTTENUTI -6%" },
  quantum_centrist: { bonus: "PREZZI NEGOZI -10%", cost: "SONDAGGI -6%" },
  steel_governor: { bonus: "FONDI OTTENUTI +10%", cost: "CONSENSO LOCALE -6%" },
  civic_mayor: { bonus: "SONDAGGI +10%", cost: "PREZZI NEGOZI +6%" },
  generorso: { bonus: "FONDI OTTENUTI +10%", cost: "PREZZI NEGOZI +6%" }
};

export class CoalitionScene implements Scene {
  readonly transparent = true;
  private index: number;
  private notice = "A: SCEGLI  B: ESCI";
  private pendingRemove: AllyId | null = null;

  constructor(private stack: SceneStack, private input: Input, private state: GameState, focus: AllyId) {
    this.index = Math.max(0, R1_CANDIDATES.indexOf(focus));
  }

  update(): void {
    if (this.input.wasPressed("left") || this.input.wasPressed("up")) {
      this.index = (this.index + R1_CANDIDATES.length - 1) % R1_CANDIDATES.length;
      this.pendingRemove = null;
      audio.cursor();
    }
    if (this.input.wasPressed("right") || this.input.wasPressed("down")) {
      this.index = (this.index + 1) % R1_CANDIDATES.length;
      this.pendingRemove = null;
      audio.cursor();
    }
    if (this.input.wasPressed("b")) {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (!this.input.wasPressed("a")) return;
    const allyId = R1_CANDIDATES[this.index];
    if (!this.state.flags[`coalition-candidate-seen:${allyId}`]) {
      audio.cancel();
      this.notice = "PARLACI PRIMA NEL CAMPO";
      return;
    }
    const selected = this.state.coalition.members.some((member) => member.allyId === allyId);
    if (selected) {
      if (this.pendingRemove !== allyId) {
        this.pendingRemove = allyId;
        audio.cursor();
        this.notice = "A ANCORA: RIMUOVI  B: ANNULLA";
        return;
      }
      const result = removeAlly(this.state.coalition, allyId);
      if (result.ok) {
        this.state.coalition = result.state;
        this.pendingRemove = null;
        saveGame(this.state);
        audio.cancel();
        this.notice = "CANDIDATO RIMOSSO";
      }
      return;
    }
    if (this.state.coalition.members.length >= 2) {
      audio.cancel();
      this.notice = "R1: MASSIMO DUE POSTI";
      return;
    }
    const result = addAlly(this.state.coalition, allyId);
    if (!result.ok) {
      audio.cancel();
      this.notice = result.error.toUpperCase();
      return;
    }
    this.state.coalition = result.state;
    saveGame(this.state);
    audio.confirm();
    this.notice = "CANDIDATO INSERITO";
  }

  draw(screen: Screen): void {
    // Overlay opaco: l'HUD missione del mondo non deve competere con testi e
    // conferme della scelta coalizione.
    screen.rect(0, 17, 240, 163, "#10141f");
    drawScreenHeader(screen, "COALIZIONE R1", `SLOT ${this.state.coalition.members.length}/2`);
    const allyId = R1_CANDIDATES[this.index];
    const definition = ALLY_CATALOG[allyId];
    const member = this.state.coalition.members.find((candidate) => candidate.allyId === allyId);
    const seen = Boolean(this.state.flags[`coalition-candidate-seen:${allyId}`]);
    const status = member ? "NELLA COALIZIONE" : "FUORI DALLA FOTO";
    screen.panel(8, 27, 224, 108, "card");
    if (member) {
      screen.frame(10, 29, 220, 104, "#e6b944");
      screen.rect(12, 31, 4, 100, "#e6b944");
    }
    // La barra piena identifica sempre la scheda attualmente sfogliata. Il
    // vecchio filetto verticale era troppo simile a una decorazione del frame.
    screen.rect(14, 32, 212, 18, seen ? "#f4d34a" : "#d7dbe5");
    screen.textFit(seen ? LABELS[allyId].name : "CANDIDATO NON INCONTRATO", 18, 37, 145, "#10141f");
    screen.textRight(member ? "SCELTA" : "IN ESAME", 220, 37, member ? "#26745d" : "#70470e");
    if (!seen) {
      screen.text("PARLACI NEL CAMPO", 18, 62, "#5f6d8a");
      screen.text("PER SCOPRIRE EFFETTI E RISCHI.", 18, 78, "#5f6d8a");
      screen.text("◄ ► CAMBIA", 12, 141, "#fffaf0");
      screen.text(this.notice, 12, 156, "#ffe38a");
      return;
    }
    screen.textFit(`${definition.tag.toUpperCase()} - ${status}`, 18, 55, 204, member ? "#26745d" : "#5f6d8a");
    screen.text("VANTAGGIO", 18, 72, "#26745d");
    screen.textFit(EFFECT_TEXT[allyId].bonus, 96, 72, 126, "#26745d");
    screen.text("COSTO", 18, 87, "#a0443e");
    screen.textFit(EFFECT_TEXT[allyId].cost, 96, 87, 126, "#a0443e");
    screen.text("LINEA ROSSA", 18, 102, "#70470e");
    screen.textFit(LABELS[allyId].lineRed, 96, 102, 126, "#70470e");
    screen.text("RISCHIO FOTO", 18, 117, "#70470e");
    screen.textFit(LABELS[allyId].photoRisk, 96, 117, 126, LABELS[allyId].photoRisk === "NESSUNO" ? "#26745d" : "#a0443e");
    screen.text("◄ ► CAMBIA", 12, 141, "#fffaf0");
    const footer = this.pendingRemove === allyId
      ? this.notice
      : member ? "A: RIMUOVI  B: ESCI" : this.notice;
    screen.text(footer, 12, 156, this.pendingRemove === allyId ? "#ffb0a8" : "#ffe38a");
  }
}
