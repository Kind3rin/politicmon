import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem("politicmon-intro-seen", "1"));
  await page.goto(BASE, { waitUntil: "networkidle" });
  const result = await page.evaluate(async () => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const { newGameState } = await import("/src/game/state.ts");
    const { createMonster } = await import("/src/game/monster.ts");
    const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
    const { PvpBattleScene } = await import("/src/game/battle/PvpBattleScene.ts");
    const { TitleScene } = await import("/src/scenes/TitleScene.ts");
    const { serializeTeam } = await import("/src/net/duelproto.ts");
    const { BATTLE_BACKDROPS, battleBackdropForMap } = await import("/src/game/battle/backdrop.ts");
    const { drawBattleBackdrop } = await import("/src/game/battle/view.ts");
    const { preloadSprites, waitForSprites, spriteStatus } = await import("/src/engine/assets.ts");
    const entries = Object.values(BATTLE_BACKDROPS);
    preloadSprites(Object.fromEntries(entries.map((bg) => [bg.spriteId, bg.path])));
    await waitForSprites(entries.map((bg) => bg.spriteId), 5000);
    const screen = new Screen(document.createElement("canvas"));
    const input = new Input();
    const stack = new SceneStack();
    const shots = {};
    const capture = (name, scene) => {
      scene.draw(screen);
      shots[name] = screen.ctx.canvas.toDataURL("image/png");
    };
    for (const [name, mapId] of Object.entries({ prato: "route1", piazza: "borgo", studio: "gymtv", palazzo: "palazzo", costa: "stretto", neve: "oblast-meme", rete: "palazzo_feed", grotta: "grotta1", bar: "bar-borgo", casa: "home", palestra: "gymue", mercato: "market1", casino: "casino", laboratorio: "lab", archivio: "archivio", ufficio: "commissione", bunker: "bunker", offshore: "offshore", bruxelles: "bruxelles", campo: "campo_largo" })) {
      const state = newGameState();
      state.pos.mapId = mapId;
      state.party = [createMonster("giorgetta", 22)];
      const scene = new BattleScene(stack, input, { state, foeTeam: [createMonster("renzino", 20)], onEnd: () => {} });
      scene.queue = [];
      scene.mode = "menu";
      scene.introT = 1;
      scene.firstSeenBanner = 0;
      capture(name, scene);
      if (name === "rete") {
        const pvp = new PvpBattleScene(stack, input, {
          state, role: "host", peerId: "visual-test", opponentNick: "OSPITE",
          hostWire: serializeTeam(state.party), guestWire: serializeTeam([createMonster("renzino", 20)]), duelId: "visual-test", onEnd: () => {}
        });
        pvp.queue = []; pvp.mode = "menu"; pvp.introT = 1;
        const before = JSON.stringify(state);
        capture("pvp-rete", pvp);
        if (JSON.stringify(state) !== before) throw new Error("Il rendering PvP ha mutato il salvataggio");
      }
    }
    const title = new TitleScene(stack, input);
    await new Promise((resolve) => setTimeout(resolve, 300));
    capture("title", title);
    // Un asset mancante deve usare esattamente il prato, senza lasciare un campo vuoto.
    const missing = { ...battleBackdropForMap("borgo"), spriteId: "battle:missing-test", path: "ui/battle/absent-test.png" };
    drawBattleBackdrop(screen, missing);
    await waitForSprites([missing.spriteId], 1000);
    drawBattleBackdrop(screen, missing);
    const fallback = screen.ctx.canvas.toDataURL();
    drawBattleBackdrop(screen, BATTLE_BACKDROPS.prato);
    const fallbackMatches = fallback === screen.ctx.canvas.toDataURL();
    return { shots, fallbackMatches, statuses: Object.fromEntries(entries.map((bg) => [bg.spriteId, spriteStatus(bg.spriteId)])) };
  });
  assert.deepEqual(errors, [], "errori runtime");
  assert.ok(result.fallbackMatches, "fallback diverso dal prato originale");
  for (const [id, status] of Object.entries(result.statuses)) assert.equal(status, "ready", id);
  mkdirSync("artifacts/screens/battle-backdrops", { recursive: true });
  for (const [name, dataUrl] of Object.entries(result.shots)) {
    writeFileSync(`artifacts/screens/battle-backdrops/${name}.png`, Buffer.from(dataUrl.split(",")[1], "base64"));
  }
  console.log(`PASS: ${Object.keys(result.shots).length} scene, PVE/PVP, fallback e caricamento PNG.`);
} finally {
  await browser.close();
}
