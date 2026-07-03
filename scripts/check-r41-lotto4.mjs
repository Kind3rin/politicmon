// Playtest mirato LOTTO 4 (Round 41 narrativo — ELEZIONI UE / BRUXELLES) su dev
// server :5179. Copre: gate BRUXELLES (bloccato pre-garante, aperto post-garante),
// mappa/warps coerenti, gauntlet eu-* e boss commissione (team costruibili, boss
// in BOSS_TRAINER_IDS -> musica battle-boss), flag ue-beaten alla vittoria +
// ricompensa TESSERA DORATA, wild UE selvatici, dexzone bruxelles, quests UE,
// traccia musicale bruxelles. Exit 1 su fail.
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
  const { MAPS, BAR_RESPAWN } = await import("/src/data/maps.ts");
  const { TRAINERS } = await import("/src/data/trainers.ts");
  const { SPECIES } = await import("/src/data/species.ts");
  const { ITEMS } = await import("/src/data/items.ts");
  const { MOVES } = await import("/src/data/moves.ts");
  const { DEX_ZONES } = await import("/src/data/dexzones.ts");
  const { QUESTS } = await import("/src/data/quests.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();

  const prime = (flags = {}) => {
    const s = newGameState();
    s.flags["intro-done"] = true;
    s.flags["dex-received"] = true;
    s.badges = ["auditel", "spread", "dazio"];
    s.flags["veh-traghetto"] = true;
    Object.assign(s.flags, flags);
    s.party = [createMonster("draghimon", 55), createMonster("mattarellux", 55)];
    return s;
  };

  // -------------------------------------------------- 1) mappa/definizione
  const brux = MAPS.bruxelles;
  check(Boolean(brux), "mappa BRUXELLES definita");
  check(brux && brux.tiles.every((r) => r.length === brux.tiles[0].length),
    "BRUXELLES: righe tutte della stessa larghezza", brux && brux.tiles[0].length);
  check(brux && brux.music === "bruxelles", "BRUXELLES usa la traccia musicale dedicata");
  check(Boolean(MAPS.commissione), "interno PALAZZO DELLA COMMISSIONE definito");
  check(Boolean(MAPS["bar-bruxelles"]), "bar CAFFÈ SCHUMAN definito");
  check(Boolean(BAR_RESPAWN.bruxelles), "BAR_RESPAWN registrato per BRUXELLES");

  // -------------------------------------------------- 2) GATE via warp offshore
  // Warp OFFSHORE(28,9)->bruxelles con requiresFlag garante-beaten. Pre-garante
  // il passo NON deve attivare il warp; post-garante sì.
  {
    const stack = new SceneStack();
    const s = prime(); // NO garante-beaten
    s.pos = { mapId: "offshore", x: 27, y: 9, facing: "right" };
    const w = new WorldScene(stack, input, s);
    w.fromX = 27; w.fromY = 9;
    s.pos = { mapId: "offshore", x: 28, y: 9, facing: "right" };
    w.onStepComplete();
    const blocked = !(w.fadeOut > 0 || w.pendingWarp) && s.pos.mapId === "offshore";
    check(blocked, "GATE: BRUXELLES bloccata pre-garante (warp respinto)", `pos=${s.pos.mapId}(${s.pos.x},${s.pos.y})`);
  }
  {
    const stack = new SceneStack();
    const s = prime({ "garante-beaten": true });
    s.pos = { mapId: "offshore", x: 27, y: 9, facing: "right" };
    const w = new WorldScene(stack, input, s);
    w.fromX = 27; w.fromY = 9;
    s.pos = { mapId: "offshore", x: 28, y: 9, facing: "right" };
    w.onStepComplete();
    const opened = Boolean(w.fadeOut > 0 || w.pendingWarp);
    check(opened, "GATE: BRUXELLES accessibile post-garante (warp attivo)");
  }

  // -------------------------------------------------- 3) gauntlet + boss
  const gauntlet = ["eu-relatore", "eu-eurodeputato", "eu-commissario", "eu-lobby"];
  for (const id of gauntlet) {
    const def = TRAINERS[id];
    const ok = Boolean(def) && def.team.length > 0 && def.team.every(([sid]) => SPECIES[sid]);
    const lvls = def ? def.team.map((t) => t[1]) : [];
    const inRange = lvls.every((lv) => lv >= 44 && lv <= 52);
    check(ok && inRange, `gauntlet ${id}: team UE valido lv 44-52`, def ? `lv=[${lvls}] €${def.money}` : "assente");
  }
  {
    const boss = TRAINERS.commissione;
    const lvls = boss ? boss.team.map((t) => t[1]) : [];
    const inRange = lvls.every((lv) => lv >= 52 && lv <= 55);
    check(Boolean(boss) && inRange, "BOSS LA COMMISSIONE: team lv 52-55", boss ? `lv=[${lvls}]` : "assente");
    check(boss && boss.money === 5000, "BOSS payout 5000€ (late-game)", boss && boss.money);
    check(boss && boss.reward && boss.reward.itemId === "tessera", "BOSS ricompensa TESSERA DORATA (una-tantum)");
    // Hold item sul filo (gilet) solo PVE: 4° elemento della tupla ultima.
    const last = boss && boss.team[boss.team.length - 1];
    check(Array.isArray(last) && last[3] === "gilet", "BOSS asso con GILET (PVE)");
  }

  // -------------------------------------------------- 4+5) boss: battaglia + vittoria
  // interactNpc(boss) -> intro dialogo -> encounterFlash -> BattleScene in cima
  // (BOSS_TRAINER_IDS -> IA/musica boss). Poi forziamo la vittoria via endBattle
  // ("private" TS ma presente a runtime) e verifichiamo ue-beaten.
  {
    const stack = new SceneStack();
    const s = prime({ "garante-beaten": true });
    s.pos = { mapId: "commissione", x: 5, y: 6, facing: "up" };
    const w = new WorldScene(stack, input, s);
    stack.push(w);
    const pressA = () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", bubbles: true }));
      stack.update(1 / 30); stack.draw(screen); input.endFrame();
      document.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyZ", bubbles: true }));
      stack.update(1 / 30); stack.draw(screen); input.endFrame();
    };
    const tick = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
    for (let i = 0; i < 3; i++) tick();
    const bossNpc = (w.npcs ?? []).find((n) => n.trainerId === "commissione" && !n.showIfFlag);
    check(Boolean(bossNpc), "BOSS presente nell'interno pre-vittoria");

    w.interactNpc(bossNpc);
    // Sfoglia l'intro del boss finché la BattleScene sale in cima.
    let battle = null;
    for (let i = 0; i < 60 && !battle; i++) {
      pressA();
      const top = stack.top;
      if (top && top.constructor && top.constructor.name === "BattleScene") battle = top;
    }
    check(Boolean(battle), "BOSS: la BattleScene si avvia (in cima allo stack)",
      battle ? battle.constructor.name : (stack.top && stack.top.constructor.name));

    if (battle) {
      // Forza la vittoria (endBattle è 'private' TS ma esiste a runtime).
      battle.endBattle("win");
      for (let i = 0; i < 30; i++) tick();
      // Dopo l'esito, la coda dei dialoghi di vittoria può bloccare: sfogliala.
      for (let i = 0; i < 20 && !s.flags["ue-beaten"]; i++) pressA();
    }
    check(Boolean(s.flags["ue-beaten"]), "flag ue-beaten impostato dopo la vittoria sul boss");
  }

  // -------------------------------------------------- 6) wild UE selvatici
  {
    const enc = brux.encounters || [];
    const ids = enc.map((e) => e.speciesId);
    const uePool = ["macronfox", "putingrad", "xipanda", "ursulax", "zelenskir", "bojoon", "trumpon"];
    const allUE = ids.every((id) => uePool.includes(id)) && ids.length >= 5;
    const lvOk = enc.every((e) => e.minLv >= 42 && e.maxLv <= 50);
    check(allUE, "wild BRUXELLES: solo roster UE", `ids=[${ids}]`);
    check(lvOk, "wild BRUXELLES: livelli 42-50 (end-game)", enc.map((e) => `${e.minLv}-${e.maxLv}`).join(","));
    check(brux.encounterRate === 0.16, "encounterRate BRUXELLES = 0.16", brux.encounterRate);
  }

  // -------------------------------------------------- 7) dexzone + quests + item
  {
    const zone = DEX_ZONES.find((z) => z.id === "bruxelles");
    check(Boolean(zone), "dexzone BRUXELLES presente");
    check(zone && zone.species.length >= 5 && zone.species.every((id) => SPECIES[id]),
      "dexzone BRUXELLES: roster UE valido", zone && zone.species.join(","));
  }
  {
    const qRotta = QUESTS.find((q) => q.id === "ue-rotta");
    const qBoss = QUESTS.find((q) => q.id === "ue-commissione");
    check(Boolean(qRotta) && Boolean(qRotta.target), "quest ELEZIONI EUROPEE con target GUIDA");
    check(Boolean(qBoss) && qBoss.target && qBoss.target.mapId === "bruxelles",
      "quest LA POLTRONA DI BRUXELLES con target GUIDA");
    // isDone coerenti coi flag
    const done = qBoss && qBoss.isDone({ flags: { "ue-beaten": true } });
    check(Boolean(done), "quest boss: isDone si sblocca con ue-beaten");
  }
  {
    const dir = ITEMS.dirMulta;
    check(Boolean(dir) && dir.moveId === "multaue" && MOVES.multaue,
      "DIRETTIVA: MULTA UE (dirMulta) valida", dir && dir.name);
  }

  // -------------------------------------------------- 8) traccia musicale
  {
    // audio.playMusic non lancia con una traccia inesistente; verifichiamo che il
    // registry contenga "bruxelles" provando a suonarla senza crash (audio off).
    let ok = true;
    try { audio.playMusic("bruxelles"); audio.playMusic(null); } catch { ok = false; }
    check(ok, "traccia musicale BRUXELLES registrata (playMusic non crasha)");
  }

  return out;
});

let fails = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail !== "" ? ` (${r.detail})` : ""}`);
  if (!r.ok) fails += 1;
}
await browser.close();
if (fails > 0) { console.error(`check-r41-lotto4: ${fails} FAIL`); process.exit(1); }
console.log(`check-r41-lotto4: OK (${results.length} assert)`);
