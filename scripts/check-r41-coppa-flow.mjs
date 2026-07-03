// Integrazione COPPA DELLE POLTRONE: boota la VERA WorldScene all'OFFSHORE
// post-garante, trova il BANDITORE, apre il torneo, paga la tassa e verifica
// che lo stato del torneo si crei e i fondi scendano. Exit 1 su fail.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2500);

const results = await page.evaluate(async () => {
  const out = [];
  const check = (ok, label, detail = "") => out.push({ ok, label, detail });

  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { COPPA_FEE } = await import("/src/game/tournament.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();

  const state = newGameState();
  state.flags["intro-done"] = true;
  state.flags["dex-received"] = true;
  state.flags["garante-beaten"] = true;
  state.badges = ["auditel", "spread", "dazio"];
  state.money = 9000;
  state.party = [createMonster("draghimon", 52), createMonster("mattarellux", 52)];
  state.pos = { mapId: "offshore", x: 18, y: 11, facing: "up" };
  const world = new WorldScene(stack, input, state);
  stack.push(world);
  const tick = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
  for (let i = 0; i < 6; i++) tick();

  // Il BANDITORE deve essere presente sulla mappa (post-garante).
  const npcs = world.npcs ?? [];
  const banditore = npcs.find((n) => n.id === "banditore-coppa");
  check(Boolean(banditore), "BANDITORE presente all'offshore post-garante", banditore && banditore.id);
  if (!banditore) return out;

  // Apri il torneo direttamente (l'interazione via input è fragile nei test).
  world.interactNpc(banditore);
  // Scorri la coda di dialogo del banditore col tasto A (KeyZ) fino al prompt
  // SÌ/NO (default SÌ) → paga la tassa e avvia il torneo.
  const press = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", bubbles: true }));
    tick();
    document.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyZ", bubbles: true }));
    tick();
  };
  const money0 = state.money;
  for (let i = 0; i < 40; i++) {
    press();
    if (state.money < money0) break; // tassa pagata -> torneo avviato
  }
  check(state.money === money0 - COPPA_FEE, "tassa COPPA_FEE dedotta all'iscrizione", `${money0}->${state.money}`);
  // Dopo il pagamento, deve esistere lo stato torneo (bracket) — campo privato.
  check(Boolean(world.coppa), "stato torneo creato dopo l'iscrizione", world.coppa && world.coppa.alive.length);

  return out;
});

let fails = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail !== "" ? ` (${r.detail})` : ""}`);
  if (!r.ok) fails += 1;
}
await browser.close();
if (fails > 0) { console.error(`check-r41-coppa-flow: ${fails} FAIL`); process.exit(1); }
console.log("check-r41-coppa-flow: OK");
