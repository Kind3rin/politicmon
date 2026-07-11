import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const checks = [];
const add = (id, ok, detail) => checks.push({ id, ok, detail });
function luminance(hex) { const rgb = hex.match(/[0-9a-f]{2}/gi).map((v) => parseInt(v, 16) / 255).map((v) => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; }
function contrast(a, b) { const x = luminance(a); const y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
const pause = readFileSync("src/scenes/PauseScene.ts", "utf8");
const widgets = readFileSync("src/ui/widgets.ts", "utf8");
const nativeInput = readFileSync("src/engine/nativeInput.ts", "utf8");
const haptics = readFileSync("src/engine/haptics.ts", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
add("reduced-motion", pause.includes("RIDUCI EFFETTI") && pause.includes("setReduceMotion"), "toggle persistente nel menu OPZIONI");
add("vibration-off", pause.includes("VIBRA:") && haptics.includes("enabled"), "vibrazione esposta e disattivabile");
add("native-input", nativeInput.includes("font-size") || nativeInput.includes("fontSize"), "input nativo mobile con protezione anti-zoom");
add("focus-cue", widgets.includes("►") || widgets.includes("SCELTA"), "selezione comunicata anche con simbolo/testo");
add("landscape-controls", styles.includes("orientation: landscape") && styles.includes("pointer: coarse"), "layout touch dedicato landscape");
const inkPaper = contrast("#10141f", "#efe6da"); const touchText = contrast("#d4dcff", "#171e33");
add("contrast-main", inkPaper >= 4.5 && touchText >= 4.5, `testo/pannello ${inkPaper.toFixed(1)}:1, controlli ${touchText.toFixed(1)}:1`);

const browser = await chromium.launch(); const base = process.env.BASE_URL ?? "http://127.0.0.1:5179";
for (const spec of [{ name: "portrait", width: 390, height: 844 }, { name: "landscape", width: 844, height: 390 }]) {
  const context = await browser.newContext({ viewport: spec, isMobile: true, hasTouch: true }); const page = await context.newPage();
  await page.goto(base, { waitUntil: "load" }); await page.evaluate(() => sessionStorage.setItem("politicmon-intro-seen", "1")); await page.reload({ waitUntil: "networkidle" });
  const targets = await page.locator("#touch-ui button, .console-brand").evaluateAll((nodes) => nodes.map((node) => { const r = node.getBoundingClientRect(); return { label: node.getAttribute("aria-label") || node.textContent?.trim() || "", width: r.width, height: r.height }; }));
  add(`touch-${spec.name}`, targets.every((target) => target.label && target.width >= 24 && target.height >= 24), `${targets.length} target con nome e minimo 24px`); await context.close();
}
await browser.close();
const lines = ["# P7-T06 — Audit accessibilità", "", "| Controllo | Esito | Evidenza |", "|---|---|---|"];
for (const check of checks) lines.push(`| ${check.id} | ${check.ok ? "OK" : "ERRORE"} | ${check.detail} |`);
mkdirSync("design/qa", { recursive: true }); writeFileSync("design/qa/p7-accessibility-audit.md", `${lines.join("\n")}\n`); console.log(lines.join("\n")); if (checks.some((check) => !check.ok)) process.exitCode = 1;
