import type { Input } from "../engine/input";
import type { SceneStack } from "../engine/scene";
import type { GameState } from "../game/state";
import { CampaignChoiceScene } from "../ui/campaignChoices";

export class PhotoChoiceScene extends CampaignChoiceScene {
  constructor(stack: SceneStack, input: Input, state: GameState) {
    super(stack, input, state, "photo");
  }
}
