import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { ALLY_CATALOG, ALLY_NAMES, addAlly, coalitionBonuses, removeAlly, type AllyId } from "../game/coalition";
import { redeemCoalitionRepair, signed } from "../game/campaignDecisions";
import { saveGame, type GameState } from "../game/state";
import { coalitionChannelLabel, drawScreenHeader, wrapText } from "../ui/widgets";
import { drawCampaignBackdrop } from "../ui/campaignArt";
import { sceneImage } from "../engine/assets";

const R1_CANDIDATES: readonly AllyId[] = ["campo_secretary", "quantum_centrist", "civic_mayor"];
const LABELS: Readonly<Record<AllyId, { lineRed: string }>> = {
  campo_secretary: { lineRed: "AUTONOMIA" },
  quantum_centrist: { lineRed: "POLARIZZAZIONE" },
  steel_governor: { lineRed: "CAMPO LARGO" },
  civic_mayor: { lineRed: "PARTITI NAZIONALI" },
  generorso: { lineRed: "RIASSORBIMENTO" }
};

export class CoalitionScene implements Scene {
  readonly transparent = false;
  private index: number;
  private candidates: readonly AllyId[];
  private totals = false;
  private notice = "A: SCEGLI  B: ESCI";
  private pendingRemove: AllyId | null = null;

  constructor(private stack: SceneStack, private input: Input, private state: GameState, focus: AllyId) {
    this.candidates = [...new Set([...R1_CANDIDATES, focus, ...state.coalition.members.map(m => m.allyId)])];
    this.index = Math.max(0, this.candidates.indexOf(focus));
  }

  update(): void {
    if (this.input.wasPressed("start")) { this.totals = !this.totals; audio.cursor(); return; }
    if (this.totals) { if (this.input.wasPressed("a") || this.input.wasPressed("b")) this.totals = false; return; }
    if (this.input.wasPressed("left") || this.input.wasPressed("up")) {
      this.index = (this.index + this.candidates.length - 1) % this.candidates.length;
      this.pendingRemove = null;
      audio.cursor();
    }
    if (this.input.wasPressed("right") || this.input.wasPressed("down")) {
      this.index = (this.index + 1) % this.candidates.length;
      this.pendingRemove = null;
      audio.cursor();
    }
    if (this.input.wasPressed("b")) {
      audio.cancel();
      if (this.pendingRemove) { this.pendingRemove = null; this.notice = "RIMOZIONE ANNULLATA"; return; }
      this.stack.pop();
      return;
    }
    if (!this.input.wasPressed("a")) return;
    const allyId = this.candidates[this.index];
    if (redeemCoalitionRepair(this.state, allyId)) {
      saveGame(this.state); audio.confirm(); this.notice = "BUONO USATO: PATTO RIPARATO"; return;
    }
    if (!this.state.flags[`coalition-candidate-seen:${allyId}`] && !this.state.coalition.members.some(m => m.allyId === allyId)) {
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
    drawCampaignBackdrop(screen, "coalition");
    drawScreenHeader(screen, "TAVOLO DELLE ALLEANZE", `${this.state.coalition.members.length} ALLEATI`);
    if (this.totals) {
      const values = coalitionBonuses(this.state.coalition);
      screen.panel(8, 25, 224, 132, "card");
      screen.text("EFFETTI NETTI DELLA COALIZIONE", 18, 36, "#17243d");
      const channels = ["funds", "sondaggiGain", "territoryGain", "shopPrice"] as const;
      channels.forEach((channel, i) => {
        const net = values.bonus[channel] + values.malus[channel];
        screen.text(coalitionChannelLabel(channel), 18, 56 + i * 16, "#17243d");
        screen.textRight(`${signed(channel === "shopPrice" ? -net : net)}%`, 220, 56 + i * 16, "#26745d");
      });
      screen.text("INCLUSO IL BONUS DELL'ASSETTO.", 18, 124, "#17243d");
      screen.text("COE: EXP +8% A 70, -8% SOTTO 30.", 18, 139, "#17243d");
      screen.text("A/B TORNA · START CHIUDI", 8, 167, "#ffe38a");
      return;
    }
    const allyId = this.candidates[this.index], definition = ALLY_CATALOG[allyId];
    const member = this.state.coalition.members.find(m => m.allyId === allyId);
    const seen = Boolean(member || this.state.flags[`coalition-candidate-seen:${allyId}`]);
    screen.panel(8, 25, 224, 20, "card");
    screen.text(seen ? ALLY_NAMES[allyId] : "CANDIDATO NON INCONTRATO", 16, 32, "#17243d");
    const cast = ({ campo_secretary: "campo-secretary", quantum_centrist: "quantum-centrist", civic_mayor: "civic-mayor" } as Partial<Record<AllyId, string>>)[allyId];
    if (seen && cast) {
      const portrait = sceneImage(`campo:${cast}`, `chars/npc_${cast}_south.png`);
      if (portrait) screen.image(portrait, 20, 66, 48, 64);
    }
    screen.panel(86, 51, 146, 106, "card");
    const status = !seen ? "PARLACI NEL CAMPO" : !member ? "CANDIDATO LIBERO" : member.status === "strained"
      ? "PATTO TESO" : member.status === "reconciled" ? "PATTO RIPARATO" : "PATTO ATTIVO";
    screen.text(status, 94, 60, member?.status === "strained" ? "#a0443e" : "#26745d");
    if (seen) {
      const power = member?.status === "strained" ? 5 : member?.status === "reconciled" ? 7.5 : 10;
      const bonus = `${coalitionChannelLabel(definition.bonus)} ${definition.bonus === "shopPrice" ? "-" : "+"}${power}%`;
      const cost = `${coalitionChannelLabel(definition.malus)} ${definition.malus === "shopPrice" ? "+" : "-"}6%`;
      screen.text("CONTRIBUTO PERSONALE", 94, 76, "#17243d");
      screen.text(bonus, 94, 89, "#26745d");
      screen.text(cost, 94, 102, "#a0443e");
      screen.text("NON ACCETTA:", 94, 118, "#70470e");
      wrapText(LABELS[allyId].lineRed, 21).forEach((line, i) => screen.text(line, 94, 131 + i * 10, "#70470e"));
    }
    screen.rect(8, 141, 73, 16, "#17243d");
    screen.text(`${this.index + 1}/${this.candidates.length} ◄ ►`, 14, 145, "#fffaf0");
    const pending = this.pendingRemove === allyId;
    const m = member, key = m ? `${allyId}:v${m.violationCount}` : "";
    const repair = m?.status === "strained" && !m.reconciliationSpent && this.state.flags[`reconcile-token:${key}`] && !this.state.flags[`reconcile-used:${key}`];
    if (this.notice !== "A: SCEGLI  B: ESCI" && !pending) {
      screen.panel(8, 137, 224, 20, "card");
      screen.text(this.notice, 16, 144, "#17243d");
    }
    const footer = pending ? "A RIMUOVI · B ANNULLA" : repair ? "A USA BUONO · B ESCI"
      : member ? "A RIMUOVI · B ESCI" : "A SCEGLI · B ESCI";
    screen.text(`${footer} · START EFFETTI`, 8, 167, pending ? "#ffb0a8" : "#ffe38a");
  }
}
