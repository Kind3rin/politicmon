import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 5187;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"]
});

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Vite non pronto entro 30 secondi");
}

const checkpoints = [
  { id: "starter", mapId: "borgo", x: 21, y: 18, badges: [], flags: { "starter-chosen": true, "dex-received": true } },
  { id: "medaglia-1", mapId: "mediopoli", x: 7, y: 16, badges: ["auditel"], flags: {} },
  { id: "medaglia-2", mapId: "eurotown", x: 8, y: 13, badges: ["auditel", "spread"], flags: {} },
  { id: "medaglia-3", mapId: "capitale", x: 24, y: 8, badges: ["auditel", "spread", "dazio"], flags: {} },
  { id: "palazzo", mapId: "palazzo", x: 5, y: 3, badges: ["auditel", "spread", "dazio"], flags: { "boss-beaten": true } },
  { id: "garante", mapId: "colle", x: 5, y: 3, badges: ["auditel", "spread", "dazio"], flags: { "boss-beaten": true, "garante-beaten": true } }
];

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(BASE_URL, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.stack), undefined, { timeout: 30_000 });

  for (const checkpoint of checkpoints) {
    const result = await page.evaluate(async (data) => {
      const [{ WorldScene }, { newGameState }, { createMonster }] = await Promise.all([
        import("/src/game/world/WorldScene.ts"),
        import("/src/game/state.ts"),
        import("/src/game/monster.ts")
      ]);
      const stack = window.stack;
      while (stack.top) stack.pop();
      const state = newGameState();
      state.flags = { "intro-done": true, "starter-chosen": true, "dex-received": true, ...data.flags };
      state.badges = data.badges;
      state.party = [createMonster("giorgetta", Math.max(8, 8 + data.badges.length * 6))];
      state.pos = { mapId: data.mapId, x: data.x, y: data.y, facing: "down" };
      stack.push(new WorldScene(stack, window.__input, state));
      await new Promise((resolve) => setTimeout(resolve, 250));
      const canvas = document.querySelector("#game-canvas");
      const context = canvas?.getContext("2d");
      const pixels = context?.getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = false;
      if (pixels) for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 0) { visible = true; break; }
      return { mapId: state.pos.mapId, scene: stack.top?.constructor.name, visible };
    }, checkpoint);
    if (result.mapId !== checkpoint.mapId || result.scene !== "WorldScene" || !result.visible) {
      throw new Error(`${checkpoint.id}: render non valido ${JSON.stringify(result)}`);
    }
    console.log(`OK ${checkpoint.id} (${checkpoint.mapId})`);
  }
  if (errors.length) throw new Error(`Errori pagina: ${errors.join(" | ")}`);
  console.log(`Smoke campagna: ${checkpoints.length}/${checkpoints.length} checkpoint OK`);
} finally {
  await browser?.close();
  server.kill();
}
