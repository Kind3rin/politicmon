import assert from "node:assert/strict";
import test from "node:test";
import { MOVES } from "../../src/data/moves.ts";
import { Polemica, FUORIONDA, fuoriondaDamage, recruitmentChance } from "../../src/game/battle/polemica.ts";
import { MessageBox, wrapText } from "../../src/ui/widgets.ts";
import { TeachScene } from "../../src/scenes/TeachScene.ts";
import { SceneStack } from "../../src/engine/scene.ts";
import { BattleScene } from "../../src/game/battle/BattleScene.ts";
import { createMonster, expForLevel, expYield } from "../../src/game/monster.ts";
import { newGameState, parseGameState } from "../../src/game/state.ts";
import { makeCombatant } from "../../src/game/battle/sim.ts";
import { FIELD_EVENTS } from "../../src/game/battle/fieldEvents.ts";
import { CivicScene } from "../../src/scenes/CivicScene.ts";
import { CIVIC_EVENTS } from "../../src/data/civicEvents.ts";

function withSaveStorage(check: (saved: Map<string,string>) => void): void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const saved = new Map<string,string>();
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v)}});
  try { check(saved); }
  finally { if(previous)Object.defineProperty(globalThis,"localStorage",previous);else delete (globalThis as any).localStorage; }
}

test("civic touch choices commit costs, promises and morale once before the result can close", () => withSaveStorage(saved => {
  const state = newGameState(); state.money = 1000;
  let popped = 0;
  const scene = new CivicScene({ pop: () => popped++ } as any, idle, state, CIVIC_EVENTS.bus);
  const pay = scene.touchActions[0];
  assert.equal(pay.hint, "180€ S-2 F+12 C+6");
  assert.match(scene.touchActions[1].hint!, /3SF/);
  pay.run();
  assert.equal(state.money, 820); assert.equal(state.morale.trust, 62); assert.equal(state.morale.cohesion, 66);
  assert.equal(state.morale.promises[0].status, "kept");
  const restored = [...saved.values()].map(value => parseGameState(value)).find(s => s?.morale.decisions.includes("bus:pay"));
  assert.ok(restored); assert.equal(restored.money, 820);
  pay.run(); assert.equal(state.money, 820); assert.equal(popped, 0);
  for (let i = 0; i < 8 && scene.touchActions[0].label === "CONTINUA"; i++) scene.touchActions[0].run();
  assert.equal(popped, 1);
}));

test("civic canvas taps select the touched choice while leaving cancels and unaffordable options safe", () => withSaveStorage(() => {
  const state = newGameState(); state.money = 0;
  let popped = 0;
  const input = { wasPressed: () => false, tapInRect: (_x: number, y: number) => y === 139 } as any;
  const scene = new CivicScene({ pop: () => popped++ } as any, input, state, CIVIC_EVENTS.bus);
  assert.equal(scene.touchActions[0].disabled, true);
  scene.update(.01);
  assert.ok(state.morale.decisions.includes("bus:crop"));
  assert.equal(state.money, 0); assert.equal(state.morale.trust, 38);
  const fresh = newGameState();
  const cancel = new CivicScene({ pop: () => popped++ } as any, idle, fresh, CIVIC_EVENTS.bus);
  const before = JSON.stringify(fresh);
  cancel.touchActions[3].run();
  assert.equal(JSON.stringify(fresh), before); assert.equal(popped, 1);
}));

test("result commitment consumes only applied campaign boosts once, including rematches and tournaments",()=>{
  const cases=[
    ["caught",undefined,false,[2,3,3]], ["win",undefined,false,[2,3,3]],
    ["win","rival1",false,[2,2,2]], ["win","rival1",true,[2,3,2]],
    ["win","coppa:test",false,[3,3,2]], ["loss","rival1",false,[3,3,3]],
    ["run",undefined,false,[3,3,3]]
  ] as const;
  for(const [result,id,isRematch,expected] of cases){
    const b:any=Object.create(BattleScene.prototype),state=newGameState();
    state.boostExpBattles=state.boostMoneyBattles=state.boostSondBattles=3;
    Object.assign(b,{state,isRematch,trainer:id?{id}:undefined});b.recordResult(result);
    const committed=JSON.stringify(state);b.recordResult(result);assert.equal(JSON.stringify(state),committed);
    assert.deepEqual([state.boostExpBattles,state.boostMoneyBattles,state.boostSondBattles],expected);
    assert.equal(state.runStats[result==="caught"?"captures":result==="win"?"wins":result==="loss"?"losses":"runs"],1);
  }
});

