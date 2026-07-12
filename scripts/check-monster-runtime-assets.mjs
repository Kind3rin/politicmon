import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(BASE, { waitUntil: "networkidle" });
const result = await page.evaluate(async () => {
  const { MONSTERS_WITH_PNG, MONSTERS_WITH_ACTION_PNG } = await import("/src/art/monsters.ts");
  const { preloadCoreSprites } = await import("/src/engine/preload.ts");
  const { spriteStatus } = await import("/src/engine/assets.ts");
  await preloadCoreSprites();
  const entries = [];
  for (const id of MONSTERS_WITH_PNG) entries.push({ id: `mon:${id}`, status: spriteStatus(`mon:${id}`) });
  for (const id of MONSTERS_WITH_ACTION_PNG) entries.push({ id: `mon:${id}_action`, status: spriteStatus(`mon:${id}_action`) });
  return entries;
});
await browser.close();
const failed = result.filter((entry) => entry.status !== "ready");
console.log(`Monster runtime assets ready: ${result.length - failed.length}/${result.length}`);
for (const entry of failed) console.error(`- ${entry.id}: ${entry.status}`);
if (failed.length) process.exit(1);
