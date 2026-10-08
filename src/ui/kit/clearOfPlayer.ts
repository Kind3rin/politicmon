/** The text of the world screen that lies over the player's square is faded, so the player stays readable under the place name,
 * the objective, the clock, a lesson at the bottom and the labels above people and places. The text stays where it is and stays tappable:
 * `is-over-player` is only a fade (see world.css). The player's square is the one the world reports each frame (`worldPlayerBounds`). */
export const FADED_CLASS = "is-over-player";
const CANDIDATES = ".ui-world-hud :is(.ui-world-location,.ui-world-notice,.ui-world-objective,.ui-world-clock,.ui-save-flash,.ui-world-lesson,.ui-world-nav), .ui-world-labels > span";

interface PlayerBounds { x: number; y: number; w: number; h: number; viewHeight: number }

export function keepPlayerClear(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("canvas");
  const raw = canvas?.dataset.worldPlayerBounds;
  if (!canvas || !raw || !document.body.classList.contains("ui-world-open")) {
    document.querySelectorAll(`.${FADED_CLASS}`).forEach(el => el.classList.remove(FADED_CLASS));
    return;
  }
  const b = JSON.parse(raw) as PlayerBounds;
  const c = canvas.getBoundingClientRect();
  const left = c.left + b.x / 240 * c.width, right = c.left + (b.x + b.w) / 240 * c.width;
  const top = c.top + b.y / b.viewHeight * c.height, bottom = c.top + (b.y + b.h) / b.viewHeight * c.height;
  for (const el of document.querySelectorAll<HTMLElement>(CANDIDATES)) {
    const r = el.getBoundingClientRect();
    const hit = r.width > 0 && r.height > 0 && r.left < right && r.right > left && r.top < bottom && r.bottom > top;
    if (el.classList.contains(FADED_CLASS) !== hit) el.classList.toggle(FADED_CLASS, hit);
  }
}
