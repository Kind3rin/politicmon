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
  const {MAPS}=await import('/src/data/maps.ts');MAPS.offshore.encounterRate=0;MAPS.bruxelles.encounterRate=0;
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');
  const paths=['tiles/bruxelles_palace.png','tiles/bruxelles_cafe.png','tiles/commissione_floor.png','tiles/commissione_wall.png','tiles/commissione_carpet.png','tiles/commissione_table.png',...['eu-relatore','eu-eurodeputato','eu-commissario','eu-lobby','commissione'].map(id=>`ui/boss/${id}.png`),...['north','south','west','east'].map(d=>`chars/npc_commissione_${d}.png`)];
  preloadSprites(Object.fromEntries(paths.map(p=>['fixture:'+p,p])));await waitForSprites(paths.map(p=>'fixture:'+p));
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);const screen=new Screen(canvas),input=new Input(),stack=new SceneStack(),shots={};
  const state=newGameState();state.flags['intro-done']=true;state.flags['starter-chosen']=true;state.flags['rival1-beaten']=true;state.flags['dex-received']=true;state.flags['boss-beaten']=true;state.flags['garante-beaten']=true;state.flags['ponte-beaten']=true;state.flags['veh-traghetto']=true;
  state.badges=['auditel','spread','dazio'];state.party=[createMonster('schleinix',35),createMonster('movimenton',32)];state.party[0].hp=3;state.party[0].moves[0].pp=1;
  state.pos={mapId:'bruxelles',x:14,y:13,facing:'up'};const world=new WorldScene(stack,input,state);stack.push(world);
  const codes={a:'KeyZ',b:'KeyX',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  const tick=b=>{if(b)document.dispatchEvent(new KeyboardEvent('keydown',{code:codes[b],bubbles:true}));stack.update(.1);input.endFrame();if(b)document.dispatchEvent(new KeyboardEvent('keyup',{code:codes[b],bubbles:true}));};
  const check=(ok,label)=>{if(!ok)throw Error(label);};
  function settle(){for(let n=0;n<1000;n++){check(stack.top===world,'Unexpected scene on route '+stack.top?.constructor.name);if(world.msg.isOpen)tick('a');else if(world.justEnteredMap||world.moving||world.fadeOut||world.fadeT||world.exclaimT||world.healFx)tick();else return;}throw Error('Route did not settle');}
  const dirs=[['up',0,-1],['left',-1,0],['right',1,0],['down',0,1]];
  function path(tx,ty){const q=[[state.pos.x,state.pos.y]],parents=new Map([[q[0].join(','),null]]);for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){const p=[];let k=x+','+y;while(parents.get(k)){const prev=parents.get(k);p.unshift(prev.d);k=prev.k;}return p;}for(const[d,dx,dy]of dirs){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(parents.has(k)||world.isBlocked(nx,ny)||world.map.warps.some(w=>w.x===nx&&w.y===ny&&(nx!==tx||ny!==ty)))continue;parents.set(k,{d,k:x+','+y});q.push([nx,ny]);}}return null;}
  function walk(tx,ty){const map=state.pos.mapId;for(let n=0;n<1000;n++){settle();if(state.pos.mapId!==map)return;if(state.pos.x===tx&&state.pos.y===ty)return;const p=path(tx,ty);if(!p?.length){tick();continue;}tick(p[0]);if(world.askMenu)return;}throw Error('Walk bound '+JSON.stringify({pos:state.pos,target:[tx,ty]}));}
  async function shot(id){for(let n=0;n<15;n++){stack.draw(screen);await new Promise(r=>setTimeout(r,50));}const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(canvas,0,0,240,180);shots[id]=c.toDataURL();}
  function adjacent(npc){const candidates=dirs.map(([d,dx,dy])=>({d:dirs.find(v=>v[1]===-dx&&v[2]===-dy)[0],x:npc.x+dx,y:npc.y+dy})).filter(c=>!world.isBlocked(c.x,c.y)&&path(c.x,c.y));check(candidates.length,'No adjacent route '+npc.id);candidates.sort((a,b)=>path(a.x,a.y).length-path(b.x,b.y).length);const c=candidates[0];walk(c.x,c.y);if(state.pos.facing!==c.d)tick(c.d);}
  settle();check(!world.visibleNpcs().find(n=>n.id==='hostess-ue').canWander,'Hostess can block the route');walk(12,5);await shot('palace');
  const resources=()=>JSON.stringify({party:state.party,bag:state.bag,money:state.money,morale:state.morale});
  const money=state.money,morale=JSON.stringify(state.morale);
  walk(10,11);settle();check(state.pos.mapId==='bar-bruxelles','First cafe door failed');
  adjacent(world.visibleNpcs().find(n=>n.healer));tick('a');settle();
  check(state.party.every(m=>m.hp===statsOf(m).hp)&&state.party.every(m=>m.moves.every(s=>s.pp>1)),'Cafe did not recover HP/PP');
  check(state.money===money&&JSON.stringify(state.morale)===morale,'Cafe charged or changed morale');await shot('cafe-interior');
  const exit=world.map.warps.find(w=>w.toMap==='bruxelles');walk(exit.x,exit.y);settle();walk(11,11);settle();check(state.pos.mapId==='bar-bruxelles','Second cafe door failed');walk(exit.x,exit.y);settle();
  for(const id of ['eu-relatore','eu-eurodeputato','eu-commissario','eu-lobby']){
   const npc=world.visibleNpcs().find(n=>n.trainerId===id);check(npc&&!npc.sightRange,'Challenge missing or automatic '+id);
   adjacent(npc);for(let n=0;n<20;n++)tick();check(stack.top===world&&!world.pendingBattle,'Sight started challenge '+id);
   const before=JSON.stringify(state);tick('a');for(let n=0;n<1000&&stack.top===world;n++)tick(world.msg.isOpen?'a':undefined);
   check(stack.top?.constructor.name==='BossBriefingScene','A did not open briefing '+id);await shot(id);tick('right');await shot(id+'-preparation');tick('b');
   check(stack.top===world&&JSON.stringify(state)===before&&!mp.duelBusy,'Cancel changed state '+id);
  }
  adjacent(world.visibleNpcs().find(n=>n.shop));const beforeShop=resources();tick('a');for(let n=0;n<1000&&stack.top===world;n++)tick(world.msg.isOpen?'a':undefined);
  check(stack.top?.constructor.name==='ShopScene','Merchant inaccessible');tick('a');check(stack.top.quote,'Shop skipped quote');tick('b');tick('b');check(stack.top===world&&resources()===beforeShop,'Cancelled purchase changed resources');
  walk(12,4);settle();check(state.pos.mapId==='commissione','First palace door failed');await shot('commissione-interior');
  const npc=world.visibleNpcs().find(n=>n.trainerId==='commissione');check(npc&&!npc.sightRange,'Commissione automatic');adjacent(npc);
  const before=JSON.stringify(state);tick('a');for(let n=0;n<1000&&stack.top===world;n++)tick(world.msg.isOpen?'a':undefined);
  check(stack.top?.constructor.name==='BossBriefingScene','Commissione did not open briefing');await shot('commissione');tick('b');check(stack.top===world&&JSON.stringify(state)===before&&!mp.duelBusy,'Commissione cancel changed state');
  const used=[],old=screen.imageSpriteCropped.bind(screen);screen.imageSpriteCropped=(img,...args)=>{if(img.src.includes('npc_commissione_'))used.push(img.src);return old(img,...args);};
  // Only directional rendering below changes NPC facing; routes use native input.
  for(const facing of ['up','down','left','right']){npc.currentFacing=facing;await shot('cast-'+facing);}
  check(new Set(used.map(u=>u.split('/').at(-1).split('?')[0])).size===4,'Generic/duplicate directional cast');
  walk(5,7);settle();check(state.pos.mapId==='bruxelles','First palace exit failed');walk(13,4);settle();check(state.pos.mapId==='commissione','Second palace door failed');walk(6,7);settle();check(state.pos.mapId==='bruxelles','Second palace exit failed');
  const beforeReturn=resources();walk(14,14);check(world.askMenu,'Return confirmation missing');tick('b');settle();check(state.pos.mapId==='bruxelles'&&resources()===beforeReturn,'Cancel travelled or changed resources');walk(14,13);walk(14,14);tick('a');settle();check(state.pos.mapId==='offshore'&&resources()===beforeReturn,'Pre-boss return failed/altered resources');
  walk(28,9);check(world.askMenu,'Brussels route confirmation missing');tick('a');settle();check(state.pos.mapId==='bruxelles'&&!state.flags['ue-beaten'],'Return earned boss flag');
  walk(19,13);tick('up');settle();check(!world.askMenu&&state.pos.mapId==='bruxelles'&&!state.flags['atto3Started'],'Pre-boss Campo gate opened');
  return {shots,paths,checks:['both cafe doors/free HP+PP recovery','four manual trial dossiers and zero-mutation cancellation','merchant quote/cancel','both palace doors/exits','manual Commissione dossier and cancellation','four custom cast directions','pre-boss offshore return and cancellation','Campo gate stays closed before victory']};
 });
 assert.deepEqual(errors,[]);mkdirSync('artifacts/screens/bruxelles',{recursive:true});
 for(const[id,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/bruxelles/${name}-${id}.png`,Buffer.from(data.split(',')[1],'base64'));
 delete result.shots;writeFileSync(`artifacts/bruxelles-route-${name}.json`,JSON.stringify(result,null,2)+'\n');console.log(`PASS ${name}: Brussels doors, free care, five voluntary dossiers/cancel, merchant, four cast views, maritime return and pre-victory gate.`);
}finally{await browser.close();}
