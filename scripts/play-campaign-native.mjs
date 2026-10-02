import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch();
const id=process.env.STARTER??'ellyna',seed=Number(process.env.RUN_SEED??20261002),plan=process.env.RUN_PLAN??'direct';
const label=process.env.RUN_LABEL??'current';
const practice=process.env.RUN_PRACTICE==='1';
const endAt=process.env.END_AT??'auditel';
const euroPlan=process.env.EU_PLAN??plan;
const capitalPlan=process.env.CAP_PLAN??'direct';
const courtPlan=process.env.COURT_PLAN??'direct';
const civicPlan=process.env.CIVIC_PLAN??'skip';
const archivePlan=process.env.ARCHIVE_PLAN??'skip';
const strettoPlan=process.env.STRETTO_PLAN??'skip';
const kitPlan=process.env.KIT_PLAN??'skip';
assert.ok(['auditel','spread','dazio','capitano','boss','garante'].includes(endAt),'Unknown campaign endpoint');
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5188'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async({id,seed,plan,practice,endAt,euroPlan,capitalPlan,courtPlan,civicPlan,archivePlan,strettoPlan,kitPlan})=>{
  const {WorldScene}=await import('/src/game/world/WorldScene.ts'),{newGameState,exportSaveCode,saveGame}=await import('/src/game/state.ts');
  const {Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {MOVES}=await import('/src/data/moves.ts'),{ITEMS}=await import('/src/data/items.ts'),{MAPS,STARTER_SPOTS}=await import('/src/data/maps.ts');
  const {statsOf,itemEvolution}=await import('/src/game/monster.ts'),{damageRange,switchPreview}=await import('/src/game/battle/tactics.ts'),{makeCombatant,foeMoveScore}=await import('/src/game/battle/sim.ts');
  const {seededRng}=await import('/src/game/tournament.ts'),{audio}=await import('/src/engine/audio.ts');audio.enabled=false;Math.random=seededRng(seed);
  const {mp}=await import('/src/net/mp.ts');mp.setEnabled(false); // Local campaign; relay timing must not consume the seeded RNG.
  const {archivedMoves}=await import('/src/game/moveArchive.ts');
  const {TILES}=await import('/src/art/tiles.ts'),{tickRunStats}=await import('/src/game/runstats.ts'),{spriteRegistryStats}=await import('/src/engine/assets.ts');
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);const screen=new Screen(canvas),input=new Input(),stack=new SceneStack();
  const state=newGameState(),world=new WorldScene(stack,input,state);stack.push(world);
  const events=[],milestones=[],shots={},battles=new Map(),codes={},lessons=new Map(),briefChosen=new WeakSet();let frames=0,itemPending=null,shopping=[],archivePending=null,rewardPending=null;
  const narrative=[],say=world.say.bind(world);world.say=(lines,...rest)=>{narrative.push({map:state.pos.mapId,lines:[...lines],trust:state.morale.trust,cohesion:state.morale.cohesion});return say(lines,...rest);};
  const code={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',a:'KeyZ',b:'KeyX',start:'KeyP'};
  const trace=(type,detail)=>events.push({type,detail,steps:state.stepsTotal,map:state.pos.mapId,party:state.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp})),money:state.money});
  function tick(button){
   if(frames++>400000)throw Error('Campaign exceeded frame bound');
   if(button)document.dispatchEvent(new KeyboardEvent('keydown',{code:code[button],bubbles:true,cancelable:true}));
   const top=stack.top;
   if(top?.constructor.name==='BattleScene'&&!battles.has(top)){
    const record={trainer:top.trainer?.id??null,foes:top.foeTeam.map(m=>({id:m.speciesId,level:m.level,exp:m.exp,uid:m.uid})),before:{party:state.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp,exp:m.exp,uid:m.uid})),bag:{...state.bag},money:state.money},outcome:null};battles.set(top,record);trace('battle-start',record);
    const end=top.onEnd;top.onEnd=result=>{record.outcome=result;record.recipientUid=top.player.mon.uid;record.after={party:state.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp,exp:m.exp,uid:m.uid})),bag:{...state.bag},money:state.money};trace('battle-end',{trainer:record.trainer,outcome:result});end(result);};
   }
   stack.update(.1);tickRunStats(state,.1,true);input.endFrame();
   if(button)document.dispatchEvent(new KeyboardEvent('keyup',{code:code[button],bubbles:true,cancelable:true}));
   if(frames%50===0)stack.draw(screen);
  }
  const press=b=>tick(b);
  function linear(menu,target){if(menu.index!==target){press('down');return false;}press('a');return true;}
  function grid(menu,target){const i=menu.index;if(i===target){press('a');return true;}if(i%2!==target%2)press(i%2?'left':'right');else press(i<target?'down':'up');return false;}
  function bestMove(b){let index=-1,score=-1;for(const [i,s]of b.player.mon.moves.entries()){const m=MOVES[s.id];if(s.pp<=0||m.power<=0)continue;const r=damageRange(b.player,b.foe,m,{sondaggi:state.sondaggi}),value=(r.min+r.max)*m.accuracy;if(value>score){index=i;score=value;}}return {index,score};}
  const finalTactics=()=>courtPlan==='prepared'&&state.badges.includes('dazio');
  function candidateScore(player,foe){
   const outgoing=bestMove({player,foe}).score;
   return outgoing*player.mon.hp/Math.max(10,bestMove({player:foe,foe:player}).score/200);
  }
  function combatMove(b){
   if(!finalTactics())return bestMove(b).index;
   return b.player.mon.moves.map((slot,index)=>({index,score:slot.pp>0?foeMoveScore(b.player,b.foe,MOVES[slot.id],{whiff:0,canHeal:true,finisher:true,style:'balanced'},{sondaggi:state.sondaggi}):-1})).sort((a,b)=>b.score-a.score)[0]?.index??-1;
  }
  function bestCandidate(foe,currentUid){
   let index=-1,score=-Infinity;
   for(const [i,mon]of state.party.entries()){
    if(mon.hp<=0||mon.uid===currentUid)continue;
    const preview=switchPreview(mon,foe);
    const value=finalTactics()?candidateScore(preview.entrant,preview.opponent):bestMove({player:makeCombatant(mon),foe}).score*mon.hp/statsOf(mon).hp;
    if(value>score){index=i;score=value;}
   }
   return index;
  }
  function action(){
   const s=stack.top,name=s?.constructor.name;
   if(name==='WorldScene'){
    if(world.msg.isOpen){press('a');return true;}
    if(world.askMenu){press('a');return true;}
    if(world.moving||world.fadeOut>0||world.healFx>0||world.encounterFlash>0||world.exclaimT>0||world.npcs.some(n=>n.path?.length)){tick();return true;}
    return false;
   }
   if(name==='BattleScene'){
    if(s.mode==='menu'){
     const balls=['scheda','schedona'].filter(i=>state.bag[i]>0),heal=['spritz','caffe','mojito'].find(i=>state.bag[i]>0);
     const damage=bestMove(s),hpMax=statsOf(s.player.mon).hp;
     const wantCatch=!s.trainer&&state.party.length<(euroPlan==='tactical'&&state.badges.includes('auditel')?4:3)&&!state.party.some(m=>m.speciesId===s.foe.mon.speciesId)&&balls.length&&(s.foe.mon.hp<=statsOf(s.foe.mon).hp*.65||damage.score/200>=s.foe.mon.hp);
     const wantHeal=s.player.mon.hp<hpMax*.35&&heal;
     itemPending=wantHeal?heal:wantCatch?balls[0]:null;grid(s.mainMenu,itemPending?1:0);return true;
    }
    if(s.mode==='fight'){const best=combatMove(s);if(best>=0&&!s.fightFallback){if(s.fightMenu.index!==best){press(s.fightMenu.index<best?'down':'up');return true;}}press('a');return true;}
    if(s.mode==='ask'&&finalTactics()&&s.askText.startsWith('Rimpasto?')){
     const index=bestCandidate(s.foe,s.player.mon.uid),preview=index>=0?switchPreview(state.party[index],s.foe):null;
     const target=preview&&candidateScore(preview.entrant,preview.opponent)>candidateScore(s.player,s.foe)*1.12?0:1;
     linear(s.askMenu,target);return true;
    }
    press('a');return true;
   }
   if(name==='BagScene'){
    if(rewardPending){
     if(s.msg.isOpen||s.ask){press('a');return true;}
     const mon=state.party.find(m=>m.uid===rewardPending.uid);
     if(rewardPending.kind==='hold'?mon?.heldItem===rewardPending.item:mon?.speciesId===rewardPending.target){rewardPending.done=true;press('b');return true;}
     const target=s.view.ids.indexOf(rewardPending.item);if(target<0)throw Error('Missing earned evolution item');
     linear(s.view.menu,target);return true;
    }
    if(s.msg.isOpen){press('a');return true;}
    const target=s.view.ids.indexOf(itemPending);if(target<0)throw Error('Missing planned bag item '+itemPending);
    linear(s.view.menu,target);return true;
   }
   if(name==='PartyScene'){
    if(rewardPending){const target=state.party.findIndex(m=>m.uid===rewardPending.uid);if(s.index!==target)press('down');else press('a');return true;}
    if(archivePending){
     if(archivePending.done){press('b');return true;}
     if(s.summary){if(s.summaryPage!==5)press('a');else press('start');}
     else if(s.index!==state.party.findIndex(m=>m.uid===archivePending.uid))press('down');else press('a');
     return true;
    }
    const live=[...battles.keys()].findLast(b=>!battles.get(b).outcome);
    const target=euroPlan==='tactical'&&state.badges.includes('auditel')&&live?bestCandidate(live.foe,s.opts.currentUid):state.party.findIndex(m=>m.hp>0&&m.uid!==s.opts.currentUid);if(target<0)throw Error('No switch candidate');
    if(s.index!==target)press('down');else press('a');return true;
   }
   if(name==='TeachScene'){
    if(!lessons.has(s)){const lesson={uid:s.mon.uid,id:s.mon.speciesId,move:s.moveId,level:s.mon.level};lessons.set(s,lesson);trace('learn',lesson);}
    const powers=s.mon.moves.map(slot=>MOVES[slot.id].power),target=archivePending?archivePending.replace:powers.indexOf(Math.min(...powers));
    if(!s.confirm&&!s.msg.isOpen&&s.mon.moves.length>=4&&s.menu.index!==target)press('down');else press('a');return true;
   }
   if(name==='RecallScene'){
    if(state.party.find(m=>m.uid===archivePending.uid).moves.some(s=>s.id===archivePending.move)){archivePending.done=true;press('b');return true;}
    const target=s.ids.indexOf(archivePending.move);if(target<0)throw Error('Illegal archive move');linear(s.menu,target);return true;
   }
   if(name==='PauseScene'&&rewardPending){
    if(rewardPending.done)press('b');else linear(s.menu,s.entries.indexOf('BORSA'));return true;
   }
   if(name==='PauseScene'&&archivePending){
    if(archivePending.done){press('b');return true;}
    linear(s.menu,s.entries.indexOf('SQUADRA'));return true;
   }
   if(name==='BossBriefingScene'&&euroPlan==='tactical'&&state.badges.includes('auditel')&&!briefChosen.has(s)){
    if(s.page===0)press('start');
    else{
     const target=bestCandidate(makeCombatant(s.team[0]));if(target<0)throw Error('No briefing leader');
     if(s.index!==target)press('down');
     else{trace('leader-selection',{trainer:s.trainer.id,uid:state.party[target].uid,species:state.party[target].speciesId});press('a');briefChosen.add(s);}
    }
    return true;
   }
   if(name==='CivicScene'){
    if(s.msg.isOpen)press('a');
    else if(s.index!==(civicPlan==='pledge'?1:0))press('down');
    else{trace('civic-choice',{event:s.event.id,index:s.index});press('a');}
    return true;
   }
   if(name==='ShopScene'){
    if(s.msg.isOpen){press('a');return true;}
    const wanted=shopping.find(p=>(state.bag[p.id]??0)<p.target);
    if(!wanted){trace('supplies-purchased',{bag:{...state.bag},money:state.money});press('b');return true;}
    if(s.quote){
     const qty=wanted.target-(state.bag[wanted.id]??0);
     if(s.quote.quantity!==qty)press(s.quote.quantity<qty?'right':'left');else press('a');
    }else{
     const index=s.view.ids.indexOf(wanted.id);if(index<0)throw Error('Supply not sold '+wanted.id);linear(s.view.menu,index);
    }
    return true;
   }
   if(['FieldGuideScene','StarterPreviewScene','EvolutionScene','BossBriefingScene','SliceEndingScene'].includes(name)){press('a');return true;}
   throw Error('Unhandled scene '+name);
  }
  function settle(){let n=0;while(action()){if(n++>10000)throw Error('Scene did not settle '+stack.top?.constructor.name);}}
  const dirs=[['up',0,-1],['left',-1,0],['right',1,0],['down',0,1]];
  function pathTo(tx,ty){
   const from=[state.pos.x,state.pos.y],key=(x,y)=>x+','+y,q=[from],parents=new Map([[key(...from),null]]);let found=null;
   for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){found=[x,y];break;}
    for(const [d,dx,dy]of dirs){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(parents.has(k)||world.isBlocked(nx,ny))continue;
     // Only enter the intended door. Side buildings remain optional.
     if(world.map.warps.some(w=>w.x===nx&&w.y===ny)&&(nx!==tx||ny!==ty))continue;
     parents.set(k,{from:[x,y],dir:d});q.push([nx,ny]);}
   }
   if(!found)return null;const path=[];while(parents.get(key(...found))){const p=parents.get(key(...found));path.unshift(p.dir);found=p.from;}return path;
  }
  function walkTo(tx,ty){
   const map=state.pos.mapId,losses=[...battles.values()].filter(b=>b.outcome==='loss').length;let stalled=0;
   for(let n=0;n<3000;n++){
    settle();if(state.pos.mapId!==map||[...battles.values()].filter(b=>b.outcome==='loss').length>losses)return false;
    if(state.pos.x===tx&&state.pos.y===ty)return true;
    const path=pathTo(tx,ty);
    // A passer-by can temporarily occupy a street. Wait through its natural
    // movement rather than declaring a disconnected map on the first frame.
    if(!path?.length){tick();if(++stalled>300)throw Error(`No path ${map} ${state.pos.x},${state.pos.y} -> ${tx},${ty}`);continue;}
    const before=state.pos.x+','+state.pos.y,dir=path[0];
    press(dir);for(let i=0;i<12&&stack.top===world&&!world.msg.isOpen;i++){if(state.pos.x+','+state.pos.y!==before)break;press(dir);}
    settle();if(state.pos.x+','+state.pos.y===before&&++stalled>10)throw Error('Blocked movement at '+before);else stalled=0;
   }throw Error('Path exceeded bounds');
  }
  function face(dir){if(state.pos.facing!==dir)press(dir);}
  function interact(tx,ty){
   const choices=dirs.map(([dir,dx,dy])=>({dir:dirs.find(d=>d[1]===-dx&&d[2]===-dy)[0],x:tx+dx,y:ty+dy})).filter(c=>!world.isBlocked(c.x,c.y)&&pathTo(c.x,c.y));
   choices.sort((a,b)=>pathTo(a.x,a.y).length-pathTo(b.x,b.y).length);if(!choices.length)throw Error('No adjacent interaction tile '+tx+','+ty);
   const c=choices[0];if(!walkTo(c.x,c.y)){trace('interrupted-interaction',{x:tx,y:ty});return false;}face(c.dir);press('a');settle();return true;
  }
  function enterMap(mapId){
   for(let n=0;n<3&&state.pos.mapId!==mapId;n++){
    const warp=world.map.warps.find(w=>w.toMap===mapId);if(!warp)throw Error('No warp to '+mapId);
    if(world.map.outdoor&&!MAPS[mapId].outdoor){if(!walkTo(warp.x,warp.y+1))continue;face('up');press('up');settle();}
    else{walkTo(warp.x,warp.y);settle();}
   }
   if(state.pos.mapId!==mapId)throw Error('Door did not enter '+mapId+' '+JSON.stringify({pos:state.pos,moving:world.moving,fadeIn:world.fadeIn,fadeOut:world.fadeOut,msg:world.msg.isOpen,npcs:world.visibleNpcs().map(n=>({id:n.id,x:n.x,y:n.y}))}));
  }
  function cross(dir){
   const map=world.map,y=dir==='up'?0:map.tiles.length-1,candidates=Array.from({length:map.tiles[y].length},(_,x)=>({x,path:pathTo(x,y)})).filter(c=>c.path).sort((a,b)=>a.path.length-b.path.length);
   if(!candidates.length)throw Error('No '+dir+' exit '+map.id);if(!walkTo(candidates[0].x,y))return false;face(dir);press(dir);settle();if(state.pos.mapId===map.id)throw Error(dir+' exit blocked '+map.id);return true;
  }
  function heal(){
   while(['colle','palazzo','gymglobal'].includes(state.pos.mapId)){
    const exit=world.map.warps.find(w=>w.toMap!== 'colle');walkTo(exit.x,exit.y);settle();
   }
   if(state.pos.mapId==='stretto'&&!state.flags['ponte-beaten'])enterMap('capitale');
   if(['route1','route2','route3'].includes(state.pos.mapId))cross('up');
   const bar={borgo:'bar-borgo',mediopoli:'bar-medio',eurotown:'bar-euro',capitale:'bar-cap',stretto:'bar-stretto'}[state.pos.mapId];
   if(!bar)throw Error('No planned healer for '+state.pos.mapId);enterMap(bar);
   const healer=world.visibleNpcs().find(n=>n.healer);interact(healer.x,healer.y);walkTo(world.map.warps[0].x,world.map.warps[0].y);settle();
  }
  function supplies(){
   heal();shopping=[{id:'spritz',target:8},{id:'mojito',target:4}];
   // The first visit explains reusable directives before opening the shop.
   for(let visit=0;shopping.some(p=>(state.bag[p.id]??0)<p.target)&&visit<3;visit++){
    const vendor=world.visibleNpcs().find(n=>n.shop);if(!vendor)throw Error('No capital supply vendor');interact(vendor.x,vendor.y);
   }
   if(shopping.some(p=>(state.bag[p.id]??0)<p.target))throw Error('Supply purchase did not complete');
  }
  function prepareArchive(){
   if(archivePlan!=='support')return;
   for(const mon of state.party){
    const available=archivedMoves(mon), move=['pienipoteri','iosonogiorgia','articolouno','fiducia','mojito','redditone','inciucio'].find(id=>available.includes(id));
    if(!move)continue;
    const attacks=mon.moves.map((s,i)=>({move:MOVES[s.id],i})).filter(s=>s.move.power>0).sort((a,b)=>a.move.power-b.move.power);
    if(attacks.length<2)continue;
    archivePending={uid:mon.uid,move,replace:attacks[0].i,done:false};
    trace('archive-plan',{species:mon.speciesId,move,replace:mon.moves[attacks[0].i].id});
    press('start');settle();if(!archivePending.done||stack.top!==world)throw Error('Archive input flow did not finish');archivePending=null;
   }
  }
  function useEarnedTessera(){
   const item='tessera',mon=state.party.find(m=>itemEvolution(m,item));
   if(!state.bag[item]||!mon){trace('tessera-retained',{reason:!state.bag[item]?'not earned':'no compatible career'});return;}
   const before=state.bag[item],from=mon.speciesId;
   rewardPending={uid:mon.uid,item,target:itemEvolution(mon,item),done:false};
   trace('tessera-plan',{from,to:rewardPending.target});press('start');settle();
   if(!rewardPending.done||state.bag[item]!==before-1||stack.top!==world)throw Error('Earned Tessera input flow did not finish');
   trace('tessera-used',{from,to:mon.speciesId,remaining:state.bag[item]??0});rewardPending=null;
  }
  function prepareKit(){
   if(kitPlan!=='defensive')return;
   const targets=[...state.party].filter(m=>m.heldItem!=='gilet').sort((a,b)=>b.level-a.level).slice(0,2);
   if(!targets.length)return;
   shopping=[{id:'gilet',target:targets.length}];
   for(let visit=0;shopping.some(p=>(state.bag[p.id]??0)<p.target)&&visit<3;visit++){
    const vendor=world.visibleNpcs().find(n=>n.shop);interact(vendor.x,vendor.y);
   }
   if((state.bag.gilet??0)<targets.length)throw Error('Actual defensive kit purchase did not complete');
   for(const mon of targets){
    const before=state.bag.gilet;rewardPending={uid:mon.uid,item:'gilet',kind:'hold',done:false};
    press('start');settle();
    if(!rewardPending.done||state.bag.gilet!==before-1||stack.top!==world)throw Error('Purchased kit equipment did not complete');
    trace('kit-equipped',{species:mon.speciesId,item:'gilet',money:state.money});rewardPending=null;
   }
  }
  async function visitStretto(){
   supplies();prepareArchive();prepareKit();interact(4,19);
   if(!state.flags['veh-traghetto'])throw Error('Marine did not unlock ferry after three badges');
   enterMap('stretto');await milestone('stretto-arrival');
   for(let attempt=1;attempt<=2&&!state.flags['ponte-beaten'];attempt++){
    if(state.pos.mapId!=='stretto'){heal();enterMap('stretto');}
    const npc=world.visibleNpcs().find(n=>n.trainerId==='ilcapitano');interact(npc.x,npc.y);await milestone(`stretto-capitano-${attempt}`);
   }
   if(!state.flags['ponte-beaten'])return;
   heal();for(let attempt=0;!state.flags['gift-ingegnere']&&attempt<3;attempt++)interact(17,5);
   if(!state.flags['gift-ingegnere'])throw Error('Engineer gift input did not complete');
   for(const trainer of ['geometra','djpapeete','citofonista','noponte']){
    const npc=world.visibleNpcs().find(n=>n.trainerId===trainer);
    if(!npc)throw Error('Optional Stretto trial disappeared '+trainer);
    interact(npc.x,npc.y);await milestone(`stretto-${trainer}`);heal();
   }
   useEarnedTessera();await milestone('stretto-prepared');enterMap('capitale');heal();
  }
  function train(){
   const startWild=[...battles.values()].filter(b=>!b.trainer).length;
   for(let n=0;n<2500;n++){
    if(state.party[0].level>=10&&state.party.length>=3)break;
    if([...battles.values()].filter(b=>!b.trainer).length-startWild>=40)break;
    const lead=state.party[0];if(state.pos.mapId!=='route1'||lead.hp<statsOf(lead).hp*.5||!lead.moves.some(s=>s.pp>0&&MOVES[s.id].power>0)){
     heal();if(state.pos.mapId==='mediopoli')cross('down');else cross('up');
    }
    const cells=world.map.tiles.flatMap((row,y)=>[...row].flatMap((ch,x)=>TILES[ch]?.encounter&&!world.isBlocked(x,y)?[{x,y,path:pathTo(x,y)}]:[])).filter(c=>c.path?.length).sort((a,b)=>a.path.length-b.path.length);
    if(!cells.length)throw Error('No reachable training grass');walkTo(cells[0].x,cells[0].y);
   }
   trace('training-complete',{wildBattles:[...battles.values()].filter(b=>!b.trainer).length-startWild});heal();
  }
  async function milestone(label){trace('milestone',label);milestones.push({label,steps:state.stepsTotal,money:state.money,party:state.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp,exp:m.exp,moves:m.moves.map(s=>({...s}))})),bag:{...state.bag},badges:[...state.badges]});saveGame(state);codes[label]=exportSaveCode(state);for(let i=0;i<100;i++){stack.draw(screen);await new Promise(r=>setTimeout(r,50));if(!spriteRegistryStats().loading&&i>2)break;}stack.draw(screen);const native=document.createElement('canvas');native.width=240;native.height=180;native.getContext('2d').drawImage(canvas,0,0,240,180);shots[label]=native.toDataURL();}
  let failure=null;
  try{
   settle();enterMap('lab');
   const starter=STARTER_SPOTS.find(s=>s.speciesId===id);interact(starter.x,starter.y);settle();
   for(let attempt=0;!state.flags['dex-received']&&attempt<3;attempt++)interact(9,4);
   if(!state.flags['dex-received'])throw Error('Tutorial policy could not obtain Dex');await milestone('debut');
   walkTo(5,7);settle();
   if(civicPlan!=='skip'){interact(10,7);await milestone('civic-bus');}
   if(plan==='prepared'){
    interact(17,15);interact(9,6);heal();interact(20,3);heal();await milestone('borgo-training');
   }
   cross('up');cross('up');if(state.pos.mapId!=='mediopoli')throw Error('Mediopoli not reached');await milestone('mediopoli');
   if(plan==='prepared'){interact(15,7);heal();cross('down');train();await milestone('prepared');}
   if(practice){cross('down');const nino=world.visibleNpcs().find(n=>n.trainerId==='praticante');if(!nino)throw Error('Practice trainer not found');interact(nino.x,nino.y);await milestone('nino');heal();}
   heal();await milestone('healed');
   enterMap('gymtv');
   if(plan==='prepared'){
    const mara=world.visibleNpcs().find(n=>n.trainerId==='stagista');interact(mara.x,mara.y);await milestone('rehearsal');
    if(state.pos.mapId==='gymtv'){walkTo(world.map.warps[0].x,world.map.warps[0].y);settle();}
    heal();enterMap('gymtv');
   }
   for(let attempt=1;attempt<=(plan==='prepared'?2:1)&&!state.badges.includes('auditel');attempt++){
    if(state.pos.mapId!=='gymtv'){heal();enterMap('gymtv');}
    const boss=world.visibleNpcs().find(n=>n.trainerId==='emittenza');interact(boss.x,boss.y);settle();await milestone(`studio-result-${attempt}`);
   }
   await milestone('studio-result');
   if(endAt!=='auditel'&&state.badges.includes('auditel')){
    if(state.pos.mapId==='gymtv'){walkTo(world.map.warps[0].x,world.map.warps[0].y);settle();}
    heal();cross('up');
    if(euroPlan==='tactical'){
     const startWild=[...battles.values()].filter(b=>!b.trainer).length;
     for(let n=0;state.party.length<4&&n<2500&&[...battles.values()].filter(b=>!b.trainer).length-startWild<15;n++){
      const lead=state.party[0];
      if(state.pos.mapId!=='route2'||lead.hp<statsOf(lead).hp*.5||!lead.moves.some(s=>s.pp>0&&MOVES[s.id].power>0)){
       heal();cross(state.pos.mapId==='eurotown'?'down':'up');
      }
      const cells=world.map.tiles.flatMap((row,y)=>[...row].flatMap((ch,x)=>TILES[ch]?.encounter&&!world.isBlocked(x,y)?[{x,y,path:pathTo(x,y)}]:[])).filter(c=>c.path?.length).sort((a,b)=>a.path.length-b.path.length);
      if(!cells.length)throw Error('No reachable route2 recruitment grass');walkTo(cells[0].x,cells[0].y);
     }
     await milestone('route2-recruitment');
    }
    if(euroPlan==='prepared'||euroPlan==='tactical'){
     const guest=world.visibleNpcs().find(n=>n.trainerId==='telelobbista');interact(guest.x,guest.y);await milestone('route2-confront');
    }
    for(let n=0;state.pos.mapId!=='eurotown'&&n<4;n++){
     if(state.pos.mapId==='mediopoli'){heal();cross('up');}
     if(state.pos.mapId==='route2')cross('up');
    }
    if(state.pos.mapId!=='eurotown')throw Error('Eurotown not reached');
    await milestone('eurotown');heal();enterMap('gymue');
    if(euroPlan==='prepared'||euroPlan==='tactical'){
     const examiner=world.visibleNpcs().find(n=>n.trainerId==='funzionario');interact(examiner.x,examiner.y);await milestone('spread-check');
     if(state.pos.mapId==='gymue'){walkTo(world.map.warps[0].x,world.map.warps[0].y);settle();}
     heal();enterMap('gymue');
    }
    for(let attempt=1;attempt<=2&&!state.badges.includes('spread');attempt++){
     if(state.pos.mapId!=='gymue'){heal();enterMap('gymue');}
     const boss=world.visibleNpcs().find(n=>n.trainerId==='ladydirettiva');interact(boss.x,boss.y);settle();await milestone(`spread-result-${attempt}`);
    }
    await milestone('spread-result');
   }
   if(['dazio','capitano','boss','garante'].includes(endAt)&&state.badges.includes('spread')){
    if(state.pos.mapId==='gymue'){walkTo(world.map.warps[0].x,world.map.warps[0].y);settle();}
    heal();
    if(capitalPlan==='prepared'){
     cross('up');
     const practiceNpc=world.visibleNpcs().find(n=>n.trainerId==='protocollista');interact(practiceNpc.x,practiceNpc.y);await milestone('route3-audit');
    }
    for(let n=0;state.pos.mapId!=='capitale'&&n<5;n++){
     if(state.pos.mapId==='eurotown'){heal();cross('up');}
     if(state.pos.mapId==='route3')cross('up');
    }
    if(state.pos.mapId!=='capitale')throw Error('Capitale not reached');
    await milestone('capitale');heal();enterMap('gymglobal');
    if(capitalPlan==='prepared')for(const trainerId of ['diplomatico','oligarca']){
     const practiceNpc=world.visibleNpcs().find(n=>n.trainerId===trainerId);interact(practiceNpc.x,practiceNpc.y);await milestone(`global-${trainerId}`);
     if(state.pos.mapId==='gymglobal'){walkTo(world.map.warps[0].x,world.map.warps[0].y);settle();}
     heal();enterMap('gymglobal');
    }
    for(let attempt=1;attempt<=2&&!state.badges.includes('dazio');attempt++){
     if(state.pos.mapId!=='gymglobal'){heal();enterMap('gymglobal');}
     const boss=world.visibleNpcs().find(n=>n.trainerId==='tycoon');interact(boss.x,boss.y);settle();await milestone(`dazio-result-${attempt}`);
    }
    await milestone('dazio-result');
   }
   if((strettoPlan==='prepared'||endAt==='capitano')&&state.badges.includes('dazio'))await visitStretto();
   if(['boss','garante'].includes(endAt)&&state.badges.includes('dazio')){
    if(courtPlan==='prepared')supplies();else heal();prepareArchive();enterMap('palazzo');
    for(let attempt=1;attempt<=2&&!state.flags['boss-beaten'];attempt++){
     if(state.pos.mapId!=='palazzo'){heal();enterMap('palazzo');}
     const npc=world.visibleNpcs().find(n=>n.trainerId==='boss');interact(npc.x,npc.y);await milestone(`palazzo-result-${attempt}`);
    }
    if(endAt==='garante'&&state.flags['boss-beaten']){
     heal();enterMap('palazzo');enterMap('colle');await milestone('colle');
     if(courtPlan==='prepared')for(const trainerId of ['giudice1','giudice2','giudice3']){
      const npc=world.visibleNpcs().find(n=>n.trainerId===trainerId);
      if(npc)interact(npc.x,npc.y);await milestone(`colle-${trainerId}`);
      heal();enterMap('palazzo');enterMap('colle');
     }
     if(courtPlan==='prepared'){supplies();prepareArchive();enterMap('palazzo');enterMap('colle');await milestone('garante-supplies');}
     for(let attempt=1;attempt<=2&&!state.flags['garante-beaten'];attempt++){
      if(state.pos.mapId!=='colle'){heal();enterMap('palazzo');enterMap('colle');}
      const npc=world.visibleNpcs().find(n=>n.trainerId==='garante');interact(npc.x,npc.y);await milestone(`garante-result-${attempt}`);
     }
    }
   }
  }catch(e){failure=e.message;trace('failure',{message:failure,pos:{...state.pos},npcs:world.visibleNpcs().map(n=>({id:n.id,x:n.x,y:n.y,canWander:n.canWander})),tiles:world.map.tiles});}
  return {id,seed,plan,endAt,euroPlan,capitalPlan,courtPlan,civicPlan,archivePlan,strettoPlan,kitPlan,narrative,frames,steps:state.stepsTotal,events,milestones,lessons:[...lessons.values()],battles:[...battles.values()],failure,final:{map:state.pos.mapId,money:state.money,badges:state.badges,flags:state.flags,morale:state.morale,defeatedTrainers:state.defeatedTrainers,party:state.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp,heldItem:m.heldItem??null,moves:m.moves})),bag:state.bag,runStats:state.runStats},codes,shots};
 },{id,seed,plan,practice,endAt,euroPlan,capitalPlan,courtPlan,civicPlan,archivePlan,strettoPlan,kitPlan});
 assert.deepEqual(errors,[]);
 if(process.env.CHECK_GROWTH!=='0')for(const b of result.battles.filter(b=>b.outcome==='caught')){
  const old=b.before.party.find(m=>m.uid===b.recipientUid),grown=b.after.party.find(m=>m.uid===b.recipientUid);
  assert.ok(grown.exp>old.exp,'Recruitment did not reward the participant');
  assert.equal(b.after.party.find(m=>m.uid===b.foes[0].uid).exp,b.foes[0].exp,'New recruit received EXP for its own recruitment');
  if(b.before.bag.divisa)for(const m of b.before.party.filter(m=>m.uid!==b.recipientUid&&m.hp>0)){
   const after=b.after.party.find(a=>a.uid===m.uid);if(after.hp>0)assert.equal(after.exp-m.exp,Math.floor((grown.exp-old.exp)/2),'Existing bench did not receive the announced share');
  }
 }
 mkdirSync('artifacts/campaign-native',{recursive:true});mkdirSync('artifacts/screens/campaign-native',{recursive:true});
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/campaign-native/${label}-${id}-${plan}-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 delete result.shots;writeFileSync(`artifacts/campaign-native/${label}-${id}-${plan}-${seed}.json`,JSON.stringify(result,null,2));
 if(process.env.EXPECT_BADGE==='1')assert.ok(result.final.badges.includes(endAt),`Campaign did not earn ${endAt}`);
 if(process.env.EXPECT_COMPLETE==='1')assert.ok(result.final.flags[endAt==='capitano'?'ponte-beaten':`${endAt}-beaten`],`Campaign did not defeat ${endAt}`);
 console.log(JSON.stringify({id,seed,plan,failure:result.failure,milestones:result.milestones,final:result.final,battles:result.battles.map(b=>({trainer:b.trainer,outcome:b.outcome,foes:b.foes}))},null,2));
 if(result.failure)process.exitCode=1;
}finally{await browser.close();}
