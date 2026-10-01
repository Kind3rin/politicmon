import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,readdirSync} from 'node:fs';
const phase=process.env.WORLD_PHASE??'after';
const paths=readdirSync('public/sprites/chars').filter(p=>p.endsWith('.png')).map(p=>`chars/${p}`).concat(readdirSync('public/sprites/tiles').filter(p=>p.endsWith('.png')).map(p=>`tiles/${p}`));
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5179'}/scripts/perf-harness.html`,{waitUntil:'networkidle'});
 const result=await page.evaluate(async paths=>{
  const {Screen}=await import('/src/engine/screen.ts');const {SceneStack}=await import('/src/engine/scene.ts');
  const {MAPS}=await import('/src/data/maps.ts');const {TILES}=await import('/src/art/tiles.ts');
  const {newGameState}=await import('/src/game/state.ts');const {createMonster}=await import('/src/game/monster.ts');
  const {WorldScene}=await import('/src/game/world/WorldScene.ts');const {Input}=await import('/src/engine/input.ts');
  const {getSpriteImage,preloadSprites,waitForSprites,spriteStatus}=await import('/src/engine/assets.ts');const {audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  preloadSprites(Object.fromEntries(paths.map(p=>[`world-qa:${p}`,p])));await waitForSprites(paths.map(p=>`world-qa:${p}`),12000);
  const missing=paths.filter(p=>spriteStatus(`world-qa:${p}`)!=='ready');
  const facingNames=['south','north','east','west'];const charIds=['player','professor','guard','kid','journalist','boss','granny','rival','influencer','aide','barista'];
  const canonical={};for(const id of charIds)for(const dir of facingNames){
   const key=id==='player'?`player:${dir}`:`npc:${id}:${dir}`,stem=id==='player'?`player_${dir}`:`npc_${id}_${dir}`;
   canonical[key]=`chars/${stem}.png`;for(let f=0;f<4;f++)canonical[`${key}:w${f}`]=`chars/${stem}_w${f}.png`;
  }
  for(const id of ['auto','ruspa','monopattino'])for(const dir of facingNames)canonical[`veh:${id}:${dir}`]=`chars/${id}_${dir}.png`;canonical['veh:ferry']='chars/ferry.png';canonical['char:schettino']='chars/schettino.png';
  preloadSprites(canonical);await waitForSprites(Object.keys(canonical),8000);
  const canvas=document.createElement('canvas'),screen=new Screen(canvas),input=new Input(),shots={},positions={};
  for(const map of Object.values(MAPS)){
   const open=[];for(let y=0;y<map.tiles.length;y++)for(let x=0;x<map.tiles[y].length;x++){
    const tile=TILES[map.tiles[y][x]];if(tile&&!tile.solid&&!tile.water)open.push({x,y});
   }
   const aims=[{x:map.tiles[0].length/2,y:map.tiles.length/2},...map.npcs.slice(0,3).map(n=>({x:n.x,y:n.y+2})),...map.warps.slice(0,1).map(w=>({x:w.x,y:w.y+1}))];
   positions[map.id]=[];
   for(let i=0;i<aims.length;i++){
    const point=[...open].sort((a,b)=>Math.abs(a.x-aims[i].x)+Math.abs(a.y-aims[i].y)-Math.abs(b.x-aims[i].x)-Math.abs(b.y-aims[i].y))[0];
    if(!point)throw Error(`No land position: ${map.id}`);
    const state=newGameState();state.flags['intro-done']=true;state.flags['hint-casino']=true;state.flags['hint-offshore']=true;state.flags['hint-meme']=true;
    state.party=[createMonster('giorgetta',25)];state.badges=['auditel','spread','dazio'];state.pos={mapId:map.id,...point,facing:'down'};
    const stack=new SceneStack(),world=new WorldScene(stack,input,state);stack.push(world);world.msg.close();world.fadeT=0;world.banner=null;world.bannerFlash=0;
    world.draw(screen);await waitForSprites(paths.map(p=>`world-qa:${p}`),100);
    // Scene keys use the same images but are lazy on first draw.
    await new Promise(resolve=>setTimeout(resolve,50));world.draw(screen);
    shots[`${map.id}-${i}`]=canvas.toDataURL('image/png');positions[map.id].push(point);
   }
  }
  // Native directional idle/walk contact sheet. No scaling hides empty cells.
  const {playerImage,npcImage,vehicleImage}=await import('/src/art/characters.ts');
  const dirs=['down','up','right','left'];const rows=['player','professor','guard','kid','journalist','boss','granny','rival','influencer','aide','barista'];
  const characterIssues=[];
  for(const id of rows){
   screen.clear('#18243a');
   for(let pose=0;pose<5;pose++)for(let d=0;d<4;d++){
    const image=id==='player'?playerImage(dirs[d],pose===0?0:pose-1,pose>0):npcImage(id,dirs[d],pose===0?0:pose-1,pose>0);
    if(!image){characterIssues.push(`${id}-${dirs[d]}-${pose}: not decoded`);continue;}
    const b=screen.imageBounds(image);if(!b.w||!b.h)characterIssues.push(`${id}-${dirs[d]}-${pose}: empty`);
    screen.image(image,20+d*50,pose*34,32,32);
   }
   shots[`character-${id}`]=canvas.toDataURL('image/png');
  }
  for(const id of ['auto','ruspa','monopattino']){
   screen.clear('#18243a');for(let d=0;d<4;d++){
    const img=vehicleImage(id,dirs[d]);if(!img){characterIssues.push(`${id}-${dirs[d]}: missing`);continue;}
    const b=screen.imageBounds(img);if(!b.w||!b.h)characterIssues.push(`${id}-${dirs[d]}: empty`);
    const scale=30/Math.max(b.w,b.h);screen.imageSpriteCropped(img,20+d*50,50,{scaleX:scale,scaleY:scale});
   }shots[`vehicle-${id}`]=canvas.toDataURL('image/png');
  }
  return{shots,positions,missing,characterIssues,mapCount:Object.keys(MAPS).length,worldViews:Object.keys(shots).filter(name=>!name.startsWith('character-')&&!name.startsWith('vehicle-')).length};
 },paths);
 mkdirSync(`artifacts/screens/world-redesign/${phase}`,{recursive:true});mkdirSync('artifacts/world-redesign',{recursive:true});
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/world-redesign/${phase}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 writeFileSync(`artifacts/world-redesign/${phase}-coverage.json`,JSON.stringify({mapCount:result.mapCount,positions:result.positions,missing:result.missing,characterIssues:result.characterIssues},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(result.missing,[]);assert.deepEqual(result.characterIssues,[]);
 console.log(`PASS: ${result.mapCount} maps, ${result.worldViews} world views and 220 directional character poses decoded (${phase}).`);
}finally{await browser.close();}
