import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const base=process.env.BASE_URL??'http://127.0.0.1:5190',reports=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
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
  const pad=await page.locator('#touch-dpad').boundingBox(),cx=pad.x+pad.width/2,cy=pad.y+pad.height/2;
  await page.mouse.move(cx,pad.y+20);await page.mouse.down();assert.ok(await held('up'));
  await page.mouse.move(pad.x+pad.width-20,cy);assert.ok(await held('right'));assert.equal(await held('up'),false);
  await page.mouse.move(cx,cy);assert.equal(await page.evaluate(()=>window.__input.heldDirection()),null,'center must stop');
  await page.mouse.move(pad.x-8,cy);assert.ok(await held('left'),'captured drag beyond pad lost hold');await page.mouse.up();assert.equal(await held('left'),false);
  const action=await page.locator('.a-btn').boundingBox();await page.mouse.move(action.x+action.width/2,action.y+action.height/2);await page.mouse.down();assert.ok(await held('a'));
  await page.mouse.move(action.x-25,action.y-30);assert.ok(await held('a'),'captured A released outside button');
  await page.keyboard.down('z');await page.mouse.up();assert.ok(await held('a'),'pointer release cancelled keyboard A');await page.keyboard.up('z');assert.equal(await held('a'),false);
  let sprint=null;
  // Browser-native multi-touch, including releasing only the action finger.
  if(engine==='chromium'){
   const cdp=await context.newCDPSession(page),u={x:Math.round(cx),y:Math.round(pad.y+20),id:3},a={x:Math.round(action.x+action.width/2),y:Math.round(action.y+action.height/2),id:4};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[u,a]});await page.waitForFunction(()=>window.__input.isHeld('up')&&window.__input.isHeld('a'));assert.ok(await held('up'));assert.ok(await held('a'));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[a]});await page.waitForFunction(()=>!window.__input.isHeld('a'));assert.ok(await held('up'));assert.equal(await held('a'),false);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForFunction(()=>!window.__input.isHeld('up'));assert.equal(await held('up'),false);
   const earned=JSON.parse(readFileSync('artifacts/campaign-native/diplomacy-final-ellyna-direct-20261002.json','utf8')).codes['diplomacy-arrival'];
   await page.evaluate(async code=>{
    const {importSaveCode}=await import('/src/game/state.ts'),{WorldScene}=await import('/src/game/world/WorldScene.ts'),{audio}=await import('/src/engine/audio.ts');audio.enabled=false;
    const state=importSaveCode(code),world=new WorldScene(window.stack,window.__input,state);window.__sprint={state,world};window.stack.replace(world);window.__input.reset();document.querySelector('canvas').focus();
   },earned);await page.waitForTimeout(150);
   for(let i=0;i<4&&await page.evaluate(()=>window.__sprint.world.msg.active);i++){await page.keyboard.press('z');await page.waitForTimeout(120);}
   const before=await page.evaluate(()=>({pos:{...window.__sprint.state.pos},resources:JSON.stringify(Object.fromEntries(['money','party','bag','morale','coalition','election'].map(k=>[k,window.__sprint.state[k]])))}));
   const b=await page.locator('.b-btn').boundingBox(),right={x:Math.round(pad.x+pad.width-20),y:Math.round(cy),id:7},run={x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2),id:8};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right,run]});await page.waitForFunction(x=>window.__sprint.state.pos.x>x&&window.__sprint.world.running,before.pos.x);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[run]});await page.waitForFunction(()=>!window.__input.isHeld('b'));assert.ok(await held('right'),'releasing sprint stopped direction');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForFunction(()=>!window.__input.isHeld('right'));await page.waitForTimeout(250);
   const after=await page.evaluate(()=>({pos:{...window.__sprint.state.pos},resources:JSON.stringify(Object.fromEntries(['money','party','bag','morale','coalition','election'].map(k=>[k,window.__sprint.state[k]])))}));
   assert.equal(after.pos.mapId,before.pos.mapId);assert.ok(after.pos.x>before.pos.x);assert.equal(after.resources,before.resources);sprint={before:before.pos,after:after.pos,earnedSource:'diplomacy-arrival',running:true,resourcesRetained:true};
   await page.evaluate(()=>{window.stack.replace({update(){},draw(){}});window.__input.reset();});
  }
  // Multi-pointer ownership/cancellation also exercised in WebKit. Synthetic
  // events cannot create browser pointer capture; only that method is bypassed.
  await page.evaluate(()=>{
   const a=document.querySelector('.a-btn'),capture=a.setPointerCapture.bind(a);a.setPointerCapture=id=>{if(id<90)capture(id);};
   const fire=(type,id)=>a.dispatchEvent(new PointerEvent(type,{pointerId:id,bubbles:true,pointerType:'touch',cancelable:true}));
   fire('pointerdown',90);fire('pointerdown',91);fire('pointerup',90);
   if(!window.__input.isHeld('a'))throw Error('one finger cancelled another');
   fire('pointercancel',91);if(window.__input.isHeld('a')||a.hasAttribute('data-held'))throw Error('cancel left held feedback');
   fire('pointerdown',90);window.__input.reset();fire('pointermove',90);if(window.__input.isHeld('a'))throw Error('reset allowed stale pointer');
   a.setPointerCapture=capture;
  });
  await page.evaluate(async()=>{const {setControlMode}=await import('/src/engine/controls.ts');setControlMode('stick');});
  const stick=await page.locator('#touch-stick').boundingBox();await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();await page.mouse.move(stick.x+stick.width+12,stick.y+stick.height/2);assert.ok(await held('right'));
  await page.keyboard.down('ArrowRight');await page.mouse.up();assert.ok(await held('right'),'stick release cancelled key');await page.keyboard.up('ArrowRight');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>window.__input.heldDirection()),null);
  await page.evaluate(async()=>{const {setControlMode}=await import('/src/engine/controls.ts');setControlMode('dpad');});
  // Simulate safe-area measurements in both orientations, with the same CSS
  // variables read by first-paint sizing and runtime resize on real devices.
  const layouts=[];
  for(const [width,height,safe] of [[390,844,{top:47,bottom:34,left:0,right:0}],[844,390,{top:0,bottom:21,left:59,right:59}],[568,320,{top:0,bottom:16,left:44,right:44}],[390,844,{top:47,bottom:34,left:0,right:0}]]){
   await page.setViewportSize({width,height});await page.evaluate(safe=>{for(const [side,value]of Object.entries(safe))document.documentElement.style.setProperty('--safe-'+side,value+'px');window.dispatchEvent(new Event('resize'));},safe);await page.waitForTimeout(80);
   const geometry=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};};return{screen:rect('#screen-frame'),pad:rect('#touch-move'),actions:rect('#touch-buttons'),top:rect('#console-top')};});
   const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
   for(const r of Object.values(geometry)){assert.ok(r.x>=safe.left-1&&r.right<=width-safe.right+1&&r.y>=safe.top-1&&r.bottom<=height-safe.bottom+1,`${engine} safe-area clipping ${JSON.stringify(r)}`);}
   for(const r of [geometry.pad,geometry.actions,geometry.top])assert.equal(overlap(geometry.screen,r),false,'controls cover safe-area game');
   layouts.push({width,height,safe,geometry});
  }
  assert.deepEqual(errors,[]);reports.push({engine,layouts,realPointerCapture:true,drag:true,sourceOwnership:true,nativeMultiTouch:engine==='chromium',nativeSprint:sprint,syntheticMultiPointer:true,physicalDevice:false});
  await context.close();console.log(`PASS ${engine}: captured drag, center stop, independent holds, cancellation/reset, stick and safe-area rotation`);
 }finally{await browser.close();}
}
mkdirSync('artifacts/reports',{recursive:true});writeFileSync('artifacts/reports/mobile-controls.json',JSON.stringify(reports,null,2)+'\n');