test("recruitment saves capture and growth before the skippable receipt, then keeps learning and evolution", () => withSaveStorage(saved => {
    const b:any=Object.create(BattleScene.prototype), state=newGameState();
    const lead=createMonster("ellyna",7), alive=createMonster("salvinott",6), ko=createMonster("grillix",5), foe=createMonster("calendauro",5);
    ko.hp=0;alive.exp=expForLevel(7)-1;
    state.party=[lead,alive,ko];state.bag.divisa=1;state.starterId="ellyna";
    state.flags["opening-v2"]=true;state.defeatedTrainers=["praticante"];state.runStats.captures=1;
    state.boostExpBattles=2;
    Object.assign(b,{state,player:makeCombatant(lead),foe:makeCombatant(foe),queue:[],mode:"queue",input:{reset(){}},onEnd() {},finished:false});
    b.stack={top:b};const choices:string[]=[];
    b.learnMoveSteps=(id:string,mon=lead)=>[{run:()=>{assert.equal(b.recruitReceipt,null);choices.push(`${mon.speciesId}:${id}`);}}];
    b.evolveStepsFor=(mon:any,id:string)=>[{run:()=>{assert.equal(b.recruitReceipt,null);choices.push(`evolve:${mon.speciesId}:${id}`);}}];
    const capture=b.captureSteps();capture[0].run();capture[1].run();
    assert.equal(state.party.at(-1),foe);assert.equal(state.dex.calendauro,"caught");
    assert.equal(lead.level,8);assert.equal(foe.level,5);assert.equal(ko.exp,expForLevel(5));
    assert.equal(alive.level,7);assert.match(b.recruitReceipt.levels,/LV7 > 8.*DIVISA 1x/);
    assert.equal(b.recruitReceipt.newDex,true);assert.equal(b.recruitReceipt.polls,3);
    assert.equal(b.recruitReceipt.saved,true);
    assert.equal(choices.length,0);
    const restored=[...saved.values()].map(v=>parseGameState(v)).find(s=>s?.party[0].level===8)!;
    assert.ok(restored);assert.equal(restored.party.length,4);assert.equal(restored.dex.calendauro,"caught");
    assert.equal(restored.runStats.captures,2);assert.equal(restored.boostExpBattles,1);
    b.stepTimer=1.8;const skip=b.touchActions[0];skip.run();assert.equal(b.stepTimer,0);
    const after=JSON.stringify(state);skip.run();assert.equal(JSON.stringify(state),after);
    while(b.queue.length)b.queue.shift().run?.();
    assert.equal(state.runStats.captures,2);assert.equal(state.boostExpBattles,1);
    assert.ok(choices.includes("evolve:ellyna:schleinix"));assert.ok(choices.some(c=>c.startsWith("salvinott:")));
}));

test("an ally's opening recruitment boosts the living bench starter and saves its evolution without sharing twice", () => withSaveStorage(saved => {
  for (const share of [0, 1]) {
    const b:any=Object.create(BattleScene.prototype), state=newGameState();
    const lead=createMonster("salvinott",5), starter=createMonster("renzino",6), other=createMonster("grillix",5), foe=createMonster("calendauro",5);
    state.party=[lead,starter,other];state.starterId="renzino";state.bag.divisa=share;
    state.flags["opening-v2"]=true;state.defeatedTrainers=["praticante"];state.runStats.captures=1;
    Object.assign(b,{state,player:makeCombatant(lead),foe:makeCombatant(foe),queue:[],mode:"queue",input:{reset(){}},onEnd() {},finished:false});
    b.stack={top:b};const choices:string[]=[];
    b.learnMoveSteps=(id:string,mon=lead)=>[{run:()=>{assert.equal(b.recruitReceipt,null);choices.push(`${mon.speciesId}:${id}`);}}];
    b.evolveStepsFor=(mon:any,id:string)=>[{run:()=>{assert.equal(b.recruitReceipt,null);choices.push(`evolve:${mon.speciesId}:${id}`);}}];
    b.captureSteps()[0].run();
    assert.equal(starter.level,8);assert.equal(starter.exp,expForLevel(8));assert.equal(foe.exp,expForLevel(5));
    const leadExp=lead.exp-expForLevel(5);assert.ok(leadExp>0);assert.equal(other.exp-expForLevel(5),share?Math.max(1,Math.floor(leadExp/2)):0);
    assert.match(b.recruitReceipt.levels,/RENZINO LV6 > 8/);assert.match(b.recruitReceipt.levels,/SLANCIO/);
    const restored=[...saved.values()].map(v=>parseGameState(v)).find(s=>s?.party[1].uid===starter.uid)!;
    assert.equal(restored.party[1].level,8);assert.equal(restored.runStats.captures,2);
    b.stepTimer=1.8;b.touchActions[0].run();while(b.queue.length)b.queue.shift().run?.();
    assert.equal(choices.filter(c=>c==="evolve:renzino:renzilla").length,1);
  }
}));

