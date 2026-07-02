// Presentazione condivisa delle scene di battaglia (PVE BattleScene + PvpBattleScene).
// Estrazione MECCANICA da BattleScene: effetti colpo (shake/hit-stop/particelle),
// banner d'efficacia, telegrafia, disegno animato dei mostri e box HP.
// NESSUNA logica di gioco qui: solo stato visivo e disegno.

import { MONSTER_ART, MONSTER_ACTION_ART, monsterImage } from "../../art/monsters";
import { STATUS_LABELS } from "../../data/moves";
import { audio } from "../../engine/audio";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import { speciesOf, statsOf, type Monster } from "../monster";
import type { Combatant } from "./sim";
import { drawHpBar, INK, PAPER } from "../../ui/widgets";

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
}

// Centro approssimativo dello sprite di un combattente (per le particelle).
export function monsterCenter(who: BattleSide): { x: number; y: number } {
  return who === "foe" ? { x: 162, y: 50 } : { x: 56, y: 100 };
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
  time = 0;
  shake = 0;
  lungeT: Record<BattleSide, number> = { player: 0, foe: 0 };
  flashT: Record<BattleSide, number> = { player: 0, foe: 0 };
  knockback: Record<BattleSide, number> = { player: 0, foe: 0 };
  hitStop = 0;
  levelFlash = 0;
  catchFlash = 0;
  particles: ImpactParticle[] = [];
  effFx: { kind: "super" | "weak" | "crit"; t: number } | null = null;
  telegraph: { side: BattleSide; color: string; t: number; max: number } | null = null;

  update(dt: number): void {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.lungeT.player = Math.max(0, this.lungeT.player - dt);
    this.lungeT.foe = Math.max(0, this.lungeT.foe - dt);
    this.flashT.player = Math.max(0, this.flashT.player - dt);
    this.flashT.foe = Math.max(0, this.flashT.foe - dt);
    // Contraccolpo: rientra in ~0.25s (1 -> 0).
    this.knockback.player = Math.max(0, this.knockback.player - dt * 4);
    this.knockback.foe = Math.max(0, this.knockback.foe - dt * 4);
    this.levelFlash = Math.max(0, this.levelFlash - dt);
    this.catchFlash = Math.max(0, this.catchFlash - dt);
    this.updateParticles(dt);
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
  // d'efficacia + suono. `attacker` è chi ha colpito.
  onHit(attacker: BattleSide, typeMult: number, crit: boolean): void {
    const defSide: BattleSide = attacker === "player" ? "foe" : "player";
    this.lungeT[attacker] = 0.3;
    this.flashT[defSide] = 0.45;
    const superHit = typeMult >= 2;
    // Lo shake e il contraccolpo scalano col "peso" del colpo.
    this.shake = superHit || crit ? 0.42 : attacker === "foe" ? 0.22 : 0.16;
    this.hitStop = superHit || crit ? 0.09 : 0.05;
    this.knockback[defSide] = superHit ? 1 : 0.55;
    this.spawnImpact(defSide, typeMult, crit);
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

  // Esplosione di scintille nel punto colpito. Colore e quantità scalano con
  // l'efficacia: super = giallo abbondante, poco efficace = grigio sparso,
  // critico = bianco intenso.
  spawnImpact(defSide: BattleSide, typeMult: number, crit: boolean): void {
    const c = monsterCenter(defSide);
    const superHit = typeMult >= 2;
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
      p.vy += 220 * dt; // gravità
      p.vx *= 0.92;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  drawParticles(screen: Screen): void {
    for (const p of this.particles) {
      const a = 1 - p.life / p.max;
      if (a <= 0) {
        continue;
      }
      const ctx = screen.ctx;
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.4);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size + 1, p.size + 1);
      ctx.restore();
    }
  }

  // Banner d'efficacia che entra "a molla", resta, poi svanisce.
  drawEffFx(screen: Screen): void {
    if (!this.effFx) {
      return;
    }
    const { kind, t } = this.effFx;
    const label = kind === "super" ? "SUPER EFFICACE!" : kind === "weak" ? "POCO EFFICACE" : "CRITICO!";
    const color = kind === "super" ? "#ffd23c" : kind === "weak" ? "#9aa0b8" : "#ff6a6a";
    // Entrata: il primo terzo del tempo ingrandisce; poi sta; ultimo terzo sfuma.
    const total = kind === "super" ? 0.9 : kind === "weak" ? 0.7 : 0.8;
    const prog = 1 - t / total;
    const pop = Math.min(1, prog / 0.25);
    const fade = prog > 0.7 ? 1 - (prog - 0.7) / 0.3 : 1;
    const ctx = screen.ctx;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    // Leggera oscillazione verticale per "vivacità". Posizionato sotto le
    // barre HP del nemico per non coprirle.
    const wob = Math.sin(prog * 14) * (kind === "super" ? 2 : 1) * (1 - prog);
    const y = 40 + (1 - pop) * -8 + wob;
    const scale = kind === "weak" ? 1 : 1 + (1 - pop) * 0.6;
    // Ombra + testo centrato, scalato.
    const drawScaled = (txt: string, oy: number, col: string) => {
      // Sfrutta textCenter con dimensione intera; per "scale" usiamo size 1..2.
      const size = scale >= 1.5 ? 2 : 1;
      screen.textCenter(txt, VIEW_W / 2, y + oy, col, size);
    };
    drawScaled(label, 2, "rgba(16,20,31,0.7)");
    drawScaled(label, 0, color);
    ctx.restore();
  }

  // Aura di "carica" della mossa nemica: anelli concentrici che pulsano nel
  // colore della categoria (rosso fisico / blu speciale / viola status).
  drawTelegraph(screen: Screen, cx: number, cy: number): void {
    const tg = this.telegraph;
    if (!tg) {
      return;
    }
    const ctx = screen.ctx;
    const prog = 1 - tg.t / tg.max; // 0 -> 1
    const pulse = 0.5 + 0.5 * Math.sin(prog * Math.PI * 4);
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
export function drawBattleMonster(
  screen: Screen,
  fx: BattleFx,
  comb: Combatant,
  cx: number,
  by: number,
  lungeT: number,
  flipX: boolean,
  who: BattleSide
): void {
  const speciesId = comb.mon.speciesId;
  const baseArt = MONSTER_ART[speciesId];
  if (!baseArt) {
    return;
  }
  const w = baseArt.art[0]?.length ?? 24;
  const h = baseArt.art.length;
  const scale = 2;

  // Affondo: 0 a riposo, ~1 al picco del colpo.
  const lunge = lungeT > 0 ? Math.sin((0.3 - lungeT) / 0.3 * Math.PI) : 0;

  // Respiro idle: ampiezza piccola, opposta su X/Y per conservare il volume.
  // Più marcato quando il giocatore è al menu (il mostro "aspetta").
  const breath = Math.sin(fx.time * 2.4 + (who === "foe" ? 1.3 : 0)) * 0.03;
  let sx = 1 - breath;
  let sy = 1 + breath;

  // Lo scatto schiaccia verticalmente e allunga in avanti (anticipa il colpo).
  sx += lunge * 0.14;
  sy -= lunge * 0.12;

  // Spostamento orizzontale dell'affondo (verso l'avversario).
  const dir = who === "foe" ? -1 : 1;
  let dx = Math.round(lunge * 10 * dir);

  // Contraccolpo: il colpito viene spinto indietro (più forte se super eff.).
  const kb = fx.knockback[who];
  if (kb > 0) {
    // Oscillazione smorzata: scatta indietro e rientra.
    dx += Math.round(Math.sin(kb * Math.PI) * 9 * -dir);
  }

  // Status visivi: il movimento dello sprite "racconta" la condizione.
  const status = comb.mon.status;
  let scandaloFlicker = false;
  if (lunge < 0.1) {
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

  // Frame d'azione (bocca urlante) per i mostri chiave durante l'affondo.
  const action = MONSTER_ACTION_ART[speciesId];
  const useAction = action && lunge > 0.4;
  const art = useAction ? action : baseArt;
  const key = `${who === "foe" ? "battle" : "battleback"}:${speciesId}${useAction ? ":a" : ""}`;

  // Redesign PixelLab: se c'è uno sprite PNG pronto per la specie, lo si disegna
  // al posto della pixmap, conservando TUTTA l'animazione procedurale (respiro,
  // affondo, contraccolpo, status) già calcolata in sx/sy/dx. Ancoraggio
  // identico (centro in basso fermo). Il PNG è 64px: lo si scala per stare in
  // linea con gli altri mostri (pixmap ~48px renderizzati). Gli effetti
  // post-draw (velo SCANDALO, simbolo status) restano condivisi sotto.
  const png = monsterImage(speciesId);
  let drawW: number;
  let drawH: number;
  let x: number;
  let y: number;
  if (png) {
    const pngScale = 56 / png.height; // altezza target ~56px
    drawW = png.width * pngScale * sx;
    drawH = png.height * pngScale * sy;
    x = cx - drawW / 2 + dx;
    y = by - drawH;
    screen.imageSprite(png, x, y, { flipX, scaleX: sx * pngScale, scaleY: sy * pngScale });
  } else {
    drawW = w * scale * sx;
    drawH = h * scale * sy;
    // Ancoraggio: centro in basso resta fermo (lo scaling non fa "fluttuare").
    x = cx - drawW / 2 + dx;
    y = by - drawH;
    screen.sprite(key, art, x, y, { flipX, scaleX: sx, scaleY: sy, scale });
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

  // Simbolo fluttuante dello status sopra la testa (oltre all'icona nel box).
  if (lunge < 0.1) {
    const sym = status === "indagato" ? "!" : status === "scandalo" ? "$" : comb.gaffeTurns > 0 ? "?" : "";
    if (sym) {
      const symColor = status === "scandalo" ? "#ffd23c" : status === "indagato" ? "#e8e8e8" : "#b86ad8";
      const floatY = y - 8 + Math.sin(fx.time * 3 + (who === "foe" ? 0 : 1.5)) * 2;
      screen.text(sym, Math.round(cx) - 2, Math.round(floatY), symColor);
    }
  }
}

// Geometrie dei due box HP (identiche al layout storico di BattleScene).
export interface CombatantBoxOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  hpY: number; // offset verticale della barra HP dentro il box
  hpW: number;
  showHpText: boolean; // solo il box del "player" mostra i PV numerici
}

export const FOE_BOX: CombatantBoxOpts = { x: 6, y: 8, w: 104, h: 30, hpY: 17, hpW: 70, showHpText: false };
export const PLAYER_BOX: CombatantBoxOpts = { x: 126, y: 78, w: 110, h: 38, hpY: 16, hpW: 76, showHpText: true };

// Box HP di un combattente (fusione di drawFoeBox/drawPlayerBox). La barra EXP
// resta fuori (solo PVE, disegnata dalla BattleScene).
export function drawCombatantBox(screen: Screen, mon: Monster, displayHp: number, opts: CombatantBoxOpts): void {
  const { x, y, w, h } = opts;
  screen.panel(x, y, w, h);
  screen.text(speciesOf(mon).name, x + 6, y + 6, INK);
  screen.textRight(`L${mon.level}`, x + w - 6, y + 6, INK);
  drawHpBar(screen, x + 22, y + opts.hpY, opts.hpW, displayHp, statsOf(mon).hp);
  if (opts.showHpText) {
    screen.textRight(`${Math.round(displayHp)}/${statsOf(mon).hp}`, x + 98, y + 25, INK);
  }
  if (mon.status) {
    const sy = opts.showHpText ? y + 25 : y + 16;
    screen.rect(x + 6, sy, 16, 9, "#b04848");
    screen.text(STATUS_LABELS[mon.status], x + 7, sy + 1, PAPER);
  }
}

// Riesportato per comodità delle scene (VIEW_H serve al pannello testo).
export { VIEW_H, VIEW_W };
