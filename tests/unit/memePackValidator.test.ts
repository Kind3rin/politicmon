import assert from "node:assert/strict";
import test from "node:test";
import { MEME_EVENTS } from "../../src/data/memeevents.ts";
import { validateMemePack } from "../../src/editorial/memePackValidator.ts";

test("P6-T05: registry editoriale corrente non ha errori strutturali", () => {
  assert.deepEqual(validateMemePack(MEME_EVENTS, new Date(2026, 6, 11)).errors, []);
});
test("P6-T05: errori strutturali e warning editoriali restano separati", () => {
  const broken = [{ id: "ID ROTTO", title: "T".repeat(40), lines: ["OK"], conditions: [{ kind: "mistero" }], choices: [], source: { label: "", url: "http://no" }, editorial: { verifiedOn: "ieri", risk: "high", fact: "x", fallback: "x" } }];
  const report = validateMemePack(broken, new Date(2026, 6, 11)); assert.ok(report.errors.length >= 8); assert.ok(report.warnings.some((issue) => issue.message.includes("titolo lungo"))); assert.ok(report.warnings.some((issue) => issue.message.includes("rischio alto")));
});
test("P6-T05: evento scaduto genera avviso ma non errore", () => {
  const event = structuredClone(MEME_EVENTS[0]) as any; event.active = { from: "2025-01-01", until: "2025-02-01" };
  const report = validateMemePack([event], new Date(2026, 6, 11)); assert.equal(report.errors.length, 0); assert.ok(report.warnings.some((issue) => issue.message.includes("scaduto")));
});
