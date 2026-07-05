// Compone una GIF VERTICALE 9:16 per Reels/TikTok/Shorts: cattura una battaglia
// reale e la impagina su un canvas 540x960 con banda titolo sopra e CTA sotto.
// Zero dipendenze (decoder PNG via zlib + encoder GIF LZW inline).
// Uso: dev server attivo, poi `node scripts/make-social-vertical.mjs`.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const CW = 540, CH = 960;      // canvas verticale finale (9:16)
const DELAY = 7, EVERY = 2;
const OUT = "artifacts/launch/social-vertical.gif";
mkdirSync("artifacts/launch", { recursive: true });

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
  const battle = new BattleScene(stack, input, { state, foeTeam: [createMonster("renzino", 20)], onEnd: () => undefined });
  stack.push(battle);
  const out = [];
  const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
  const grab = () => out.push(canvas.toDataURL("image/png"));
  const press = (c) => { document.dispatchEvent(new KeyboardEvent("keydown", { code: c, bubbles: true })); frame(); document.dispatchEvent(new KeyboardEvent("keyup", { code: c, bubbles: true })); };
  for (let g = 0; g < 500 && battle.mode !== "menu"; g++) { if (g % 5 === 0) press("KeyZ"); else frame(); }
  for (let i = 0; i < 8; i++) { frame(); if (i % 2 === 0) grab(); }
  press("KeyZ"); for (let i = 0; i < 4; i++) { frame(); grab(); }
  press("KeyZ"); for (let i = 0; i < 44; i++) { frame(); grab(); }
  return out;
});
await browser.close();
console.log(`catturati ${dataUrls.length} frame`);

function decodePng(buf) {
  let p = 8, w = 0, h = 0, colorType = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === "IDAT") idat.push(data); else if (type === "IEND") break;
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), bpp = colorType === 6 ? 4 : 3, stride = w * bpp;
  const out = Buffer.alloc(w * h * 4), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride); let rp = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const rb = raw[rp++], a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0; let v;
      switch (filter) { case 1: v = rb + a; break; case 2: v = rb + b; break; case 3: v = rb + ((a + b) >> 1); break;
        case 4: { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = rb + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; } default: v = rb; }
      cur[x] = v & 0xff;
    }
    for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (bpp === 4) { out[i]=cur[x*4]; out[i+1]=cur[x*4+1]; out[i+2]=cur[x*4+2]; out[i+3]=cur[x*4+3]; } else { out[i]=cur[x*3]; out[i+1]=cur[x*3+1]; out[i+2]=cur[x*3+2]; out[i+3]=255; } }
    cur.copy(prev);
  }
  return { width: w, height: h, data: out };
}

// Palette del progetto (coerente col titolo).
const NIGHT = [18, 21, 31], GOLD = [232, 200, 74], CARD = [236, 228, 207];

// Compone un frame gioco (240x180) su canvas verticale 540x960.
function compose(f) {
  const out = Buffer.alloc(CW * CH * 4);
  // sfondo notte
  for (let i = 0; i < out.length; i += 4) { out[i]=NIGHT[0]; out[i+1]=NIGHT[1]; out[i+2]=NIGHT[2]; out[i+3]=255; }
  // gameplay scalato a piena larghezza (540 -> ratio 4:3 -> 405 alto), centrato verticalmente
  const gw = CW, gh = Math.round(CW * f.height / f.width), gy = Math.round((CH - gh) / 2);
  for (let y = 0; y < gh; y++) {
    const sy = Math.min(f.height - 1, (y * f.height / gh) | 0);
    for (let x = 0; x < gw; x++) {
      const sx = Math.min(f.width - 1, (x * f.width / gw) | 0);
      const si = (sy * f.width + sx) * 4, di = ((gy + y) * CW + x) * 4;
      out[di]=f.data[si]; out[di+1]=f.data[si+1]; out[di+2]=f.data[si+2]; out[di+3]=255;
    }
  }
  return { width: CW, height: CH, data: out, gy, gh };
}

const frames = dataUrls.filter((_, i) => i % EVERY === 0).map((d) => compose(decodePng(Buffer.from(d.split(",")[1], "base64"))));
console.log(`composti ${frames.length} frame a ${CW}x${CH}`);

