// Genera gli screenshot di copertina per il README (in docs/img/).
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:5179";
mkdirSync("docs/img", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { TitleScene } = await import("/src/scenes/TitleScene.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const out = {};

  // Titolo (a t=3s per uno slogan leggibile).
  {
    const c = document.createElement("canvas"); c.width=240; c.height=180;
    const s = new Screen(c), input = new Input(), stack = new SceneStack();
    const t = new TitleScene(stack, input); t.time = 3; stack.push(t);
    for (let i=0;i<3;i++){ stack.update(1/30); stack.draw(s); input.endFrame(); }
    out.title = c.toDataURL("image/png");
  }
  // Battaglia (starter vs rivale).
  {
    const c = document.createElement("canvas"); c.width=240; c.height=180;
    const s = new Screen(c), input = new Input(), stack = new SceneStack();
    const state = newGameState(); state.party.push(createMonster("giorgiagon", 24));
    const b = new BattleScene(stack, input, { state, foeTeam:[createMonster("renzilla",22)], onEnd(){} });
    stack.push(b);
    for (let g=0; g<400 && b.mode!=="menu"; g++){ if(g%4===0){document.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyZ",bubbles:true})); stack.update(1/30); stack.draw(s); input.endFrame(); document.dispatchEvent(new KeyboardEvent("keyup",{code:"KeyZ",bubbles:true}));} else {stack.update(1/30); stack.draw(s); input.endFrame();} }
    for (let i=0;i<5;i++){ stack.update(1/30); stack.draw(s); input.endFrame(); }
    out.battle = c.toDataURL("image/png");
  }
  return out;
});

function save(name, url){ writeFileSync(`docs/img/${name}.png`, Buffer.from(url.slice(22),"base64")); }
save("title", shots.title);
save("battle", shots.battle);
console.log("salvati docs/img/title.png, docs/img/battle.png");
await browser.close();
process.exit(0);
