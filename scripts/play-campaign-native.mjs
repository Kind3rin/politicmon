import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch();
const id=process.env.STARTER??'ellyna',seed=Number(process.env.RUN_SEED??20261002),plan=process.env.RUN_PLAN??'direct';
const label=process.env.RUN_LABEL??'current';
const practice=process.env.RUN_PRACTICE==='1';
const endAt=process.env.END_AT??'auditel';
const hard=process.env.RUN_HARD==='1';
const endpoints=['auditel','spread','dazio','capitano','boss','garante','tesoriere','commissione','photographer','future','diplomacy','tour','palace','election'];
const euroPlan=process.env.EU_PLAN??plan;
const capitalPlan=process.env.CAP_PLAN??'direct';
const courtPlan=process.env.COURT_PLAN??'direct';
const civicPlan=process.env.CIVIC_PLAN??'skip';
const archivePlan=process.env.ARCHIVE_PLAN??'skip';
const strettoPlan=process.env.STRETTO_PLAN??'skip';
const kitPlan=process.env.KIT_PLAN??'skip';
const offshorePlan=process.env.OFFSHORE_PLAN??'direct';
const bruxPlan=process.env.BRUX_PLAN??'direct';
const photoPlan=process.env.PHOTO_PLAN??'stringetevi';
const campoPlan=process.env.CAMPO_PLAN??'prepared';
const diplomacyPlan=process.env.DIPLOMACY_PLAN??'autonomy';
const futurePlan=process.env.FUTURE_PLAN??'distance';
const futureRepair=process.env.FUTURE_REPAIR==='1',futureEvolve=process.env.FUTURE_EVOLVE==='1';
const resumePath=process.env.RESUME_REPORT;
const resumeReport=resumePath?JSON.parse(readFileSync(resumePath,'utf8')):null;
const resumeStage=process.env.RESUME_STAGE??'garante-result-1';
const resumeCode=resumeReport?.codes[resumeStage]??null;
if(resumePath){assert.ok(resumeCode,'Earned milestone save missing');assert.equal(resumeReport.id,id,'Starter does not match earned save');}
assert.ok(endpoints.includes(endAt),'Unknown campaign endpoint');
assert.ok(['skip','support'].includes(archivePlan),'Unknown archive plan');
assert.ok(['skip','defensive'].includes(kitPlan),'Unknown equipment plan');
assert.ok(['alliance','distance','opposition'].includes(futurePlan),'Unknown future choice');
assert.ok(['loyalty','autonomy','home'].includes(diplomacyPlan),'Unknown diplomacy choice');
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5188'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async({id,seed,plan,practice,endAt,hard,endpoints,euroPlan,capitalPlan,courtPlan,civicPlan,archivePlan,strettoPlan,kitPlan,offshorePlan,bruxPlan,photoPlan,campoPlan,futurePlan,futureRepair,futureEvolve,diplomacyPlan,resumeCode})=>{
  const {WorldScene}=await import('/src/game/world/WorldScene.ts'),{importSaveCode,exportSaveCode,saveGame}=await import('/src/game/state.ts');
  const {Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {MOVES}=await import('/src/data/moves.ts'),{ITEMS}=await import('/src/data/items.ts'),{MAPS,STARTER_SPOTS}=await import('/src/data/maps.ts');
  const {statsOf,itemEvolution,LEVEL_CAP}=await import('/src/game/monster.ts'),{damageRange,switchPreview}=await import('/src/game/battle/tactics.ts'),{makeCombatant,foeMoveScore}=await import('/src/game/battle/sim.ts');
  const {seededRng}=await import('/src/game/tournament.ts'),{audio}=await import('/src/engine/audio.ts');audio.enabled=false;Math.random=seededRng(seed);
  const {mp}=await import('/src/net/mp.ts');mp.setEnabled(false); // Local campaign; relay timing must not consume the seeded RNG.
  const {archivedMoves}=await import('/src/game/moveArchive.ts');
  const {STARTERS}=await import('/src/data/species.ts');
  // Native panels take their keys from the kit, exactly as the game loop does before it updates the scene.
  const {updateUiInput}=await import('/src/ui/kit/index.ts');
  const {TILES}=await import('/src/art/tiles.ts'),{tickRunStats}=await import('/src/game/runstats.ts'),{spriteRegistryStats}=await import('/src/engine/assets.ts');
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);const screen=new Screen(canvas),input=new Input(),stack=new SceneStack();
  const code={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',a:'KeyZ',b:'KeyX',start:'KeyP'};
  let state,world,initialFlow=[];
  if(resumeCode){
   state=importSaveCode(resumeCode);if(!state||!state.flags['garante-beaten'])throw Error('Resume must be an earned post-Garante save');world=new WorldScene(stack,input,state);stack.push(world);
  }else{
   const {TitleScene}=await import('/src/scenes/TitleScene.ts');
   stack.push(new TitleScene(stack,input));
   const launchPress=button=>{document.dispatchEvent(new KeyboardEvent('keydown',{code:code[button],bubbles:true,cancelable:true}));stack.update(.1);input.endFrame();document.dispatchEvent(new KeyboardEvent('keyup',{code:code[button],bubbles:true,cancelable:true}));};
   initialFlow.push('title');launchPress('a');
   if(hard)launchPress('down');
   initialFlow.push(hard?'difficulty:hard':'difficulty:normal');launchPress('a');
   // A free slot is taken automatically and the online nickname is optional: the world opens straight after the difficulty.
   initialFlow.push('free-slot');
   for(let n=0;n<1500&&!stack.scenes.some(s=>s instanceof WorldScene);n++)await new Promise(r=>setTimeout(r,10));
   world=stack.scenes.find(s=>s instanceof WorldScene);state=world?.state;
   if(!state||state.hardMode!==hard||state.money!==500||state.party.length||state.badges.length||Object.keys(state.flags).some(flag=>!['intro-done','controls-intro'].includes(flag)))throw Error('Actual new-game flow did not produce untouched starting resources/difficulty: '+JSON.stringify({scene:stack.top?.constructor.name,state:state&&{hardMode:state.hardMode,money:state.money,party:state.party,badges:state.badges,flags:state.flags}}));
   initialFlow.push('welcome-briefing');
  }
  if(!state||(resumeCode&&!state.flags['garante-beaten']))throw Error('Resume must be an earned post-Garante save');
  const initialState=structuredClone(state);
  const continuesTo=stage=>endpoints.indexOf(endAt)>=endpoints.indexOf(stage);
  const events=[],milestones=[],shots={},battles=new Map(),codes={},lessons=new Map(),briefChosen=new WeakSet();let boxPending=null,repairPending=false,futureRecruit=false,tourTarget=null,electionConfirm=false;let frames=0,itemPending=null,shopping=[],archivePending=null,rewardPending=null;
  const narrative=[],say=world.say.bind(world);world.say=(lines,...rest)=>{narrative.push({map:state.pos.mapId,lines:[...lines],trust:state.morale.trust,cohesion:state.morale.cohesion});return say(lines,...rest);};
  const trace=(type,detail)=>events.push({type,detail,steps:state.stepsTotal,map:state.pos.mapId,party:state.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp})),money:state.money});
  function tick(button){
   if(frames++>400000)throw Error('Campaign exceeded frame bound');
   if(button)document.dispatchEvent(new KeyboardEvent('keydown',{code:code[button],bubbles:true,cancelable:true}));
   const top=stack.top;
   if(top?.constructor.name==='BattleScene'&&!battles.has(top)){
    const record={trainer:top.trainer?.id??null,foes:top.foeTeam.map(m=>({id:m.speciesId,level:m.level,exp:m.exp,uid:m.uid})),deployed:[],before:{party:state.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp,exp:m.exp,uid:m.uid})),bag:{...state.bag},money:state.money},outcome:null};battles.set(top,record);trace('battle-start',record);
    // The reward is announced by the receipt card now ("NOME +N CONSENSO" on a recruitment, `gained` after a fight).
    const consensus=top.consensusSteps.bind(top);top.consensusSteps=(...args)=>{const steps=consensus(...args);for(const step of steps)if(step.run){const run=step.run;step.run=()=>{run();const said=top.recruitReceipt?.growth?.match(/\+(\d+) CONSENSO/)?.[1]??top.growthReceipt?.gained;record.announcedConsensus=(record.announcedConsensus??0)+Number(said??0);};}return steps;};
    const end=top.onEnd;top.onEnd=result=>{record.outcome=result;record.recipientUid=top.player.mon.uid;record.after={party:state.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp,exp:m.exp,uid:m.uid})),bag:{...state.bag},money:state.money};trace('battle-end',{trainer:record.trainer,outcome:result});end(result);};
   }
   if(top?.constructor.name==='BattleScene'){const record=battles.get(top),mon=top.player.mon;if(!record.deployed.some(m=>m.uid===mon.uid))record.deployed.push({uid:mon.uid,id:mon.speciesId,level:mon.level});}
   // Battles are driven through the fight menu itself; every other panel takes its keys from the kit.
   if(button&&stack.top?.constructor.name!=='BattleScene')updateUiInput(stack.top?.uiPanel,input);
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
    if(world.askMenu){linear(world.askMenu,electionConfirm&&world.askLabel==='INIZIA LA DIRETTA?'?1:0);return true;}
    if(world.justEnteredMap||world.fadeT>0||world.moving||world.fadeOut>0||world.healFx>0||world.encounterFlash>0||world.exclaimT>0||world.npcs.some(n=>n.path?.length)){tick();return true;}
    return false;
   }
   if(name==='BattleScene'){
    if(s.mode==='menu'){
     const balls=['scheda','schedona'].filter(i=>state.bag[i]>0),heal=['spritz','caffe','mojito'].find(i=>state.bag[i]>0);
     const damage=bestMove(s),hpMax=statsOf(s.player.mon).hp;
     const islandRecruit=offshorePlan==='prepared'&&state.pos.mapId==='offshore'&&s.foe.mon.level>=33;
     const campoRecruit=campoPlan==='recruit'&&state.pos.mapId==='campo_largo';
     const strettoRecruit=state.hardMode&&strettoPlan==='prepared'&&state.pos.mapId==='stretto';
     const teamLimit=islandRecruit||campoRecruit||futureRecruit||strettoRecruit?6:euroPlan==='tactical'&&state.badges.includes('auditel')?4:3;
     const wantCatch=!s.trainer&&state.party.length<teamLimit&&(!futureRecruit||s.foe.mon.speciesId==='vannaccix')&&!state.party.some(m=>m.speciesId===s.foe.mon.speciesId)&&balls.length&&(s.foe.mon.hp<=statsOf(s.foe.mon).hp*.65||damage.score/200>=s.foe.mon.hp);
     const wantHeal=s.player.mon.hp<hpMax*.35&&heal;
     itemPending=wantHeal?heal:wantCatch?balls[0]:null;
     // The fight is a native panel now: moves, postures and the shortcuts are its actions.
     const acts=s.uiPanel.actions;
     if(itemPending){acts.find(a=>a.label==='Borsa').run();tick();return true;}
     const pick=combatMove(s),first=s.player.mon.moves.findIndex(m=>m.pp>0&&MOVES[m.id].power>0),fallbackPick=s.player.mon.moves.findIndex(m=>m.pp>0);
     const index=pick>=0?pick:first>=0?first:fallbackPick>=0?fallbackPick:0;
     acts[index].run();tick();return true;
    }
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
    // In a fight the bag is a native list of the usable items; the tap is the use.
    if(s.opts?.inBattle){s.uiPanel.actions[target].run();tick();return true;}
    linear(s.view.menu,target);return true;
   }
   if(name==='MoraleScene'&&repairPending){
    if(s.msg.isOpen){press('a');return true;}
    const target=state.morale.promises.findIndex(p=>p.status==='broken');
    if(target<0)press('b');else if(s.index!==target)press('down');else press('a');return true;
   }
   if(name==='PauseScene'&&repairPending){
    if(!state.morale.promises.some(p=>p.status==='broken'))press('b');else linear(s.menu,s.entries.indexOf('MORALE'));return true;
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
    // The lesson is a native list now: the replaced move (or the single learn row) is the action to run.
    if(s.msg.isOpen){press('a');return true;}
    const rows=s.uiPanel?.actions;if(!rows){press('a');return true;}
    (s.mon.moves.length>=4?rows[1+target]:rows[rows.length-1]).run();tick();return true;
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
     const recruitUid=campoPlan==='recruit'&&s.trainer.id==='campo-photographer'?[...battles.values()].find(b=>b.outcome==='caught'&&b.foes[0].level>=43)?.foes[0].uid:null;
     const target=recruitUid?state.party.findIndex(m=>m.uid===recruitUid):bestCandidate(makeCombatant(s.team[0]));if(target<0)throw Error('No briefing leader');
     if(s.index!==target)press('down');
     else{trace('leader-selection',{trainer:s.trainer.id,uid:state.party[target].uid,species:state.party[target].speciesId});press('a');briefChosen.add(s);}
    }
    return true;
   }
   if(name==='BoxScene'){
    if(s.msg.isOpen){press('a');return true;}
    if(!boxPending||!state.party.some(m=>m.uid===boxPending)){press('b');return true;}
    const target=state.party.findIndex(m=>m.uid===boxPending);
    if(s.side!=='party')press('left');else if(s.index!==target)press('down');else{trace('campo-deposit',{uid:boxPending,species:state.party[target].speciesId});press('a');}return true;
   }
   if(name==='CoalitionScene'){
    if(s.candidates[s.index]==='quantum_centrist'&&campoPlan==='civic') {press('b');return true;}
    const target=campoPlan==='civic'?['campo_secretary','civic_mayor']:['campo_secretary','quantum_centrist'];
    const focus=s.candidates[s.index];
    if(target.includes(focus)&&!state.coalition.members.some(m=>m.allyId===focus)){trace('coalition-add',{id:focus});press('a');}else press('b');return true;
   }
   if(name==='DistrictScene'){
    if(!tourTarget)throw Error('No planned Tour action');
    if(s.mode==='menu'){
     if(s.index!==tourTarget.index){press('down');return true;}
     if(tourTarget.ally&&!s.allies().includes(tourTarget.ally))throw Error('Planned Tour ally was not recruited: '+tourTarget.ally);
     if(tourTarget.ally&&s.allies()[s.allyIndex]!==tourTarget.ally){press('right');return true;}
     const p=s.preview();if(!p.ok)throw Error('Tour action rejected: '+p.error);
     trace('district-dossier',{id:s.districtId,choice:s.selected(),preview:p.lines,before:{money:state.money,morale:structuredClone(state.morale),coalition:structuredClone(state.coalition),election:structuredClone(state.election)}});press('a');return true;
    }
    if(s.mode==='result'){press('b');press('b');return true;}
    press('a');return true;
   }
   if(name==='PalaceArchiveScene'){
    if(s.mode==='quiz')linear(s.menu,s.data.options.indexOf(s.data.answer));else press('a');
    return true;
   }
   if(name==='PhotoChoiceScene'){
    const target=photoPlan==='panoramica'?1:0;
    if(s.error)throw Error('Photo rejected: '+s.error);
    if(!s.reviewing&&!s.result&&s.index!==target)press('down');
    else{if(!s.reviewing&&!s.result)trace('photo-dossier',{choice:photoPlan,money:state.money,coalition:state.coalition});press('a');}return true;
   }
   if(name==='DiplomacyChoiceScene'){
    const target=['loyalty','autonomy','home'].indexOf(diplomacyPlan);
    if(s.error)throw Error('Diplomacy rejected: '+s.error);
    if(!s.reviewing&&!s.result&&s.index!==target)press('down');
    else{if(!s.reviewing&&!s.result)trace('diplomacy-dossier',{choice:diplomacyPlan,money:state.money,coalition:state.coalition,morale:state.morale});press('a');}return true;
   }
   if(name==='FutureChoiceScene'){
    const target=['alliance','distance','opposition'].indexOf(futurePlan);
    if(s.error)throw Error('Future rejected: '+s.error);
    if(!s.reviewing&&!s.result&&s.index!==target)press('down');
    else{if(!s.reviewing&&!s.result)trace('future-dossier',{choice:futurePlan,money:state.money,coalition:state.coalition,morale:state.morale});press('a');}return true;
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
   if(['FieldGuideScene','StarterPreviewScene','EvolutionScene','BossBriefingScene','SliceEndingScene','ElectionResultsScene','Atto3EndingScene'].includes(name)){press('a');return true;}
   throw Error('Unhandled scene '+name);
  }
  function settle(){let n=0;while(action()){if(n++>10000){const t=stack.top;throw Error('Scene did not settle '+t?.constructor.name+' '+JSON.stringify({mode:t?.mode,msg:t?.msg?.isOpen,queue:t?.queue?.length,ask:t?.askText,stepTimer:t?.stepTimer,ui:Boolean(t?.uiPanel),postureMenu:Boolean(t?.postureMenu)}));}}}
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
    settle();if(state.pos.mapId!==map||[...battles.values()].filter(b=>b.outcome==='loss').length>losses||world.isBlocked(tx,ty))return false;
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
   const map=state.pos.mapId,losses=[...battles.values()].filter(b=>b.outcome==='loss').length;
   for(let attempt=0;attempt<6;attempt++){
   const choices=dirs.map(([dir,dx,dy])=>({dir:dirs.find(d=>d[1]===-dx&&d[2]===-dy)[0],x:tx+dx,y:ty+dy})).filter(c=>!world.isBlocked(c.x,c.y)&&pathTo(c.x,c.y));
   choices.sort((a,b)=>pathTo(a.x,a.y).length-pathTo(b.x,b.y).length);if(!choices.length)throw Error('No adjacent interaction tile '+tx+','+ty);
   const c=choices[0];if(!walkTo(c.x,c.y)){
    if(state.pos.mapId!==map||[...battles.values()].filter(b=>b.outcome==='loss').length>losses){trace('interrupted-interaction',{x:tx,y:ty});return false;}
    trace('replanned-interaction',{x:tx,y:ty,occupied:{x:c.x,y:c.y}});continue;
   }face(c.dir);press('a');settle();return true;
   }throw Error('Interaction approaches stayed occupied '+tx+','+ty);
  }
  function enterMap(mapId){
   for(let n=0;n<3&&state.pos.mapId!==mapId;n++){
    const warp=world.map.warps.find(w=>w.toMap===mapId);if(!warp)throw Error('No warp to '+mapId);
    if(world.map.outdoor&&!MAPS[mapId].outdoor&&world.map.tiles[warp.y]?.[warp.x]==='d'){if(!walkTo(warp.x,warp.y+1))continue;face('up');press('up');settle();}
    else{walkTo(warp.x,warp.y);settle();}
   }
   if(state.pos.mapId!==mapId)throw Error('Door did not enter '+mapId+' '+JSON.stringify({pos:state.pos,moving:world.moving,fadeIn:world.fadeIn,fadeOut:world.fadeOut,msg:world.msg.isOpen,npcs:world.visibleNpcs().map(n=>({id:n.id,x:n.x,y:n.y}))}));
  }
  function cross(dir){
   const map=world.map,y=dir==='up'?0:map.tiles.length-1,candidates=Array.from({length:map.tiles[y].length},(_,x)=>({x,path:pathTo(x,y)})).filter(c=>c.path).sort((a,b)=>a.path.length-b.path.length);
   if(!candidates.length)throw Error('No '+dir+' exit '+map.id);if(!walkTo(candidates[0].x,y))return false;face(dir);press(dir);settle();if(state.pos.mapId===map.id)throw Error(dir+' exit blocked '+map.id);return true;
  }
  // The roads are no longer all vertical: the cities open side gates, Percorso 2 goes round the lake.
  function crossTo(target){
   const gates=world.map.warps.filter(w=>w.toMap===target).map(w=>({w,path:pathTo(w.x,w.y)})).filter(c=>c.path||state.pos.x===c.w.x&&state.pos.y===c.w.y).sort((a,b)=>(a.path?.length??0)-(b.path?.length??0));
   if(!gates.length)throw Error('No gate to '+target+' from '+world.map.id);
   const map=world.map.id;walkTo(gates[0].w.x,gates[0].w.y);settle();
   if(state.pos.mapId===map)throw Error('Gate to '+target+' blocked at '+state.pos.x+','+state.pos.y);
  }
  function heal(){
   while(state.pos.mapId.startsWith('palazzo_'))enterMap(state.pos.mapId==='palazzo_feed'?'tour_feed':'palazzo_feed');
   if(state.pos.mapId.startsWith('district_'))enterMap('tour_feed');
   if(state.pos.mapId==='tour_feed')enterMap('diplomacy_lobby');
   while(state.pos.mapId.startsWith('diplomacy_'))enterMap(state.pos.mapId==='diplomacy_lobby'?'futuro_piazza':'diplomacy_lobby');
   while(['futuro_sede','futuro_scissione','futuro_rebrand','futuro_tesoreria','futuro_piazza'].includes(state.pos.mapId)){
    const target=state.pos.mapId==='futuro_piazza'?'campo_largo':state.pos.mapId==='futuro_sede'?'futuro_piazza':'futuro_sede';enterMap(target);
   }
   while(['colle','palazzo','gymglobal','commissione'].includes(state.pos.mapId)){
    const exit=world.map.warps.find(w=>w.toMap!== 'colle');walkTo(exit.x,exit.y);settle();
   }
   if(state.pos.mapId==='stretto'&&!state.flags['ponte-beaten'])enterMap('capitale');
   if(state.pos.mapId==='route1')cross('up');else if(state.pos.mapId==='route2')crossTo('mediopoli');else if(state.pos.mapId==='route3')crossTo('capitale');
   if(state.pos.mapId==='campo_largo'){const healer=world.visibleNpcs().find(n=>n.healer);interact(healer.x,healer.y);return;}
   const bar={borgo:'bar-borgo',mediopoli:'bar-medio',eurotown:'bar-euro',capitale:'bar-cap',stretto:'bar-stretto',offshore:'bar-offshore',bruxelles:'bar-bruxelles'}[state.pos.mapId];
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
  function useEarnedTessera(item='tessera'){
   const mon=state.party.find(m=>itemEvolution(m,item));
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
   if(state.hardMode){
    const startWild=[...battles.values()].filter(b=>!b.trainer).length;
    for(let n=0;n<2500&&(state.party.length<6||state.party[0].level<35);n++){
     if([...battles.values()].filter(b=>!b.trainer).length-startWild>=40)break;
     const lead=state.party[0];if(lead.hp<statsOf(lead).hp*.5||!lead.moves.some(s=>s.pp>0&&MOVES[s.id].power>0))heal();
     const cells=world.map.tiles.flatMap((row,y)=>[...row].flatMap((ch,x)=>TILES[ch]?.encounter&&!world.isBlocked(x,y)?[{x,y,path:pathTo(x,y)}]:[])).filter(c=>c.path?.length).sort((a,b)=>a.path.length-b.path.length);
     if(!cells.length)throw Error('No reachable Stretto training grass');walkTo(cells[0].x,cells[0].y);
    }
    trace('stretto-training-complete',{wildBattles:[...battles.values()].filter(b=>!b.trainer).length-startWild});await milestone('stretto-trained');heal();
   }
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
    if(state.party[0].level>=(state.hardMode?13:10)&&state.party.length>=3)break;
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
   if(!resumeCode){
   settle();enterMap('lab');
   // The lab opens on the three-card choice of the first companion; walking is for later.
   const deck=world.touchActions;if(!deck)throw Error('The lab did not offer the first-companion cards');
   deck[STARTERS.indexOf(id)].run();settle();
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
    heal();crossTo('route2');
    if(euroPlan==='tactical'){
     const startWild=[...battles.values()].filter(b=>!b.trainer).length;
     for(let n=0;state.party.length<4&&n<2500&&[...battles.values()].filter(b=>!b.trainer).length-startWild<15;n++){
      const lead=state.party[0];
      if(state.pos.mapId!=='route2'||lead.hp<statsOf(lead).hp*.5||!lead.moves.some(s=>s.pp>0&&MOVES[s.id].power>0)){
       heal();crossTo('route2');
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
     if(state.pos.mapId==='mediopoli'){heal();crossTo('route2');}
     if(state.pos.mapId==='route2')crossTo('eurotown');
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
   if(continuesTo('dazio')&&state.badges.includes('spread')){
    if(state.pos.mapId==='gymue'){walkTo(world.map.warps[0].x,world.map.warps[0].y);settle();}
    heal();
    if(capitalPlan==='prepared'){
     cross('up');
     const practiceNpc=world.visibleNpcs().find(n=>n.trainerId==='protocollista');interact(practiceNpc.x,practiceNpc.y);await milestone('route3-audit');
    }
    for(let n=0;state.pos.mapId!=='capitale'&&n<5;n++){
     if(state.pos.mapId==='eurotown'){heal();cross('up');}
     if(state.pos.mapId==='route3')crossTo('capitale');
    }
    if(state.pos.mapId!=='capitale')throw Error('Capitale not reached');
    await milestone('capitale');heal();enterMap('gymglobal');
    if(capitalPlan==='prepared')for(const trainerId of ['diplomatico','oligarca']){
     const practiceNpc=world.visibleNpcs().find(n=>n.trainerId===trainerId);interact(practiceNpc.x,practiceNpc.y);await milestone(`global-${trainerId}`);
     if(state.pos.mapId==='gymglobal'){walkTo(world.map.warps[0].x,world.map.warps[0].y);settle();}
     heal();enterMap('gymglobal');
    }
    if(state.hardMode&&capitalPlan==='prepared'){supplies();enterMap('gymglobal');}
    for(let attempt=1;attempt<=(state.hardMode?4:2)&&!state.badges.includes('dazio');attempt++){
     if(state.pos.mapId!=='gymglobal'){heal();enterMap('gymglobal');}
     const boss=world.visibleNpcs().find(n=>n.trainerId==='tycoon');interact(boss.x,boss.y);settle();await milestone(`dazio-result-${attempt}`);
    }
    await milestone('dazio-result');
   }
   if((strettoPlan==='prepared'||endAt==='capitano')&&state.badges.includes('dazio'))await visitStretto();
   if(continuesTo('boss')&&state.badges.includes('dazio')){
    if(courtPlan==='prepared')supplies();else heal();prepareArchive();enterMap('palazzo');
    for(let attempt=1;attempt<=2&&!state.flags['boss-beaten'];attempt++){
     if(state.pos.mapId!=='palazzo'){heal();enterMap('palazzo');}
     const npc=world.visibleNpcs().find(n=>n.trainerId==='boss');interact(npc.x,npc.y);await milestone(`palazzo-result-${attempt}`);
    }
    if(continuesTo('garante')&&state.flags['boss-beaten']){
     heal();enterMap('palazzo');enterMap('colle');await milestone('colle');
     if(courtPlan==='prepared')for(const trainerId of ['giudice1','giudice2','giudice3']){
      const npc=world.visibleNpcs().find(n=>n.trainerId===trainerId);
      if(npc)interact(npc.x,npc.y);await milestone(`colle-${trainerId}`);
      heal();enterMap('palazzo');enterMap('colle');
     }
     if(courtPlan==='prepared'){supplies();prepareArchive();enterMap('palazzo');enterMap('colle');await milestone('garante-supplies');}
     for(let attempt=1;attempt<=(state.hardMode?4:2)&&!state.flags['garante-beaten'];attempt++){
      if(state.hardMode&&attempt>1&&courtPlan==='prepared'){supplies();prepareArchive();prepareKit();}
      if(state.pos.mapId!=='colle'){heal();enterMap('palazzo');enterMap('colle');}
      const npc=world.visibleNpcs().find(n=>n.trainerId==='garante');interact(npc.x,npc.y);await milestone(`garante-result-${attempt}`);
     }
    }
   }
   }
   if(continuesTo('tesoriere')&&state.flags['garante-beaten']&&!state.flags['offshore-beaten']){
    await milestone('earned-resume');supplies();prepareArchive();
    if(!state.flags['veh-traghetto'])interact(4,19);
    enterMap('stretto');enterMap('offshore');await milestone('offshore-arrival');heal();
    if(offshorePlan==='prepared'){
     const initialWild=[...battles.values()].filter(b=>!b.trainer).length;
     for(let n=0;n<500&&state.party.length<6&&[...battles.values()].filter(b=>!b.trainer).length-initialWild<12;n++){
      const lead=state.party[0];if(lead.hp<statsOf(lead).hp*.5||!lead.moves.some(s=>s.pp>0&&MOVES[s.id].power>0))heal();
      const cells=world.map.tiles.flatMap((row,y)=>[...row].flatMap((ch,x)=>TILES[ch]?.encounter&&!world.isBlocked(x,y)?[{x,y,path:pathTo(x,y)}]:[])).filter(c=>c.path?.length).sort((a,b)=>a.path.length-b.path.length);
      if(!cells.length)throw Error('No legal offshore recruitment grass');walkTo(cells[0].x,cells[0].y);
     }
     await milestone('offshore-recruitment');heal();prepareArchive();
     supplies();prepareKit();
     for(const trainerId of ['commercialista','prestanome']){
      for(let attempt=1;attempt<=2&&!state.defeatedTrainers.includes(trainerId);attempt++){
       const npc=world.visibleNpcs().find(n=>n.trainerId===trainerId);interact(npc.x,npc.y);await milestone(`offshore-${trainerId}-${attempt}`);heal();supplies();
      }
     }
    }
    for(let attempt=1;attempt<=2&&!state.flags['offshore-beaten'];attempt++){
     if(state.pos.mapId!=='offshore')throw Error('Offshore loss did not return to island');
     heal();const npc=world.visibleNpcs().find(n=>n.trainerId==='tesoriere');interact(npc.x,npc.y);await milestone(`tesoriere-result-${attempt}`);
    }
   }

   if(continuesTo('commissione')&&state.flags['garante-beaten']&&!state.flags['ue-beaten']){
    await milestone('earned-brux-resume');settle();
    if(state.pos.mapId==='commissione'){const exit=world.map.warps.find(w=>w.toMap==='bruxelles');walkTo(exit.x,exit.y);settle();}
    if(state.pos.mapId!=='offshore'&&state.pos.mapId!=='bruxelles')throw Error('Brussels segment needs earned maritime arrival');
    if(bruxPlan==='prepared'){supplies();prepareArchive();prepareKit();}else heal();
    if(state.pos.mapId!=='bruxelles')enterMap('bruxelles');await milestone('bruxelles-arrival');heal();
    if(bruxPlan==='prepared'){
     for(const trainerId of ['eu-relatore','eu-eurodeputato','eu-commissario','eu-lobby']){
      for(let attempt=1;attempt<=2&&!state.defeatedTrainers.includes(trainerId);attempt++){
       const npc=world.visibleNpcs().find(n=>n.trainerId===trainerId);interact(npc.x,npc.y);await milestone(`brux-${trainerId}-${attempt}`);heal();
       if(!world.visibleNpcs().some(n=>n.shop))enterMap('offshore');supplies();if(state.pos.mapId!=='bruxelles')enterMap('bruxelles');
      }
     }
     heal();prepareArchive();
    }
    for(let attempt=1;attempt<=2&&!state.flags['ue-beaten'];attempt++){
     heal();enterMap('commissione');const npc=world.visibleNpcs().find(n=>n.trainerId==='commissione');interact(npc.x,npc.y);await milestone(`commissione-result-${attempt}`);
    }
   }
   if(continuesTo('photographer')&&state.flags['ue-beaten']&&!state.flags['campo-photo-complete']){
    await milestone('earned-campo-resume');settle();
    if(state.pos.mapId==='commissione') {const exit=world.map.warps.find(w=>w.toMap==='bruxelles');walkTo(exit.x,exit.y);settle();}
    if(state.pos.mapId==='bruxelles'){if(campoPlan!=='direct'){supplies();prepareArchive();prepareKit();}else heal();enterMap('campo_largo');}
    if(state.pos.mapId!=='campo_largo')throw Error('Campo segment requires earned Commissione route');
    const campoCare=()=>{heal();if(state.pos.mapId==='bruxelles'){enterMap('campo_largo');heal();}if(state.pos.mapId!=='campo_largo')throw Error('Recovery did not return to Campo');};
    await milestone('campo-arrival');campoCare();
    for(const [npcId,allyId] of [['campo-secretary','campo_secretary'],['quantum-centrist','quantum_centrist'],['civic-mayor','civic_mayor']]){for(let visit=0;visit<12&&!state.flags[`coalition-candidate-seen:${allyId}`];visit++){const npc=world.visibleNpcs().find(n=>n.id===npcId);interact(npc.x,npc.y);}}
    if(state.coalition.members.length!==2)throw Error('Real coalition selection did not complete');
    enterMap('retropalco_campo');await milestone('campo-retropalco');
    if(campoPlan==='recruit'&&state.party.length===6){boxPending=[...state.party].sort((a,b)=>a.level-b.level)[0].uid;const clerk=world.visibleNpcs().find(n=>n.box);interact(clerk.x,clerk.y);if(state.party.length!==5)throw Error('Actual Campo deposit did not finish');boxPending=null;}
    const exit=world.map.warps[0];walkTo(exit.x,exit.y);settle();
    if(campoPlan==='recruit'){
     const captures=state.runStats.captures;
     for(let n=0;n<500&&state.runStats.captures===captures;n++){
      const lead=state.party[0];if(lead.hp<statsOf(lead).hp*.5||!lead.moves.some(s=>s.pp>0&&MOVES[s.id].power>0))campoCare();
      const cells=world.map.tiles.flatMap((row,y)=>[...row].flatMap((ch,x)=>TILES[ch]?.encounter&&!world.isBlocked(x,y)?[{x,y,path:pathTo(x,y)}]:[])).filter(c=>c.path?.length).sort((a,b)=>a.path.length-b.path.length);
      if(!cells.length)throw Error('No reachable Campo recruitment grass');walkTo(cells[0].x,cells[0].y);
     }
     if(state.runStats.captures===captures||state.party.length!==6)throw Error('Campo recruitment did not complete');await milestone('campo-recruitment');campoCare();prepareArchive();
    }
    const photographer=world.visibleNpcs().find(n=>n.id==='campo-fotografo');interact(photographer.x,photographer.y);await milestone('campo-photo-choice');
    if(!state.flags['campo-photo-choice-complete'])throw Error('Photo choice not saved');
    // Challenges are voluntary; a resolved debate can be a win or a loss.
    for(let attempt=1;attempt<=2&&!state.flags['campo-debate-resolved'];attempt++){campoCare();const npc=world.visibleNpcs().find(n=>n.trainerId==='campo-debate');interact(npc.x,npc.y);await milestone(`campo-debate-${attempt}`);}
    if(campoPlan==='prepared')for(let attempt=1;attempt<=2&&!state.defeatedTrainers.includes('campo-claque');attempt++){campoCare();const npc=world.visibleNpcs().find(n=>n.trainerId==='campo-claque');interact(npc.x,npc.y);await milestone(`campo-claque-${attempt}`);}
    for(let attempt=1;attempt<=2&&!state.flags['campo-photo-complete'];attempt++){campoCare();const npc=world.visibleNpcs().find(n=>n.id==='campo-fotografo');interact(npc.x,npc.y);await milestone(`campo-photographer-${attempt}`);}
   }
    if(endAt==='photographer'&&state.flags['campo-photo-complete']){const npc=world.visibleNpcs().find(n=>n.id==='campo-fotografo');interact(npc.x,npc.y);await milestone('campo-verbale');}
   if(continuesTo('future')&&!state.flags.futureResolved){
    if(!state.flags['campo-photo-complete'])throw Error('Future requires earned Campo save');
    settle();await milestone('future-earned-resume');heal();enterMap('futuro_piazza');await milestone('future-arrival');
    const talk=id=>{const npc=world.visibleNpcs().find(n=>n.id===id);if(!npc)throw Error('Missing Future NPC '+id);interact(npc.x,npc.y);};
    for(let n=0;n<5&&!state.flags['future-badge-received'];n++)talk('future-reception');
    talk('future-reporter');talk('future-treasurer');
    if(futureRepair){const before={money:state.money,morale:structuredClone(state.morale)};repairPending=true;press('start');settle();repairPending=false;trace('future-civic-repairs',{before,after:{money:state.money,morale:structuredClone(state.morale)}});await milestone('future-civic-repairs');}
    enterMap('futuro_sede');await milestone('future-hq');
    for(const [map,npc]of [['futuro_scissione','future-split-clerk'],['futuro_rebrand','future-brand-clerk'],['futuro_tesoreria','future-money-clerk']]){enterMap(map);talk(npc);await milestone(map);enterMap('futuro_sede');}
    for(const id of ['future-lever-a','future-lever-b']){for(let n=0;n<5&&!state.flags[id+'-on'];n++)talk(id);}
    if(!state.flags['future-shortcut-open'])throw Error('Future manifests did not open');await milestone('future-manifests');
    talk('future-choice-desk');if(!state.flags['future-choice-complete'])throw Error('Future choice not saved');await milestone('future-choice');
    const care=()=>{heal();if(state.pos.mapId==='bruxelles'){enterMap('campo_largo');heal();}if(state.pos.mapId!=='campo_largo')throw Error('Future care did not return to Campo');enterMap('futuro_piazza');enterMap('futuro_sede');};
    for(let attempt=1;attempt<=3&&!state.flags.futureResolved;attempt++){care();talk('future-boss');await milestone('future-boss-'+attempt);}
    if(state.flags.futureResolved){
     talk('future-choice-desk');await milestone('future-verbale');
     if(futureEvolve){
      heal();enterMap('retropalco_campo');if(state.party.length===6){boxPending=[...state.party].sort((a,b)=>a.level-b.level)[0].uid;const clerk=world.visibleNpcs().find(n=>n.box);interact(clerk.x,clerk.y);if(state.party.length!==5)throw Error('Future branch deposit missing');boxPending=null;}
      enterMap('campo_largo');heal();enterMap('futuro_piazza');futureRecruit=true;
      for(let n=0;n<600&&!state.party.some(m=>m.speciesId==='vannaccix');n++){
       const lead=state.party[0];if(lead.hp<statsOf(lead).hp*.5||!lead.moves.some(s=>s.pp>0&&MOVES[s.id].power>0)){heal();enterMap('futuro_piazza');}
       const cells=world.map.tiles.flatMap((row,y)=>[...row].flatMap((ch,x)=>TILES[ch]?.encounter&&!world.isBlocked(x,y)?[{x,y,path:pathTo(x,y)}]:[])).filter(c=>c.path?.length).sort((a,b)=>a.path.length-b.path.length);
       if(!cells.length)throw Error('No Future recruitment route');walkTo(cells[0].x,cells[0].y);
      }
      futureRecruit=false;if(!state.party.some(m=>m.speciesId==='vannaccix'))throw Error('No actual Vannaccix recruited');await milestone('future-vannaccix');useEarnedTessera('tessera_futuro');if(!state.party.some(m=>m.speciesId==='futurorso'))throw Error('Earned future item did not evolve');await milestone('future-evolution');
      heal();enterMap('futuro_piazza');
     }else enterMap('futuro_piazza');
     enterMap('diplomacy_lobby');await milestone('future-diplomacy');
    }
   }
   if(continuesTo('diplomacy')&&!state.flags.diplomacyComplete){
    if(!state.flags.futureResolved||state.pos.mapId!=='diplomacy_lobby')throw Error('Diplomacy requires earned Future arrival');
    settle();await milestone('diplomacy-earned-resume');heal();enterMap('futuro_piazza');enterMap('diplomacy_lobby');await milestone('diplomacy-arrival');
    const talk=id=>{const npc=world.visibleNpcs().find(n=>n.id===id);if(!npc)throw Error('Missing diplomacy NPC '+id);interact(npc.x,npc.y);};
    talk('diplomacy-host');
    for(const [map,npc]of [['diplomacy_loyalty','diplomacy-choice-loyalty'],['diplomacy_autonomy','diplomacy-choice-autonomy'],['diplomacy_home','diplomacy-choice-home']]){enterMap(map);talk(npc);await milestone(map);enterMap('diplomacy_lobby');}
    if(!state.flags['diplomacy-choice-complete'])throw Error('Diplomatic choice not registered');await milestone('diplomacy-choice');
    for(let attempt=1;attempt<=2&&!state.flags.diplomacyComplete;attempt++){
     heal();if(state.pos.mapId==='bruxelles'){enterMap('campo_largo');heal();}if(state.pos.mapId!=='campo_largo')throw Error('Diplomacy care did not return to Campo');enterMap('futuro_piazza');enterMap('diplomacy_lobby');enterMap('diplomacy_terrace');
     if(!state.flags.diplomacyComplete)talk('partner-perfetto');await milestone('diplomacy-boss-'+attempt);
    }
    if(state.flags.diplomacyComplete){if(state.pos.mapId==='diplomacy_terrace')enterMap('diplomacy_lobby');await milestone('diplomacy-verbale');enterMap('tour_feed');await milestone('diplomacy-tour');}
   }
   if(continuesTo('tour')&&!state.flags.tourComplete){
    if(!state.flags.diplomacyComplete)throw Error('Tour requires an earned Hotel victory');
    settle();await milestone('tour-earned-resume');
    const talk=id=>{const npc=world.visibleNpcs().find(n=>n.id===id);if(!npc)throw Error('Missing Tour NPC '+id);interact(npc.x,npc.y);};
    const care=()=>{heal();if(state.pos.mapId==='bruxelles'){enterMap('campo_largo');heal();}if(state.pos.mapId!=='campo_largo')throw Error('Tour care did not return to Campo');enterMap('futuro_piazza');enterMap('diplomacy_lobby');enterMap('tour_feed');};
    const islandAlly=state.coalition.members.find(m=>m.status!=='broken'&&!state.election.endorsementDistrictByAlly[m.allyId])?.allyId;
    if(!islandAlly)throw Error('Tour requires an available, actually recruited ally');
    for(const [district,index,ally]of [['nord',1],['centro',2],['sud',2],['isole',3,islandAlly],['feed',2]]){
     care();enterMap('district_'+district);await milestone('tour-'+district+'-arrival');
     tourTarget={index:0};talk('district-kiosk-'+district);await milestone('tour-'+district+'-debate');
     if(!state.election.districts.find(d=>d.id===district).outcomes.some(o=>o.action==='debate'))throw Error('No manual debate result: '+district);
     if(state.pos.mapId!=='district_'+district){care();enterMap('district_'+district);}
     tourTarget={index,ally};talk('district-kiosk-'+district);await milestone('tour-'+district+'-closed');
     if(!state.flags['district-complete:'+district])throw Error('Tour district not closed '+district);
     enterMap('tour_feed');
    }
    if(!state.flags.tourComplete||state.election.phase!=='ready')throw Error('Five manually earned dossiers did not open Palazzo');
    await milestone('tour-five-dossiers');enterMap('palazzo_feed');await milestone('tour-palazzo');
   }
   if(continuesTo('palace')){
    if(!state.flags.tourComplete||state.election.phase!=='ready')throw Error('Palace requires untouched earned Tour save');
    settle();await milestone('palace-earned-resume');
    const talk=id=>{const npc=world.visibleNpcs().find(n=>n.id===id);if(!npc)throw Error('Missing Palace NPC '+id);interact(npc.x,npc.y);};
    for(const [map,prefix]of [['palazzo_algoritmo','algorithm'],['palazzo_factcheck','factcheck'],['palazzo_talkshow','talkshow'],['palazzo_silenzio','silence']]){
     enterMap(map);talk('palace-'+prefix+'-a');await milestone(map+'-read');talk('palace-'+prefix+'-b');await milestone(map+'-verified');enterMap('palazzo_feed');
    }
    if(!state.flags.palaceRoomsComplete)throw Error('Four verified dossiers did not open studio');await milestone('palace-four-verdicts');
    if(endAt==='election'){
     heal();if(state.pos.mapId==='bruxelles'){enterMap('campo_largo');heal();}enterMap('futuro_piazza');enterMap('diplomacy_lobby');enterMap('tour_feed');enterMap('palazzo_feed');enterMap('palazzo_feed_studio');await milestone('palace-studio');
     electionConfirm=true;talk('palace-election-desk');
     for(let i=0;i<100&&!state.flags.atto3Complete;i++){await new Promise(r=>setTimeout(r,20));settle();}
     if(!state.flags.atto3Complete)throw Error('Native Election Night did not reach earned epilogue');
     await milestone('election-earned-ending');enterMap('palazzo_feed');await milestone('election-reopened-world');
    }
   }
  }catch(e){failure=e.message;trace('failure',{message:failure,pos:{...state.pos},npcs:world.visibleNpcs().map(n=>({id:n.id,x:n.x,y:n.y,canWander:n.canWander})),tiles:world.map.tiles});}
  return {levelCap:LEVEL_CAP,id,seed,plan,endAt,initialFlow,initialState,euroPlan,capitalPlan,courtPlan,civicPlan,archivePlan,strettoPlan,kitPlan,bruxPlan,photoPlan,campoPlan,narrative,frames,steps:state.stepsTotal,events,milestones,lessons:[...lessons.values()],battles:[...battles.values()],failure,final:{hardMode:state.hardMode,map:state.pos.mapId,money:state.money,badges:state.badges,flags:state.flags,morale:state.morale,coalition:state.coalition,election:state.election,defeatedTrainers:state.defeatedTrainers,party:state.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp,heldItem:m.heldItem??null,moves:m.moves})),bag:state.bag,runStats:state.runStats},codes,shots};
 },{id,seed,plan,practice,endAt,hard,endpoints,euroPlan,capitalPlan,courtPlan,civicPlan,archivePlan,strettoPlan,kitPlan,offshorePlan,bruxPlan,photoPlan,campoPlan,futurePlan,futureRepair,futureEvolve,diplomacyPlan,resumeCode});
 result.resume=resumePath?{report:resumePath,stage:resumeStage,parentId:resumeReport.id,parentSeed:resumeReport.seed}:null;result.offshorePlan=offshorePlan;result.futurePlan=futurePlan;result.futureRepair=futureRepair;result.futureEvolve=futureEvolve;result.diplomacyPlan=diplomacyPlan;
 assert.deepEqual(errors,[]);
 mkdirSync('artifacts/campaign-native',{recursive:true});mkdirSync('artifacts/screens/campaign-native',{recursive:true});
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/campaign-native/${label}-${id}-${plan}-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 delete result.shots;writeFileSync(`artifacts/campaign-native/${label}-${id}-${plan}-${seed}.json`,JSON.stringify(result,null,2));
 if(process.env.CHECK_GROWTH!=='0')for(const b of result.battles.filter(b=>b.outcome==='caught')){
  const old=b.before.party.find(m=>m.uid===b.recipientUid),grown=b.after.party.find(m=>m.uid===b.recipientUid);
  if(old.level<result.levelCap)assert.equal(grown.exp-old.exp,b.announcedConsensus,'Recruitment reward differs from native announcement');
  else assert.equal(grown.exp,old.exp,'Level cap ignored');
  assert.equal(b.after.party.find(m=>m.uid===b.foes[0].uid).exp,b.foes[0].exp,'New recruit received EXP for its own recruitment');
  if(b.before.bag.divisa)for(const m of b.before.party.filter(m=>m.uid!==b.recipientUid&&m.hp>0)){
   const after=b.after.party.find(a=>a.uid===m.uid);if(after.hp>0)assert.equal(after.exp-m.exp,m.level>=result.levelCap?0:Math.max(1,Math.floor(b.announcedConsensus/2)),'Existing bench did not receive the announced share');
  }
 }
 if(process.env.EXPECT_BADGE==='1')assert.ok(result.final.badges.includes(endAt),`Campaign did not earn ${endAt}`);
 if(process.env.EXPECT_COMPLETE==='1')assert.ok(result.final.flags[endAt==='capitano'?'ponte-beaten':endAt==='tesoriere'?'offshore-beaten':endAt==='commissione'?'ue-beaten':endAt==='photographer'?'campo-photo-complete':endAt==='future'?'futureResolved':endAt==='diplomacy'?'diplomacyComplete':endAt==='tour'?'tourComplete':endAt==='palace'?'palaceRoomsComplete':endAt==='election'?'atto3Complete':`${endAt}-beaten`],`Campaign did not defeat ${endAt}`);
 console.log(JSON.stringify({id,seed,plan,failure:result.failure,milestones:result.milestones,final:result.final,battles:result.battles.map(b=>({trainer:b.trainer,outcome:b.outcome,foes:b.foes}))},null,2));
 if(result.failure)process.exitCode=1;
}finally{await browser.close();}
