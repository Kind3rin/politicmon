import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const browser=await chromium.launch();
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5179'}/scripts/perf-harness.html`,{waitUntil:'networkidle'});
 const result=await page.evaluate(async()=> {
  const {Screen}=await import('/src/engine/screen.ts');
  const {SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState,loadGame}=await import('/src/game/state.ts');
  const {createMonster}=await import('/src/game/monster.ts');
  const {BossBriefingScene}=await import('/src/scenes/BossBriefingScene.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts');
  const {BOSS_TRAINER_IDS}=await import('/src/game/battle/BattleScene.ts');
  const {BattleIntelScene}=await import('/src/scenes/BattleIntelScene.ts');
  const {makeCombatant}=await import('/src/game/battle/sim.ts');
  const {buildTrainerTeam}=await import('/src/game/world/battleCoordinator.ts');
  const {TRAINERS}=await import('/src/data/trainers.ts');
  const {BOSS_ART_IDS,trainerStyle}=await import('/src/game/battle/trainerStyle.ts');
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');
  const {audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  const {mp}=await import('/src/net/mp.ts');
  const entries=Object.fromEntries(BOSS_ART_IDS.map(id=>[`boss:${id}`,`ui/boss/${id}.png`]));
  const partyIds=['salistrobo','quasimagiani','crosettank','campocorno','referendodo','futurorso'];
  for(const id of partyIds)entries[`mon:${id}`]=`monsters/${id}.png`;
  preloadSprites(entries);await waitForSprites(Object.keys(entries),5000);
  const stack=new SceneStack();let pressed='';
  const input={wasPressed:b=>b===pressed,isDown:()=>false,tapInRect:()=>false,consumeTap:()=>null};
  const press=(scene,key)=>{pressed=key;scene.update(.1);pressed='';};
  const screen=new Screen(document.createElement('canvas')),issues=[],shots={};let name='',boxes=[],checked=0;
  const text=screen.text.bind(screen);
  screen.text=(value,x,y,color,scale=1)=> {
    const m=screen.ctx.getTransform(),base=screen.ctx.canvas.width/240;
    const b={value,x:(m.a*x+m.e)/base,y:(m.d*y+m.f)/base,w:Math.max(0,value.length*6-1)*scale*m.a/base,h:7*scale*m.d/base};
    if(b.x<0||b.y<0||b.x+b.w>240||b.y+b.h>180)issues.push({name,kind:'bounds',...b});
    for(const old of boxes)if(b.w&&old.w&&b.x<old.x+old.w&&b.x+b.w>old.x&&b.y<old.y+old.h&&b.y+b.h>old.y)issues.push({name,kind:'overlap',value,other:old.value});
    boxes.push(b);text(value,x,y,color,scale);
  };
  const draw=(key,scene,capture=false)=>{name=key;boxes=[];scene.draw(screen);checked++;if(capture)shots[key]=screen.ctx.canvas.toDataURL('image/png');};
  for(const id of BOSS_ART_IDS)for(const hard of [false,true])for(let size=1;size<=6;size++) {
    const state=newGameState();state.hardMode=hard;state.party=partyIds.slice(0,size).map(s=>createMonster(s,55));
    state.party[0].status='indagato';if(size>1)state.party[1].hp=0;state.party[size-1].heldItem='caffettiera';
    const team=buildTrainerTeam(state,TRAINERS[id],{fallbackTeam:()=>[],bossTrainerIds:BOSS_TRAINER_IDS});
    const brief=new BossBriefingScene(stack,input,state,TRAINERS[id],team,()=>{});
    for(let scroll=0;scroll<=Math.max(0,brief.notes().length-3);scroll++) {brief.scroll=scroll;draw(`${id}-${hard}-${size}-${scroll}`,brief,!hard&&size===6&&scroll===0);}
    brief.page=1;for(let i=0;i<size;i++){brief.index=i;draw(`${id}-${hard}-leader-${size}-${i}`,brief,!hard&&id==='boss'&&size===6&&i===5);}
    const intel=new BattleIntelScene(stack,input,makeCombatant(state.party[0]),makeCombatant(team[0]),0,{sondaggi:80},()=>{},[],[`STILE: ${trainerStyle(id).label}`,...trainerStyle(id).hints]);
    intel.page=1;for(let scroll=0;scroll<=Math.max(0,intel.lines().length-9);scroll++){intel.scroll=scroll;draw(`${id}-${hard}-${size}-dossier-${scroll}`,intel,!hard&&size===6&&id==='boss'&&scroll===0);}
  }
  // Exercise the real WorldScene transition; a cancelled briefing must not
  // instantiate a battle or advance rewards, promises, seen species or PP.
  const state=newGameState();state.flags['intro-done']=true;state.party=[createMonster('giorgetta',22),createMonster('renzino',22),createMonster('ellyna',22)];
  const world=new WorldScene(stack,input,state);stack.replace(world);
  let ended=0;const before=JSON.stringify(state);
  world.startTrainerBattle(TRAINERS.boss,()=>ended++);
  for(let i=0;i<40&&stack.top===world;i++)world.update(.1);
  if(stack.top?.constructor.name!=='BossBriefingScene')throw Error(`World does not open briefing: ${stack.top?.constructor.name}; flash=${world.encounterFlash}; pending=${Boolean(world.pendingBattle)}; message=${world.msg.isOpen}`);
  const cancelled=stack.top;press(cancelled,'b');
  if(stack.top!==world||JSON.stringify(state)!==before||ended||mp.duelBusy)throw Error('Cancel changed state or left multiplayer busy');
  for(const id of ['giudice1','giudice2','giudice3','garante']){
    world.startTrainerBattle(TRAINERS[id],()=>ended++);
    for(let i=0;i<40&&stack.top===world;i++)world.update(.1);
    if(stack.top?.constructor.name!=='BossBriefingScene')throw Error('Missing court briefing '+id);
    press(stack.top,'b');
    if(stack.top!==world||JSON.stringify(state)!==before||ended||mp.duelBusy)throw Error('Court cancel changed state '+id);
  }
  world.startTrainerBattle(TRAINERS.boss,()=>ended++);
  for(let i=0;i<40&&stack.top===world;i++)world.update(.1);
  const brief=stack.top;
  state.party[1].hp=0;press(brief,'start');press(brief,'down');press(brief,'a');
  if(brief.page!==1||state.party[0].speciesId!=='giorgetta')throw Error('KO leader accepted');
  press(brief,'down');press(brief,'a');
  if(state.party[0].speciesId!=='ellyna'||loadGame().party[0].speciesId!=='ellyna')throw Error('Leader not persisted');
  const pp=state.party[0].moves.map(s=>s.pp);press(brief,'a');
  if(stack.top?.constructor.name!=='BattleScene'||stack.top.player.mon.uid!==state.party[0].uid||ended)throw Error('Leader not used by real battle');
  if(JSON.stringify(pp)!==JSON.stringify(state.party[0].moves.map(s=>s.pp)))throw Error('Starting spent PP');
  const battle=stack.top;press(brief,'a');if(stack.top!==battle)throw Error('Double start');
  return {issues,shots,checked};
 });
 mkdirSync('artifacts/screens/boss-briefing',{recursive:true});
 writeFileSync('artifacts/premium-next/boss-layout.json',JSON.stringify(result.issues,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(result.issues,[]);
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/boss-briefing/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS: ${result.checked} boss layouts; World cancel, KO rejection, persisted leader, actual BattleScene start, no PP/reward consumption.`);
}finally{await browser.close();}
