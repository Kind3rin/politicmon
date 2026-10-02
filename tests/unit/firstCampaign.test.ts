import assert from 'node:assert/strict';
import test from 'node:test';
import {createMonster, expForLevel, expYield, gainExp} from '../../src/game/monster.ts';
import {newGameState, parseGameState, serializeGameState} from '../../src/game/state.ts';
import {currentQuest} from '../../src/data/quests.ts';
import {TRAINERS} from '../../src/data/trainers.ts';
import {buildTrainerTeam, recordNewTrainerVictory} from '../../src/game/world/battleCoordinator.ts';
import {MAPS} from '../../src/data/maps.ts';

test('Early learning accelerates recruitment; advanced yields remain unchanged and stronger foes pay more',()=>{
 const foe=createMonster('salvinott',5);
 assert.equal(expYield(foe,false,5),100);assert.equal(expYield(foe,true,10),150);
 assert.equal(expYield(foe,false,15),75);assert.equal(expYield(foe,false,20),50);
 for(const lv of [20,30,55])assert.equal(expYield(foe,true,lv),75);
 for(const learner of [5,11,19,55]){
  let previous=0;for(let lv=1;lv<=60;lv++){
   const amount=expYield(createMonster('salvinott',lv),false,learner);
   assert.ok(amount>=previous);previous=amount;
  }
 }
});

test('Saved level and partial progress survive the early pacing change and the next level still needs EXP',()=>{
 for(const lv of [5,16,30,54]){
  const state=newGameState(),mon=createMonster('ellyna',lv),next=expForLevel(lv+1);
  mon.exp=next-2;state.party=[mon];
  const restored=parseGameState(serializeGameState(state))!;
  assert.equal(restored.party[0].level,lv);assert.equal(restored.party[0].exp,next-2);
  assert.equal(gainExp(restored.party[0],1).length,0);
  assert.equal(gainExp(restored.party[0],1)[0].newLevel,lv+1);
 }
 const max=createMonster('ellyna',55),before=max.exp;
 assert.deepEqual(gainExp(max,999999),[]);assert.equal(max.exp,before);
});

test('Guidance follows recruitment and sharing, supports boxed candidates and never reopens old chapters',()=>{
 const state=newGameState();Object.assign(state.flags,{'starter-chosen':true,'rival1-beaten':true,'dex-received':true});
 state.party=[createMonster('ellyna',5)];assert.equal(currentQuest(state)?.id,'recruit');
 state.boxed=[createMonster('salvinott',5)];assert.equal(currentQuest(state)?.id,'share');
 state.bag.divisa=1;assert.equal(currentQuest(state)?.id,'gym1');
 state.boxed=[];delete state.bag.divisa;state.badges=['auditel'];assert.equal(currentQuest(state)?.id,'gym2');
});

test('Route practice has a distinct result and rehearsal uses announced normal/hard levels without blocking the hall',()=>{
 const state=newGameState();state.defeatedTrainers=['aide'];
 assert.deepEqual(recordNewTrainerVictory(state,'praticante','win'),[]);
 assert.ok(state.defeatedTrainers.includes('praticante'));
 assert.equal(state.morale.progress,1);
 const trainee=MAPS.route1.npcs.find(n=>n.id==='tr-route1')!;
 assert.equal(trainee.trainerId,'praticante');
 assert.equal(MAPS.gymtv.npcs.find(n=>n.trainerId==='stagista')?.sightRange,undefined);
 for(const hard of [false,true]){
  state.hardMode=hard;
  assert.deepEqual(buildTrainerTeam(state,TRAINERS.stagista,{fallbackTeam:()=>[],bossTrainerIds:[]}).map(m=>m.level),hard?[11,12]:[8,9]);
 }
});
