import { CHAR_W, GLYPH_H, GLYPH_W, getGlyph } from "./font";

export const VIEW_W = 240;
export const VIEW_H = 180;

export interface Pixmap {
  art: string[];
  pal: Record<string, string>;
}

// Renderer pixel-perfect su canvas 240x180, con cache degli sprite.
export class Screen {
  readonly ctx: CanvasRenderingContext2D;
  private spriteCache = new Map<string, HTMLCanvasElement>();

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D non disponibile.");
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.fitToWindow();
    const refit = () => this.fitToWindow();
    window.addEventListener("resize", refit);
    window.visualViewport?.addEventListener("resize", refit);
  }

  private fitToWindow(): void {
    const touch = document.body.classList.contains("touch");
    const viewport = window.visualViewport;
    const viewportW = viewport?.width ?? window.innerWidth;
    const viewportH = viewport?.height ?? window.innerHeight;
    const reservedH = touch ? 186 : 30;
    const availW = Math.max(240, viewportW - (touch ? 38 : 28));
    const availH = Math.max(160, viewportH - reservedH);
    const rawScale = Math.min(availW / VIEW_W, availH / VIEW_H);
    const scale = touch ? Math.max(1, rawScale) : Math.max(1, Math.floor(rawScale));
    this.canvas.style.width = `${VIEW_W * scale}px`;
    this.canvas.style.height = `${VIEW_H * scale}px`;
  }

  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  frame(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, 1);
    this.ctx.fillRect(x, y + h - 1, w, 1);
    this.ctx.fillRect(x, y, 1, h);
    this.ctx.fillRect(x + w - 1, y, 1, h);
  }

  // Riquadro di dialogo in stile Game Boy: doppio bordo arrotondato.
  panel(x: number, y: number, w: number, h: number): void {
    this.rect(x + 1, y + 1, w - 2, h - 2, "#f8f8f0");
    this.frame(x + 1, y + 1, w - 2, h - 2, "#f8f8f0");
    this.frame(x + 2, y + 2, w - 4, h - 4, "#10141f");
    this.frame(x + 4, y + 4, w - 8, h - 8, "#9aa0b8");
    this.rect(x + 5, y + 5, w - 10, h - 10, "#f8f8f0");
  }

  // Pre-rasterizza una pixmap su canvas off-screen (cache per id+flip).
  private rasterize(id: string, pix: Pixmap, flipX: boolean): HTMLCanvasElement {
    const key = `${id}${flipX ? ":f" : ""}`;
    const cached = this.spriteCache.get(key);
    if (cached) {
      return cached;
    }
    const h = pix.art.length;
    const w = pix.art[0]?.length ?? 0;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");
    if (!octx) {
      throw new Error("Canvas off-screen non disponibile.");
    }
    for (let ry = 0; ry < h; ry += 1) {
      const row = pix.art[ry];
      for (let rx = 0; rx < w; rx += 1) {
        const ch = row[rx];
        if (ch === "." || ch === " ") {
          continue;
        }
        const color = pix.pal[ch];
        if (!color) {
          continue;
        }
        octx.fillStyle = color;
        octx.fillRect(flipX ? w - 1 - rx : rx, ry, 1, 1);
      }
    }
    this.spriteCache.set(key, off);
    return off;
  }

  sprite(
    id: string,
    pix: Pixmap,
    x: number,
    y: number,
    opts?: { flipX?: boolean; scale?: number; scaleX?: number; scaleY?: number }
  ): void {
    const img = this.rasterize(id, pix, opts?.flipX ?? false);
    const s = opts?.scale ?? 1;
    const sx = (opts?.scaleX ?? 1) * s;
    const sy = (opts?.scaleY ?? 1) * s;
    this.ctx.drawImage(img, Math.round(x), Math.round(y), img.width * sx, img.height * sy);
  }

  spriteHeight(pix: Pixmap): number {
    return pix.art.length;
  }

  text(value: string, x: number, y: number, color = "#10141f", scale = 1): void {
    if (value == null) {
      return; // difesa: niente crash se arriva un valore mancante
    }
    this.ctx.fillStyle = color;
    let cx = Math.round(x);
    const cy = Math.round(y);
    for (const raw of value) {
      const glyph = getGlyph(raw);
      if (glyph) {
        for (let gy = 0; gy < GLYPH_H; gy += 1) {
          const row = glyph[gy];
          for (let gx = 0; gx < GLYPH_W; gx += 1) {
            if (row[gx] === "#") {
              this.ctx.fillRect(cx + gx * scale, cy + gy * scale, scale, scale);
            }
          }
        }
      }
      cx += CHAR_W * scale;
    }
  }

  textRight(value: string, rightX: number, y: number, color = "#10141f"): void {
    const v = value ?? "";
    this.text(v, rightX - v.length * CHAR_W + 1, y, color);
  }

  textCenter(value: string, centerX: number, y: number, color = "#10141f", scale = 1): void {
    const v = value ?? "";
    this.text(v, centerX - Math.floor((v.length * CHAR_W * scale) / 2), y, color, scale);
  }

  dim(alpha: number): void {
    this.ctx.fillStyle = `rgba(8, 10, 18, ${alpha})`;
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Disegna un'immagine bitmap (es. splash AI della title) coprendo l'area data
  // (default: tutto lo schermo). Nearest-neighbor, coerente col resto.
  image(
    img: CanvasImageSource,
    x = 0,
    y = 0,
    w = VIEW_W,
    h = VIEW_H
  ): void {
    this.ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
  }
}
