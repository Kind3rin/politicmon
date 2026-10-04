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
}

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
}

// Centro approssimativo dello sprite di un combattente (per le particelle).
export function battleGeometry(height = VIEW_H): { foeBase: number; playerBase: number; size: number } {
  return { foeBase: Math.round(height * .67), playerBase: Math.round(height * .93), size: 88 };
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

  update(dt: number): void {
    this.time += dt;
    if (this.moveFx) {
      this.moveFx.t -= dt;
      if (this.moveFx.t <= 0) this.moveFx = null;
    }
    this.shake = Math.max(0, this.shake - dt);
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
  onHit(attacker: BattleSide, typeMult: number, crit: boolean, damage = 0, moveType?: PolType): void {
    const defSide: BattleSide = attacker === "player" ? "foe" : "player";
    this.lungeT[attacker] = this.reduceEffects ? 0 : 0.3;
    this.flashT[defSide] = this.reduceEffects ? 0 : 0.45;
    const superHit = typeMult > 1;
    // Lo shake e il contraccolpo scalano col "peso" del colpo.
    this.shake = superHit || crit ? 0.42 : attacker === "foe" ? 0.22 : 0.16;
    this.hitStop = this.reduceEffects ? 0 : superHit || crit ? 0.09 : 0.05;
    this.knockback[defSide] = this.reduceEffects ? 0 : superHit ? 1 : 0.55;
    if (!this.reduceEffects) {
      this.spawnImpact(defSide, typeMult, crit);
      if (moveType) this.moveFx = { side: attacker, type: moveType, t: .4 };
    }
    if (damage > 0) {
      this.spawnDamageNumber(defSide, damage, typeMult > 1, crit);
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
      p.vy += 220 * dt; // gravità
      p.vx *= 0.92;
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
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size + 1, p.size + 1);
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
  spawnDamageNumber(defSide: BattleSide, damage: number, superHit: boolean, crit: boolean): void {
    const c = monsterCenter(defSide, this.viewHeight);
    this.damageNumbers.push({
      x: c.x + (Math.random() - 0.5) * 10,
      y: c.y - 6,
      val: Math.max(1, Math.round(damage)),
      life: 0,
      max: crit || superHit ? 1.0 : 0.85,
      crit,
      super: superHit
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
