import assert from "node:assert/strict";
import test from "node:test";
import { MOVES } from "../../src/data/moves.ts";
import { Polemica, FUORIONDA, fuoriondaDamage, recruitmentChance } from "../../src/game/battle/polemica.ts";
import { MessageBox } from "../../src/ui/widgets.ts";
import { TeachScene } from "../../src/scenes/TeachScene.ts";
import { SceneStack } from "../../src/engine/scene.ts";
import { BattleScene } from "../../src/game/battle/BattleScene.ts";
import { createMonster } from "../../src/game/monster.ts";
import { newGameState } from "../../src/game/state.ts";
import { makeCombatant } from "../../src/game/battle/sim.ts";

test("a successful setup followed by a different attack unlocks one finisher", () => {
  const meter = new Polemica();
  assert.equal(meter.reward(MOVES.ztl, true), 2);
  assert.equal(meter.reward(MOVES.comizio, true), 1);
  assert.equal(meter.value, 3);
  assert.equal(meter.spend(), true);
  assert.equal(meter.spend(), false);
  assert.equal(meter.reward(FUORIONDA, true), 0);
});

test("blocked, missed, capped and repeated actions cannot farm attention", () => {
  const meter = new Polemica();
  assert.equal(meter.reward(MOVES.ztl, false), 0);
  assert.equal(meter.reward(MOVES.comizio, true), 1);
  assert.equal(meter.gainFor(MOVES.comizio), 0);
  assert.equal(meter.reward(MOVES.comizio, true), 0);
  assert.equal(meter.reward(MOVES.ztl, false), 0);
  assert.equal(meter.reward(MOVES.comizio, true), 0);
  assert.equal(meter.reward(MOVES.ztl, true), 2);
  assert.equal(meter.value, 3);
  meter.reward(MOVES.greenwashing, true);
  assert.equal(meter.value, 3);
});

test("viral recruitment offers a capped benefit and the finisher leaves weak foes vulnerable", () => {
  assert.ok(Math.abs(recruitmentChance(.3, false, true) - .495) < 1e-12);
  assert.equal(recruitmentChance(.3, true, true), .95);
  assert.equal(recruitmentChance(.9, false, true), .95);
  assert.equal(fuoriondaDamage(25), 10);
  assert.equal(fuoriondaDamage(1), 1);
});

test("healing cannot promise or farm Polemica", () => {
  const meter = new Polemica();
  const heal = Object.values(MOVES).find(move => move.power === 0 && move.effect?.healRatio)!;
  assert.ok(heal);
  assert.equal(meter.gainFor(heal), 0);
  assert.equal(meter.reward(heal, true), 0);
});

test("the rival's phone dies once, weakening the physical move it actually uses", () => {
  const battle = Object.create(BattleScene.prototype) as any;
  battle.trainer = { id: "rival1" };
  battle.battery = 3;
  battle.foe = makeCombatant(createMonster("giorgetta", 4));
  const messages: string[] = [];
  battle.pushFront = (steps: any[]) => messages.push(...steps.map(step => step.text));
  battle.drainBattery();
  battle.drainBattery();
  assert.equal(battle.foe.stages.atk, 0);
  battle.drainBattery();
  battle.drainBattery();
  assert.equal(MOVES.comizio.category, "fisico");
  assert.equal(battle.foe.stages.atk, -1);
  assert.equal(messages.length, 1);
  battle.trainer.id = "rival2";
  battle.battery = 1;
  battle.drainBattery();
  assert.equal(battle.battery, 1);
});

test("touch commands cannot spend PP twice or act behind another scene", () => {
  const battle = Object.create(BattleScene.prototype) as any;
  battle.stack = { top: battle };
  battle.mode = "fight";
  battle.player = makeCombatant(createMonster("ellyna", 5));
  battle.foe = makeCombatant(createMonster("giorgetta", 4));
  battle.state = { sondaggi: 50 };
  battle.polemica = new Polemica();
  battle.fightMenu = { items: [{ label: "CORTEO" }] };
  battle.input = { reset: () => {} };
  let turns = 0;
  battle.startTurn = () => turns++;
  const move = battle.touchActions[0];
  move.run();
  move.run();
  assert.equal(turns, 1);
  battle.mode = "fight";
  battle.stack.top = {};
  move.run();
  assert.equal(turns, 1);
  battle.stack.top = battle;
  battle.fightMenu.items[0].disabled = true;
  battle.touchActions[0].run();
  assert.equal(turns, 1);
});

