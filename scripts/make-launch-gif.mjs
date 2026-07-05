// Genera una GIF animata di gameplay per README/social.
// Cattura frame reali da una battaglia scriptata (idle -> selezione mossa ->
// affondo -> danno) e li encoda in GIF a palette. Zero dipendenze (decoder PNG
// via zlib + encoder GIF LZW inline). Uso: dev server attivo, poi
// `node scripts/make-launch-gif.mjs`.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const TARGET_W = 480;         // larghezza finale della GIF (altezza proporzionale)
const DELAY = 7;              // centesimi di secondo per frame (~14fps)
const EVERY = 2;              // tieni 1 frame ogni EVERY (dimezza peso e durata)
const OUT = "artifacts/launch/gameplay.gif";
mkdirSync("artifacts/launch", { recursive: true });

// ---------- cattura frame dal gioco ----------
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const dataUrls = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.party.push(createMonster("giorgetta", 22));
  const battle = new BattleScene(stack, input, {
    state, foeTeam: [createMonster("renzino", 20)], onEnd: () => undefined
  });
  stack.push(battle);

  const out = [];
  const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
  const grab = () => out.push(canvas.toDataURL("image/png"));
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
  };

  for (let g = 0; g < 500 && battle.mode !== "menu"; g++) { if (g % 5 === 0) press("KeyZ"); else frame(); }
  for (let i = 0; i < 8; i++) { frame(); if (i % 2 === 0) grab(); }   // idle
  press("KeyZ");                                                       // LOTTA
  for (let i = 0; i < 4; i++) { frame(); grab(); }
  press("KeyZ");                                                       // mossa
  for (let i = 0; i < 44; i++) { frame(); grab(); }                    // affondo + danno
  return out;
});
await browser.close();
console.log(`catturati ${dataUrls.length} frame`);

// ---------- decode PNG RGBA (canvas -> colorType 6) ----------
function decodePng(buf) {
  let p = 8, w = 0, h = 0, colorType = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * 4);
  const prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const rb = raw[rp++];
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v;
      switch (filter) {
        case 1: v = rb + a; break;
        case 2: v = rb + b; break;
        case 3: v = rb + ((a + b) >> 1); break;
        case 4: { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = rb + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
        default: v = rb;
      }
      cur[x] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (bpp === 4) { out[i]=cur[x*4]; out[i+1]=cur[x*4+1]; out[i+2]=cur[x*4+2]; out[i+3]=cur[x*4+3]; }
      else { out[i]=cur[x*3]; out[i+1]=cur[x*3+1]; out[i+2]=cur[x*3+2]; out[i+3]=255; }
    }
    cur.copy(prev);
  }
  return { width: w, height: h, data: out };
}

// Resize nearest a una larghezza target (altezza proporzionale). Funziona sia
// in up- che in down-scale, così la GIF ha una dimensione prevedibile a
// prescindere da quanto è grande il canvas catturato.
function resizeTo(f, targetW) {
  const w = targetW, h = Math.round((f.height / f.width) * targetW), data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(f.height - 1, (y * f.height / h) | 0);
    for (let x = 0; x < w; x++) {
      const sx = Math.min(f.width - 1, (x * f.width / w) | 0);
      const si = (sy * f.width + sx) * 4, di = (y * w + x) * 4;
      data[di]=f.data[si]; data[di+1]=f.data[si+1]; data[di+2]=f.data[si+2]; data[di+3]=f.data[si+3];
    }
  }
  return { width: w, height: h, data };
}

const frames = dataUrls
  .filter((_, i) => i % EVERY === 0)   // decima i frame: GIF più leggera e corta
  .map((d) => decodePng(Buffer.from(d.split(",")[1], "base64")))
  .map((f) => resizeTo(f, TARGET_W));
console.log(`decodati ${frames.length} frame a ${frames[0].width}x${frames[0].height}`);