test("opening bench momentum never revives a KO starter or affects an old campaign", () => withSaveStorage(() => {
  for (const oldCampaign of [false,true]) {
    const b:any=Object.create(BattleScene.prototype),state=newGameState();
    const lead=createMonster("salvinott",5),starter=createMonster("renzino",6),foe=createMonster("calendauro",5);
    if(!oldCampaign)starter.hp=0;
    state.party=[lead,starter];state.starterId="renzino";state.bag.divisa=0;
    state.flags["opening-v2"]=!oldCampaign;state.defeatedTrainers=["praticante"];state.runStats.captures=1;
    Object.assign(b,{state,player:makeCombatant(lead),foe:makeCombatant(foe),queue:[],recruitReceipt:{modifiers:[]}});
    const before=structuredClone(starter);b.consensusSteps(()=>{},true)[0].run();
    assert.deepEqual(starter,before);assert.doesNotMatch(b.recruitReceipt.levels,/SLANCIO/);
  }
}));

test("KO growth has one skippable receipt with real bonuses and preserves bench lessons, evolution and the next foe", () => {
  const b:any=Object.create(BattleScene.prototype),state=newGameState();
  const lead=createMonster("ellyna",7),bench=createMonster("salvinott",6),dead=createMonster("grillix",5),foe=createMonster("calendauro",8);
  lead.exp=expForLevel(8)-1;bench.exp=expForLevel(7)-1;dead.hp=0;foe.hp=0;
  state.party=[lead,bench,dead];state.bag.divisa=1;state.sondaggi=80;state.morale.cohesion=80;state.boostExpBattles=2;
  state.ministri={istruzione:lead.uid,economia:lead.uid,salute:lead.uid};
  Object.assign(b,{state,player:makeCombatant(lead),foe:makeCombatant(foe),trainer:{id:"rival1"},queue:[],mode:"queue",input:{reset(){}},fx:{}});b.stack={top:b};
  const choices:string[]=[];let nextFoe=0;
  b.afterFoeDown=()=>nextFoe++;
  b.learnMoveSteps=(id:string,mon=lead)=>[{run:()=>{assert.equal(b.growthReceipt,null);choices.push(`${mon.speciesId}:${id}`);}}];
  b.evolveStepsFor=(mon:any,id:string)=>[{run:()=>{assert.equal(b.growthReceipt,null);choices.push(`evolve:${mon.speciesId}:${id}`);}}];
  const before=lead.exp,benchBefore=bench.exp,steps=b.foeFaintedSteps();
  assert.ok(steps.every((s:any)=>!s.text));const apply=steps[1];apply.run();
  const gained=Math.max(1,Math.floor(expYield(foe,true,7)*1.25*1.3*1.15*.87*1.08));
  assert.equal(lead.exp-before,gained);assert.equal(bench.exp-benchBefore,Math.max(1,Math.floor(gained/2)));assert.equal(dead.exp,expForLevel(5));
  assert.equal(b.growthReceipt.gained,gained);assert.equal(b.growthReceipt.previousLevel,7);
  assert.match(b.growthReceipt.shared,/DIVISA 1 ALLEATI/);assert.equal(b.growthReceipt.modifiers.length,5);
  assert.equal(wrapText(b.growthReceipt.modifiers.join(" · "),36).length,2);
  assert.ok(b.queue.every((s:any)=>!s.text));assert.equal(b.queue.filter((s:any)=>s.pause).length,1);
  const committed=JSON.stringify(state);apply.run();assert.equal(JSON.stringify(state),committed);
  b.stepTimer=1.6;const skip=b.touchActions[0];skip.run();skip.run();assert.equal(b.stepTimer,0);assert.equal(nextFoe,0);
  while(b.queue.length)b.queue.shift().run?.();
  assert.equal(nextFoe,1);assert.equal(state.runStats.wins,0);assert.equal(state.boostExpBattles,2);
  assert.ok(choices.some(c=>c.startsWith("salvinott:")));assert.ok(choices.includes("evolve:ellyna:schleinix"));
});

