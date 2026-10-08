// Presentazione condivisa delle scene di battaglia (PVE BattleScene + PvpBattleScene).
// Estrazione MECCANICA da BattleScene: effetti colpo (shake/hit-stop/particelle),
// banner d'efficacia, telegrafia, disegno animato dei mostri e box HP.
// NESSUNA logica di gioco qui: solo stato visivo e disegno.

import {
  MONSTERS_WITH_ACTION_PNG, MONSTERS_WITH_PNG, monsterImage, drawMonsterLoading
} from "../../art/monsters";
import { memeForm } from "../memeForms";
import { audio } from "../../engine/audio";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import type { Combatant } from "./sim";
import { sceneImage } from "../../engine/assets";
import { BATTLE_BACKDROPS, type BattleBackdrop } from "./backdrop";
import { TYPE_COLORS, type PolType } from "../../data/poltypes";
import { monsterFramesImage, monsterPoseFrame } from "../../art/monsterFrames";

// Stesso renderer in PVE e PVP. Se il tema non è ancora pronto o manca,
// il prato Higgsfield evita campi vuoti; senza immagini bastano due colori.
export function drawBattleBackdrop(screen: Screen, backdrop: BattleBackdrop, height = VIEW_H, reservedUiHeight = 44): void {
  const portrait = height > VIEW_H && backdrop === BATTLE_BACKDROPS.prato ? sceneImage("battle:bg:prato-portrait", "ui/battle/prato-portrait.png") : null;
  const themed = portrait ?? sceneImage(backdrop.spriteId, backdrop.path);
  const fallback = themed ?? sceneImage(BATTLE_BACKDROPS.prato.spriteId, BATTLE_BACKDROPS.prato.path);
  if (fallback) {
    if (height > VIEW_H) {
      const scale = Math.max(VIEW_W / fallback.width, (height - reservedUiHeight) / fallback.height);
      screen.image(fallback, (VIEW_W - fallback.width * scale) / 2, (height - reservedUiHeight - fallback.height * scale) / 2, fallback.width * scale, fallback.height * scale);
    } else screen.image(fallback, 0, 0, VIEW_W, VIEW_H - reservedUiHeight);
  } else {
    screen.rect(0, 0, VIEW_W, 76, backdrop.sky);
    screen.rect(0, 76, VIEW_W, height - 76 - reservedUiHeight, backdrop.ground);
  }
}

export type BattleSide = "player" | "foe";

export interface ImpactParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  /** Per-particle physics and shape: omitted means the classic falling spark. */
  grav?: number;
  drag?: number;
  w?: number;
  h?: number;
}

/** An expanding ring or square: the shockwave of a hit. */
export interface ImpactRing { x: number; y: number; from: number; to: number; t: number; max: number; color: string; width: number; square?: boolean }

// Numero di danno flottante: nasce nel punto colpito, sale e svanisce.
// Colore/scala cambiano su critico (bianco/rosso, grande) e super-efficace (oro).
export interface DamageNumber {
  x: number;
  y: number;
  val: number;
  life: number;
  max: number;
  crit: boolean;
  super: boolean;
  /** Not very effective: the number is grey and a short label says why. */
  weak: boolean;
  /** "Super efficace" or "Poco efficace", drawn above the number. */
  tag?: string;
}

/** One label of the arena's impact layer: the number of a hit, or the efficacy label above it. */
export interface DamageImpact {
  label: string;
  x: number;
  y: number;
  opacity: number;
  kind: "normal" | "super" | "crit" | "weak" | "tag-super" | "tag-weak";
}

/** The floating numbers as the arena draws them. On reduced effects the numbers stay still; the labels stay with them. */
export function damageImpacts(numbers: readonly DamageNumber[], viewHeight: number, reduceEffects: boolean): DamageImpact[] {
  return numbers.flatMap((d): DamageImpact[] => {
    // A small pop: the number rises a little above its place and settles back within about a third of a second.
    const p = Math.min(1, d.life / .3);
    const pop = reduceEffects ? 0 : Math.sin(p * Math.PI * 1.5) * (1 - p) * 5;
    const opacity = reduceEffects ? 1 : Math.min(1, Math.max(0, (1 - d.life / d.max) / .34));
    const x = d.x / VIEW_W * 100, y = (d.y - pop) / viewHeight * 100;
    const out: DamageImpact[] = [{ label: `−${d.val}`, x, y, opacity, kind: d.crit ? "crit" : d.super ? "super" : d.weak ? "weak" : "normal" }];
    if (d.tag) out.push({ label: d.tag, x, y: (d.y - pop - 20) / viewHeight * 100, opacity, kind: d.super ? "tag-super" : "tag-weak" });
    return out;
  });
}

