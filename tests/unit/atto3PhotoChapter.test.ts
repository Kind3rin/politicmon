import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTS } from "../../src/data/quests.ts";
import { TRAINERS } from "../../src/data/trainers.ts";
import { newGameState } from "../../src/game/state.ts";
import { BOSS_TRAINER_IDS } from "../../src/game/battle/BattleScene.ts";
import { photoChapterRewardPatch } from "../../src/game/atto3Progress.ts";

test("P5-T01: catena Foto del Campo ha tre obiettivi progressivi", () => {
  const state = newGameState();
  const arrival = QUESTS.find((quest) => quest.id === "atto3-campo-arrivo")!;
  const choice = QUESTS.find((quest) => quest.id === "atto3-foto-scelta")!;
  const finale = QUESTS.find((quest) => quest.id === "atto3-foto-finale")!;
  assert.equal(arrival.isDone(state), false);
  state.flags.atto3Started = true;
  assert.equal(arrival.isDone(state), true);
  assert.equal(choice.isDone(state), false);
  state.flags["campo-photo-choice-complete"] = true;
  assert.equal(choice.isDone(state), true);
  assert.equal(finale.isDone(state), false);
  state.flags["campo-photo-complete"] = true;
  assert.equal(finale.isDone(state), true);
});

test("P5-T01: il fotografo è un boss dedicato e non riusa Futuro Anteriore", () => {
  const photographer = TRAINERS["campo-photographer"];
  assert.equal(photographer.name, "FOTOGRAFO UFFICIALE");
  assert.equal(photographer.team.length, 3);
  assert.equal(BOSS_TRAINER_IDS.includes(photographer.id), true);
  assert.notEqual(photographer.id, "futuro-anteriore");
});

test("P5-T01: reward foto sblocca menu, cosmetico, dossier e capitolo una sola volta", () => {
  const patch = photoChapterRewardPatch({});
  assert.deepEqual(patch, {
    "campo-photo-complete": true,
    "coalition-menu-unlocked": true,
    "cornice-impossibile": true,
    "feed-dossier-1": true,
    "future-chapter-unlocked": true
  });
  assert.equal(photoChapterRewardPatch({ "campo-photo-complete": true }), null);
});
