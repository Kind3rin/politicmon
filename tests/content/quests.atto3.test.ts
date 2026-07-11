import test from "node:test";
import assert from "node:assert/strict";
import { currentQuest, QUESTS } from "../../src/data/quests.ts";
import { MAPS } from "../../src/data/maps/index.ts";
import { newGameState } from "../../src/game/state.ts";
import { newElectionState } from "../../src/game/election.ts";

const ATTO3_MAIN = [
  "atto3-campo-arrivo", "atto3-foto-scelta", "atto3-foto-finale",
  "atto3-futuro-arrivo", "atto3-futuro-scelta", "atto3-futuro-boss",
  "atto3-diplomacy-arrivo", "atto3-diplomacy-scelta", "atto3-diplomacy-boss",
  "atto3-tour-feed", "atto3-palazzo-feed", "atto3-election-night", "atto3-epilogo"
];

function atto3State() {
  const state = newGameState();
  state.badges = ["auditel", "spread", "dazio"];
  state.defeatedTrainers = ["rival1", "giudice1", "giudice2", "giudice3"];
  Object.assign(state.flags, {
    "starter-chosen": true, "rival1-beaten": true, "dex-received": true,
    "boss-beaten": true, "garante-beaten": true, "hint-offshore": true,
    "offshore-beaten": true, "hint-brux-arrivo": true, "hint-ue": true, "ue-beaten": true
  });
  return state;
}

test("P5-T09: percorso principale Atto 3 resta ordinato e ignora tutte le side quest", () => {
  const state = atto3State();
  assert.equal(currentQuest(state)?.id, ATTO3_MAIN[0]);
  const completions: Array<() => void> = [
    () => { state.flags.atto3Started = true; },
    () => { state.flags["campo-photo-choice-complete"] = true; },
    () => { state.flags["campo-photo-complete"] = true; },
    () => { state.flags["future-badge-received"] = true; },
    () => { state.flags["future-choice-complete"] = true; },
    () => { state.flags.futureResolved = true; },
    () => { state.flags["diplomacy-checked-in"] = true; },
    () => { state.flags["diplomacy-choice-complete"] = true; },
    () => { state.flags.diplomacyComplete = true; },
    () => { state.election = { ...newElectionState(true), phase: "ready" }; },
    () => { state.flags.palaceRoomsComplete = true; },
    () => { state.flags["election-night-complete"] = true; },
    () => { state.flags.atto3Complete = true; }
  ];
  for (let index = 0; index < completions.length - 1; index += 1) {
    completions[index]();
    assert.equal(currentQuest(state)?.id, ATTO3_MAIN[index + 1]);
  }
  completions.at(-1)?.();
  assert.ok(currentQuest(state)?.id !== "side-genova-techno");
});

test("P5-T09: ogni target quest punta dentro una mappa esistente", () => {
  for (const quest of QUESTS) {
    if (!quest.target) continue;
    const map = MAPS[quest.target.mapId];
    assert.ok(map, `${quest.id}: mappa target inesistente ${quest.target.mapId}`);
    assert.ok(quest.target.y >= 0 && quest.target.y < map.tiles.length, `${quest.id}: y fuori mappa`);
    assert.ok(quest.target.x >= 0 && quest.target.x < map.tiles[quest.target.y].length, `${quest.id}: x fuori mappa`);
  }
});

test("P5-T09: nessun ID quest duplicato e tutti i testi guida sono presenti", () => {
  assert.equal(new Set(QUESTS.map((quest) => quest.id)).size, QUESTS.length);
  for (const quest of QUESTS) {
    assert.ok(quest.title.trim() && quest.desc.trim() && quest.hint.trim() && quest.step.trim(), quest.id);
  }
});
