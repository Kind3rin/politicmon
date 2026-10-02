// Production inputs only. Preparation and routing are distinct from the earned battle report.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';
import {commitDistrictDecision,previewDistrictDecision} from '../src/game/districtDecisions.ts';

const base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
const sourceReport='artifacts/campaign-native/diplomacy-final-ellyna-direct-20261002.json';
const earnedCode=(report,label)=>existsSync(report)?JSON.parse(readFileSync(report,'utf8')).codes[label]:JSON.parse(readFileSync('docs/tour-proof.json','utf8')).earnedCampaign.codes[label];
const code=earnedCode(sourceReport,'diplomacy-verbale');
const earned=importSaveCode(code);
assert.deepEqual(earned.pos,{mapId:'diplomacy_lobby',x:16,y:9,facing:'left'});
assert.equal(earned.election.phase,'tour');
const core=s=>Object.fromEntries(['money','party','bag','morale','coalition','election','sondaggi'].map(k=>[k,s[k]]));
const outDir='artifacts/screens/tour';mkdirSync(outDir,{recursive:true});
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 if(process.env.BROWSER&&process.env.BROWSER!==engineName)continue;
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const seed=async state=>context.addInitScript(save=>{
   sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));
   localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');
  },serializeGameState(state));
  await seed(earned);
  const page=await context.newPage(),errors=[],assets=[],stages=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(/tour[_-]|district-/.test(r.url())&&r.ok())assets.push(r.url());});
  const press=async(key,n=1)=>{for(let i=0;i<n;i++){
   if(['z','x','p'].includes(key))await page.locator(`[data-key="${({z:'a',x:'b',p:'start'})[key]}"]`).last().tap();
   else {await page.keyboard.down(key);await page.waitForTimeout(50);await page.keyboard.up(key);}
   await page.waitForTimeout(220);
  }};
  const tap=async(key,n=1)=>{for(let i=0;i<n;i++){await page.locator(`[data-key="${key}"]`).last().tap();await page.waitForTimeout(220);}};
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
  const capture=async name=>{
   stages.push(name);
   const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(document.querySelector('#game-canvas'),0,0,240,180);return c.toDataURL();});
   writeFileSync(`${outDir}/${engineName}-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
   if(name==='nord-menu'||name==='centro-risky-review')await page.screenshot({path:`${outDir}/${engineName}-${name}-mobile.png`});
   console.log(`${engineName}: ${name}`);
  };
  const waitMap=async id=>{await page.waitForFunction(id=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId===id,id,{timeout:8000});await page.waitForTimeout(600);};
  const boot=async()=>{await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);await press('z',2);await page.waitForTimeout(900);await press('x',24);};
  const openKiosk=async()=>{await press('ArrowUp',7);await press('ArrowRight');await press('ArrowUp');await press('z');};
  const lastPage=()=>tap('right',7);
  await boot();await press('ArrowDown');await press('ArrowLeft',15);await press('z');await waitMap('tour_feed');await press('x',8);await capture('hub');
  await press('ArrowLeft',7);await press('ArrowUp',9);await waitMap('district_nord');await capture('nord-arrival');await openKiosk();await capture('nord-menu');
  await press('z');await capture('nord-debate-review');await lastPage();await press('z');await page.waitForTimeout(900);await capture('nord-boss-briefing');await press('x');
  assert.deepEqual(core(await saved()),core(earned),'Declining a real boss briefing consumed an action');
  await press('z');await tap('down');await press('z');await capture('nord-prudent-review');await lastPage();await press('x',2);
  assert.deepEqual(core(await saved()),core(earned),'Cancelling a paginated dossier changed resources');
  await press('z');await tap('down');await press('z');await lastPage();
  const beforePrudent=await saved(),expectedPrudent=structuredClone(beforePrudent);assert.ok(commitDistrictDecision(expectedPrudent,'nord','prudent').ok);
  await press('z');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).election.districts.find(d=>d.id==='nord').outcomes.length===1);
  assert.deepEqual(core(await saved()),core(expectedPrudent));await capture('nord-prudent-result');await press('x',2);
  await press('z');await tap('down',3);await press('z');await capture('nord-endorsement-review');await lastPage();
  const beforeEndorse=await saved(),expectedEndorse=structuredClone(beforeEndorse);
  const preview=previewDistrictDecision(expectedEndorse,'nord','endorsement','campo_secretary');assert.ok(preview.ok);assert.equal(preview.localDelta,-3);
  assert.ok(commitDistrictDecision(expectedEndorse,'nord','endorsement','campo_secretary').ok);
  await press('z');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).flags['district-complete:nord']);
  assert.deepEqual(core(await saved()),core(expectedEndorse));await capture('nord-closed-result');await press('x',2);
  await press('z');await press('p');await capture('nord-closed-history');await lastPage();await press('x',2);
  assert.deepEqual(core(await saved()),core(expectedEndorse),'Closed history replayed effects');
  assert.equal((await saved()).election.endorsementDistrictByAlly.campo_secretary,'nord');
  await press('ArrowLeft');await press('ArrowDown',8);await waitMap('tour_feed');
  await press('ArrowRight',5);await press('ArrowUp');await waitMap('district_centro');await openKiosk();
  await tap('down',3);await press('z');await capture('centro-used-ally-denied');await press('x');
  assert.deepEqual(core(await saved()),core(expectedEndorse),'Used endorsement was reused');
  await press('z');await tap('down',2);await press('z');await capture('centro-risky-review');await lastPage();await capture('centro-risky-effects');await press('x',2);
  assert.deepEqual(core(await saved()),core(expectedEndorse),'Risky preview broke a real coalition');
  // Use alternate return port 10 in Centro; subsequent districts use port 9.
  await press('ArrowDown',8);await waitMap('tour_feed');
  for(const [id,dx] of [['sud',5],['isole',5],['feed',0]]){
   if(dx)await press('ArrowRight',dx);
   await press(id==='feed'?'ArrowDown':'ArrowUp',id==='feed'?4:1);await waitMap('district_'+id);
   await capture(id+'-arrival');await openKiosk();await capture(id+'-menu');await tap('down',2);await press('z');await capture(id+'-risk-review');await lastPage();await press('x',2);
   assert.deepEqual(core(await saved()),core(expectedEndorse),id+' preview changed the save');
   await press('ArrowLeft');await press('ArrowDown',8);await waitMap('tour_feed');
  }
  await press('ArrowLeft',9);await press('ArrowUp',7);await press('ArrowRight');await press('ArrowUp');await capture('palace-still-locked');await press('x',4);
  assert.equal((await saved()).pos.mapId,'tour_feed');assert.ok(!(await saved()).flags.tourComplete);
  assert.deepEqual(core(await saved()),core(expectedEndorse));
  // An untouched, actually won five-district save tests the Palace gate in production.
  const tourReport='artifacts/campaign-native/tour-final-ellyna-direct-20261002.json';
  const tourCode=earnedCode(tourReport,'tour-five-dossiers');
  const won=importSaveCode(tourCode);assert.ok(won.flags.tourComplete);assert.equal(won.election.phase,'ready');
  assert.deepEqual(won.pos,{mapId:'tour_feed',x:19,y:9,facing:'down'});
  await seed(won);await boot();await press('ArrowLeft',9);await press('ArrowUp',7);await press('ArrowRight');await press('ArrowUp');await waitMap('palazzo_feed');await capture('earned-palace-entry');
  assert.deepEqual(core(await saved()),core(won));assert.deepEqual(errors,[]);
  for(const id of ['nord','centro','sud','isole','feed'])assert.ok(assets.some(u=>u.includes(`district-${id}.png`)),`Missing loaded ${id} artwork`);
  const result={base,engine:engineName,profile:{viewport:'390x844',touch:true,dpr:2},sourceReport,sourceCodeSha256:createHash('sha256').update(code).digest('hex'),earnedTourReport:tourReport,earnedTourCodeSha256:createHash('sha256').update(tourCode).digest('hex'),stages,assets:[...new Set(assets)],checks:['untouched earned Hotel save; native world navigation','actual touch A/B/menu/dossier directions','manual boss briefing declined without battle result','paginated cancellation preserves resources','prudent and negative-compatible endorsement committed exactly once','closed kiosk reopens read-only history','one ally endorsement cannot be reused in another district','all five illustrated dossiers and both return ports','Palace remains locked with one closed district','untouched five-win Tour save opens Palace; no fake victories']};
  writeFileSync(`artifacts/tour-release-${engineName}.json`,JSON.stringify(result,null,2)+'\n');
  console.log(`PASS Tour ${engineName}: touch dossiers, exact commits, closed history, five districts, earned Palace gate.`);
  await context.close();
 }finally{await browser.close();}
}