// Centro approssimativo dello sprite di un combattente (per le particelle).
/** Sprites keep their size down to a view 190 units tall (a phone upright, a phone on its side); in a shorter window (split screen)
 * they shrink with the view instead of losing their heads. */
export function battleFit(height = VIEW_H): number {
  return Math.max(0.42, Math.min(1, height / 190));
}

export function battleGeometry(height = VIEW_H): { foeBase: number; playerBase: number; size: number } {
  // In a short view the foe stands a little higher: the player's plate takes the bottom right.
  return { foeBase: Math.round(height * (.67 - .28 * (1 - battleFit(height)))), playerBase: Math.round(height * (.93 + .06 * (1 - battleFit(height)))), size: 88 };
}

export function monsterCenter(who: BattleSide, height = VIEW_H): { x: number; y: number } {
  const g = battleGeometry(height);
  return who === "foe" ? { x: 162, y: g.foeBase - 16 } : { x: 56, y: g.playerBase - 16 };
}

export function approach(current: number, target: number, delta: number): number {
  if (current < target) {
    return Math.min(target, current + delta);
  }
  if (current > target) {
    return Math.max(target, current - delta);
  }
  return current;
}

export function drawEllipse(screen: Screen, cx: number, cy: number, rx: number, ry: number, color: string): void {
  for (let dy = -ry; dy <= ry; dy += 1) {
    const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
    screen.rect(cx - span, cy + dy, span * 2, 1, color);
  }
}

// Stato visivo degli effetti di battaglia. La scena chiama update(dt) a ogni
// frame e onHit() quando un colpo va a segno; hitStop è gestito dalla scena
// (congela la coda, non gli effetti cosmetici).
export class BattleFx {
  viewHeight = VIEW_H;
  time = 0;
  shake = 0;
  // Accessibilità (RIDUCI EFFETTI): quando true azzera lo screen-shake. Le scene
  // lo impostano dallo state al costruire la battaglia. L'informazione (barre,
  // numeri di danno, banner d'efficacia) resta: sparisce solo il movimento.
  reduceEffects = false;
  lungeT: Record<BattleSide, number> = { player: 0, foe: 0 };
  flashT: Record<BattleSide, number> = { player: 0, foe: 0 };
  knockback: Record<BattleSide, number> = { player: 0, foe: 0 };
  faintT: Record<BattleSide, number> = { player: 0, foe: 0 };
  hitStop = 0;
  /** Seconds of slow motion left (the last trainer down): the scene scales its clock by it. */
  slowT = 0;
  levelFlash = 0;
  catchFlash = 0;
  // KO: freeze-frame + lampo bianco prima che lo sprite svanisca. La scena
  // imposta koFlash a ~0.5 in foe/playerFaintedSteps; qui decade da solo.
  koFlash = 0;
  particles: ImpactParticle[] = [];
  damageNumbers: DamageNumber[] = [];
  effFx: { kind: "super" | "weak" | "crit"; t: number } | null = null;
  telegraph: { side: BattleSide; color: string; t: number; max: number } | null = null;
  moveFx: { side: BattleSide; type: PolType; t: number } | null = null;
  rings: ImpactRing[] = [];
  /** Full-frame colour that fades after a heavy hit. */
  tint: { color: string; t: number; max: number } | null = null;
  /** 0..1, decays quickly: the frame leans in on a super effective or critical hit. */
  punch = 0;

