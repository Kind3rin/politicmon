import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';

const base=process.env.BASE_URL??'http://127.0.0.1:5190/';
const cases=[
 ['compact',320,568,2,{top:0,bottom:0,left:0,right:0}],
 ['android-pwa',412,915,3,{top:28,bottom:24,left:0,right:0}],
 ['android-large',430,932,3,{top:32,bottom:32,left:0,right:0}],
 ['android-wide',480,1040,3,{top:32,bottom:24,left:0,right:0}],
 ['android-fractional-density',915,412,2.4,{top:0,bottom:24,left:36,right:0}],
 ['browser-bars',412,700,3,{top:0,bottom:0,left:0,right:0}],
 ['compact-landscape',568,320,2,{top:0,bottom:16,left:44,right:44}],
 ['android-landscape',915,412,3,{top:0,bottom:24,left:36,right:0}],
 ['wide-landscape',1040,480,3,{top:0,bottom:24,left:0,right:36}],
 ['tablet-landscape',1024,768,2,{top:24,bottom:20,left:0,right:0}],
];
const report={base,physicalDevice:false,standaloneDetectionEmulated:true,layouts:[],rotation:[]};
mkdirSync('artifacts/screens/mobile-layout',{recursive:true});
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 try{
  for(const [name,width,height,dpr,safe] of cases){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:dpr,serviceWorkers:'block'});
   await context.addInitScript(()=>{sessionStorage.setItem('politicmon-intro-seen','1');Object.defineProperty(navigator,'standalone',{get:()=>true});});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
   await page.evaluate(safe=>{for(const [side,value]of Object.entries(safe))document.documentElement.style.setProperty('--safe-'+side,value+'px');},safe);
   await page.waitForTimeout(100);
   const inspect=async()=>page.evaluate(()=>{
    const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    const canvas=document.querySelector('canvas');return{viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth,screen:box('#screen-frame'),move:box('#touch-move'),actions:box('#touch-buttons'),top:box('#console-top'),backing:{width:canvas.width,height:canvas.height},targets:[...document.querySelectorAll('#console-top button,#touch-ui button')].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return{label:n.getAttribute('aria-label'),x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};})};
   });
   const verify=(g,w,h,insets)=>{
    assert.equal(g.overflow,false,`${engine}/${name}: horizontal overflow`);
    if(h>w){
     assert.ok(g.top.y<=insets.top+12,'portrait header wastes the upper viewport');
     assert.ok(Math.max(g.move.bottom,g.actions.bottom)>=h-insets.bottom-32,'portrait controls too far from the lower safe edge');
    }
    assert.ok(Math.abs(g.screen.w/g.screen.h-4/3)<.01,'screen stretched');
    assert.ok(g.backing.width>=g.screen.w*dpr&&g.backing.height>=g.screen.h*dpr,'backing resolution below device density');
    const overlap=(a,b)=>a.x<b.right-1&&a.right>b.x+1&&a.y<b.bottom-1&&a.bottom>b.y+1;
    for(const r of [g.screen,g.move,g.actions,g.top,...g.targets])assert.ok(r.x>=insets.left-1&&r.right<=w-insets.right+1&&r.y>=insets.top-1&&r.bottom<=h-insets.bottom+1,`${engine}/${name}: clipped ${JSON.stringify(r)}`);
    for(const r of [g.move,g.actions,g.top])assert.equal(overlap(g.screen,r),false,'controller covers screen');
    for(const r of g.targets)assert.ok(r.label&&r.w>=44&&r.h>=44,'small or unnamed control');
    for(let i=0;i<g.targets.length;i++)for(let j=i+1;j<g.targets.length;j++)assert.equal(overlap(g.targets[i],g.targets[j]),false,'targets overlap');
   };
   const initial=await inspect();verify(initial,width,height,safe);
   await page.screenshot({path:`artifacts/screens/mobile-layout/${engine}-${name}.png`});
   assert.equal(await page.locator('#touch-dpad').isVisible(),true);
   await page.locator('#shell-control-mode').click();assert.equal(await page.locator('#touch-stick').isVisible(),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('politicmon-control')),'stick');
   await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
   assert.equal(await page.locator('#touch-stick').isVisible(),true,'control preference lost on reopen');
   await page.locator('#shell-control-mode').click();assert.equal(await page.locator('#touch-dpad').isVisible(),true);
   if(name==='android-pwa'){
    await page.waitForTimeout(8500);assert.equal(await page.locator('#pwa-banner').count(),0,'installed PWA shows install banner');
    for(const [w,h,insets]of[[915,412,{top:0,bottom:24,left:36,right:0}],[412,700,{top:0,bottom:24,left:0,right:0}],[412,915,safe]]){
     await page.setViewportSize({width:w,height:h});await page.evaluate(insets=>{for(const [side,value]of Object.entries(insets))document.documentElement.style.setProperty('--safe-'+side,value+'px');},insets);await page.waitForTimeout(100);
     const geometry=await inspect();verify(geometry,w,h,insets);report.rotation.push({engine,width:w,height:h,insets,geometry});
    }
   }
   assert.deepEqual(errors,[]);report.layouts.push({engine,name,width,height,dpr,safe,geometry:initial,quickControlSwitch:true,preferenceRetained:true});
   await context.close();console.log(`PASS ${engine} ${name} ${width}x${height} DPR ${dpr}`);
  }
 }finally{await browser.close();}
}
const manifest=await fetch(new URL('manifest.webmanifest',base)).then(r=>r.json());
assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'any');
mkdirSync('artifacts/reports',{recursive:true});writeFileSync('artifacts/reports/mobile-layout.json',JSON.stringify(report,null,2)+'\n');
