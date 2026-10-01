import { sceneImage } from "../engine/assets";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";

export function drawNetworkBackdrop(screen: Screen): void {
  screen.clear("#112037");
  const image = sceneImage("social:network", "ui/social/network.png");
  if (image) screen.image(image, 0, 17, VIEW_W, VIEW_H - 17);
  screen.dim(0.52);
  screen.rect(0, 155, VIEW_W, 25, "#17243d");
}
