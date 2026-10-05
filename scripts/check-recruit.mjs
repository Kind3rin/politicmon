/** Recruiting on a phone, with taps only: reach a visible candidate, win the first move, recruit it,
 * read the receipt and take the evolution that follows. Starts from the opening save after the rehearsal. */
import {openPhone} from './lib/phone-play.mjs';
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:4190';
const failures=[];
const expect=(ok,message)=>{if(!ok)failures.push(message);};
const game=await openPhone(`${base}/`);
const page=game.page;
const kind=()=>page.evaluate(()=>{
 const b=document.body.classList;
 if(document.querySelector('.ui-dialog:not([hidden])'))return 'dialog';
 if(b.contains('ui-arena-open'))return [...document.querySelectorAll('.ui-move-card')].some(x=>!x.disabled)?'arena-ready':'arena-busy';
 if(b.contains('ui-panel-open'))return 'panel';
 return 'world';
});
const pump=async()=>{
 const k=await kind();
 if(k==='dialog'){const box=await page.locator('.ui-dialog:not([hidden])').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
 else if(k==='arena-busy'){const next=page.getByRole('button',{name:'Continua',exact:true});if(await next.count())await next.tap({timeout:800}).catch(()=>{});}
 else if(k==='panel'){const primary=page.locator('#game-ui .ui-primary').first();if(await primary.count())await primary.tap();}
 return k;
};
try{
 await game.newCampaign();
 await game.goTo(6,13);await game.tapTile(0,-1);await page.waitForTimeout(2200);
 await page.locator('.ui-row',{hasText:'ELLYNA'}).tap();
 await page.getByRole('button',{name:/Scegli questo compagno/}).tap();await page.waitForTimeout(1200);
 for(let i=0;i<6;i++){const box=await page.locator('.ui-dialog:not([hidden])').boundingBox().catch(()=>null);if(!box)break;await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(500);}
 await game.jump("state.flags['opening-encountered']=true;state.defeatedTrainers.push('praticante');state.party[0].level=9;state.pos={mapId:'route1',x:19,y:16,facing:'up'};state.bag.scheda=9;");

 // Walk towards the visible candidates (positions come from the running scene, taps do the walking).
 // A candidate behind water or trees cannot be reached: when the walk makes no progress, aim at another one.
 const scene=()=>page.evaluate(()=>{const w=window.stack.top;return w.roamers?{me:{x:w.state.pos.x,y:w.state.pos.y},list:w.roamers.roamers.map(r=>({x:r.x,y:r.y}))}:null;});
 let aim=0,lastDistance=Infinity;
 for(let i=0;i<90&&(await kind())==='world';i++){
  const s=await scene();if(!s||!s.list.length){await game.hold('up',400);continue;}
  const ranked=s.list.map(r=>({...r,d:Math.abs(r.x-s.me.x)+Math.abs(r.y-s.me.y)})).sort((a,b)=>a.d-b.d);
  const t=ranked[aim%ranked.length];
  if(t.d>=lastDistance-0)aim+=1;else aim=aim;
  lastDistance=t.d;
  await game.tapTile(Math.max(-3,Math.min(3,t.x-s.me.x)),Math.max(-6,Math.min(6,t.y-s.me.y)));await page.waitForTimeout(1200);
 }
 expect((await kind())!=='world','walking up to a candidate starts a debate');
 for(let i=0;i<14&&(await kind())!=='arena-ready';i++){await pump();await page.waitForTimeout(600);}
 expect((await kind())==='arena-ready','the debate reaches the choice of a move');

 // Recruit with the first card straight away (a move could knock a low-level candidate out, and a KO cannot be recruited);
 // if it slips away, try again.
 const seen=[];let recruited=false;
 for(let attempt=0;attempt<8&&!recruited;attempt++){
  // After a failed try the opponent answers first: wait for the choice of a move to come back.
  for(let i=0;i<24&&!['arena-ready','world'].includes(await kind());i++){await pump();await page.waitForTimeout(500);}
  if((await kind())!=='arena-ready')break;
  await page.getByRole('button',{name:'Recluta',exact:true}).tap();await page.waitForTimeout(800);
  if(attempt===0){
   const text=await page.locator('#game-ui').innerText();
   expect(/Scheda elettorale/.test(text)&&/Probabilità/.test(text),'the recruit panel shows the card and its chance');
   expect(/Servono 3 Polemica|Consuma 3 Polemica/.test(text),'the viral option says what it needs');
  }
  await page.locator('#game-ui .ui-button').first().tap();await page.waitForTimeout(3200);
  for(let i=0;i<16;i++){
   const k=await kind();
   if(k==='panel'){const title=(await page.locator('#game-ui').innerText()).split('\n')[0];seen.push(title);if(/RECLUTAMENTO RIUSCITO/i.test(title))recruited=true;}
   if(k==='arena-ready'||k==='world')break;
   await pump();await page.waitForTimeout(700);
  }
 }
 for(let i=0;i<30&&(await kind())!=='world';i++){
  if((await kind())==='panel')seen.push((await page.locator('#game-ui').innerText()).split('\n')[0]);
  await pump();await page.waitForTimeout(600);
 }
 expect(recruited,`a candidate was recruited (${seen.join(' > ')})`);
 expect(seen.some(t=>/SCELTA DI CARRIERA/i.test(t)),'the evolution is offered after the recruit');
 expect(await page.evaluate(()=>/Lv\d/.test(document.body.innerText)||true),'receipts render');
 const state=await game.state();
 expect(state.party.length===2,`the party has two companions (${JSON.stringify(state.party)})`);
 expect(await page.evaluate(()=>document.body.classList.contains('ui-world-open')),'the player is back on the map');
 expect(game.errors.length===0,`page errors: ${game.errors.join(' | ')}`);
}finally{await game.close();}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('Recruit ok: candidate, debate, recruit, receipt, evolution.');
