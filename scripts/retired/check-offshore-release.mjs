// Production build only: resume an earned save and walk through the Lido door.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
import { importSaveCode, serializeGameState } from '../src/game/state.ts';
const reportPath=process.env.RESUME_REPORT??'artifacts/campaign-native/offshore-final-ellyna-direct-20261002.json';
const report=JSON.parse(readFileSync(reportPath,'utf8'));
const state=importSaveCode(report.codes['offshore-arrival']);
assert.ok(state?.flags['garante-beaten']&&!state.flags['offshore-beaten']);
assert.deepEqual(state.pos,{mapId:'offshore',x:3,y:9,facing:'right'});
const save=serializeGameState(state),base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.addInitScript(save=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');},save);
  const page=await context.newPage(),errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('offshore_bar.png')&&r.ok())assets.push(r.url());});
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
  const press=async key=>{await page.keyboard.down(key);await page.waitForTimeout(70);await page.keyboard.up(key);await page.waitForTimeout(220);};
  await press('z');await press('z');await page.waitForTimeout(1000);for(let n=0;n<24;n++)await press('z');
  await press('ArrowRight');await press('ArrowRight');await press('ArrowUp');
  for(let n=0;n<9;n++)await press('ArrowRight');for(let n=0;n<3;n++)await press('ArrowUp');
  await page.waitForTimeout(400);
  mkdirSync('artifacts/screens/offshore',{recursive:true});
  const data=await page.evaluate(()=>{const native=document.createElement('canvas');native.width=240;native.height=180;native.getContext('2d').drawImage(document.querySelector('#game-canvas'),0,0,240,180);return native.toDataURL();});
  writeFileSync(`artifacts/screens/offshore/release-${name}-lido.png`,Buffer.from(data.split(',')[1],'base64'));
  assert.ok(assets.length,'New Lido PNG never loaded in public world');
  await press('ArrowUp');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId==='bar-offshore',{},{timeout:5000});
  const loaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
  assert.equal(loaded.money,state.money);assert.deepEqual(loaded.morale,state.morale);assert.deepEqual(loaded.party,state.party);
  assert.deepEqual(errors,[]);
  writeFileSync(`artifacts/offshore-release-${name}.json`,JSON.stringify({base,engine:name,sourceReport:reportPath,assets,checks:['continue and slot via native keys','earned arrival save unchanged','walk to new Lido and enter actual door','no money/morale/party mutation on travel']},null,2)+'\n');
  console.log(`PASS release Offshore ${name}: earned save, native slot/world/door input, new Lido PNG and unchanged resources.`);
  await context.close();
 }finally{await browser.close();}
}
