import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const assets = JSON.parse(readFileSync('scripts/higgsfield-monster-fallbacks.json','utf8')).assets;
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(assets.length,62);
for (const asset of assets) {
 assert.equal(hash(asset.path),asset.sha256,asset.path);
 assert.equal(hash(asset.parentPath),asset.parentSha256,asset.parentPath);
 assert.ok(asset.jobId,`missing provenance: ${asset.path}`);
}
const browser = await chromium.launch();
try {
 const page = await browser.newPage({viewport:{width:960,height:720}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/sprites/monsters/animated/*.png*',route=>route.fulfill({status:404,body:'missing animation'}));
 await page.goto(`${process.env.BASE_URL ?? 'http://127.0.0.1:5179'}/scripts/perf-harness.html`);
 const result = await page.evaluate(async assets=>{
  const {preloadSprites,waitForSprites,spriteStatus}=await import('/src/engine/assets.ts');
  const {drawMonsterSprite}=await import('/src/art/monsters.ts');
  const {BattleFx,drawBattleMonster}=await import('/src/game/battle/view.ts');
  const {makeCombatant}=await import('/src/game/battle/sim.ts');
  const {createMonster}=await import('/src/game/monster.ts');
  const {Screen}=await import('/src/engine/screen.ts');
  const entries=Object.fromEntries(assets.map(a=>[`mon:${a.id}${a.pose?'_action':''}`,a.path.replace('public/sprites/','')]));
  const ids=assets.filter(a=>!a.pose).map(a=>a.id);
  Object.assign(entries,Object.fromEntries(ids.map(id=>[`mon:frames:${id}`,`monsters/animated/${id}.png`])));
  preloadSprites(entries);await waitForSprites(Object.keys(entries),10000);
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  check(ids.every(id=>spriteStatus(`mon:frames:${id}`)==='missing'),'animation failure not simulated');
  check(assets.every(a=>spriteStatus(`mon:${a.id}${a.pose?'_action':''}`)==='ready'),'fallback not decoded');
  const screen=new Screen(document.createElement('canvas')), sheets={};
  const rendered=[];
  for(const method of ['imageSprite','imageSpriteCropped']){
   const original=screen[method].bind(screen);
   screen[method]=(image,...args)=>{rendered.push(new URL(image.src).pathname);original(image,...args);};
  }
  for(const mode of ['portrait','battle']){
   const list=mode==='portrait'?assets.filter(a=>!a.pose):assets;
   const sheet=document.createElement('canvas');sheet.width=800;sheet.height=Math.ceil(list.length/8)*100;
   const ctx=sheet.getContext('2d');ctx.fillStyle='#18243a';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.imageSmoothingEnabled=false;
   for(const [i,asset] of list.entries()){
    screen.clear('#18243a');rendered.length=0;
    if(mode==='portrait')drawMonsterSprite(screen,asset.id,88,66,64,64);
    else drawBattleMonster(screen,new BattleFx(),makeCombatant(createMonster(asset.id,30)),120,132,asset.pose?.15:0,false,'player');
    check(rendered.includes('/'+asset.path.replace('public/','')),`wrong ${mode} fallback: ${asset.path}: ${rendered}`);
    const scale=screen.ctx.canvas.width/240;
    ctx.drawImage(screen.ctx.canvas,76*scale,62*scale,88*scale,74*scale,(i%8)*100,Math.floor(i/8)*100,100,84);
    ctx.fillStyle='#f4efe3';ctx.font='10px monospace';ctx.fillText(asset.id+(asset.pose?' *':''),(i%8)*100+2,Math.floor(i/8)*100+97);
   }
   sheets[mode]=sheet.toDataURL('image/png');
  }
  return {sheets,portraits:ids.length,battle:assets.length};
 },assets);
 assert.deepEqual(errors,[]);
 mkdirSync('artifacts/screens/native-fallbacks',{recursive:true});
 for(const [name,data] of Object.entries(result.sheets))writeFileSync(`artifacts/screens/native-fallbacks/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS: source provenance, all animations forced HTTP 404, ${result.portraits} portraits and ${result.battle} battle poses render the new static PNGs.`);
} finally {await browser.close();}
