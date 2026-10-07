// Guardrail Round 39 GAMEPLAY (dev server :5179): e2e Playwright con UI reale.
// 1) equip hold item da BagScene -> battaglia -> effetto osservabile (danno ridotto dal GILET)
// 2) SPRAY ANTI-COMIZIO: niente incontri wild finché repellentSteps > 0 (anche con RNG forzata)
// 3) TESSERA RIMBORSO SPESE: teletrasporto al bar dell'ultima città (state.lastBar)
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(3500);

async function key(code, times = 1, gap = 160) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.down(code);
    await page.waitForTimeout(60);
    await page.keyboard.up(code);
    await page.waitForTimeout(gap);
  }
}

const results = [];
const check = (ok, label, detail = "") => results.push({ ok, label, detail });

// ---- Setup: mondo iniettato con borsa preparata ----
await page.evaluate(async () => {
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { Input } = await import("/src/engine/input.ts");
  const stack = window.stack;
  while (stack.scenes && stack.scenes.length) stack.pop();
  const state = newGameState();
  state.flags["intro-done"] = true;
  state.flags["starter-chosen"] = true;
  state.party = [createMonster("giorgetta", 20)];
  // Un item per fase: l'indice 0 della borsa è sempre quello da usare.
  state.bag = { gilet: 1 };
  state.lastBar = "borgo";
  // Trova una coppia di tile d'erba adiacenti (camminabili, senza NPC/pickup):
  // il test dello spray cammina avanti-indietro proprio lì.
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const map = MAPS.route2;
  const busy = new Set([
    ...map.npcs.map((n) => `${n.x},${n.y}`),
    ...map.pickups.map((p) => `${p.x},${p.y}`)
  ]);
  let spot = { x: 20, y: 15 };
  outer: for (let y = 1; y < map.tiles.length - 1; y++) {
    for (let x = 1; x < map.tiles[y].length - 2; x++) {
      const a = TILES[map.tiles[y][x]];
      const b = TILES[map.tiles[y][x + 1]];
      if (a?.encounter && b?.encounter && !a.solid && !b.solid &&
          !busy.has(`${x},${y}`) && !busy.has(`${x + 1},${y}`)) {
        spot = { x, y };
        break outer;
      }
    }
  }
  window.__spot = spot;
  state.pos = { mapId: "route2", x: spot.x, y: spot.y, facing: "down" };
  stack.push(new WorldScene(stack, window.__input ?? new Input(), state));
  window.__state = state;
});
await page.waitForTimeout(1200);

// ---- 1) Equip GILET dalla BORSA (UI reale: PauseScene -> BORSA -> mostro) ----
{
  // PauseScene + BagScene programmatiche (stesso percorso del menu pausa).
  await page.evaluate(async () => {
    const { PauseScene } = await import("/src/scenes/PauseScene.ts");
    const { BagScene } = await import("/src/scenes/BagScene.ts");
    const { Input } = await import("/src/engine/input.ts");
    const input = window.__input ?? new Input();
    window.stack.push(new PauseScene(window.stack, input, window.__state));
    window.stack.push(new BagScene(window.stack, input, window.__state, { inBattle: false }));
  });
  await page.waitForTimeout(400);
  await key("KeyZ"); // A sul GILET (unico item hold in borsa) -> PartyScene
  await page.waitForTimeout(300);
  await key("KeyZ"); // A sul primo mostro -> equip
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({
    held: window.__state.party[0].heldItem,
    bag: window.__state.bag["gilet"] ?? 0
  }));
  check(r.held === "gilet" && r.bag === 0, "equip: GILET equipaggiato da BagScene via UI", JSON.stringify(r));
  await key("KeyX", 3); // chiudi msg/borsa/pausa
  await page.waitForTimeout(300);
}

