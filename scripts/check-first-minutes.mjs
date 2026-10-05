/** The first minutes of a new campaign on a phone, played with taps and the visible stick only:
 * title → Borgo → lab → first companion → road → tall grass → first wild debate → back on the map. */
import {openPhone} from './lib/phone-play.mjs';
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:4190';
const failures=[];
const expect=(ok,message)=>{if(!ok)failures.push(message);};
const game=await openPhone(`${base}/`);
const page=game.page;
try{
 // Title → a new campaign on Normal.
 await game.newCampaign();
 expect(await page.locator('.ui-world-lesson').count()===1,'the movement lesson is on screen at the start');
 expect((await page.locator('#touch-stick').boundingBox())?.width>=100,'the stick is on screen at the start');
 for(const name of ['Squadra','Mappa','Menu','Corri'])expect(await page.getByRole('button',{name,exact:true}).isVisible(),`${name} is visible in the world`);

 // Borgo → the lab door, only by tapping the map.
 expect(await game.goTo(6,13),'tapping the map walks to the street in front of the lab');
 await game.tapTile(0,-1);await page.waitForTimeout(2200);
 expect((await game.state()).pos.mapId==='lab','a tap on the door enters the lab');

 // The first companion: three cards, names never broken, one tap each way.
 await page.locator('.ui-rows.ui-tiles').waitFor({timeout:5000}).catch(()=>failures.push('the starter cards never appeared'));
 const rows=page.locator('.ui-tiles .ui-row');
 expect(await rows.count()===3,'three starters are offered');
 const heights=await page.locator('.ui-tiles .ui-row-name').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
 expect(heights.every(h=>h<40),`no starter name wraps (${heights})`);
 await rows.filter({hasText:'ELLYNA'}).tap();
 await page.getByRole('button',{name:/Scegli questo compagno/}).tap({timeout:4000}).catch(()=>failures.push('the choose button is missing'));
 await page.waitForTimeout(1000);
 const speakers=[];
 for(let i=0;i<6;i++){
  const box=await page.locator('.ui-dialog:not([hidden])').boundingBox().catch(()=>null);if(!box)break;
  speakers.push(await page.locator('.ui-dialog-speaker').innerText());
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(500);
 }
 expect(speakers.length>=2,'the hand-off takes at least two taps on the dialogue box');
 expect(speakers.every(s=>/quirino/i.test(s)),`the hand-off is spoken by Quirino (${speakers})`);
 await page.waitForTimeout(800);
 let state=await game.state();
 expect(state.party.length===1&&state.party[0].id==='ellyna','Ellyna joined the party');

 // Out of the lab, up the road to the first route.
 await game.hold('down',1500);await page.waitForTimeout(1500);
 expect(await game.goTo(14,14),'walks to the road');
 for(let i=0;i<6&&(await game.state()).pos.mapId==='borgo';i++)await game.hold('up',2200);
 expect((await game.state()).pos.mapId==='route1','the road leads to the first route');

 // The tall grass: pace until a candidate appears, then fight with taps.
 const grass=await page.evaluate(async()=>{const {MAPS}=await import('/src/data/maps.ts');const out=[];MAPS.route1.tiles.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='~'&&y>=10&&y<=17)out.push([x,y]);}));return out;});
 const here=(await game.state()).pos,[gx,gy]=grass.sort((a,b)=>Math.abs(a[0]-here.x)+Math.abs(a[1]-here.y)-Math.abs(b[0]-here.x)-Math.abs(b[1]-here.y))[0];
 expect(await game.goTo(gx,gy),'walks into the tall grass');
 const seen=new Set();let moves=0;
 for(let i=0;i<120;i++){
  const kind=await page.evaluate(()=>{
   const b=document.body.classList;
   if(document.querySelector('.ui-dialog:not([hidden])'))return 'dialog';
   if(b.contains('ui-arena-open'))return [...document.querySelectorAll('.ui-move-card')].some(x=>!x.disabled)?'arena-ready':'arena-busy';
   if(b.contains('ui-panel-open'))return 'panel';
   return 'world';
  });
  seen.add(kind);
  if(kind==='dialog'){const box=await page.locator('.ui-dialog:not([hidden])').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
  else if(kind==='arena-ready'){moves+=1;await page.locator('.ui-move-card:not([disabled])').first().tap();}
  else if(kind==='arena-busy'){const next=page.getByRole('button',{name:'Continua',exact:true});if(await next.count())await next.tap({timeout:800}).catch(()=>{});}
  else if(kind==='panel'){const primary=page.locator('#game-ui .ui-primary').first();if(await primary.count())await primary.tap();else await page.getByRole('button',{name:'Indietro'}).tap().catch(()=>{});}
  else if(seen.has('arena-ready')||seen.has('arena-busy'))break;
  else await game.hold(i%2?'left':'right',500);
  await page.waitForTimeout(450);
 }
 expect(seen.has('arena-ready'),'a wild debate started in the grass');
 expect(moves>0,'moves were chosen by tapping the cards');
 state=await game.state();
 expect(state.flags.includes('opening-encountered'),'the first encounter is recorded');
 expect(await page.evaluate(()=>document.body.classList.contains('ui-world-open')),'the player is back on the map afterwards');
 expect(game.errors.length===0,`page errors: ${game.errors.join(' | ')}`);
}finally{await game.close();}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('First minutes ok: title, lab, starter, road, first debate.');
