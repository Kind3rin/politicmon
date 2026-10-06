/** The day's schedule on a phone: the clock chip, the schedule, the remote control, the tables of each slot and the one-time introduction. */
import {openPhone} from './lib/phone-play.mjs';
const base=process.env.UI_LAYOUT_URL||process.env.BASE_URL||'http://127.0.0.1:4190';
const failures=[];
const expect=(ok,message)=>{if(!ok)failures.push(message);};
const game=await openPhone(`${base}/`);
const page=game.page;
const SETUP=`state.party=[createMonster('ellyna',8)];state.starterId='ellyna';state.flags['starter-chosen']=true;state.flags['dex-received']=true;state.flags['opening-encountered']=true;state.flags['controls-intro']=false;state.flags['power-seen-comizio']=true;state.pos={mapId:'route1',x:12,y:20,facing:'up'};`;
const table=()=>page.evaluate(()=>Object.fromEntries(window.stack.top.effectiveEncounters().map(e=>[e.speciesId+(e.slots?'*':''),e.weight])));
const closeDialogs=async()=>{for(let i=0;i<24;i++){const box=await page.locator('.ui-dialog:not([hidden])').boundingBox().catch(()=>null);if(!box)return i;await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(450);}return 24;};
const shiftTo=async(hour)=>page.evaluate(async h=>{const {getActiveState}=await import('/src/game/state.ts');const s=getActiveState();s.clockShift=((h-new Date().getHours()-new Date().getMinutes()/60+24)%24)|0;return s.clockShift;},hour);
try{
 await game.newCampaign();
 // Before the first duel with Gianni the schedule is closed: no chip, no slot-only candidates.
 await game.jump(SETUP);
 expect(await page.locator('.ui-world-clock').count()===0,'the clock chip is not there before the first duel');
 let t=await table();
 expect(!Object.keys(t).some(k=>k.endsWith('*')),`no slot-only candidates before the first duel (${Object.keys(t).filter(k=>k.endsWith('*'))})`);

 // After it: the introduction explains the idea once, then the chip is there.
 await game.jump(SETUP+`state.flags['rival1-beaten']=true;`);
 await page.waitForTimeout(800);
 const taps=await closeDialogs();
 expect(taps>=2,`the introduction takes a few taps (${taps})`);
 const intro=await page.evaluate(async()=>{const {getActiveState}=await import('/src/game/state.ts');return Boolean(getActiveState().flags['palinsesto-seen']);});
 expect(intro,'the introduction is remembered');
 await page.waitForFunction(()=>document.querySelector('.ui-world-clock'),null,{timeout:4000}).catch(()=>failures.push('the clock chip never appeared'));
 const chip=await page.locator('.ui-world-clock').boundingBox().catch(()=>null);
 expect(chip&&chip.height>=40&&chip.width>=80,`the chip is a real tap target (${JSON.stringify(chip)})`);
 expect(chip&&chip.x>=0&&chip.x+chip.width<=375,'the chip stays on screen');

 // The table of each slot.
 const expectations={mattina:{in:['verdolino*'],out:['mediocrate*','bojoon*']},giorno:{in:['mediocrate*'],out:['verdolino*','bojoon*']},notte:{in:['bojoon*'],out:['verdolino*','mediocrate*']},sera:{in:[],out:['verdolino*','mediocrate*','bojoon*']}};
 const hours={mattina:9,giorno:14.5,sera:20,notte:23.5};
 for(const [slot,want] of Object.entries(expectations)){
  await shiftTo(hours[slot]);await page.waitForTimeout(300);
  t=await table();
  for(const k of want.in)expect(k in t,`${slot}: ${k} is in the table (${Object.keys(t)})`);
  for(const k of want.out)expect(!(k in t),`${slot}: ${k} is not in the table`);
 }
 // Types on the air weigh double: in the evening vannaccix/tajanide/giorgetta types (destra, sinistra) against the same table in the morning.
 await shiftTo(9);const morning=await table();await shiftTo(20);const evening=await table();
 const sample=Object.keys(evening).filter(k=>!k.endsWith('*')&&k in morning).filter(k=>evening[k]!==morning[k]);
 expect(sample.length>0,'some species change weight between morning and evening');
 expect(sample.every(k=>evening[k]===morning[k]*2||evening[k]*2===morning[k]),'a type on the air weighs exactly double');

 // The schedule: the chip opens it, a row opens a sheet with the remote control, tuning moves the clock and says so.
 await shiftTo(23.5);await page.waitForTimeout(1500);
 await page.locator('.ui-world-clock').tap();await page.waitForTimeout(600);
 expect(await page.getByRole('heading',{name:/Palinsesto/i}).count()>0||/PALINSESTO/i.test(await page.evaluate(()=>document.body.innerText)),'the chip opens the schedule');
 const rows=await page.evaluate(()=>[...document.querySelectorAll('.ui-row')].map(r=>r.innerText.replace(/\s+/g,' ')));
 expect(rows.length===4,`four slots are listed (${rows.length})`);
 expect(rows.filter(r=>/Adesso/.test(r)).length===1&&/NOTTE/i.test(rows.find(r=>/Adesso/.test(r))??''),'exactly the current slot says "Adesso"');
 await page.getByRole('button',{name:/MATTINA/i}).first().tap();await page.waitForTimeout(400);
 await page.getByRole('button',{name:/Sintonizza col telecomando/}).tap();await page.waitForTimeout(1200);
 const after=await page.evaluate(async()=>{const {getActiveState}=await import('/src/game/state.ts');const {currentSlot}=await import('/src/game/palinsesto.ts');const s=getActiveState();return {slot:currentSlot(s).id,shift:s.clockShift};});
 expect(after.slot==='mattina'&&Number.isInteger(after.shift),`the remote control tunes the morning (${JSON.stringify(after)})`);
 const chipText=await page.locator('.ui-world-clock').innerText();
 expect(/MATTINA/i.test(chipText),`the chip follows (${chipText})`);
 const banner=await page.evaluate(()=>{const b=window.stack.top.banner;return b?`${b.text} ${b.sub}`:'';});
 expect(/Mattina/i.test(banner)&&/onda/i.test(banner),`the change is announced (${banner})`);
 // It survives a reload.
 await page.reload();await page.getByRole('button',{name:/Continua/}).first().tap();await page.getByRole('button',{name:/Campagna 1/}).first().tap();
 await page.waitForFunction(()=>document.body.classList.contains('ui-world-open'),null,{timeout:10000});await page.waitForTimeout(1000);
 expect(/MATTINA/i.test(await page.locator('.ui-world-clock').innerText()),'the tuned slot survives a reload');
 expect(await page.locator('.ui-dialog:not([hidden])').count()===0,'the introduction does not come back');
 expect(game.errors.length===0,`page errors: ${game.errors.join(' | ')}`);
}finally{await game.close();}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('Palinsesto ok: closed before the first duel, intro once, chip, tables per slot, double weight, remote control, reload.');
