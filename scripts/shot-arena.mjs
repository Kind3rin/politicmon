import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const ids=JSON.parse(readFileSync('scripts/higgsfield-arena.json','utf8')).outputs.map(o=>o.path.split('/').at(-1).replace('.png',''));
const browser=await (process.env.ARENA_BROWSER==='webkit'?webkit:chromium).launch();
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5188'}/scripts/perf-harness.html`);
 const r=await page.evaluate(async ids=>{
  const {Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState,serializeGameState,loadGame,exportSaveCode,importSaveCode}=await import('/src/game/state.ts');
  const {createMonster}=await import('/src/game/monster.ts');
  const {CasinoScene}=await import('/src/scenes/CasinoScene.ts'),{TournamentScene}=await import('/src/scenes/TournamentScene.ts'),{PauseScene}=await import('/src/scenes/PauseScene.ts');
  const {COPPA_RULES,initTournament,playerOpponent}=await import('/src/game/tournament.ts');
  const {localDateKey}=await import('/src/game/daily.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts');
  const {preloadSprites,waitForSprites,spriteRegistryStats}=await import('/src/engine/assets.ts'),{audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  preloadSprites(Object.fromEntries(ids.map(id=>[`arena:${id}`,`ui/arena/${id}.png`])));await waitForSprites(ids.map(id=>`arena:${id}`));
  const {MONSTERS_WITH_PNG}=await import('/src/art/monsters.ts');
  const monKeys=[...MONSTERS_WITH_PNG].flatMap(id=>[[`mon:${id}`,`monsters/${id}.png`],[`mon:frames:${id}`,`monsters/animated/${id}.png`]]);
  const extras=[['epilogue:sash','ui/epilogue/sash.png']];preloadSprites(Object.fromEntries([...monKeys,...extras]));await waitForSprites([...monKeys,...extras].map(([key])=>key));
  const native=document.createElement('canvas');native.width=240;native.height=180;const nativeCtx=native.getContext('2d');nativeCtx.imageSmoothingEnabled=false;
  const canvas=document.createElement('canvas'),screen=new Screen(canvas),input=new Input();let key='',name='',views=0;input.wasPressed=b=>key===b;
  const press=(scene,b)=>{key=b;scene.update(.01);key='';},check=(ok,msg)=>{if(!ok)throw Error(msg);};
  const shots={},overflow=[],original=screen.text.bind(screen);
  screen.text=(s,x,y,c,scale=1)=>{if(s&&(x<0||y<0||x+(s.length*6-1)*scale>240||y+7*scale>180))overflow.push({name,s,x,y});original(s,x,y,c,scale);};
  const capture=(id,scene,keep=true)=>{name=id;scene.draw(screen);views++;if(keep){nativeCtx.drawImage(canvas,0,0,240,180);shots[id]=native.toDataURL('image/png');}};
  const funded=()=>{const s=newGameState();s.chips=1000;s.money=10000;s.flags['intro-done']=true;return s;};
  for(const reduced of [false,true]){
   const s=funded();s.reduceEffects=reduced;const scene=new CasinoScene(new SceneStack(),input,s),before=serializeGameState(s);capture(`casino-${reduced}`,scene);
   const rng=Math.random;let rolls=0;Math.random=()=>{rolls++;return .99;};
   try{
    press(scene,'a');for(let i=0;i<scene.pages.length;i++){capture(`slot-${reduced}-review-${i}`,scene);if(i<scene.pages.length-1)press(scene,'a');}
    press(scene,'b');check(serializeGameState(s)===before&&rolls===0,'slot review cancel consumed');press(scene,'a');while(scene.mode==='review')press(scene,'a');
    check(rolls===3&&s.chips===1145,'slot exact cost and jackpot');check(loadGame().chips===1145,'slot not saved before animation');
    if(!reduced){capture('slot-spin',scene);press(scene,'b');}
    check(scene.mode==='result','animation did not finish');capture(`slot-${reduced}-result`,scene);press(scene,'b');check(scene.spins===1&&scene.slotNet===145&&rolls===3,'slot skipped animation charged twice');
   }finally{Math.random=rng;}
  }
  for(const mode of ['change','prizes','club']){
   const s=funded(),scene=new CasinoScene(new SceneStack(),input,s);scene.mode=mode;const menu=scene.selectedMenu();
   for(let index=0;index<menu.items.length-1;index++){
    menu.index=index;capture(`${mode}-${index}`,scene);const before=serializeGameState(s),random=Math.random;let rolls=0;Math.random=()=>{rolls++;return .1;};
    try{press(scene,'a');check(scene.mode==='review','funded action not review');for(let i=0;i<scene.pages.length;i++){capture(`${mode}-${index}-page-${i}`,scene);if(i<scene.pages.length-1)press(scene,'a');}press(scene,'b');check(serializeGameState(s)===before&&rolls===0,'cancelled action changed save');}
    finally{Math.random=random;}
   }
  }
  for(let table=0;table<3;table++)for(let outcome=0;outcome<3;outcome++){
   const s=funded(),scene=new CasinoScene(new SceneStack(),input,s);scene.mode='club';scene.clubMenu.index=table;const rng=Math.random;Math.random=()=>outcome/3+.01;
   try{press(scene,'a');while(scene.mode==='review')press(scene,'a');capture(`club-${table}-outcome-${outcome}`,scene);check(s.chips===985,'club cost wrong');const before=serializeGameState(s);press(scene,'b');scene.clubMenu.index=(table+1)%3;press(scene,'a');capture(`club-${table}-daily-limit`,scene,false);check(serializeGameState(s)===before&&scene.mode==='result','daily club repeat allowed');}finally{Math.random=rng;}
  }
  const party=()=>['ellyna','salisound','salistrobo','draghimon','mattarellux','salvinator'].map((id,i)=>createMonster(id,20+i*5));
  const base=initTournament('2026-10-02'),ghosts=base.alive.filter(e=>!e.isPlayer);
  for(const rule of COPPA_RULES)for(const entry of ghosts){
   const s=funded();s.party=party();const t={...base,alive:[base.alive[0],entry,...ghosts.filter(e=>e!==entry)]},stack=new SceneStack();let next=0,aborts=0;
   const scene=new TournamentScene(stack,input,s,t,()=>next++,()=>aborts++,rule);stack.push(scene);capture(`coppa-${rule.id}-${entry.ghost.id}-bracket`,scene,rule.id==='level50');
   press(scene,'right');const before=serializeGameState(s);
   for(let mon=0;mon<3;mon++){
    scene.index=mon;
    for(const detail of [0,1]){scene.detail=detail;scene.dossierPage=0;for(let p=0;p<scene.dossierPages().length;p++){scene.dossierPage=p;capture(`coppa-${rule.id}-${entry.ghost.id}-${mon}-${detail}-${p}`,scene,rule.id==='level50'&&mon===0);}}
   }
   // Leave a long dossier on its final page, then change tab and opponent view.
   press(scene,'right');capture(`coppa-${rule.id}-leaders`,scene,entry===ghosts[0]);press(scene,'left');capture(`coppa-${rule.id}-reset-page`,scene,false);check(scene.dossierPage===0,'dossier page survived tab change');
   check(serializeGameState(s)===before,'dossier consultation mutated squad');press(scene,'b');press(scene,'b');capture(`coppa-${rule.id}-abort`,scene,entry===ghosts[0]);press(scene,'b');check(next===0&&aborts===0,'abort cancelled still closed');
   press(scene,'a');while(!scene.closed){capture(`coppa-${rule.id}-ready-${scene.page}`,scene,entry===ghosts[0]);press(scene,'a');}press(scene,'a');check(next===1&&aborts===0,'start callback repeated');
  }
  for(const rule of COPPA_RULES){
   const s=funded();s.party=party();const scene=new TournamentScene(new SceneStack(),input,s,base,()=>{},()=>{},rule);scene.tab=2;scene.index=1;
   const leader=s.party[1].uid;press(scene,'a');check(s.party[0].uid===leader&&loadGame().party[0].uid===leader,'leader not persisted');
  }
  {const s=funded();s.party=party();const stack=new SceneStack();let aborts=0;const scene=new TournamentScene(stack,input,s,base,()=>{},()=>aborts++);stack.push(scene);const before=serializeGameState(s);press(scene,'b');while(!scene.closed)press(scene,'a');press(scene,'a');check(aborts===1&&serializeGameState(s)===before,'abort callback or funds wrong');}
  {const s=funded();s.party=[];const scene=new TournamentScene(new SceneStack(),input,s,base,()=>{},()=>{},COPPA_RULES[0]);scene.tab=2;capture('coppa-no-eligible-party',scene);}
  // Actual WorldScene -> TournamentScene -> BattleScene callbacks; outcomes are forced,
  // exercising persistence and the round flow, not claiming a played balance test.
  for(const rule of COPPA_RULES){
   const s=funded();s.party=party();s.party[0].hp=7;s.party[0].moves[0].pp=1;s.boostExpBattles=3;s.boostMoneyBattles=3;s.lastDailyQuestDate=localDateKey();s.dailyQuestsDone=['win2:done'];s.hardMode=true;s.flags['garante-beaten']=true;s.pos={mapId:'offshore',x:18,y:11,facing:'up'};
   const originalParty=structuredClone(s.party),stack=new SceneStack(),world=new WorldScene(stack,input,s);stack.push(world);world.coppa=initTournament('2026-10-02');world.coppaRuleActive=rule;world.runTournamentRound();
   for(let round=0;round<3;round++){
    let ticks=0;
    while(stack.top?.constructor.name!=='BattleScene'&&ticks++<150)press(stack.top,'a');check(stack.top?.constructor.name==='BattleScene',`real coppa battle missing ${rule.id}`);
    const battle=stack.top;s.party[0].hp=0;s.party[0].moves[0].pp=0;
    check(JSON.stringify(JSON.parse(serializeGameState(s)).party)===JSON.stringify(originalParty),'live battle serialized temporary squad');
    const restored=importSaveCode(exportSaveCode(s));check(JSON.stringify(restored.party)===JSON.stringify(originalParty),'live export lost campaign squad');
    if(rule.id==='level50')check(battle.foeTeam.every(m=>m.level===50),'real level50 foe not 50');
    battle.endBattle('win');battle.queue.at(-1).run();
    check(JSON.stringify(s.party)===JSON.stringify(originalParty),'round failed to restore campaign party');
    check(s.boostExpBattles===3&&s.boostMoneyBattles===3,'coppa burned unapplied boosters');
    while(round<2&&stack.top?.constructor.name!=='TournamentScene'&&ticks++<250)press(stack.top,'a');
    if(round<2){check(stack.top?.constructor.name==='TournamentScene','next bracket missing');while(stack.top?.constructor.name==='TournamentScene')press(stack.top,'a');}
   }
   check(s.coppaWins===1&&s.flags['coppa-vinta']&&s.money===13000,`champion award flow wrong ${rule.id}: wins=${s.coppaWins} money=${s.money} flag=${s.flags['coppa-vinta']}`);
  }
  // Paid admission uses the real banditore dialogue and yes/no prompt.
  {const s=funded();s.party=party();s.flags['garante-beaten']=true;s.flags['intro-done']=true;s.flags['dex-received']=true;s.pos={mapId:'offshore',x:18,y:11,facing:'up'};const stack=new SceneStack(),world=new WorldScene(stack,input,s);stack.push(world);world.openTournament();let ticks=0;while(stack.top?.constructor.name!=='TournamentScene'&&ticks++<150)press(stack.top,'a');check(stack.top?.constructor.name==='TournamentScene'&&s.money===8500,'real admission fee missing');check(loadGame().money===8500,'admission not saved');}
  {const s=funded();s.party=party();s.flags['garante-beaten']=true;s.flags['dex-received']=true;s.pos={mapId:'offshore',x:18,y:11,facing:'up'};const original=JSON.stringify(s.party),pos=JSON.stringify(s.pos),stack=new SceneStack(),world=new WorldScene(stack,input,s);stack.push(world);world.coppa=initTournament('2026-10-02');world.coppaRuleActive=COPPA_RULES[1];world.runTournamentRound();let ticks=0;while(stack.top?.constructor.name!=='BattleScene'&&ticks++<150)press(stack.top,'a');const battle=stack.top;check(battle?.constructor.name==='BattleScene','loss fixture missing battle');s.party[0].hp=0;battle.endBattle('loss');battle.queue.at(-1).run();check(s.money===10000&&JSON.stringify(s.pos)===pos&&JSON.stringify(s.party)===original&&!world.coppa,'coppa loss fined/warped/leaked party');check(loadGame().money===10000&&JSON.stringify(loadGame().party)===original,'loss not persisted');}
  {const s=funded();s.monumentLevel=3;s.coppaWins=12;s.flags['cosmetic-fascia-governo']=true;s.flags['atto3Complete']=true;s.flags['atto3-ending:government_cohesive']=true;const scene=new PauseScene(new SceneStack(),input,s);scene.showCard=true;press(scene,'start');capture('coppa-title-monument-card',scene);}
  {const s=funded();s.flags['cosmetic-fascia-governo']=true;s.flags['cosmetic-campanella-crisi']=true;const scene=new PauseScene(new SceneStack(),input,s);scene.showCard=true;key='start';scene.update(.01);capture('card-same-frame-start',scene);check(scene.cardAwards===true,'draw consumed START twice');scene.draw(screen);check(scene.cardAwards===true,'repeated draw toggled card');key='right';scene.update(.01);const selected=scene.souvenirIndex;scene.draw(screen);scene.draw(screen);check(scene.souvenirIndex===selected&&selected===1,'draw consumed souvenir direction twice');key='';}
  check(spriteRegistryStats().missing===0,'missing arena sprites');return {shots,overflow,views};
 },ids);
 assert.deepEqual(errors,[]);assert.deepEqual(r.overflow,[]);
 mkdirSync('artifacts/screens/arena',{recursive:true});for(const [name,data]of Object.entries(r.shots))writeFileSync(`artifacts/screens/arena/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS ${r.views} native views: all 7 ghosts x 5 rules, full dossiers, previews/cancel/pay, saved slot before animation, daily club cap, leader save, actual three-round World/Battle save protection (forced outcomes), no text overflow.`);
}finally{await browser.close();}
