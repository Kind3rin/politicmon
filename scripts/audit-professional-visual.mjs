import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, relative, basename } from "node:path";

const ROOT = process.cwd();
const strict = process.argv.includes("--strict");

function walk(dir, suffix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path, suffix) : entry.name.endsWith(suffix) ? [path] : [];
  });
}

const sceneFiles = [
  ...walk(join(ROOT, "src", "scenes"), "Scene.ts"),
  ...walk(join(ROOT, "src", "game", "battle"), "Scene.ts"),
  join(ROOT, "src", "game", "world", "WorldScene.ts")
].filter(existsSync);
const shotFiles = walk(join(ROOT, "scripts"), ".mjs").filter((f) => basename(f).startsWith("shot-"));
const shotCorpus = shotFiles.map((f) => readFileSync(f, "utf8").toLowerCase()).join("\n");

const scenes = sceneFiles.map((file) => {
  const source = readFileSync(file, "utf8");
  const name = basename(file, ".ts");
  const key = name.replace(/Scene$/, "").toLowerCase();
  const aliases = [key, key.replace("worldmap", "world-map"), key.replace("starterpreview", "starter")];
  const hasShot = aliases.some((alias) => shotCorpus.includes(alias));
  const clipCalls = (source.match(/clipToWidth\s*\(/g) ?? []).length;
  const explicitEllipses = (source.match(/(?:\.\.\.|…)/g) ?? []).length;
  const manualRects = (source.match(/screen\.rect\s*\(/g) ?? []).length;
  return { file: relative(ROOT, file), name, hasShot, clipCalls, explicitEllipses, manualRects };
});

const monsterSource = readFileSync(join(ROOT, "src", "art", "monsters.ts"), "utf8");
const baseMatch = monsterSource.match(/MONSTERS_WITH_PNG = new Set<string>\(\[([\s\S]*?)\]\)/);
const actionMatch = monsterSource.match(/MONSTERS_WITH_ACTION_PNG = new Set<string>\(\[([\s\S]*?)\]\)/);
const ids = (match) => [...(match?.[1].matchAll(/"([a-z0-9-]+)"/g) ?? [])].map((m) => m[1]);
const baseIds = ids(baseMatch);
const actionIds = new Set(ids(actionMatch));
const actionCoverage = baseIds.map((id) => ({ id, dedicatedAction: actionIds.has(id) }));

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    scenes: scenes.length,
    scenesWithShot: scenes.filter((s) => s.hasShot).length,
    scenesWithoutShot: scenes.filter((s) => !s.hasShot).length,
    clipCalls: scenes.reduce((n, s) => n + s.clipCalls, 0),
    explicitEllipses: scenes.reduce((n, s) => n + s.explicitEllipses, 0),
    monsterPng: baseIds.length,
    monsterDedicatedAction: actionIds.size
  },
  scenes,
  actionCoverage
};

mkdirSync(join(ROOT, "artifacts", "reports"), { recursive: true });
mkdirSync(join(ROOT, "design", "qa"), { recursive: true });
writeFileSync(join(ROOT, "artifacts", "reports", "professional-visual-audit.json"), JSON.stringify(report, null, 2));

const missing = scenes.filter((s) => !s.hasShot);
const clipped = scenes.filter((s) => s.clipCalls > 0 || s.explicitEllipses > 0);
const md = `# Audit visuale professionale\n\n` +
  `Generato: ${report.generatedAt}\n\n` +
  `## Sintesi\n\n` +
  `- Scene: ${report.totals.scenes}\n` +
  `- Scene con evidenza screenshot: ${report.totals.scenesWithShot}/${report.totals.scenes}\n` +
  `- Chiamate di clipping residue: ${report.totals.clipCalls}\n` +
  `- Ellissi esplicite nelle scene: ${report.totals.explicitEllipses}\n` +
  `- Politicmon PNG: ${report.totals.monsterPng}\n` +
  `- Frame action dedicati: ${report.totals.monsterDedicatedAction}/${report.totals.monsterPng}\n\n` +
  `## Scene senza screenshot associato\n\n` +
  (missing.length ? missing.map((s) => `- \`${s.file}\``).join("\n") : "Nessuna.") +
  `\n\n## Scene con rischio testo\n\n` +
  (clipped.length ? clipped.map((s) => `- \`${s.file}\`: clip ${s.clipCalls}, ellissi ${s.explicitEllipses}`).join("\n") : "Nessuna.") +
  `\n\n## Gate\n\n` +
  `Il gate strict passa solo con screenshot per ogni scena e zero clipping automatico.\n`;
writeFileSync(join(ROOT, "design", "qa", "professional-visual-audit.md"), md);

console.log(`Scene con screenshot: ${report.totals.scenesWithShot}/${report.totals.scenes}`);
console.log(`Clip residui: ${report.totals.clipCalls}; action dedicate: ${report.totals.monsterDedicatedAction}/${report.totals.monsterPng}`);
if (strict && (missing.length > 0 || report.totals.clipCalls > 0)) process.exit(1);
