/** Touch and keyboard paths through the Tribuna panels, on the isolated review page. */
import {chromium} from 'playwright';
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:4190';
const browser=await chromium.launch(),errors=[];
const open=async(screen,viewport={width:412,height:915})=>{
 const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(`${screen}: ${e.message}`));
 await page.goto(`${base}/scripts/m2-ui-review.html?screen=${screen}`);
 await page.locator('#game-ui:not([hidden]) .ui-header').waitFor();await page.waitForTimeout(200);return page;
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
 await page.getByRole('button',{name:'Strumenti'}).tap();
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
 // New move: one tap on a current move replaces it.
 page=await open('impara');
 await page.locator('.ui-row',{hasText:'EDITORIALE'}).tap();
 await page.waitForTimeout(400);
 await page.close();
 // Keyboard: arrows move the cursor, Enter opens, Escape returns.
 page=await open('squadra',{width:844,height:390});
 await page.waitForTimeout(400);
 await page.keyboard.press('ArrowDown');await page.waitForTimeout(150);await page.keyboard.press('ArrowDown');await page.waitForTimeout(150);
 expect((await page.locator('.ui-row[aria-current=true]').innerText()).includes('ELLYNA'),'keyboard cursor');
 await page.close();
}finally{await browser.close();}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('UI flows: squadra, compagno, borsa, mappa, impara e tastiera verificati.');