// ---------- quantizza a palette globale (pixel-art: pochi colori) ----------
const key = (r, g, b) => (r << 16) | (g << 8) | b;
const BG = [16, 20, 31]; // colore per i pixel trasparenti
const freq = new Map();
for (const f of frames) for (let i = 0; i < f.data.length; i += 4) {
  const a = f.data[i + 3];
  const r = a < 128 ? BG[0] : f.data[i], g = a < 128 ? BG[1] : f.data[i+1], b = a < 128 ? BG[2] : f.data[i+2];
  const k = key(r, g, b); freq.set(k, (freq.get(k) || 0) + 1);
}
const palette = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([k]) => k);
while (palette.length < 256) palette.push(0);
const idxCache = new Map(palette.map((k, i) => [k, i]));
function nearest(r, g, b) {
  const k = key(r, g, b);
  const c = idxCache.get(k); if (c !== undefined) return c;
  let best = 0, bd = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i], d = ((p>>16&255)-r)**2 + ((p>>8&255)-g)**2 + ((p&255)-b)**2;
    if (d < bd) { bd = d; best = i; }
  }
  idxCache.set(k, best); return best;
}
const indexed = frames.map((f) => {
  const idx = new Uint8Array(f.width * f.height);
  for (let p = 0, i = 0; i < f.data.length; i += 4, p++) {
    const a = f.data[i + 3];
    const r = a < 128 ? BG[0] : f.data[i], g = a < 128 ? BG[1] : f.data[i+1], b = a < 128 ? BG[2] : f.data[i+2];
    idx[p] = nearest(r, g, b);
  }
  return idx;
});

// ---------- encoder GIF89a con LZW ----------
function lzwEncode(indexData, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let dict = new Map();
  const resetDict = () => { dict = new Map(); for (let i = 0; i < clearCode; i++) dict.set(String(i), i); };
  resetDict();
  let next = eoiCode + 1;
  const out = []; let cur = 0, curBits = 0;
  const emit = (code) => { cur |= code << curBits; curBits += codeSize; while (curBits >= 8) { out.push(cur & 0xff); cur >>= 8; curBits -= 8; } };
  emit(clearCode);
  let w = String(indexData[0]);
  for (let i = 1; i < indexData.length; i++) {
    const k = indexData[i], wk = w + "," + k;
    if (dict.has(wk)) { w = wk; }
    else {
      emit(dict.get(w));
      dict.set(wk, next++);
      if (next > (1 << codeSize) && codeSize < 12) codeSize++;
      if (next >= 4096) { emit(clearCode); resetDict(); next = eoiCode + 1; codeSize = minCodeSize + 1; }
      w = String(k);
    }
  }
  emit(dict.get(w));
  emit(eoiCode);
  if (curBits > 0) out.push(cur & 0xff);
  return out;
}

function encodeGif(width, height, pal, framesIdx, delay) {
  const bytes = [];
  const push = (...a) => bytes.push(...a);
  const str = (s) => { for (const ch of s) push(ch.charCodeAt(0)); };
  str("GIF89a");
  push(width & 255, width >> 8, height & 255, height >> 8);
  push(0xf7, 0, 0); // GCT 256, no bg, no aspect
  for (const c of pal) push((c >> 16) & 255, (c >> 8) & 255, c & 255);
  // Application extension: loop infinito
  push(0x21, 0xff, 0x0b); str("NETSCAPE2.0"); push(0x03, 0x01, 0x00, 0x00, 0x00);
  for (const idx of framesIdx) {
    push(0x21, 0xf9, 0x04, 0x04, delay & 255, delay >> 8, 0x00, 0x00); // GCE
    push(0x2c, 0, 0, 0, 0, width & 255, width >> 8, height & 255, height >> 8, 0x00); // image descriptor
    const minCode = 8;
    push(minCode);
    const lzw = lzwEncode(idx, minCode);
    for (let i = 0; i < lzw.length; i += 255) {
      const chunk = lzw.slice(i, i + 255);
      push(chunk.length, ...chunk);
    }
    push(0x00); // block terminator
  }
  push(0x3b); // trailer
  return Buffer.from(bytes);
}

const gif = encodeGif(frames[0].width, frames[0].height, palette, indexed, DELAY);
writeFileSync(OUT, gif);
console.log(`GIF salvata: ${OUT} (${(gif.length / 1024).toFixed(0)}KB, ${indexed.length} frame)`);
