// Navigation fixtures do not certify earned campaign wins.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const name=process.env.BROWSER==='webkit'?'webkit':'chromium',browser=await ({chromium,webkit}[name]).launch();
const parent=JSON.parse(readFileSync('artifacts/campaign-native/campo-final-renzino-direct-20261002.json','utf8'));
const completed=JSON.parse(readFileSync('artifacts/campaign-native/future-final-ellyna-direct-20261002.json','utf8'));
const assets=JSON.parse(readFileSync('scripts/higgsfield-future.json','utf8')).assets.flatMap(a=>a.outputs??[a.path]).map(p=>p.replace(/^public\/sprites\//,''));
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5190'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async ({paths,saveCode,completedCode})=>{
  const {Input}=await import('/src/engine/input.ts'),{Screen}=await import('/src/engine/screen.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts'),{importSaveCode}=await import('/src/game/state.ts'),{createMonster,statsOf}=await import('/src/game/monster.ts');
  const {audio}=await import('/src/engine/audio.ts'),{mp}=await import('/src/net/mp.ts');audio.enabled=false;mp.setEnabled(false);
  const {MAPS}=await import('/src/data/maps.ts');MAPS.campo_largo.encounterRate=0;
  const {preloadSprites,waitForSprites,spriteStatus}=await import('/src/engine/assets.ts');
  preloadSprites(Object.fromEntries(paths.map(p=>['fixture:'+p,p])));await waitForSprites(paths.map(p=>'fixture:'+p));
  if(paths.some(p=>spriteStatus('fixture:'+p)!=='ready'))throw Error('Missing Campo PNG');
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);const screen=new Screen(canvas),input=new Input(),stack=new SceneStack(),shots={};
  const state=importSaveCode(saveCode);const world=new WorldScene(stack,input,state);stack.push(world);
  const codes={a:'KeyZ',b:'KeyX',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  // Panel scenes (briefings, choices, results) are driven by the on-screen UI kit, not by keys: A runs the highlighted action, B runs Back.
  const tick=b=>{const top=stack.top,panel=b&&top!==world&&top?.uiPanel;if(panel){const i=panel.primary??panel.selected??0,act=panel.actions?.[i];if(b==='a'&&act&&!act.disabled)act.run();else if(b==='b')panel.back?.run();stack.update(.1);input.endFrame();return;}if(b)document.dispatchEvent(new KeyboardEvent('keydown',{code:codes[b],bubbles:true}));stack.update(.1);input.endFrame();if(b)document.dispatchEvent(new KeyboardEvent('keyup',{code:codes[b],bubbles:true}));};
  const check=(ok,label)=>{if(!ok)throw Error(label);};
  const pick=i=>{const act=stack.top.uiPanel?.actions?.[i];if(!act||act.disabled)throw Error('No action '+i+' on '+stack.top?.constructor.name);act.run();stack.update(.1);input.endFrame();};
  function settle(){for(let n=0;n<1000;n++){check(stack.top===world,'Unexpected scene on route '+stack.top?.constructor.name);if(world.msg.isOpen)tick('a');else if(world.justEnteredMap||world.moving||world.fadeOut||world.fadeT||world.exclaimT||world.healFx)tick();else return;}throw Error('Route did not settle');}
  const dirs=[['up',0,-1],['left',-1,0],['right',1,0],['down',0,1]];
  function path(tx,ty){const q=[[state.pos.x,state.pos.y]],parents=new Map([[q[0].join(','),null]]);for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){const p=[];let k=x+','+y;while(parents.get(k)){const prev=parents.get(k);p.unshift(prev.d);k=prev.k;}return p;}for(const[d,dx,dy]of dirs){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(parents.has(k)||world.isBlocked(nx,ny)||world.map.warps.some(w=>w.x===nx&&w.y===ny&&(nx!==tx||ny!==ty)))continue;parents.set(k,{d,k:x+','+y});q.push([nx,ny]);}}return null;}
  function walk(tx,ty){const map=state.pos.mapId;for(let n=0;n<1000;n++){settle();if(state.pos.mapId!==map)return;if(state.pos.x===tx&&state.pos.y===ty)return;const p=path(tx,ty);if(!p?.length){tick();continue;}tick(p[0]);if(world.askMenu)return;}throw Error('Walk bound '+JSON.stringify({pos:state.pos,target:[tx,ty]}));}
  async function shot(id,sourceStack=stack){for(let n=0;n<15;n++){sourceStack.draw(screen);await new Promise(r=>setTimeout(r,50));}const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(canvas,0,0,240,180);shots[id]=c.toDataURL();}
  function adjacent(npc){const candidates=dirs.map(([d,dx,dy])=>({d:dirs.find(v=>v[1]===-dx&&v[2]===-dy)[0],x:npc.x+dx,y:npc.y+dy})).filter(c=>!world.isBlocked(c.x,c.y)&&path(c.x,c.y));check(candidates.length,'No adjacent route '+npc.id);candidates.sort((a,b)=>path(a.x,a.y).length-path(b.x,b.y).length);const c=candidates[0];walk(c.x,c.y);if(state.pos.facing!==c.d)tick(c.d);}
  settle();
  const resources=()=>JSON.stringify({party:state.party,bag:state.bag,money:state.money,morale:state.morale,coalition:state.coalition,election:state.election});
  const npc=id=>world.visibleNpcs().find(n=>n.id===id);
  function open(id,scene){adjacent(npc(id));tick('a');for(let n=0;n<1000&&stack.top===world;n++)tick(world.msg.isOpen?'a':undefined);check(stack.top?.constructor.name===scene,'Missing '+scene+' from '+id);return stack.top;}
  function talk(id){adjacent(npc(id));tick('a');settle();}
  function enter(map,door=0){const list=world.map.warps.filter(w=>w.toMap===map);const w=list[Math.min(door,list.length-1)];check(w,'Missing warp '+map);walk(w.x,w.y);if(world.askMenu)tick('a');settle();check(state.pos.mapId===map,'Warp failed '+map);}
  enter('futuro_piazza');check(world.effectiveEncounters().length===0,'Meadow recruits before victory');await shot('piazza');
  const promises=JSON.stringify(state.morale.promises),trust=state.morale.trust;
  walk(2,9);if(state.pos.facing!=='up')tick('up');tick('up');settle();check(state.pos.mapId==='futuro_piazza'&&!state.flags.futureResolved,'Diplomacy unlocked early');
  talk('future-reception');check(state.flags['future-badge-received'],'Badge absent');talk('future-treasurer');
  enter('futuro_sede');await shot('hq');talk('future-lever-a');check(!state.flags['future-lever-a-on'],'Unread split authorized');talk('future-lever-b');check(!state.flags['future-lever-b-on'],'Unread brand authorized');
  check(!npc('future-choice-desk')&&!npc('future-boss'),'Premature desk/boss');
  const roles=[['futuro_scissione','future-split-clerk','future-split-reviewed'],['futuro_rebrand','future-brand-clerk','future-brand-reviewed'],['futuro_tesoreria','future-money-clerk',null]];
  for(const[map,id,flag]of roles){enter(map);await shot(map);talk(id);if(flag)check(state.flags[flag],'Review not retained');enter('futuro_sede');enter(map);enter('futuro_sede',1);}
  talk('future-lever-a');check(!state.flags['future-shortcut-open'],'One lever opened');talk('future-lever-b');check(state.flags['future-shortcut-open']&&!npc('future-barrier'),'Two signatures did not open');
  let before=resources(),choice=open('future-choice-desk','FutureChoiceScene');await shot('choice');tick('down');tick('down');tick('a');await shot('dossier');tick('b');tick('b');settle();check(resources()===before&&!state.flags['future-choice-complete'],'Preview/cancel changed state');
  const money=state.money;state.money=799;before=resources();choice=open('future-choice-desk','FutureChoiceScene');tick('a');check(stack.top.uiPanel.actions[0].disabled&&stack.top.uiPanel.blocks.some(b=>/non disponibile/i.test(b.title))&&resources()===before,'Insufficient funds accepted');for(let n=0;n<4&&stack.top!==world;n++)tick('b');settle();state.money=money;
  const coe=state.morale.cohesion,polls=state.sondaggi;
  choice=open('future-choice-desk','FutureChoiceScene');pick(2);for(let n=0;n<80&&!choice.result;n++)tick('a');check(choice.result&&state.flags['a3.future.oppose'],'Contrast commit absent');await shot('result');tick('b');settle();
  check(state.money===money&&state.sondaggi===Math.min(100,polls+2)&&state.morale.cohesion===coe-16,'Contrast effects differ');check(!state.coalition.members.some(m=>m.allyId==='quantum_centrist'),'Second violation retained centrist');check(state.morale.trust===trust&&JSON.stringify(state.morale.promises)===promises,'Choice repaired civil promises');
  const boss=npc('future-boss');check(!boss.sightRange&&!boss.canWander,'Automatic/wandering secretary');adjacent(boss);for(let n=0;n<20;n++)tick();check(stack.top===world&&!world.pendingBattle,'Sight started fight');before=resources();open('future-boss','BossBriefingScene');await shot('briefing');tick('b');settle();check(resources()===before&&!state.flags.futureResolved,'Dossier cancel changed state');
  before=resources();talk('future-choice-desk');check(resources()===before,'Desk repeated choice');
  // Deliberately damaged clone for navigation/care; this is not an earned battle.
  state.party[0].hp=3;state.party[0].moves[0].pp=1;const careMoney=state.money,careTrust=state.morale.trust,careCoe=state.morale.cohesion;
  enter('futuro_piazza');enter('campo_largo');talk('campo-medico');check(state.party.every(m=>m.hp===statsOf(m).hp&&m.moves.every(s=>s.pp>1)),'Campo HP/PP care missing');check(state.money===careMoney&&state.morale.trust===careTrust&&state.morale.cohesion===careCoe,'Care charged political state');
  enter('futuro_piazza');enter('futuro_sede',1);check(state.flags['future-choice-complete']&&state.flags['future-shortcut-open'],'Return lost signatures');enter('futuro_piazza',1);
  const seen=[],draw=screen.imageSpriteCropped.bind(screen);screen.imageSpriteCropped=(img,...args)=>{if(/npc_future-/.test(img.src))seen.push(img.src);return draw(img,...args);};
  for(const id of ['future-reception','future-reporter','future-treasurer']){adjacent(npc(id));for(const facing of ['up','down','left','right']){npc(id).currentFacing=facing;await shot(id+'-'+facing);}}
  enter('futuro_sede');for(const id of ['future-lever-a','future-lever-b','future-boss']){adjacent(npc(id));for(const facing of ['up','down','left','right']){npc(id).currentFacing=facing;await shot(id+'-'+facing);}}
  const preState=importSaveCode(saveCode);preState.pos={mapId:'futuro_sede',x:8,y:6,facing:'up'};
  const preStack=new SceneStack(),preWorld=new WorldScene(preStack,input,preState);preStack.push(preWorld);preWorld.msg.close();preWorld.fadeT=0;const usher=preWorld.visibleNpcs().find(n=>n.id==='future-barrier');
  for(const facing of ['up','down','left','right']){usher.currentFacing=facing;await shot('future-guard-'+facing,preStack);}
  check(new Set(seen.map(u=>u.split('/').at(-1).split('?')[0])).size===28,'Custom cast directions not drawn');
  for(const browserSeed of [0,1]){const late=importSaveCode(completedCode);late.browserSeed=browserSeed;late.pos={mapId:'futuro_piazza',x:16,y:12,facing:'up'};const st=new SceneStack(),w=new WorldScene(st,input,late);st.push(w);check(w.effectiveEncounters().length===1&&w.effectiveEncounters()[0].speciesId==='vannaccix','Earned meadow unavailable to version '+browserSeed);}
  return{shots,paths,checks:['diplomacy and recruitment gated; earned meadow works in both versions','badge retained','unread signatures gated','three distinct rooms / both exits','two reviewed signatures','choice preview/cancel','insufficient funds','second violation breaks centrist / cohesion -16','civic debt and trust unchanged','manual boss dossier/cancel','no repeated choice','Campo care / return / both HQ doors','28 custom directions rendered; usher uses separate pre-signature navigation clone'],fixture:'Earned Renzino save cloned; funds799 and damage are isolated fixtures, no fight/win claimed.'};
 },{paths:assets,saveCode:parent.codes['campo-verbale'],completedCode:completed.codes['future-verbale']});
 assert.deepEqual(errors,[]);mkdirSync('artifacts/screens/future',{recursive:true});for(const[id,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/future/${name}-${id}.png`,Buffer.from(data.split(',')[1],'base64'));delete result.shots;writeFileSync(`artifacts/future-route-${name}.json`,JSON.stringify(result,null,2)+'\n');console.log(`PASS ${name}: Future signatures, choices/debts, dossiers, rooms, care return and custom cast.`);
}finally{await browser.close();}
