// Native production routes from an untouched, manually earned Hotel victory.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';

const base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
const touchBeats=process.env.TOUCH_BEATS==='1';
const sourceReport=process.env.RESUME_REPORT??'artifacts/campaign-native/diplomacy-final-ellyna-direct-20261002.json';
const code=JSON.parse(readFileSync(sourceReport,'utf8')).codes['diplomacy-verbale'];
const earned=importSaveCode(code);
assert.ok(earned.flags.diplomacyComplete && !earned.flags['genova-techno-complete']);
assert.deepEqual(earned.pos,{mapId:'diplomacy_lobby',x:16,y:9,facing:'left'});
assert.equal(earned.reduceEffects,true);
const sequence=['ArrowLeft','z','ArrowRight','ArrowUp','z','ArrowDown'];
mkdirSync('artifacts/screens/genova',{recursive:true});
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();
 try { for(const timed of [false,true]) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
  await context.addInitScript(save=>{
   sessionStorage.setItem('politicmon-intro-seen','1');
   localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));
   localStorage.setItem('politicmon-save-v18__s0',save);
   localStorage.setItem('politicmon-active-slot','0');
  },serializeGameState(earned));
  const page=await context.newPage(),errors=[],assets=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(/genova|epilogue\/techno/.test(r.url())&&r.ok())assets.push(r.url());});
  const press=async(key,delay=220)=>{await page.keyboard.down(key);await page.waitForTimeout(50);await page.keyboard.up(key);await page.waitForTimeout(delay);};
  const rhythmPress=async(key,delay)=>{
   if(!touchBeats)return press(key,delay);
   const button=({ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',z:'a'})[key];
   await page.locator(`[data-key="${button}"]`).tap();await page.waitForTimeout(delay);
  };
  const steps=async(key,n)=>{for(let i=0;i<n;i++)await press(key);};
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
  const capture=async suffix=>{
   const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(document.querySelector('#game-canvas'),0,0,240,180);return c.toDataURL();});
   writeFileSync(`artifacts/screens/genova/${engineName}-${timed?'timed':'accessible'}-${suffix}.png`,Buffer.from(data.split(',')[1],'base64'));
   if(suffix==='ready')await page.screenshot({path:`artifacts/screens/genova/${engineName}-${timed?'timed':'accessible'}-mobile.png`});
  };
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
  await press('z');await press('z');await page.waitForTimeout(900);await steps('x',24);
  await press('ArrowDown');await steps('ArrowRight',2);await press('z');await page.waitForTimeout(600);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId==='genova_techno');
  await steps('x',8);await steps('ArrowRight',6);await steps('ArrowUp',2);await press('z');await capture('accountant');
  const dialogueVisible=()=>page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=240;c.height=180;
   const ctx=c.getContext('2d');ctx.drawImage(document.querySelector('#game-canvas'),0,0,240,180);
   const p=ctx.getImageData(225,149,1,1).data;return p[0]>220&&p[1]>210&&p[2]>180;
  });
  for(let n=0;n<60&&await dialogueVisible();n++)await press('x');
  assert.equal(await dialogueVisible(),false,'Accountant dialogue did not close');
  for(const key of ['money','party','bag','morale','coalition','election'])assert.deepEqual((await saved())[key],earned[key],`Accountant changed ${key}`);
  await steps('ArrowLeft',6);await steps('ArrowUp',5);await press('z');await capture('ready');
  if(timed)await press('ArrowRight');
  await press('z',10);await press('x');await capture('pause');
  const canvasHash=async()=>createHash('sha256').update(await page.evaluate(()=>document.querySelector('#game-canvas').toDataURL())).digest('hex');
  const frozen=await canvasHash();
  await page.waitForTimeout(1500);
  assert.equal(await canvasHash(),frozen,'Pause timer or drawing changed');
  await press('x');
  let unchanged=await saved();
  for(const key of ['money','party','bag','morale','coalition','election','sondaggi'])assert.deepEqual(unchanged[key],earned[key],`Cancel changed ${key}`);
  assert.ok(!unchanged.flags['genova-techno-complete']);
  await press('z');if(timed)await press('ArrowRight');await press('z',10);
  for(let i=0;i<sequence.length;i++) {
   if(timed)await page.waitForFunction(index=>{
    const c=document.createElement('canvas');c.width=240;c.height=180;
    const ctx=c.getContext('2d');ctx.drawImage(document.querySelector('#game-canvas'),0,0,240,180);
    const p=ctx.getImageData(26+33*index,25,1,1).data;
    if(p[0]!==255||p[1]!==227||p[2]!==138)return false;
    const bar=ctx.getImageData(108,110,20,1).data;
    for(let k=0;k<bar.length;k+=4)if(bar[k]===255&&bar[k+1]===227&&bar[k+2]===138)return true;
    return false;
   },i,{polling:'raf',timeout:2500});
   await rhythmPress(sequence[i],timed?20:120);
  }
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).flags['genova-techno-complete']);
  await capture('result');const paid=await saved();
  assert.ok(paid.flags['genova-techno:perfetto'],'Native six-beat performance was not perfect');
  assert.equal(paid.money,earned.money+1200);assert.equal(paid.sondaggi,100);
  for(const key of ['party','bag','morale','coalition','election'])assert.deepEqual(paid[key],earned[key],`Reward changed ${key}`);
  await press('z');await press('z');await capture('practice-ready');
  await press('z');for(const key of sequence)await rhythmPress(key,120);
  await capture('practice-result');assert.deepEqual(await saved(),paid,'Practice paid or changed state');
  await press('z');if(!timed)await press('ArrowRight');await steps('ArrowDown',8);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId==='diplomacy_lobby');
  assert.deepEqual(errors,[]);assert.ok(assets.some(u=>u.includes('npc_genova-dj_south')));
  assert.ok(assets.some(u=>u.includes('epilogue/techno.png')));
  const result={base,engine:engineName,timed,touchBeats,profile:{viewport:'390x844',hasTouch:true,deviceScaleFactor:2},sourceReport,sourceSaveCodeSha256:createHash('sha256').update(code).digest('hex'),returnPort:timed?10:11,paidMoney:1200,paidPolls:0,assets,checks:['untouched earned Hotel victory','native keys through Hotel confirmation and DJ','accountant dialogue fully paginated; resources preserved','pause freezes for 1.5s; cancel preserves all resources',touchBeats?'six correct beats with actual touchscreen taps and rendered cues':'six correct beats via native keys and rendered cues','one exact reward; morale, coalition and election preserved','DJ opens practice; completed practice preserves the whole save','native return through Hotel port']};
  writeFileSync(`artifacts/genova-release-${engineName}-${timed?'timed':'accessible'}${touchBeats?'-touch':''}.json`,JSON.stringify(result,null,2)+'\n');
  console.log(`PASS Genova ${engineName} ${timed?'timed':'accessible'} ${touchBeats?'touch':'keyboard'}: native reward, practice and return ${result.returnPort}.`);
  await context.close();
 } } finally {await browser.close();}
}
