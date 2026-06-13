// Screenshot del mondo con un altro giocatore online visibile (presence).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:5179";
const browser = await chromium.launch();

async function boot(nick, x) {
  const page = await browser.newPage({ viewport: { width: 480, height: 720 } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.evaluate(async ({ nk, px }) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const { newGameState } = await import("/src/game/state.ts");
    const { createMonster } = await import("/src/game/monster.ts");
    const { WorldScene } = await import("/src/game/world/WorldScene.ts");
    const { mp } = await import("/src/net/mp.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    mp.setIdentity(nk, "player");
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    document.body.appendChild(canvas);
    canvas.id = "shotcanvas";
    canvas.style.cssText = "position:fixed;left:0;top:0;width:960px;height:720px;image-rendering:pixelated;z-index:9999";
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    const state = newGameState();
    state.flags["intro-done"] = true; state.flags["dex-received"] = true;
    state.party.push(createMonster("giorgetta", 10));
    state.pos = { mapId: "borgo", x: px, y: 10, facing: "down" };
    const world = new WorldScene(stack, input, state);
    stack.push(world);
    window.__tick = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
    for (let i = 0; i < 8; i++) window.__tick();
  }, { nk: nick, px: x });
  return page;
}

const A = await boot("ONOREVOLE", 14);
const B = await boot("COMPAGNO", 15); // accanto ad A

async function tick(n) {
  for (let i = 0; i < n; i++) {
    await A.evaluate(() => window.__tick());
    await B.evaluate(() => window.__tick());
    await new Promise((r) => setTimeout(r, 33));
  }
}
await tick(40);
// B manda un'emote e una chat per popolare l'overlay nella vista di A.
await B.evaluate(() => { window.__mp = window.__mp; });
await A.evaluate(() => {});
await B.evaluate(async () => {
  const { mp } = await import("/src/net/mp.ts");
  mp.sendEmote("!"); mp.sendChat("CIAO VICINO!");
});
await tick(20);

const buf = await A.locator("#shotcanvas").screenshot();
writeFileSync("artifacts/screens/mp_world.png", buf);
console.log("salvato mp_world.png");
await browser.close();
process.exit(0);
