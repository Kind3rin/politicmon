import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';
const base=process.env.PREVIEW_URL??'http://127.0.0.1:4184/';
const code=JSON.parse(readFileSync('docs/controls-campaign-proof.json','utf8')).campaigns.find(c=>c.starter==='giorgetta'&&c.earnedEndingCode).earnedEndingCode;
const initial=importSaveCode(code);assert.ok(initial.flags.atto3Complete);assert.deepEqual(initial.ministri,{});
const core=s=>Object.fromEntries(['party','bag','money','morale','coalition','election','ministri'].map(k=>[k,s[k]]));
const reports=[];mkdirSync('artifacts/screens/government-release',{recursive:true});
for(const [engine,type]of[['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 try{
  const context=await browser.newContext({viewport:{width:412,height:915},hasTouch:true,isMobile:true,deviceScaleFactor:3,serviceWorkers:'block'});
  await context.addInitScript(save=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));if(!localStorage.getItem('politicmon-save-v18__s0'))localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');},serializeGameState(initial));
  const page=await context.newPage(),errors=[],assets=new Set(),stages=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.ok()&&r.url().includes('/government.png'))assets.add(new URL(r.url()).pathname);});
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
  const tap=async(key,n=1)=>{for(let i=0;i<n;i++){await page.locator(`[data-key="${key}"]`).last().tap();await page.waitForTimeout(140);}};
  const capture=async name=>{await page.screenshot({path:`artifacts/screens/government-release/${engine}-${name}.png`});stages.push(name);};
  const load=async()=>{await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);await tap('a',2);await page.waitForTimeout(800);await tap('b',24);await tap('start');await tap('down',6);await tap('a');await page.waitForTimeout(250);};
  await load();await capture('list');assert.deepEqual(core(await saved()),core(initial));
  await tap('a');await capture('dossier');await tap('b');assert.deepEqual(core(await saved()),core(initial));
  await tap('a',3);await capture('party');await tap('b',2);assert.deepEqual(core(await saved()),core(initial));
  await tap('a',4);await capture('candidate-cancel');assert.deepEqual(core(await saved()),core(initial));await tap('b');assert.deepEqual(core(await saved()),core(initial));
  await tap('a',4);await capture('nomination-review');assert.deepEqual(core(await saved()),core(initial));await tap('a');const nominated=await saved();assert.equal(nominated.ministri.economia,initial.party[0].uid);assert.deepEqual({...core(nominated),ministri:{}},core(initial));await capture('economia-active');
  await tap('a',4);await capture('dismissal-cancel');await tap('b');assert.deepEqual(core(await saved()),core(nominated));
  await tap('down',2);await tap('a',4);await capture('transfer-review');assert.deepEqual(core(await saved()),core(nominated));await tap('a');const transferred=await saved();assert.deepEqual(transferred.ministri,{esteri:initial.party[0].uid});assert.deepEqual({...core(transferred),ministri:{}},core(initial));await capture('esteri-active');
  await tap('b');await tap('down',5);await tap('a');await tap('down');await tap('a');await capture('content-earned');await tap('down',9);await capture('content-meme');assert.deepEqual(core(await saved()),core(transferred));
  await load();await capture('reopened-government');assert.deepEqual(core(await saved()),core(transferred));assert.ok(assets.has('/sprites/ui/campaign/government.png'),'Government art never used by compiled scene');assert.deepEqual(errors,[]);
  reports.push({engine,base,stages,assets:[...assets],physicalDevice:false,fixture:'earned normal campaign ending, no adjusted resources',cancelPure:true,nominationSaved:true,transferSaved:true,catalogPure:true,reopenPreserved:true});console.log(`PASS ${engine}: actual mobile controls, dossier/party/signature cancellation, appointment, transfer, catalog and reopen`);await context.close();
 }finally{await browser.close();}
}
mkdirSync('artifacts/reports',{recursive:true});writeFileSync('artifacts/reports/government-release.json',JSON.stringify(reports,null,2)+'\n');
