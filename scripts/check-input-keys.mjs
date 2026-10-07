/** Keyboard and native-text input semantics on a touch device: aliases (arrows / WASD) do not release each other, key repeat neither cancels a hold nor resurrects a cleared one,
 * and typing in the native text field never moves the game. (The old on-screen cross and A/B buttons these used to share a file with are gone: see check-world-controls.) */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL??process.env.UI_LAYOUT_URL??'http://127.0.0.1:5190';
const browser=await chromium.launch();
try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await context.addInitScript(()=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__input&&window.stack?.top);
  // Isolate control state from game actions; never inject progression/rewards.
  await page.evaluate(()=>{window.stack.replace({update(){},draw(){}});window.__input.reset();document.querySelector('canvas').focus();});
  const held=key=>page.evaluate(key=>window.__input.isHeld(key),key);
  await page.keyboard.down('ArrowRight');await page.keyboard.down('d');await page.keyboard.up('ArrowRight');assert.ok(await held('right'),'one key released the other alias');await page.keyboard.up('d');assert.equal(await held('right'),false);
  await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowRight');assert.ok(await held('right'),'repeat cancelled an existing hold');
  await page.evaluate(()=>window.__input.reset());await page.keyboard.down('ArrowRight');assert.equal(await held('right'),false,'repeat resurrected an input cleared by reset');
  await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowRight');assert.ok(await held('right'),'fresh press after reset was ignored');await page.keyboard.up('ArrowRight');
  await page.evaluate(async()=>{const {openNativeKeyboard}=await import('/src/engine/nativeInput.ts');openNativeKeyboard({initial:'',maxLength:8,onInput:v=>window.__repeatText=v});});
  await page.keyboard.down('d');await page.keyboard.down('d');await page.keyboard.up('d');
  assert.equal(await page.locator('#native-text-input').inputValue(),'dd','repeat stopped native text entry');assert.equal(await held('right'),false,'native typing moved the game');
  await page.evaluate(async()=>{const {closeNativeKeyboard}=await import('/src/engine/nativeInput.ts');closeNativeKeyboard();document.querySelector('canvas').focus();});
  assert.deepEqual(errors,[],'page errors');
  console.log('Input keys ok: aliases, repeat, reset and native text entry.');
}finally{await browser.close();}
