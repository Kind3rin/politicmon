import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("report playtest Atto 3: cinque schede valide producono PROCEED", () => {
  const dir = mkdtempSync(join(tmpdir(), "politicmon-playtest-"));
  const output = join(dir, "report.md");
  try {
    const result = spawnSync(process.execPath, [
      "scripts/compile-atto3-playtests.mjs",
      "--input", "tests/fixtures/atto3-playtests-proceed.json",
      "--output", output
    ], { cwd: resolve("."), encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const report = readFileSync(output, "utf8");
    assert.match(report, /\*\*Verdetto\*\*: PROCEED/);
    assert.match(report, /\*\*Sessioni valide\*\*: 5\/5/);
    assert.match(report, /Entrambi i finali osservati: PASS/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
