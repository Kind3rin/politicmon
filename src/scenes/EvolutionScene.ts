import { MONSTER_ART, drawMonsterSprite } from "../art/monsters";
import { SPECIES } from "../data/species";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { wrapText, INK } from "../ui/widgets";

// Scena dedicata all'evoluzione, in stile Pokémon: lo sprite del POLITICMON
// pulsa alternando la forma vecchia e quella nuova sempre più in fretta, poi un
// flash bianco e — PUF! — appare la forma evoluta, con fanfara.
//
// Fasi:
//  0 intro   - sprite vecchio fermo, "X si sta evolvendo..."
//  1 morph   - alterna vecchio/nuovo accelerando + bagliore crescente
//  2 flash   - schermo che sbianca, jingle
//  3 reveal  - nuovo sprite + scritta finale, attende conferma
export class EvolutionScene implements Scene {
  private time = 0;
  private phase = 0;
  private phaseT = 0;
  private done = false;

  // Durate (s) delle fasi animate.
  private static INTRO = 1.6;
  private static MORPH = 2.8;
  private static FLASH = 0.7;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private fromId: string,
    private toId: string,
    private onDone: () => void
  ) {
    // Niente cambio di traccia: il momento è scandito dai jingle (PUF! + fanfara),
    // così non c'è uno stacco musicale brusco entrando nella scena.
  }

  update(dt: number): void {
    this.time += dt;
    this.phaseT += dt;
    if (this.phase === 0 && this.phaseT >= EvolutionScene.INTRO) {
      this.phase = 1;
      this.phaseT = 0;
    } else if (this.phase === 1 && this.phaseT >= EvolutionScene.MORPH) {
      this.phase = 2;
      this.phaseT = 0;
      audio.catchJingle(); // momento del "PUF!"
    } else if (this.phase === 2 && this.phaseT >= EvolutionScene.FLASH) {
      this.phase = 3;
      this.phaseT = 0;
      audio.levelUp(); // fanfara di rivelazione
    }
    // Nella fase finale si conferma per uscire.
    if (this.phase === 3 && !this.done) {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) {
        this.done = true;
        this.stack.pop();
        this.onDone();
      }
    }
  }

  // Quanto velocemente alterna le forme: parte lento, finisce frenetico.
  private morphShowsNew(): boolean {
    const p = Math.min(1, this.phaseT / EvolutionScene.MORPH);
    const freq = 2 + p * 16; // Hz crescente
    return Math.sin(this.phaseT * freq * Math.PI) > 0;
  }

  private drawMon(screen: Screen, speciesId: string, glow: number, scaleBoost = 0): void {
    const art = MONSTER_ART[speciesId];
    if (!art) {
      return;
    }
    const w = art.art[0].length;
    const h = art.art.length;
    const scale = 3 + scaleBoost;
    const cx = VIEW_W / 2;
    const by = 104;
    const drawW = w * scale;
    const drawH = h * scale;
    const x = cx - drawW / 2;
    const y = by - drawH;
    // Alone luminoso dietro lo sprite (cresce col morph).
    if (glow > 0) {
      const r = Math.round(20 + glow * 40);
      screen.ctx.save();
      screen.ctx.globalAlpha = Math.min(0.85, glow);
      screen.ctx.fillStyle = "#fff7d6";
      screen.ctx.beginPath();
      screen.ctx.arc(cx, by - drawH / 2, r, 0, Math.PI * 2);
      screen.ctx.fill();
      screen.ctx.restore();
    }
    // PNG PixelLab (o pixmap fallback) dentro la stessa box dell'animazione.
    drawMonsterSprite(screen, speciesId, art, x, y, drawW, drawH);
  }

  draw(screen: Screen): void {
    screen.clear("#0a1024");
    // Stelline/scintille di fondo che ruotano piano (atmosfera "magica").
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2 + this.time * 0.4;
      const rad = 60 + (i % 4) * 18;
      const sx = Math.round(VIEW_W / 2 + Math.cos(a) * rad);
      const sy = Math.round(70 + Math.sin(a) * rad * 0.7);
      const tw = (Math.sin(this.time * 3 + i) + 1) / 2;
      screen.rect(sx, sy, 1, 1, tw > 0.5 ? "#5a6da0" : "#39415a");
    }

    if (this.phase === 0) {
      this.drawMon(screen, this.fromId, 0);
      this.banner(screen, `${SPECIES[this.fromId].name} si sta evolvendo...`);
    } else if (this.phase === 1) {
      const p = this.phaseT / EvolutionScene.MORPH;
      const showNew = this.morphShowsNew();
      // Verso la fine, lo sprite si "gonfia" leggermente di luce.
      this.drawMon(screen, showNew ? this.toId : this.fromId, p, p * 0.6);
      this.banner(screen, "...");
    } else if (this.phase === 2) {
      // Flash bianco accecante che copre tutto, poi sfuma.
      const k = 1 - this.phaseT / EvolutionScene.FLASH;
      this.drawMon(screen, this.toId, 1, 0.6);
      screen.ctx.save();
      screen.ctx.globalAlpha = Math.max(0, k);
      screen.ctx.fillStyle = "#ffffff";
      screen.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      screen.ctx.restore();
    } else {
      // Rivelazione: nuovo sprite con un pulsare gioioso.
      const bob = Math.sin(this.time * 4) * 0.05;
      this.drawMon(screen, this.toId, 0, bob);
      this.banner(screen, `Congratulazioni! ${SPECIES[this.fromId].name} è diventato ${SPECIES[this.toId].name}!`);
      screen.textCenter("A: continua", VIEW_W / 2, VIEW_H - 12, "#9aa0b8");
    }
  }

  private banner(screen: Screen, text: string): void {
    screen.panel(6, VIEW_H - 40, VIEW_W - 12, 32);
    const lines = wrapText(text, 36);
    for (let i = 0; i < Math.min(2, lines.length); i += 1) {
      screen.text(lines[i], 14, VIEW_H - 32 + i * 10, INK);
    }
  }
}
