import assert from "node:assert/strict";
import test from "node:test";
import { MOVES, moveSummary } from "../../src/data/moves.ts";
import { BattleScene } from "../../src/game/battle/BattleScene.ts";
import {
  FIGHT_LIST_LEFT,
  FIGHT_LIST_RIGHT,
  FIGHT_LIST_ROW_H,
  FIGHT_LIST_TOP,
  fightMenuTapIndex
} from "../../src/game/battle/fightMenuInput.ts";

class FakeInput {
  pressed = new Set<string>();
  tap: { x: number; y: number } | null = null;

  wasPressed(button: string): boolean {
    return this.pressed.has(button);
  }

  consumeTap(): { x: number; y: number } | null {
    return this.tap;
  }

  clearTap(): void {
    this.tap = null;
  }
}

function subject(input: FakeInput, disabled: number[] = []): any {
  const battle = Object.create(BattleScene.prototype) as any;
  battle.input = input;
  battle.fightMenu = {
    index: 0,
    items: Array.from({ length: 4 }, (_, index) => ({ label: `MOSSA ${index}`, disabled: disabled.includes(index) }))
  };
  return battle;
}

test("menu mosse: SU/GIU percorrono tutte le quattro righe nell'ordine visivo", () => {
  const input = new FakeInput();
  const battle = subject(input);
  for (let expected = 1; expected < 4; expected += 1) {
    input.pressed = new Set(["down"]);
    assert.equal(battle.fightGridUpdate(), null);
    assert.equal(battle.fightMenu.index, expected);
  }
  for (let expected = 2; expected >= 0; expected -= 1) {
    input.pressed = new Set(["up"]);
    assert.equal(battle.fightGridUpdate(), null);
    assert.equal(battle.fightMenu.index, expected);
  }
});

test("menu mosse: le hitbox touch coincidono con le quattro righe disegnate", () => {
  for (let row = 0; row < 4; row += 1) {
    const y = FIGHT_LIST_TOP + row * FIGHT_LIST_ROW_H + FIGHT_LIST_ROW_H / 2;
    assert.equal(fightMenuTapIndex({ x: 120, y }, 4), row);
  }
  assert.equal(fightMenuTapIndex({ x: FIGHT_LIST_LEFT - 0.01, y: FIGHT_LIST_TOP }, 4), null);
  assert.equal(fightMenuTapIndex({ x: FIGHT_LIST_RIGHT, y: FIGHT_LIST_TOP }, 4), null);
  assert.equal(fightMenuTapIndex({ x: 120, y: FIGHT_LIST_TOP - 0.01 }, 4), null);
  assert.equal(fightMenuTapIndex({ x: 120, y: FIGHT_LIST_TOP + 4 * FIGHT_LIST_ROW_H }, 4), null);
});

test("menu mosse: primo tap focalizza, secondo conferma, PP zero resta bloccato", () => {
  const input = new FakeInput();
  const battle = subject(input, [3]);
  input.tap = { x: 120, y: FIGHT_LIST_TOP + 2 * FIGHT_LIST_ROW_H + 4 };
  assert.equal(battle.fightGridUpdate(), null);
  assert.equal(battle.fightMenu.index, 2);
  assert.equal(input.tap, null);

  input.tap = { x: 120, y: FIGHT_LIST_TOP + 2 * FIGHT_LIST_ROW_H + 4 };
  assert.equal(battle.fightGridUpdate(), "select");

  battle.fightMenu.index = 3;
  input.tap = { x: 120, y: FIGHT_LIST_TOP + 3 * FIGHT_LIST_ROW_H + 4 };
  assert.equal(battle.fightGridUpdate(), null);
});

test("tutte le 78 mosse hanno un effetto runtime supportato e feedback meccanico", () => {
  const supported = new Set([
    "status", "stat", "healRatio", "drainRatio", "recoilRatio",
    "cureStatus", "highCrit", "priority", "statusIfFirst"
  ]);
  const moves = Object.values(MOVES);
  assert.equal(moves.length, 78);
  for (const move of moves) {
    for (const key of Object.keys(move.effect ?? {})) {
      assert.ok(supported.has(key), `${move.id}: effetto senza handler ${key}`);
    }
    assert.ok(moveSummary(move).trim().length > 0, `${move.id}: feedback meccanico mancante`);
    assert.ok(move.pp > 0, `${move.id}: PP massimi invalidi`);
  }
});
