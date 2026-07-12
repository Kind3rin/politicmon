import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "src/scenes/*.ts", "src/game/battle/*.ts"], { encoding: "utf8" })
  .split(/\r?\n/).filter(Boolean);

const focusTokens = [
  "►", "drawChoicePreview", "new Menu(", ".menu.draw(",
  "const sel =", "const selected =", "if (sel)", "if (selected)"
];
const results = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const directional = ["up", "down", "left", "right"].some((key) => source.includes(`wasPressed("${key}")`));
  const confirms = source.includes('wasPressed("a")');
  const menuDriven = source.includes(".update(this.input)") && source.includes("new Menu(");
  if (!(directional && confirms) && !menuDriven) continue;

  const focus = focusTokens.some((token) => source.includes(token));
  const aHint = /A[: /]|A SCEGLI|A OK|A CONFERMA|A\/B/.test(source);
  const bHint = /B[: /]|B ESCI|B CHIUDI|B ANNULLA|B INDIETRO|A\/B/.test(source);
  results.push({ file, focus, aHint, bHint });
}

const failures = results.filter((row) => !row.focus || !row.aHint || !row.bHint);
console.log(`Input contracts: ${results.length} scene direzionali con conferma`);
for (const row of results) {
  console.log(`${row.focus && row.aHint && row.bHint ? "OK" : "FAIL"} ${row.file} focus=${row.focus} A=${row.aHint} B=${row.bHint}`);
}
if (failures.length) {
  console.error(`\n${failures.length} scene senza focus o contratto A/B visibile.`);
  process.exit(1);
}
