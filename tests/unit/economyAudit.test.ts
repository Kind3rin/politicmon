import assert from "node:assert/strict";
import test from "node:test";
import { economyChecks } from "../../src/game/economyAudit.ts";
test("P7-T02: tutte le invarianti economiche restano verdi", () => {
  const checks = economyChecks(); assert.ok(checks.length >= 7); assert.deepEqual(checks.filter((check) => !check.ok), []);
});