test("a capped squad skips empty KO growth while preserving pending evolutions and the next foe", () => {
  const b:any=Object.create(BattleScene.prototype),state=newGameState();
  const lead=createMonster("ellyna",55),bench=createMonster("salvinott",55),foe=createMonster("calendauro",5);
  state.party=[lead,bench];state.bag.divisa=1;
  Object.assign(b,{state,player:makeCombatant(lead),foe:makeCombatant(foe),queue:[],growthReceipt:null});
  let evolution=0,next=0;b.evolveStepsFor=()=>[{run:()=>evolution++}];
  const before=JSON.stringify(state);b.consensusSteps(()=>next++)[0].run();
  assert.equal(JSON.stringify(state),before);assert.equal(b.growthReceipt,null);
  assert.ok(b.queue.every((s:any)=>!s.text&&!s.pause));
  while(b.queue.length)b.queue.shift().run?.();
  assert.equal(evolution,2);assert.equal(next,1);
});

test("a duplicate goes to the full-party box, restores traded zone credit and pays the zone once", () => withSaveStorage(() => {
  const b:any=Object.create(BattleScene.prototype),state=newGameState();
  state.party=Array.from({length:6},()=>createMonster("ellyna",7));state.sondaggi=100;
  state.dex={salvinott:"caught",grillix:"caught",tajanide:"caught",contemorfo:"caught"};state.flags["dex-trade:contemorfo"]=true;
  state.zoneRewardsClaimed=[];state.browserSeed=0;
  Object.assign(b,{state,player:makeCombatant(state.party[0]),foe:makeCombatant(createMonster("contemorfo",5)),queue:[]});
  b.endBattle=()=>{};b.consensusSteps=()=>[];
  const money=state.money,balls=state.bag.schedona??0;
  const first=b.captureSteps();first[0].run();
  assert.equal(state.party.length,6);assert.equal(state.boxed.length,1);assert.equal(b.recruitReceipt.destination,"NEL BOX: CIRCOLO");
  assert.equal(b.recruitReceipt.newDex,false);assert.equal(b.recruitReceipt.polls,0);
  assert.equal(state.flags["dex-trade:contemorfo"],undefined);assert.equal(state.money,money+800);assert.equal(state.bag.schedona,balls+2);
  first.at(-1).run();assert.match(b.queue[0].text,/BORGO.*2x.*800 FONDI/);
  b.foe=makeCombatant(createMonster("contemorfo",5));
  b.captureSteps()[0].run();assert.equal(state.money,money+800);assert.equal(state.bag.schedona,balls+2);
}));

test("quiet recruitment retains combined growth modifiers and fits their explanation in two lines",()=>withSaveStorage(()=>{
  const b:any=Object.create(BattleScene.prototype),state=newGameState();const lead=createMonster("ellyna",10),foe=createMonster("grillix",5);
  state.party=[lead];state.sondaggi=80;state.morale.cohesion=80;state.boostExpBattles=2;
  // Named ministers only apply to living, deployed party members.
  state.ministri={istruzione:lead.uid,economia:lead.uid,salute:lead.uid};
  Object.assign(b,{state,player:makeCombatant(lead),foe:makeCombatant(foe),queue:[],recruitReceipt:{modifiers:[]}});
  b.learnMoveSteps=()=>[];b.evolveStepsFor=()=>[];
  const before=lead.exp;const steps=b.consensusSteps(()=>{},true);
  assert.ok(steps.every((s:any)=>!s.text));steps[0].run();
  assert.equal(lead.exp-before,Math.max(1,Math.floor(expYield(foe,false,10)*1.25*1.3*1.15*.87*1.08)));
  assert.equal(b.recruitReceipt.modifiers.length,5);assert.ok(wrapText(b.recruitReceipt.modifiers.join(" · "),36).length<=2);
  assert.match(b.recruitReceipt.modifiers.join(" "),/COESIONE.*ONDA.*MANIFESTI.*ISTRUZ.*MIN/);
  const capped=createMonster("ellyna",55),bench=createMonster("salvinott",55);
  state.party=[capped,bench];state.bag.divisa=1;b.player=makeCombatant(capped);
  b.consensusSteps(()=>{},true)[0].run();
  assert.match(b.recruitReceipt.growth,/\+0 CONSENSO/);assert.doesNotMatch(b.recruitReceipt.levels,/DIVISA/);
}));

