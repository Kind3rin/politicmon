/** Exploration controls on a phone and on a desktop: what is on screen, and whether every gesture really moves the player. */
import {chromium} from 'playwright';
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:4190';
const browser=await chromium.launch(),errors=[];
const expect=(ok,message)=>{if(!ok)errors.push(message);};
const url=`${base}/scripts/m2-ui-review.html?screen=esplorazione&routeReview=1&lesson=1`;
const open=async(viewport,mobile=true)=>{
 const page=await browser.newPage({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:2});
 page.on('pageerror',e=>errors.push(`${viewport.width}: ${e.message}`));
 await page.goto(url);await page.locator('.ui-world-nav').waitFor();await page.waitForTimeout(500);return page;
};
const where=async page=>{
 const [,x,y,steps]=/(\d+),(\d+) · (\d+) passi/.exec(await page.locator('output').innerText())??[];
 return {x:Number(x),y:Number(y),steps:Number(steps)};
};
const touch=async(page,type,points)=>{const cdp=page.__cdp??(page.__cdp=await page.context().newCDPSession(page));await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id}))});};
const drag=async(page,from,to,hold=700)=>{
 await touch(page,'touchStart',[from]);
 for(let i=1;i<=6;i++){await touch(page,'touchMove',[[from[0]+(to[0]-from[0])*i/6,from[1]+(to[1]-from[1])*i/6]]);await page.waitForTimeout(30);}
 await page.waitForTimeout(hold);await touch(page,'touchEnd',[]);await page.waitForTimeout(150);
};
try{
 // ---- Phone ----
 let page=await open({width:375,height:812});
 const box=async selector=>page.locator(selector).first().boundingBox();
 // Everything a first-time player needs is on screen and big enough to hit.
 for(const name of ['Squadra','Mappa','Menu','Corri']){
  const button=page.getByRole('button',{name,exact:true}),b=await button.boundingBox();
  expect(b&&b.width>=44&&b.height>=44,`${name} is at least 44px`);
  expect(/./.test(await button.innerText()),`${name} has a visible label`);
 }
 const stick=await box('#touch-stick');
 expect(stick&&stick.width>=100&&stick.y>812/2&&stick.x<375/2,'the stick is visible at the bottom left before any touch');
 expect((await page.locator('.ui-world-lesson').innerText()).includes('MUOVITI')||(await page.locator('.ui-world-lesson').innerText()).toLowerCase().includes('muoviti'),'the movement lesson is shown');
 const nav=await box('.ui-world-nav'),objective=await box('.ui-world-objective');
 expect(!objective||!nav||objective.y>=nav.y+nav.height-1||objective.x+objective.width<=nav.x,'the objective does not sit under the shortcuts');
 // The zoom: a tile is a comfortable size, the player is not tiny.
 const tile=await page.evaluate(()=>document.querySelector('#game-canvas').getBoundingClientRect().width/240*16*1.5);
 expect(tile>=32,`world tile is ${tile}px`);

 // Dragging the visible stick walks.
 let before=await where(page);
 const centre=[stick.x+stick.width/2,stick.y+stick.height/2];
 await drag(page,centre,[centre[0],centre[1]-46]);
 let after=await where(page);
 expect(after.y<before.y-1,`stick up should walk north (${before.y} → ${after.y})`);
 expect(after.steps>before.steps,'stepsTotal counts the walk');
 // The lesson moves on once the player has walked: next gesture, next card.
 await page.waitForTimeout(250);
 expect(/parla con qualcuno/i.test(await page.locator('.ui-world-lesson').innerText()),'the next lesson replaces the movement one');
 await page.locator('.ui-world-lesson button').tap();
 expect(await page.locator('.ui-world-lesson').count()===0,'a lesson can be dismissed');

 // A thumb that drifts sideways keeps walking in a straight line.
 before=await where(page);
 await drag(page,centre,[centre[0]+14,centre[1]+46],900);
 after=await where(page);
 expect(after.x===before.x&&after.y>before.y,`a drifting thumb stays on one axis (${before.x},${before.y} → ${after.x},${after.y})`);

 // A floating stick works anywhere on the left half.
 before=await where(page);
 await drag(page,[70,400],[70,354],900);
 after=await where(page);
 expect(after.y<before.y,'floating stick walks too');
 expect(await page.locator('#touch-stick.floating-stick').count()===0,'the floating stick is released');

 // Tapping the map walks there by itself (once the thumb has had time to leave the stick).
 await page.waitForTimeout(600);
 before=await where(page);
 await page.touchscreen.tap(250,430);await page.waitForTimeout(1600);
 after=await where(page);
 expect(after.x!==before.x||after.y!==before.y,'tapping the map walks the player');

 // ---- Steering must not tap: a tap only walks when it is a choice ----
 const idle=async()=>{await page.waitForTimeout(2200);return where(page);};
 // `act` steers however it likes, calls `mark()` just before the tap that must not walk, then taps.
 const stillAfter=async(act,message)=>{
  await idle();let from;await act(async()=>{await page.waitForTimeout(260);from=await where(page);});
  await page.waitForTimeout(1500);const to=await where(page);
  expect(to.x===from.x&&to.y===from.y,`${message} (${from.x},${from.y} → ${to.x},${to.y})`);
 };
 // A thumb that just came off the stick and lands again on the map.
 await stillAfter(async mark=>{await drag(page,[70,400],[70,380],120);await mark();await page.touchscreen.tap(300,330);},'a tap right after steering does not walk');
 // A thumb resting on the floating stick without moving is not a tap.
 await stillAfter(async mark=>{await mark();await touch(page,'touchStart',[[70,430]]);await page.waitForTimeout(900);await touch(page,'touchEnd',[]);},'a resting thumb does not walk');
 // A second finger touching the map while the first steers: no route may be planned.
 await idle();
 await touch(page,'touchStart',[[70,420]]);await touch(page,'touchMove',[[70,400]]);await page.waitForTimeout(500);
 await touch(page,'touchStart',[[70,400],[300,330]]);await page.waitForTimeout(80);await touch(page,'touchEnd',[[70,400]]);
 await page.waitForTimeout(80);await touch(page,'touchEnd',[]);await page.waitForTimeout(120);
 const planned=await page.getByRole('button',{name:'Fermati',exact:true}).count();
 expect(planned===0,'a second finger on the map plans no route (the context button says Fermati)');
 // A quick, deliberate tap on the left half still walks (that half is also the floating stick).
 before=await idle();
 await page.touchscreen.tap(90,380);await page.waitForTimeout(1500);
 after=await where(page);
 expect(after.x!==before.x||after.y!==before.y,'a quick tap on the left half still walks');

 // The run toggle shows its state with more than colour.
 // The walk may end beside Luca, whose welcome opens by itself: close whatever dialogue is open before looking for the buttons.
 for(let i=0;i<8&&!(await page.getByRole('button',{name:'Corri',exact:true}).isVisible().catch(()=>false));i++){await page.keyboard.press('Enter');await page.waitForTimeout(150);await page.keyboard.press('Escape');await page.waitForTimeout(250);}
 const run=page.getByRole('button',{name:'Corri',exact:true});
 await run.tap();await page.waitForTimeout(150);
 expect(await run.getAttribute('aria-pressed')==='true','run toggles on');
 expect((await run.evaluate(el=>getComputedStyle(el.querySelector('strong'),'::after').content)).includes('✓'),'run state has a check mark');
 await run.tap();
 // Shortcuts open their panels.
 await page.getByRole('button',{name:'Squadra',exact:true}).tap();
 await page.locator('#game-ui:not([hidden]) .ui-header').waitFor({timeout:3000}).catch(()=>errors.push('Squadra did not open'));
 await page.close();

 // ---- The coach card never hides the player, wherever the camera leaves them ----
 for(const [map,x,y] of [['borgo',14,3],['borgo',14,8],['borgo',14,13],['borgo',14,17],['route1',7,8],['route1',7,24]]){
  page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  page.on('pageerror',e=>errors.push(`card ${map}: ${e.message}`));
  await page.goto(`${base}/scripts/m2-ui-review.html?screen=esplorazione&map=${map}&x=${x}&y=${y}&lesson=1`);
  await page.locator('.ui-world-lesson').waitFor();await page.waitForTimeout(900);
  const hidden=await page.evaluate(()=>{
   const canvas=document.querySelector('canvas'),c=canvas.getBoundingClientRect(),b=JSON.parse(canvas.dataset.worldPlayerBounds);
   const p={left:c.left+b.x/240*c.width,top:c.top+b.y/b.viewHeight*c.height,right:c.left+(b.x+b.w)/240*c.width,bottom:c.top+(b.y+b.h)/b.viewHeight*c.height};
   const card=document.querySelector('.ui-world-lesson').getBoundingClientRect();
   return Math.min(card.right,p.right)-Math.max(card.left,p.left)>1&&Math.min(card.bottom,p.bottom)-Math.max(card.top,p.top)>1;
  });
  expect(!hidden,`the coach card covers the player at ${map} ${x},${y}`);
  await page.close();
 }

 // ---- Dialogue: the whole box is the button ----
 page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 page.on('pageerror',e=>errors.push(`dialogue: ${e.message}`));
 await page.goto(`${base}/scripts/m2-ui-review.html?screen=dialogo`);
 await page.locator('.ui-dialog').waitFor();
 const line=()=>page.locator('.ui-dialog-text').innerText();
 await page.waitForFunction(()=>document.querySelector('.ui-dialog-text')?.textContent.includes('paghiamo noi'),null,{timeout:8000});
 const dialogBox=await page.locator('.ui-dialog').boundingBox();
 await page.touchscreen.tap(dialogBox.x+dialogBox.width/2,dialogBox.y+dialogBox.height*0.45);await page.waitForTimeout(400);
 expect((await line()).includes('Il programma è lungo'),`tapping the middle of the box shows the next line (${await line()})`);
 await page.touchscreen.tap(dialogBox.x+30,dialogBox.y+dialogBox.height*0.45);await page.waitForTimeout(600);
 expect(await page.locator('.ui-dialog').isHidden()||(await line()).includes('Il programma è lungo'),'the second tap completes or closes the last line');
 await page.close();

 // ---- Small phone (320 wide) ----
 page=await open({width:320,height:640});
 const small=await page.evaluate(()=>[...document.querySelectorAll('.ui-world-nav .ui-button,.ui-world-controls .ui-button,#touch-stick')].map(el=>{const r=el.getBoundingClientRect();return [r.left,r.right,r.top,r.bottom];}));
 expect(small.every(([l,r,t,b])=>l>=0&&r<=320&&t>=0&&b<=640),'controls stay inside a 320px screen');
 await page.close();

 // ---- Desktop: keys are written on screen ----
 page=await open({width:1280,height:800},false);
 await page.evaluate(()=>document.body.classList.remove('touch','ctrl-stick'));await page.waitForTimeout(200);
 const hint=await page.locator('#shell-hint').innerText();
 expect(/WASD/.test(hint)&&/Z/.test(hint)&&/P/.test(hint),`the keyboard legend is visible in play (${hint})`);
 expect(await page.locator('#shell-hint').isVisible(),'legend visible');
 expect(await page.locator('#touch-stick').isHidden(),'no touch stick on desktop');
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(500);await page.keyboard.up('ArrowUp');
 expect((await where(page)).steps>0,'arrow keys walk');
 // Keys in one hand, a mouse in the other: a click right after steering is an accident, a click later is an order.
 await page.waitForTimeout(2200);
 let desk=await where(page);
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(250);await page.keyboard.up('ArrowUp');
 const afterKey=await where(page);
 await page.mouse.click(760,520);await page.waitForTimeout(1500);
 desk=await where(page);
 expect(desk.x===afterKey.x&&desk.y===afterKey.y,`a click just after the arrow keys does not walk (${afterKey.x},${afterKey.y} → ${desk.x},${desk.y})`);
 await page.waitForTimeout(2000);
 await page.mouse.click(760,520);await page.waitForTimeout(1800);
 const later=await where(page);
 expect(later.x!==desk.x||later.y!==desk.y,'a click when the keys are quiet walks there');
 await page.close();
}finally{await browser.close();}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('world controls ok');
