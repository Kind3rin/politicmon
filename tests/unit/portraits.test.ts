import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { NPC_WITH_PNG, PORTRAIT_SETS, PLAYER_PORTRAIT, SET_NAMES, dialoguePortrait } from "../../src/art/characters";

test("every character with a dialogue bust has its file, and the files are real transparent PNGs", () => {
  const paths = [...NPC_WITH_PNG].map(pal => `public/sprites/portraits/${pal}.png`)
    .concat([...PORTRAIT_SETS].map(set => `public/sprites/portraits/${set}.png`), [`public${PLAYER_PORTRAIT}`]);
  for (const path of paths) {
    assert.ok(existsSync(path), `${path} exists`);
    const header = readFileSync(path).subarray(0, 33);
    assert.equal(header.subarray(1, 4).toString(), "PNG");
    assert.equal(header.readUInt32BE(16), 96, `${path} is 96 wide`);
    assert.equal(header.readUInt32BE(20), 96, `${path} is 96 tall`);
    assert.equal(header[25], 6, `${path} keeps an alpha channel`);
  }
});

test("a speaker is drawn from its own sprite set, then its role, then nothing", () => {
  assert.equal(dialoguePortrait("professor"), "/sprites/portraits/professor.png");
  assert.equal(dialoguePortrait("aide", "future-brand"), "/sprites/portraits/future-brand.png", "a story character is not shown as the role it falls back to");
  assert.equal(dialoguePortrait("aide", "a-set-without-a-bust"), "/sprites/chars/npc_a-set-without-a-bust_south.png");
  assert.equal(dialoguePortrait("unknown-role"), undefined);
});

test("every sprite set used by a map NPC has a bust", async () => {
  const { MAPS } = await import("../../src/data/maps");
  const used = new Set<string>();
  for (const map of Object.values(MAPS)) for (const npc of map.npcs) if (npc.spriteSet) used.add(npc.spriteSet);
  assert.deepEqual([...used].filter(set => !PORTRAIT_SETS.has(set)), []);
});

test("every story character with a face also has a name for the dialogue label", () => {
  assert.deepEqual([...PORTRAIT_SETS].filter(set => !SET_NAMES[set]), []);
  assert.deepEqual(Object.keys(SET_NAMES).filter(set => !PORTRAIT_SETS.has(set)), []);
});