// ---- 1b) Effetto osservabile in battaglia: GILET -15% danno subito ----
{
  const r = await page.evaluate(async () => {
    const { makeCombatant, calcDamage } = await import("/src/game/battle/sim.ts");
    const { createMonster } = await import("/src/game/monster.ts");
    const { MOVES } = await import("/src/data/moves.ts");
    function mulberry32(seed) {
      let a = seed >>> 0;
      return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const atk = () => makeCombatant(createMonster("salvinott", 20));
    // Il MON del party (con GILET vero equipaggiato via UI) subisce meno danno
    // del gemello senza gilet, a parità di RNG.
    const naked = makeCombatant(createMonster("giorgetta", 20));
    const armored = makeCombatant(window.__state.party[0]);
    const dNaked = calcDamage(atk(), naked, MOVES.comizio, mulberry32(9)).damage;
    const dArmored = calcDamage(atk(), armored, MOVES.comizio, mulberry32(9)).damage;
    return { dNaked, dArmored };
  });
  check(r.dArmored < r.dNaked, "effetto: GILET riduce il danno del mon equipaggiato", JSON.stringify(r));
}

// ---- 2) SPRAY: 150 passi senza incontri wild (RNG incontri forzata a 1) ----
{
  await page.evaluate(() => { window.__state.bag = { spray: 1 }; });
  await page.evaluate(async () => {
    const { PauseScene } = await import("/src/scenes/PauseScene.ts");
    const { BagScene } = await import("/src/scenes/BagScene.ts");
    const { Input } = await import("/src/engine/input.ts");
    const input = window.__input ?? new Input();
    window.stack.push(new PauseScene(window.stack, input, window.__state));
    window.stack.push(new BagScene(window.stack, input, window.__state, { inBattle: false }));
  });
  await page.waitForTimeout(300);
  await key("KeyZ"); // A sullo SPRAY (unico item rimasto in borsa)
  await page.waitForTimeout(300);
  const afterUse = await page.evaluate(() => window.__state.repellentSteps);
  check(afterUse === 150, "spray: repellentSteps=150 dopo l'uso", `steps=${afterUse}`);
  await key("KeyZ", 2); // chiudi il messaggio
  await key("KeyX", 3); // chiudi borsa+pausa
  await page.waitForTimeout(300);
  // Difensivo: se qualche menu è rimasto aperto, torna al mondo.
  await page.evaluate(() => {
    const s = window.stack;
    while (s.scenes.length > 1 && String(s.top?.constructor?.name) !== "WorldScene") s.pop();
  });
  await page.waitForTimeout(300);
  // RNG forzata: qualsiasi passo su erba SENZA repellente scatenerebbe l'incontro.
  await page.evaluate(() => {
    window.__realRandom = Math.random;
    Math.random = () => 0.0001;
  });
  // Cammina avanti e indietro sulla coppia di tile d'erba trovata al setup.
  // NOTA: il primo tap in una direzione nuova GIRA soltanto: serve un secondo
  // tap per fare il passo (meccanica turn-then-move).
  for (let i = 0; i < 8; i++) {
    await key(i % 2 === 0 ? "ArrowRight" : "ArrowLeft", 2, 300);
  }
  const r = await page.evaluate(() => ({
    steps: window.__state.repellentSteps,
    inBattle: String(window.stack.top?.constructor?.name ?? "")
  }));
  check(
    r.steps < 150 && r.steps > 120 && !r.inBattle.includes("Battle"),
    "spray: passi scalati e NESSUNA battaglia wild con repellente attivo",
    JSON.stringify(r)
  );
  // Contro-prova: repellente esaurito -> il primo passo su erba apre la battaglia.
  await page.evaluate(() => { window.__state.repellentSteps = 1; });
  let battleStarted = false;
  for (let i = 0; i < 8 && !battleStarted; i++) {
    await key(i % 2 === 0 ? "ArrowRight" : "ArrowLeft", 2, 320);
    // il messaggio "SPRAY SVANITO" può bloccare il primo passo: chiudilo
    await key("KeyZ", 1, 150);
    battleStarted = await page.evaluate(() => String(window.stack.top?.constructor?.name ?? "").includes("Battle"));
  }
  check(battleStarted, "spray: senza repellente l'incontro wild riparte (RNG forzata)", "");
  await page.evaluate(() => { Math.random = window.__realRandom; });
  // Esci dalla battaglia ripristinando il mondo (stato di test, non serve la fuga).
  await page.evaluate(async () => {
    const { WorldScene } = await import("/src/game/world/WorldScene.ts");
    const { Input } = await import("/src/engine/input.ts");
    const stack = window.stack;
    while (stack.scenes && stack.scenes.length) stack.pop();
    window.__state.pos = { mapId: "route2", x: window.__spot.x, y: window.__spot.y, facing: "down" };
    stack.push(new WorldScene(stack, window.__input ?? new Input(), window.__state));
  });
  await page.waitForTimeout(600);
}

// ---- 3) TESSERA RIMBORSO SPESE: teletrasporto al bar di lastBar ----
{
  await page.evaluate(() => { window.__state.bag = { rimborso: 1 }; });
  await page.evaluate(async () => {
    const { PauseScene } = await import("/src/scenes/PauseScene.ts");
    const { BagScene } = await import("/src/scenes/BagScene.ts");
    const { Input } = await import("/src/engine/input.ts");
    const input = window.__input ?? new Input();
    window.stack.push(new PauseScene(window.stack, input, window.__state));
    window.stack.push(new BagScene(window.stack, input, window.__state, { inBattle: false }));
  });
  await page.waitForTimeout(300);
  await key("KeyZ"); // A sulla TESSERA (unico item in borsa) -> teleport + doppio pop
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({
    mapId: window.__state.pos.mapId,
    top: String(window.stack.top?.constructor?.name ?? ""),
    bag: window.__state.bag["rimborso"] ?? 0
  }));
  check(
    r.mapId === "borgo" && r.top === "WorldScene" && r.bag === 0,
    "tessera: teletrasporto a lastBar (borgo) e menu chiusi",
    JSON.stringify(r)
  );
}

await browser.close();
let failures = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail ? ` (${r.detail})` : ""}`);
  if (!r.ok) failures += 1;
}
if (failures > 0) {
  console.error(`check-r39-gameplay: ${failures} verifiche FALLITE`);
  process.exit(1);
}
console.log("check-r39-gameplay: OK");
process.exit(0);
