import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
const engine = process.env.BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch();
try {
 const page = await browser.newPage(); const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.goto(`${process.env.BASE_URL ?? 'http://127.0.0.1:5188'}/scripts/perf-harness.html`);
 const result = await page.evaluate(async () => {
  const {Screen} = await import('/src/engine/screen.ts');
  const {SceneStack} = await import('/src/engine/scene.ts');
  const {Input} = await import('/src/engine/input.ts');
  const {newGameState,loadGame} = await import('/src/game/state.ts');
  const {createMonster} = await import('/src/game/monster.ts');
  const {archivedMoves} = await import('/src/game/moveArchive.ts');
  const {SPECIES} = await import('/src/data/species.ts');
  const {MOVES} = await import('/src/data/moves.ts');
  const {PartyScene} = await import('/src/scenes/PartyScene.ts');
  const {RecallScene} = await import('/src/scenes/RecallScene.ts');
  const {TeachScene} = await import('/src/scenes/TeachScene.ts');
  const {audio} = await import('/src/engine/audio.ts'); audio.enabled = false;
  const {preloadSprites,waitForSprites} = await import('/src/engine/assets.ts');
  const entries = {'ui:recall':'ui/recall.png','ui:teach':'ui/teach.png','ui:dossier':'ui/dossier.png'};
  for (const id of Object.keys(SPECIES)) entries[`mon:${id}`] = `monsters/${id}.png`;
  preloadSprites(entries); await waitForSprites(Object.keys(entries),10000);
  const canvas = document.createElement('canvas'); document.body.append(canvas);
  const screen = new Screen(canvas), input = new Input(), stack = new SceneStack();
  const codes = {a:'KeyZ',b:'KeyX',start:'KeyP',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  const press = key => {document.dispatchEvent(new KeyboardEvent('keydown',{code:codes[key],bubbles:true}));stack.update(.1);input.endFrame();document.dispatchEvent(new KeyboardEvent('keyup',{code:codes[key],bubbles:true}));};
  const check = (ok, msg) => {if (!ok) throw Error(msg);};
  const issues = [], shots = {}; let name = '', boxes = [], checked = 0;
  const text = screen.text.bind(screen);
  screen.text = (value,x,y,color,scale=1) => {
   const m = screen.ctx.getTransform(), base = canvas.width/240;
   const box = {value,x:(m.a*x+m.e)/base,y:(m.d*y+m.f)/base,w:Math.max(0,value.length*6-1)*scale*m.a/base,h:7*scale*m.d/base};
   if (box.x<0||box.y<0||box.x+box.w>240||box.y+box.h>180) issues.push({name,kind:'bounds',...box});
   for (const old of boxes) if(box.w&&old.w&&box.x<old.x+old.w&&box.x+box.w>old.x&&box.y<old.y+old.h&&box.y+box.h>old.y) issues.push({name,kind:'overlap',value,other:old.value});
   boxes.push(box); text(value,x,y,color,scale);
  };
  const draw = (id, scene, capture=false) => {name=id;boxes=[];scene.draw(screen);checked++;if(capture)shots[id]=canvas.toDataURL('image/png');};
  for (const id of Object.keys(SPECIES)) for (const level of [1,16,30,55]) {
   const state=newGameState();state.party=[createMonster(id,level)];
   const recall=new RecallScene(stack,input,state,state.party[0]);stack.replace(recall);
   const before=JSON.stringify(state);
   for(let index=0;index<Math.max(1,recall.ids.length);index++){recall.menu.index=index;draw(`${id}-${level}-${index}`,recall,id==='generorso'&&level===30&&index===0);}
   check(JSON.stringify(state)===before,'Reading archive changed state');
   const dossier=new PartyScene(stack,input,state,{mode:'view'});dossier.summary=state.party[0];dossier.summaryPage=5;
   for(let scroll=0;scroll<=Math.max(0,dossier.summaryLines(state.party[0]).length-7);scroll++){dossier.summaryScroll=scroll;draw(`party-archive-${id}-${level}-${scroll}`,dossier);}
  }
  const state=newGameState(), mon=createMonster('generorso',28);state.party=[mon];
  mon.moves=mon.moves.filter(s=>s.id!=='pienipoteri');mon.moves.push({id:'mondocontrario',pp:2});
  mon.moves[0].pp=1;mon.status='scandalo';mon.heldItem='caffettiera';
  const before=JSON.stringify(state), old=mon.moves.map(s=>({...s}));
  const party=new PartyScene(stack,input,state,{mode:'view'});stack.replace(party);
  press('a');for(let i=0;i<5;i++)press('a');press('start');
  check(stack.top?.constructor.name === 'RecallScene','Party did not open archive');
  let recall=stack.top;const target=recall.ids.indexOf('pienipoteri');check(target>=0,'Missing legal support move');
  while(recall.menu.index!==target)press('down');press('a');
  check(stack.top?.constructor.name === 'TeachScene','No move comparison');
  press('b');check(JSON.stringify(state)===before,'Cancelling changed state');
  press('a');press('start');
  for(let page=0;page<3;page++){stack.top.page=page;for(let scroll=0;scroll<=Math.max(0,stack.top.lines().length-9);scroll++){stack.top.scroll=scroll;draw(`compare-${page}-${scroll}`,stack.top,page===2&&scroll===0);}}
  press('b');check(JSON.stringify(state)===before,'Inspecting changed state');
  press('a');draw('confirmation',stack.top,true);press('b');check(JSON.stringify(state)===before,'Backing out of confirmation changed state');
  const teach=stack.top;while(teach.menu.index!==old.length-1)press('down');press('a');press('a');
  for(let i=0;i<200&&stack.top===teach;i++)press('a');
  check(mon.moves.at(-1).id==='pienipoteri'&&mon.moves.at(-1).pp===MOVES.pienipoteri.pp,'Did not recover move');
  check(JSON.stringify(mon.moves.slice(0,-1))===JSON.stringify(old.slice(0,-1)),'Other PP changed');
  check(state.money===JSON.parse(before).money&&mon.status==='scandalo'&&mon.heldItem==='caffettiera','Funds/status/held changed');
  check(loadGame().party[0].moves.at(-1).id==='pienipoteri','Archive move not saved');
  recall=stack.top;check(!archivedMoves(mon).includes('pienipoteri'),'Recovered move still in archive');
  press('b');check(stack.top===party,'Did not return to party');
  for (const opts of [{mode:'battle-switch'},{mode:'view',partyOverride:[mon]}]) {
   const guarded=new PartyScene(stack,input,state,opts);guarded.summary=mon;guarded.summaryPage=5;stack.replace(guarded);press('start');
   check(stack.top===guarded,'Archive available during battle or on mirror');
  }
  return {issues,shots,checked};
 });
 assert.deepEqual(errors,[]); assert.deepEqual(result.issues,[]);
 mkdirSync('artifacts/screens/recall',{recursive:true});
 for(const [name,data] of Object.entries(result.shots))writeFileSync(`artifacts/screens/recall/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS ${engine.name()}: ${result.checked} archive/comparison layouts, actual keyboard Party→Recall→Teach→saved move; cancel purity, PP conservation and battle/mirror guards.`);
} finally {await browser.close();}
