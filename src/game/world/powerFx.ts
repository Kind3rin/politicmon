/** Staging for the field powers: the cut-in that announces them and the bursts, rings and slashes they leave in the world. */
import { drawMonsterSprite } from "../../art/monsters";
import { drawMonsterFrame, monsterFramesImage } from "../../art/monsterFrames";
import { TYPE_COLORS } from "../../data/poltypes";
import { VIEW_W, type Screen } from "../../engine/screen";
import { POWERS, type PowerId } from "../powers";

export const CUT_IN_TIME = 1.15;

/** The announcement: a slanted band across the screen, the Politicmon leaning in, the name slamming in beside it. */
export class PowerCutIn {
  t = 0;
  constructor(readonly power: PowerId, readonly speciesId: string, readonly nick: string) {}
  get done(): boolean { return this.t >= CUT_IN_TIME; }
  update(dt: number): void { this.t += dt; }

  draw(screen: Screen, height: number): void {
    const def = POWERS[this.power], ctx = screen.ctx, color = TYPE_COLORS[def.type];
    const k = Math.min(1, this.t / .22), out = Math.min(1, Math.max(0, (CUT_IN_TIME - this.t) / .2)), a = Math.min(k, out);
    const ease = 1 - Math.pow(1 - k, 3);
    const cy = Math.round(height * .38), band = 54;
    ctx.save();
    ctx.globalAlpha = .55 * a; ctx.fillStyle = "#05070f"; ctx.fillRect(0, 0, VIEW_W, height);
    ctx.globalAlpha = Math.min(1, a * 1.3);
    // The band: dark, slanted, with a coloured edge on top and a pale one beneath.
    const slide = (1 - ease) * VIEW_W;
    ctx.fillStyle = "#10141f";
    ctx.beginPath(); ctx.moveTo(-10 - slide, cy - band / 2 + 8); ctx.lineTo(VIEW_W + 10 - slide, cy - band / 2 - 8); ctx.lineTo(VIEW_W + 10 - slide, cy + band / 2 - 8); ctx.lineTo(-10 - slide, cy + band / 2 + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10 - slide, cy - band / 2 + 8); ctx.lineTo(VIEW_W + 10 - slide, cy - band / 2 - 8); ctx.stroke();
    ctx.strokeStyle = "#f4eedc"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-10 - slide, cy + band / 2 + 8); ctx.lineTo(VIEW_W + 10 - slide, cy + band / 2 - 8); ctx.stroke();
    // Speed lines racing across the band.
    ctx.fillStyle = color;
    for (let i = 0; i < 9; i++) {
      const lane = ((i * 37) % 7) - 3, x = ((i * 53 + this.t * (260 + i * 30)) % (VIEW_W + 60)) - 30, y = cy + lane * 7 - ((x - VIEW_W / 2) / VIEW_W) * 16;
      ctx.globalAlpha = .35 * a; ctx.fillRect(Math.round(x - slide * .3), Math.round(y), 22 + (i % 3) * 10, 1);
    }
    ctx.globalAlpha = Math.min(1, a * 1.3);
    // The Politicmon, leaning in from the left, pose "attack" when there is one.
    const lean = 1 - Math.pow(1 - Math.min(1, this.t / .3), 3), mx = Math.round(-70 + lean * 84), mh = 78;
    ctx.save();
    ctx.globalAlpha = .45 * a; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(mx + 34, cy + 20, 36, 7, -.08, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const frames = monsterFramesImage(this.speciesId);
    if (frames) drawMonsterFrame(screen, frames, this.t > .12 && this.t < .85 ? 2 : 1, mx, cy - mh + 30, 78, mh, false, true);
    else drawMonsterSprite(screen, this.speciesId, mx, cy - mh + 30, 78, mh);
    // The name, slammed in from the right, a hair late: one or two lines, as big as the room allows.
    const words = def.name.split(" "); let best = [def.name];
    for (let i = 1; i < words.length; i++) { const pair = [words.slice(0, i).join(" "), words.slice(i).join(" ")]; if (best.length === 1 || Math.max(...pair.map(l => l.length)) < Math.max(...best.map(l => l.length))) best = pair; }
    const longest = Math.max(...best.map(l => l.length)), scale = Math.max(1, Math.min(3, Math.floor(138 / (longest * 6))));
    const slam = (1 - Math.min(1, Math.max(0, (this.t - .08) / .2))) * 160, lineH = 8 * scale + 2, top = cy - 4 - (best.length * lineH) / 2 - 2;
    best.forEach((line, i) => {
      const width = line.length * 6 * scale, nx = Math.round(VIEW_W - 12 - width + slam), ny = Math.round(top + i * lineH);
      screen.text(line, nx + 2, ny + 2, "#05070f", scale); screen.text(line, nx, ny, "#fff6d6", scale);
    });
    const wrap: string[] = []; let line = "";
    for (const word of def.tagline.split(" ")) { if ((line + " " + word).trim().length > 23) { wrap.push(line); line = word; } else line = (line + " " + word).trim(); }
    wrap.push(line);
    const tagColor = color === "#384878" ? "#a9b6e0" : "#ffd23f";
    wrap.slice(0, 2).forEach((text, i) => screen.text(text, Math.round(VIEW_W - 12 - text.length * 6 + (1 - Math.min(1, Math.max(0, (this.t - .16) / .22))) * 200), cy + 13 + i * 9, tagColor));
    ctx.restore();
  }
}

