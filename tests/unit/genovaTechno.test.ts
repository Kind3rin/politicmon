import { test } from "node:test";
import assert from "node:assert/strict";
import { newTechnoRun, pressTechno, TECHNO_BEAT_SECONDS, TECHNO_SEQUENCE, technoReward, tickTechno } from "../../src/game/genovaTechno.ts";

test("P5-T04: sequenza completa perfetta produce sei hit", () => {
  let run = newTechnoRun(false);
  for (const button of TECHNO_SEQUENCE) run = pressTechno(run, button);
  assert.equal(run.complete, true);
  assert.equal(run.hits, 6);
  assert.equal(run.misses, 0);
  assert.deepEqual(technoReward(run.hits), { grade: "PERFETTO", money: 1200, sondaggi: 4 });
});

test("P5-T04: input errato avanza senza bloccare la run", () => {
  let run = newTechnoRun(false);
  for (let i = 0; i < TECHNO_SEQUENCE.length; i += 1) run = pressTechno(run, TECHNO_SEQUENCE[i] === "left" ? "right" : "left");
  assert.equal(run.complete, true);
  assert.ok(run.misses > 0);
  assert.equal(technoReward(run.hits).money >= 200, true);
});

test("P5-T04: timeout conta errore solo in modalità normale", () => {
  let normal = newTechnoRun(false);
  for (let i = 0; i < 7; i += 1) normal = tickTechno(normal, 0.25);
  assert.equal(normal.index, 1);
  assert.equal(normal.misses, 1);
  const reduced = tickTechno(newTechnoRun(true), 999);
  assert.equal(reduced.index, 0);
  assert.equal(reduced.remaining, TECHNO_BEAT_SECONDS);
});

test("P5-T04: fasce reward restano deterministiche", () => {
  assert.equal(technoReward(4).grade, "IN ONDA");
  assert.equal(technoReward(0).grade, "FUORI TEMPO");
});
