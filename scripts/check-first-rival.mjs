/** Gianni's first duel on a phone, by taps: he explains the copione once, then the duel starts.
 * A retry after a loss (the rival is already briefed) goes straight to the duel. */
import {openPhone} from './lib/phone-play.mjs';
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:5199';
const failures=[];
const expect=(ok,message)=>{if(!ok)failures.push(message);};
// Route 1, one tile north of Gianni, with the starter's evolution caught and two companions: the state he fights for.
const READY=`
state.starterId='giorgetta';
state.flags['intro-done']=true;state.flags['starter-chosen']=true;state.flags['opening-v2']=true;
state.dex['giorgiagon']='caught';
state.party=[createMonster('giorgetta',8),createMonster('renzino',6)];
state.pos={mapId:'route1',x:15,y:4,facing:'down'};
`;
const arenaOpen=page=>page.evaluate(()=>document.body.classList.contains('ui-arena-open'));

async function firstDuel(game){
 const page=game.page;
 await game.newCampaign();
 await game.jump(READY);
 await page.getByRole('button',{name:/^Parla$/}).tap();
 await page.getByText('QUESTO È IL COPIONE',{exact:false}).waitFor({timeout:6000}).catch(()=>failures.push('Gianni never explained the copione'));
 expect(await page.getByText(/^Gianni$/).count()>0,'the explanation is captioned Gianni');
 // The box advances on a tap; the text types out first, so wait for the page to settle before the screenshot.
 await page.waitForTimeout(1500);
 await page.screenshot({path:'artifacts/m2/first-rival-copione-375.png'});
 const box=page.locator('#game-dialog');
 const second=()=>page.getByText('LO SCUDO SI LEGGE',{exact:false}).count();
 for(let i=0;i<4&&!(await second());i++){await box.tap({timeout:1500}).catch(()=>{});await page.waitForTimeout(900);}
 expect(await second()>0,'the second page of the explanation appears');
 // The duel waits for the explanation to be read to its end: the page before the last one must not start it.
 expect(!(await arenaOpen(page)),'the duel does not start while the explanation is still being read');
 for(let i=0;i<14&&!(await arenaOpen(page));i++){await box.tap({timeout:1500}).catch(()=>{});await page.waitForTimeout(700);}
 expect(await arenaOpen(page),'the duel starts after the explanation');
 const state=await game.state();
 expect(state.flags.includes('rival1-briefed'),'the explanation is recorded once');
 expect(!state.flags.includes('rival1-beaten'),'winning is not recorded before the duel');
}

async function retry(game){
 const page=game.page;
 await game.newCampaign();
 await game.jump(READY+"state.flags['rival1-briefed']=true;");
 await page.getByRole('button',{name:/^Parla$/}).tap();
 await page.waitForTimeout(1200);
 expect(await page.getByText('QUESTO È IL COPIONE',{exact:false}).count()===0,'a retry does not repeat the explanation');
 expect(await arenaOpen(page),'a retry goes straight to the duel');
}

{
 const game=await openPhone(`${base}/`);
 try{await firstDuel(game);expect(game.errors.length===0,`page errors: ${game.errors.join(' | ')}`);}
 finally{await game.close();}
}
{
 const game=await openPhone(`${base}/`);
 try{await retry(game);expect(game.errors.length===0,`page errors: ${game.errors.join(' | ')}`);}
 finally{await game.close();}
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('First rival ok: Gianni explains the copione once, then the duel; a retry goes straight to it.');
