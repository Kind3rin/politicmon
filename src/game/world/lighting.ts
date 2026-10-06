/** Light over the open air: a tint that moves smoothly with the hour, pools of light cut out of the dark and a warm glow over them. */
export type LightKind = "lamp" | "window" | "door" | "statue" | "fountain" | "player" | "cave" | "spot";
export interface Light { x: number; y: number; kind: LightKind }
export interface Ambient { rgb: [number, number, number]; alpha: number }

// Hour, colour of the wash, how much of the picture it covers. Linear in between, so nothing jumps at 17:00.
const KEYS: readonly (readonly [number, number, number, number, number])[] = [
  [0, 10, 22, 58, .64], [5, 16, 28, 68, .56], [6.5, 236, 150, 112, .2], [8, 255, 232, 184, .05], [11, 255, 246, 214, 0],
  [15, 255, 246, 214, 0], [17, 255, 214, 150, .08], [18.5, 226, 112, 76, .22], [19.75, 62, 40, 92, .44], [21, 10, 22, 58, .6], [24, 10, 22, 58, .64]
];

export function ambientLight(hour: number): Ambient {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 1; i < KEYS.length; i++) {
    const a = KEYS[i - 1], b = KEYS[i];
    if (h <= b[0]) {
      const t = (h - a[0]) / (b[0] - a[0]);
      return { rgb: [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t].map(Math.round) as [number, number, number], alpha: a[4] + (b[4] - a[4]) * t };
    }
  }
  return { rgb: [10, 22, 58], alpha: .64 };
}

/** 0 in daylight, 1 deep in the night: how much the lights are worth. */
export function lightNeed(ambient: Ambient): number {
  const dark = (255 * 3 - (ambient.rgb[0] + ambient.rgb[1] + ambient.rgb[2])) / (255 * 3);
  return Math.max(0, Math.min(1, (ambient.alpha * (.4 + dark) - .06) / .34));
}

const LOOK: Record<LightKind, { r: number; glow: string; cut: number; core: number }> = {
  lamp: { r: 56, glow: "255,204,116", cut: .95, core: .36 },
  window: { r: 22, glow: "255,212,136", cut: .85, core: .3 },
  door: { r: 26, glow: "255,198,112", cut: .85, core: .26 },
  statue: { r: 32, glow: "255,226,172", cut: .7, core: .16 },
  fountain: { r: 30, glow: "146,218,236", cut: .7, core: .18 },
  player: { r: 34, glow: "255,226,172", cut: .5, core: .06 },
  cave: { r: 34, glow: "255,214,150", cut: .96, core: .12 }, // the only light you carry underground
  spot: { r: 92, glow: "255,244,214", cut: 1, core: .16 } // the field lights: wide, white, steady
};

let scratch: HTMLCanvasElement | null = null;

export function drawLighting(ctx: CanvasRenderingContext2D, width: number, height: number, hour: number, lights: readonly Light[], time: number, reduced: boolean, fixed?: Ambient): void {
  const ambient = fixed ?? ambientLight(hour);
  if (ambient.alpha < .02) return;
  const need = fixed ? 1 : lightNeed(ambient);
  scratch ??= document.createElement("canvas");
  const w = Math.ceil(width), h = Math.ceil(height);
  if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
  const dark = scratch.getContext("2d")!;
  dark.globalCompositeOperation = "source-over";
  dark.clearRect(0, 0, w, h);
  dark.fillStyle = `rgba(${ambient.rgb[0]},${ambient.rgb[1]},${ambient.rgb[2]},${ambient.alpha})`;
  dark.fillRect(0, 0, w, h);
  const flicker = (light: Light, i: number) => reduced || light.kind === "player" ? 1 : 1 + Math.sin(time * 7.3 + i * 1.7) * .035 + Math.sin(time * 13.1 + i) * .02;
  if (need > 0) {
    dark.globalCompositeOperation = "destination-out";
    lights.forEach((light, i) => {
      const look = LOOK[light.kind], r = look.r * flicker(light, i);
      if (light.x < -r || light.y < -r || light.x > w + r || light.y > h + r) return;
      const g = dark.createRadialGradient(light.x, light.y, 0, light.x, light.y, r);
      g.addColorStop(0, `rgba(0,0,0,${look.cut * need})`); g.addColorStop(.45, `rgba(0,0,0,${look.cut * need * .55})`); g.addColorStop(1, "rgba(0,0,0,0)");
      dark.fillStyle = g; dark.fillRect(light.x - r, light.y - r, r * 2, r * 2);
    });
  }
  ctx.drawImage(scratch, 0, 0, w, h);
  if (need <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  lights.forEach((light, i) => {
    const look = LOOK[light.kind], r = look.r * .8 * flicker(light, i);
    if (light.x < -r || light.y < -r || light.x > w + r || light.y > h + r) return;
    const g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, r);
    g.addColorStop(0, `rgba(${look.glow},${look.core * need})`); g.addColorStop(1, `rgba(${look.glow},0)`);
    ctx.fillStyle = g; ctx.fillRect(light.x - r, light.y - r, r * 2, r * 2);
  });
  ctx.restore();
}

/** Soft darkening at the edges of the frame: keeps the eye on the middle, like a lens. */
export function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number, strength: number): void {
  const g = ctx.createRadialGradient(width / 2, height * .5, Math.min(width, height) * .38, width / 2, height * .5, Math.hypot(width, height) * .56);
  g.addColorStop(0, "rgba(8,10,24,0)"); g.addColorStop(1, `rgba(8,10,24,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
}

/** An interior floats in the dark: everything outside the room goes to near-black and the walls cast a soft shadow inwards. */
export function drawRoomFrame(ctx: CanvasRenderingContext2D, room: { x: number; y: number; w: number; h: number }, camX: number, camY: number, wallHeight = 0): void {
  const x = Math.round(room.x - camX), y = Math.round(room.y - camY), r = x + room.w, b = y + room.h;
  ctx.save();
  ctx.fillStyle = "rgba(5,7,16,.94)";
  const pad = 400;
  ctx.fillRect(x - pad, y - pad - wallHeight, room.w + pad * 2, pad); // above (the back wall stays)
  ctx.fillRect(x - pad, y - wallHeight, pad, wallHeight); ctx.fillRect(r, y - wallHeight, pad, wallHeight);
  ctx.fillRect(x - pad, b, room.w + pad * 2, pad); // below
  ctx.fillRect(x - pad, y, pad, room.h); // left
  ctx.fillRect(r, y, pad, room.h); // right
  const edge = 14, shade = (x0: number, y0: number, w: number, h: number, gx: number, gy: number, hx: number, hy: number) => {
    const g = ctx.createLinearGradient(gx, gy, hx, hy);
    g.addColorStop(0, "rgba(5,7,16,.5)"); g.addColorStop(1, "rgba(5,7,16,0)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  };
  shade(x, y, room.w, edge, 0, y, 0, y + edge);
  shade(x, b - edge, room.w, edge, 0, b, 0, b - edge);
  shade(x, y, edge, room.h, x, 0, x + edge, 0);
  shade(r - edge, y, edge, room.h, r, 0, r - edge, 0);
  ctx.restore();
}
