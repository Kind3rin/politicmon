// Scarica i frame dei mostri PixelLab dal manifest in public/sprites/monsters/.
// Gli URL dei frame sono pubblici (backblaze), non serve auth.
// I review-pack 64px hanno 16 candidati frame_0..frame_15; di default prendiamo
// frame_1 (per salvinator era il frontale migliore). Passa --frame N per cambiare.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const WORKSPACE = "e5e180b6-ed29-459f-b660-0a4c36794a09";
const OUT = "public/sprites/monsters";
const manifest = JSON.parse(readFileSync("scripts/pixellab-monsters.json", "utf8"));

const argFrame = (() => {
  const i = process.argv.indexOf("--frame");
  return i >= 0 ? Number(process.argv[i + 1]) : 1;
})();
const only = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 ? process.argv[i + 1].split(",") : null;
})();

mkdirSync(OUT, { recursive: true });

function frameUrl(objectId, frame) {
  return `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${WORKSPACE}/${objectId}/rotations/frame_${frame}.png`;
}

let ok = 0, skip = 0, fail = 0;
for (const m of manifest.monsters) {
  if (only && !only.includes(m.id)) { continue; }
  if (!m.objectId || m.objectId === "DONE") { skip++; continue; }
  const dest = `${OUT}/${m.id}.png`;
  const url = frameUrl(m.objectId, argFrame);
  try {
    const res = await fetch(url);
    if (!res.ok) { console.log(`FAIL ${m.id} (${res.status}) — forse ancora in lavorazione`); fail++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) { console.log(`FAIL ${m.id} (vuoto)`); fail++; continue; }
    writeFileSync(dest, buf);
    console.log(`OK   ${m.id} -> ${dest} (${buf.length}b)`);
    ok++;
  } catch (e) {
    console.log(`ERR  ${m.id}: ${e.message}`);
    fail++;
  }
}
console.log(`\n${ok} scaricati, ${skip} saltati, ${fail} falliti/non pronti.`);
