// Regressione visuale: una specie con action legacy ma senza `<id>_action.png`
// deve restare sul PNG PixelLab base durante l'affondo, mai sul placeholder `…`.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const png = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { preloadSprites, waitForSprites } = await import("/src/engine/assets.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { makeCombatant } = await import("/src/game/battle/sim.ts");
  const { BattleFx, drawBattleMonster } = await import("/src/game/battle/view.ts");
  preloadSprites({ "mon:giorgiagon": "monsters/giorgiagon.png" });
  await waitForSprites(["mon:giorgiagon"]);
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 180;
  const screen = new Screen(canvas);
  screen.rect(0, 0, 240, 180, "#d8f0df");
  drawBattleMonster(screen, new BattleFx(), makeCombatant(createMonster("giorgiagon", 30)), 120, 135, 0.15, false, "player");
  return canvas.toDataURL("image/png");
});

mkdirSync("artifacts/screens", { recursive: true });
writeFileSync("artifacts/screens/battle-action-fallback.png", Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
console.log("salvato artifacts/screens/battle-action-fallback.png");
await browser.close();
