import type { CivicScene } from "./civicBridge";

interface Particle { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; color: string; gravity: number; spin: number }
export interface RevealEffects { sound(kind: "tile" | "person" | "finish"): void; shake(seconds: number): void }

const TILE = 16;
const DUST = ["#e9d3a2", "#d2b987", "#bba172", "#f3e6c3"];
const SPARK = ["#fff6bf", "#ffffff", "#ffd95e"];
const CONFETTI = ["#3da35d", "#ffffff", "#d64545", "#f2c230", "#58a6e0"];
const STEP = .2;      // seconds between tiles
const LEAD = .75;     // the title appears and the camera settles before the first change
const AFTER = 1.5;    // the title lingers after the last change

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** The few seconds in which a civic decision visibly reshapes the map: the title (shown by the world's own notice), the tiles changing one by one
 * (dust, light, a nudge of the camera), then the new people stepping in under a beam of light and a handful of confetti.
 * The world is already in its new state; this only holds the old one back until each change plays. */
export class CivicReveal {
  private t = 0;
  private readonly tiles: { x: number; y: number; at: number; done: boolean }[] = [];
  private readonly people: { id: string; x: number; y: number; at: number; done: boolean }[] = [];
  private particles: Particle[] = [];
  private flashes: { x: number; y: number; age: number; kind: "tile" | "person" }[] = [];
  private seed = 1;
  readonly focus: { x: number; y: number };
  readonly total: number;
  readonly title: string;

  constructor(scene: CivicScene, private readonly fx: RevealEffects, private readonly reduced: boolean) {
    this.title = scene.title;
    const cells: { x: number; y: number }[] = [];
    for (const edit of scene.tiles ?? []) for (let y = edit.y[0]; y <= edit.y[1]; y++) for (let x = edit.x[0]; x <= edit.x[1]; x++) cells.push({ x, y });
    cells.sort((a, b) => a.y - b.y || a.x - b.x);
    cells.forEach((cell, i) => this.tiles.push({ ...cell, at: reduced ? 0 : LEAD + i * STEP, done: reduced }));
    const tilesEnd = reduced || !cells.length ? LEAD : LEAD + cells.length * STEP;
    (scene.npcs ?? []).forEach((npc, i) => this.people.push({ id: npc.id, x: npc.x, y: npc.y, at: reduced ? 0 : tilesEnd + .2 + i * .35, done: reduced }));
    const points = [...this.tiles, ...this.people];
    this.focus = points.length ? { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length } : { x: 0, y: 0 };
    const lastPerson = this.people.length ? this.people[this.people.length - 1].at : 0;
    this.total = reduced ? 1.6 : Math.max(tilesEnd, lastPerson) + AFTER;
  }

  get done(): boolean { return this.t >= this.total; }
  get progress(): number { return this.tiles.filter(tile => tile.done).length + this.people.filter(person => person.done).length; }
  /** True while this tile still shows the old ground. */
  holds(x: number, y: number): boolean { return this.tiles.some(tile => tile.x === x && tile.y === y && !tile.done); }
  holdsNpc(id: string): boolean { return this.people.some(person => person.id === id && !person.done); }

  private burst(x: number, y: number, kind: "tile" | "person"): void {
    const cx = x * TILE + TILE / 2, cy = y * TILE + TILE - 2;
    const dust = kind === "tile" ? 9 : 5, spark = kind === "tile" ? 5 : 7, confetti = kind === "person" ? 16 : 0;
    const add = (count: number, palette: string[], speed: number, up: number, gravity: number, life: number, size: number) => {
      for (let i = 0; i < count; i++) {
        const a = hash(this.seed++) * Math.PI * 2, s = speed * (.4 + hash(this.seed++) * .8);
        this.particles.push({ x: cx + (hash(this.seed++) - .5) * 10, y: cy + (hash(this.seed++) - .5) * 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .5 - up * (.5 + hash(this.seed++)), age: 0, life: life * (.7 + hash(this.seed++) * .6), size, color: palette[Math.floor(hash(this.seed++) * palette.length)], gravity, spin: hash(this.seed++) * 6 });
      }
    };
    add(dust, DUST, 26, 12, -8, .75, 3);
    add(spark, SPARK, 34, 30, 40, .55, 2);
    add(confetti, CONFETTI, 46, 62, 120, 1.15, 2);
    this.flashes.push({ x: cx, y: cy, age: 0, kind });
  }

  update(dt: number): void {
    this.t += dt;
    for (const tile of this.tiles) if (!tile.done && this.t >= tile.at) {
      tile.done = true;
      if (!this.reduced) { this.burst(tile.x, tile.y, "tile"); this.fx.sound("tile"); this.fx.shake(.16); }
    }
    for (const person of this.people) if (!person.done && this.t >= person.at) {
      person.done = true;
      if (!this.reduced) { this.burst(person.x, person.y, "person"); this.fx.sound("person"); }
    }
    if (!this.reduced && this.t >= this.total - AFTER + .1 && !this.finishedSound) { this.finishedSound = true; this.fx.sound("finish"); }
    for (const p of this.particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.vx *= 1 - Math.min(1, dt * 1.4); }
    this.particles = this.particles.filter(p => p.age < p.life);
    for (const f of this.flashes) f.age += dt;
    this.flashes = this.flashes.filter(f => f.age < .6);
  }
  private finishedSound = false;

  /** World space: beams, rings, flashes, particles. Call inside the camera transform. */
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (this.reduced) return;
    ctx.save();
    for (const f of this.flashes) {
      const p = f.age / .6, x = Math.round(f.x - camX), y = Math.round(f.y - camY);
      if (f.kind === "person") {
        const h = 46 * Math.min(1, p * 4), g = ctx.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, "rgba(255,246,191,0)"); g.addColorStop(1, `rgba(255,246,191,${(1 - p) * .75})`);
        ctx.fillStyle = g; ctx.fillRect(x - 7, y - h, 14, h);
      } else {
        ctx.globalAlpha = Math.max(0, .85 - p * 1.9); ctx.fillStyle = "#fff8d8"; ctx.fillRect(x - 8, y - 14, 16, 16);
      }
      ctx.globalAlpha = (1 - p) * .8; ctx.strokeStyle = "#fff6bf"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y - 1, 4 + p * 16, 2 + p * 7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (const p of this.particles) {
      const k = p.age / p.life, x = Math.round(p.x - camX), y = Math.round(p.y - camY);
      ctx.globalAlpha = Math.min(1, (1 - k) * 1.4); ctx.fillStyle = p.color;
      if (p.gravity > 60) { const w = Math.max(1, Math.round(p.size * Math.abs(Math.cos(p.spin + p.age * 9)))); ctx.fillRect(x, y, w, p.size); }
      else ctx.fillRect(x, y, p.size, p.size);
    }
    ctx.restore();
  }
}