// --- testo bitmap semplice (blocchi) per banda titolo/CTA, senza font esterni ---
// Uso un font 5x7 minimale solo per le lettere che servono.
const GLYPHS = {
  P:["#### ","#   #","#   #","#### ","#    ","#    ","#    "], O:[" ### ","#   #","#   #","#   #","#   #","#   #"," ### "],
  L:["#    ","#    ","#    ","#    ","#    ","#    ","#####"], I:["#####","  #  ","  #  ","  #  ","  #  ","  #  ","#####"],
  T:["#####","  #  ","  #  ","  #  ","  #  ","  #  ","  #  "], C:[" ### ","#   #","#    ","#    ","#    ","#   #"," ### "],
  M:["#   #","## ##","# # #","#   #","#   #","#   #","#   #"], N:["#   #","##  #","# # #","#  ##","#   #","#   #","#   #"],
  G:[" ### ","#   #","#    ","# ###","#   #","#   #"," ### "], A:[" ### ","#   #","#   #","#####","#   #","#   #","#   #"],
  E:["#####","#    ","#    ","#### ","#    ","#    ","#####"], V:["#   #","#   #","#   #","#   #","#   #"," # # ","  #  "],
  R:["#### ","#   #","#   #","#### ","# #  ","#  # ","#   #"], S:[" ####","#    ","#    "," ### ","    #","    #","#### "],
  " ":["     ","     ","     ","     ","     ","     ","     "], ".":["     ","     ","     ","     ","     "," ##  "," ##  "],
  "!":["  #  ","  #  ","  #  ","  #  ","  #  ","     ","  #  "], "▶":["#    ","##   ","###  ","#### ","###  ","##   ","#    "],
  U:["#   #","#   #","#   #","#   #","#   #","#   #"," ### "], D:["#### ","#   #","#   #","#   #","#   #","#   #","#### "],
};
function drawText(buf, text, cx, cy, scale, rgb) {
  const cw = 6 * scale, tw = text.length * cw;
  let x0 = Math.round(cx - tw / 2);
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] || GLYPHS[" "];
    for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < 5; rx++) {
      if (g[ry][rx] === "#") for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const px = x0 + rx * scale + sx, py = cy + ry * scale + sy;
        if (px >= 0 && px < CW && py >= 0 && py < CH) { const di = (py * CW + px) * 4; buf[di]=rgb[0]; buf[di+1]=rgb[1]; buf[di+2]=rgb[2]; buf[di+3]=255; }
      }
    }
    x0 += cw;
  }
}
// banda titolo (sopra il gameplay) e CTA (sotto), su ogni frame
for (const f of frames) {
  const topY = Math.max(30, (f.gy - 90) / 2 + 30);
  drawText(f.data, "POLITICMON", CW / 2, Math.round(topY), 6, GOLD);
  drawText(f.data, "CATTURALI TUTTI", CW / 2, Math.round(topY + 54), 3, CARD);
  const botY = f.gy + f.gh + 40;
  drawText(f.data, "GIOCA GRATIS", CW / 2, Math.round(botY), 5, GOLD);
  drawText(f.data, "POLITICMON.VERCEL.APP", CW / 2, Math.round(botY + 42), 2, CARD);
}

// --- quantizza + encoda GIF (identico a make-launch-gif) ---
const key = (r, g, b) => (r << 16) | (g << 8) | b, freq = new Map();
for (const f of frames) for (let i = 0; i < f.data.length; i += 4) { const k = key(f.data[i], f.data[i+1], f.data[i+2]); freq.set(k, (freq.get(k)||0)+1); }
const palette = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,256).map(([k])=>k); while (palette.length<256) palette.push(0);
const cache = new Map(palette.map((k,i)=>[k,i]));
function nearest(r,g,b){ const k=key(r,g,b),c=cache.get(k); if(c!==undefined)return c; let best=0,bd=Infinity; for(let i=0;i<palette.length;i++){const p=palette[i],d=((p>>16&255)-r)**2+((p>>8&255)-g)**2+((p&255)-b)**2; if(d<bd){bd=d;best=i;}} cache.set(k,best); return best; }
const indexed = frames.map((f)=>{ const idx=new Uint8Array(CW*CH); for(let p=0,i=0;i<f.data.length;i+=4,p++) idx[p]=nearest(f.data[i],f.data[i+1],f.data[i+2]); return idx; });

function lzw(data, min){ const clear=1<<min, eoi=clear+1; let cs=min+1, dict=new Map(); const reset=()=>{dict=new Map();for(let i=0;i<clear;i++)dict.set(String(i),i);}; reset(); let next=eoi+1; const out=[]; let cur=0,bits=0; const emit=(c)=>{cur|=c<<bits;bits+=cs;while(bits>=8){out.push(cur&255);cur>>=8;bits-=8;}}; emit(clear); let w=String(data[0]); for(let i=1;i<data.length;i++){const k=data[i],wk=w+","+k; if(dict.has(wk))w=wk; else{emit(dict.get(w));dict.set(wk,next++);if(next>(1<<cs)&&cs<12)cs++;if(next>=4096){emit(clear);reset();next=eoi+1;cs=min+1;}w=String(k);}} emit(dict.get(w)); emit(eoi); if(bits>0)out.push(cur&255); return out; }
function encodeGif(w,h,pal,fr,delay){ const b=[]; const push=(...a)=>b.push(...a); const str=(s)=>{for(const c of s)push(c.charCodeAt(0));}; str("GIF89a"); push(w&255,w>>8,h&255,h>>8,0xf7,0,0); for(const c of pal)push(c>>16&255,c>>8&255,c&255); push(0x21,0xff,0x0b); str("NETSCAPE2.0"); push(3,1,0,0,0); for(const idx of fr){ push(0x21,0xf9,4,4,delay&255,delay>>8,0,0); push(0x2c,0,0,0,0,w&255,w>>8,h&255,h>>8,0); push(8); const l=lzw(idx,8); for(let i=0;i<l.length;i+=255){const ch=l.slice(i,i+255);push(ch.length,...ch);} push(0);} push(0x3b); return Buffer.from(b); }

const gif = encodeGif(CW, CH, palette, indexed, DELAY);
writeFileSync(OUT, gif);
console.log(`GIF verticale salvata: ${OUT} (${(gif.length/1024).toFixed(0)}KB, ${indexed.length} frame)`);
