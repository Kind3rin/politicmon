// Production keyboard routes from untouched earned campaign milestones.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';
const reportPath=process.env.RESUME_REPORT??'artifacts/campaign-native/diplomacy-final-ellyna-direct-20261002.json';
const report=JSON.parse(readFileSync(reportPath,'utf8')),base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
const stages=['diplomacy-arrival','diplomacy-choice','diplomacy-verbale'];
if(process.env.RELEASE_STAGE)assert.ok(stages.includes(process.env.RELEASE_STAGE),'Invalid release stage');
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  for(const stage of stages.filter(s=>!process.env.RELEASE_STAGE||s===process.env.RELEASE_STAGE)){
   const state=importSaveCode(report.codes[stage]);assert.ok(state?.flags.futureResolved);
   assert.equal(Boolean(state.flags.diplomacyComplete),stage==='diplomacy-verbale');
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   await context.addInitScript(save=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');},serializeGameState(state));
   const page=await context.newPage(),errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(/diplomacy|partner-perfetto/.test(new URL(r.url()).pathname)&&r.ok())assets.push(r.url());});
   await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
   const press=async key=>{await page.keyboard.down(key);await page.waitForTimeout(70);await page.keyboard.up(key);await page.waitForTimeout(220);};
   const steps=async(key,n)=>{for(let i=0;i<n;i++)await press(key);};
   await press('z');await press('z');await page.waitForTimeout(1000);for(let n=0;n<24;n++)await press('x');
   if(stage==='diplomacy-arrival'){
    await steps('ArrowLeft',6);await steps('ArrowUp',2);await page.waitForTimeout(800);await steps('ArrowUp',1);await press('z');await page.waitForTimeout(600);await press('z');
    mkdirSync('artifacts/screens/diplomacy',{recursive:true});await page.screenshot({path:`artifacts/screens/diplomacy/release-${name}-choice.png`});
    assert.ok(assets.some(u=>u.includes('ui/campaign/diplomacy.png')),'Choice dossier not loaded');await press('x');await press('x');
   }else if(stage==='diplomacy-choice'){
    await steps('ArrowRight',13);await steps('ArrowUp',1);await page.waitForTimeout(800);await steps('ArrowRight',5);await steps('ArrowUp',6);await steps('ArrowLeft',1);await steps('ArrowUp',2);await press('ArrowRight');await press('z');await page.waitForTimeout(600);await press('z');await page.waitForTimeout(900);
    mkdirSync('artifacts/screens/diplomacy',{recursive:true});await page.screenshot({path:`artifacts/screens/diplomacy/release-${name}-briefing.png`});
    assert.ok(assets.some(u=>u.includes('ui/boss/partner-perfetto.png')),'Boss dossier not loaded');
    // Asset preloads alone cannot prove the dossier is visible. Compare its
    // static BRIEFING header pixels with the independently rendered fixture.
    const header=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=180;const ctx=c.getContext('2d');ctx.drawImage(document.querySelector('#game-canvas'),0,0,240,180);return Array.from(ctx.getImageData(0,0,125,17).data);});
    assert.equal(createHash('sha256').update(Buffer.from(header)).digest('hex'),'1bea39de9bef90897baa2944c216d2ce559903c99f903002af00b1f97d934a3f','Actual rendered BRIEFING header missing');await press('x');
   }else{await steps('ArrowDown',1);await steps('ArrowLeft',16);await press('z');}
   const target=stage==='diplomacy-arrival'?'diplomacy_home':stage==='diplomacy-choice'?'diplomacy_terrace':'tour_feed';
   try{await page.waitForFunction(map=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId===map,target,{timeout:5000});}catch(error){console.log('Unexpected native route',await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos));await page.screenshot({path:'/tmp/politicmon-diplomacy-release-failure.png'});throw error;}
   await page.waitForTimeout(800);const loaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
   for(const key of ['money','party','morale','coalition','election'])assert.deepEqual(loaded[key],state[key],key+' changed');assert.deepEqual(errors,[]);
   assert.ok(assets.some(u=>u.includes('diplomacy_')||u.includes('npc_diplomacy-')),'New artwork not loaded');
   const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(document.querySelector('#game-canvas'),0,0,240,180);return c.toDataURL();});
   mkdirSync('artifacts/screens/diplomacy',{recursive:true});writeFileSync(`artifacts/screens/diplomacy/release-${name}-${stage}.png`,Buffer.from(data.split(',')[1],'base64'));
   writeFileSync(`artifacts/diplomacy-release-${name}-${stage}.json`,JSON.stringify({base,engine:name,sourceReport:reportPath,sourceSaveCodeSha256:createHash('sha256').update(report.codes[stage]).digest('hex'),stage,target,assets,checks:['earned save imported without edits','native slot, continue, movement and warp keys','choice or boss dossier opened and cancelled, or earned Tour entered','new artwork loaded','money, party, morale, coalition, election retained']},null,2)+'\n');
   console.log(`PASS release Diplomacy ${name}: ${stage} -> ${target}, native keys and unchanged resources.`);await context.close();
  }
 }finally{await browser.close();}
}
