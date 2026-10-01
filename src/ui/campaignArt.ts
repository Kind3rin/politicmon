import { sceneImage } from "../engine/assets";
import type { Screen } from "../engine/screen";

export function drawCampaignBackdrop(screen: Screen, kind: string): void {
  screen.clear("#17243d");
  const image = sceneImage(`campaign:${kind}`, `ui/campaign/${kind}.png`);
  if (image) screen.image(image, 0, 17, 240, 163);
  screen.dim(0.28);
  screen.rect(0, 161, 240, 19, "#17243d");
}