test("recruitment preparation cannot waste consensus against someone else's candidate", () => {
  const battle = Object.create(BattleScene.prototype) as any;
  battle.state = { sondaggi: 50 };
  battle.trainer = { id: "rival1" };
  battle.mode = "campaign";
  battle.openCampaignMenu();
  assert.equal(battle.campaignMenu.items[3].disabled, true);
  battle.useCampaign({ kind: "appello", label: "APPELLO AL VOTO", cost: 15, minSond: 12 });
  assert.equal(battle.state.sondaggi, 50);
  assert.equal(battle.mode, "campaign");
});

const idle = { wasPressed: () => false, tapInRect: () => false } as any;

test("animated turns keep the command layout and only accelerate visible notifications", () => {
  const battle = Object.create(BattleScene.prototype) as any;
  battle.stack = { top: battle }; battle.mode = "queue";
  battle.mainMenu = { items: ["LOTTA", "BORSA", "SQUADRA", "FUORIONDA", "CAMPAGNA", "FUGA"].map(label => ({ label })) };
  battle.input = { reset: () => {} }; battle.msg = new MessageBox();
  assert.equal(battle.touchActions.length, 6);
  assert.ok(battle.touchActions.every((action: any) => action.disabled));
  let completed = 0;
  battle.msg.show(["COLPO!"], () => completed++, true);
  assert.ok(battle.touchActions.slice(0, 5).every((action: any) => action.disabled));
  const accelerate = battle.touchActions[5];
  assert.equal(accelerate.disabled, false);
  accelerate.run(); accelerate.run();
  assert.equal(completed, 1);
  assert.equal(battle.touchActions[5].disabled, true);
});
test("battle notifications advance on their own while world dialogue stays manual", () => {
  const battle = new MessageBox();
  let completed = 0;
  battle.show(["COLPO!"], () => completed++, true);
  battle.update(1, idle);
  assert.equal(battle.isOpen, true);
  battle.update(.06, idle);
  assert.equal(battle.isOpen, false);
  assert.equal(completed, 1);
  const world = new MessageBox();
  world.show(["UN SALUTO."]);
  world.update(5, idle);
  world.update(5, idle);
  assert.equal(world.isOpen, true);
});

test("each timed page has its own reading interval and A accelerates without dropping choices", () => {
  const box = new MessageBox();
  box.show(["PRIMA.", "SECONDA."], undefined, true);
  box.update(1.1, idle);
  assert.equal(box.isOpen, true);
  box.update(.5, idle);
  assert.equal(box.isOpen, true);
  box.update(.56, idle);
  assert.equal(box.isOpen, false);
  box.show(["ANCORA."], undefined, true);
  box.update(.01, { wasPressed: (key: string) => key === "a", tapInRect: () => false } as any);
  assert.equal(box.isOpen, false);
});

test("the live move pipeline rewards changed stages, but not immunity or a capped stage", () => {
  const battle = Object.create(BattleScene.prototype) as any;
  battle.player = makeCombatant(createMonster("ellyna", 5));
  battle.foe = makeCombatant(createMonster("giorgetta", 5));
  battle.polemica = new Polemica();
  battle.koCheckSteps = () => [];
  const apply = (move: typeof MOVES.ztl) => {
    for (const step of battle.moveSteps("player", battle.player, battle.foe, move, "ELLYNA", true)) step.run?.();
  };
  apply(MOVES.ztl);
  assert.equal(battle.foe.stages.spd, -1);
  assert.equal(battle.polemica.value, 2);
  battle.polemica = new Polemica();
  battle.foe.stages.spd = -6;
  apply(MOVES.ztl);
  assert.equal(battle.polemica.value, 0);
  battle.foe = makeCombatant(createMonster("tajanide", 5));
  apply(MOVES.ztl);
  assert.equal(battle.foe.stages.spd, 0);
  assert.equal(battle.polemica.value, 0);
});


