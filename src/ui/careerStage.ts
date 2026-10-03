import { sceneImage } from "../engine/assets";
import type { Screen } from "../engine/screen";

/** The same podium carries the earned candidate through recruitment and evolution. */
export function drawCareerStage(screen: Screen, frame: number): void {
  screen.clear("#101b32");
  const portrait = screen.height > 180;
  const art = portrait ? sceneImage("ui:career-portrait", "ui/evolution-portrait.png") : sceneImage("ui:evolution-stage", "ui/evolution-stage.png");
  const h = portrait ? 360 : 180;
  // The generated lower pair places its podium 35 native pixels higher.
  const offset = portrait && frame >= 2 ? Math.round(screen.height * 35 / 360) : 0;
  if (art) screen.imageRegion(art, frame % 2 * 240, Math.floor(frame / 2) * h, 240, h, 0, offset, 240, screen.height);
}

export function careerPodiumY(height: number): number {
  return height > 180 ? Math.round(height * .57) : 125;
}
