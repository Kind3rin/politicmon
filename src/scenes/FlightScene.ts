import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { VIEW_W, type Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import type { UiPanel } from "../ui/kit";
import type { GameState } from "../game/state";
import { flightDestinations, type TransportDestination } from "../game/world/transport";
import { readableCopy } from "../ui/kit/copy";

const GAGS = ["TURBOLENZA. SI PREGA DI NON COMMENTARE.", "IL PILOTA È UN AMICO DI UN AMICO.", "IL VOLO È DI STATO. IL CAFFÈ NO.", "ATTERRAGGIO PREVISTO: A GIORNI.", "BIGLIETTO: RISERVATO. COSTO: RISERVATO.", "LA PISTA È STATA INAUGURATA IERI."];
export const FLIGHT_TIME = 3.4;

/** Choose where to go. Nothing is spent: it is a state flight. */
export class FlightListScene implements Scene {
  readonly transparent = false;
  private closed = false;
  constructor(private stack: SceneStack, private input: Input, private state: GameState, private currentMapId: string, private go: (dest: TransportDestination) => void) {}
  get uiPanel(): UiPanel {
    const back = { label: "Indietro", run: () => { if (this.closed || this.stack.top !== this) return; this.closed = true; this.input.reset(); audio.cancel(); this.stack.pop(); } };
    return { title: "Volo di Stato", subtitle: "Scegli dove atterrare. Il biglietto lo paga qualcun altro.", compact: true,
      actions: flightDestinations(this.state, this.currentMapId).map(({ destination, open }) => ({ label: readableCopy(destination.label), disabled: !open,
        hint: open ? "Atterri all'ingresso della città." : readableCopy(destination.requirement ?? "NON ANCORA."), facts: [{ label: "Costo", value: "0 €" }, { label: "Stato", value: open ? "Disponibile" : "Da sbloccare" }],
        run: () => { if (this.closed || this.stack.top !== this || !open) return; this.closed = true; this.input.reset(); audio.confirm(); this.stack.pop(); this.go(destination); } })), back };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}

/** The flight itself: sky at dusk, clouds, the plane and a caption. Any key or tap lands early. */
export class FlightScene implements Scene {
  readonly transparent = false;
  readonly expandedViewport = true;
  private t = 0;
  private gag = GAGS[Math.floor(Math.random() * GAGS.length)];
  private landed = false;
  constructor(private stack: SceneStack, private input: Input, private from: string, private to: string, private reduce: boolean, private land: () => void) { audio.powerFlight(); }

  update(dt: number): void {
    this.t += dt;
    const skip = this.input.wasPressed("a") || this.input.wasPressed("b") || this.input.wasPressed("start");
    if ((this.t >= FLIGHT_TIME || (skip && this.t > .5) || this.reduce && this.t > .8) && !this.landed) {
      this.landed = true; this.input.reset(); this.stack.pop(); this.land();
    }
  }

  draw(screen: Screen): void {
    const ctx = screen.ctx, w = VIEW_W, h = screen.height, k = Math.min(1, this.t / FLIGHT_TIME);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#14224f"); sky.addColorStop(.45, "#8a4b78"); sky.addColorStop(.75, "#e0705a"); sky.addColorStop(1, "#f6b66e");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f6efc8";
    for (let i = 0; i < 26; i++) { const x = (i * 97) % w, y = (i * 53) % Math.round(h * .4); if ((i + Math.floor(this.t * 3)) % 4) ctx.fillRect(x, y, 1, 1); }
    // The sun, low and enormous.
    ctx.fillStyle = "rgba(255,226,150,.9)"; ctx.beginPath(); ctx.arc(w * .78, h * .72, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,226,150,.25)"; ctx.beginPath(); ctx.arc(w * .78, h * .72, 38, 0, Math.PI * 2); ctx.fill();
    // Far mountains and near ones, sliding by.
    const ridge = (speed: number, base: number, color: string, amp: number, seed: number) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, base - Math.abs(Math.sin((x + this.t * speed) * .021 + seed)) * amp - Math.sin((x + this.t * speed) * .06 + seed) * amp * .25);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    };
    ridge(18, h * .86, "#5b3b66", 26, 1); ridge(40, h * .93, "#2a2148", 22, 4);
    // Clouds: three speeds.
    const cloud = (x: number, y: number, s: number, a: number) => { ctx.fillStyle = `rgba(255,236,214,${a})`; for (const [dx, dy, r] of [[0, 0, 9], [10, -4, 11], [22, 0, 9], [11, 4, 9]] as const) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); } };
    for (let i = 0; i < 7; i++) { const speed = 30 + (i % 3) * 55, x = ((i * 83 - this.t * speed) % (w + 80) + w + 80) % (w + 80) - 40; cloud(x, h * .12 + ((i * 47) % Math.round(h * .55)), .7 + (i % 3) * .35, .35 + (i % 3) * .2); }
    // The plane, bobbing; a contrail behind it.
    const px = Math.round(w * .5 + Math.sin(this.t * 1.3) * 6), py = Math.round(h * .42 + Math.sin(this.t * 2.1) * 4 - k * 18);
    ctx.fillStyle = "rgba(255,244,230,.75)"; ctx.fillRect(px - 130, py + 3, 118, 2); ctx.fillStyle = "rgba(255,244,230,.4)"; ctx.fillRect(px - 130, py + 6, 100, 1);
    ctx.fillStyle = "#e8e2d0"; ctx.fillRect(px - 26, py - 4, 52, 10); ctx.fillRect(px + 24, py - 2, 6, 6); ctx.fillRect(px + 28, py, 4, 3);
    ctx.fillStyle = "#1e3a8a"; ctx.fillRect(px - 26, py + 1, 52, 2); ctx.fillStyle = "#d7263d"; ctx.fillRect(px - 28, py - 10, 4, 7);
    ctx.fillStyle = "#c9c2ae"; ctx.fillRect(px - 8, py + 4, 22, 3); ctx.fillStyle = "#8aa4c8"; for (let i = 0; i < 6; i++) ctx.fillRect(px - 16 + i * 6, py - 2, 3, 2);
    ctx.fillStyle = "#f0b830"; ctx.fillRect(px - 30, py - 2, 3, 3);
    // Caption.
    const bar = 46, y = h - bar - 14;
    ctx.fillStyle = "rgba(16,20,31,.86)"; ctx.fillRect(0, y, w, bar); ctx.fillStyle = "#f2c230"; ctx.fillRect(0, y, w, 2);
    const route = `${this.from} VERSO ${this.to}`.toUpperCase();
    screen.text(route, Math.round((w - route.length * 6) / 2), y + 9, "#fff6d6");
    screen.text(this.gag, Math.round((w - this.gag.length * 6) / 2), y + 24, "#f2c230");
    const bw = Math.round((w - 40) * k); ctx.fillStyle = "#3a4468"; ctx.fillRect(20, y + bar - 6, w - 40, 2); ctx.fillStyle = "#f2c230"; ctx.fillRect(20, y + bar - 6, bw, 2);
    // Fade in and out.
    const fade = Math.max(1 - this.t / .35, (this.t - (FLIGHT_TIME - .35)) / .35, 0);
    if (fade > 0) { ctx.fillStyle = `rgba(5,7,16,${Math.min(1, fade)})`; ctx.fillRect(0, 0, w, h); }
  }
}
