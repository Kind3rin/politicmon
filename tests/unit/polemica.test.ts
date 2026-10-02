import assert from "node:assert/strict";
import test from "node:test";
import { MOVES } from "../../src/data/moves.ts";
import { Polemica, FUORIONDA, fuoriondaDamage, recruitmentChance } from "../../src/game/battle/polemica.ts";
import { MessageBox } from "../../src/ui/widgets.ts";
import { TeachScene } from "../../src/scenes/TeachScene.ts";
import { SceneStack } from "../../src/engine/scene.ts";
import { BattleScene } from "../../src/game/battle/BattleScene.ts";
import { createMonster } from "../../src/game/monster.ts";
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