test("learning with a free slot takes one decision and returns to play on its own", () => {
  const mon = createMonster("vannaccix", 5), stack = new SceneStack();
  let learned = 0;
  const input = { ...idle, wasPressed: (key: string) => key === "a" } as any;
  const scene = new TeachScene(stack, input, mon, "slogan", () => learned++, { source: "level" });
  stack.push(scene);
  scene.update(.01);
  assert.equal(learned, 1);
  assert.ok(mon.moves.some(slot => slot.id === "slogan" && slot.pp === MOVES.slogan.pp));
  input.wasPressed = () => false;
  scene.update(1.7);
  assert.equal(stack.top, undefined);
  assert.equal(learned, 1);
});

test("replacing a move still lets the player cancel before losing its PP", () => {
  const mon = createMonster("ellyna", 5), stack = new SceneStack();
  const before = structuredClone(mon.moves);
  let key = "a", learned = 0;
  const input = { ...idle, wasPressed: (pressed: string) => pressed === key } as any;
  const scene = new TeachScene(stack, input, mon, "slogan", () => learned++);
  stack.push(scene);
  scene.update(.01);
  assert.deepEqual(mon.moves, before);
  key = "b";
  scene.update(.01);
  assert.equal(learned, 0);
  assert.deepEqual(mon.moves, before);
});

test("touch learning previews two moves, cancels purely and replaces the chosen slot only once", () => {
  const mon = createMonster("ellyna", 5), stack = new SceneStack(), input = { ...idle, reset() {} } as any;
  mon.status = "scandalo"; mon.hp = 4; mon.heldItem = "gilet"; mon.moves.forEach((slot, i) => { slot.pp = i + 1; });
  const before = structuredClone(mon), parent = { update() {}, draw() {} }; stack.push(parent); let learned = 0;
  const scene = new TeachScene(stack, input, mon, "slogan", () => learned++, { source: "level" }); stack.push(scene);
  const pick = scene.touchActions[2]; pick.run(); assert.equal(learned, 0); assert.deepEqual(mon, before);
  scene.touchActions.find(a => a.label === "DETTAGLI")!.run();
  scene.touchActions.find(a => a.label === "ATTUALE")!.run();
  scene.touchActions.find(a => a.label === "NUOVA")!.run();
  scene.touchActions.find(a => a.label === "INDIETRO")!.run();
  scene.touchActions.find(a => a.label === "RIPENSA")!.run(); assert.deepEqual(mon, before);
  scene.touchActions[1].run(); pick.run(); // stale pick cannot change the confirmed target
  const accept = scene.touchActions[0]; accept.run(); accept.run();
  assert.equal(learned, 1); assert.equal(mon.moves[1].id, "slogan"); assert.equal(mon.moves[1].pp, MOVES.slogan.pp);
  for (const i of [0, 2, 3]) assert.deepEqual(mon.moves[i], before.moves[i]);
  assert.equal(mon.hp, before.hp); assert.equal(mon.status, before.status); assert.equal(mon.heldItem, before.heldItem);
  assert.ok(scene.touchActions.every(a => a.disabled)); scene.update(3); assert.equal(stack.top, parent);
});

test("touch lessons recheck replaced slots and refuse duplicate or covered commits", () => {
  const mon = createMonster("ellyna", 5), stack = new SceneStack(), input = { ...idle, reset() {} } as any; let learned = 0;
  const scene = new TeachScene(stack, input, mon, "slogan", () => learned++); stack.push(scene);
  const pick = scene.touchActions[0]; mon.moves[0] = { ...mon.moves[0], pp: 1 }; pick.run(); assert.equal(scene.touchActions[0].label, MOVES[mon.moves[0].id].name);
  scene.touchActions[0].run(); const accept = scene.touchActions[0], before = structuredClone(mon);
  const overlay = { update() {}, draw() {} }; stack.push(overlay); accept.run(); assert.deepEqual(mon, before); stack.pop();
  mon.moves[0] = { ...mon.moves[0], pp: 2 }; accept.run(); assert.equal(learned, 0); assert.equal(mon.moves[0].pp, 2);
  scene.touchActions.find(a => a.label === "RINUNCIA")!.run(); assert.equal(stack.top, undefined);
  const duplicate = new TeachScene(stack, input, mon, mon.moves[1].id, () => learned++); stack.push(duplicate); duplicate.touchActions[0].run(); duplicate.touchActions[0].run();
  assert.equal(learned, 0); assert.equal(stack.top, undefined);
});

