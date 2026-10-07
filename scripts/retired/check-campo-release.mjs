// Production input test. Three states come from a completed earned campaign.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';
const reportPath=process.env.RESUME_REPORT??'artifacts/campaign-native/campo-final-ellyna-direct-20261002.json';
const report=JSON.parse(readFileSync(reportPath,'utf8')),base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  for(const stage of ['campo-arrival','campo-photo-choice','campo-verbale']){
   const state=importSaveCode(report.codes[stage]);assert.ok(state?.flags['ue-beaten']);
   assert.equal(Boolean(state.flags['future-chapter-unlocked']),stage==='campo-verbale');
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   await context.addInitScript(save=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');},serializeGameState(state));
   const page=await context.newPage(),errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(/campo_|npc_(campo|quantum|civic)/.test(new URL(r.url()).pathname)&&r.ok())assets.push(r.url());});
   await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
   const press=async key=>{await page.keyboard.down(key);await page.waitForTimeout(70);await page.keyboard.up(key);await page.waitForTimeout(220);};
   await press('z');await press('z');await page.waitForTimeout(1000);for(let n=0;n<24;n++)await press('x');
   if(stage==='campo-arrival'){
    await press('ArrowRight');for(let n=0;n<3;n++)await press('ArrowUp');for(let n=0;n<6;n++)await press('ArrowRight');await press('ArrowUp');
   }else{
    for(let n=0;n<10;n++)await press('ArrowDown');for(let n=0;n<10;n++)await press('ArrowRight');for(let n=0;n<5;n++)await press('ArrowUp');
    if(stage==='campo-verbale')await press('z');
   }
   const target=stage==='campo-arrival'?'retropalco_campo':stage==='campo-verbale'?'futuro_piazza':'campo_largo';
   if(stage==='campo-photo-choice'){
    // A blocked gate does not trigger a warp/save. Persist the actual walked
    // position with the game's SALVA action before reading localStorage.
    for(let n=0;n<8;n++)await press('x');await press('p');await press('z');for(let n=0;n<6;n++)await press('x');
   }
   try{await page.waitForFunction(map=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId===map,target,{timeout:5000});}catch(error){console.log('Unexpected native route',await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos));await page.screenshot({path:'/tmp/politicmon-campo-route-failure.png'});throw error;}
   const loaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
   assert.equal(loaded.money,state.money);assert.deepEqual(loaded.party,state.party);assert.deepEqual(loaded.morale,state.morale);assert.deepEqual(loaded.coalition,state.coalition);assert.deepEqual(loaded.election,state.election);assert.deepEqual(errors,[]);
   assert.ok(assets.some(u=>u.includes('campo_')||u.includes('npc_campo')),'New artwork not loaded');
   if(stage==='campo-photo-choice'){assert.equal(loaded.pos.x,20);assert.equal(loaded.pos.y,9);assert.ok(!loaded.flags['future-chapter-unlocked']);}
   mkdirSync('artifacts/screens/campo',{recursive:true});const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(document.querySelector('#game-canvas'),0,0,240,180);return c.toDataURL();});
   writeFileSync(`artifacts/screens/campo/release-${name}-${stage}.png`,Buffer.from(data.split(',')[1],'base64'));
   writeFileSync(`artifacts/campo-release-${name}-${stage}.json`,JSON.stringify({base,engine:name,sourceReport:reportPath,sourceSaveCodeSha256:createHash("sha256").update(report.codes[stage]).digest("hex"),stage,target,assets,checks:['earned save imported without edits','native slot/continue/map/warp keys','new artwork loaded','future gate blocked before victory or crossed after earned win','travel leaves money/party/morale/coalition/election intact']},null,2)+'\n');
   console.log(`PASS release Campo ${name}: ${stage} -> ${target}, native keys, new artwork and unchanged resources.`);await context.close();
  }
 }finally{await browser.close();}
}
