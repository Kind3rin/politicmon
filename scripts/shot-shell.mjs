import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const engine=process.env.SHELL_BROWSER==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch();
const base=process.env.BASE_URL??'http://127.0.0.1:5188';
const folder=`artifacts/screens/shell/${engine}`;mkdirSync(folder,{recursive:true});
const reports=[];
try{
 for(const [name,width,height,touch] of [
  ['small-phone',320,568,true],['phone',390,844,true],['android',412,892,true],['tablet',768,1024,true],
  ['small-landscape',568,320,true],['landscape',844,390,true],['short-landscape',667,280,true],
  ['desktop',1280,800,false],['wide-desktop',1440,900,false],['small-desktop',800,600,false]
 ]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:2});
  await context.addInitScript(()=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>Boolean(window.stack?.top)&&performance.getEntriesByName('politicmon:first-frame').length);
  const geometry=await page.evaluate(()=>{
   const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   const selectors=['#screen-frame','#console-top',...(document.body.classList.contains('touch')?['#touch-move','#touch-buttons']:['#shell-hint'])];
   return {viewport:{width:innerWidth,height:innerHeight},boxes:Object.fromEntries(selectors.map(s=>[s,rect(document.querySelector(s))])),targets:[...document.querySelectorAll('button')].filter(n=>n.getClientRects().length&&!(n.closest('dialog')&&!n.closest('dialog').open)).map(n=>({label:n.getAttribute('aria-label')??n.textContent.trim(),...rect(n)}))};
  });
  for(const [label,r] of Object.entries(geometry.boxes))assert.ok(r.x>=-1&&r.y>=-1&&r.right<=width+1&&r.bottom<=height+1,`${name} ${label} out of viewport ${JSON.stringify(r)}`);
  for(const r of geometry.targets){assert.ok(r.label&&r.w>=43.9&&r.h>=43.9,`${name} target <44px: ${JSON.stringify(r)}`);assert.ok(r.x>=-1&&r.y>=-1&&r.right<=width+1&&r.bottom<=height+1,`${name} target out of bounds`);}
  const overlap=(a,b)=>a.x<b.right-1&&a.right>b.x+1&&a.y<b.bottom-1&&a.bottom>b.y+1;
  for(let i=0;i<geometry.targets.length;i++)for(let j=i+1;j<geometry.targets.length;j++)assert.ok(!overlap(geometry.targets[i],geometry.targets[j]),`${name}: overlapping targets ${geometry.targets[i].label}/${geometry.targets[j].label}`);
  for(const label of ['#console-top','#touch-move','#touch-buttons'])if(geometry.boxes[label])assert.ok(!overlap(geometry.boxes['#screen-frame'],geometry.boxes[label]),`${name} ${label} covers game`);
  const sizing=await page.evaluate(async()=>{const {gameCanvasSize}=await import('/src/engine/gameViewport.ts');const v=visualViewport,s=gameCanvasSize(v?.width??innerWidth,v?.height??innerHeight,document.body.classList.contains('touch'));const r=document.querySelector('canvas').getBoundingClientRect();const pre=document.querySelector('body>script').textContent;return {expected:s,actual:{width:r.width,height:r.height},synchronous:pre.includes('landscape ? 304 : 0')&&pre.includes('landscape ? 60 : 216')};});
  assert.ok(Math.abs(sizing.expected.width-sizing.actual.width)<.1&&Math.abs(sizing.expected.height-sizing.actual.height)<.1&&sizing.synchronous,'prelayout formula diverged');
  await page.screenshot({path:`${folder}/${name}.png`});
  await page.evaluate(async()=>{
   const {newGameState}=await import('/src/game/state.ts'),{createMonster}=await import('/src/game/monster.ts'),{WorldScene}=await import('/src/game/world/WorldScene.ts'),{audio}=await import('/src/engine/audio.ts');audio.enabled=false;
   const state=newGameState();state.flags['intro-done']=true;state.flags['starter-chosen']=true;state.flags['dex-received']=true;state.starterId='ellyna';state.party=[createMonster('ellyna',8)];
   const world=new WorldScene(window.stack,window.__input,state);let updates=0;const original=world.update.bind(world);world.update=dt=>{updates++;original(dt);};
   window.stack.replace(world);window.__shellTest={state,world,updates:()=>updates};document.querySelector('canvas').focus();
  });
  await page.waitForTimeout(80);
  // TAB stays in native focus navigation; it cannot open the game menu.
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>window.stack.top.constructor.name),'WorldScene');
  // Enter on the native logo invokes START, without leaking an A into the game.
  await page.locator('.console-brand').focus();await page.keyboard.press('Enter');await page.waitForTimeout(80);
  assert.equal(await page.evaluate(()=>window.stack.top.constructor.name),'PauseScene');
  await page.evaluate(()=>{window.stack.pop();document.querySelector('canvas').focus();});
  // A key released after focus enters a native control must not remain held.
  await page.keyboard.down('ArrowRight');await page.locator('#shell-help').focus();await page.keyboard.up('ArrowRight');
  assert.equal(await page.evaluate(()=>window.__input.isHeld('right')),false);
  await page.locator('#shell-help').click();await page.waitForFunction(()=>document.querySelector('#shell-guide').open);
  const frozen=await page.evaluate(()=>({state:JSON.stringify(window.__shellTest.state),updates:window.__shellTest.updates()}));
  await page.keyboard.press('z');await page.keyboard.press('ArrowDown');await page.waitForTimeout(150);
  assert.deepEqual(await page.evaluate(()=>({state:JSON.stringify(window.__shellTest.state),updates:window.__shellTest.updates()})),frozen,'guide did not pause state/updates');
  assert.equal(await page.evaluate(()=>window.__input.heldDirection()),null);
  if(['phone','landscape','desktop'].includes(name))await page.screenshot({path:`${folder}/${name}-guide.png`});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#shell-guide').open);
  await page.waitForFunction(()=>document.activeElement.id==='game-canvas');
  assert.equal(await page.evaluate(()=>window.stack.top.constructor.name),'WorldScene');
  await page.waitForTimeout(50);assert.ok(await page.evaluate(()=>window.__shellTest.updates())>frozen.updates,'game did not resume');
  await page.keyboard.press('p');await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.stack.top.constructor.name),'PauseScene');
  // Real pointer buttons: A saves from the first row; B closes only its receipt.
  if(touch){
   await page.evaluate(()=>{const p=window.stack.top;p.menu.index=p.entries.indexOf('SALVA');});
   const before=await page.evaluate(()=>window.__shellTest.state.party[0].uid);
   await page.locator('.a-btn').click();await page.waitForTimeout(70);
   const saved=await page.evaluate(async()=>{const {loadGame}=await import('/src/game/state.ts');return loadGame()?.party[0].uid;});assert.equal(saved,before);
   await page.evaluate(async()=>{const {setControlMode}=await import('/src/engine/controls.ts');setControlMode('stick');});
   const r=await page.locator('#touch-stick').boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,'stick clipped');
   await page.locator('#shell-help').click();await page.waitForFunction(()=>document.querySelector('dialog').open);await page.locator('#shell-guide-resume').click();
   await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+30,r.y+r.height/2);
   assert.equal(await page.evaluate(()=>window.__input.isHeld('right')),true,'stick did not hold direction');
   await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));});assert.equal(await page.evaluate(()=>window.__input.heldDirection()),null);
   assert.equal(await page.locator('#touch-stick-cap').evaluate(n=>n.style.transform),'translate(0px, 0px)');await page.mouse.up();
   if(name==='phone')await page.screenshot({path:`${folder}/${name}-stick.png`});
  }
  // Closing via the visible button and native focus trap are also real UI paths.
  await page.locator('#shell-help').click();await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),'focus escaped modal');
  await page.locator('#shell-guide-close').click();assert.equal(await page.evaluate(()=>document.querySelector('dialog').open),false);
  if(name==='phone'){
   for(const viewport of [{width:844,height:390},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(80);
    const r=await page.locator('#game-canvas').boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1,'rotation clipped canvas');
    await page.locator('#shell-help').click();await page.waitForFunction(()=>document.querySelector('dialog').open);await page.locator('#shell-guide-close').click();
   }
  }
  if(name==='desktop'&&await page.locator('#shell-fullscreen').isVisible()){
   await page.locator('#shell-fullscreen').click();await page.waitForTimeout(150);
   const entered=await page.evaluate(()=>Boolean(document.fullscreenElement));
   if(entered){await page.locator('#shell-fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);}
   reports.push({fullscreen:entered,engine});
  }
  if(['phone','desktop'].includes(name)){
   await page.evaluate(async()=>{
    const {BattleScene}=await import('/src/game/battle/BattleScene.ts'),{createMonster}=await import('/src/game/monster.ts');
    const battle=new BattleScene(window.stack,window.__input,{state:window.__shellTest.state,foeTeam:[createMonster('giorgetta',8)],onEnd:()=>{throw Error('help ended battle');}});
    let updates=0;const original=battle.update.bind(battle);battle.update=dt=>{updates++;original(dt);};window.stack.replace(battle);window.__battleUpdates=()=>updates;
   });
   await page.waitForTimeout(60);await page.locator('#shell-help').click();await page.waitForFunction(()=>document.querySelector('dialog').open);
   const battleSnapshot=await page.evaluate(()=>({state:JSON.stringify(window.__shellTest.state),updates:window.__battleUpdates()}));
   await page.keyboard.press('z');await page.waitForTimeout(150);assert.deepEqual(await page.evaluate(()=>({state:JSON.stringify(window.__shellTest.state),updates:window.__battleUpdates()})),battleSnapshot,'battle continued under guide');
   await page.locator('#shell-guide-resume').click();await page.waitForTimeout(60);assert.ok(await page.evaluate(()=>window.__battleUpdates())>battleSnapshot.updates,'battle did not resume');
  }
  if(name==='phone'){
   await page.evaluate(async()=>{
    const {openNativeKeyboard}=await import('/src/engine/nativeInput.ts');window.__nativeProbe={a:0,submitted:0,value:''};
    window.stack.replace({update:()=>{if(window.__input.wasPressed('a'))window.__nativeProbe.a++;},draw:()=>{}});
    openNativeKeyboard({initial:'',maxLength:12,onInput:value=>window.__nativeProbe.value=value,onSubmit:()=>window.__nativeProbe.submitted++});
   });
   await page.keyboard.type('AZ');await page.keyboard.press('Enter');await page.waitForTimeout(60);
   assert.deepEqual(await page.evaluate(()=>window.__nativeProbe),{a:0,submitted:1,value:'AZ'},'native typing leaked game confirm');
   await page.evaluate(async()=>{const {closeNativeKeyboard}=await import('/src/engine/nativeInput.ts');closeNativeKeyboard();});
  }
  assert.deepEqual(errors,[],`${engine}/${name} runtime errors`);reports.push({name,engine,geometry,paused:true,keyboard:true,pointerSave:touch});
  await context.close();
 }
 mkdirSync('artifacts/reports',{recursive:true});writeFileSync(`artifacts/reports/shell-${engine}.json`,JSON.stringify(reports,null,2));
 console.log(`PASS ${engine}: 10 viewport layouts, native focus/dialogue pause, key release, real menu/save controls; screenshots ${folder}`);
}finally{await browser.close();}
