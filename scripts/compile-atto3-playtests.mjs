import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const inputPath = resolve(ROOT, valueAfter("--input", "production/qa/playtests/atto3-r1/sessions.json"));
const outputPath = resolve(ROOT, valueAfter("--output", "production/qa/playtests/atto3-r1/report.md"));
const allowIncomplete = args.includes("--allow-incomplete");

const raw = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(raw.sessions) || raw.sessions.length !== 5) {
  throw new Error("sessions.json deve contenere esattamente 5 sessioni");
}

const endings = new Set(["COESA", "TESA"]);
const photos = new Set(["STRINGETEVI", "PANORAMICA"]);
const difficulties = new Set(["TROPPO_FACILE", "GIUSTA", "TROPPO_DIFFICILE"]);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const integer = (value) => Number.isInteger(value) && value >= 0;
const validSession = (s) =>
  s?.completed === true && text(s.id) && Number.isFinite(s.durationMinutes) && s.durationMinutes > 0 &&
  Array.isArray(s.candidates) && s.candidates.length === 2 && s.candidates.every(text) &&
  photos.has(s.photoChoice) && endings.has(s.ending) && integer(s.coalitionMenuOpens) &&
  integer(s.bossDefeats) && typeof s.understoodBonus === "boolean" && text(s.bonusExplanation) &&
  typeof s.understoodRedLine === "boolean" && text(s.redLineExplanation) &&
  typeof s.motivatedByTradeoff === "boolean" && typeof s.wantsOtherBranch === "boolean" &&
  typeof s.grindRequired === "boolean" && difficulties.has(s.bossDifficulty) &&
  Array.isArray(s.criticalIssues) && s.criticalIssues.every(text);

const complete = raw.sessions.filter(validSession);
const missing = raw.sessions.filter((s) => !validSession(s)).map((s, i) => text(s?.id) ? s.id : `sessione-${i + 1}`);
const count = (key) => complete.filter((s) => s[key] === true).length;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};
const duration = median(complete.map((s) => s.durationMinutes));
const critical = complete.flatMap((s) => s.criticalIssues.map((issue) => ({ session: s.id, issue })));
const bothEndings = endings.size === new Set(complete.map((s) => s.ending)).size;
const thresholds = {
  comprehension: count("understoodBonus") >= 4 && count("understoodRedLine") >= 4,
  motivated: count("motivatedByTradeoff") >= 3,
  replay: count("wantsOtherBranch") >= 3,
  duration: duration !== null && duration >= 30 && duration <= 45,
  boss: complete.length === 5 && complete.every((s) => !s.grindRequired),
  endings: bothEndings,
  critical: critical.length === 0
};
const allComplete = complete.length === 5;
const verdict = !allComplete ? "INCOMPLETE" : !thresholds.critical ? "STOP" : Object.values(thresholds).every(Boolean) ? "PROCEED" : "ITERATE";
const mark = (ok) => ok ? "PASS" : "FAIL";
const lines = [
  "# Playtest Report — Atto 3 R1", "",
  `- **Verdetto**: ${verdict}`,
  `- **Sessioni valide**: ${complete.length}/5`,
  `- **Durata mediana**: ${duration ?? "n/d"} minuti`, "",
  "## Gate", "",
  `- Comprensione bonus + linea rossa: ${mark(thresholds.comprehension)} (${count("understoodBonus")}/5, ${count("understoodRedLine")}/5)`,
  `- Motivazione trade-off: ${mark(thresholds.motivated)} (${count("motivatedByTradeoff")}/5)`,
  `- Desiderio altro ramo: ${mark(thresholds.replay)} (${count("wantsOtherBranch")}/5)`,
  `- Durata 30–45 minuti: ${mark(thresholds.duration)}`,
  `- Boss senza grind: ${mark(thresholds.boss)}`,
  `- Entrambi i finali osservati: ${mark(thresholds.endings)}`,
  `- Zero criticità: ${mark(thresholds.critical)}`, "",
  "## Sessioni", "",
  "| ID | Min | Candidati | Foto | Finale | Menu | KO boss | Difficoltà | Replay |",
  "|---|---:|---|---|---|---:|---:|---|---|",
  ...complete.map((s) => `| ${s.id} | ${s.durationMinutes} | ${s.candidates.join(" + ")} | ${s.photoChoice} | ${s.ending} | ${s.coalitionMenuOpens} | ${s.bossDefeats} | ${s.bossDifficulty} | ${s.wantsOtherBranch ? "sì" : "no"} |`),
  "", "## Action routing", "",
  `- Design changes needed: ${verdict === "ITERATE" && (!thresholds.comprehension || !thresholds.motivated || !thresholds.replay) ? "sì" : "nessuna evidenza completa"}.`,
  `- Balance adjustments: ${verdict === "ITERATE" && !thresholds.boss ? "sì, eseguire balance-check prima del tuning" : "nessuna evidenza completa"}.`,
  `- Bug reports: ${critical.length ? critical.map((x) => `${x.session}: ${x.issue}`).join("; ") : "nessuno"}.`,
  `- Polish items: raccogliere dalle note qualitative dopo il gate.`, ""
];
if (missing.length) lines.push("## Schede incomplete", "", ...missing.map((id) => `- ${id}`), "");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${lines.join("\n")}\n`);
console.log(`Atto 3 R1 playtest: ${verdict} (${complete.length}/5) — ${outputPath}`);
if (!allowIncomplete && verdict === "INCOMPLETE") process.exitCode = 2;
else if (verdict === "STOP") process.exitCode = 1;