  /** `held` is the hit-stop: the shake settles, and the rest of the frame stays where the blow left it. */
  update(dt: number, held = false): void {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    if (held) return;
    if (this.moveFx) {
      this.moveFx.t -= dt;
      if (this.moveFx.t <= 0) this.moveFx = null;
    }
    this.lungeT.player = Math.max(0, this.lungeT.player - dt);
    this.lungeT.foe = Math.max(0, this.lungeT.foe - dt);
    this.flashT.player = Math.max(0, this.flashT.player - dt);
    this.flashT.foe = Math.max(0, this.flashT.foe - dt);
    // Contraccolpo: rientra in ~0.25s (1 -> 0).
    this.knockback.player = Math.max(0, this.knockback.player - dt * 4);
    this.knockback.foe = Math.max(0, this.knockback.foe - dt * 4);
    this.faintT.player = Math.max(0, this.faintT.player - dt);
    this.faintT.foe = Math.max(0, this.faintT.foe - dt);
    this.levelFlash = Math.max(0, this.levelFlash - dt);
    this.catchFlash = Math.max(0, this.catchFlash - dt);
    this.koFlash = Math.max(0, this.koFlash - dt);
    this.updateParticles(dt);
    this.updateDamageNumbers(dt);
    this.punch = Math.max(0, this.punch - dt * 4.5);
    if (this.tint) { this.tint.t -= dt; if (this.tint.t <= 0) this.tint = null; }
    for (const ring of this.rings) ring.t -= dt;
    this.rings = this.rings.filter(ring => ring.t > 0);
    if (this.effFx) {
      this.effFx.t -= dt;
      if (this.effFx.t <= 0) {
        this.effFx = null;
      }
    }
    if (this.telegraph) {
      this.telegraph.t -= dt;
      if (this.telegraph.t <= 0) {
        this.telegraph = null;
      }
    }
  }

  // Effetti del colpo andato a segno: shake/hit-stop/knockback/scintille/banner
  // d'efficacia + suono. `attacker` è chi ha colpito. `damage` è puramente
  // cosmetico (il numero flottante): NON entra in alcuna logica.
  onHit(attacker: BattleSide, typeMult: number, crit: boolean, damage = 0, moveType?: PolType, hpShare = 0): void {
    const defSide: BattleSide = attacker === "player" ? "foe" : "player";
    this.lungeT[attacker] = this.reduceEffects ? 0 : 0.3;
    this.flashT[defSide] = this.reduceEffects ? 0 : 0.45;
    const superHit = typeMult > 1;
    // Lo shake e il contraccolpo scalano col "peso" del colpo.
    // A chip of a few HP barely shakes; a hit that takes away most of the bar shakes at the old full strength.
    const weight = Math.min(1, Math.max(0, hpShare));
    this.shake = superHit || crit ? 0.3 + 0.13 * weight : (attacker === "foe" ? 0.12 : 0.1) + 0.1 * weight;
    this.hitStop = this.reduceEffects ? 0 : superHit || crit ? 0.09 : 0.05;
    this.knockback[defSide] = this.reduceEffects ? 0 : superHit ? 1 : 0.55;
    if (!this.reduceEffects) {
      this.spawnImpact(defSide, typeMult, crit);
      if (moveType) {
        this.moveFx = { side: attacker, type: moveType, t: .4 };
        this.signature(defSide, moveType, superHit || crit ? 1 : .6);
        audio.typeAccent(moveType, superHit || crit ? 1 : .6);
      }
      if (superHit || crit) {
        this.punch = 1;
        this.tint = crit && !superHit ? { color: "255,255,255", t: .16, max: .16 } : { color: moveType ? hexToRgb(TYPE_COLORS[moveType]) : "255,210,63", t: .2, max: .2 };
      } else this.punch = Math.max(this.punch, .3);
    }
    if (damage > 0) {
      this.spawnDamageNumber(defSide, damage, typeMult > 1, crit, typeMult > 0 && typeMult < 1);
    }
    if (superHit) {
      this.effFx = { kind: "super", t: 0.9 };
      audio.hitSuper();
    } else if (typeMult > 0 && typeMult < 1) {
      this.effFx = { kind: "weak", t: 0.7 };
      audio.hitWeak();
    } else {
      if (crit) {
        this.effFx = { kind: "crit", t: 0.8 };
      }
      audio.hit();
    }
  }

