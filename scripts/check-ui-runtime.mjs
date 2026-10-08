import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:4190';
const browser=await chromium.launch(),results=[],errors=[];
try{
 for(const viewport of [{width:360,height:740},{width:412,height:915},{width:844,height:390},{width:360,height:640}])for(const screen of ['esplorazione','lotta','lotta-finale','lotta-esaurita','dialogo','dialogo-scelte','menu']){
  const page=await browser.newPage({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/scripts/m2-ui-review.html?screen=${screen}`);
  await page.locator(screen==='menu'?'.ui-pause':screen==='dialogo'?'#game-dialog':screen==='dialogo-scelte'?'.ui-conversation':screen.startsWith('lotta')?'.ui-arena-secondary button:has-text("Cambio")':'#world-ui').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  // Ready art, not placeholders or the opening fade.
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset[document.body.classList.contains('ui-arena-open')?'foeBounds':'worldPlayerBounds']);
  if(screen==='esplorazione')await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.worldReady==='true');
  if(screen==='dialogo')await page.getByRole('button',{name:'Continua',exact:true}).waitFor();
  const report=await page.evaluate(screen=>{
   const issues=[],w=innerWidth,h=innerHeight;
   const visible=e=>e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true});
   const box=e=>e.getBoundingClientRect();
   const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
   const name=e=>e.getAttribute('aria-label')||e.textContent.trim().slice(0,50);
   const all=[...document.querySelectorAll('#console-shell *')].filter(visible);
   const controls=all.filter(e=>e.matches('button,a,input,select'));
   for(const e of controls){const r=box(e);if(r.left<-.5||r.top<-.5||r.right>w+.5||r.bottom>h+.5)issues.push(`outside: ${name(e)}`);if(r.width<43.5||r.height<43.5)issues.push(`small target: ${name(e)}`);}
   for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)if(overlap(box(controls[i]),box(controls[j])))issues.push(`overlap: ${name(controls[i])} / ${name(controls[j])}`);
   const scrolls=all.filter(e=>{const s=getComputedStyle(e);return /auto|scroll/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+1||/auto|scroll/.test(s.overflowX)&&e.scrollWidth>e.clientWidth+1;});
   if(screen.startsWith('lotta')&&scrolls.length)issues.push('scrolling battle');
   if(scrolls.some(e=>scrolls.some(p=>p!==e&&p.contains(e))))issues.push('nested scroll');
   const texts=all.filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
   const sizes=[...new Set(texts.map(e=>getComputedStyle(e).fontSize))];if(sizes.length>3)issues.push('font sizes: '+sizes.join(','));
   for(const e of texts)if(/^Scelta |^Compagno \d|\d+ di \d+\.?$/.test(e.textContent.trim()))issues.push('accessibility prose: '+name(e));
   const framed=all.filter(e=>{const s=getComputedStyle(e);return ['Top','Right','Bottom','Left'].filter(side=>parseFloat(s[`border${side}Width`])>0&&s[`border${side}Style`]!=='none').length>=3;});if(framed.length>8)issues.push(`framed containers: ${framed.length}`);
   if(visible(document.querySelector('#console-top')))issues.push('website header visible');
   const canvas=document.querySelector('canvas'),c=box(canvas);
   const painted=key=>{const b=JSON.parse(canvas.dataset[key]);return {left:c.left+b.x/240*c.width,top:c.top+b.y/b.viewHeight*c.height,right:c.left+(b.x+b.w)/240*c.width,bottom:c.top+(b.y+b.h)/b.viewHeight*c.height,width:b.w/240*c.width};};
   if(screen==='esplorazione'){
    if(c.width*c.height/(w*h)<.95)issues.push('world under 95%');
    const player=painted('worldPlayerBounds');if([...controls,...document.querySelectorAll('.ui-world-hud :is(.ui-world-top > *, .ui-world-objective, .ui-world-status > *, .ui-world-lesson)')].filter(visible).some(e=>overlap(box(e),player)&&!e.classList.contains('is-over-player')))issues.push('interface covers player');
   }else if(screen==='menu'){
    if(c.width*c.height/(w*h)<.95)issues.push('menu shrinks world');
    if(document.querySelectorAll('.ui-pause-grid .ui-pause-entry').length!==6)issues.push('menu missing entries');
    if(scrolls.length)issues.push('main menu scrolls');
   }else if(screen.startsWith('dialogo')){
    const dialog=document.querySelector('.ui-dialog:not([hidden])'),r=box(dialog);
    if(r.height/h>.281)issues.push('dialog above 28%');
    if(c.width*c.height/(w*h)<.95)issues.push('dialog shrinks world');
    for(const e of dialog.querySelectorAll('.ui-dialog-text,.ui-dialog-speaker,img')){if(!visible(e))continue;const b=box(e);if(b.right>r.right||b.left<r.left||b.bottom>r.bottom)issues.push('dialog content clipped');}
    const text=dialog.querySelector('.ui-dialog-text');if(text.scrollHeight>text.clientHeight+1)issues.push('dialog text overflow');
   }else{
    const scene=box(document.querySelector('.ui-arena-view'));if(h>w&&scene.height/h<.48)issues.push('battle under 48%');
    for(const [key,minimum] of [['foeBounds',.30],['playerBounds',.36]]){
     const sprite=painted(key);if(sprite.width/scene.width<minimum)issues.push(`${key} too small`);
     if(sprite.left<scene.left-.5||sprite.right>scene.right+.5||sprite.top<scene.top-.5||sprite.bottom>scene.bottom+.5)issues.push(`${key} clipped`);
     for(const e of [...controls,...all.filter(e=>e.matches('.ui-combatant,.ui-intent'))])if(overlap(box(e),sprite))issues.push(`${name(e)} covers ${key}`);
    }
    for(const button of document.querySelectorAll('.ui-move-card'))for(const child of button.querySelectorAll('strong,.ui-move-meta')){const a=box(child),b=box(button);if(a.bottom>b.bottom||a.right>b.right||a.top<b.top)issues.push(`move text clipped: ${name(button)}`);}
   }
   return {screen,viewport:`${w}x${h}`,issues,fonts:sizes,frames:framed.length};
  },screen);
  results.push(report);errors.push(...report.issues.map(issue=>`${screen} ${viewport.width}×${viewport.height}: ${issue}`));
  await page.screenshot({path:`artifacts/m2/0-${screen}-${viewport.width}x${viewport.height}.png`});
  if(screen.startsWith('lotta')){
    const first=page.locator('.ui-move-card').first(),before=await first.getAttribute('aria-label'),rect=await first.boundingBox();
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
    await page.locator('#tribuna-sheet[open]').waitFor();await page.mouse.up();
    if(await first.getAttribute('aria-label')!==before)errors.push('Inspect consumed a move');
    const text=await page.locator('#tribuna-sheet').innerText();if(!/Precisione.*100%/.test(text)||!text.includes('Danno stimato'))errors.push('Move detail missing estimates');
    await page.getByRole('button',{name:'Chiudi dettaglio'}).click();
    await page.getByRole('button',{name:'Altro',exact:true}).click();
    if(!await page.getByRole('button',{name:'Fuga',exact:true}).isVisible())errors.push('More menu missing escape');
    await page.keyboard.press('Escape');
  }else if(screen==='menu'){
    await page.getByRole('button',{name:/^Altro/}).click();
    await page.getByRole('button',{name:/^Salva partita/}).waitFor();
    const overflow=await page.locator('.ui-pause-sheet').evaluate(e=>e.scrollWidth>e.clientWidth+1||[...e.querySelectorAll('.ui-pause-entry')].some(b=>b.scrollWidth>b.clientWidth+1));if(overflow)errors.push('More menu horizontal overflow');
    await page.screenshot({path:`artifacts/m2/0-menu-altro-${viewport.width}x${viewport.height}.png`});
    await page.getByRole('button',{name:'Indietro',exact:true}).click();
    await page.getByRole('button',{name:'Torna al gioco',exact:true}).click();
    await page.locator('#world-ui').waitFor();
  }else if(screen==='dialogo'){
    await page.getByRole('button',{name:'Continua',exact:true}).click();
    await page.locator('#game-dialog .ui-sr-only').filter({hasText:'Il programma'}).waitFor({state:'attached'});
    await page.getByRole('button',{name:'Continua',exact:true}).waitFor();
    if(!(await page.locator('#game-dialog .ui-dialog-text').innerText()).includes('Il programma'))errors.push('Dialog did not advance');
  }else if(screen==='dialogo-scelte'){
    await page.getByRole('button',{name:'Fammi una domanda.',exact:true}).click();
    await page.locator('#game-dialog').waitFor();if(await page.locator('.ui-conversation:visible').count())errors.push('Choice stayed open');
  }else{
    const quest=page.locator('.ui-world-objective');await quest.click();if(await quest.getAttribute('aria-expanded')!=='false')errors.push('Quest did not collapse');
    const session=await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:viewport.height*0.45}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:115,y:viewport.height*0.45}]});
    if(!await page.locator('#touch-stick.floating-stick').isVisible())errors.push('Floating joystick did not appear');
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if(await page.locator('#touch-stick.floating-stick').count())errors.push('Floating joystick remained after release');
  }
  await page.close();
 }
}finally{await browser.close();}
await fs.writeFile('artifacts/m2/ui-runtime-layout.json',JSON.stringify({scope:'Exploration, battle, dialogue and pause migrated. Team, bag, learning, map and remaining screens pending.',results,errors},null,2));
if(errors.length)throw Error(errors.join('\n'));
console.log(`${results.length} runtime layouts green: exploration, battle, dialogue and pause. Remaining screens pending migration.`);
