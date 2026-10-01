import { sceneImage } from "../engine/assets";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";

export type HqIcon = "campaign" | "identity" | "audio" | "backup" | "mission" | "warehouse";

export function drawHqIcon(screen: Screen, id: HqIcon, x: number, y: number, size = 16): void {
  const image = sceneImage(`hq:${id}`, `ui/hq/${id}.png`);
  if (image) screen.image(image, x, y, size, size);
}

export function drawHqBackdrop(screen: Screen, id: "box" | "missions" | "saves"): void {
  screen.clear("#18243a");
  const image = sceneImage(`hq:${id}`, `ui/hq/${id}.png`);
  if (image) screen.image(image, 0, 17, VIEW_W, VIEW_H - 17);
}
