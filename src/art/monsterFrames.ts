import { SPECIES } from "../data/species";
import { getSpriteImage } from "../engine/assets";
import type { Screen } from "../engine/screen";

export const ANIMATED_MONSTERS = new Set<string>(Object.keys(SPECIES));
export const MONSTER_FRAME_SIZE = 64;

export function monsterFramesImage(id: string): HTMLImageElement | null {
  if (!ANIMATED_MONSTERS.has(id)) return null;
  const image = getSpriteImage(`mon:frames:${id}`, `monsters/animated/${id}.png`);
  return image?.width === 256 && image.height === 64 ? image : null;
}

export function monsterPoseFrame(time: number, lungeT = 0, reduceEffects = false): number {
  if (reduceEffects) return 0;
  if (lungeT > 0) {
    const progress = 1 - lungeT / .3;
    return progress < .22 || progress > .8 ? 2 : 1;
  }
  return time % 4.2 > 3.94 ? 3 : 0;
}

export function drawMonsterFrame(screen: Screen, image: HTMLImageElement, frame: number, x: number, y: number, w: number, h: number, flipX = false, cropped = false): void {
  const ctx = screen.ctx;
  ctx.save();
  if (flipX) { ctx.translate(Math.round(x) + w, Math.round(y)); ctx.scale(-1, 1); x = 0; y = 0; }
  screen.imageRegion(image, frame * 64, cropped ? 6 : 0, 64, cropped ? 52 : 64, x, y, w, h);
  ctx.restore();
}
