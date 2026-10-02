import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const browser=await (process.env.DESK_BROWSER==='webkit'?webkit:chromium).launch();
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5188'}/scripts/perf-harness.html`);
 const r=await page.evaluate(async()=>{
  const {Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState,loadGame,importSaveCode,exportSaveCode}=await import('/src/game/state.ts');
  const {STARTERS}=await import('/src/data/species.ts'),{createMonster}=await import('/src/game/monster.ts');
  const {starterDossier,welcomeGuide}=await import('/src/game/onboarding.ts');
  const {StarterPreviewScene}=await import('/src/scenes/StarterPreviewScene.ts'),{FieldGuideScene}=await import('/src/scenes/FieldGuideScene.ts');
  const {PauseScene}=await import('/src/scenes/PauseScene.ts'),{TransportScene}=await import('/src/scenes/TransportScene.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts');
  const {TRANSPORT_DESTINATIONS}=await import('/src/game/world/transport.ts');
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts'),{audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  const {MONSTERS_WITH_PNG}=await import('/src/art/monsters.ts');
  const images=[...['starter','pause','transport','welcome'].map(id=>[`desk:${id}`,`ui/desk/${id}.png`]),...[...MONSTERS_WITH_PNG].map(id=>[`mon:frames:${id}`,`monsters/animated/${id}.png`])];preloadSprites(Object.fromEntries(images));await waitForSprites(images.map(([k])=>k));
  const canvas=document.createElement('canvas'),screen=new Screen(canvas),input=new Input(),native=document.createElement('canvas');native.width=240;native.height=180;const ctx=native.getContext('2d');ctx.imageSmoothingEnabled=false;
  let key='',name='',views=0;input.wasPressed=b=>key===b;const press=(scene,b)=>{key=b;scene.update(.25);key='';},check=(ok,msg)=>{if(!ok)throw Error(msg);};
  const shots={},overflow=[],old=screen.text.bind(screen);screen.text=(s,x,y,c,scale=1)=>{if(s&&(x<0||y<0||x+(s.length*6-1)*scale>240||y+7*scale>180))overflow.push({name,s,x,y});old(s,x,y,c,scale);};
  const capture=(id,scene,keep=true)=>{name=id;scene.draw(screen);views++;if(keep){ctx.drawImage(canvas,0,0,240,180);shots[id]=native.toDataURL('image/png');}};
  for(const reduced of [false,true])for(const id of STARTERS){
   const stack=new SceneStack();let done=0;const scene=new StarterPreviewScene(stack,input,id,()=>done++,reduced);stack.push(scene);
   for(let tab=0;tab<4;tab++){scene.tab=tab;scene.page=0;let all='';for(let p=0;p<scene.pages().length;p++){scene.page=p;all+=scene.pages()[p].join(' ');capture(`starter-${id}-${reduced}-${tab}-${p}`,scene,!reduced);}check(starterDossier(id,tab).every(p=>p.replace(/\s+/g,' ').trim().split(' ').every(word=>all.includes(word))),'starter text missing');}
   press(scene,'a');capture(`starter-${id}-${reduced}-confirm`,scene);press(scene,'b');check(done===0&&stack.top===scene,'confirmation cancel committed starter');press(scene,'a');while(!scene.closed){capture(`starter-${id}-${reduced}-confirm-${scene.page}`,scene);press(scene,'a');}press(scene,'a');check(done===1,'starter callback repeated');
  }
  {const stack=new SceneStack();let done=0;const scene=new StarterPreviewScene(stack,input,'ellyna',()=>done++);stack.push(scene);press(scene,'b');press(scene,'a');check(!stack.top&&done===0,'starter B selected candidate');}
  for(const phase of ['new','starter','dex','champion']){
   const s=newGameState();if(phase!=='new')s.flags['starter-chosen']=true;if(phase==='dex'||phase==='champion'){s.flags['rival1-beaten']=true;s.flags['dex-received']=true;}if(phase==='champion'){s.flags['boss-beaten']=true;s.flags['garante-beaten']=true;s.badges=['auditel','spread','dazio'];}
   const before=JSON.stringify(s),scene=new FieldGuideScene(new SceneStack(),input,'GUIDA CAMPAGNA',welcomeGuide(s));for(let p=0;p<scene.pages.length;p++){scene.page=p;capture(`welcome-${phase}-${p}`,scene);}check(JSON.stringify(s)===before,'guide mutated state');
  }
  {const s=newGameState(),stack=new SceneStack(),world=new WorldScene(stack,input,s);stack.push(world);check(stack.top.constructor.name==='FieldGuideScene'&&!s.flags['intro-done'],'welcome lifecycle missing');const guide=stack.top;press(guide,'b');check(!s.flags['intro-done'],'first page back saved');press(guide,'start');check(stack.top===world&&s.flags['intro-done']&&loadGame().flags['intro-done'],'welcome not persisted');}
  for(const advanced of [false,true])for(const touch of [false,true]){
   document.body.classList.toggle('touch',touch);
   const s=newGameState();s.flags['intro-done']=true;s.party=[createMonster('ellyna',20)];
   if(advanced){s.flags['dex-received']=true;s.flags['coalition-menu-unlocked']=true;s.badges=['auditel','spread','dazio'];for(const id of ['monopattino','ruspa','auto','traghetto'])s.flags[`veh-${id}`]=true;}
   const scene=new PauseScene(new SceneStack(),input,s);
   for(const kind of ['main','opzioni','online','extra']){
    scene.sub=kind==='main'?null:kind==='opzioni'?scene.buildOptionsMenu():kind==='online'?scene.buildOnlineMenu():scene.buildExtraMenu();const menu=scene.sub?.menu??scene.menu;
    const before=JSON.stringify(s);for(let i=0;i<menu.items.length;i++){menu.index=i;scene.notePage=0;for(let p=0;p<scene.helpPages().length;p++){scene.notePage=p;capture(`pause-${advanced}-${touch}-${kind}-${i}-${p}`,scene,advanced&&touch&&p===0);}}check(JSON.stringify(s)===before,'pause draw mutated state');
   }
   scene.sub=null;scene.menu.index=scene.entries.indexOf('SALVA');press(scene,'a');check(loadGame().party[0].uid===s.party[0].uid,'manual save not stored');
  }
  document.body.classList.remove('touch');
  for(const badges of [[],['auditel'],['auditel','spread']])for(const from of TRANSPORT_DESTINATIONS.map(d=>d.mapId)){
   const s=newGameState();s.flags['dex-received']=true;s.badges=badges;s.party=[createMonster('ellyna',10)];s.party[0].hp=3;s.pos={mapId:from,x:1,y:1,facing:'down'};
   const stack=new SceneStack();let traveled=0;const scene=new TransportScene(stack,input,s,from,()=>traveled++);stack.push(scene);
   for(let i=0;i<4;i++){scene.menu.index=i;capture(`travel-${badges.length}-${from}-${i}`,scene,badges.length===2&&from==='borgo');const before=JSON.stringify(s);press(scene,'a');for(let p=0;p<scene.pages().length;p++){scene.page=p;capture(`travel-${badges.length}-${from}-${i}-review-${p}`,scene,false);}press(scene,'b');check(JSON.stringify(s)===before&&traveled===0,'travel cancellation mutated state');}
  }
  {const s=newGameState();s.flags['dex-received']=true;const stack=new SceneStack();let traveled=0;const scene=new TransportScene(stack,input,s,'borgo',()=>traveled++);stack.push(scene);scene.menu.index=2;press(scene,'a');while(scene.reviewing)press(scene,'a');check(traveled===0&&stack.top===scene,'closed route traveled');scene.menu.index=1;press(scene,'a');while(!scene.closed)press(scene,'a');press(scene,'a');check(traveled===1&&!stack.top,'travel callback repeated');}
  {const s=newGameState();s.flags['intro-done']=true;s.flags['dex-received']=true;s.badges=['auditel','spread'];s.party=[createMonster('ellyna',15)];s.party[0].hp=2;s.party[0].moves[0].pp=1;const party=JSON.stringify(s.party),money=s.money,stack=new SceneStack(),world=new WorldScene(stack,input,s);stack.push(world);world.openTransport();const scene=stack.top;scene.menu.index=1;press(scene,'a');while(stack.top===scene)press(scene,'a');check(s.pos.mapId==='mediopoli'&&s.party[0].hp===2&&s.money===money&&JSON.stringify(s.party)===party,'real travel changed resources or healed');check(loadGame().pos.mapId==='mediopoli','travel arrival not saved');}
  {const s=newGameState();s.party=[createMonster('ellyna',10)];const stack=new SceneStack(),scene=new PauseScene(stack,input,s);stack.push(scene);capture('pause-touch-hit-test',scene);input.tapNow={x:100,y:64};scene.update(.01);check(stack.top===scene&&scene.menu.index===2,'pause touch first tap did not highlight');input.tapNow={x:100,y:64};scene.update(.01);check(stack.top?.constructor.name==='PartyScene','pause second tap did not open squad');input.clearTap();s.morale.trust=91;scene.update(.01);check(scene.menu.items[scene.entries.indexOf('MORALE')].rightLabel.startsWith('91/'),'pause stale morale after child');}
  {const s=newGameState();s.flags['dex-received']=true;const before=JSON.stringify(s),stack=new SceneStack();let trips=0;const scene=new TransportScene(stack,input,s,'borgo',()=>trips++);stack.push(scene);capture('travel-touch-hit-test',scene);input.tapNow={x:100,y:56};scene.update(.01);check(scene.menu.index===1&&!scene.reviewing,'travel touch did not highlight');input.tapNow={x:100,y:56};scene.update(.01);input.clearTap();check(scene.reviewing&&trips===0&&JSON.stringify(s)===before,'travel touch spent before review');press(scene,'b');check(trips===0&&JSON.stringify(s)===before,'touch cancellation traveled');}
  // Real opening and loss/reload/retry/win path; outcomes forced to verify progression.
  for(const hard of [false,true])for(const id of STARTERS){
   const s=newGameState();s.flags['intro-done']=true;s.hardMode=hard;s.pos={mapId:'lab',x:5,y:6,facing:'up'};const stack=new SceneStack(),world=new WorldScene(stack,input,s);stack.push(world);world.interactStarter(id);let ticks=0;
   const reachBattle=()=>{let count=0;while(stack.top?.constructor.name!=='BattleScene'&&count++<1000)press(stack.top,stack.top?.constructor.name==='FieldGuideScene'?'start':'a');check(stack.top?.constructor.name==='BattleScene','tutorial battle missing');return stack.top;};
   const battle=reachBattle();check(s.party.length===1&&s.starterId===id&&battle.ai.canHeal===false&&battle.foeTeam[0].level===(hard?7:4),'starter/tutorial mismatch');const money=s.money,initialSheets=s.bag.scheda;world.chooseStarter(id);check(s.party.length===1,'duplicate starter claimed');
   battle.endBattle('loss');battle.queue.at(-1).run();check(!s.flags['rival1-beaten']&&!s.flags['dex-received']&&s.rivalWins===0&&s.money===money&&s.party[0].hp>0,'tutorial loss granted victory or fine');
   const restored=importSaveCode(exportSaveCode(s));check(restored.flags['starter-chosen']&&!restored.flags['rival1-beaten'],'tutorial loss import wrong');
   while(world.msg.isOpen&&ticks++<1000)press(world,'a');const professor=world.npcs.find(n=>n.id==='professor');check(professor,'professor unavailable after loss');world.interactNpc(professor);
   const retry=reachBattle();retry.endBattle('win');retry.queue.at(-1).run();while(!s.flags['dex-received']&&ticks++<2000)press(stack.top,'a');check(s.flags['rival1-beaten']&&s.flags['dex-received']&&s.rivalWins===1&&s.bag.scheda===initialSheets+5,`retry award ${id} hard=${hard} flags=${s.flags['rival1-beaten']}/${s.flags['dex-received']} wins=${s.rivalWins} sheets=${s.bag.scheda}`);
   const before=JSON.stringify(s);world.giveDex();check(JSON.stringify(s)===before,'Dex duplicated');
  }
  const {damageRange}=await import('/src/game/battle/tactics.ts'),{MOVES}=await import('/src/data/moves.ts'),{seededRng}=await import('/src/game/tournament.ts');
  const played=[];
  for(const hard of [false,true])for(const id of STARTERS){
   const random=Math.random;Math.random=seededRng(20261002);
   try{
    const s=newGameState();s.flags['intro-done']=true;s.hardMode=hard;s.pos={mapId:'lab',x:5,y:6,facing:'up'};s.battleSpeed=2;s.reduceEffects=true;
    const stack=new SceneStack(),world=new WorldScene(stack,input,s);stack.push(world);world.chooseStarter(id);let ticks=0;
    while(stack.top?.constructor.name!=='BattleScene'&&ticks++<1000)press(stack.top,stack.top?.constructor.name==='FieldGuideScene'?'start':'a');const battle=stack.top;check(battle?.constructor.name==='BattleScene','played tutorial missing');
    let attacks=0;
    while(stack.top===battle&&ticks++<3000){
     if(battle.mode==='fight'&&!battle.msg.isOpen){
      const slots=battle.player.mon.moves;let best=-1,score=-1;
      slots.forEach((slot,i)=>{const m=MOVES[slot.id];if(slot.pp<=0||m.power<=0)return;const range=damageRange(battle.player,battle.foe,m,{sondaggi:s.sondaggi}),value=(range.min+range.max)*m.accuracy;if(value>score){score=value;best=i;}});
      if(best>=0&&!battle.fightFallback){if(battle.fightMenu.index%2!==best%2)press(battle,'right');if(Math.floor(battle.fightMenu.index/2)!==Math.floor(best/2))press(battle,'down');}
      press(battle,'a');attacks++;
     }else press(battle,'a');
    }
    check(stack.top!==battle&&battle.finished,'played tutorial never ended');const won=!!s.flags['rival1-beaten'];
    if(!hard)check(won,`normal starter lost scripted policy ${id}`);else if(!won)check(!s.flags['dex-received'],'played hard loss granted Dex');
    played.push({id,hard,won,attacks});
   }finally{Math.random=random;}
  }
  return {shots,overflow,views,played};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(r.overflow,[]);mkdirSync('artifacts/screens/desk',{recursive:true});for(const [n,d]of Object.entries(r.shots))writeFileSync(`artifacts/screens/desk/${n}.png`,Buffer.from(d.split(',')[1],'base64'));
 writeFileSync('artifacts/desk/played-tutorial.json',JSON.stringify(r.played,null,2)+'\n');console.log('Played tutorial via input:',JSON.stringify(r.played));
 console.log(`PASS ${r.views} native views: complete 3 starter dossiers, two motion modes, all pause options on desktop/touch, all route gates/cancel/arrival, actual opening and 6 forced loss/retry/win flows, once-only starter and Dex, no text overflow.`);
}finally{await browser.close();}
