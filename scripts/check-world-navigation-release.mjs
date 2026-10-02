// Actual compiled movement from an untouched, earned campaign save. This is
// navigation evidence, not a claim about additional battle wins or balance.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium,webkit} from 'playwright';
import {importSaveCode,serializeGameState} from '../src/game/state.ts';
import {MAPS} from '../src/data/maps.ts';
import {TILES} from '../src/art/tiles.ts';

const base=process.env.PREVIEW_URL??'http://127.0.0.1:4184/';
const proof=JSON.parse(readFileSync('docs/palace-proof.json','utf8'));
const code=proof.earnedCampaign.codes['palace-earned-resume'];
const initial=importSaveCode(code);assert.equal(initial.flags.tourComplete,true);
const core=s=>Object.fromEntries(['money','party','bag','morale','coalition','election'].map(k=>[k,s[k]]));
const result={base,physicalDevice:false,sourceCodeSha256:createHash('sha256').update(code).digest('hex'),engines:[]};
mkdirSync('artifacts/screens/world-navigation',{recursive:true});
for(const [name,engine]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(save=>{sessionStorage.setItem('politicmon-intro-seen','1');localStorage.setItem('politicmon-pwa-dismissed',String(Date.now()));localStorage.setItem('politicmon-save-v18__s0',save);localStorage.setItem('politicmon-active-slot','0');},serializeGameState(initial));
  const page=await context.newPage(),errors=[],rooms=[],returns=[];page.on('pageerror',e=>errors.push(e.message));
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')));
  const tap=async(key,n=1)=>{for(let i=0;i<n;i++){await page.locator(`[data-key="${key}"]`).last().tap();await page.waitForTimeout(180);}};
  const hold=async dir=>{const key={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[dir];await page.keyboard.down(key);await page.waitForTimeout(55);await page.keyboard.up(key);await page.waitForTimeout(230);};
  let pos={...initial.pos};
  const path=(tx,ty)=>{
   const map=MAPS[pos.mapId],q=[[pos.x,pos.y]],parents=new Map([[`${pos.x},${pos.y}`,null]]);
   const blocked=new Set(map.npcs.filter(n=>(!n.showIfFlag||initial.flags[n.showIfFlag])&&(!n.hideIfFlag||!initial.flags[n.hideIfFlag])).map(n=>`${n.x},${n.y}`));
   for(let i=0;i<q.length;i++){
    const [x,y]=q[i];if(x===tx&&y===ty){const out=[];let k=`${x},${y}`;while(parents.get(k)){const p=parents.get(k);out.unshift(p.dir);k=p.from;}return out;}
    for(const [dir,dx,dy]of [['up',0,-1],['left',-1,0],['right',1,0],['down',0,1]]){
     const nx=x+dx,ny=y+dy,k=`${nx},${ny}`,ch=map.tiles[ny]?.[nx],warp=map.warps.find(w=>w.x===nx&&w.y===ny);
     if(!ch||TILES[ch]?.solid||TILES[ch]?.water||blocked.has(k)||parents.has(k))continue;
     if(warp&&(nx!==tx||ny!==ty))continue;
     if(warp&&map.outdoor&&!MAPS[warp.toMap].outdoor&&['d','D','g'].includes(ch)&&dir!=='up')continue;
     parents.set(k,{from:`${x},${y}`,dir});q.push([nx,ny]);
    }
   }throw Error('No real portal route '+JSON.stringify({pos,tx,ty}));
  };
  const walk=async(x,y)=>{for(const dir of path(x,y)){await hold(dir);pos.x+=({left:-1,right:1})[dir]??0;pos.y+=({up:-1,down:1})[dir]??0;pos.facing=dir;}};
  const enter=async(id,index=0)=>{
   const w=MAPS[pos.mapId].warps.filter(w=>w.toMap===id)[index];assert.ok(w,`${pos.mapId} -> ${id} #${index}`);
   await walk(w.x,w.y);await page.waitForTimeout(350);await tap('a');
   await page.waitForFunction(id=>JSON.parse(localStorage.getItem('politicmon-save-v18__s0')).pos.mapId===id,id,{timeout:6000});
   await page.waitForTimeout(750);await tap('b',8);pos={...(await saved()).pos};assert.equal(pos.mapId,id);
   assert.deepEqual(core(await saved()),core(initial));
  };
  const centeredFloor=async id=>{
   const pixels=await page.evaluate(async path=>{
    const c=document.createElement('canvas');c.width=240;c.height=180;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.drawImage(document.querySelector('#game-canvas'),0,0,240,180);const actual=Array.from(ctx.getImageData(88,106,1,1).data);
    const image=new Image();image.src=new URL('sprites/'+path,location.href).href;await image.decode();ctx.clearRect(0,0,240,180);ctx.drawImage(image,0,0);
    return{actual,expected:Array.from(ctx.getImageData(0,0,1,1).data)};
   },MAPS[id].tileOverrides.p);
   assert.deepEqual(pixels.actual,pixels.expected,id+' floor is not at centred native tile coordinate (88,106)');
   return pixels;
  };
  const roundTrip=async id=>{
   const origin=pos.mapId;
   for(let exit=0;exit<2;exit++){
    await enter(id);const pixels=await centeredFloor(id);
    if(exit===0){await page.screenshot({path:`artifacts/screens/world-navigation/${name}-${id}.png`});rooms.push({id,pixels});}
    await enter(origin,exit);const tile=MAPS[origin].tiles[pos.y][pos.x];assert.ok(!TILES[tile].solid&&!TILES[tile].water);
    returns.push({from:id,exit,to:{...pos},tile});console.log(`PASS ${name}: ${id} return #${exit} -> ${origin} (${pos.x},${pos.y}), centred floor pixels and resources intact`);
   }
  };
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>performance.getEntriesByName('politicmon:first-frame').length);await tap('a',2);await page.waitForTimeout(800);await tap('b',24);
  for(const id of ['palazzo_algoritmo','palazzo_factcheck','palazzo_talkshow','palazzo_silenzio'])await roundTrip(id);
  await enter('tour_feed');await enter('diplomacy_lobby');
  for(const id of ['diplomacy_loyalty','diplomacy_autonomy','diplomacy_home'])await roundTrip(id);
  for(let exit=0;exit<2;exit++){
   await enter('diplomacy_terrace');await enter('diplomacy_lobby',exit);assert.deepEqual([pos.x,pos.y],[16,9]);
   returns.push({from:'diplomacy_terrace',exit,to:{...pos}});console.log(`PASS ${name}: Hotel terrace door #${exit} -> actual south-side lobby arrival (16,9)`);
  }
  await enter('futuro_piazza');await enter('futuro_sede');
  for(const id of ['futuro_scissione','futuro_rebrand','futuro_tesoreria'])await roundTrip(id);
  await page.screenshot({path:`artifacts/screens/world-navigation/${name}-futuro_sede.png`});await enter('futuro_piazza');await enter('diplomacy_lobby');
  assert.deepEqual(errors,[]);assert.deepEqual(core(await saved()),core(initial));assert.equal(rooms.length,10);assert.equal(returns.length,22);
  result.engines.push({engine:name,rooms,returns,finalPos:pos,resourcesUnchanged:true,errors});await context.close();
 }finally{await browser.close();}
}
mkdirSync('artifacts/reports',{recursive:true});writeFileSync('artifacts/reports/world-navigation-release.json',JSON.stringify(result,null,2)+'\n');
console.log('PASS compiled world navigation: both engines, 20 centred room views, 44 actual return ports, untouched earned save and resources');
