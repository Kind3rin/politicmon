/** Items from the bag on a phone, by touch: a held item is given to a companion and works in a fight, the anti-comizio spray keeps the candidates away,
 * the expense-refund card takes you to the last Bar Sport. Replaces the key-driven r39 check, which the redesigned bag no longer answers to. */
import {openPhone} from './lib/phone-play.mjs';
const base=process.env.UI_LAYOUT_URL||process.env.BASE_URL||'http://127.0.0.1:4190';
const failures=[];
const expect=(ok,message)=>{if(!ok)failures.push(message);};
const game=await openPhone(`${base}/`);
const page=game.page;
const SETUP=`state.party=[createMonster('ellyna',14),createMonster('verdolino',9)];state.starterId='ellyna';state.flags['starter-chosen']=true;state.flags['dex-received']=true;state.flags['opening-encountered']=true;state.flags['controls-intro']=false;state.lastBar='borgo';state.pos={mapId:'route1',x:12,y:20,facing:'up'};`;
const st=()=>page.evaluate(async()=>{const {getActiveState}=await import('/src/game/state.ts');const s=getActiveState();return {map:s.pos.mapId,bag:{...s.bag},held:s.party.map(m=>m.heldItem??null),spray:s.repellentSteps};});
const openKit=async()=>{await page.getByRole('button',{name:'Menu',exact:true}).tap();await page.waitForTimeout(400);await page.getByRole('button',{name:'Borsa'}).tap();await page.waitForTimeout(500);await page.getByRole('button',{name:'KIT'}).tap();await page.waitForTimeout(300);};
const item=(re)=>page.locator('.ui-row, .ui-button').filter({hasText:re}).first();
const closeDialogs=async()=>{for(let i=0;i<12;i++){const box=await page.locator('.ui-dialog:not([hidden])').boundingBox().catch(()=>null);if(!box)return;await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(350);}};
/** Back to the KIT list, whatever the bag is showing: close dialogues, step back, or reopen from the world. */
const kitList=async(re)=>{await closeDialogs();for(let i=0;i<5;i++){if(await item(re).isVisible())return;const back=page.getByRole('button',{name:'Indietro'}).first();if(await back.isVisible().catch(()=>false)){await back.tap();await page.waitForTimeout(350);continue;}if(await page.getByRole('button',{name:'Menu',exact:true}).isVisible().catch(()=>false)){await openKit();continue;}const tab=page.getByRole('button',{name:'KIT'});if(await tab.isVisible().catch(()=>false)){await tab.tap();await page.waitForTimeout(300);continue;}await page.waitForTimeout(300);}};
const body=()=>page.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
try{
 await game.newCampaign();
 await game.jump(SETUP+`state.bag={caffe:4,scheda:1,gilet:1,spray:1,rimborso:1};`);

 // A held item: open it, give it to the second companion.
 await openKit();
 await item(/GILET/i).tap();await page.waitForTimeout(400);
 expect(/ELLYNA/i.test(await body())&&/VERDOLINO/i.test(await body()),'the item sheet lists who can hold it');
 await page.locator('.ui-row, .ui-button').filter({hasText:/VERDOLINO/i}).first().tap();await page.waitForTimeout(600);
 let s=await st();
 expect(s.held[1]==='gilet'&&!s.bag.gilet,`the vest is given to the chosen companion and leaves the bag (${JSON.stringify(s)})`);
 expect(s.held[0]===null,'the other companion holds nothing');

 // The spray: one tap, 150 steps of peace.
 await kitList(/Spray/i);
 await item(/Spray/i).tap();await page.waitForTimeout(500);await closeDialogs();
 s=await st();
 if(s.spray!==150){const confirm=page.getByRole('button',{name:/Usa|Conferma|Sì/i}).first();if(await confirm.count()&&await confirm.isVisible()){await confirm.tap();await page.waitForTimeout(500);await closeDialogs();s=await st();}}
 expect(s.spray===150&&!s.bag.spray,`the spray gives 150 steps and is used up (${JSON.stringify(s)})`);

 // The refund card: straight to the last Bar Sport.
 await kitList(/rimborso/i);
 await item(/rimborso/i).tap();await page.waitForTimeout(600);
 s=await st();
 if(s.map!=='borgo'){const confirm=page.getByRole('button',{name:/Usa|Conferma|Sì|Viaggia/i}).first();if(await confirm.count()&&await confirm.isVisible()){await confirm.tap();await page.waitForTimeout(1800);s=await st();}}
 await closeDialogs();s=await st();
 expect(s.map==='borgo'&&!s.bag.rimborso,`the card takes you to the last bar and is used up (${JSON.stringify(s)})`);
 expect(await page.evaluate(()=>document.body.classList.contains('ui-world-open')),'and the menus are closed behind it');

 // The vest in a fight: the companion that was given it (kept in the save) takes less damage than the same one without it, with the same dice.
 await page.waitForTimeout(200);
 const dmg=await page.evaluate(async()=>{
  const {createMonster}=await import('/src/game/monster.ts'),{MOVES}=await import('/src/data/moves.ts'),{makeCombatant,calcDamage}=await import('/src/game/battle/sim.ts'),{getActiveState}=await import('/src/game/state.ts');
  const dice=seed=>()=>{seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  const holder=getActiveState().party[1],bare=createMonster(holder.speciesId,holder.level);
  const hit=mon=>calcDamage(makeCombatant(createMonster('salvinott',20)),makeCombatant(mon),MOVES.comizio,dice(9)).damage;
  return {held:holder.heldItem,bare:hit(bare),armed:hit(holder)};
 });
 expect(dmg.held==='gilet'&&dmg.armed<dmg.bare,`the vest cuts the damage taken (${JSON.stringify(dmg)})`);
 expect(game.errors.length===0,`page errors: ${game.errors.join(' | ')}`);
}finally{await game.close();}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('Items ok: vest given by touch, spray, refund card.');
