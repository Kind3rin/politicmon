import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "src/scenes/*.ts", "src/game/world/*.ts"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.startsWith("src/art/") && file !== "src/engine/font.ts");

const TRUNCATION = /slice\([^)]*\).*(?:…|["'`]\s*\.\.\.|\.\.\.\s*["'`])|(?:…|["'`]\s*\.\.\.|\.\.\.\s*["'`]).*slice\(/;
const offenders = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, "");
    // A truncation is a slice next to a drawn ellipsis: the "…" character or "..." inside a string. The spread operator is not one.
    if (TRUNCATION.test(code)) {
      offenders.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (offenders.length) {
  console.error("Ellissi UI vietate: usare testo completo, wrap o layout su più righe.\n");
  console.error(offenders.join("\n"));
  process.exit(1);
}

console.log(`UI ellipsis generation: OK (${files.length} file controllati)`);
