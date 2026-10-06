/** A back wall for the rooms that have none drawn: wallpaper, wainscot, crown moulding, windows and the daylight they let in. */
import { terrainHash } from "./terrainRenderer";

export const WALL_HEIGHT = 30;

interface Tone { wall: string; stripe: string; wainscot: string; trim: string; rail: string }
const TONES: readonly Tone[] = [
  { wall: "#c4a678", stripe: "#b99b6d", wainscot: "#7c5a3c", trim: "#e3cfa4", rail: "#a87f56" }, // warm plaster
  { wall: "#8fa88f", stripe: "#839d84", wainscot: "#4c6650", trim: "#c5d6c0", rail: "#6a8a6d" }, // sage
  { wall: "#44547c", stripe: "#3c4b72", wainscot: "#232f4e", trim: "#8c9cc4", rail: "#34436a" }, // navy
  { wall: "#85414b", stripe: "#7a3a44", wainscot: "#4a2128", trim: "#c78a8f", rail: "#6a2f38" }, // burgundy
  { wall: "#76889e", stripe: "#6c7e94", wainscot: "#3e4c60", trim: "#bccadb", rail: "#586a80" }, // slate
  { wall: "#cfc3a4", stripe: "#c3b794", wainscot: "#8a7a58", trim: "#efe6cb", rail: "#a89870" } // cream
];

export function wallTone(mapId: string): Tone {
  return TONES[terrainHash(mapId, 3, 7) % TONES.length];
}

/** `daylight` is 0 at night and 1 at noon: the windows show it, and the beams on the floor follow. */
export function drawInteriorWall(ctx: CanvasRenderingContext2D, room: { x: number; y: number; w: number; h: number }, camX: number, camY: number, mapId: string, daylight: number, time: number, reduced: boolean): void {
  const tone = wallTone(mapId);
  const x0 = Math.round(room.x - camX), top = Math.round(room.y - camY) - WALL_HEIGHT, bottom = top + WALL_HEIGHT, w = room.w;
  ctx.save();
  ctx.fillStyle = tone.wall; ctx.fillRect(x0, top, w, WALL_HEIGHT);
  ctx.fillStyle = tone.stripe; for (let x = 4; x < w; x += 8) ctx.fillRect(x0 + x, top + 5, 2, WALL_HEIGHT - 12);
  // Crown moulding and wainscot with its rail.
  ctx.fillStyle = tone.trim; ctx.fillRect(x0, top, w, 2); ctx.fillStyle = tone.rail; ctx.fillRect(x0, top + 2, w, 1);
  ctx.fillStyle = tone.wainscot; ctx.fillRect(x0, bottom - 9, w, 9);
  ctx.fillStyle = tone.trim; ctx.fillRect(x0, bottom - 10, w, 1); ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(x0, bottom - 1, w, 1);
  ctx.fillStyle = "rgba(0,0,0,.14)"; for (let x = 8; x < w; x += 16) ctx.fillRect(x0 + x, bottom - 8, 1, 7);
  // Windows: one every five tiles, evenly spread from the left.
  const count = Math.max(1, Math.floor(w / 80)), span = w / count;
  for (let i = 0; i < count; i++) {
    const wx = Math.round(x0 + span * (i + .5) - 8), wy = top + 6;
    const sky = daylight > .5 ? "#bfe0f2" : daylight > .15 ? "#e9a77a" : "#12204a";
    ctx.fillStyle = tone.trim; ctx.fillRect(wx - 2, wy - 2, 20, 17);
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, 16, 13);
    ctx.fillStyle = daylight > .15 ? "rgba(255,255,255,.45)" : "rgba(180,200,255,.5)"; ctx.fillRect(wx + 2, wy + 2, 4, 1); ctx.fillRect(wx + 3, wy + 3, 1, 3);
    ctx.fillStyle = tone.rail; ctx.fillRect(wx + 7, wy, 2, 13); ctx.fillRect(wx, wy + 6, 16, 1);
    if (daylight < .15) { ctx.fillStyle = "#f4eaa8"; ctx.fillRect(wx + 11, wy + 2, 1, 1); ctx.fillRect(wx + 3, wy + 8, 1, 1); }
    // A warm sill shadow under the window.
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(wx - 2, wy + 15, 20, 1);
    if (daylight > .15) {
      // The beam on the floor: a slanted band that breathes a little.
      const breathe = reduced ? 1 : .85 + Math.sin(time * .6 + i * 2.1) * .15;
      ctx.globalAlpha = Math.min(.2, daylight * .2) * breathe;
      ctx.fillStyle = daylight > .5 ? "#fff6d0" : "#ffb070";
      ctx.beginPath(); ctx.moveTo(wx, bottom); ctx.lineTo(wx + 16, bottom); ctx.lineTo(wx + 16 + 26, bottom + 74); ctx.lineTo(wx + 26, bottom + 74); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      if (!reduced) {
        ctx.fillStyle = "rgba(255,248,220,.7)";
        for (let m = 0; m < 5; m++) {
          const px = wx + 6 + ((terrainHash(mapId, i * 7 + m, 11) % 22) + time * (2 + m * .7)) % 24, py = bottom + ((terrainHash(mapId, i * 5 + m, 13) % 60) + time * (3 + m)) % 70;
          if (py > bottom + 4 && px > wx + 4 + (py - bottom) * .35 && px < wx + 16 + (py - bottom) * .35 + 4) ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
        }
      }
    }
  }
  // The side walls: a soft dark gradient, so the room reads as a box.
  for (const side of [-1, 1]) {
    const g = ctx.createLinearGradient(side < 0 ? x0 : x0 + w, 0, side < 0 ? x0 + 14 : x0 + w - 14, 0);
    g.addColorStop(0, "rgba(0,0,0,.28)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(side < 0 ? x0 : x0 + w - 14, top, 14, WALL_HEIGHT);
  }
  ctx.restore();
}