  /** The look of each political type on impact: one shockwave plus a burst that tells the types apart.
   * `power` is 1 for a heavy hit (super effective or critical), .6 otherwise. All of it is cosmetic. */
  signature(defSide: BattleSide, type: PolType, power: number): void {
    const c = monsterCenter(defSide, this.viewHeight);
    const color = TYPE_COLORS[type];
    const count = Math.round(20 * power);
    // Bigger and denser than first drawn: at phone scale a 3 px speck is a 5 px speck, and it has to read at a glance.
    const push = (n: number, make: (i: number) => Partial<ImpactParticle> & { vx: number; vy: number; color: string }) => {
      for (let i = 0; i < Math.round(n * 1.4); i += 1) {
        const p = { x: c.x, y: c.y, life: 0, max: .5, size: 1, ...make(i) } as ImpactParticle;
        if (p.w) p.w = Math.round(p.w * 1.6); if (p.h) p.h = Math.max(1, Math.round(p.h * 1.6));
        this.particles.push(p);
      }
    };
    this.rings.push({ x: c.x, y: c.y, from: 4, to: 30 + 28 * power, t: .4, max: .4, color, width: 3 + power * 3, square: type === "ISTITUZIONE" });
    switch (type) {
      case "POPULISMO": // a loudspeaker burst: fast rays and a second ring
        this.rings.push({ x: c.x, y: c.y, from: 2, to: 14 + 14 * power, t: .26, max: .26, color: "#fff2c4", width: 2 });
        push(count, i => { const a = (Math.PI * 2 * i) / count; return { vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, color: i % 2 ? color : "#fff2c4", grav: 0, drag: .86, w: 5, h: 1, max: .3 }; });
        break;
      case "MEDIA": // flash bulbs
        this.tint ??= { color: "255,255,255", t: .1, max: .1 };
        push(Math.round(8 * power), i => ({ vx: (Math.random() - .5) * 90, vy: -30 - Math.random() * 60, color: i % 2 ? "#ffffff" : color, grav: 40, drag: .93, w: 3, h: 3, max: .5 }));
        break;
      case "TECNO": // a glitch: torn horizontal slices
        push(Math.round(10 * power), i => ({ x: c.x + (Math.random() - .5) * 34, y: c.y + (Math.random() - .5) * 34, vx: 0, vy: 0, color: i % 2 ? "#3ad7e8" : "#e63ad7", grav: 0, drag: 1, w: 8 + Math.random() * 16, h: 1 + Math.floor(Math.random() * 2), max: .22 + Math.random() * .15 }));
        break;
      case "DESTRA": // flames rising
        push(Math.round(16 * power), i => ({ x: c.x + (Math.random() - .5) * 22, y: c.y + 6, vx: (Math.random() - .5) * 30, vy: -50 - Math.random() * 60, color: ["#ffd23c", "#ff8a24", "#e8412c"][i % 3], grav: -60, drag: .95, w: 3, h: 3, max: .55 }));
        break;
      case "SINISTRA": // red streamers thrown up
        push(Math.round(14 * power), i => ({ x: c.x + (Math.random() - .5) * 20, vx: (Math.random() - .5) * 60, vy: -80 - Math.random() * 50, color: i % 3 ? color : "#ffd23c", grav: 140, drag: .96, w: 2, h: 6, max: .7 }));
        break;
      case "VERDE": // a gust of leaves
        push(Math.round(14 * power), i => ({ vx: (i % 2 ? 1 : -1) * (20 + Math.random() * 70), vy: -40 - Math.random() * 50, color: i % 3 ? color : "#d7efd2", grav: 60, drag: .94, w: 3, h: 2, max: .8 }));
        break;
      case "CENTRO": // a spiral
        push(Math.round(14 * power), i => { const a = (Math.PI * 2 * i) / Math.max(1, Math.round(14 * power)); return { vx: -Math.sin(a) * 110 + Math.cos(a) * 30, vy: Math.cos(a) * 110 + Math.sin(a) * 30, color: i % 2 ? color : "#ffffff", grav: 0, drag: .9, w: 2, h: 2, max: .45 }; });
        break;
      case "ISTITUZIONE": // a stamp coming down: dust off the seal
        this.rings.push({ x: c.x, y: c.y, from: 24, to: 8, t: .2, max: .2, color: "#ffffff", width: 2, square: true });
        push(Math.round(12 * power), i => ({ x: c.x + (i % 2 ? 1 : -1) * 12, y: c.y + 10, vx: (i % 2 ? 1 : -1) * (30 + Math.random() * 60), vy: -10 - Math.random() * 20, color: "#d8d2c0", grav: 80, drag: .9, w: 3, h: 2, max: .5 }));
        break;
    }
  }

