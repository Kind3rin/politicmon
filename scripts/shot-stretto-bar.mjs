import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });
const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const canvas = document.createElement("canvas"); canvas.width=240; canvas.height=180;
  const screen = new Screen(canvas); const input = new Input();
  async function world(mapId, x, y) {
    const state = newGameState();
    state.flags["intro-done"]=true; state.flags["veh-traghetto"]=true; state.flags["ponte-beaten"]=true;
    state.party=[createMonster("giorgetta",24)]; state.badges=["auditel","spread","dazio"];
    state.pos={mapId,x,y,facing:"up"};
    const stack=new SceneStack(); stack.push(new WorldScene(stack,input,state));
    for(let i=0;i<30;i++){stack.update(1/30);stack.draw(screen);input.endFrame();await new Promise(r=>setTimeout(r,12));}
    return canvas.toDataURL("image/png");
  }
  return { stretto_bar: await world("stretto", 13, 5) };
});
writeFileSync("artifacts/screens/audit_stretto_bar.png", Buffer.from(shots.stretto_bar.slice("data:image/png;base64,".length),"base64"));
console.log("ok");
await browser.close();
