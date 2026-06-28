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
    const reservedH = touch ? 150 : 30;
    const availW = Math.max(240, viewportW - (touch ? 16 : 28));
    const availH = Math.max(160, viewportH - reservedH);
    const rawScale = Math.min(availW / VIEW_W, availH / VIEW_H);

    // Backing store ad alta densità: senza tener conto di devicePixelRatio, su
    // ogni schermo HiDPI/Retina (tutti i telefoni moderni) il browser sfoca il
    // bitmap 240x180. Disegniamo a risoluzione fisica e teniamo le coordinate
    // logiche a 240x180 via setTransform.
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));

    // Il backing store resta un multiplo INTERO di 240x180 (pixel del bitmap
    // tutti uguali, niente shimmer). Per la nitidezza lo teniamo denso: arrotonda
    // per ECCESSO la scala * dpr, così il buffer fisico è sempre >= della box CSS
    // e il browser fa un downscale pulito (non un upscale nearest sfocato).
    const backScale = Math.max(1, Math.ceil(rawScale * dpr));
    const bw = VIEW_W * backScale;
    const bh = VIEW_H * backScale;
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    // La dimensione CSS usa la scala FRAZIONARIA: riempie lo spazio disponibile
    // (niente letterbox da floor). Il downscale del buffer denso resta nitido.
    this.canvas.style.width = `${VIEW_W * rawScale}px`;
    this.canvas.style.height = `${VIEW_H * rawScale}px`;
    // Cambiare width/height resetta il contesto: ri-applica transform e smoothing.
    this.ctx.setTransform(backScale, 0, 0, backScale, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
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

  // Cornice 9-slice PixelLab (opzionale). Se impostata, `panel()` la usa al posto
  // del doppio bordo disegnato a codice. `border` = spessore (px sorgente) degli
  // angoli che NON si stirano. Si imposta da engine/assets via setPanelImage().
  private panelImg: HTMLImageElement | null = null;
  private panelBorder = 8;

  setPanelImage(img: HTMLImageElement | null, border = 8): void {
    this.panelImg = img;
    this.panelBorder = border;
  }

  // Riquadro di dialogo. Con cornice 9-slice PixelLab se disponibile, altrimenti
  // il doppio bordo in stile Game Boy (fallback, identico a prima).
  panel(x: number, y: number, w: number, h: number): void {
    if (this.panelImg) {
      this.nineSlice(this.panelImg, this.panelBorder, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      return;
    }
    this.rect(x + 1, y + 1, w - 2, h - 2, "#f8f8f0");
    this.frame(x + 1, y + 1, w - 2, h - 2, "#f8f8f0");
    this.frame(x + 2, y + 2, w - 4, h - 4, "#10141f");
    this.frame(x + 4, y + 4, w - 8, h - 8, "#9aa0b8");
    this.rect(x + 5, y + 5, w - 10, h - 10, "#f8f8f0");
  }

  // Disegna `img` come box 9-slice: i 4 angoli (b×b) restano fissi, i 4 bordi si
  // stirano lungo un asse, il centro si stira su entrambi. Niente deformazione
  // degli angoli a qualsiasi dimensione (w,h). imageSmoothing già off (nitido).
  nineSlice(img: HTMLImageElement, b: number, x: number, y: number, w: number, h: number): void {
    const iw = img.width;
    const ih = img.height;
    const sb = Math.min(b, Math.floor(iw / 2), Math.floor(ih / 2));
    const sMidW = iw - sb * 2;
    const sMidH = ih - sb * 2;
    const dMidW = Math.max(0, w - sb * 2);
    const dMidH = Math.max(0, h - sb * 2);
    const ctx = this.ctx;
    const d = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) => {
      if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) {
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    };
    // angoli
    d(0, 0, sb, sb, x, y, sb, sb);
    d(iw - sb, 0, sb, sb, x + w - sb, y, sb, sb);
    d(0, ih - sb, sb, sb, x, y + h - sb, sb, sb);
    d(iw - sb, ih - sb, sb, sb, x + w - sb, y + h - sb, sb, sb);
    // bordi
    d(sb, 0, sMidW, sb, x + sb, y, dMidW, sb);
    d(sb, ih - sb, sMidW, sb, x + sb, y + h - sb, dMidW, sb);
    d(0, sb, sb, sMidH, x, y + sb, sb, dMidH);
    d(iw - sb, sb, sb, sMidH, x + w - sb, y + sb, sb, dMidH);
    // centro
    d(sb, sb, sMidW, sMidH, x + sb, y + sb, dMidW, dMidH);
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

  // Disegna uno sprite PNG (redesign PixelLab) con le stesse opzioni di `sprite`.
  // Pensato per essere intercambiabile col rendering Pixmap: stesso ancoraggio
  // (top-left a x,y), stesso flip/scala. La sorgente è già un'immagine bitmap
  // pronta (vedi engine/assets.ts), nearest-neighbor garantito da imageSmoothing
  // disabilitato. `flipX` usa una trasformazione locale per non sporcare lo stato.
  imageSprite(
    img: HTMLImageElement,
    x: number,
    y: number,
    opts?: { flipX?: boolean; scale?: number; scaleX?: number; scaleY?: number }
  ): void {
    const s = opts?.scale ?? 1;
    const sx = (opts?.scaleX ?? 1) * s;
    const sy = (opts?.scaleY ?? 1) * s;
    const w = img.width * sx;
    const h = img.height * sy;
    const dx = Math.round(x);
    const dy = Math.round(y);
    if (opts?.flipX) {
      this.ctx.save();
      this.ctx.translate(dx + w, dy);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(img, 0, 0, w, h);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(img, dx, dy, w, h);
    }
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