test("opening field events rotate and a forecast cannot remove real bonuses", async () => {
  const { chooseFieldEvent, fieldPreview, FIELD_EVENTS } = await import("../../src/game/battle/fieldEvents.ts");
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => chooseFieldEvent(i + 1).id), ["click", "equal", "poll", "click", "equal", "poll"]);
  const player = makeCombatant(createMonster("ellyna", 8)), foe = makeCombatant(createMonster("salvinott", 5));
  player.stages.atk = 3; player.stages.spd = -2; foe.stages.def = 4;
  const before = JSON.stringify([player, foe]);
  const [p, f] = fieldPreview(FIELD_EVENTS[1], 1, player, foe);
  assert.equal(p.stages.atk, 0); assert.equal(p.stages.spd, -2); assert.equal(f.stages.def, 0);
  assert.equal(JSON.stringify([player, foe]), before);
  assert.equal(fieldPreview(FIELD_EVENTS[1], 0, player, foe)[0], player);
});

test("the flash poll helps the lower percentage, never heals KO or cures status", async () => {
  const { applyFieldEvent, FIELD_EVENTS } = await import("../../src/game/battle/fieldEvents.ts");
  const { statsOf } = await import("../../src/game/monster.ts");
  const player = makeCombatant(createMonster("ellyna", 8)), foe = makeCombatant(createMonster("salvinott", 5));
  player.mon.hp = 12; foe.mon.hp = 20; player.mon.status = "scandalo";
  applyFieldEvent(FIELD_EVENTS[2], player, foe);
  assert.equal(player.mon.hp, 12 + Math.floor(statsOf(player.mon).hp * .1));
  assert.equal(foe.mon.hp, 20); assert.equal(player.mon.status, "scandalo");
  player.mon.hp = 0;
  applyFieldEvent(FIELD_EVENTS[2], player, foe);
  assert.equal(player.mon.hp, 0);
  player.mon.hp = statsOf(player.mon).hp; foe.mon.hp = statsOf(foe.mon).hp;
  assert.match(applyFieldEvent(FIELD_EVENTS[2], player, foe), /PARITÀ/);
});

test("a field event happens once on the second consuming action, not again after switching", async () => {
  const { FIELD_EVENTS } = await import("../../src/game/battle/fieldEvents.ts");
  const battle = Object.create(BattleScene.prototype) as any;
  battle.field = FIELD_EVENTS[1]; battle.fieldTurn = 0; battle.fieldResolved = false; battle.state = { reduceEffects: true };
  battle.player = makeCombatant(createMonster("ellyna", 8)); battle.foe = makeCombatant(createMonster("salvinott", 5));
  battle.player.stages.atk = 2; battle.foe.stages.spd = -3; const messages: string[] = [];
  battle.push = (step: any) => messages.push(step.text);
  battle.advanceField(); assert.equal(battle.player.stages.atk, 2);
  battle.advanceField(); assert.equal(battle.player.stages.atk, 0); assert.equal(battle.foe.stages.spd, -3);
  battle.player.stages.atk = 1; battle.advanceField();
  assert.equal(battle.player.stages.atk, 1); assert.equal(messages.length, 1); assert.equal(battle.fieldFxT, 0);
});

test("field notification precedes the counterattack after a non-move action", async () => {
  const { FIELD_EVENTS } = await import("../../src/game/battle/fieldEvents.ts");
  const battle = Object.create(BattleScene.prototype) as any;
  battle.field = FIELD_EVENTS[1]; battle.fieldTurn = 1; battle.state = { reduceEffects: true };
  battle.player = makeCombatant(createMonster("ellyna", 8)); battle.foe = makeCombatant(createMonster("salvinott", 5));
  battle.queue = [{ text: "AFTER" }]; battle.foe.stages.atk = 2;
  battle.takeFoeIntent = () => MOVES.comizio; battle.drainBattery = () => {};
  battle.pushMoveNow = () => battle.queue.unshift({ text: "ATTACK" });
  battle.foeCounterStep().run();
  assert.match(battle.queue[0].text, /PAR CONDICIO/);
  assert.equal(battle.queue[1].text, "ATTACK"); assert.equal(battle.queue[2].text, "AFTER");
  assert.equal(battle.foe.stages.atk, 0);
});

