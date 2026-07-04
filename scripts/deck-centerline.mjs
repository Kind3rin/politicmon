// Post-processing del deck del ponte: prende l'asfalto PixelLab e ci disegna una
// MEZZERIA gialla PERFETTAMENTE CENTRATA e seamless in verticale (il ponte è una
// colonna di tile). Zero dipendenze: encoder/decoder PNG minimale via zlib.
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

const IN = process.argv[2] ?? "public/sprites/tiles/deck_asphalt_base.png";
const OUT = process.argv[3] ?? "public/sprites/tiles/deck_asphalt.png";

// --- decode PNG (solo 8-bit RGBA, no interlace: ciò che PixelLab produce) ---
function decodePng(buf) {
  let p = 8; // skip signature
  let w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  let palette = null, trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : 1;
  const bpp = channels; // 8-bit
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * 4);
  const prev = Buffer.alloc(stride);
  let rp = 0;
  const cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const rawB = raw[rp++];
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = rawB; break;
        case 1: v = rawB + a; break;
        case 2: v = rawB + b; break;
        case 3: v = rawB + ((a + b) >> 1); break;
        case 4: { const pp = a + b - c; const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = rawB + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
        default: v = rawB;
      }
      cur[x] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (colorType === 6) { out[i] = cur[x*4]; out[i+1] = cur[x*4+1]; out[i+2] = cur[x*4+2]; out[i+3] = cur[x*4+3]; }
      else if (colorType === 2) { out[i] = cur[x*3]; out[i+1] = cur[x*3+1]; out[i+2] = cur[x*3+2]; out[i+3] = 255; }
      else if (colorType === 3) { const idx = cur[x]; out[i]=palette[idx*3]; out[i+1]=palette[idx*3+1]; out[i+2]=palette[idx*3+2]; out[i+3]= trns && idx < trns.length ? trns[idx] : 255; }
      else if (colorType === 0) { out[i]=out[i+1]=out[i+2]=cur[x]; out[i+3]=255; }
      else if (colorType === 4) { out[i]=out[i+1]=out[i+2]=cur[x*2]; out[i+3]=cur[x*2+1]; }
    }
    cur.copy(prev);
  }
  return { w, h, rgba: out };
}

// --- encode PNG RGBA (filter 0) ---
function encodePng(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  const idat = deflateSync(raw);
  const chunks = [];
  const chunk = (type, data) => {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0); b.write(type, 4, "ascii"); data.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)) >>> 0, 8 + data.length);
    chunks.push(b);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  chunk("IHDR", ihdr); chunk("IDAT", idat); chunk("IEND", Buffer.alloc(0));
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), ...chunks]);
}
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

// --- disegna la mezzeria: linea gialla centrale, verticale, tratteggiata,
//     PERFETTAMENTE centrata e identica su ogni riga → seamless in colonna. ---
const { w, h, rgba } = decodePng(readFileSync(IN));
const YELLOW = [232, 200, 74]; // #e8c84a (coerente col giallo UI del gioco)

// 1) Cancella le linee gialle esistenti del deck base: ogni pixel "giallo"
//    (R,G alti, B basso) viene rimpiazzato con l'asfalto vicino (campionato a
//    sinistra della colonna centrale, dove c'è solo tarmac). Così partiamo da
//    un asfalto pulito prima di disegnare l'UNICA mezzeria centrata.
// Soglia larga: qualunque pixel dove il giallo domina il blu (linea di mezzeria,
// anche sbiadita/antialiased) viene trattato come marcatura da cancellare.
const isYellowish = (r, g, b) => (r - b) > 30 && (g - b) > 20 && r > 110 && g > 100;
const asphaltAt = (y) => {
  // campiona un pixel di asfalto sulla riga y, lontano dal centro (colonna 3)
  const sx = 3 < w ? 3 : 0;
  const i = (y * w + sx) * 4;
  return isYellowish(rgba[i], rgba[i+1], rgba[i+2]) ? [90, 90, 96] : [rgba[i], rgba[i+1], rgba[i+2]];
};
for (let y = 0; y < h; y++) {
  const [ar, ag, ab] = asphaltAt(y);
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (rgba[i+3] > 0 && isYellowish(rgba[i], rgba[i+1], rgba[i+2])) {
      rgba[i] = ar; rgba[i+1] = ag; rgba[i+2] = ab;
    }
  }
}

const cx = Math.floor(w / 2);          // colonna centrale
const lineW = Math.max(2, Math.round(w / 16)); // spessore ~2px a 32
for (let y = 0; y < h; y++) {
  // tratteggio: 4 px linea, 2 px vuoto — periodicità divisore dell'altezza per
  // restare continuo tra tile impilati (32 = 8*4, pattern 6 non divide: uso 8/4).
  const on = (y % 8) < 5;
  if (!on) continue;
  for (let dx = 0; dx < lineW; dx++) {
    const x = cx - Math.floor(lineW / 2) + dx;
    if (x < 0 || x >= w) continue;
    const i = (y * w + x) * 4;
    rgba[i] = YELLOW[0]; rgba[i+1] = YELLOW[1]; rgba[i+2] = YELLOW[2]; rgba[i+3] = 255;
  }
}
writeFileSync(OUT, encodePng(w, h, rgba));
console.log(`mezzeria centrata (${w}x${h}, linea x=${cx}, spessore ${lineW}) -> ${OUT}`);