  /** Victory confetti, falling from the top of the frame. */
  celebrate(count = 70): void {
    if (this.reduceEffects) return;
    const palette = ["#ffd23f", "#d7263d", "#1b998b", "#f4eedc", "#4aa0e8"];
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x: Math.random() * VIEW_W, y: -6 - Math.random() * 30, vx: (Math.random() - .5) * 40, vy: 20 + Math.random() * 50,
        life: 0, max: 1.8 + Math.random() * 1.2, color: palette[i % palette.length], size: 1,
        grav: 50, drag: .99, w: 5, h: 3
      });
    }
  }

  drawRings(screen: Screen): void {
    if (this.reduceEffects) return;
    const ctx = screen.ctx;
    for (const ring of this.rings) {
      const k = 1 - ring.t / ring.max, r = ring.from + (ring.to - ring.from) * (1 - (1 - k) * (1 - k));
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k) * .9; ctx.strokeStyle = ring.color; ctx.lineWidth = Math.max(1, ring.width * (1 - k * .6));
      if (ring.square) ctx.strokeRect(Math.round(ring.x - r), Math.round(ring.y - r), Math.round(r * 2), Math.round(r * 2));
      else { ctx.beginPath(); ctx.arc(ring.x, ring.y, Math.max(1, r), 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
  }

  /** A short, heavy colour wash over the whole frame. */
  drawTint(screen: Screen): void {
    if (!this.tint || this.reduceEffects) return;
    const ctx = screen.ctx;
    ctx.save(); ctx.fillStyle = `rgba(${this.tint.color},${.3 * this.tint.t / this.tint.max})`; ctx.fillRect(0, 0, VIEW_W, screen.height); ctx.restore();
  }

  /** The frame leans in on a heavy hit: scale about the middle of the fight. */
  applyPunch(ctx: CanvasRenderingContext2D, height: number): void {
    if (this.reduceEffects || this.punch <= 0) return;
    const s = 1 + .05 * this.punch * this.punch, cx = VIEW_W / 2, cy = height * .55;
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  }

  // Esplosione di scintille nel punto colpito. Colore e quantità scalano con
  // l'efficacia: super = giallo abbondante, poco efficace = grigio sparso,
  // critico = bianco intenso.
  spawnImpact(defSide: BattleSide, typeMult: number, crit: boolean): void {
    const c = monsterCenter(defSide, this.viewHeight);
    const superHit = typeMult > 1;
    const weak = typeMult > 0 && typeMult < 1;
    const count = superHit ? 16 : weak ? 6 : crit ? 14 : 10;
    const palette = superHit
      ? ["#ffe98a", "#ffd23c", "#ff9a3c"]
      : weak
        ? ["#b8c0d0", "#8a93a8"]
        : crit
          ? ["#ffffff", "#ffe98a", "#ff6a6a"]
          : ["#f4f4e8", "#ffd23c"];
    const spread = superHit || crit ? 90 : 60;
    for (let i = 0; i < count; i += 1) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = spread * (0.5 + Math.random() * 0.8);
      this.particles.push({
        x: c.x + (Math.random() - 0.5) * 10,
        y: c.y + (Math.random() - 0.5) * 10,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 20,
        life: 0,
        max: 0.35 + Math.random() * 0.3,
        color: palette[Math.floor(Math.random() * palette.length)],
        size: superHit || crit ? 2 : 1
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.grav ?? 220) * dt; // gravità
      p.vx *= p.drag ?? 0.92;
      if (p.drag !== undefined) p.vy *= Math.pow(p.drag, dt * 60 / 2);
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  drawParticles(screen: Screen): void {
    if (this.reduceEffects) return;
    for (const p of this.particles) {
      const a = 1 - p.life / p.max;
      if (a <= 0) {
        continue;
      }
      const ctx = screen.ctx;
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.4);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w ?? p.size + 1, p.h ?? p.size + 1);
      ctx.restore();
    }
  }

  // Eight visual languages, shared by all damaging moves and by both modes.
  // Bounded to three small shapes; no extra asset decode or simulation state.
  drawMoveFx(screen: Screen): void {
    const fx = this.moveFx;
    if (!fx || this.reduceEffects) return;
    const from = monsterCenter(fx.side, this.viewHeight);
    const to = monsterCenter(fx.side === "player" ? "foe" : "player", this.viewHeight);
    const progress = 1 - fx.t / .4;
    const ctx = screen.ctx;
    ctx.save();
    ctx.fillStyle = TYPE_COLORS[fx.type];
    ctx.strokeStyle = TYPE_COLORS[fx.type];
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const t = Math.max(0, Math.min(1, progress * 1.35 - i * .13));
      if (t <= 0 || t >= 1) continue;
      const x = Math.round(from.x + (to.x - from.x) * t);
      const y = Math.round(from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 12);
      ctx.globalAlpha = Math.min(1, (1 - t) * 4);
      switch (fx.type) {
        case "POPULISMO":
          screen.rect(x - 5, y - 3, 6, 6, TYPE_COLORS[fx.type]);
          screen.rect(x + 1, y - 6, 3, 12, TYPE_COLORS[fx.type]);
          screen.rect(x - 4, y + 3, 2, 4, TYPE_COLORS[fx.type]);
          break;
        case "TECNO":
          for (let bar = 0; bar < 3; bar++) screen.rect(x - 5 + bar * 4, y - bar * 3, 3, 4 + bar * 3, TYPE_COLORS[fx.type]);
          break;
        case "DESTRA":
          ctx.beginPath(); ctx.moveTo(x - 5, y + 5); ctx.lineTo(x - 2, y - 3); ctx.lineTo(x, y); ctx.lineTo(x + 3, y - 7); ctx.lineTo(x + 5, y + 5); ctx.fill();
          break;
        case "SINISTRA":
          screen.rect(x - 5, y - 5, 2, 14, TYPE_COLORS[fx.type]); screen.rect(x - 3, y - 5, 9, 6, TYPE_COLORS[fx.type]);
          break;
        case "CENTRO":
          screen.frame(x - 7, y - 4, 9, 9, TYPE_COLORS[fx.type]); screen.frame(x - 1, y - 7, 9, 9, TYPE_COLORS[fx.type]);
          break;
        case "MEDIA":
          for (let wave = 0; wave < 3; wave++) { screen.rect(x - 5 + wave * 4, y - 2 - wave * 2, 2, 4 + wave * 4, TYPE_COLORS[fx.type]); }
          break;
        case "ISTITUZIONE":
          screen.rect(x - 6, y - 6, 10, 4, TYPE_COLORS[fx.type]); screen.rect(x - 1, y - 2, 2, 7, TYPE_COLORS[fx.type]); screen.rect(x - 6, y + 5, 13, 2, TYPE_COLORS[fx.type]);
          break;
        case "VERDE":
          ctx.beginPath(); ctx.moveTo(x - 6, y + 5); ctx.lineTo(x - 4, y - 3); ctx.lineTo(x + 6, y - 6); ctx.lineTo(x + 3, y + 4); ctx.closePath(); ctx.fill();
          screen.rect(x - 2, y, 2, 5, "#d7efd2");
          break;
      }
    }
    ctx.restore();
  }

  // Offset dello screen-shake da applicare a TUTTO il frame (ctx.translate):
  // ampiezza scalata dal "peso" dell'ultimo colpo (super/crit = shake 0.42 →
  // ampiezza piena; colpi normali = più contenuta). X e Y sfasati per un
  // tremolio credibile. La scena wrappa il disegno in questo offset.
  shakeOffset(): { x: number; y: number } {
    if (this.shake <= 0 || this.reduceEffects) {
      return { x: 0, y: 0 };
    }
    // 0.42 (super/crit) → amp ~3.2px; 0.22/0.16 (normale) → ~1.2/0.9px.
    const amp = Math.min(3.4, this.shake * 8);
    const x = Math.round(Math.sin(this.shake * 60) * amp);
    const y = Math.round(Math.cos(this.shake * 47) * amp * 0.6);
    return { x, y };
  }

  // Numero di danno flottante: parte dal punto colpito, sale, svanisce.
  spawnDamageNumber(defSide: BattleSide, damage: number, superHit: boolean, crit: boolean, weak = false): void {
    const c = monsterCenter(defSide, this.viewHeight);
    this.damageNumbers.push({
      x: c.x + (Math.random() - 0.5) * 10,
      y: c.y - 6,
      val: Math.max(1, Math.round(damage)),
      life: 0,
      max: crit || superHit ? 1.0 : 0.85,
      crit,
      super: superHit,
      weak,
      tag: superHit ? "Super efficace" : weak ? "Poco efficace" : undefined
    });
    // Tetto di sicurezza: non accumulare mai troppi numeri (perf mobile).
    if (this.damageNumbers.length > 6) {
      this.damageNumbers.shift();
    }
  }

  private updateDamageNumbers(dt: number): void {
    for (const d of this.damageNumbers) {
      d.life += dt;
      // Sale rallentando (ease-out): rapido all'inizio, poi si posa.
      if (!this.reduceEffects) d.y -= (26 - d.life * 14) * dt;
    }
    this.damageNumbers = this.damageNumbers.filter((d) => d.life < d.max);
  }

  // Aura di "carica" della mossa nemica: anelli concentrici che pulsano nel
  // colore della categoria (rosso fisico / blu speciale / viola status).
  drawTelegraph(screen: Screen, cx: number, cy: number): void {
    const tg = this.telegraph;
    if (!tg) {
      return;
    }
    const ctx = screen.ctx;
    const prog = this.reduceEffects ? .5 : 1 - tg.t / tg.max; // 0 -> 1
    const pulse = this.reduceEffects ? .5 : 0.5 + 0.5 * Math.sin(prog * Math.PI * 4);
    ctx.save();
    // Due anelli che si stringono verso il mostro mentre carica.
    for (let i = 0; i < 2; i += 1) {
      const r = 26 - prog * 10 + i * 8;
      ctx.globalAlpha = (0.45 - i * 0.15) * (0.6 + pulse * 0.4);
      ctx.strokeStyle = tg.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(4, r), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Disegna un mostro con animazione procedurale:
// - idle: leggero "respiro" (squash/stretch sinusoidale) ancorato alla base;
// - affondo: scatto in avanti + stretch nella direzione del colpo;
// - mostri chiave (starter/leggendari): bocca urlante durante l'affondo.
// (cx, by) = centro orizzontale e bordo inferiore del riquadro dello sprite.
const battleBoundsCache=new WeakMap<HTMLImageElement,{x:number;y:number;w:number;h:number}[]>();
function battleFrameBounds(image:HTMLImageElement,frame:number){
 let frames=battleBoundsCache.get(image);
 if(!frames){
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
   const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,256,64).data;
   frames=Array.from({length:4},(_,f)=>{let left=63,right=0,top=63,bottom=0;
     for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(pixels[(y*256+f*64+x)*4+3]>8){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
     return {x:f*64+left,y:top,w:Math.max(1,right-left+1),h:Math.max(1,bottom-top+1)};
   });battleBoundsCache.set(image,frames);
 }return frames[frame];
}

export function drawBattleMonster(
  screen: Screen,
  fx: BattleFx,
  comb: Combatant,
  cx: number,
  by: number,
  lungeT: number,
  flipX: boolean,
  who: BattleSide,
  size = 56
): void {
  const speciesId = comb.mon.speciesId;
  if (!MONSTERS_WITH_PNG.has(speciesId)) return;

  // Affondo: 0 a riposo, ~1 al picco del colpo.
  const lunge = !fx.reduceEffects && lungeT > 0 ? Math.sin((0.3 - lungeT) / 0.3 * Math.PI) : 0;

  // Respiro idle: ampiezza piccola, opposta su X/Y per conservare il volume.
  // Più marcato quando il giocatore è al menu (il mostro "aspetta").
  const breath = fx.reduceEffects ? 0 : Math.sin(fx.time * 2.4 + (who === "foe" ? 1.3 : 0)) * 0.03;
  // In a short view the player's sprite, standing in front, gives up a bit more than the foe's: the foe's plate sits above it.
  const view = battleFit(screen.height), fit = view * (1 - (who === "player" ? 0.4 : 0.2) * (1 - view));
  let sx = (1 - breath) * fit;
  let sy = (1 + breath) * fit;

  // Lo scatto schiaccia verticalmente e allunga in avanti (anticipa il colpo).
  sx += lunge * 0.14;
  sy -= lunge * 0.12;

  // Spostamento orizzontale dell'affondo (verso l'avversario).
  const dir = who === "foe" ? -1 : 1;
  let dx = Math.round(lunge * 10 * dir);

  // Contraccolpo: il colpito viene spinto indietro (più forte se super eff.).
  const kb = fx.knockback[who];
  if (kb > 0 && !fx.reduceEffects) {
    // Oscillazione smorzata: scatta indietro e rientra.
    dx += Math.round(Math.sin(kb * Math.PI) * 9 * -dir);
  }

  // KO leggibile: lo sprite affonda e si comprime invece di sparire nello
  // stesso frame in cui i PV arrivano a zero.
  const faintProgress = fx.faintT[who] > 0 ? 1 - fx.faintT[who] / 0.55 : 0;
  if (faintProgress > 0 && !fx.reduceEffects) {
    sy *= 1 - faintProgress * 0.62;
    sx *= 1 + faintProgress * 0.12;
  }

  // Status visivi: il movimento dello sprite "racconta" la condizione.
  const status = comb.mon.status;
  let scandaloFlicker = false;
  if (lunge < 0.1 && !fx.reduceEffects) {
    // (gli effetti status non sovrascrivono l'affondo del proprio attacco)
    if (status === "indagato") {
      // Trattenuto: dondola lento da un lato all'altro.
      dx += Math.round(Math.sin(fx.time * 2) * 2);
    } else if (status === "scandalo") {
      // Logorato: tremolio rapido + lampeggio rossastro.
      dx += Math.round(Math.sin(fx.time * 22) * 1.5);
      scandaloFlicker = Math.floor(fx.time * 10) % 2 === 0;
    }
    if (comb.gaffeTurns > 0) {
      // Confuso dalla gaffe: scossoni erratici su entrambi gli assi.
      dx += Math.round(Math.sin(fx.time * 17) * 2);
      sy += Math.sin(fx.time * 13) * 0.04;
    }
  }

  // I 52 fogli animati hanno la priorità. Il PNG d'azione resta un fallback
  // disponibile solo per le specie che lo dichiarano nel registry.
  const usePngAction = lunge > 0.4 && MONSTERS_WITH_ACTION_PNG.has(speciesId);
  const png = monsterImage(speciesId, usePngAction);
  const frames = monsterFramesImage(speciesId);
  let drawW: number;
  let drawH: number;
  let x: number;
  let y: number;
  screen.ctx.save();
  if (faintProgress > 0) screen.ctx.globalAlpha = Math.max(0.08, 1 - faintProgress);
  // The fainted monster tips toward its own side as it sinks, its feet kept on the ground.
  if (faintProgress > 0 && !fx.reduceEffects) {
    screen.ctx.translate(cx, by);
    screen.ctx.rotate(faintProgress * 0.36 * (who === "foe" ? 1 : -1));
    screen.ctx.translate(-cx, -by);
  }
  if (frames) {
    const frame=monsterPoseFrame(fx.time+(who==="foe"?1.3:0),lungeT,fx.reduceEffects);
    const bounds=battleFrameBounds(frames,frame);
    drawW=(who==="foe"?76:90)*sx;drawH=drawW*bounds.h/bounds.w*sy/sx;
    x=cx-drawW/2+dx;y=by-drawH+(fx.reduceEffects?0:faintProgress*13);
    const ctx=screen.ctx;ctx.save();
    if(flipX){ctx.translate(Math.round(x)+drawW,Math.round(y));ctx.scale(-1,1);screen.imageRegion(frames,bounds.x,bounds.y,bounds.w,bounds.h,0,0,drawW,drawH);}
    else screen.imageRegion(frames,bounds.x,bounds.y,bounds.w,bounds.h,x,y,drawW,drawH);
    ctx.restore();
  } else if (png) {
    const pngScale = size > 56 ? Math.min(size / png.height, (who === "foe" ? 132 : 88) / png.width) : size / png.height;
    drawW = png.width * pngScale * sx;
    drawH = png.height * pngScale * sy;
    x = cx - drawW / 2 + dx;
    y = by - drawH + (fx.reduceEffects ? 0 : faintProgress * 13);
    screen.imageSprite(png, x, y, { flipX, scaleX: sx * pngScale, scaleY: sy * pngScale });
  } else {
    // Decode o asset assente: placeholder neutro, mai una vecchia caricatura.
    drawW = 30;
    drawH = 38;
    x = cx - drawW / 2 + dx;
    y = by - drawH + (fx.reduceEffects ? 0 : faintProgress * 13);
    drawMonsterLoading(screen, x, y, drawW, drawH);
  }
  screen.ctx.restore();
  // Expose the actual painted rectangle for the runtime layout audit.
  screen.ctx.canvas.dataset[who==='foe'?'foeBounds':'playerBounds']=JSON.stringify({x,y,w:drawW,h:drawH,viewHeight:screen.height});

  // Forma meme: aura sottile sopra lo sprite originale, mai un rimpiazzo del
  // volto PixelLab. Anche il bonus tattico resta leggibile senza solo colore.
  const form = memeForm(comb.mon.memeFormId);
  if (form && form.speciesId === speciesId) {
    screen.frame(Math.round(x - 2), Math.round(y - 2), Math.ceil(drawW + 4), Math.ceil(drawH + 4), form.accent);
  }

  // Velo rosso pulsante sopra il mostro logorato dallo SCANDALO.
  if (scandaloFlicker) {
    const ctx = screen.ctx;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#d83c3c";
    ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(drawW), Math.ceil(drawH));
    ctx.restore();
  }

}

// Riesportato per comodità delle scene (VIEW_H serve al pannello testo).
export { VIEW_H, VIEW_W };

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
