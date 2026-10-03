import {PartyScene} from '../../src/scenes/PartyScene';
import {EvolutionScene} from '../../src/scenes/EvolutionScene';
import {SceneStack} from '../../src/engine/scene';
import type {Input} from '../../src/engine/input';
import assert from "node:assert/strict";
import test from "node:test";
import { createMonster, evolve, statsOf, levelEvolution } from "../../src/game/monster";
import { careerNotes, evolutionComparison, evolutionPreview, evolutionSummary } from "../../src/game/evolutionGuide";
import { newGameState, parseGameState } from "../../src/game/state";
import { resolveCivicChoice, civicNpcReply } from "../../src/game/civicChoices";
import { shopPrice } from "../../src/game/governo";
import { ITEMS } from "../../src/data/items";

test("evolution forecast matches actual ratios without consuming PP, status, item or seasonal form", () => {
  const mon = createMonster("giorgetta", 18);
  mon.hp = 7; mon.status = "scandalo"; mon.heldItem = "caffettiera";
  mon.moves[0].pp = 0; mon.memeFormId = "invalid-form";
  const before = JSON.stringify(mon);
  const forecast = evolutionPreview(mon, "giorgiagon");
  assert.equal(JSON.stringify(mon), before);
  assert.equal(forecast.memeFormId, undefined);
  assert.equal(forecast.heldItem, mon.heldItem); assert.equal(forecast.status, mon.status);
  assert.deepEqual(forecast.moves, mon.moves);
  evolve(mon, "giorgiagon"); assert.deepEqual(mon, forecast);
  forecast.moves[0].pp = 3; assert.equal(mon.moves[0].pp, 0);
});

test("evolving a fainted candidate does not provide a free revival", () => {
  const mon = createMonster("salvinator", 30); mon.hp = 0;
  assert.equal(evolutionPreview(mon, "capitanone").hp, 0);
  evolve(mon, "capitanone"); assert.equal(mon.hp, 0); assert.ok(statsOf(mon).hp > 0);
});

test("deferred careers re-evaluate both polling branches at the level cap", () => {
  const mon = createMonster("salvinott", 55);
  assert.equal(levelEvolution(mon, 49), "salvinurlo");
  assert.equal(levelEvolution(mon, 50), "salvinator");
  assert.match(careerNotes(mon, 49).join(" "), /PRONTA: SALVINURLO/);
  assert.match(careerNotes(mon, 50).join(" "), /SONDAGGI SOTTO 50/);
  assert.match(evolutionComparison(mon, "salvinator", 2).join(" "), /NON IMPARA AUTOMATICAMENTE/);
});

test("fuel signage is a persistent tradeoff and cannot be farmed for polls or money", () => {
  const state = newGameState(); state.money = 79;
  const before = JSON.stringify(state);
  assert.equal(resolveCivicChoice(state, "pompa", 1).ok, false); assert.equal(JSON.stringify(state), before);
  state.money = 500; state.morale.trust = 70;
  const price = shopPrice(state, ITEMS.tessera);
  assert.equal(resolveCivicChoice(state, "pompa", 1).ok, true);
  assert.equal(state.money, 420); assert.equal(state.sondaggi, 55); assert.equal(state.morale.trust, 65);
  assert.ok(shopPrice(state, ITEMS.tessera) > price);
  const restored = parseGameState(JSON.stringify(state))!;
  assert.match(civicNpcReply(restored, "benzinaio-r3")!.join(" "), /prezzo/);
  const after = JSON.stringify(restored);
  assert.equal(resolveCivicChoice(restored, "pompa", 0).ok, false); assert.equal(JSON.stringify(restored), after);
});


test("Opening evolution gives four facts without changing the earned monster", () => {
  for (const [id, target] of [["giorgetta", "giorgiagon"], ["ellyna", "schleinix"], ["renzino", "renzilla"]]) {
    const mon=createMonster(id,8);mon.hp=3;mon.moves[0].pp=0;
    const before=JSON.stringify(mon),facts=evolutionSummary(mon,target);
    assert.equal(facts.length,4);assert.match(facts[3],/^LV 9:/);
    assert.equal(JSON.stringify(mon),before);
  }
});

test("Evolution accepts once, returns automatically, and stale thumb commands cannot decline it",()=>{
 const stack=new SceneStack(),keys=new Set<string>();let accepted=0,declined=0;
 const input={wasPressed:(key:string)=>keys.delete(key),reset:()=>keys.clear()} as Input;
 const scene=new EvolutionScene(stack,input,'ellyna','schleinix',()=>accepted++,{mon:createMonster('ellyna',8),onDecline:()=>declined++});
 stack.push(scene);const commands=scene.touchActions!;
 commands[2].run();keys.add('b');scene.update(.1);assert.equal(declined,0);
 scene.touchActions![0].run();commands[1].run();
 for(let i=0;i<60;i++)scene.update(.1);
 assert.equal(accepted,1);assert.equal(declined,0);assert.equal(stack.top,undefined);
 scene.update(100);assert.equal(accepted,1);
});

test("Declining a reduced-effects evolution preserves the monster and permits a later attempt",()=>{
 const stack=new SceneStack(),mon=createMonster('renzino',8),before=JSON.stringify(mon);let declined=0;
 const input={wasPressed:()=>false,reset:()=>{}} as unknown as Input;
 const scene=new EvolutionScene(stack,input,'renzino','renzilla',()=>assert.fail('declined'),{mon,reduceEffects:true,onDecline:()=>declined++});
 stack.push(scene);scene.touchActions![1].run();scene.update(100);
 assert.equal(declined,1);assert.equal(JSON.stringify(mon),before);assert.equal(stack.top,undefined);
});


test("Squad card opens an earned evolution directly; mirror parties cannot change ownership",()=>{
 const state=newGameState(),stack=new SceneStack(),keys=new Set<string>();state.party=[createMonster('ellyna',8)];
 const input={wasPressed:(key:string)=>keys.delete(key),reset:()=>keys.clear()} as Input;
 const party=new PartyScene(stack,input,state,{mode:'view'});stack.push(party);keys.add('a');party.update();
 const commands=party.touchActions!;assert.equal(commands[0].disabled,false);commands[0].run();
 const evolution=stack.top;assert.ok(evolution instanceof EvolutionScene);commands[0].run();assert.equal(stack.top,evolution);
 evolution.touchActions![1].run();assert.equal(state.party[0].speciesId,'ellyna');assert.equal(stack.top,party);
 const mirror=new PartyScene(stack,input,state,{mode:'view',partyOverride:state.party});stack.push(mirror);keys.add('a');mirror.update();
 assert.equal(mirror.touchActions![0].disabled,true);mirror.touchActions![0].run();assert.equal(stack.top,mirror);
});
