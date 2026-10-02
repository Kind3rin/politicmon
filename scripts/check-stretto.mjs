// Route fixtures verify navigation and cancellation; full progression is played
// separately from NEW GAME by play-campaign-native.mjs with STRETTO_PLAN.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const engine=process.env.CAMPAIGN_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5188'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async()=>{
  const {Input}=await import('/src/engine/input.ts'),{Screen}=await import('/src/engine/screen.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts'),{newGameState}=await import('/src/game/state.ts'),{createMonster}=await import('/src/game/monster.ts');
  const {audio}=await import('/src/engine/audio.ts'),{mp}=await import('/src/net/mp.ts');audio.enabled=false;mp.setEnabled(false);
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');
  const ids=['ilcapitano','djpapeete','citofonista','noponte','geometra'];
  preloadSprites(Object.fromEntries(ids.map(id=>[`boss:${id}`,`ui/boss/${id}.png`])));await waitForSprites(ids.map(id=>`boss:${id}`));
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);
  const screen=new Screen(canvas),input=new Input(),stack=new SceneStack(),shots={};
  const codes={a:'KeyZ',b:'KeyX',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  function tick(b){if(b)document.dispatchEvent(new KeyboardEvent('keydown',{code:codes[b],bubbles:true}));stack.update(.1);input.endFrame();if(b)document.dispatchEvent(new KeyboardEvent('keyup',{code:codes[b],bubbles:true}));}
  const check=(ok,label)=>{if(!ok)throw Error(label);};
  const state=newGameState();state.flags['intro-done']=true;state.badges=['auditel','spread','dazio'];state.party=[createMonster('salvinator',22)];state.pos={mapId:'capitale',x:4,y:20,facing:'up'};
  const world=new WorldScene(stack,input,state);stack.push(world);
  function settle(){for(let n=0;n<1000;n++){check(stack.top===world,'Unexpected scene during route '+stack.top?.constructor.name);if(world.msg.isOpen)tick('a');else if(world.justEnteredMap||world.moving||world.fadeOut||world.fadeT||world.exclaimT)tick();else return;}throw Error('Route did not settle');}
  const dirs=[['up',0,-1],['left',-1,0],['right',1,0],['down',0,1]];
  function path(tx,ty){const q=[[state.pos.x,state.pos.y]],parents=new Map([[q[0].join(','),null]]);for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){const out=[];let k=x+','+y;while(parents.get(k)){const p=parents.get(k);out.unshift(p.d);k=p.prev;}return out;}for(const [d,dx,dy]of dirs){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(parents.has(k)||world.isBlocked(nx,ny))continue;if(world.map.warps.some(w=>w.x===nx&&w.y===ny)&&(nx!==tx||ny!==ty))continue;parents.set(k,{d,prev:x+','+y});q.push([nx,ny]);}}return null;}
  function walk(tx,ty){const map=state.pos.mapId;for(let n=0;n<1000;n++){settle();if(state.pos.mapId!==map)return;if(state.pos.x===tx&&state.pos.y===ty)return;const p=path(tx,ty);check(p?.length,'Missing legal route to '+tx+','+ty);tick(p[0]);if(world.askMenu)return;}throw Error('Walk bound');}
  function shot(name){stack.draw(screen);const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(canvas,0,0,240,180);shots[name]=c.toDataURL();}
  settle();check(world.isBlocked(4,21),'Ferry water was navigable before gift');tick('a');settle();
  check(state.flags['veh-traghetto'],'Marine did not award ferry through dialogue');walk(6,21);settle();
  check(state.pos.mapId==='stretto','Capital embarkation did not arrive at Stretto');check(state.vehicle==='traghetto','Automatic boarding absent');
  check(path(14,5)===null,'North bar bypasses the Captain before victory');check(path(11,14)!==null,'Pre-victory return is blocked');
  for(let n=0;n<30;n++)tick();check(stack.top===world&&!world.pendingBattle,'Arrival auto-started battle');shot('arrival');
  walk(14,13);check(state.vehicle!=='traghetto','Automatic disembarkation absent');tick('up');tick('a');
  for(let n=0;n<1000&&stack.top===world;n++){if(world.msg.isOpen)tick('a');else tick();}
  check(stack.top?.constructor.name==='BossBriefingScene','A did not open Captain briefing');shot('capitano');
  const before=JSON.stringify(state);tick('right');check(stack.top.page===2,'Preparation page unavailable');shot('preparation');tick('b');
  check(stack.top===world&&JSON.stringify(state)===before&&!mp.duelBusy,'Cancelling preparation changed rewards, PP, state or network lock');
  walk(11,14);check(world.askMenu,'Darsena has no confirmation');const unchanged=JSON.stringify({party:state.party,bag:state.bag,money:state.money,morale:state.morale});tick('a');settle();
  check(state.pos.mapId==='capitale','Return before victory failed');check(JSON.stringify({party:state.party,bag:state.bag,money:state.money,morale:state.morale})===unchanged,'Return healed or changed rewards/morale');
  // Post-victory layout fixture: no battle outcome is injected in campaign runs.
  state.flags['ponte-beaten']=true;state.pos={mapId:'stretto',x:14,y:13,facing:'up'};world.loadMap('stretto');settle();
  check(path(14,5)!==null,'North bar is inaccessible after Captain');
  const trials=world.visibleNpcs().filter(n=>ids.slice(1).includes(n.trainerId));check(trials.length===4,'A trial vanished after Captain');
  for(const n of trials){check(n.sightRange==null,'Optional trial still has automatic sight aggro');check(dirs.some(([,dx,dy])=>path(n.x+dx,n.y+dy)!==null),'Trial not reachable '+n.trainerId);}
  return {shots,checks:['marine gift','automatic boarding/disembarkation','no arrival fight','north gate before/after Captain','preparation cancellation','return before victory without heal/rewards','four optional trials retained'],trialIds:trials.map(n=>n.trainerId)};
 });
 assert.deepEqual(errors,[]);mkdirSync('artifacts/screens/stretto',{recursive:true});
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/stretto/${engine.name()}-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 delete result.shots;writeFileSync(`artifacts/stretto-${engine.name()}.json`,JSON.stringify(result,null,2));
 console.log('PASS: '+engine.name()+' Stretto route, cancellation and four post-Captain trials.');
}finally{await browser.close();}
