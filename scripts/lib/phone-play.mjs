/** Play the real game on a phone with taps only. Positions are read from the live game state, never written. */
import {chromium} from 'playwright';

export async function openPhone(base,{width=375,height=812}={}){
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);
 const game={
  browser,page,errors,
  state:()=>page.evaluate(async()=>{
   const {getActiveState}=await import('/src/game/state.ts');const s=getActiveState();
   return s&&{pos:{...s.pos},party:s.party.map(m=>({id:m.speciesId,level:m.level,hp:m.hp})),steps:s.stepsTotal,flags:Object.keys(s.flags).filter(k=>s.flags[k]),money:s.money};
  }),
  newCampaign:async(difficulty='Normale')=>{
   await page.getByRole('button',{name:/Nuova campagna/}).tap();
   await page.getByRole('button',{name:new RegExp(difficulty)}).tap();
   await page.waitForFunction(()=>document.body.classList.contains('ui-world-open'),null,{timeout:8000});
   await page.waitForTimeout(800);
  },
  /** Tap the tile `dx,dy` away from the player. Only tiles on screen can be tapped. */
  tapTile:async(dx,dy)=>{
   const b=await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),p=JSON.parse(c.dataset.worldPlayerBounds);return {tile:p.w/240*r.width,x:r.left+(p.x+p.w/2)/240*r.width,y:r.top+(p.y+p.h)/p.viewHeight*r.height};});
   // Keep clear of the shortcuts at the top and of the stick and run toggle at the bottom: a tap there is not a tap on the map.
   const size=page.viewportSize();
   const x=Math.max(12,Math.min(size.width-12,b.x+dx*b.tile)),y=Math.max(130,Math.min(size.height-170,b.y-b.tile*.5+dy*b.tile));
   await page.touchscreen.tap(x,y);
  },
  /** Wait until the player stops moving. */
  settle:async(limit=4000)=>{
   let last=JSON.stringify((await game.state()).pos);
   for(let t=0;t<limit;t+=250){await page.waitForTimeout(250);const now=JSON.stringify((await game.state()).pos);if(now===last&&t>=500)return;last=now;}
  },
  /** Walk to a tile in hops of visible tiles. Returns whether it got there. */
  goTo:async(tx,ty,{hops=14}={})=>{
   for(let i=0;i<hops;i++){
    const s=await game.state();if(s.pos.x===tx&&s.pos.y===ty)return true;
    await game.tapTile(Math.max(-3,Math.min(3,tx-s.pos.x)),Math.max(-7,Math.min(7,ty-s.pos.y)));
    await game.settle();
    const after=await game.state();if(after.pos.mapId!==s.pos.mapId)return false;
   }
   const end=await game.state();return end.pos.x===tx&&end.pos.y===ty;
  },
  /** Hold the visible stick towards a direction for a while. */
  hold:async(dir,ms)=>{
   const stick=await page.locator('#touch-stick').boundingBox();
   const cx=stick.x+stick.width/2,cy=stick.y+stick.height/2,v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir];
   game.cdp??=await page.context().newCDPSession(page);
   await game.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy,id:0}]});
   for(let i=1;i<=5;i++){await game.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+v[0]*9*i,y:cy+v[1]*9*i,id:0}]});await page.waitForTimeout(30);}
   await page.waitForTimeout(ms);
   await game.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
  },
  /** Jump ahead for a review: edit the live save with a snippet (`state`, `createMonster`), reload and continue it. */
  jump:async code=>{
   await page.evaluate(async source=>{
    const {getActiveState,saveGame}=await import('/src/game/state.ts'),{createMonster}=await import('/src/game/monster.ts');
    const state=getActiveState();new Function('state','createMonster',source)(state,createMonster);saveGame(state);
   },code);
   await page.reload();
   await page.getByRole('button',{name:/Continua/}).first().tap();
   await page.getByRole('button',{name:/Campagna 1/}).first().tap();
   await page.waitForFunction(()=>document.body.classList.contains('ui-world-open'),null,{timeout:10000});
   await page.waitForTimeout(800);
  },
  shot:async name=>{await page.screenshot({path:`artifacts/m2/${name}.png`});},
  close:()=>browser.close()
 };
 return game;
}
