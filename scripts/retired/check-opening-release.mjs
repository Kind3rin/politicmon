import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';

const base=process.env.PREVIEW_URL??'http://127.0.0.1:4184/';
const report={base,physicalDevice:false,engines:[]};
mkdirSync('artifacts/screens/opening',{recursive:true});
const layouts=[
 ['portrait',412,915,{top:28,bottom:24,left:0,right:0}],
 ['compact',320,568,{top:0,bottom:0,left:0,right:0}],
 ['landscape',915,412,{top:0,bottom:24,left:36,right:0}],
 ['compact-landscape',568,320,{top:0,bottom:16,left:44,right:44}]
];
for(const [engine,type]of[['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch(),proof={engine,layouts:[],routes:[]};
 const open=async({width=412,height=915,motion='no-preference',setup,route}={})=>{
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:3,hasTouch:true,isMobile:true,reducedMotion:motion,serviceWorkers:'block'});
  if(setup)await context.addInitScript(setup);
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('/intro.mp4'))requests.push(r.url());});
  if(route)await page.route('**/intro.mp4?*',route);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  return{context,page,errors,requests};
 };
 const first=async page=>{
  await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
  return page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=240;c.height=180;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(document.querySelector('#game-canvas'),0,0,240,180);
   return[...g.getImageData(130,115,1,1).data];
  });
 };
 const closed=async page=>{
  await page.waitForFunction(()=>document.querySelector('#intro-overlay').hidden,undefined,{timeout:12000});
  assert.equal(await page.locator('#app').evaluate(n=>n.inert),false);
  assert.deepEqual(await first(page),[244,211,74,255],'intro input changed the title selection');
 };
 try{
  for(const [name,width,height,safe]of layouts){
   const {context,page,errors}=await open({width,height});
   await page.waitForFunction(()=>document.querySelector('#intro-video').readyState>=2);
   // Freeze only the audit frame; the normal-end route below plays naturally.
   await page.locator('#intro-video').evaluate(v=>v.pause());
   await page.evaluate(safe=>{for(const [side,value]of Object.entries(safe))document.documentElement.style.setProperty('--safe-'+side,value+'px');},safe);
   const geometry=await page.evaluate(()=>{
    const box=id=>{const n=document.getElementById(id),r=n.getBoundingClientRect();return{id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};};
    const v=document.querySelector('#intro-video');return{boxes:['intro-brand','intro-video','intro-line','intro-skip'].map(box),video:{width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted},inert:document.querySelector('#app').inert,focus:document.activeElement.id};
   });
   assert.equal(geometry.inert,true);assert.equal(geometry.focus,'intro-skip');assert.equal(geometry.video.muted,true);
   assert.equal(geometry.video.width/geometry.video.height,4/3);assert.ok(geometry.video.duration>=4&&geometry.video.duration<4.2);
   assert.equal(await page.locator('#intro-overlay').getAttribute('role'),'dialog');
   for(const r of geometry.boxes)assert.ok(r.x>=safe.left-1&&r.right<=width-safe.right+1&&r.y>=safe.top-1&&r.bottom<=height-safe.bottom+1,`${name}: clipped ${r.id}`);
   const [brand,video,line,skip]=geometry.boxes;assert.ok(brand.bottom<=video.y&&video.bottom<=line.y&&line.bottom<=skip.y,'intro copy or skip covers the video');
   assert.ok(skip.w>=44&&skip.h>=44);
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'intro-skip');
   await page.screenshot({path:`artifacts/screens/opening/${engine}-${name}.png`});
   await page.locator('#intro-skip').click();await closed(page);assert.deepEqual(errors,[]);
   proof.layouts.push({name,width,height,safe,geometry});await context.close();
   console.log(`PASS ${engine} opening layout ${name}`);
  }
  for(const key of ['Enter','Escape','Space','z','x','k','j','Backspace']){
   const {context,page,errors}=await open();await page.waitForFunction(()=>document.querySelector('#app').inert);
   await page.keyboard.press('ArrowDown');await page.keyboard.press(key);await closed(page);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'game-canvas');
   await page.keyboard.press('ArrowDown');await page.waitForTimeout(100);assert.notDeepEqual(await first(page),[244,211,74,255],'game input not restored');
   assert.deepEqual(errors,[]);proof.routes.push({route:'keyboard',key,passed:true});await context.close();
  }
  for(const key of ['Enter','Space','z','k']){
   const {context,page,errors}=await open();await page.waitForFunction(()=>document.querySelector('#app').inert);
   await page.keyboard.down(key);await closed(page);
   await page.keyboard.down(key);await page.waitForTimeout(100);await closed(page);
   await page.keyboard.up(key);
   // After release, the next deliberate press still opens difficulty.
   await page.keyboard.press(key);await page.waitForTimeout(100);
   const border=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=180;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(document.querySelector('#game-canvas'),0,0,240,180);return[...g.getImageData(26,46,1,1).data];});
   assert.deepEqual(border,[244,211,74,255],'fresh confirmation after release was lost');
   assert.deepEqual(errors,[]);proof.routes.push({route:'held-confirmation',key,passed:true});await context.close();
  }
  for(const route of ['natural-end','tap','reduced-motion','seen','missing-video','autoplay-rejected','stalled-download']){
   const options=route==='natural-end'?{setup:()=>document.addEventListener('ended',e=>{window.__openingEnded={at:e.target.currentTime,duration:e.target.duration};},true)}:route==='reduced-motion'?{motion:'reduce'}:route==='seen'?{setup:()=>sessionStorage.setItem('politicmon-intro-seen','1')}:route==='missing-video'?{route:r=>r.fulfill({status:404,body:''})}:route==='stalled-download'?{route:()=>{}}:route==='autoplay-rejected'?{setup:()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('simulated autoplay refusal'));}}:{};
   const {context,page,errors,requests}=await open(options);
   if(route==='tap'){await page.waitForFunction(()=>document.querySelector('#app').inert);await page.touchscreen.tap(200,300);}
   await closed(page);assert.deepEqual(errors,[]);
   if(['reduced-motion','seen'].includes(route))assert.equal(requests.length,0,'unused intro downloaded');
   if(route==='natural-end'){
    const ended=await page.evaluate(()=>window.__openingEnded);assert.ok(ended&&ended.at>=4&&Math.abs(ended.at-ended.duration)<.05,'natural route did not actually reach the end of the film');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('politicmon-intro-seen')),'1');
    const before=requests.length;await page.reload({waitUntil:'domcontentloaded'});await closed(page);assert.equal(requests.length,before,'intro repeats or downloads in the same session');
   }
   proof.routes.push({route,passed:true,introRequests:requests.length});await context.close();console.log(`PASS ${engine} opening ${route}`);
  }
  report.engines.push(proof);
 }finally{await browser.close();}
}
mkdirSync('artifacts/reports',{recursive:true});writeFileSync('artifacts/reports/opening-release.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS compiled opening: both engines, safe-area layouts, input isolation, reduced motion, repeat suppression, natural end and failure recovery');
