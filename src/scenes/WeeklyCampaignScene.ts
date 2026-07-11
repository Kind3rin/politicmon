import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { claimWeeklyReward, resolveWeeklyStage, startWeeklyCampaign, weeklyReward, weeklySchedule } from "../game/weeklyCampaign";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader, wrapText } from "../ui/widgets";
import { grantSeasonalForm, memeForm } from "../game/memeForms";

export class WeeklyCampaignScene implements Scene {
  readonly transparent = false;
  private choice = 0;
  private claimedFormId = "";

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private onDebate: (index: number) => void) {
    state.weeklyCampaign = startWeeklyCampaign(state.weeklyCampaign);
    saveGame(state);
  }

  update(): void {
    if (this.input.wasPressed("b")) { this.stack.pop(); return; }
    const weekly = this.state.weeklyCampaign;
    if (weekly.phase === "complete") { if (this.input.wasPressed("a")) this.claimAndExit(); return; }
    const stage = weeklySchedule(weekly)[weekly.cursor]; if (!stage) return;
    if (stage.kind === "event" && (this.input.wasPressed("up") || this.input.wasPressed("down"))) { this.choice = 1 - this.choice; audio.cursor(); }
    if (!this.input.wasPressed("a")) return;
    if (stage.kind === "event" && stage.event) {
      const selected = stage.event.choices[this.choice];
      this.state.weeklyCampaign = resolveWeeklyStage(weekly, selected.label, selected.delta); saveGame(this.state); audio.confirm(); this.choice = 0;
    } else if (stage.kind === "debate") {
      this.stack.pop(); this.onDebate(stage.debateIndex ?? 1);
    } else {
      this.state.weeklyCampaign = resolveWeeklyStage(weekly, "finale", 0); saveGame(this.state); audio.catchJingle();
    }
  }

  private claimAndExit(): void {
    const before = this.state.weeklyCampaign;
    const after = claimWeeklyReward(before);
    if (after !== before) {
      const reward = weeklyReward(before); this.state.money += reward.money;
      this.state.bag.schedona = (this.state.bag.schedona ?? 0) + reward.ballots;
      if (before.score >= 8) {
        const formReward = grantSeasonalForm(this.state.party, this.state.unlockedMemeForms);
        this.state.unlockedMemeForms = formReward.unlocked;
        this.claimedFormId = formReward.formId ?? "";
      }
      this.state.weeklyCampaign = after; saveGame(this.state); audio.catchJingle();
    }
    this.stack.pop();
  }

  draw(screen: Screen): void {
    screen.clear("#10141f"); const weekly = this.state.weeklyCampaign;
    drawScreenHeader(screen, "CAMPAGNA SETTIMANALE", `${weekly.weekKey || "NUOVA"} ${Math.min(weekly.cursor, 9)}/9`);
    screen.text(`CONSENSO RUN ${weekly.score >= 0 ? "+" : ""}${weekly.score}`, 8, 23, weekly.score >= 3 ? "#63c99f" : "#ffe38a");
    if (weekly.phase === "complete") {
      const reward = weeklyReward(weekly);
      screen.panel(8, 40, 224, 104, "dialog");
      screen.text("FINALE SETTIMANALE", 17, 54, "#10141f");
      screen.text(`RISULTATO ${weekly.score >= 8 ? "TRIONFO" : weekly.score >= 3 ? "IN ONDA" : "RESISTENZA"}`, 17, 73, "#26745d");
      screen.text(`PREMIO ${reward.money}€`, 17, 93, "#10141f");
      screen.text(`SCHEDE BLINDATE x${reward.ballots}`, 17, 108, "#10141f");
      const form = memeForm(this.claimedFormId);
      if (form) screen.text(`FORMA: ${form.name}`, 17, 119, form.accent);
      screen.text(weekly.rewardClaimed ? "PREMIO GIÀ RISCOSSO" : "TRIONFO: FORMA MEME SE IDONEO", 17, 131, "#a46b12"); return;
    }
    const stage = weeklySchedule(weekly)[weekly.cursor]; if (!stage) return;
    if (stage.kind === "event" && stage.event) {
      screen.text(stage.event.title, 10, 43, "#ffe38a");
      let y = 58; for (const line of wrapText(stage.event.text, 35)) { screen.text(line, 10, y, "#e7ebf2"); y += 10; }
      stage.event.choices.forEach((item, index) => {
        const cy = 96 + index * 25; screen.panel(8, cy, 224, 21, "card");
        if (this.choice === index) screen.frame(9, cy + 1, 222, 19, "#e6b944");
        screen.text(`${this.choice === index ? "► " : "  "}${item.label}`, 15, cy + 7, "#10141f");
        screen.textRight(`${item.delta >= 0 ? "+" : ""}${item.delta}`, 222, cy + 7, item.delta >= 0 ? "#26745d" : "#a0443e");
      });
    } else if (stage.kind === "debate") {
      screen.panel(8, 43, 224, 94, "dialog"); screen.text(`DIBATTITO ${stage.debateIndex}/3`, 18, 57, "#10141f");
      screen.text("VITTORIA +4", 18, 79, "#26745d"); screen.text("SCONFITTA -2", 18, 94, "#a0443e");
      screen.text("A: VAI IN DIRETTA", 18, 119, "#a46b12");
    } else {
      screen.panel(8, 43, 224, 94, "dialog"); screen.text("FINALE DELLA SETTIMANA", 18, 58, "#10141f");
      screen.text("5 EVENTI E 3 DIBATTITI", 18, 80, "#10141f"); screen.text("SONO ORA NEL VERBALE.", 18, 95, "#10141f");
      screen.text("A: CHIUDI LO SCRUTINIO", 18, 119, "#a46b12");
    }
    screen.text("B: SALVA ED ESCI", 10, 162, "#ffe38a");
  }
}
