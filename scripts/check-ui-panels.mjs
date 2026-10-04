/** DESIGN-UI §7 for panel screens: squad, companion, bag, new move, map, shop, dex, circle.
 * Runs against the isolated review page; nothing is written to storage. */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:4190';
const screens=['squadra','compagno','borsa','impara','mappa','negozio','dex','circolo','missioni','evoluzione','titolo','starter','archivio','governo','tipi','morale','fonti','backup','traguardi','audio'];
const fixed=['squadra','compagno','impara','mappa'];
const viewports=[{width:360,height:740},{width:412,height:915},{width:844,height:390},{width:360,height:640}];
const browser=await chromium.launch(),errors=[];
await fs.mkdir('artifacts/m2',{recursive:true});
try{for(const viewport of viewports)for(const screen of screens){
 const page=await browser.newPage({viewport,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(`${screen}: ${e.message}`));
 await page.goto(`${base}/scripts/m2-ui-review.html?screen=${screen}`);
 await page.locator('#game-ui:not([hidden]) h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(250);
 const issues=await page.evaluate(({screen,fixed})=>{
  const out=[],w=innerWidth,h=innerHeight,root=document.querySelector('#game-ui');
  const visible=e=>e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true});
  const box=e=>e.getBoundingClientRect();
  const name=e=>e.getAttribute('aria-label')||e.textContent.trim().slice(0,40);
  const all=[...root.querySelectorAll('*')].filter(visible);
  const controls=all.filter(e=>e.matches('button,a,input,select'));
  for(const e of controls){const r=box(e);if(r.left<-.5||r.right>w+.5)out.push(`outside horizontally: ${name(e)}`);if(r.width<43.5||r.height<43.5)out.push(`small target ${Math.round(r.width)}×${Math.round(r.height)}: ${name(e)}`);}
  if(root.scrollWidth>root.clientWidth+1)out.push('horizontal overflow');
  const scrolls=all.filter(e=>{const s=getComputedStyle(e);return /auto|scroll/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+1});
  if(scrolls.some(e=>scrolls.some(p=>p!==e&&p.contains(e))))out.push('nested scroll');
  if(fixed.includes(screen)&&scrolls.length)out.push(`scroll in fixed screen: ${scrolls.map(e=>e.className).join(',')}`);
  const texts=all.filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
  const sizes=[...new Set(texts.map(e=>getComputedStyle(e).fontSize))];if(sizes.length>4)out.push('more than 4 text sizes: '+sizes.join(','));
  for(const e of texts)for(const n of e.childNodes)if(n.nodeType===3&&/^Scelta \d|^Compagno \d|\d+ di \d+\.?$/.test(n.textContent.trim()))out.push('accessibility prose: '+n.textContent.trim());
  if(visible(document.querySelector('#console-top')))out.push('website header visible');
  for(const e of all.filter(e=>e.children.length===0&&e.textContent.trim()&&!e.matches('.ui-atlas-label,.ui-title')))if(e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflow!=='visible')out.push('clipped text: '+name(e));
  const rows=[...root.querySelectorAll('.ui-row')].filter(visible);
  if(screen==='squadra'){if(rows.length<6)out.push('fewer than 6 companions');for(const r of rows)if(box(r).bottom>h+.5)out.push('row outside screen');}
  if(screen==='compagno'&&rows.length<4)out.push('fewer than 4 moves');
  if(screen==='impara'&&rows.length<5)out.push('new move + 4 current moves expected');
  if(screen==='borsa'&&rows.length<3)out.push('fewer than 3 items');
  if(screen==='mappa'){const nodes=[...root.querySelectorAll('.ui-atlas-node')].filter(visible);if(nodes.length<5)out.push('map nodes missing');
   for(const n of nodes){const r=box(n);if(r.left<-.5||r.right>w+.5||r.top<-.5||r.bottom>h+.5)out.push('map node outside: '+name(n));}}
  const broken=[...root.querySelectorAll('img')].filter(i=>visible(i)&&(!i.complete||!i.naturalWidth));if(broken.length)out.push('missing sprites: '+broken.map(i=>i.src.split('/').pop()).join(','));
  return out;
 },{screen,fixed});
 for(const issue of issues)errors.push(`${screen} ${viewport.width}×${viewport.height}: ${issue}`);
 if(viewport.width===412)await page.screenshot({path:`artifacts/m2/panel-${screen}-412x915.png`});
 await page.close();
}}finally{await browser.close();}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`UI panels: ${screens.length} schermate × ${viewports.length} viewport senza difetti.`);
