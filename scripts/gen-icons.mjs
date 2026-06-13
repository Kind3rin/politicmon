// Genera le icone PWA in PNG senza dipendenze: pixel art disegnata in codice,
// encoder PNG scritto a mano (zlib di Node per la compressione).
// Uso: node scripts/gen-icons.mjs  -> scrive in public/.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// ---- Encoder PNG (RGBA 8 bit, filtro 0) ----

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    raw[y * (1 + width * 4)] = 0; // filtro none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// ---- Mini canvas RGBA ----

function hex(color) {
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
    255
  ];
}

function makeCanvas(size, fillColor) {
  const buf = Buffer.alloc(size * size * 4);
  const canvas = { size, buf };
  rect(canvas, 0, 0, size, size, fillColor);
  return canvas;
}

function rect(canvas, x, y, w, h, color) {
  const [r, g, b, a] = hex(color);
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      if (xx < 0 || yy < 0 || xx >= canvas.size || yy >= canvas.size) {
        continue;
      }
      const i = (yy * canvas.size + xx) * 4;
      canvas.buf[i] = r;
      canvas.buf[i + 1] = g;
      canvas.buf[i + 2] = b;
      canvas.buf[i + 3] = a;
    }
  }
}

function scaleNearest(canvas, outSize) {
  const out = Buffer.alloc(outSize * outSize * 4);
  for (let y = 0; y < outSize; y += 1) {
    const sy = Math.floor((y * canvas.size) / outSize);
    for (let x = 0; x < outSize; x += 1) {
      const sx = Math.floor((x * canvas.size) / outSize);
      canvas.buf.copy(out, (y * outSize + x) * 4, (sy * canvas.size + sx) * 4, (sy * canvas.size + sx) * 4 + 4);
    }
  }
  return out;
}

// ---- Icona: scheda elettorale che entra nell'urna, tricolore sotto ----

const BG = "#10141f";

function drawArt(c, ox, oy) {
  // Scheda bianca con spunta rossa.
  rect(c, ox + 11, oy + 2, 10, 11, "#f0f0e8");
  rect(c, ox + 12, oy + 3, 8, 1, "#c8c8c0");
  rect(c, ox + 13, oy + 8, 1, 2, "#d23c3c");
  rect(c, ox + 14, oy + 9, 1, 2, "#d23c3c");
  rect(c, ox + 15, oy + 7, 1, 3, "#d23c3c");
  rect(c, ox + 16, oy + 5, 1, 3, "#d23c3c");
  rect(c, ox + 17, oy + 4, 1, 2, "#d23c3c");
  // Urna.
  rect(c, ox + 6, oy + 13, 20, 11, "#3a4c64");
  rect(c, ox + 6, oy + 13, 20, 2, "#2a3850");
  rect(c, ox + 9, oy + 13, 14, 2, "#10141f"); // fessura
  rect(c, ox + 7, oy + 16, 18, 1, "#4c6080");
  rect(c, ox + 14, oy + 18, 4, 4, "#e8c84a"); // stemma
  // Tricolore alla base.
  rect(c, ox + 2, oy + 26, 9, 4, "#2f9a4c");
  rect(c, ox + 11, oy + 26, 10, 4, "#f0f0e8");
  rect(c, ox + 21, oy + 26, 9, 4, "#d23c3c");
}

function save(name, size, artCanvasSize, pad) {
  const c = makeCanvas(artCanvasSize, BG);
  drawArt(c, pad, pad);
  writeFileSync(join(OUT_DIR, name), encodePng(size, size, scaleNearest(c, size)));
  console.log(`scritto public/${name} (${size}x${size})`);
}

mkdirSync(OUT_DIR, { recursive: true });
save("icon-192.png", 192, 32, 0);
save("icon-512.png", 512, 32, 0);
// Maskable: stessa arte con margine di sicurezza (zona safe 80%).
save("icon-maskable-512.png", 512, 44, 6);
save("apple-touch-icon.png", 180, 36, 2);
