import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { NPC_WITH_PNG, PORTRAIT_SETS, PLAYER_PORTRAIT, SET_NAMES, TRAINER_PORTRAITS, NPC_BUSTS, dialoguePortrait, trainerPortrait, npcBust } from "../../src/art/characters";

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

test("every named opponent has its own bust, and the file is a real 96x96 PNG", async () => {
  const { TRAINERS } = await import("../../src/data/trainers");
  const missing = Object.values(TRAINERS).filter(trainer => !TRAINER_PORTRAITS.has(trainer.id)).map(trainer => trainer.id);
  assert.deepEqual(missing, [], "opponents shown with the face of their role");
  for (const id of TRAINER_PORTRAITS) {
    const header = readFileSync(`public/sprites/portraits/trainer-${id}.png`).subarray(0, 33);
    assert.equal(header.readUInt32BE(16), 96);
    assert.equal(header[25], 6);
  }
  assert.equal(trainerPortrait("tycoon", "boss"), "/sprites/portraits/trainer-tycoon.png");
  assert.equal(trainerPortrait("coppa:someone", "aide"), "/sprites/portraits/aide.png", "a tournament ghost falls back to its role");
});

// Counters, legends and the lab keep the face of their role on purpose; every other townsperson has their own.
const ROLE_ONLY = [
  "archivio-usciere", "bar-borgo-barista", "bar-bruxelles-barista", "bar-cap-barista", "bar-euro-barista", "bar-medio-barista",
  "bar-offshore-barista", "bar-stretto-barista", "berlusconix-legend", "bistrot-funz", "bunker-sentinella", "campo-circolo",
  "campo-medico", "covo-padrino", "covo-picciotto", "draghimon-legend", "legend-bunkerput", "mattarellux-legend",
  "professor", "regia-tecnico", "spettatore-r2", "studio-corazziere"
];

test("townsfolk busts point at real map NPCs and real files, and only the deliberate few keep their role's face", async () => {
  const { MAPS } = await import("../../src/data/maps");
  const all = new Map<string, { spriteSet?: string; trainerId?: string }>();
  for (const map of Object.values(MAPS)) for (const npc of map.npcs) all.set(npc.id, npc);
  const unknown = Object.keys(NPC_BUSTS).filter(id => !all.has(id));
  assert.deepEqual(unknown, [], "ids that match no NPC");
  for (const [id] of Object.entries(NPC_BUSTS)) {
    const bust = npcBust(id)!;
    assert.ok(existsSync(`public${bust.portrait}`), `${bust.portrait} exists`);
    assert.ok(bust.label, `${id} has a label`);
  }
  // The people of the hour (src/data/maps/slotNpcs.ts) are a passing crowd: they wear the face of their role.
  const roleOnly = [...all].filter(([id, npc]) => !npc.spriteSet && !npc.trainerId && !npcBust(id) && !id.startsWith("slot-")).map(([id]) => id).sort();
  assert.deepEqual(roleOnly, ROLE_ONLY, "a role-only NPC that is not on the list of deliberate exceptions");
});
