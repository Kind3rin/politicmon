import assert from 'node:assert/strict';
import test from 'node:test';
import {createMonster, expForLevel, expYield, gainExp} from '../../src/game/monster.ts';
import {newGameState, parseGameState, serializeGameState} from '../../src/game/state.ts';
import {currentQuest} from '../../src/data/quests.ts';
import {TRAINERS} from '../../src/data/trainers.ts';
import {buildTrainerTeam, preparePractice, recordNewTrainerVictory} from '../../src/game/world/battleCoordinator.ts';
import {firstRivalReady} from '../../src/game/firstCampaign.ts';
import {ACHIEVEMENTS} from '../../src/game/achievements.ts';
import {levelEvolution} from '../../src/game/monster.ts';
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

test('First practice repairs the earned party without changing progress; completed practice and other trainers do not',()=>{
 const state=newGameState(),mon=createMonster('ellyna',6);
 state.party=[mon];mon.hp=1;mon.status='scandalo';mon.moves[0].pp=0;
 const exp=mon.exp,money=state.money;
 assert.equal(preparePractice(state,'praticante'),true);
 assert.ok(mon.hp>1);assert.equal(mon.status,null);assert.ok(mon.moves[0].pp>0);
 assert.equal(mon.exp,exp);assert.equal(state.money,money);assert.deepEqual(state.defeatedTrainers,[]);
 mon.hp=1;state.defeatedTrainers.push('praticante');
 assert.equal(preparePractice(state,'praticante'),false);assert.equal(mon.hp,1);
 assert.equal(preparePractice(state,'auditel'),false);assert.equal(mon.hp,1);
});


test('New opening earns capture and first evolution before the rival; old saves keep their chapter',()=>{
 const state=newGameState();state.flags['opening-v2']=true;
 assert.equal(currentQuest(state)?.id,'starter');
 state.flags['starter-chosen']=true;state.starterId='ellyna';state.party=[createMonster('ellyna',5)];
 assert.equal(currentQuest(state)?.id,'dex');
 state.flags['dex-received']=true;assert.equal(currentQuest(state)?.id,'recruit');
 state.boxed=[createMonster('salvinott',5)];assert.equal(currentQuest(state)?.id,'grow');
 state.defeatedTrainers=['praticante'];assert.equal(currentQuest(state)?.target?.y,12);
 assert.match(currentQuest(state)!.hint,/caffè/);
 state.party[0].level=8;assert.equal(levelEvolution(state.party[0],state.sondaggi),'schleinix');
 assert.equal(firstRivalReady(state),false); // Reaching the level is not accepting the evolution.
 state.dex.schleinix='caught';assert.equal(firstRivalReady(state),true);
 const restored=parseGameState(serializeGameState(state))!;
 assert.equal(currentQuest(restored)?.id,'rival1');assert.equal(firstRivalReady(restored),true);
 delete restored.flags['opening-v2'];
 assert.equal(currentQuest(restored)?.target?.mapId,'lab');
 restored.badges=['auditel'];assert.equal(currentQuest(restored)?.id,'gym2');
});

test('Changing the starter form cannot masquerade as the first wild recruitment',()=>{
 const state=newGameState();state.starterId='ellyna';state.party=[createMonster('schleinix',8)];
 state.dex.ellyna='caught';state.dex.schleinix='caught';
 const achievement=ACHIEVEMENTS.find(a=>a.id==='first-catch')!;
 assert.equal(achievement.done(state),false);
 state.runStats.captures=1;assert.equal(achievement.done(state),true);
});


test('Starter touch choice is explicit, details are pure and old taps cannot recruit twice',async()=>{
 const {StarterPreviewScene}=await import('../../src/scenes/StarterPreviewScene');
 const {SceneStack}=await import('../../src/engine/scene');
 const stack=new SceneStack(),input={reset(){}};let choices=0;
 const world={update(){},draw(){}};stack.push(world);
 const scene=new StarterPreviewScene(stack,input as never,'renzino',()=>choices++);stack.push(scene);
 const oldChoice=scene.touchActions[0];scene.touchActions.find(a=>a.label==='MOSSE')!.run();
 oldChoice.run();assert.equal(choices,0);
 scene.touchActions.find(a=>a.label==='SCHEDA')?.run();
 const choice=scene.touchActions[0];choice.run();choice.run();
 assert.equal(choices,1);assert.equal(stack.top,world);oldChoice.run();assert.equal(choices,1);
});
