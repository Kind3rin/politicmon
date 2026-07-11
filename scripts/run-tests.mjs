import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve("tests");
const requestedSuite = process.argv[2];
const searchRoot = requestedSuite ? resolve(root, requestedSuite) : root;

function collect(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collect(path));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(path);
    }
  }
  return files;
}

if (!statSync(searchRoot, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`Suite test inesistente: ${requestedSuite}`);
  process.exit(2);
}

const files = collect(searchRoot).sort();
if (files.length === 0) {
  console.log(`Nessun test in ${requestedSuite ?? "tests"}.`);
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  { stdio: "inherit" }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