test("move order labels follow announced priority and next-turn phases without mutating combatants", () => {
  const b: any=Object.create(BattleScene.prototype);
  b.player=makeCombatant(createMonster("ellyna",9));
  b.foe=makeCombatant({...b.player.mon,moves:b.player.mon.moves.map((s: any)=>({...s}))});
  b.fieldTurn=1;b.foeIntent=MOVES.comizio;
  b.player.stages.spd=2;
  assert.equal(b.orderLabel(MOVES.comizio),"AGISCI PRIMA");
  b.field=FIELD_EVENTS[1];
  const before=JSON.stringify([b.player,b.foe]);
  assert.equal(b.orderLabel(MOVES.comizio),"PARITÀ: 50%");
  assert.equal(JSON.stringify([b.player,b.foe]),before);
  b.trainer={id:"futuro-anteriore"};b.foe.mon.hp=1;b.futuroPhaseTriggered=false;
  assert.equal(b.orderLabel(MOVES.comizio),"AGISCI DOPO");
  b.foeIntent=null;
  assert.equal(b.orderLabel(MOVES.comizio),undefined);
});

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

test("portrait world dialogue draws and accepts taps at the expanded bottom edge", () => {
  const box = new MessageBox();
  box.show(["IL COMUNICATO."]);
  box.update(1, idle, 410);
  let tapY = 160;
  const input = { wasPressed: () => false, tapInRect: (_x: number, y: number, _w: number, h: number) => tapY >= y && tapY < y + h } as any;
  box.update(.01, input, 410);
  assert.equal(box.isOpen, true, "tapping the old bottom must not advance a portrait dialogue");
  let panelY = 0;
  box.draw({ height: 410, panel: (_x: number, y: number) => { panelY = y; }, text: () => {} } as any);
  assert.equal(panelY, 366);
  tapY = 390;
  box.update(.01, input, 410);
  assert.equal(box.isOpen, false);
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

test("impact keeps critical and self-type satire together, reports actual PV, and waits before the next actor", () => {
  const b = Object.create(BattleScene.prototype) as any;
  b.state = { sondaggi: 50, reduceEffects: true };
  b.player = makeCombatant(createMonster("ellyna", 20)); b.foe = makeCombatant(createMonster("ellyna", 20));
  b.foe.mon.hp = 1; b.announcedOffensive = new Set(); b.polemica = new Polemica(); b.koCheckSteps = () => [];
  let visibleDamage = -1;
  b.fx = { onHit(_side: string, _mult: number, _crit: boolean, damage: number) { visibleDamage = damage; } };
  const random = Math.random; Math.random = () => 0;
  try {
    const steps = b.moveSteps("player", b.player, b.foe, MOVES.corteo, "ELLYNA", true);
    steps[0].run(); assert.match(b.actionCaption.actor, /^TU/); assert.equal(b.foe.mon.hp, 1);
    steps[1].run();
    assert.equal(b.foe.mon.hp, 0); assert.equal(visibleDamage, 1);
    assert.match(b.actionCaption.result, /-1 PV.*CRITICO.*SCISSIONE x1\.7/);
    assert.ok(steps[1].pause >= .8); // enough time to read the combined outcome
    assert.equal(steps[2].waitHp, true); // reactions and KO cannot outrun the PV bar
    assert.ok(!steps.some((s: any) => s.text?.includes("super efficace") || s.text?.includes("Colpo critico")));
  } finally { Math.random = random; }
});

test("a missed enemy announcement preserves PV, consumes one PP, and remains readable without a separate page", () => {
  const b = Object.create(BattleScene.prototype) as any;
  b.player = makeCombatant(createMonster("ellyna", 8)); b.foe = makeCombatant(createMonster("giorgetta", 8)); b.fx = {};
  const hp = b.player.mon.hp, slot = b.foe.mon.moves.find((s: any) => s.id === "comizio"), pp = slot.pp;
  const random = Math.random; Math.random = () => .99;
  try {
    const steps = b.moveSteps("foe", b.foe, b.player, { ...MOVES.comizio, accuracy: 1 }, "GIORGETTA", true);
    steps.forEach((s: any) => s.run?.());
    assert.equal(b.player.mon.hp, hp); assert.equal(slot.pp, pp - 1);
    assert.match(b.actionCaption.actor, /^NEMICO/); assert.match(b.actionCaption.result, /ANNUNCIO A VUOTO.*MANCATO/);
    assert.ok(steps.some((s: any) => s.pause >= .8)); assert.ok(steps.every((s: any) => !s.text));
  } finally { Math.random = random; }
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

test("copione shields real damage and its preview; successful setup removes it without changing announced intent", () => {
  const fixture = (shield: boolean) => {
    const b = Object.create(BattleScene.prototype) as any;
    b.player = makeCombatant(createMonster("ellyna", 8)); b.foe = makeCombatant(createMonster("giorgetta", 9));
    b.state = { sondaggi: 50, reduceEffects: true }; b.copione = shield; b.battery = 2; b.foe.stages.atk = shield ? 2 : 0;
    b.polemica = new Polemica(); b.koCheckSteps = () => []; b.pushFront = () => {}; b.fx = { onHit() {} };
    return b;
  };
  const apply = (b: any, move: typeof MOVES.comizio) => {
    const before = b.foe.mon.hp;
    for (const step of b.moveSteps("player", b.player, b.foe, move, "ELLYNA", true)) step.run?.();
    return before - b.foe.mon.hp;
  };
  const random = Math.random; Math.random = () => .5;
  try {
    const normal = fixture(false), shield = fixture(true);
    assert.match(shield.moveHint(MOVES.corteo), /SCUDO ×½/);
    const damage = apply(normal, MOVES.corteo);
    assert.equal(apply(shield, MOVES.corteo), Math.max(1, Math.floor(damage / 2)));
    assert.equal(shield.copioneDamage(0, MOVES.comizio), 0);
    assert.equal(shield.copioneDamage(15, FUORIONDA), 15);
    shield.foeIntent = shield.pickFoeIntent(); assert.equal(shield.foeIntent.id, "comizio");
    assert.match(shield.moveHint(MOVES.ztl), /ROMPE COPIONE/);
    apply(shield, MOVES.ztl);
    assert.equal(shield.battery, 0); assert.equal(shield.foe.stages.atk, -1); assert.equal(shield.copioneFxT, 0);
    assert.equal(shield.takeFoeIntent().id, "comizio"); assert.doesNotMatch(shield.moveHint(MOVES.corteo), /SCUDO/);
    shield.breakCopione(); assert.equal(shield.foe.stages.atk, -1);
  } finally { Math.random = random; }
});

test("failed and capped preparations cannot break the script; battery lasts two complete consuming turns", () => {
  const b = Object.create(BattleScene.prototype) as any;
  b.player = makeCombatant(createMonster("ellyna", 8)); b.foe = makeCombatant(createMonster("tajanide", 9));
  b.state = { reduceEffects: true }; b.copione = true; b.battery = 2; b.foe.stages.atk = 2;
  b.polemica = new Polemica(); b.koCheckSteps = () => []; const messages: string[] = [];
  b.pushFront = (steps: any[]) => messages.push(...steps.flatMap(s => s.text ? [s.text] : []));
  const apply = () => { for (const s of b.moveSteps("player", b.player, b.foe, MOVES.ztl, "ELLYNA", true)) s.run?.(); };
  apply(); assert.equal(b.battery, 2); assert.doesNotMatch(b.moveHint(MOVES.ztl), /ROMPE/);
  b.foe = makeCombatant(createMonster("giorgetta", 9)); b.foe.stages.atk = 2; b.foe.stages.spd = -6;
  apply(); assert.equal(b.battery, 2);
  b.drainBattery(); assert.equal(b.battery, 2); // legacy start-of-turn call does nothing
  const finishTurn = () => { for (const s of b.endOfTurnSteps()) s.run?.(); };
  finishTurn(); assert.equal(b.battery, 1); assert.equal(b.foe.stages.atk, 2);
  finishTurn(); assert.equal(b.battery, 0); assert.equal(b.foe.stages.atk, -1);
  finishTurn(); assert.equal(b.foe.stages.atk, -1); assert.equal(messages.filter(s => s.includes("FUORI COPIONE")).length, 1);
});
