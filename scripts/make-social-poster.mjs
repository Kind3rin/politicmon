// Renderizza social-poster.html a 1080x1920 (locandina verticale per IG/TikTok/FB).
// Inlina lo screenshot di battaglia come data-URI (niente rete). Zero setup extra
// oltre a Playwright. Uso: `node scripts/make-social-poster.mjs`.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("artifacts/launch", { recursive: true });
const html = readFileSync("scripts/social-poster.html", "utf8");
const shot = "data:image/png;base64," + readFileSync("docs/img/title.png").toString("base64");
const page = await (await chromium.launch()).newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.setContent(html.replace("SHOT_SRC", shot), { waitUntil: "networkidle" });
await page.waitForTimeout(200);
await page.screenshot({ path: "artifacts/launch/social-poster.png" });
await page.context().browser().close();
console.log("poster salvato: artifacts/launch/social-poster.png (1080x1920)");
