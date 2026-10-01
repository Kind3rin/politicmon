import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5179'}/scripts/perf-harness.html`,{waitUntil:'networkidle'});
 const result=await page.evaluate(async()=>{
  const {Screen}=await import('/src/engine/screen.ts');const {SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState,loadGame}=await import('/src/game/state.ts');const {createMonster,evolve,levelEvolution}=await import('/src/game/monster.ts');
  const {DEX_ORDER,SPECIES}=await import('/src/data/species.ts');const {PartyScene}=await import('/src/scenes/PartyScene.ts');
  const {EvolutionScene}=await import('/src/scenes/EvolutionScene.ts');const {BagScene}=await import('/src/scenes/BagScene.ts');
  const {CivicScene}=await import('/src/scenes/CivicScene.ts');const {CIVIC_EVENTS}=await import('/src/data/civicEvents.ts');
  const {TradeScene}=await import('/src/scenes/TradeScene.ts');
  // Vite may stamp singleton dependencies after HMR. Use the scene's exact
  // dependency URL instead of creating a second multiplayer instance.
  const tradeSource=await(await fetch('/src/scenes/TradeScene.ts')).text();
  const mpUrl=tradeSource.match(/import \{ mp \} from "([^"]+)"/)?.[1];
  if(!mpUrl)throw Error('Trade multiplayer dependency not found');
  const {mp}=await import(mpUrl);
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');const {audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  const entries=Object.fromEntries(DEX_ORDER.flatMap(id=>[[`mon:${id}`,`monsters/${id}.png`],[`mon:frames:${id}`,`monsters/animated/${id}.png`]]));
  for(const id of ['evolution','dossier'])entries[`ui:${id}`]=`ui/${id}.png`;entries['civic:pompa']='ui/civic/pompa.png';
  preloadSprites(entries);await waitForSprites(Object.keys(entries),8000);
  const stack=new SceneStack();let pressed='';const input={wasPressed:b=>b===pressed,isDown:()=>false,tapInRect:()=>false,consumeTap:()=>null};
  const press=(scene,key)=>{pressed=key;scene.update(.1);pressed='';};
  const screen=new Screen(document.createElement('canvas'));const issues=[],shots={};let boxes=[],name='',checked=0;
  const text=screen.text.bind(screen);screen.text=(value,x,y,color,scale=1)=>{
   const m=screen.ctx.getTransform(),base=screen.ctx.canvas.width/240;
   const box={value,x:(m.a*x+m.e)/base,y:(m.d*y+m.f)/base,w:Math.max(0,value.length*6-1)*scale*m.a/base,h:7*scale*m.d/base};
   if(box.x<0||box.y<0||box.x+box.w>240||box.y+box.h>180)issues.push({name,kind:'bounds',...box});
   for(const old of boxes)if(box.w&&old.w&&box.x<old.x+old.w&&box.x+box.w>old.x&&box.y<old.y+old.h&&box.y+box.h>old.y)issues.push({name,kind:'overlap',value,other:old.value});
   boxes.push(box);text(value,x,y,color,scale);
  };
  const draw=(key,scene,capture=false)=>{name=key;boxes=[];scene.draw(screen);checked++;if(capture)shots[key]=screen.ctx.canvas.toDataURL('image/png');};
  for(const id of DEX_ORDER)for(const held of [false,true]){
   const state=newGameState();state.party=[createMonster(id,32)];if(held)state.party[0].heldItem='caffettiera';state.party[0].status='scandalo';
   const scene=new PartyScene(stack,input,state,{mode:'view'});scene.summary=state.party[0];
   const before=JSON.stringify(state);
   for(let p=0;p<5;p++){
    scene.summaryPage=p;
    for(let entry=0;entry<(p===1?state.party[0].moves.length:1);entry++){
     scene.detailIndex=entry;
     for(let scroll=0;scroll<=Math.max(0,scene.summaryLines(state.party[0]).length-7);scroll++){
      scene.summaryScroll=scroll;draw(`card-${id}-${held}-${p}-${entry}-${scroll}`,scene,id==='giorgetta'&&held&&scroll===0&&entry===0);
     }
    }
   }
   if(JSON.stringify(state)!==before)throw Error('Reading dossier changed state');
  }
  for(const id of DEX_ORDER)for(const rule of SPECIES[id].evolutions??[]){
   const mon=createMonster(id,Math.max(rule.level??30,30));mon.heldItem='caffettiera';mon.moves[0].pp=0;mon.status='scandalo';
   const scene=new EvolutionScene(stack,input,id,rule.id,()=>{}, {mon});
   for(let p=0;p<3;p++){
    scene.page=p;
    for(let scroll=0;scroll<=Math.max(0,scene.lines().length-7);scroll++){
     scene.scroll=scroll;draw(`evo-${id}-${rule.id}-${p}-${scroll}`,scene,id==='salvinott'&&p===1&&scroll===0);
    }
   }
   scene.review=false;
   for(const reduced of [false,true])for(const phase of [0,1,2,3]){scene.options.reduceEffects=reduced;scene.phase=phase;scene.phaseT=1.2;draw(`evo-stage-${id}-${rule.id}-${reduced}-${phase}`,scene,id==='giorgetta'&&!reduced&&phase===3);}
  }
  // Real Party routing, decline, re-entry at level cap and accepted save.
  const state=newGameState();state.party=[createMonster('salvinott',55),createMonster('giorgetta',18)];state.party[0].heldItem='caffettiera';
  const party=new PartyScene(stack,input,state,{mode:'view'});stack.replace(party);press(party,'a');
  press(party,'a');press(party,'start');if(party.detailIndex!==1)throw Error('Moves navigation failed');
  press(party,'a');press(party,'a');const before=JSON.stringify(state);press(party,'start');
  let evo=stack.top;if(evo.constructor.name!=='EvolutionScene')throw Error('Career does not open comparison');
  press(evo,'b');if(stack.top!==party||JSON.stringify(state)!==before)throw Error('Decline mutated state');
  state.sondaggi=49;press(party,'start');evo=stack.top;if(evo.toId!==levelEvolution(state.party[0],49))throw Error('Polling branch stale');
  press(evo,'a');for(let i=0;i<60;i++)evo.update(.1);press(evo,'a');
  if(stack.top!==party||state.party[0].speciesId!=='salvinurlo'||loadGame().party[0].speciesId!=='salvinurlo')throw Error('Career commit not persisted');
  const after=JSON.stringify(state);evo.update(.1);if(JSON.stringify(state)!==after)throw Error('Double evolution callback');
  // Actual bag -> candidate -> review. A canceled item never leaves the bag.
  for(const accept of [false,true]){
   const s=newGameState();s.party=[createMonster('salvinator',30)];s.bag={tessera:1};const bag=new BagScene(stack,input,s,{inBattle:false});stack.replace(bag);
   press(bag,'a');press(stack.top,'a');const review=stack.top;
   if(review.constructor.name!=='EvolutionScene'||s.bag.tessera!==1)throw Error('Item consumed before review');
   if(!accept){press(review,'b');if(s.party[0].speciesId!=='salvinator'||s.bag.tessera!==1)throw Error('Canceled tessera consumed');}
   else {press(review,'a');for(let i=0;i<60;i++)review.update(.1);press(review,'a');if(s.party[0].speciesId!=='capitanone'||s.bag.tessera)throw Error('Tessera commit failed');}
  }
  // Read-only reduced presentation has no pose/time motion or full screen flash.
  // A locally completed trade remains committed when its evolution is declined.
  for(const accept of [false,true]){
   const s=newGameState();s.party=[createMonster('giorgetta',18)];const received=createMonster('contemorfo',30);
   const trade=new TradeScene(stack,input,s,{peerId:'fixture',peerNick:'FIXTURE'});stack.replace(trade);
   const update=mp.update,tick=mp.trade.tick;mp.update=()=>{};mp.trade.tick=()=>{};
   mp.trade.phase='committed';mp.trade.myOfferUid=s.party[0].uid;mp.trade.peerOffer=received;
   trade.msg.show=(_lines,done)=>done?.();
   try{trade.update(.1);}finally{mp.update=update;mp.trade.tick=tick;}
   const review=stack.top;if(review?.constructor.name!=='EvolutionScene'||s.party[0]!==received)throw Error(`Trade review missing: accept=${accept}, scene=${review?.constructor.name}, received=${received.speciesId}, committed=${trade.committed}, phase=${mp.trade.phase}, msgOpen=${trade.msg.isOpen}`);
   if(accept){press(review,'a');for(let i=0;i<60;i++)review.update(.1);press(review,'a');}
   else press(review,'b');
   if(stack.top||mp.duelBusy||mp.trade.phase!=='idle'||s.party.length!==1||s.party[0].speciesId!==(accept?'conteblob':'contemorfo'))throw Error('Trade decline/accept routing failed');
   if(loadGame().party[0].speciesId!==s.party[0].speciesId)throw Error('Trade career not persisted');
  }
  const mon=createMonster('giorgetta',18);let completed=0;
  const reduced=new EvolutionScene(stack,input,'giorgetta','giorgiagon',()=>completed++,{mon,reduceEffects:true,battleSpeed:2});stack.replace(reduced);
  press(reduced,'a');for(let i=0;i<20;i++)reduced.update(.1);if(reduced.phase!==3||reduced.time!==0||completed)throw Error('Reduced reveal contract failed');press(reduced,'a');reduced.update(.1);if(completed!==1)throw Error('Callback not exactly once');
  const civic=new CivicScene(stack,input,newGameState(),CIVIC_EVENTS.pompa);for(let i=0;i<3;i++){civic.index=i;draw(`fuel-${i}`,civic,i===0);}
  return{issues,shots,checked};
 });
 mkdirSync('artifacts/screens/evolution-dossier',{recursive:true});mkdirSync('artifacts/evolution-dossier',{recursive:true});
 writeFileSync('artifacts/evolution-dossier/layout.json',JSON.stringify(result.issues,null,2));assert.deepEqual(errors,[]);assert.deepEqual(result.issues,[]);
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/evolution-dossier/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS: ${result.checked} dossier/evolution layouts; deferred polling branches, PP/status integrity, bag cancel/commit, persisted career, reduced effects and callback parity.`);
}finally{await browser.close();}
