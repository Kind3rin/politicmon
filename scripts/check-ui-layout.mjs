/** DESIGN-UI §7. Layout geometry for explicit review fixtures; never certifies production by proxy. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const mock=process.argv.includes('--mock');
if(!mock){await import('./check-ui-runtime.mjs');process.exit(0);}
const base=process.env.UI_LAYOUT_URL||'http://127.0.0.1:4190';
const pages=JSON.parse(await fs.readFile('design/ui-mock/manifest.json','utf8'));
const browser=await chromium.launch({headless:true});const errors=[],results=[];
try{for(const viewport of [{width:360,height:740},{width:412,height:915},{width:844,height:390},{width:360,height:640}]){
 const page=await browser.newPage({viewport});
 for(const name of pages){
  await page.goto(`${base}/design/ui-mock/${name}.html`);await page.evaluate(()=>document.fonts.ready);
  const report=await page.evaluate(()=>{
   const root=document.querySelector('[data-screen]'),w=innerWidth,h=innerHeight,issues=[];
   const visible=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
   const rect=e=>e.getBoundingClientRect();
   const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
   const name=e=>e.getAttribute('aria-label')||e.textContent.trim().slice(0,35)||e.className;
   const interactive=[...root.querySelectorAll('button,a,input,select')].filter(visible);
   for(const e of interactive){const r=rect(e);if(r.left<-.5||r.top<-.5||r.right>w+.5||r.bottom>h+.5)issues.push(`outside: ${name(e)}`);if(r.width<43.5||r.height<43.5)issues.push(`small target: ${name(e)} ${r.width}×${r.height}`)}
   for(let i=0;i<interactive.length;i++)for(let j=i+1;j<interactive.length;j++)if(!interactive[i].contains(interactive[j])&&!interactive[j].contains(interactive[i])&&overlaps(rect(interactive[i]),rect(interactive[j])))issues.push(`overlapping targets: ${name(interactive[i])} / ${name(interactive[j])}`);
   const all=[...root.querySelectorAll('*')].filter(visible);
   const scrolls=all.filter(e=>{const s=getComputedStyle(e);return ((/auto|scroll/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+1)||(/auto|scroll/.test(s.overflowX)&&e.scrollWidth>e.clientWidth+1))});
   if(['lotta','squadra','menu','impara'].includes(root.dataset.screen)&&scrolls.length)issues.push('scroll in fixed screen');
   if(scrolls.some(e=>scrolls.some(other=>other!==e&&other.contains(e))))issues.push('nested scrolling');
   const texts=all.filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
   const sizes=[...new Set(texts.map(e=>getComputedStyle(e).fontSize))];if(sizes.length>3)issues.push('more than 3 font sizes: '+sizes.join(','));
   for(const e of texts)for(const n of [...e.childNodes].filter(n=>n.nodeType===3))if(/\d+ di \d+\.?$|^Scelta |^Compagno \d/.test(n.textContent.trim()))issues.push('visible accessibility prose: '+n.textContent);
   const labels=new Map();for(const e of texts){const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('');if(t&&/[a-zA-ZÀ-ÿ]{3}/.test(t))labels.set(t,(labels.get(t)||0)+1)}
   for(const [t,count]of labels)if(count>2)issues.push(`repeated text: ${t} ×${count}`);
   // Framed containers have >=3 bordered sides; separators and HP strokes aren't cards.
   const framed=all.filter(e=>{if(e instanceof SVGElement||e.tagName==='IMG'||e.closest('[data-world]'))return false;const s=getComputedStyle(e);return ['Top','Right','Bottom','Left'].filter(side=>parseFloat(s[`border${side}Width`])>0&&s[`border${side}Style`]!=='none').length>=3});if(framed.length>8)issues.push(`framed containers: ${framed.length}`);
   if(document.querySelector('#console-top'))issues.push('website header present');
   const world=root.querySelector('[data-world]');if(world){const r=rect(world);if(r.width*r.height/(w*h)<.95)issues.push('world below 95%');const player=root.querySelector('.player');if(root.dataset.screen.startsWith('esplorazione')&&interactive.some(e=>overlaps(rect(e),rect(player))))issues.push('controls cover player')}
   const stage=root.querySelector('[data-battle-scene]');let battleRatio;
   if(stage){battleRatio=rect(stage).height/h;if(h>w&&battleRatio<.48)issues.push('battle below 48%');for(const sprite of root.querySelectorAll('.battle-sprite')){const minimum=sprite.classList.contains('ally')?.36:.30;if(rect(sprite).width/rect(stage).width<minimum)issues.push(`battle sprite below ${minimum*100}% stage width`);for(const overlay of root.querySelectorAll('.combat-tag,.intent,.resource'))if(overlaps(rect(sprite),rect(overlay)))issues.push('overlay covers sprite: '+overlay.className)}}
   if(root.dataset.screen==='squadra'&&[...root.querySelectorAll('.member')].filter(visible).length<6)issues.push('less than 6 companions');if(root.dataset.screen==='borsa'&&[...root.querySelectorAll('.item')].filter(visible).length<8)issues.push('less than 8 items');
   for(const e of all.filter(e=>!['svg','path','IMG','I'].includes(e.tagName)&&e.children.length===0&&e.textContent.trim())){if(e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1)issues.push('clipped text: '+name(e))}
   const broken=[...document.images].filter(i=>visible(i)&&(!i.complete||!i.naturalWidth));if(broken.length)issues.push('missing sprites: '+broken.map(i=>i.src.split('/').pop()).join(','));
   return {issues,battleRatio,fontSizes:sizes,frames:framed.length,targets:interactive.length};
  });
  results.push({name,...viewport,...report});for(const e of report.issues)errors.push(`${name} ${viewport.width}×${viewport.height}: ${e}`);
 }
 await page.close();
}}finally{await browser.close()}
await fs.mkdir('artifacts/m2',{recursive:true});await fs.writeFile('artifacts/m2/mock-layout-report.json',JSON.stringify({scope:'STATIC MOCKS ONLY — production not migrated',results,errors},null,2));
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(`PASS: ${results.length} static mock layouts. Production UI is not certified by this result.`);