test("Click Day awards only the first valid action and never exceeds three Polemica", async () => {
  const { FIELD_EVENTS } = await import("../../src/game/battle/fieldEvents.ts");
  const battle = Object.create(BattleScene.prototype) as any;
  battle.field = FIELD_EVENTS[0]; battle.fieldTurn = 2; battle.state = { reduceEffects: true };
  battle.player = makeCombatant(createMonster("ellyna", 8)); battle.foe = makeCombatant(createMonster("salvinott", 5));
  battle.polemica = new Polemica(); battle.polemica.value = 2;
  const steps = battle.moveSteps("player", battle.player, battle.foe, MOVES.ztl, "ELLYNA", true);
  assert.match(steps[0].text, /POLEMICA \+1/); assert.equal(battle.polemica.value, 3);
  battle.moveSteps("player", battle.player, battle.foe, MOVES.ztl, "ELLYNA", false);
  assert.equal(battle.polemica.value, 3);
  battle.fieldResolved = false; battle.polemica.value = 0;
  const foeSteps = battle.moveSteps("foe", battle.foe, battle.player, MOVES.comizio, "SALVINOTT", true);
  assert.match(foeSteps[0].text, /FONDI FINITI/); assert.equal(battle.polemica.value, 0);
  battle.moveSteps("player", battle.player, battle.foe, MOVES.ztl, "ELLYNA", false);
  assert.equal(battle.polemica.value, 0);
});

function recruitmentBattle(balls: number, polemica = 3) {
  const battle = Object.create(BattleScene.prototype) as any;
  battle.state = newGameState(); battle.state.bag.scheda = balls;
  battle.stack = { top: battle }; battle.mode = "menu"; battle.finished = false;
  battle.input = { reset() {} }; battle.polemica = new Polemica();
  battle.polemica.value = polemica;
  battle.foe = makeCombatant(createMonster("salvinott", 5));
  battle.catchBoost = true;
  battle.catchEstimate = (id: string, viral: boolean) => { assert.equal(id, "scheda"); return viral ? .95 : .6; };
  battle.queue = []; battle.pushFront = (steps: any[]) => battle.queue.push(...steps);
  return battle;
}

test("viral recruitment spends Polemica without paper; stale touch cannot spend twice", () => {
  const battle = recruitmentBattle(0);
  battle.openRecruit();
  assert.equal(battle.touchActions[0].disabled, true);
  const viral = battle.touchActions[1]; assert.equal(viral.disabled, false);
  viral.run(); viral.run();
  assert.equal(battle.state.bag.scheda, 0);
  assert.equal(battle.polemica.value, 0);
  assert.equal(battle.catchBoost, false);
  assert.equal(battle.queue.length, 3);
  assert.deepEqual(battle.state.dailyQuestsDone, []);
  battle.queue[1].run(); assert.equal(battle.ballAnim.viral, true);
});

test("normal recruitment requires paper and viral recruitment needs three Polemica", () => {
  const battle = recruitmentBattle(0, 2);
  battle.throwBall("scheda"); battle.throwBall("scheda", true); battle.throwBall("schedona", true);
  assert.equal(battle.queue.length, 0); assert.equal(battle.polemica.value, 2);
  battle.state.bag.scheda = 2;
  battle.throwBall("scheda");
  assert.equal(battle.state.bag.scheda, 1); assert.equal(battle.polemica.value, 2);
  battle.queue[1].run(); assert.equal(battle.ballAnim.viral, false);
});

test("failed viral recruitment keeps paper and gives the foe its response", () => {
  const battle = recruitmentBattle(5);
  battle.catchEstimate = () => 0;
  let counters = 0; battle.foeCounterStep = () => ({ run: () => counters++ }); battle.endOfTurnSteps = () => [];
  battle.throwBall("scheda", true);
  const thrown = battle.queue.splice(0); thrown[1].run(); assert.equal(battle.ballAnim.success, false);
  thrown[2].run(); battle.queue.forEach((step: any) => step.run?.());
  assert.equal(counters, 1); assert.equal(battle.state.bag.scheda, 5); assert.equal(battle.polemica.value, 0);
});
