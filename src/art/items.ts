import { BAG_ORDER } from "../data/items";
import type { Screen } from "../engine/screen";
import { getSpriteImage } from "../engine/assets";

// Item Round 39 senza PNG PixelLab (ancora): niente path = niente 404 in console.
const NO_PNG = new Set<string>([
  "gilet", "telecamera", "sondtruccato", "caffettiera", "agendarossa", "santino", "spray", "rimborso"
]);
const ITEMS_WITH_PNG = new Set<string>(BAG_ORDER.filter((id) => !NO_PNG.has(id)));

export const ITEM_ICON_SIZE = 12;

export function itemIconPath(itemId: string): string | null {
  if (!ITEMS_WITH_PNG.has(itemId)) {
    return null;
  }
  return `items/${itemId}.png`;
}

export function itemIconKey(itemId: string): string {
  return `item:${itemId}`;
}

function itemImage(itemId: string): HTMLImageElement | null {
  const path = itemIconPath(itemId);
  if (!path) {
    return null;
  }
  return getSpriteImage(itemIconKey(itemId), path);
}

export function drawItemIcon(screen: Screen, itemId: string, x: number, y: number, size = ITEM_ICON_SIZE): void {
  const png = itemImage(itemId);
  if (!png) {
    return;
  }
  const s = Math.min(size / png.width, size / png.height);
  const dw = png.width * s;
  const dh = png.height * s;
  screen.imageSprite(png, x + (size - dw) / 2, y + (size - dh) / 2, { scaleX: s, scaleY: s });
}
