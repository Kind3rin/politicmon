// Production input test. Both states come from a completed earned campaign.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';
const reportPath=process.env.RESUME_REPORT??'artifacts/campaign-native/brux-final-ellyna-direct-20261002.json';
const report=JSON.parse(readFileSync(reportPath,'utf8')),base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  for(const stage of ['bruxelles-arrival','commissione-result-1']){
   const state=importSaveCode(report.codes[stage]);assert.ok(state?.flags['garante-beaten']);
   assert.equal(Boolean(state.flags['ue-beaten']),stage==='commissione-result-1');
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   await context.addInitScript(save=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');},serializeGameState(state));
   const page=await context.newPage(),errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(/bruxelles_|commissione_/.test(new URL(r.url()).pathname)&&r.ok())assets.push(r.url());});
   await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
   const press=async key=>{await page.keyboard.down(key);await page.waitForTimeout(70);await page.keyboard.up(key);await page.waitForTimeout(220);};
   await press('z');await press('z');await page.waitForTimeout(1000);for(let n=0;n<24;n++)await press('z');
   if(stage==='bruxelles-arrival'){
    await press('ArrowUp');for(let n=0;n<3;n++)await press('ArrowLeft');await press('ArrowUp');
   }else{
    for(let n=0;n<5;n++)await press('ArrowDown');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId==='bruxelles');await page.waitForTimeout(800);for(let n=0;n<2;n++)await press('ArrowRight');for(let n=0;n<7;n++)await press('ArrowDown');for(let n=0;n<5;n++)await press('ArrowRight');await press('z');
   }
   const target=stage==='bruxelles-arrival'?'bar-bruxelles':'campo_largo';
   try{await page.waitForFunction(map=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId===map,target,{timeout:5000});}catch(error){console.log('Unexpected native route',await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos));await page.screenshot({path:'/tmp/politicmon-brux-route-failure.png'});throw error;}
   const loaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
   assert.equal(loaded.money,state.money);assert.deepEqual(loaded.party,state.party);assert.deepEqual(loaded.morale,state.morale);assert.deepEqual(errors,[]);
   assert.ok(assets.some(u=>u.includes(stage==='bruxelles-arrival'?'bruxelles_cafe.png':'npc_commissione_')),'New artwork not loaded');
   mkdirSync('artifacts/screens/bruxelles',{recursive:true});const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(document.querySelector('#game-canvas'),0,0,240,180);return c.toDataURL();});
   writeFileSync(`artifacts/screens/bruxelles/release-${name}-${stage}.png`,Buffer.from(data.split(',')[1],'base64'));
   writeFileSync(`artifacts/bruxelles-release-${name}-${stage}.json`,JSON.stringify({base,engine:name,sourceReport:reportPath,sourceSaveCodeSha256:createHash("sha256").update(report.codes[stage]).digest("hex"),stage,target,assets,checks:['earned save imported without edits','native slot/continue/map/warp keys','new artwork loaded','travel leaves money/party/morale intact']},null,2)+'\n');
   console.log(`PASS release Brussels ${name}: ${stage} -> ${target}, native keys, new artwork and unchanged resources.`);await context.close();
  }
 }finally{await browser.close();}
}
