// Navigation fixtures do not certify earned campaign wins.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const name=process.env.BROWSER==='webkit'?'webkit':'chromium',browser=await ({chromium,webkit}[name]).launch();
const parent=JSON.parse(readFileSync('artifacts/campaign-native/future-final-ellyna-direct-20261002.json','utf8'));
const completed=JSON.parse(readFileSync('artifacts/campaign-native/diplomacy-final-ellyna-direct-20261002.json','utf8'));
const assets=JSON.parse(readFileSync('scripts/higgsfield-diplomacy.json','utf8')).assets.flatMap(a=>a.outputs??[a.path]).map(p=>p.replace(/^public\/sprites\//,''));
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
  if(paths.some(p=>spriteStatus('fixture:'+p)!=='ready'))throw Error('Missing Diplomacy PNG');
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
  function enter(map,door=0){const w=world.map.warps.filter(w=>w.toMap===map)[door];check(w,'Missing warp '+map);if(world.map.outdoor&&!MAPS[map].outdoor&&world.map.tiles[w.y]?.[w.x]==='d'){walk(w.x,w.y+1);if(state.pos.facing!=='up')tick('up');tick('up');}else walk(w.x,w.y);if(world.askMenu)tick('a');settle();check(state.pos.mapId===map,'Warp failed '+map);}
  await shot('lobby');
  for(const target of ['diplomacy_terrace','tour_feed','genova_techno']){const w=world.map.warps.find(w=>w.toMap===target);const routes=dirs.map(([d,dx,dy])=>({d,x:w.x-dx,y:w.y-dy})).filter(c=>!world.isBlocked(c.x,c.y)&&path(c.x,c.y)&&!world.map.warps.some(v=>v.x===c.x&&v.y===c.y));routes.sort((a,b)=>path(a.x,a.y).length-path(b.x,b.y).length);const c=routes[0];check(c,'Locked approach');walk(c.x,c.y);if(state.pos.facing!==c.d)tick(c.d);tick(c.d);settle();check(state.pos.mapId==='diplomacy_lobby','Early route '+target);}
  talk('diplomacy-host');check(state.flags['diplomacy-checked-in'],'Missing check in');
  const seen=[],draw=screen.imageSpriteCropped.bind(screen);screen.imageSpriteCropped=(img,...args)=>{if(/npc_diplomacy-/.test(img.src))seen.push(img.src);return draw(img,...args);};
  const cast=async id=>{adjacent(npc(id));for(const facing of ['up','down','left','right']){npc(id).currentFacing=facing;await shot(id+'-'+facing);}};
  await cast('diplomacy-host');
  for(const[map,id]of [['diplomacy_loyalty','diplomacy-choice-loyalty'],['diplomacy_autonomy','diplomacy-choice-autonomy'],['diplomacy_home','diplomacy-choice-home']]){
    enter(map);await shot(map);await cast(id);const before=resources();open(id,'DiplomacyChoiceScene');tick('a');await shot(map+'-dossier');tick('b');tick('b');settle();check(resources()===before&&!state.flags['diplomacy-choice-complete'],'Preview changed resources');enter('diplomacy_lobby');enter(map);enter('diplomacy_lobby',1);
  }
  enter('diplomacy_autonomy');const money=state.money;state.money=499;let before=resources(),choice=open('diplomacy-choice-autonomy','DiplomacyChoiceScene');tick('a');check(stack.top.uiPanel.actions[0].disabled&&stack.top.uiPanel.blocks.some(b=>/non disponibile/i.test(b.title))&&resources()===before,'Insufficient repair accepted');for(let n=0;n<4&&stack.top!==world;n++)tick('b');settle();state.money=money;
  const trust=state.morale.trust,promises=JSON.stringify(state.morale.promises),coe=state.morale.cohesion;
  choice=open('diplomacy-choice-autonomy','DiplomacyChoiceScene');for(let n=0;n<80&&!choice.result;n++)tick('a');check(choice.result&&state.flags['a3.diplomacy.autonomy'],'Autonomy not committed');await shot('repair-result');tick('b');settle();
  check(state.money===money-500&&state.morale.cohesion===coe+6&&state.coalition.members.find(m=>m.allyId==='campo_secretary')?.status==='reconciled','Repair differs');check(state.morale.trust===trust&&JSON.stringify(state.morale.promises)===promises,'Repair changed civic debts');before=resources();talk('diplomacy-choice-autonomy');check(resources()===before,'Repeated suite changed state');enter('diplomacy_lobby');
  enter('diplomacy_terrace');await shot('terrace');await cast('partner-perfetto');const boss=npc('partner-perfetto');check(!boss.sightRange&&!boss.canWander,'Automatic partner');adjacent(boss);for(let n=0;n<20;n++)tick();check(stack.top===world&&!world.pendingBattle,'Sight battle started');before=resources();open('partner-perfetto','BossBriefingScene');await shot('briefing');tick('b');settle();check(resources()===before&&!state.flags.diplomacyComplete,'Boss cancel changed resources');
  // HP/PP damage is confined to this navigation fixture, never an earned victory.
  state.party[0].hp=3;state.party[0].moves[0].pp=1;const careMoney=state.money,careCoe=state.morale.cohesion;
  enter('diplomacy_lobby');enter('diplomacy_terrace');enter('diplomacy_lobby',1);enter('futuro_piazza');enter('campo_largo');talk('campo-medico');check(state.party.every(m=>m.hp===statsOf(m).hp&&m.moves.every(s=>s.pp>1)),'Care HP/PP');check(state.money===careMoney&&state.morale.trust===trust&&state.morale.cohesion===careCoe,'Care charged politics');enter('futuro_piazza');enter('diplomacy_lobby');check(state.flags['diplomacy-choice-complete'],'Return lost choice');
  check(new Set(seen.map(u=>u.split('/').at(-1).split('?')[0])).size===20,'Cast 20 directions missing');
  return{shots,paths,checks:['Partner / Tour / Genova gates','three suites / both exits','preview and B cancellation pure','499 funds cannot repair','500 funds repairs now / cohesion +6 / civic debt retained','no repeated choice','manual boss and dossier cancellation','both pavilion doors / Campo care / choice survives return','20 custom directions drawn'],fixture:'Earned Ellyna Future save cloned. Isolated funds499 and HP/PP damage; no battle win claimed.'};
 },{paths:assets,saveCode:parent.codes['future-diplomacy'],completedCode:completed.codes['diplomacy-verbale']});
 assert.deepEqual(errors,[]);mkdirSync('artifacts/screens/diplomacy',{recursive:true});for(const[id,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/diplomacy/${name}-${id}.png`,Buffer.from(data.split(',')[1],'base64'));delete result.shots;writeFileSync(`artifacts/diplomacy-route-${name}.json`,JSON.stringify(result,null,2)+'\n');console.log(`PASS ${name}: Diplomacy choices, gates, dossiers, rooms, care return and 20 custom directions.`);
}finally{await browser.close();}