export interface WorldSpark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; w: number; h: number; grav: number; drag: number }
export interface WorldRing { x: number; y: number; from: number; to: number; t: number; max: number; color: string; width: number; square?: boolean }
export interface WorldBeam { x: number; y: number; angle: number; length: number; t: number; max: number; color: string; width: number }

/** World-space particles, rings and beams that the powers leave behind. Everything here is cosmetic. */
export class WorldFx {
  sparks: WorldSpark[] = [];
  rings: WorldRing[] = [];
  beams: WorldBeam[] = [];
  flash = 0;
  flashColor = "255,255,255";

  burst(x: number, y: number, colors: readonly string[], n: number, speed: number, opts: Partial<WorldSpark> = {}): void {
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2, v = speed * (.35 + Math.random() * .75);
      this.sparks.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - speed * .25, life: 0, max: .45 + Math.random() * .4, color: colors[i % colors.length], w: 2, h: 2, grav: 160, drag: .93, ...opts });
    }
  }
  ring(x: number, y: number, to: number, color: string, max = .45, width = 2, square = false): void {
    this.rings.push({ x, y, from: 2, to, t: max, max, color, width, square });
  }
  beam(x: number, y: number, angle: number, length: number, color: string, max = .35, width = 3): void {
    this.beams.push({ x, y, angle, length, t: max, max, color, width });
  }
  pulse(color = "255,255,255", strength = .5): void { this.flash = strength; this.flashColor = color; }

  get busy(): boolean { return this.sparks.length > 0 || this.rings.length > 0 || this.beams.length > 0 || this.flash > 0; }

  update(dt: number): void {
    for (const p of this.sparks) {
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; const d = Math.pow(p.drag, dt * 60); p.vx *= d; p.vy *= d;
    }
    this.sparks = this.sparks.filter(p => p.life < p.max);
    for (const r of this.rings) r.t -= dt;
    this.rings = this.rings.filter(r => r.t > 0);
    for (const b of this.beams) b.t -= dt;
    this.beams = this.beams.filter(b => b.t > 0);
    this.flash = Math.max(0, this.flash - dt * 2.4);
  }

  /** `camX`/`camY` turn world pixels into screen pixels. The full-screen flash is drawn by `drawFlash`. */
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    ctx.save();
    for (const r of this.rings) {
      const k = 1 - r.t / r.max, radius = r.from + (r.to - r.from) * (1 - (1 - k) * (1 - k));
      ctx.globalAlpha = Math.max(0, 1 - k) * .9; ctx.strokeStyle = r.color; ctx.lineWidth = Math.max(1, r.width * (1 - k * .5));
      if (r.square) ctx.strokeRect(Math.round(r.x - camX - radius), Math.round(r.y - camY - radius), Math.round(radius * 2), Math.round(radius * 2));
      else { ctx.beginPath(); ctx.arc(r.x - camX, r.y - camY, Math.max(1, radius), 0, Math.PI * 2); ctx.stroke(); }
    }
    for (const b of this.beams) {
      const k = 1 - b.t / b.max, len = b.length * Math.min(1, k * 3), fade = Math.max(0, 1 - Math.max(0, k - .4) / .6);
      ctx.globalAlpha = fade; ctx.strokeStyle = b.color; ctx.lineWidth = b.width * (1 - k * .7);
      ctx.beginPath(); ctx.moveTo(b.x - camX, b.y - camY); ctx.lineTo(b.x - camX + Math.cos(b.angle) * len, b.y - camY + Math.sin(b.angle) * len); ctx.stroke();
    }
    for (const p of this.sparks) {
      ctx.globalAlpha = Math.min(1, (1 - p.life / p.max) * 1.4); ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.w, p.h);
    }
    ctx.restore();
  }

  drawFlash(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.flash <= 0) return;
    ctx.save(); ctx.fillStyle = `rgba(${this.flashColor},${Math.min(.85, this.flash)})`; ctx.fillRect(0, 0, width, height); ctx.restore();
  }
}

/** The two lines of the flight cinematic: where from and to, and the gag on board. Drawn in the cinematic, like the cut-in, not in a panel. */
export function drawFlightCaption(screen: Screen, width: number, y: number, route: string, gag: string): void {
  screen.text(route, Math.round((width - route.length * 6) / 2), y + 9, "#fff6d6");
  screen.text(gag, Math.round((width - gag.length * 6) / 2), y + 24, "#f2c230");
}
