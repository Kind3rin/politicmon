import type { Input } from "../engine/input";
import type { SceneStack } from "../engine/scene";
import type { GameState } from "../game/state";
import { CampaignChoiceScene } from "../ui/campaignChoices";
import type { DiplomacyChoice } from "../game/diplomacyChapter";

export class DiplomacyChoiceScene extends CampaignChoiceScene {
  constructor(stack: SceneStack, input: Input, state: GameState, initial: DiplomacyChoice) {
    super(stack, input, state, "diplomacy", ["loyalty", "autonomy", "home"].indexOf(initial));
  }
}
