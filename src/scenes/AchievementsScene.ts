import { ACHIEVEMENTS, isUnlocked, unlockedCount } from "../game/achievements";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { TouchAction } from "../engine/touchActions";
import type { Screen } from "../engine/screen";
import type { GameState } from "../game/state";
import type { UiPanel } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";

export class AchievementsScene implements Scene {
  private filter = 0;
  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  get uiPanel(): UiPanel {
    const done = unlockedCount(this.state);
    const visible = ACHIEVEMENTS.filter(entry => this.filter === 0 || isUnlocked(this.state, entry.id) === (this.filter === 1));
    return {
      title: "Traguardi", subtitle: `${done} di ${ACHIEVEMENTS.length} raggiunti. Il premio viene accreditato quando li sblocchi, una sola volta.`,
      tabs: ["Tutti", "Raggiunti", "Da sbloccare"].map((label, index) => ({ label, run: () => {
        if (this.stack.top !== this) return;
        this.filter = index; this.input.reset(); audio.cursor();
      } })), selectedTab: this.filter,
      blocks: visible.length ? undefined : [{ title: "Ancora da conquistare", body: "Non hai ancora sbloccato traguardi. In Tutti trovi obiettivi e premi." }],
      actions: visible.map((entry): TouchAction => {
        const unlocked = isUnlocked(this.state, entry.id);
        const body = entry.desc.replace(/POLITICMON/g, "Politicmon").replace(/SONDAGGI/g, "sondaggi")
          .replace(/PLEBISCITO/g, "plebiscito").replace(/FICHE/g, "fiche").replace(/CASINÒ/g, "casinò")
          .replace(/DIRETTIVA/g, "direttiva").replace(/MONOPATTINO/g, "monopattino").replace(/RUSPA/g, "ruspa")
          .replace(/SCAMBIO/g, "scambio").replace(/RIVALE GIANNI/g, "rivale Gianni");
        return { label: readableCopy(entry.name), disabled: !unlocked, run: () => {},
          row: { kind: "item", right: `${entry.reward} €`, meta: body, stamp: unlocked ? "Raggiunto" : undefined } };
      }),
      back: { label: "Indietro", run: () => {
        if (this.stack.top !== this) return;
        this.input.reset(); audio.cancel(); this.stack.pop();
      } }
    };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
