import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const base=process.env.PREVIEW_URL??'https://politicmon.vercel.app/';
for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await browserType.launch();
 try{
  for(const [width,height,touch] of [[390,844,true],[844,390,true],[1280,800,false]]){
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
   assert.deepEqual(errors,[]);console.log(`PASS public shell ${engine} ${width}x${height}: layout, frozen title, native focus and resume`);
   await context.close();
  }
 }finally{await browser.close();}
}
