/** Renders scripts/og-card.html to public/og.png (1200x630), the preview shown when the link is shared. */
import {chromium} from 'playwright';
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:5199';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1200,height:630}});
await page.goto(`${base}/scripts/og-card.html`);
await page.evaluate(()=>document.fonts.ready);
await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
await page.screenshot({path:'public/og.png'});
await browser.close();
console.log('public/og.png');
