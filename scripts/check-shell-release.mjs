import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
const reports=[];mkdirSync('artifacts/screens/mobile-release',{recursive:true});
for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await browserType.launch();
 try{
  for(const [width,height,touch] of [[320,568,true],[390,844,true],[568,320,true],[844,390,true],[1280,800,false]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});
   await context.addInitScript(()=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);
   const bounds=await page.locator('#screen-frame').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,'public game frame clipped');
   await page.locator('#shell-help').click();await page.waitForFunction(()=>document.querySelector('#shell-guide').open);
   const canvasHash=()=>page.evaluate(async()=>{const c=document.querySelector('#game-canvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',p))].map(v=>v.toString(16).padStart(2,'0')).join('');});
   const before=await canvasHash();await page.keyboard.press('z');await page.keyboard.press('Tab');await page.waitForTimeout(180);assert.equal(await canvasHash(),before,'public title continued under guide');
   assert.ok(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),'public modal focus escaped');
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#shell-guide').open&&document.activeElement.id==='game-canvas');
   if(touch){
    const pad=await page.locator('#touch-dpad').boundingBox(),cx=pad.x+pad.width/2,cy=pad.y+pad.height/2;
    const active=key=>page.locator(`[data-key="${key}"].dpad-btn`).evaluate(n=>n.hasAttribute('data-held'));
    await page.mouse.move(cx,pad.y+20);await page.mouse.down();assert.ok(await active('up'));
    await page.mouse.move(pad.x+pad.width-20,cy);assert.ok(await active('right'));assert.equal(await active('up'),false);
    await page.mouse.move(cx,cy);assert.equal(await active('right'),false);
    await page.mouse.move(pad.x-8,cy);assert.ok(await active('left'));
    await page.keyboard.down('ArrowLeft');await page.mouse.up();assert.ok(await active('left'),'public pointer release cancelled key');await page.keyboard.up('ArrowLeft');assert.equal(await active('left'),false);
    const a=await page.locator('.a-btn').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x-20,a.y-20);assert.ok(await page.locator('.a-btn').evaluate(n=>n.hasAttribute('data-held')));await page.mouse.up();
    const safe=width>height?{left:44,right:44,top:0,bottom:16}:{left:0,right:0,top:47,bottom:34};
    await page.evaluate(safe=>{for(const [side,value]of Object.entries(safe))document.documentElement.style.setProperty('--safe-'+side,value+'px');window.dispatchEvent(new Event('resize'));},safe);await page.waitForTimeout(100);
    const geometry=await page.evaluate(()=>Object.fromEntries(['#screen-frame','#touch-move','#touch-buttons','#console-top'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y,right:r.right,bottom:r.bottom}];})));
    for(const r of Object.values(geometry))assert.ok(r.x>=safe.left-1&&r.right<=width-safe.right+1&&r.y>=safe.top-1&&r.bottom<=height-safe.bottom+1,'public safe-area clipped');
    const screen=geometry['#screen-frame'];for(const key of ['#touch-move','#touch-buttons','#console-top']){const r=geometry[key];assert.ok(!(screen.x<r.right&&screen.right>r.x&&screen.y<r.bottom&&screen.bottom>r.y),'public controls cover game');}
    reports.push({base,engine,width,height,safe,geometry,drag:true,capture:true,independentKeyHold:true,physicalDevice:false});
   }else reports.push({base,engine,width,height,bounds});
   await page.screenshot({path:`artifacts/screens/mobile-release/${engine}-${width}x${height}.png`});
   assert.deepEqual(errors,[]);console.log(`PASS public shell ${engine} ${width}x${height}: layout, frozen title, native focus and resume`);
   await context.close();
  }
 }finally{await browser.close();}
}
mkdirSync('artifacts/reports',{recursive:true});writeFileSync('artifacts/reports/mobile-shell-release.json',JSON.stringify(reports,null,2)+'\n');
