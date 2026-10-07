import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';
import {MAPS} from '../src/data/maps.ts';
import {TILES} from '../src/art/tiles.ts';
import {palaceDossier} from '../src/game/palaceArchive.ts';
import {dossierPages} from '../src/ui/dossier.ts';
const base=process.env.PREVIEW_URL??'http://127.0.0.1:4184/';
const report=JSON.parse(readFileSync(existsSync('artifacts/campaign-native/palace-final-ellyna-direct-20261002.json')?'artifacts/campaign-native/palace-final-ellyna-direct-20261002.json':'docs/palace-proof.json','utf8'));
const initial=importSaveCode((report.codes??report.earnedCampaign.codes)['palace-earned-resume']);assert.equal(initial.election.phase,'ready');assert.equal(initial.flags.tourComplete,true);
const core=s=>Object.fromEntries(['money','party','bag','morale','coalition','election'].map(k=>[k,s[k]]));
const reports=[];mkdirSync('artifacts/screens/palace-release',{recursive:true});
for(const [engine,type]of[['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 try{
  const context=await browser.newContext({viewport:{width:412,height:915},hasTouch:true,isMobile:true,deviceScaleFactor:3,serviceWorkers:'block'});
  await context.addInitScript(save=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');},serializeGameState(initial));
  const page=await context.newPage(),errors=[],assets=new Set(),stages=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.ok()&&r.url().includes('palace'))assets.add(new URL(r.url()).pathname);});
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
  const tap=async(key,n=1)=>{for(let i=0;i<n;i++){await page.locator(`[data-key="${key}"]`).last().tap();await page.waitForTimeout(180);}};
  const hold=async(dir)=>{const key={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[dir];await page.keyboard.down(key);await page.waitForTimeout(55);await page.keyboard.up(key);await page.waitForTimeout(230);};
  let pos={...initial.pos};
  const capture=async name=>{await page.waitForTimeout(100);await page.screenshot({path:`artifacts/screens/palace-release/${engine}-${name}.png`});stages.push(name);console.log(engine+": "+name);};
  const path=(tx,ty)=>{
   const map=MAPS[pos.mapId],q=[[pos.x,pos.y]],parent=new Map([[`${pos.x},${pos.y}`,null]]),blocked=new Set(map.npcs.filter(n=>(!n.showIfFlag||initial.flags[n.showIfFlag])&&(!n.hideIfFlag||!initial.flags[n.hideIfFlag])).map(n=>`${n.x},${n.y}`));
   for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){const out=[];let k=`${x},${y}`;while(parent.get(k)){const prev=parent.get(k);out.unshift(prev.dir);k=prev.from;}return out;}
    for(const [dir,dx,dy]of[['up',0,-1],['left',-1,0],['right',1,0],['down',0,1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`,ch=map.tiles[ny]?.[nx];if(!ch||TILES[ch]?.solid||blocked.has(k)||parent.has(k)||map.warps.some(w=>w.x===nx&&w.y===ny&&(nx!==tx||ny!==ty)))continue;parent.set(k,{from:`${x},${y}`,dir});q.push([nx,ny]);}
   }throw Error('No native path '+JSON.stringify({pos,tx,ty}));
  };
  const walk=async(x,y)=>{for(const dir of path(x,y)){await hold(dir);pos.x+=({left:-1,right:1})[dir]??0;pos.y+=({up:-1,down:1})[dir]??0;pos.facing=dir;}};
  const enter=async id=>{const w=MAPS[pos.mapId].warps.find(w=>w.toMap===id);await walk(w.x,w.y);await page.waitForFunction(id=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId===id,id,{timeout:6000});await page.waitForTimeout(750);pos={mapId:id,x:w.toX,y:w.toY,facing:w.facing};await tap('b',8);};
  const talk=async id=>{const n=MAPS[pos.mapId].npcs.find(n=>n.id===id);let target;for(const [dir,dx,dy]of[['up',0,1],['down',0,-1],['left',1,0],['right',-1,0]]){try{target={x:n.x+dx,y:n.y+dy,dir,steps:path(n.x+dx,n.y+dy)};break;}catch{}}if(!target)throw Error('No adjacent NPC route');await walk(target.x,target.y);await hold(target.dir);pos.facing=target.dir;await tap('a');};
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);await tap('a',2);await page.waitForTimeout(800);await tap('b',24);await capture('reception');
  for(const [module,npc]of[['algoritmo','algorithm'],['factcheck','factcheck'],['talkshow','talkshow'],['silenzio','silence']]){
   await enter('palazzo_'+module);await talk('palace-'+npc+'-a');await capture(module+'-read');await tap('b');assert.deepEqual(core(await saved()),core(initial));
   await talk('palace-'+npc+'-a');await tap('a',dossierPages(palaceDossier(await saved(),module).lines,5).length);assert.ok((await saved()).flags['palace:'+module+':a']);
   await talk('palace-'+npc+'-b');await capture(module+'-quiz');const data=palaceDossier(await saved(),module),correct=data.options.indexOf(data.answer),wrong=(correct+1)%3;
   await tap('down',wrong);await tap('a');await capture(module+'-wrong');assert.ok(!(await saved()).flags['palace-module:'+module]);assert.deepEqual(core(await saved()),core(initial));await tap('b');
   await talk('palace-'+npc+'-b');await tap('down',correct);await tap('a');assert.ok((await saved()).flags['palace-module:'+module]);assert.deepEqual(core(await saved()),core(initial));await capture(module+'-validated');await tap('b');await enter('palazzo_feed');
  }
  assert.equal((await saved()).flags.palaceRoomsComplete,true);await enter('palazzo_feed_studio');await talk('palace-election-desk');await tap('b',7);await capture('seal-cancel');assert.equal((await saved()).election.phase,'ready');assert.equal((await saved()).coalition.locked,false);
  await talk('palace-election-desk');await tap('a',7);await capture('seal-default-review');assert.deepEqual(core(await saved()),core(initial));
  await talk('palace-election-desk');await tap('a',6);await tap('down');await tap('a');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).election.phase==='locked');await capture('sealed-briefing');await tap('b');const sealed=await saved();assert.ok(sealed.election.snapshot);assert.equal(sealed.coalition.locked,true);assert.equal(sealed.election.result,null);
  assert.deepEqual(sealed.election.snapshot.districts,initial.election.districts);assert.deepEqual(errors,[]);reports.push({base,engine,stages,assets:[...assets],cancelAndWrongPure:true,defaultDoesNotSeal:true,sealedSnapshot:sealed.election.snapshot,physicalDevice:false});await context.close();
  console.log(`PASS ${engine}: four actual quizzes, wrong/cancel no rewards, explicit seal, briefing cancellation preserves resumable snapshot`);
 }finally{await browser.close();}
}
mkdirSync('artifacts/reports',{recursive:true});writeFileSync('artifacts/reports/palace-release.json',JSON.stringify(reports,null,2)+'\n');
