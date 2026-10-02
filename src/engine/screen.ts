import { CHAR_W, GLYPH_H, GLYPH_W, getGlyph } from "./font";

export const VIEW_W = 240;
export const VIEW_H = 180;

export interface Pixmap {
  art: string[];
  pal: Record<string, string>;
}

export interface ImageBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PanelStyle = "default" | "dialog" | "menu" | "combat" | "card";

// Renderer pixel-perfect su canvas 240x180, con cache degli sprite.
export class Screen {
  readonly ctx: CanvasRenderingContext2D;
  private spriteCache = new Map<string, HTMLCanvasElement>();
  private imageBoundsCache = new WeakMap<HTMLImageElement, ImageBounds>();
  private glyphCache = new Map<string, HTMLCanvasElement>();

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
    const stage = document.querySelector('#screen-stage');
    if (stage) new ResizeObserver(refit).observe(stage);
  }

  private fitToWindow(): void {
    // CSS owns the available stage, including safe areas and controller columns.
    // Measuring it also handles installed PWAs, browser bars and rotation.
    const viewport = window.visualViewport;
    document.documentElement.style.setProperty('--app-height', `${viewport?.scale === 1 ? viewport.height : window.innerHeight}px`);
    const rawScale = this.canvas.getBoundingClientRect().width / VIEW_W;

    // Backing store ad alta densità: senza tener conto di devicePixelRatio, su
    // ogni schermo HiDPI/Retina (tutti i telefoni moderni) il browser sfoca il
    // bitmap 240x180. Disegniamo a risoluzione fisica e teniamo le coordinate
    // logiche a 240x180 via setTransform.
    const dpr = Math.max(1, window.devicePixelRatio || 1);

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

  // Tutte le superfici condividono il renderer moderno, inclusi i pannelli
  // senza uno stile esplicito. Nessun override bitmap può ripristinare il tema vecchio.
  panel(x: number, y: number, w: number, h: number, style: PanelStyle = "default"): void {
    this.modernPanel(Math.round(x), Math.round(y), Math.round(w), Math.round(h), style === "default" ? "card" : style);
  }

  cacheStats(): { rasterizedSprites: number; rasterizedPixels: number; cachedGlyphs: number; glyphPixels: number } {
    let rasterizedPixels = 0;
    for (const canvas of this.spriteCache.values()) rasterizedPixels += canvas.width * canvas.height;
    let glyphPixels = 0;
    for (const canvas of this.glyphCache.values()) glyphPixels += canvas.width * canvas.height;
    return { rasterizedSprites: this.spriteCache.size, rasterizedPixels, cachedGlyphs: this.glyphCache.size, glyphPixels };
  }

  // Pannelli chiari cartoon-RPG. Gli angoli a gradino restano leggibili alla
  // risoluzione interna 240x180 e differenziano i contesti senza sacrificare
  // spazio al testo come una cornice decorativa unica.
  private modernPanel(x: number, y: number, w: number, h: number, style: Exclude<PanelStyle, "default">): void {
    const shadow = "rgba(16,20,31,0.35)";
    const border = "#17243d";
    const paper = style === "combat" ? "#fffdf2" : "#fffaf0";
    const accent = style === "dialog" ? "#4f91c7" : style === "combat" ? "#55a889" : "#e6b944";
    this.rect(x + 2, y + 3, w - 2, h - 2, shadow);
    this.rect(x + 2, y, w - 4, h, border);
    this.rect(x, y + 2, w, h - 4, border);
    this.rect(x + 2, y + 2, w - 4, h - 4, paper);
    this.rect(x + 4, y + 3, w - 8, 2, accent);
    this.rect(x + 4, y + h - 4, w - 8, 1, "#d9d2bf");
    // Riflessi sugli angoli: dettaglio cartoon, ma senza rumore dietro al testo.
    this.rect(x + 2, y + 2, 2, 2, "#ffffff");
    this.rect(x + w - 4, y + 2, 2, 2, "#ffffff");
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

  // Disegna una REGIONE (sx,sy,sw,sh) di un'immagine bitmap su (dx,dy,dw,dh).
  // Usato per l'autotiling: ritaglia il tile giusto da un foglio Wang.
  imageRegion(
    img: HTMLImageElement,
    sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number, dw: number, dh: number
  ): void {
    this.ctx.drawImage(img, sx, sy, sw, sh, Math.round(dx), Math.round(dy), dw, dh);
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

  imageBounds(img: HTMLImageElement): ImageBounds {
    const cached = this.imageBoundsCache.get(img);
    if (cached) {
      return cached;
    }
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const fallback = { x: 0, y: 0, w, h };
    if (w <= 0 || h <= 0) {
      return fallback;
    }
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) {
      return fallback;
    }
    octx.drawImage(img, 0, 0);
    const data = octx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let py = 0; py < h; py += 1) {
      for (let px = 0; px < w; px += 1) {
        if (data[(py * w + px) * 4 + 3] <= 8) {
          continue;
        }
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
    }
    const bounds = maxX >= minX && maxY >= minY
      ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
      : fallback;
    this.imageBoundsCache.set(img, bounds);
    return bounds;
  }

  imageSpriteCropped(
    img: HTMLImageElement,
    x: number,
    y: number,
    opts?: { flipX?: boolean; scale?: number; scaleX?: number; scaleY?: number }
  ): void {
    const b = this.imageBounds(img);
    const s = opts?.scale ?? 1;
    const sx = (opts?.scaleX ?? 1) * s;
    const sy = (opts?.scaleY ?? 1) * s;
    const w = b.w * sx;
    const h = b.h * sy;
    const dx = Math.round(x);
    const dy = Math.round(y);
    if (opts?.flipX) {
      this.ctx.save();
      this.ctx.translate(dx + w, dy);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(img, b.x, b.y, b.w, b.h, 0, 0, w, h);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(img, b.x, b.y, b.w, b.h, dx, dy, w, h);
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
        const key = `${raw.toUpperCase()}|${color}|${scale}`;
        let cached = this.glyphCache.get(key);
        if (!cached) {
          cached = document.createElement("canvas");
          cached.width = GLYPH_W * scale;
          cached.height = GLYPH_H * scale;
          const glyphCtx = cached.getContext("2d");
          if (glyphCtx) {
            glyphCtx.fillStyle = color;
            for (let gy = 0; gy < GLYPH_H; gy += 1) {
              const row = glyph[gy];
              for (let gx = 0; gx < GLYPH_W; gx += 1) {
                if (row[gx] === "#") glyphCtx.fillRect(gx * scale, gy * scale, scale, scale);
              }
            }
          }
          // Colori alpha animati possono produrre molte varianti: limite duro
          // per evitare crescita non vincolata durante sessioni lunghe.
          if (this.glyphCache.size >= 1024) this.glyphCache.clear();
          this.glyphCache.set(key, cached);
        }
        this.ctx.drawImage(cached, cx, cy);
      }
      cx += CHAR_W * scale;
    }
  }

  // Mantiene visibile l'intera stringa comprimendola solo in orizzontale.
  // Utile per etichette UI variabili: evita il ricorso sistematico a "…"
  // senza ridurre l'altezza/leggibilità del font bitmap.
  textFit(value: string, x: number, y: number, maxWidth: number, color = "#10141f"): void {
    const v = value ?? "";
    const fullWidth = v.length * CHAR_W;
    if (fullWidth <= maxWidth || fullWidth <= 0) {
      this.text(v, x, y, color);
      return;
    }
    const sx = maxWidth / fullWidth;
    this.ctx.save();
    this.ctx.translate(Math.round(x), Math.round(y));
    this.ctx.scale(sx, 1);
    this.text(v, 0, 0, color);
    this.ctx.restore();
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
