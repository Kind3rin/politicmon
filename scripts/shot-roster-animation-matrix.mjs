import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto(BASE, { waitUntil: "networkidle" });
const result = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { preloadCoreSprites } = await import("/src/engine/preload.ts");
  const { DEX_ORDER } = await import("/src/data/species.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { makeCombatant } = await import("/src/game/battle/sim.ts");
  const { BattleFx, drawBattleMonster } = await import("/src/game/battle/view.ts");
  await preloadCoreSprites();
  const cols = 13, cellW = 72, cellH = 72;
  const states = ["idle", "attack", "damage", "ko"];
  const outputs = {};
  const signatures = {};
  const hash = (data) => {
    let h = 2166136261;
    for (let i = 0; i < data.length; i += 1) h = Math.imul(h ^ data[i], 16777619);
    return h >>> 0;
  };
  for (const state of states) {
    const canvas = document.createElement("canvas");
    canvas.width = cols * cellW; canvas.height = 4 * cellH;
    const sheetCtx = canvas.getContext("2d");
    sheetCtx.imageSmoothingEnabled = false;
    sheetCtx.fillStyle = "#d8f0df"; sheetCtx.fillRect(0, 0, canvas.width, canvas.height);
    signatures[state] = {};
    DEX_ORDER.forEach((id, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = col * cellW, y = row * cellH;
      const cell = document.createElement("canvas");
      const cellScreen = new Screen(cell);
      cellScreen.rect(0, 0, 240, 180, "#d8f0df");
      const fx = new BattleFx(); fx.time = 0.75;
      let lungeT = 0;
      if (state === "attack") lungeT = 0.15;
      if (state === "damage") fx.knockback.player = 0.72;
      if (state === "ko") fx.faintT.player = 0.2;
      drawBattleMonster(cellScreen, fx, makeCombatant(createMonster(id, 20)), 120, 132, lungeT, false, "player");
      signatures[state][id] = hash(cellScreen.ctx.getImageData(0, 0, cell.width, cell.height).data);
      const rx = cell.width / 240, ry = cell.height / 180;
      sheetCtx.drawImage(cell, 82 * rx, 58 * ry, 76 * rx, 82 * ry, x, y, cellW, cellH);
    });
    outputs[state] = canvas.toDataURL("image/png");
  }
  const failures = [];
  for (const id of DEX_ORDER) {
    for (const state of states.slice(1)) {
      if (signatures[state][id] === signatures.idle[id]) failures.push(`${id}:${state}`);
    }
  }
  return { outputs, failures, species: DEX_ORDER.length };
});
await browser.close();
mkdirSync("artifacts/screens/professional/roster", { recursive: true });
for (const [state, dataUrl] of Object.entries(result.outputs)) {
  writeFileSync(`artifacts/screens/professional/roster/${state}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
console.log(`Roster animation matrix: ${result.species} specie × 4 stati`);
if (result.failures.length) {
  console.error(`Stati non distinguibili: ${result.failures.join(", ")}`);
  process.exit(1);
}
