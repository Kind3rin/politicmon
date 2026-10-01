import type { Screen } from "../engine/screen";
import { getSpriteImage } from "../engine/assets";
import { memeForm } from "../game/memeForms";
import { drawMonsterFrame, monsterFramesImage, monsterPoseFrame } from "./monsterFrames";

// Roster completo migrato ai PNG: non carica più caricature testuali.
export const MONSTERS_WITH_PNG = new Set<string>([
  "salvinator", "giorgiagon", "ellyna", "schleinix", "renzino", "grillix",
  "renzilla", "contemorfo", "calendauro", "vannaccix", "tajanide", "berlusconix",
  "draghimon", "trumpon", "xipanda", "macronfox", "mattarellux", "putingrad",
  "bunkerput", "ursulax", "bojoon", "zelenskir", "muskrat", "vaffenix", "capitanone", "mediocrate",
  "giorgetta", "salvinott", "movimenton", "marsrat", "pontigor", "conteblob",
  "calendrone", "generorso", "tajacolomba", "telecrate", "pontimax",
  "futurorso",
  "verdolino", "ecoverdon", "contepop", "salvinurlo", "verdoribelle",
  "salistrobo", "salisound", "gianimago", "quasimagiani", "crosettank",
  "fratocorno", "campocorno", "nordiodo", "referendodo"
]);

export const MONSTERS_WITH_ACTION_PNG = new Set<string>([
  "salistrobo", "salisound", "futurorso", "gianimago", "quasimagiani", "crosettank",
  "fratocorno", "campocorno", "nordiodo", "referendodo"
]);

export function monsterImage(speciesId: string, action = false): HTMLImageElement | null {
  const registry = action ? MONSTERS_WITH_ACTION_PNG : MONSTERS_WITH_PNG;
  if (!registry.has(speciesId)) {
    return null;
  }
  const suffix = action ? "_action" : "";
  return getSpriteImage(`mon:${speciesId}${suffix}`, `monsters/${speciesId}${suffix}.png`);
}

// Un PNG dichiarato nel registry non deve mai mostrare per un frame la vecchia
// caricatura testuale: su rete mobile quel flash sembra un asset corrotto. In
// attesa del decode usiamo un placeholder neutro, piccolo e riconoscibile.
export function drawMonsterLoading(
  screen: Screen,
  x: number,
  y: number,
  boxW: number,
  boxH: number
): void {
  const w = Math.min(26, Math.max(14, boxW - 8));
  const h = Math.min(30, Math.max(16, boxH - 6));
  const px = Math.round(x + (boxW - w) / 2);
  const py = Math.round(y + boxH - h);
  screen.rect(px, py, w, h, "#1b2b42");
  screen.frame(px, py, w, h, "#6d829c");
  screen.text("…", px + Math.floor(w / 2) - 3, py + Math.floor(h / 2) - 3, "#e6b944");
}

// Ritratti condivisi: foglio Higgsfield, PNG base o placeholder neutro.
export function drawMonsterSprite(
  screen: Screen,
  speciesId: string,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  opts?: { flipX?: boolean; memeFormId?: string; animationTime?: number }
): void {
  const form = memeForm(opts?.memeFormId);
  if (form && form.speciesId === speciesId) {
    screen.frame(x, y, boxW, boxH, form.accent);
    screen.rect(x + boxW - 5, y + 2, 3, 3, form.accent);
  }
  const frames = monsterFramesImage(speciesId);
  if (frames) {
    const scale = Math.min(boxW / 64, boxH / 52);
    const dw = 64 * scale; const dh = 52 * scale;
    drawMonsterFrame(screen, frames, monsterPoseFrame(opts?.animationTime ?? 0), x + (boxW - dw) / 2, y + boxH - dh, dw, dh, opts?.flipX, true);
    return;
  }
  const png = monsterImage(speciesId);
  if (png) {
    const b = screen.imageBounds(png);
    const scale = Math.min(boxW / b.w, boxH / b.h);
    const dw = b.w * scale;
    const dh = b.h * scale;
    screen.imageSpriteCropped(png, x + (boxW - dw) / 2, y + boxH - dh, { scaleX: scale, scaleY: scale, flipX: opts?.flipX });
    return;
  }
  drawMonsterLoading(screen, x, y, boxW, boxH);
}
