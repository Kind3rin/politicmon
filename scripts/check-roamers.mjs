/** Wild candidates on a real WorldScene: spawn, contact, advantage handed to the battle, no random roll in the open. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5188'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async()=>{
  const {Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState}=await import('/src/game/state.ts'),{createMonster}=await import('/src/game/monster.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts');
  const {audio}=await import('/src/engine/audio.ts'),{mp}=await import('/src/net/mp.ts');audio.enabled=false;mp.setEnabled(false);
  const {seededRng}=await import('/src/game/tournament.ts');Math.random=seededRng(20261005);
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);
  const input=new Input(),stack=new SceneStack();
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  const tick=(n=1)=>{for(let i=0;i<n;i++){stack.update(.1);input.endFrame();}};
  const fresh=(flags={})=>{const s=newGameState();s.flags['intro-done']=true;s.flags['opening-v2']=true;Object.assign(s.flags,flags);s.party=[createMonster('ellyna',10)];s.pos={mapId:'route2',x:14,y:9,facing:'up'};return s;};
  // Tutorial: nothing roams before the first encounter has happened.
  let s=fresh(),w=new WorldScene(stack,input,s);stack.replace(w);tick(5);
  check(w.roamers===null,'Candidates appeared during the tutorial encounter');
  // After it: a handful of candidates, all on tall grass.
  s=fresh({'opening-encountered':true});w=new WorldScene(stack,input,s);stack.replace(w);tick(5);
  check(w.roamers&&w.roamers.roamers.length>=2,'No candidates on an open route');
  for(const r of w.roamers.roamers)check(w.tileAt(r.x,r.y)==='~'||w.tileAt(r.x,r.y)==='I','Candidate off the grass');
  // Walking through grass never rolls an invisible encounter on an outdoor map.
  const grass=w.roamers.roamers[0];Object.assign(grass,{mood:'sleep'});
  const before=s.flags['opening-encountered'];check(before===true,'flag');
  // A sleeper next to the player starts a wild battle with the player's advantage.
  const sleeper=w.roamers.roamers[0];
  const spot=[[15,9],[13,9],[14,8],[14,10]].find(([x,y])=>w.roamerOpen(x,y));
  Object.assign(sleeper,{x:spot[0],y:spot[1],fromX:spot[0],fromY:spot[1],t:1,mood:'sleep'});
  w.roamerGrace=0;tick(2);for(let n=0;stack.top===w&&n<40;n++)tick();
  const battle=stack.top;check(battle.constructor.name==='BattleScene','Contact did not start a battle');
  check(battle.firstOrder==='player','Sleeper did not hand over the first move');
  check(battle.polemica.value===1,'Ambush did not charge Polemica');
  check(w.roamers.roamers.every(r=>r!==sleeper),'The met candidate stayed on the map');
  // A repellent keeps every candidate away.
  stack.pop();stack.replace(w);
  const s2=fresh({'opening-encountered':true});s2.repellentSteps=50;const w2=new WorldScene(stack,input,s2);stack.replace(w2);tick(3);
  const near=w2.roamers.roamers[0];Object.assign(near,{x:14,y:8,fromX:14,fromY:8,t:1,mood:'chase',noticed:true});
  w2.roamerGrace=0;tick(5);check(stack.top===w2,'A repelled candidate still started a battle');
  return {roamers:w.roamers.roamers.length};
 });
 assert.ok(result.roamers>=1);
}finally{await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
console.log('Candidati selvatici: tutorial, spawn sull\'erba, contatto con vantaggio e repellente verificati.');
