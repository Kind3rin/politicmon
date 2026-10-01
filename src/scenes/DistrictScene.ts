import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { ALLY_CATALOG, ALLY_NAMES, coalitionBonuses, type AllyId } from "../game/coalition";
import { DISTRICT_CONTENT, districtActionCount, resolveDistrictEndorsement, resolveDistrictPromise } from "../game/districtCampaign";
import { applyTerritoryGain, DISTRICT_CATALOG, endorsementDelta, type DistrictId } from "../game/election";
import { saveGame, type GameState } from "../game/state";
import { changeMorale } from "../game/morale";
import { drawScreenHeader } from "../ui/widgets";
import { drawCampaignBackdrop } from "../ui/campaignArt";

export class DistrictScene implements Scene {
  readonly transparent = false;
  private index = 0;
  private allyIndex = 0;
  private notice = "SU/GIU SCEGLI · A OK · B ESCI";

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private districtId: DistrictId, private onDebate: () => void) {}

  update(): void {
    if (this.input.wasPressed("b")) { this.stack.pop(); return; }
    if (this.input.wasPressed("up")) { this.index = (this.index + 3) % 4; audio.cursor(); }
    if (this.input.wasPressed("down")) { this.index = (this.index + 1) % 4; audio.cursor(); }
    const allies = this.state.coalition.members.map((member) => member.allyId);
    if (this.index === 3 && allies.length && (this.input.wasPressed("left") || this.input.wasPressed("right"))) {
      this.allyIndex = (this.allyIndex + (this.input.wasPressed("left") ? allies.length - 1 : 1)) % allies.length; audio.cursor();
    }
    if (!this.input.wasPressed("a")) return;
    if (districtActionCount(this.state.election, this.districtId) >= 2) { this.notice = "COLLEGIO CHIUSO: DUE AZIONI SU DUE"; audio.cancel(); return; }
    const district = this.state.election.districts.find((item) => item.id === this.districtId)!;
    if (this.index === 0) {
      if (district.outcomes.some((outcome) => outcome.action === "debate")) { this.notice = "DIBATTITO GIÀ SVOLTO"; audio.cancel(); return; }
      this.stack.pop(); this.onDebate(); return;
    }
    if (this.index === 1 || this.index === 2) {
      const result = resolveDistrictPromise(this.state.election, this.state.coalition, this.state.money, this.districtId, this.index === 2);
      if (!result.ok) { this.notice = result.error === "insufficient_funds" ? "FONDI INSUFFICIENTI" : "PROMESSA NON DISPONIBILE"; audio.cancel(); return; }
      this.state.election = result.election; this.state.coalition = result.coalition; this.state.money = result.money;
      const cost = result.strained.length * 8 + result.broken.length * 16;
      if (cost) changeMorale(this.state, "PROMESSA: PATTI DISATTESI", 0, -cost);
      for (const id of result.broken) this.state.flags[`coalition-broken:${id}`] = true;
      this.notice = result.strained.length || result.broken.length ? `TESE ${result.strained.length} · ROTTE ${result.broken.length}` : "PROMESSA REGISTRATA";
    } else {
      const allyId = allies[this.allyIndex] as AllyId | undefined;
      if (!allyId) { this.notice = "NESSUN ALLEATO DISPONIBILE"; audio.cancel(); return; }
      const result = resolveDistrictEndorsement(this.state.election, this.state.coalition, this.districtId, allyId);
      if (!result.ok) { this.notice = "ALLEATO GIÀ USATO O AZIONE CHIUSA"; audio.cancel(); return; }
      this.state.election = result.election; this.notice = "SOSTEGNO REGISTRATO";
    }
    if (districtActionCount(this.state.election, this.districtId) >= 2) {
      this.state.flags[`district-complete:${this.districtId}`] = true;
      this.state.flags[`district-dossier:${this.districtId}`] = true;
    }
    if (this.state.election.phase === "ready") this.state.flags.tourComplete = true;
    saveGame(this.state); audio.confirm();
  }

  draw(screen: Screen): void {
    drawCampaignBackdrop(screen, "coalition");
    const content = DISTRICT_CONTENT[this.districtId];
    const district = this.state.election.districts.find((item) => item.id === this.districtId)!;
    drawScreenHeader(screen, content.name, `${district.localConsensus}% · ${districtActionCount(this.state.election, this.districtId)}/2`);
    screen.rect(8, 20, 224, 12, "#17243d");
    screen.text(content.problem, 10, 23, "#ffe38a");
    const rule = DISTRICT_CATALOG[this.districtId];
    const allies = this.state.coalition.members.map((member) => member.allyId);
    const ally = allies[this.allyIndex];
    const bonuses = coalitionBonuses(this.state.coalition);
    const modifier = { bonusPercent: bonuses.bonus.territoryGain, malusPercent: bonuses.malus.territoryGain };
    const prudent = resolveDistrictPromise(this.state.election, this.state.coalition, this.state.money, this.districtId, false);
    const risky = resolveDistrictPromise(this.state.election, this.state.coalition, Math.max(this.state.money, rule.riskyCost), this.districtId, true);
    const actualGain = (result: typeof prudent) => result.ok ? result.election.districts.find(d => d.id === this.districtId)!.localConsensus - district.localConsensus : 0;
    const prudentGain = actualGain(prudent), riskyGain = actualGain(risky);
    const clampGain = (delta: number) => Math.max(0, Math.min(100, district.localConsensus + applyTerritoryGain(delta, modifier))) - district.localConsensus;
    const endorsementGain = ally ? clampGain(endorsementDelta(this.districtId, ALLY_CATALOG[ally].tag)) : 0;
    const allyLabel = ally ? ALLY_NAMES[ally] : "NESSUNO";
    const riskCost = risky.ok ? Math.min(this.state.morale.cohesion, risky.strained.length * 8 + risky.broken.length * 16) : 0;
    const rows = [
      ["DIBATTITO", `VITTORIA +${clampGain(8)} / SCONFITTA ${clampGain(-4)}`],
      [content.prudent, `+${prudentGain} LOC. · GRATIS`],
      [content.risky, `+${riskyGain} LOC. · ${rule.riskyCost}€ · COE -${riskCost}`],
      ["SOSTEGNO ◄►", ally ? `${allyLabel} ${endorsementGain >= 0 ? "+" : ""}${endorsementGain}` : "NESSUNO"]
    ];
    rows.forEach(([label, value], i) => {
      const y = 36 + i * 29;
      screen.panel(8, y, 224, 27, "card");
      const selected = this.index === i;
      if (selected) screen.rect(12, y + 3, 216, 10, "#f4d34a");
      screen.text(label, 15, y + 5, "#10141f");
      screen.text(value, 15, y + 17, i === 2 ? "#a0443e" : "#26745d");
    });
    screen.rect(0, 152, 240, 28, "#17243d");
    screen.text(this.notice === "SU/GIU SCEGLI · A OK · B ESCI" ? this.index === 3 ? "◄ ► CAMBIA ALLEATO" : "DUE AZIONI PER COLLEGIO" : this.notice, 8, 156, "#fffaf0");
    screen.text("SU/GIU SCEGLI · A OK · B ESCI", 8, 169, "#ffe38a");
  }
}
