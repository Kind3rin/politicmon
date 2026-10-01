import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch();
try {
 const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
 const base = process.env.BASE_URL ?? "http://127.0.0.1:5179";
 await page.goto(`${base}/scripts/perf-harness.html`, { waitUntil: "networkidle" });
 const result = await page.evaluate(async () => {
  const { ANIMATED_MONSTERS, monsterFramesImage } = await import("/src/art/monsterFrames.ts");
  const { preloadSprites, waitForSprites, spriteStatus } = await import("/src/engine/assets.ts");
  const { BattleFx, drawBattleMonster } = await import("/src/game/battle/view.ts");
  const { makeCombatant } = await import("/src/game/battle/sim.ts");
  const { Screen } = await import("/src/engine/screen.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { PvpBattleScene } = await import("/src/game/battle/PvpBattleScene.ts");
  const { serializeTeam } = await import("/src/net/duelproto.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { audio } = await import("/src/engine/audio.ts"); audio.enabled = false;
  const ids = [...ANIMATED_MONSTERS];
  const entries = Object.fromEntries(ids.map((id) => [`mon:frames:${id}`, `monsters/animated/${id}.png`]));
  Object.assign(entries, Object.fromEntries(ids.map((id) => [`mon:${id}`, `monsters/${id}.png`])));
  entries["battle:bg:piazza"]="ui/battle/piazza.png";
  preloadSprites(entries); await waitForSprites(Object.keys(entries), 5000);
  const issues = []; const sheets = {}; const shots = {}; const screen = new Screen(document.createElement("canvas"));
  const hash = () => { let h = 2166136261; for (const value of screen.ctx.getImageData(0, 0, screen.ctx.canvas.width, screen.ctx.canvas.height).data) h = Math.imul(h ^ value, 16777619); return h >>> 0; };
  const cols = 8, rows = Math.ceil(ids.length / cols), cell = 96;
  for (const [name, time, lunge] of [["idle",0,0],["blink",4.05,0],["anticipation",0,.29],["attack",0,.15],["recovery",0,.03]]) {
    const canvas = document.createElement("canvas"); canvas.width = cols*cell; canvas.height = rows*cell;
    const ctx=canvas.getContext("2d"); ctx.fillStyle="#efe6da";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
    const signatures = [];
    for (const [i,id] of ids.entries()) {
      const fx=new BattleFx();fx.time=time;screen.clear("#efe6da");
      drawBattleMonster(screen,fx,makeCombatant(createMonster(id,30)),120,132,lunge,false,"player");
      signatures.push(hash());
      const scale=screen.ctx.canvas.width/240;
      ctx.drawImage(screen.ctx.canvas,78*scale,70*scale,84*scale,68*scale,(i%cols)*cell,Math.floor(i/cols)*cell,cell,80);
      ctx.fillStyle="#17243d";ctx.font="10px monospace";ctx.fillText(id,(i%cols)*cell+3,Math.floor(i/cols)*cell+92);
    }
    sheets[name]=canvas.toDataURL("image/png");shots[name]=signatures;
  }
  for (const [i,id] of ids.entries()) {
    if (spriteStatus(`mon:frames:${id}`)!=="ready") issues.push(`missing:${id}`);
    const image = monsterFramesImage(id);
    if (!image) { issues.push(`invalid-sheet:${id}`); continue; }
    const cell = document.createElement("canvas");cell.width=64;cell.height=64;const ctx=cell.getContext("2d");
    const frameSignatures=[];
    for (let frame=0;frame<4;frame++) {
      ctx.clearRect(0,0,64,64);ctx.drawImage(image,frame*64,0,64,64,0,0,64,64);
      const pixels=ctx.getImageData(0,0,64,64).data;let ink=0,signature=2166136261;
      for(let p=0;p<pixels.length;p+=4) {
        for(let c=0;c<4;c++)signature=Math.imul(signature^pixels[p+c],16777619);
        if(pixels[p+3]) {
          ink++;const x=(p/4)%64,y=Math.floor(p/4/64);
          if(x<5||x>58||y<6||y>57)issues.push(`unaligned:${id}:${frame}`);
        }
      }
      if(!ink)issues.push(`empty:${id}:${frame}`);
      frameSignatures.push(signature);
    }
    if(new Set(frameSignatures).size!==4)issues.push(`duplicate-pose:${id}`);
    if (shots.idle[i]===shots.blink[i] || shots.idle[i]===shots.attack[i] || shots.attack[i]===shots.anticipation[i]) issues.push(`static:${id}`);
  }
  const state=newGameState();state.party=[createMonster("giorgetta",22)];state.pos.mapId="borgo";
  const input={wasPressed:()=>false,isDown:()=>false,consumeTap:()=>null}; const stack=new SceneStack();
  const battle=new BattleScene(stack,input,{state,foeTeam:[createMonster("renzino",20)],onEnd:()=>{}});
  battle.queue=[];battle.mode="menu";battle.introT=1.2;battle.firstSeenBanner=0;
  battle.draw(screen);sheets["battle-idle"]=screen.ctx.canvas.toDataURL("image/png");
  battle.fx.lungeT.player=.15; battle.fx.moveFx={side:"player",type:"DESTRA",t:.2};
  battle.draw(screen);sheets["battle-attack"]=screen.ctx.canvas.toDataURL("image/png");
  state.battleSpeed = 2;
  const speedBefore = JSON.stringify(state);
  const pvp = new PvpBattleScene(stack,input,{state,role:"host",peerId:"test",opponentNick:"RIVALE",hostWire:serializeTeam(state.party),guestWire:serializeTeam([createMonster("renzino",20)]),duelId:"animation-test",onEnd:()=>{}});
  pvp.queue=[];pvp.mode="wait";pvp.introT=1.2;
  const timeout=pvp.waitTimer;pvp.update(.25);
  if (Math.abs(pvp.waitTimer-(timeout-.25)) > .000001) issues.push("Rapid presentation accelerated PvP timeout");
  if (Math.abs(pvp.fx.time-.5) > .000001) issues.push("Rapid presentation did not accelerate cosmetics");
  if (JSON.stringify(state)!==speedBefore) issues.push("PvP presentation changed persistent state");
  pvp.mode="menu";pvp.draw(screen);sheets["duel-idle"]=screen.ctx.canvas.toDataURL("image/png");
  pvp.fx.lungeT.player=.15;pvp.fx.moveFx={side:"player",type:"DESTRA",t:.2};
  pvp.draw(screen);sheets["duel-attack"]=screen.ctx.canvas.toDataURL("image/png");
  return { issues, sheets, species:ids.length };
 });
 assert.deepEqual(result.issues,[]);
 mkdirSync("artifacts/screens/monster-frames",{recursive:true});
 for (const [name,data] of Object.entries(result.sheets)) writeFileSync(`artifacts/screens/monster-frames/${name}.png`,Buffer.from(data.split(",")[1],"base64"));
 // Un'animazione mancante deve tornare al PNG statico, senza sprite vuoti.
 const fallback = await browser.newPage();
 await fallback.route("**/sprites/monsters/animated/giorgetta.png*",route=>route.fulfill({status:404,body:"missing"}));
 await fallback.goto(`${base}/scripts/perf-harness.html`);
 const evidence = await fallback.evaluate(async()=>{
   const {preloadSprites,waitForSprites,spriteStatus}=await import("/src/engine/assets.ts");
   const {BattleFx,drawBattleMonster}=await import("/src/game/battle/view.ts");
   const {Screen}=await import("/src/engine/screen.ts");
   const {makeCombatant}=await import("/src/game/battle/sim.ts");
   const {createMonster}=await import("/src/game/monster.ts");
   preloadSprites({"mon:frames:giorgetta":"monsters/animated/giorgetta.png","mon:giorgetta":"monsters/giorgetta.png"});
   await waitForSprites(["mon:frames:giorgetta","mon:giorgetta"]);
   const screen=new Screen(document.createElement("canvas"));screen.clear("#efe6da");
   const before=screen.ctx.canvas.toDataURL();drawBattleMonster(screen,new BattleFx(),makeCombatant(createMonster("giorgetta",20)),120,132,0,false,"player");
   return {missing:spriteStatus("mon:frames:giorgetta")==="missing",visible:before!==screen.ctx.canvas.toDataURL()};
 });
 assert.deepEqual(evidence,{missing:true,visible:true});
 console.log(`PASS: ${result.species} characters × 5 animation samples; PvE/PvP renderers, rapid timeout, save isolation and missing-sheet fallback.`);
} finally { await browser.close(); }
