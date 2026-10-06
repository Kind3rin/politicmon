/** The coach on a phone: one tip per turn in the first fights, each only once, gone when the player acts; world tips for a hurt team and for no cards; off with the guide. */
import {openPhone} from './lib/phone-play.mjs';
const base=process.env.UI_LAYOUT_URL||process.env.BASE_URL||'http://127.0.0.1:4190';
const failures=[];
const expect=(ok,message)=>{if(!ok)failures.push(message);};
const game=await openPhone(`${base}/`);
const page=game.page;
const SETUP=`state.party=[createMonster('ellyna',8)];state.starterId='ellyna';state.flags['starter-chosen']=true;state.flags['dex-received']=true;state.flags['opening-encountered']=true;state.flags['controls-intro']=false;state.flags['power-seen-comizio']=true;state.pos={mapId:'route1',x:12,y:20,facing:'up'};`;
const coach=()=>page.evaluate(()=>{const c=document.querySelector('.ui-arena-coach:not([hidden])');return c?{title:c.querySelector('.ui-arena-coach-title').innerText,box:c.getBoundingClientRect().toJSON()}:null;});
const flags=()=>page.evaluate(async()=>{const {getActiveState}=await import('/src/game/state.ts');const s=getActiveState();return Object.keys(s.flags).filter(k=>k.startsWith('tip-'));});
/** Play turns until `want` tips have been seen (or the fight ends); returns the titles in order. */
const fight=async(species,level,turns)=>{
 await page.evaluate(([id,lv])=>window.stack.top.startWildBattle(id,lv),[species,level]);
 await page.waitForFunction(()=>document.body.classList.contains('ui-arena-open'),null,{timeout:6000});
 const seen=[];
 for(let i=0;i<turns*6;i++){
  const kind=await page.evaluate(()=>{if(!document.body.classList.contains('ui-arena-open'))return 'over';if(document.querySelector('.ui-dialog:not([hidden])'))return 'dialog';return [...document.querySelectorAll('.ui-move-card')].some(x=>!x.disabled)?'ready':'busy';});
  if(kind==='over')break;
  if(kind==='dialog'){const box=await page.locator('.ui-dialog:not([hidden])').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
  else if(kind==='ready'){
   await page.waitForTimeout(350);const c=await coach();
   if(c){seen.push(c.title);expect(c.box.left>=0&&c.box.right<=375&&c.box.height<=150,`the tip fits the screen (${JSON.stringify(c.box)})`);}
   if(seen.length>=turns)break;
   await page.locator('.ui-move-card:not([disabled])').first().tap();
  }else{const next=page.getByRole('button',{name:'Continua',exact:true});if(await next.count())await next.tap({timeout:600}).catch(()=>{});}
  await page.waitForTimeout(450);
 }
 return seen;
};
try{
 await game.newCampaign();
 await game.jump(SETUP);await page.waitForTimeout(600);

 // The first fights: arrows first, then the Polemica, then the rival's intent; never one twice.
 const first=await fight('salvinott',6,3);
 expect(first[0]==='SCEGLI UNA MOSSA'||first[0]==='Scegli una mossa',`the first tip is about the moves (${first})`);
 expect(first.length>=2&&new Set(first).size===first.length,`each turn brings a different tip (${first})`);
 // Leave the fight (a tap on a tip retires it; fleeing is fine in the grass).
 await page.evaluate(()=>{window.stack.top.finished=true;});
 const learned=await flags();
 expect(learned.includes('tip-efficacy'),`a tip that was shown is remembered (${learned})`);

 // A second fight starts from where the first left off: the same tips are not repeated.
 await page.reload();await page.getByRole('button',{name:/Continua/}).first().tap();await page.getByRole('button',{name:/Campagna 1/}).first().tap();
 await page.waitForFunction(()=>document.body.classList.contains('ui-world-open'),null,{timeout:10000});await page.waitForTimeout(800);
 const again=await fight('salvinott',6,2);
 expect(!again.some(t=>/scegli una mossa/i.test(t)),`the moves tip does not come back (${again})`);

 // Tapping the tip dismisses it.
 await game.jump(SETUP+`for(const k of Object.keys(state.flags))if(k.startsWith('tip-'))delete state.flags[k];`);
 await page.evaluate(()=>window.stack.top.startWildBattle('salvinott',6));
 await page.waitForFunction(()=>document.body.classList.contains('ui-arena-open'),null,{timeout:6000});
 for(let i=0;i<10&&!(await coach());i++){const box=await page.locator('.ui-dialog:not([hidden])').boundingBox().catch(()=>null);if(box)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(400);}
 expect(await coach(),'a tip is on screen when the player is asked to act');
 await page.locator('.ui-arena-coach').tap();await page.waitForTimeout(300);
 expect(!(await coach()),'a tap on the tip closes it');
 expect((await flags()).includes('tip-efficacy'),'a closed tip is remembered');

 // Off with the guide: no tips at all.
 await game.jump(SETUP+`for(const k of Object.keys(state.flags))if(k.startsWith('tip-'))delete state.flags[k];`);
 await page.evaluate(()=>localStorage.setItem('politicmon-guide','off'));
 const guideKey=await page.evaluate(async()=>{const m=await import('/src/engine/controls.ts');return m.isGuideOn();});
 if(guideKey){ /* the key name differs: toggle through the module */ await page.evaluate(async()=>{const m=await import('/src/engine/controls.ts');if(m.isGuideOn())m.toggleGuide();}); }
 const quiet=await fight('salvinott',6,1);
 expect(quiet.length===0,`no tips with the guide off (${quiet})`);
 await page.evaluate(async()=>{const m=await import('/src/engine/controls.ts');if(!m.isGuideOn())m.toggleGuide();});

 // The world: a hurt team gets the Bar Sport tip, once.
 await game.jump(SETUP+`for(const k of Object.keys(state.flags))if(k.startsWith('tip-'))delete state.flags[k];state.party[0].hp=3;`);
 await page.waitForFunction(()=>document.querySelector('.ui-world-lesson'),null,{timeout:6000}).catch(()=>failures.push('the hurt-team tip never appeared'));
 const card=await page.locator('.ui-world-lesson').innerText().catch(()=>'');
 expect(/Squadra stanca/i.test(card)&&/Bar Sport/i.test(card),`the hurt-team tip names the Bar Sport (${card.replace(/\s+/g,' ')})`);
 await page.locator('.ui-world-lesson button').tap();await page.waitForTimeout(500);
 expect((await flags()).includes('tip-tired'),'closing the world tip remembers it');
 expect(await page.locator('.ui-world-lesson').count()===0,'and it does not come back');
 // No cards left: the second world tip.
 await game.jump(SETUP+`for(const k of Object.keys(state.flags))if(k.startsWith('tip-'))delete state.flags[k];state.bag.scheda=0;state.bag.schedona=0;state.bag.tessera=0;`);
 await page.waitForFunction(()=>document.querySelector('.ui-world-lesson'),null,{timeout:6000}).catch(()=>failures.push('the no-cards tip never appeared'));
 expect(/Schede finite/i.test(await page.locator('.ui-world-lesson').innerText().catch(()=>'')),'the no-cards tip says so');
 expect(game.errors.length===0,`page errors: ${game.errors.join(' | ')}`);
}finally{await game.close();}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('Coach ok: one tip per turn, once each, dismissable, off with the guide, world tips.');
