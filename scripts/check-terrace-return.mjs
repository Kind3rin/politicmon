// Routing fixtures only: these placements do not prove an earned final victory.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';
const base=process.env.PREVIEW_URL??'http://127.0.0.1:4184';
const code=JSON.parse(readFileSync('artifacts/campaign-native/diplomacy-final-ellyna-direct-20261002.json','utf8')).codes['diplomacy-verbale'];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();const results=[];
 try{for(const x of [5,6,10,11]){
  const fixture=importSaveCode(code);
  fixture.pos={mapId:'palazzo_feed_terrazza',x,y:10,facing:x<10?'up':'down'};
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
  await context.addInitScript(save=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');},serializeGameState(fixture));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const press=async k=>{await page.keyboard.down(k);await page.waitForTimeout(50);await page.keyboard.up(k);await page.waitForTimeout(220);};
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
  await press('z');await press('z');await page.waitForTimeout(700);for(let i=0;i<8;i++)await press('x');
  await press(x<10?'ArrowUp':'ArrowDown');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId==='palazzo_feed');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
  assert.deepEqual(state.pos,{mapId:'palazzo_feed',x:9,y:2,facing:'down'});
  for(const key of ['money','party','bag','morale','coalition','election'])assert.deepEqual(state[key],fixture[key]);
  assert.deepEqual(errors,[]);results.push({fixtureOnly:true,placedAt:fixture.pos,exit:{x,y:x<10?9:11},arrival:state.pos,resourcesPreserved:true});
  console.log(`PASS terrace routing fixture ${name}: return ${x},${x<10?9:11}.`);await context.close();
 }}finally{await browser.close();}
 writeFileSync(`artifacts/terrace-return-${name}.json`,JSON.stringify({base,engine:name,fixtureOnly:true,results},null,2)+'\n');
}
