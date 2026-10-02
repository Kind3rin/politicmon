// Production input test. Three states come from a completed earned Future campaign.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';
const reportPath=process.env.RESUME_REPORT??'artifacts/campaign-native/future-final-ellyna-direct-20261002.json';
const report=JSON.parse(readFileSync(reportPath,'utf8')),base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  for(const stage of ['future-arrival','future-choice','future-diplomacy']){
   const state=importSaveCode(report.codes[stage]);assert.ok(state?.flags['ue-beaten']);
   assert.ok(state.flags['future-chapter-unlocked']);assert.equal(Boolean(state.flags.futureResolved),stage==='future-diplomacy');
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   await context.addInitScript(save=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');},serializeGameState(state));
   const page=await context.newPage(),errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(/future_|npc_future-|futuro-anteriore/.test(new URL(r.url()).pathname)&&r.ok())assets.push(r.url());});
   await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
   const press=async key=>{await page.keyboard.down(key);await page.waitForTimeout(70);await page.keyboard.up(key);await page.waitForTimeout(220);};
   await press('z');await press('z');await page.waitForTimeout(1000);for(let n=0;n<24;n++)await press('x');
   if(stage==='future-arrival'){
    await press('ArrowRight');await press('ArrowUp');await press('ArrowUp');
   }else if(stage==='future-choice'){
    await press('ArrowUp');await press('ArrowLeft');await press('ArrowUp');await press('z');await page.waitForTimeout(600);await press('z');await press('z');await page.waitForTimeout(600);
    // The dossier is opened deliberately, then cancelled before combat.
    assert.ok(assets.some(u=>u.includes('futuro-anteriore.png')),'Boss dossier artwork not loaded');
    mkdirSync('artifacts/screens/future',{recursive:true});await page.screenshot({path:`artifacts/screens/future/release-${name}-briefing.png`});
    await press('x');await press('p');await press('z');for(let n=0;n<6;n++)await press('x');
   }else await press('ArrowDown');
   const target=stage==='future-arrival'?'futuro_sede':stage==='future-choice'?'futuro_sede':'futuro_piazza';
   try{await page.waitForFunction(map=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId===map,target,{timeout:5000});}catch(error){console.log('Unexpected native route',await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos));await page.screenshot({path:'/tmp/politicmon-future-route-failure.png'});throw error;}
   await page.waitForTimeout(800);
   const loaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
   assert.equal(loaded.money,state.money);assert.deepEqual(loaded.party,state.party);assert.deepEqual(loaded.morale,state.morale);assert.deepEqual(loaded.coalition,state.coalition);assert.deepEqual(loaded.election,state.election);assert.deepEqual(errors,[]);
   assert.ok(assets.some(u=>u.includes('future_')||u.includes('npc_future-')),'New artwork not loaded');
   mkdirSync('artifacts/screens/future',{recursive:true});const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(document.querySelector('#game-canvas'),0,0,240,180);return c.toDataURL();});
   writeFileSync(`artifacts/screens/future/release-${name}-${stage}.png`,Buffer.from(data.split(',')[1],'base64'));
   writeFileSync(`artifacts/future-release-${name}-${stage}.json`,JSON.stringify({base,engine:name,sourceReport:reportPath,sourceSaveCodeSha256:createHash("sha256").update(report.codes[stage]).digest("hex"),stage,target,assets,checks:['earned save imported without edits','native slot/continue/map/warp keys','new artwork loaded','Future facade entered, manual boss dossier cancelled, or earned diplomatic return','travel leaves money/party/morale/coalition/election intact']},null,2)+'\n');
   console.log(`PASS release Future ${name}: ${stage} -> ${target}, native keys, new artwork and unchanged resources.`);await context.close();
  }
 }finally{await browser.close();}
}
