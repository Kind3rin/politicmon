import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const REQUIRED = [
  "p5_coalition_card.png", "p5_diplomacy_choice.png", "p5_district_choice.png",
  "p5_election_night_results.png", "p5_ending_government_cohesive.png",
  "p5_future_choice.png", "p5_genova_normal.png", "p5_palazzo_feed_studio.png",
  "p5_photo_intro.png", "p5_quest_guide.png", "p6_coppa_rule.png",
  "p6_weekly_campaign.png", "p6_meme_form.png", "p6_sources.png"
];
const issues = [];
for (const name of REQUIRED) {
  const path = `artifacts/screens/${name}`;
  if (!existsSync(path)) { issues.push(`screenshot mancante: ${name}`); continue; }
  const png = readFileSync(path); if (png.length < 24 || png.toString("hex", 1, 4) !== "504e47") issues.push(`PNG invalido: ${name}`);
}

const browser = await chromium.launch(); const base = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const rows = [];
for (const spec of [
  { name: "mobile-portrait", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "mobile-landscape", width: 844, height: 390, isMobile: true, hasTouch: true },
  { name: "desktop", width: 1280, height: 800, isMobile: false, hasTouch: false }
]) {
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, isMobile: spec.isMobile, hasTouch: spec.hasTouch, deviceScaleFactor: 1 });
  const page = await context.newPage(); await page.goto(base, { waitUntil: "load" }); await page.evaluate(() => { sessionStorage.setItem("politicmon-intro-seen", "1"); }); await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(400);
  const metric = await page.evaluate(() => { const canvas = document.querySelector("#game-canvas"); const rect = canvas.getBoundingClientRect(); const controls = [".dpad-up", ".dpad-down", ".dpad-left", ".dpad-right", ".a-btn", ".b-btn", ".start-btn"].map((selector) => { const box = document.querySelector(selector).getBoundingClientRect(); return { selector, left: box.left, top: box.top, right: box.right, bottom: box.bottom }; }); return { canvasW: rect.width, canvasH: rect.height, scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, innerW: window.innerWidth, innerH: window.innerHeight, controls }; });
  const introHidden = await page.locator("#intro-overlay").evaluate((node) => node.hasAttribute("hidden"));
  const controlsVisible = metric.controls.every((box) => box.left >= 0 && box.top >= 0 && box.right <= metric.innerW && box.bottom <= metric.innerH);
  const fits = metric.scrollW <= metric.innerW + 1 && metric.scrollH <= metric.innerH + 1 && metric.canvasW <= metric.innerW && metric.canvasH <= metric.innerH;
  const ratio = Math.abs(metric.canvasW / metric.canvasH - 4 / 3) < .01; if (!fits) issues.push(`${spec.name}: overflow viewport`); if (!ratio) issues.push(`${spec.name}: canvas non 4:3`); if (!introHidden) issues.push(`${spec.name}: intro copre il game durante audit`); if (!controlsVisible) issues.push(`${spec.name}: controlli fuori viewport`);
  mkdirSync("artifacts/screens/professional", { recursive: true }); await page.screenshot({ path: `artifacts/screens/professional/layout_${spec.name}.png`, fullPage: false }); rows.push({ ...spec, ...metric, fits, ratio }); await context.close();
}
await browser.close();
const report = ["# P7-T05 — Visual audit", "", `Screenshot nuove scene: ${REQUIRED.length}/${REQUIRED.length - issues.filter((v) => v.startsWith("screenshot")).length} presenti.`, "", "| Layout | Viewport | Canvas CSS | No overflow | 4:3 |", "|---|---:|---:|---|---|"];
for (const row of rows) report.push(`| ${row.name} | ${row.width}×${row.height} | ${row.canvasW.toFixed(0)}×${row.canvasH.toFixed(0)} | ${row.fits ? "OK" : "NO"} | ${row.ratio ? "OK" : "NO"} |`);
if (issues.length) report.push("", ...issues.map((issue) => `- ERRORE: ${issue}`));
mkdirSync("design/qa", { recursive: true }); writeFileSync("design/qa/p7-visual-audit.md", `${report.join("\n")}\n`); console.log(report.join("\n")); if (issues.length) process.exitCode = 1;
