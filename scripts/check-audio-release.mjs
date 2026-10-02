import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
const base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.addInitScript(()=>{
   sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));
   window.audioEvidence=[];
   const start=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args){
    if(this.loop)window.audioEvidence.push({duration:this.buffer.duration,channels:this.buffer.numberOfChannels,loopEnd:this.loopEnd});
    return start.apply(this,args);
   };
  });
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/audio/'))requests.push(r.url());});
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
  assert.deepEqual(requests,[],'Release fetched music before input');
  const press=async key=>{await page.keyboard.down(key);await page.waitForTimeout(90);await page.keyboard.up(key);await page.waitForTimeout(90);};
  await press('ArrowDown');await press('ArrowDown');await press('z');
  await page.waitForFunction(()=>window.audioEvidence.length===1);
  await press('ArrowDown');await press('ArrowLeft');await press('ArrowDown');await press('ArrowLeft');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon.audio.v1'))),{enabled:true,music:40,effects:60});
  await press('ArrowUp');await press('ArrowUp');await press('z');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon.audio.v1')).enabled),false);
  await press('z');await page.waitForFunction(()=>window.audioEvidence.length===2);
  const loops=await page.evaluate(()=>window.audioEvidence);
  assert.ok(loops.every(l=>l.channels===2&&l.loopEnd>17&&l.loopEnd<17.2&&Math.abs(l.duration-l.loopEnd)<.08));
  mkdirSync('artifacts/screens/audio',{recursive:true});
  await page.locator('#game-canvas').screenshot({path:`artifacts/screens/audio/release-${name}.png`});
  await press('x');await page.reload({waitUntil:'networkidle'});
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon.audio.v1')));
  assert.deepEqual(persisted,{enabled:true,music:40,effects:60});
  assert.deepEqual(await page.evaluate(()=>window.audioEvidence),[],'Reload bypassed gesture');
  assert.deepEqual(errors,[]);
  writeFileSync(`artifacts/audio-release-${name}.json`,JSON.stringify({base,engine:name,loops,persisted,checks:['no music before gesture','real title input opens mixer','independent sliders','mute/unmute title loop','reload preferences and gesture']},null,2)+'\n');
  console.log(`PASS release audio ${name}: native title/mixer input, stereo loop, independent volumes, mute/resume and reload.`);
  await context.close();
 }finally{await browser.close();}
}
