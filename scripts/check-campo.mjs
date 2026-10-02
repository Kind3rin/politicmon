// Navigation fixtures do not certify earned campaign wins.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const name=process.env.BROWSER==='webkit'?'webkit':'chromium',browser=await ({chromium,webkit}[name]).launch();
const assets=JSON.parse(readFileSync('scripts/higgsfield-campo.json','utf8')).assets.flatMap(a=>a.outputs??[a.path]).map(p=>p.replace(/^public\/sprites\//,''));
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5190'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async paths=>{
  const {Input}=await import('/src/engine/input.ts'),{Screen}=await import('/src/engine/screen.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts'),{newGameState}=await import('/src/game/state.ts'),{createMonster,statsOf}=await import('/src/game/monster.ts');
  const {audio}=await import('/src/engine/audio.ts'),{mp}=await import('/src/net/mp.ts');audio.enabled=false;mp.setEnabled(false);
  const {MAPS}=await import('/src/data/maps.ts');MAPS.campo_largo.encounterRate=0;
  const {preloadSprites,waitForSprites,spriteStatus}=await import('/src/engine/assets.ts');
  preloadSprites(Object.fromEntries(paths.map(p=>['fixture:'+p,p])));await waitForSprites(paths.map(p=>'fixture:'+p));
  if(paths.some(p=>spriteStatus('fixture:'+p)!=='ready'))throw Error('Missing Campo PNG');
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);const screen=new Screen(canvas),input=new Input(),stack=new SceneStack(),shots={};
  const state=newGameState();Object.assign(state.flags,{'intro-done':true,'starter-chosen':true,'rival1-beaten':true,'dex-received':true,'ue-beaten':true});
  state.badges=['auditel','spread','dazio'];state.money=1600;state.party=[createMonster('schleinix',44),createMonster('movimenton',42)];state.party[0].hp=3;state.party[0].moves[0].pp=1;
  state.pos={mapId:'campo_largo',x:19,y:13,facing:'up'};const world=new WorldScene(stack,input,state);stack.push(world);
  const codes={a:'KeyZ',b:'KeyX',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  const tick=b=>{if(b)document.dispatchEvent(new KeyboardEvent('keydown',{code:codes[b],bubbles:true}));stack.update(.1);input.endFrame();if(b)document.dispatchEvent(new KeyboardEvent('keyup',{code:codes[b],bubbles:true}));};
  const check=(ok,label)=>{if(!ok)throw Error(label);};
  function settle(){for(let n=0;n<1000;n++){check(stack.top===world,'Unexpected scene on route '+stack.top?.constructor.name);if(world.msg.isOpen)tick('a');else if(world.justEnteredMap||world.moving||world.fadeOut||world.fadeT||world.exclaimT||world.healFx)tick();else return;}throw Error('Route did not settle');}
  const dirs=[['up',0,-1],['left',-1,0],['right',1,0],['down',0,1]];
  function path(tx,ty){const q=[[state.pos.x,state.pos.y]],parents=new Map([[q[0].join(','),null]]);for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){const p=[];let k=x+','+y;while(parents.get(k)){const prev=parents.get(k);p.unshift(prev.d);k=prev.k;}return p;}for(const[d,dx,dy]of dirs){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(parents.has(k)||world.isBlocked(nx,ny)||world.map.warps.some(w=>w.x===nx&&w.y===ny&&(nx!==tx||ny!==ty)))continue;parents.set(k,{d,k:x+','+y});q.push([nx,ny]);}}return null;}
  function walk(tx,ty){const map=state.pos.mapId;for(let n=0;n<1000;n++){settle();if(state.pos.mapId!==map)return;if(state.pos.x===tx&&state.pos.y===ty)return;const p=path(tx,ty);if(!p?.length){tick();continue;}tick(p[0]);if(world.askMenu)return;}throw Error('Walk bound '+JSON.stringify({pos:state.pos,target:[tx,ty]}));}
  async function shot(id){for(let n=0;n<15;n++){stack.draw(screen);await new Promise(r=>setTimeout(r,50));}const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(canvas,0,0,240,180);shots[id]=c.toDataURL();}
  function adjacent(npc){const candidates=dirs.map(([d,dx,dy])=>({d:dirs.find(v=>v[1]===-dx&&v[2]===-dy)[0],x:npc.x+dx,y:npc.y+dy})).filter(c=>!world.isBlocked(c.x,c.y)&&path(c.x,c.y));check(candidates.length,'No adjacent route '+npc.id);candidates.sort((a,b)=>path(a.x,a.y).length-path(b.x,b.y).length);const c=candidates[0];walk(c.x,c.y);if(state.pos.facing!==c.d)tick(c.d);}
  settle();
  const resources=()=>JSON.stringify({party:state.party,bag:state.bag,money:state.money,morale:state.morale,coalition:state.coalition,election:state.election});
  const npc=id=>world.visibleNpcs().find(n=>n.id===id);
  function open(id,scene){adjacent(npc(id));tick('a');for(let n=0;n<1000&&stack.top===world;n++)tick(world.msg.isOpen?'a':undefined);check(stack.top?.constructor.name===scene,'Missing '+scene+' from '+id);return stack.top;}
  const beforeCare={money:state.money,morale:JSON.stringify(state.morale)};
  adjacent(npc('campo-medico'));tick('a');settle();check(state.party.every(m=>m.hp===statsOf(m).hp&&m.moves.every(s=>s.pp>1)),'HP/PP not recovered');check(state.money===beforeCare.money&&JSON.stringify(state.morale)===beforeCare.morale,'Care charged morale/funds');
  for(const [id,ally] of [['campo-secretary','campo_secretary'],['quantum-centrist','quantum_centrist'],['civic-mayor','civic_mayor']]){
   check(!npc(id).canWander,'Candidate wanders: '+id);open(id,'CoalitionScene');check(state.flags['coalition-candidate-seen:'+ally],'Introduction did not register');await shot(id+'-coalition');
   if(id!=='civic-mayor')tick('a');tick('b');settle();
  }
  check(state.coalition.members.length===2,'Selection missing');
  open('campo-secretary','CoalitionScene');let before=resources();tick('a');tick('b');check(resources()===before,'Removal cancellation mutated');tick('b');settle();
  walk(17,12);settle();check(state.pos.mapId==='retropalco_campo','First backstage door');await shot('backstage');walk(7,9);settle();check(state.pos.mapId==='campo_largo','First backstage exit');
  walk(18,12);settle();check(state.pos.mapId==='retropalco_campo','Second backstage door');walk(8,9);settle();
  let photo=open('campo-fotografo','PhotoChoiceScene');await shot('photo');before=resources();tick('down');tick('a');await shot('photo-dossier');tick('b');tick('b');settle();check(resources()===before&&!state.flags['campo-photo-choice-complete'],'Photo preview/cancel mutated');
  state.money=799;photo=open('campo-fotografo','PhotoChoiceScene');tick('down');before=resources();tick('a');check(photo.error&&resources()===before&&!photo.reviewing,'Insufficient funds accepted');tick('b');settle();state.money=1600;
  photo=open('campo-fotografo','PhotoChoiceScene');tick('down');const coe=state.morale.cohesion,trust=state.morale.trust;for(let n=0;n<30&&!photo.result;n++)tick('a');check(photo.result&&state.flags['atto3-photo-choice:panoramica'],'Panoramic commit missing');
  check(state.money===800&&state.morale.cohesion===coe-8&&state.morale.trust===trust,'Panoramic real effects differ');check(state.coalition.members.find(m=>m.allyId==='quantum_centrist').status==='strained','Centrist line red ignored');await shot('photo-result');tick('b');settle();
  for(const id of ['campo-tr-debate','campo-tr-claque']){
   check(!npc(id).sightRange,'Automatic fight '+id);adjacent(npc(id));for(let n=0;n<20;n++)tick();check(stack.top===world&&!world.pendingBattle,'Fight started from sight');before=resources();open(id,'BossBriefingScene');await shot(id);tick('b');settle();check(resources()===before&&!state.flags['campo-debate-resolved'],'Dossier cancel mutated');
  }
  const actor=npc('campo-fotografo');check(!actor.canWander,'Photographer wanders');
  const used=[],old=screen.imageSpriteCropped.bind(screen);screen.imageSpriteCropped=(img,...args)=>{if(/npc_(campo-secretary|quantum-centrist|civic-mayor|campo-photographer)_/.test(img.src))used.push(img.src);return old(img,...args);};
  for(const id of ['campo-secretary','quantum-centrist','civic-mayor','campo-fotografo']){adjacent(npc(id));for(const facing of ['up','down','left','right']){npc(id).currentFacing=facing;await shot(id+'-'+facing);}}
  check(new Set(used.map(u=>u.split('/').at(-1).split('?')[0])).size===16,'Custom directions not rendered');
  before=resources();walk(10,17);check(world.askMenu,'South exit lacks confirmation');tick('b');settle();check(state.pos.mapId==='campo_largo'&&resources()===before,'Cancelled exit mutated');walk(10,16);walk(10,17);tick('a');settle();check(state.pos.mapId==='capitale'&&resources()===before,'South exit lost progress');
  return{shots,paths,checks:['free HP/PP care','three introductions/two actual allies','removal cancellation','both backstage doors/exits','photo dossier cancellation','insufficient funds','panoramic funds/cohesion/line-red effects','two manual dossiers/cancel','16 custom directions','south exit confirmation/progress retained']};
 },assets);
 assert.deepEqual(errors,[]);mkdirSync('artifacts/screens/campo',{recursive:true});for(const[id,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/campo/${name}-${id}.png`,Buffer.from(data.split(',')[1],'base64'));delete result.shots;writeFileSync(`artifacts/campo-route-${name}.json`,JSON.stringify(result,null,2)+'\n');console.log(`PASS ${name}: Campo doors, care, coalitions, photo consequences/cancel, manual dossiers and 16 cast directions.`);
}finally{await browser.close();}
