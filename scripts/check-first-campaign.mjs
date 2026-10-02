// Regression fixtures, distinct from the campaign played from NEW GAME.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const engine=process.env.CAMPAIGN_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5188'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async()=>{
  const {Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState,loadGame,saveGame}=await import('/src/game/state.ts'),{createMonster,expForLevel}=await import('/src/game/monster.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts'),{BattleScene}=await import('/src/game/battle/BattleScene.ts');
  const {TRAINERS}=await import('/src/data/trainers.ts'),{MAPS}=await import('/src/data/maps.ts');
  const {audio}=await import('/src/engine/audio.ts'),{mp}=await import('/src/net/mp.ts');audio.enabled=false;mp.setEnabled(false);
  const {seededRng}=await import('/src/game/tournament.ts');Math.random=seededRng(20261002);
  const {preloadSprites,waitForSprites,spriteStatus}=await import('/src/engine/assets.ts');
  const art=Object.fromEntries(['stagista','funzionario','diplomatico','oligarca'].map(id=>[`boss:${id}`,`ui/boss/${id}.png`]));art['ui:teach']='ui/teach.png';preloadSprites(art);await waitForSprites(Object.keys(art));
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);
  const screen=new Screen(canvas),input=new Input(),stack=new SceneStack(),shots={},captures=[],bounds=[];
  const codes={a:'KeyZ',b:'KeyX',start:'KeyP',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  function tick(button){if(button)document.dispatchEvent(new KeyboardEvent('keydown',{code:codes[button],bubbles:true}));stack.update(.1);input.endFrame();if(button)document.dispatchEvent(new KeyboardEvent('keyup',{code:codes[button],bubbles:true}));}
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  let checking=false,name='';const original=screen.text.bind(screen);
  screen.text=(value,x,y,color,scale=1)=>{if(checking&&value){const m=screen.ctx.getTransform(),base=canvas.width/240,bx=(m.a*x+m.e)/base,by=(m.d*y+m.f)/base,w=(value.length*6-1)*scale*m.a/base;if(bx<0||by<0||bx+w>240||by+7*scale*m.d/base>180)bounds.push({name,value,bx,by,w});}original(value,x,y,color,scale);};
  function shot(id,scene=stack.top){name=id;checking=true;scene.draw(screen);checking=false;const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(canvas,0,0,240,180);shots[id]=c.toDataURL();}
  function stateAt(mapId,x,y){const s=newGameState();s.flags['intro-done']=true;s.party=[createMonster('ellyna',10)];s.pos={mapId,x,y,facing:'up'};return s;}
  let guarded=0;
  for(const map of Object.values(MAPS))for(const warp of map.warps){
   const y=warp.y+1;if(y>=map.tiles.length)continue;
   const s=stateAt(map.id,warp.x,y),w=new WorldScene(stack,input,s);
   if(w.isBlocked(warp.x,y))continue;
   const spot=w.freeAdjacentSpot();
   if(spot)check(!map.warps.some(exit=>exit.x===spot.x&&(exit.y===spot.y||(w.isOutdoorDoorWarp(exit)&&exit.y+1===spot.y))),`Challenger blocked ${map.id} warp`);
   guarded++;
  }
  for(const [map,x,y,forbidden]of [['mediopoli',7,11,[7,10]],['mediopoli',7,12,[7,11]],['borgo',4,7,[4,6]]]){
   const w=new WorldScene(stack,input,stateAt(map,x,y)),spot=w.freeAdjacentSpot();check(!spot||spot.x!==forbidden[0]||spot.y!==forbidden[1],`Known doorway/pickup obstruction ${map}`);
  }
  for(const hard of [false,true]){
   const s=stateAt('gymtv',5,6);s.hardMode=hard;const world=new WorldScene(stack,input,s);stack.replace(world);const before=JSON.stringify(s);
   world.startTrainerBattle(TRAINERS.stagista);for(let n=0;stack.top===world&&n<50;n++)tick();
   const brief=stack.top;check(brief.constructor.name==='BossBriefingScene','Mara briefing absent');
   check(JSON.stringify(brief.team.map(m=>m.level))===JSON.stringify(hard?[11,12]:[8,9]),'Mara levels disagree with difficulty');
   check(spriteStatus('boss:stagista')==='ready','Mara image not decoded');shot(`mara-${hard?'hard':'normal'}`);
   tick('b');check(stack.top===world&&JSON.stringify(s)===before&&!mp.duelBusy,'Cancelling rehearsal changed campaign');
  }
  for(const hard of [false,true]){
   const s=stateAt('gymue',5,6);s.hardMode=hard;s.badges=['auditel'];const world=new WorldScene(stack,input,s);stack.replace(world);const before=JSON.stringify(s);
   world.startTrainerBattle(TRAINERS.funzionario);for(let n=0;stack.top===world&&n<50;n++)tick();
   const brief=stack.top;check(brief.constructor.name==='BossBriefingScene','Hans briefing absent');
   check(JSON.stringify(brief.team.map(m=>m.level))===JSON.stringify(hard?[18,18]:[15,15]),'Hans levels disagree with difficulty');
   check(spriteStatus('boss:funzionario')==='ready','Hans image not decoded');shot(`hans-${hard?'hard':'normal'}`);
   tick('b');check(stack.top===world&&JSON.stringify(s)===before&&!mp.duelBusy,'Cancelling examination changed campaign');
  }
  for(const id of ['diplomatico','oligarca'])for(const hard of [false,true]){
   const s=stateAt('gymglobal',5,6);s.hardMode=hard;s.badges=['auditel','spread'];const world=new WorldScene(stack,input,s);stack.replace(world);const before=JSON.stringify(s);
   world.startTrainerBattle(TRAINERS[id]);for(let n=0;stack.top===world&&n<50;n++)tick();
   const brief=stack.top,level=id==='diplomatico'?18:19;check(brief.constructor.name==='BossBriefingScene','Global Tower rehearsal absent');
   check(brief.team.length===1&&brief.team[0].level===level+(hard?3:0),'Global Tower rehearsal levels disagree with difficulty');
   check(spriteStatus(`boss:${id}`)==='ready','Global Tower art not decoded');shot(`${id}-${hard?'hard':'normal'}`);
   tick('b');check(stack.top===world&&JSON.stringify(s)===before&&!mp.duelBusy,'Cancelling Global Tower rehearsal changed campaign');
  }
  {
   const s=stateAt('bar-euro',5,5);s.party.push(createMonster('salvinott',8));s.party[0].hp=0;s.party[0].status='scandalo';s.party[1].hp=1;s.party[1].status='indagato';
   s.party.forEach(m=>m.moves.forEach(slot=>slot.pp=0));s.money=533;s.sondaggi=62;
   const world=new WorldScene(stack,input,s);stack.replace(world);const before={money:s.money,sondaggi:s.sondaggi,morale:JSON.stringify(s.morale)},messages=[];
   const show=world.msg.show.bind(world.msg);world.msg.show=(lines,...rest)=>{messages.push(...lines);show(lines,...rest);};
   const healer=world.visibleNpcs().find(n=>n.healer);
   for(let visit=0;visit<2;visit++){
    world.interactNpc(healer);
    for(let n=0;(world.msg.isOpen||world.healFx>0)&&n<2000;n++)tick('a');
    check(!world.msg.isOpen&&world.healFx===0,'Healer did not return control');
    check(s.money===before.money&&s.sondaggi===before.sondaggi&&JSON.stringify(s.morale)===before.morale,'Free healing changed funds, polls or morale');
   }
   const {statsOf}=await import('/src/game/monster.ts'),{MOVES}=await import('/src/data/moves.ts');
   check(s.party.every(m=>m.hp===statsOf(m).hp&&m.status===null&&m.moves.every(slot=>slot.pp===MOVES[slot.id].pp)),'Bar did not restore KO/status/PV/PP');
   check(messages.filter(line=>line.startsWith('RIVINCITE:')).length===1,'Rematch lesson repeated during routine healing');
  }
  for(const size of [3,6]){
   Math.random=seededRng(20261002+size);const s=newGameState();s.reduceEffects=true;
   const lead=createMonster('ellyna',5),bench=createMonster('salvinott',6),ko=createMonster('grillix',7);
   lead.exp=expForLevel(6)-1;bench.exp=expForLevel(7)-1;ko.hp=0;
   s.party=[lead,bench,ko,...Array.from({length:size-3},()=>createMonster('renzino',5))];s.bag.divisa=1;s.bag.schedona=10;s.boostExpBattles=1;
   const before=s.party.map(m=>({uid:m.uid,exp:m.exp,hp:m.hp})),foe=createMonster('salvinott',2),foeExp=foe.exp;
   let outcome=null;const battle=new BattleScene(stack,input,{state:s,foeTeam:[foe],onEnd:r=>{outcome=r;saveGame(s);stack.pop();}});stack.replace(battle);
   const learned=new Set();
   for(let n=0;!outcome&&n<4000;n++){
    const top=stack.top;
    if(top.constructor.name==='TeachScene'){
     if(!learned.has(top)){check(top.mon.uid===bench.uid,'Bench lesson taught the leader');learned.add(top);tick('a');shot(`bench-${size}-confirm`);}
     else tick('a');
    }else if(top.constructor.name==='BagScene'){
     const index=top.view.ids.indexOf('schedona');check(index>=0,'Capture fixture exhausted ballots');tick(top.view.menu.index===index?'a':'down');
    }else if(top===battle&&battle.mode==='menu'){
     const i=battle.mainMenu.index;tick(i===1?'a':i%2===0?'right':'up');
    }else tick('a');
   }
   check(outcome==='caught','Capture was not resolved by real battle input');
   const gained=lead.exp-before[0].exp;check(gained>0,'Recruitment gave no EXP');
   check(bench.exp-before[1].exp===Math.floor(gained/2),'Bench share differs from announced amount');
   check(ko.exp===before[2].exp,'KO candidate gained shared EXP');check(foe.exp===foeExp,'New recruit rewarded its own capture');
   check(bench.moves.some(m=>m.id==='citofonata')&&!lead.moves.some(m=>m.id==='citofonata'),'Bench missed or misdirected its new move');
   check(s.boostExpBattles===0,'Recruitment did not consume its applied MANIFESTI charge');
   check(size===6?s.boxed[0]?.uid===foe.uid:s.party.at(-1)?.uid===foe.uid,'Recruit went to wrong destination');
   const saved=loadGame();check(saved.party[1].moves.some(m=>m.id==='citofonata')&&saved.boostExpBattles===0&&saved.party[0].exp===lead.exp,'Growth and move were not persisted');
   captures.push({size,gained,benchGain:bench.exp-before[1].exp,learned:[...learned].map(t=>({id:t.mon.speciesId,move:t.moveId})),destination:size===6?'box':'party'});
  }
  return {guarded,captures,bounds,shots};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(result.bounds,[]);
 mkdirSync('artifacts/first-campaign',{recursive:true});mkdirSync('artifacts/screens/first-campaign',{recursive:true});
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/first-campaign/${engine.name()}-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 delete result.shots;writeFileSync(`artifacts/first-campaign/${engine.name()}.json`,JSON.stringify(result,null,2));
 console.log(`PASS ${engine.name()}: ${result.guarded} warp approaches; normal/hard Mara, Hans and Global Tower cancellation; bar restores PV/PP/status/KO with unchanged funds/polls/morale and one rematch lesson; natural capture with party 3/6, bench lesson, KO/new recruit exclusion, MANIFESTI and persistence.`,JSON.stringify(result.captures));
}finally{await browser.close();}
