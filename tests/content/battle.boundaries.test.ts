import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("battle boundaries: PvP delega turni a duelsim e non duplica calcDamage", () => {
  const pvp = read("src/game/battle/PvpBattleScene.ts");
  assert.match(pvp, /resolveTurn/);
  assert.doesNotMatch(pvp, /calcDamage/);
});

test("battle boundaries: PvE e duelsim usano contratto effetti e formula condivisi", () => {
  const pve = read("src/game/battle/BattleScene.ts");
  const duel = read("src/game/battle/duelsim.ts");
  for (const source of [pve, duel]) {
    assert.match(source, /from "\.\/effectContract"/);
    assert.match(source, /calcDamage/);
  }
  assert.doesNotMatch(pve, /status === "indagato" && Math\.random/);
  assert.doesNotMatch(duel, /status === "indagato" && rng/);
});
