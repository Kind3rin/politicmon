// Navigation/layout fixtures are separate from earned-save campaign playtests.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
const name=process.env.BROWSER==='webkit'?'webkit':'chromium',browser=await ({chromium,webkit}[name]).launch();
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5190'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async()=>{
  const {Input}=await import('/src/engine/input.ts'),{Screen}=await import('/src/engine/screen.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts'),{newGameState}=await import('/src/game/state.ts'),{createMonster,statsOf}=await import('/src/game/monster.ts');
  const {audio}=await import('/src/engine/audio.ts'),{mp}=await import('/src/net/mp.ts');audio.enabled=false;mp.setEnabled(false);
  // Isolate navigation from random wild battles. Earned-save playtests retain them.
  const {MAPS}=await import('/src/data/maps.ts');MAPS.offshore.encounterRate=0;MAPS.stretto.encounterRate=0;
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');
  const paths=['tiles/offshore_bar.png','tiles/offshore_palm.png',...['commercialista','prestanome','tesoriere'].map(id=>`ui/boss/${id}.png`),...['north','south','west','east'].map(d=>`chars/npc_offshore-treasurer_${d}.png`)];
  preloadSprites(Object.fromEntries(paths.map(p=>['fixture:'+p,p])));await waitForSprites(paths.map(p=>'fixture:'+p));
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);const screen=new Screen(canvas),input=new Input(),stack=new SceneStack(),shots={};
  const state=newGameState();state.flags['intro-done']=true;state.flags['starter-chosen']=true;state.flags['rival1-beaten']=true;state.flags['dex-received']=true;state.flags['boss-beaten']=true;state.flags['garante-beaten']=true;state.flags['ponte-beaten']=true;state.flags['veh-traghetto']=true;
  state.badges=['auditel','spread','dazio'];state.party=[createMonster('schleinix',35),createMonster('movimenton',32)];state.party[0].hp=3;state.party[0].moves[0].pp=1;
  state.pos={mapId:'offshore',x:5,y:9,facing:'right'};const world=new WorldScene(stack,input,state);stack.push(world);
  const codes={a:'KeyZ',b:'KeyX',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  // Panel scenes (briefings, choices, results) are driven by the on-screen UI kit, not by keys: A runs the highlighted action, B runs Back.
  const tick=b=>{const top=stack.top,panel=b&&top!==world&&top?.uiPanel;if(panel){const i=panel.primary??panel.selected??0,act=panel.actions?.[i];if(b==='a'&&act&&!act.disabled)act.run();else if(b==='b')panel.back?.run();stack.update(.1);input.endFrame();return;}if(b)document.dispatchEvent(new KeyboardEvent('keydown',{code:codes[b],bubbles:true}));stack.update(.1);input.endFrame();if(b)document.dispatchEvent(new KeyboardEvent('keyup',{code:codes[b],bubbles:true}));};
  const check=(ok,label)=>{if(!ok)throw Error(label);};
  const pick=i=>{const act=stack.top.uiPanel?.actions?.[i];if(!act||act.disabled)throw Error('No action '+i+' on '+stack.top?.constructor.name);act.run();stack.update(.1);input.endFrame();};
  function settle(){for(let n=0;n<1000;n++){check(stack.top===world,'Unexpected scene on route '+stack.top?.constructor.name);if(world.msg.isOpen)tick('a');else if(world.justEnteredMap||world.moving||world.fadeOut||world.fadeT||world.exclaimT||world.healFx)tick();else return;}throw Error('Route did not settle');}
  const dirs=[['up',0,-1],['left',-1,0],['right',1,0],['down',0,1]];
  function path(tx,ty){const q=[[state.pos.x,state.pos.y]],parents=new Map([[q[0].join(','),null]]);for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){const p=[];let k=x+','+y;while(parents.get(k)){const prev=parents.get(k);p.unshift(prev.d);k=prev.k;}return p;}for(const[d,dx,dy]of dirs){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(parents.has(k)||world.isBlocked(nx,ny)||world.map.warps.some(w=>w.x===nx&&w.y===ny&&(nx!==tx||ny!==ty)))continue;parents.set(k,{d,k:x+','+y});q.push([nx,ny]);}}return null;}
  function walk(tx,ty){const map=state.pos.mapId;for(let n=0;n<1000;n++){settle();if(state.pos.mapId!==map)return;if(state.pos.x===tx&&state.pos.y===ty)return;const p=path(tx,ty);if(!p?.length){tick();continue;}tick(p[0]);if(world.askMenu)return;}throw Error('Walk bound');}
  async function shot(id){for(let n=0;n<15;n++){stack.draw(screen);await new Promise(r=>setTimeout(r,50));}const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(canvas,0,0,240,180);shots[id]=c.toDataURL();}
  function adjacent(npc){const candidates=dirs.map(([d,dx,dy])=>({d:dirs.find(v=>v[1]===-dx&&v[2]===-dy)[0],x:npc.x+dx,y:npc.y+dy})).filter(c=>!world.isBlocked(c.x,c.y)&&path(c.x,c.y));check(candidates.length,'No adjacent route '+npc.id);candidates.sort((a,b)=>path(a.x,a.y).length-path(b.x,b.y).length);const c=candidates[0];walk(c.x,c.y);if(state.pos.facing!==c.d)tick(c.d);}
  settle();walk(14,5);await shot('lido');
  const resources=()=>JSON.stringify({party:state.party,bag:state.bag,money:state.money,morale:state.morale});
  const money=state.money,morale=JSON.stringify(state.morale);
  walk(14,4);settle();check(state.pos.mapId==='bar-offshore','First door did not enter Lido');
  adjacent(world.visibleNpcs().find(n=>n.healer));tick('a');settle();
  check(state.party.every(m=>m.hp===statsOf(m).hp),'Lido did not heal');check(state.money===money&&JSON.stringify(state.morale)===morale,'Lido charged or changed morale');
  const exit=world.map.warps.find(w=>w.toMap==='offshore');check(exit,'Lido exit missing');walk(exit.x,exit.y);settle();check(state.pos.mapId==='offshore','Lido exit failed');walk(14,4);settle();check(state.pos.mapId==='bar-offshore','Second door did not enter');walk(exit.x,exit.y);settle();
  for(const id of ['commercialista','prestanome','tesoriere']){
   const npc=world.visibleNpcs().find(n=>n.trainerId===id);check(npc&&!npc.sightRange,'Challenge missing or automatic '+id);
   adjacent(npc);for(let n=0;n<20;n++)tick();check(stack.top===world&&!world.pendingBattle,'Sight started challenge '+id);
   const before=JSON.stringify(state);tick('a');for(let n=0;n<1000&&stack.top===world;n++)tick(world.msg.isOpen?'a':undefined);
   check(stack.top?.constructor.name==='BossBriefingScene','A did not open briefing '+id);await shot(id);tick('right');await shot(id+'-preparation');tick('b');
   check(stack.top===world&&JSON.stringify(state)===before&&!mp.duelBusy,'Cancel changed state '+id);
  }
  adjacent(world.visibleNpcs().find(n=>n.shop));const beforeShop=resources();tick('a');for(let n=0;n<1000&&stack.top===world;n++)tick(world.msg.isOpen?'a':undefined);
  check(stack.top?.constructor.name==='ShopScene','Island merchant inaccessible');tick('a');check(stack.top.quote,'Shop skipped quote');tick('b');tick('b');check(stack.top===world&&resources()===beforeShop,'Cancelled purchase charged or mutated party');
  walk(10,12);await shot('palms');const beforeReturn=resources();walk(2,9);check(world.askMenu,'Return has no confirmation');tick('a');settle();check(state.pos.mapId==='stretto','Pre-Treasurer return failed');check(resources()===beforeReturn,'Return healed or changed resources');
  const warp=world.map.warps.find(w=>w.toMap==='offshore');walk(warp.x,warp.y);check(world.askMenu,'Offshore return has no confirmation');tick('a');settle();
  check(state.pos.mapId==='offshore'&&!state.flags['offshore-beaten']&&!state.flags['hint-ue'],'Fixture acquired an unearned boss/route flag');
  walk(28,9);check(world.askMenu,'EU route did not open before Treasurer/Sherpa');const beforeEU=resources();tick('b');settle();check(state.pos.mapId==='offshore'&&resources()===beforeEU,'EU cancellation travelled or healed');walk(27,9);walk(28,9);check(world.askMenu,'EU confirmation did not reopen');tick('a');settle();check(state.pos.mapId==='bruxelles'&&!state.flags['offshore-beaten']&&!state.flags['hint-ue'],'EU travel required optional boss or Sherpa');check(resources()===beforeEU,'EU travel altered resources');
  // Layout-only fixture: render all four actual directional PNGs on the island.
  const used=[],old=screen.imageSpriteCropped.bind(screen);screen.imageSpriteCropped=(img,...args)=>{if(img.src.includes('npc_offshore-treasurer_'))used.push(img.src);return old(img,...args);};
  state.pos={mapId:'offshore',x:23,y:6,facing:'up'};world.loadMap('offshore');settle();const ghost=world.visibleNpcs().find(n=>n.trainerId==='tesoriere');
  for(const facing of ['up','down','left','right']){ghost.currentFacing=facing;await shot('treasurer-'+facing);}
  check(new Set(used.map(u=>u.split('/').at(-1).split('?')[0])).size===4,'Renderer used generic/duplicate directional cast');
  return {shots,paths,checks:['both Lido doors and free healing','no sight fights','three real briefings and cancellation','merchant quote/cancel without cost','pre-boss maritime return','EU cancellation and accepted travel before boss and Sherpa','four custom cast directions']};
 });
 assert.deepEqual(errors,[]);mkdirSync('artifacts/screens/offshore',{recursive:true});
 for(const[id,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/offshore/${name}-${id}.png`,Buffer.from(data.split(',')[1],'base64'));
 delete result.shots;writeFileSync(`artifacts/offshore-route-${name}.json`,JSON.stringify(result,null,2)+'\n');console.log(`PASS ${name}: Offshore world, both Lido doors, three voluntary briefings, merchant, return, EU cancellation/accepted travel and four cast directions.`);
}finally{await browser.close();}
