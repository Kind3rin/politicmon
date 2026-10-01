import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch();
try {
 const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
 await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "networkidle" });
 const result = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { BattleFx, drawBattleMonster } = await import("/src/game/battle/view.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { makeCombatant } = await import("/src/game/battle/sim.ts");
  const { TYPE_ORDER } = await import("/src/data/poltypes.ts");
  const { audio } = await import("/src/engine/audio.ts"); audio.enabled = false;
  const { preloadCoreSprites } = await import("/src/engine/preload.ts"); await preloadCoreSprites();
  const screen = new Screen(document.createElement("canvas")); const issues = []; const shots = {};
  const signature = () => { let h = 2166136261; for (const value of screen.ctx.getImageData(0, 0, screen.ctx.canvas.width, screen.ctx.canvas.height).data) h = Math.imul(h ^ value, 16777619); return h >>> 0; };
  let count = 0;
  for (const side of ["player", "foe"]) for (const type of TYPE_ORDER) {
    const signatures = [];
    for (const t of [.34, .21, .10]) {
      screen.clear("#efe6da"); const fx = new BattleFx(); fx.moveFx = { side, type, t }; fx.drawMoveFx(screen);
      signatures.push(signature()); count++;
      if (t === .21 && side === "player") shots[type] = screen.ctx.canvas.toDataURL("image/png");
    }
    if (new Set(signatures).size !== 3) issues.push(`${side}:${type} does not advance`);
  }
  const fx = new BattleFx(); fx.reduceEffects = true;
  fx.onHit("player", 2.2, true, 23, "DESTRA");
  if (fx.moveFx || fx.lungeT.player || fx.hitStop || fx.flashT.foe || fx.knockback.foe || fx.particles.length) issues.push("Reduced effects still moves/flashes");
  if (!fx.damageNumbers.length || !fx.effFx) issues.push("Reduced effects lost combat information");
  const c = makeCombatant(createMonster("giorgiagon", 30)); c.mon.status = "scandalo"; c.gaffeTurns = 3;
  const signatures = [];
  for (const time of [0, 2, 5]) { screen.clear("#efe6da"); fx.time = time; drawBattleMonster(screen, fx, c, 120, 132, .15, true, "player"); signatures.push(signature()); }
  if (new Set(signatures).size !== 1) issues.push("Reduced effects still animates monster/status");
  return { issues, shots, count };
 });
 assert.deepEqual(result.issues, []);
 mkdirSync("artifacts/screens/move-effects", { recursive: true });
 for (const [type, data] of Object.entries(result.shots)) writeFileSync(`artifacts/screens/move-effects/${type}.png`, Buffer.from(data.split(",")[1], "base64"));
 console.log(`PASS: ${result.count} effect frames, 8 types, both sides, reduced motion preserves damage information.`);
} finally { await browser.close(); }
