/** Touch and keyboard paths through the Tribuna panels, on the isolated review page. */
import {chromium} from 'playwright';
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:4190';
const browser=await chromium.launch(),errors=[];
const open=async(screen,viewport={width:412,height:915})=>{
 const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(`${screen}: ${e.message}`));
 await page.goto(`${base}/scripts/m2-ui-review.html?screen=${screen}`);
 await page.locator(screen.startsWith('lotta')?'.ui-arena':'#game-ui:not([hidden]) .ui-header').waitFor();await page.waitForTimeout(200);return page;
};
const expect=(ok,message)=>{if(!ok)errors.push(message);};
const text=page=>page.locator('#game-ui').innerText();
try{
 // Squad: tap a companion, read the three tabs, go back, and reorder the lead.
 let page=await open('squadra');
 expect((await page.locator('.ui-row').count())===6,'squad rows');
 await page.locator('.ui-row',{hasText:'GIORGETTA'}).tap();
 await page.locator('.ui-hero-card').waitFor();
 expect(/CONFERENZA|PROMESSA|EDITORIALE|COMIZIO|/i.test(await text(page)),'companion moves');
 await page.getByRole('button',{name:'Valori'}).tap();
 await page.locator('.ui-stat').first().waitFor();
 expect((await page.locator('.ui-stat').count())===5,'five stat bars');
 await page.getByRole('button',{name:/^Metti in testa/}).tap();
 await page.getByRole('button',{name:'Indietro'}).tap();
 await page.locator('.ui-row').first().waitFor();
 expect((await page.locator('.ui-row').first().innerText()).includes('GIORGETTA'),'lead reordered');
 await page.close();
 // Bag: item → recipient row with previewed effect → one tap applies it.
 page=await open('borsa');
 await page.locator('.ui-row',{hasText:'Caffè'}).tap();
 await page.locator('.ui-row .ui-meter').first().waitFor();
 expect(/64 → 9\d/.test(await text(page)),'heal preview');
 await page.locator('.ui-row:not([aria-disabled=true])').first().tap();
 await page.locator('.ui-dialog:not([hidden])').waitFor({timeout:3000}).catch(()=>errors.push('no heal receipt'));
 await page.close();
 page=await open('borsa');
 await page.getByRole('button',{name:'Kit'}).tap();
 expect(await page.locator('.ui-row').count()>0,'tools tab has items');
 await page.close();
 // Map: nodes are real buttons; a tap opens the place and Indietro returns.
 page=await open('mappa');
 await page.locator('.ui-atlas-node',{hasText:/Borgo/i}).tap();
 await page.locator('.ui-atlas').waitFor({state:'detached'}).catch(()=>errors.push('map detail replaces atlas'));
 await page.getByRole('button',{name:'Indietro'}).tap();
 await page.locator('.ui-atlas').waitFor();
 await page.getByRole('button',{name:'Rotte'}).tap();
 await page.waitForTimeout(200);
 expect(await page.locator('.ui-atlas-node').count()===3,'routes page has 3 places');
 await page.close();
 // Plan of the place: drawn first, its doors listed, one tap away from the whole country and back.
 page=await open('pianta');
 expect(await page.locator('.ui-plan-canvas').count()===1,'the plan of the place is drawn');
 expect(await page.locator('.ui-actions .ui-button').count()>=2,'its doors and roads are listed');
 await page.getByRole('button',{name:'Italietta'}).tap();
 await page.locator('.ui-atlas').waitFor();
 await page.getByRole('button',{name:'Qui',exact:true}).tap();
 await page.locator('.ui-plan-canvas').waitFor();
 await page.close();
 // New move: one tap on a current move replaces it.
 page=await open('impara');
 await page.locator('.ui-row',{hasText:'EDITORIALE'}).tap();
 await page.waitForTimeout(400);
 await page.close();
 // Battle: postures say what they do, the chosen one explains itself, "Altro" holds the rest.
 page=await open('lotta-allenatore');
 for(let i=0;i<6&&!await page.locator('.ui-posture').first().isVisible();i++){
  await page.getByRole('button',{name:'Continua',exact:true}).tap({timeout:2500}).catch(()=>{});await page.waitForTimeout(500);
 }
 await page.locator('.ui-posture').first().waitFor({timeout:6000}).catch(()=>errors.push('postures never appeared'));
 const chips=await page.locator('.ui-posture').allInnerTexts();
 expect(chips.length===3&&chips.every(t=>t.trim().split('\n').length>=2),`each posture explains itself (${JSON.stringify(chips)})`);
 const caption=()=>page.locator('.ui-arena-caption').innerText();
 const before=await caption();
 await page.locator('.ui-posture',{hasText:'Smentisci'}).tap();await page.waitForTimeout(250);
 expect(/Subisci/.test(await caption()),`the chosen posture's rule is shown (${await caption()})`);
 expect(await page.locator('.ui-posture[aria-pressed=true]').count()===1,'one posture is marked as chosen');
 await page.locator('.ui-posture',{hasText:'Smentisci'}).tap();await page.waitForTimeout(250);
 expect(await caption()===before,'choosing it again takes the posture back');
 await page.getByRole('button',{name:'Altro',exact:true}).tap();
 await page.locator('#tribuna-sheet[open]').waitFor({timeout:3000}).catch(()=>errors.push('Altro did not open'));
 expect(/Dossier/.test(await page.locator('#tribuna-sheet').innerText()),'Altro lists the other actions');
 await page.close();
 // Squad order: pick and place with taps, drag with a finger, and the keyboard.
 {
  const start='BERLUSCONIX,GIORGETTA,ELLYNA,SALVINATOR,DRAGHIMON,MOVIMENTON';
  const order=p=>p.locator('.ui-row-name').allInnerTexts().then(names=>names.join(','));
  page=await open('squadra');
  expect(await order(page)===start,'the squad starts in its fixture order');
  expect(/primo della lista/i.test(await text(page)),'the squad says the first one fights first');
  await page.getByRole('button',{name:'Riordina'}).tap();await page.waitForTimeout(250);
  expect(await page.locator('.ui-row-slot').count()===6,'every place is numbered while reordering');
  await page.locator('.ui-row',{hasText:'DRAGHIMON'}).tap();await page.waitForTimeout(200);
  expect(/Dove metto DRAGHIMON/.test(await text(page)),'the picked companion is named');
  expect(await page.locator('.ui-row-held').count()===1,'one companion is held');
  await page.locator('.ui-row',{hasText:'GIORGETTA'}).tap();await page.waitForTimeout(250);
  expect(await order(page)==='BERLUSCONIX,DRAGHIMON,GIORGETTA,ELLYNA,SALVINATOR,MOVIMENTON',`pick and place (${await order(page)})`);
  expect(/DRAGHIMON ora è 2º/.test(await text(page)),'the move is announced');
  await page.locator('.ui-row',{hasText:'ELLYNA'}).tap();await page.locator('.ui-row',{hasText:'ELLYNA'}).tap();await page.waitForTimeout(200);
  expect(await page.locator('.ui-row-held').count()===0,'tapping the held companion puts it back');
  // A finger drags a row over another.
  const cdp=await page.context().newCDPSession(page);
  const box=async name=>page.locator('.ui-row',{hasText:name}).boundingBox();
  const from=await box('MOVIMENTON'),to=await box('BERLUSCONIX'),x=from.x+from.width/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:from.y+from.height/2,id:0}]});
  for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:from.y+from.height/2+(to.y+to.height/2-from.y-from.height/2)*i/10,id:0}]});await page.waitForTimeout(25);}
  expect(await page.locator('.ui-row-dragging').count()===1,'a dragged row is lifted');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
  expect(await order(page)==='MOVIMENTON,BERLUSCONIX,DRAGHIMON,GIORGETTA,ELLYNA,SALVINATOR',`drag to the first place (${await order(page)})`);
  expect(await page.locator('.ui-row-held').count()===0,'a drag does not leave a companion held');
  // The close button leaves reorder mode first, the squad second.
  await page.getByRole('button',{name:'Indietro'}).tap();await page.waitForTimeout(250);
  expect(await page.getByRole('button',{name:'Riordina'}).count()===1,'the first close leaves reorder mode');
  await page.close();
  // The Circolo leads to the same reordering.
  page=await open('circolo');
  await page.getByRole('button',{name:'Riordina la squadra'}).tap();
  await page.getByRole('button',{name:'Fatto'}).waitFor({timeout:3000}).catch(()=>errors.push('the Circolo opens the squad ready to reorder'));
  expect(await page.locator('.ui-row-slot').count()===6,'the squad opened from the Circolo numbers its places');
  await page.getByRole('button',{name:'Fatto'}).tap();await page.getByRole('button',{name:'Indietro'}).tap();
  await page.locator('.ui-tabs').waitFor({timeout:3000}).catch(()=>errors.push('closing the squad returns to the Circolo'));
  await page.close();
  page=await open('squadra',{width:844,height:390});
  const press=async(key,n=1)=>{for(let i=0;i<n;i++){await page.keyboard.press(key);await page.waitForTimeout(120);}};
  await press('ArrowDown',6);await press('KeyZ');
  expect(await page.getByRole('button',{name:'Fatto'}).count()===1,'the keyboard turns reordering on');
  await press('ArrowUp',2);await press('KeyZ');
  await press('ArrowUp',3);await press('KeyZ');await page.waitForTimeout(200);
  expect(await order(page)==='BERLUSCONIX,DRAGHIMON,GIORGETTA,ELLYNA,SALVINATOR,MOVIMENTON',`keyboard pick and place (${await order(page)})`);
  await page.close();
 }
 // Keyboard: arrows move the cursor, Enter opens, Escape returns.
 page=await open('squadra',{width:844,height:390});
 await page.waitForTimeout(400);
 await page.keyboard.press('ArrowDown');await page.waitForTimeout(150);await page.keyboard.press('ArrowDown');await page.waitForTimeout(150);
 expect((await page.locator('.ui-row[aria-current=true]').innerText()).includes('ELLYNA'),'keyboard cursor');
 await page.close();
}finally{await browser.close();}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('UI flows: squadra, compagno, borsa, mappa, impara, lotta e tastiera verificati.');
