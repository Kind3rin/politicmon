import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem("politicmon-intro-seen", "1"));
  await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "networkidle" });
  const result = await page.evaluate(async () => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const { newGameState, parseGameState, saveGame, loadGame } = await import("/src/game/state.ts");
    const { createMonster } = await import("/src/game/monster.ts");
    const { CivicScene } = await import("/src/scenes/CivicScene.ts");
    const { MoraleScene } = await import("/src/scenes/MoraleScene.ts");
    const { Atto3EndingScene } = await import("/src/scenes/Atto3EndingScene.ts");
    const { WeeklyCampaignScene } = await import("/src/scenes/WeeklyCampaignScene.ts");
    const { WorldScene } = await import("/src/game/world/WorldScene.ts");
    const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
    const { ShopScene } = await import("/src/scenes/ShopScene.ts");
    const { MafiaScene } = await import("/src/scenes/MafiaScene.ts");
    const { PhotoChoiceScene } = await import("/src/scenes/PhotoChoiceScene.ts");
    const { addAlly } = await import("/src/game/coalition.ts");
    const { expYield } = await import("/src/game/monster.ts");
    const { CIVIC_EVENTS, CIVIC_NPCS } = await import("/src/data/civicEvents.ts");
    const { CLASSIC_MEME_EVENTS } = await import("/src/data/meme-events/classics.ts");
    const { MAPS } = await import("/src/data/maps.ts");
    const { TRAINERS } = await import("/src/data/trainers.ts");
    const { resolveCivicChoice, civicNpcReply } = await import("/src/game/civicChoices.ts");
    const { keepPromise } = await import("/src/game/morale.ts");
    const { weeklySchedule } = await import("/src/game/weeklyCampaign.ts");
    const { calculateElectionResult, newElectionState } = await import("/src/game/election.ts");
    const { preloadSprites, waitForSprites, spriteStatus } = await import("/src/engine/assets.ts");
    const entries = Object.fromEntries([...new Set(Object.values(CIVIC_EVENTS).map(event => event.art))].map((art) => [`civic:${art}`, `ui/civic/${art}.png`]));
    preloadSprites(entries); await waitForSprites(Object.keys(entries), 5000);
    const screen = new Screen(document.createElement("canvas"));
    const input = new Input(); let pressed = "";
    input.wasPressed = (button) => pressed === button;
    input.tapInRect = () => false;
    const stack = new SceneStack(); const shots = {}; const issues = [];
    let name = ""; let textRects = [];
    const originalText = screen.text.bind(screen);
    screen.text = (value, x, y, color, scale = 1) => {
      const m = screen.ctx.getTransform(); const base = screen.ctx.canvas.width / 240;
      const rect = { value, x: (m.a * x + m.e) / base, y: (m.d * y + m.f) / base, w: Math.max(0, value.length * 6 - 1) * scale * m.a / base, h: 7 * scale * m.d / base };
      if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > 240 || rect.y + rect.h > 180) issues.push({ name, kind: "bounds", ...rect });
      for (const old of textRects) if (rect.x < old.x + old.w && rect.x + rect.w > old.x && rect.y < old.y + old.h && rect.y + rect.h > old.y) issues.push({ name, kind: "overlap", value, other: old.value });
      textRects.push(rect); originalText(value, x, y, color, scale);
    };
    const capture = (key, scene) => { name = key; textRects = []; scene.draw(screen); shots[key] = screen.ctx.canvas.toDataURL("image/png"); };
    const press = (scene, button) => { pressed = button; scene.update(.2); pressed = ""; };
    const drain = (scene) => { let loops = 0; while (scene.msg.isOpen && loops++ < 60) { scene.update(10); press(scene, "a"); } if (scene.msg.isOpen) throw new Error("Dialogo non si chiude"); };
    const state = newGameState(); state.party = [createMonster("giorgetta", 20)]; state.money = 1000;
    for (const event of Object.values(CIVIC_EVENTS)) capture(event.id, new CivicScene(stack, input, state, event));
    // La coesione deve entrare nel premio PVE effettivo, non soltanto nella UI.
    for (const [cohesion, multiplier] of [[70, 1.08], [29, .92]]) {
      const battleState = newGameState(); battleState.party = [createMonster("giorgetta", 20)]; battleState.morale.cohesion = cohesion;
      const foe = createMonster("renzino", 20);
      const battle = new BattleScene(stack, input, { state: battleState, foeTeam: [foe], onEnd: () => {} });
      const steps = battle.foeFaintedSteps();
      const expected = Math.floor(expYield(foe, false, battleState.party[0].level) * multiplier);
      if (!steps.some((step) => step.text?.includes(`guadagna ${expected} PUNTI`))) throw new Error("Coesione non applicata al premio PVE");
    }
    const socialState = newGameState(); socialState.party = [createMonster("giorgetta", 20)]; socialState.money = 5000;
    socialState.morale.trust = 80; socialState.sondaggi = 80;
    capture("negozio-fiducia", new ShopScene(stack, input, socialState));
    const mafia = new MafiaScene(stack, input, socialState);
    capture("favore-anteprima", mafia); press(mafia, "down"); press(mafia, "a");
    const beforeFavour = JSON.stringify(socialState);
    for (let i = 0; mafia.pending && i < 30; i++) press(mafia, "a");
    if (mafia.pending || beforeFavour === JSON.stringify(socialState)) throw new Error("Dossier favore non confermato");
    drain(mafia);
    if (socialState.morale.trust !== 74 || socialState.morale.cohesion !== 57) throw new Error("Raccomandazione senza costo morale");
    socialState.coalition = addAlly(socialState.coalition, "campo_secretary").state;
    socialState.coalition = addAlly(socialState.coalition, "quantum_centrist").state;
    for (const id of ["campo_secretary", "quantum_centrist", "civic_mayor"]) socialState.flags[`coalition-candidate-seen:${id}`] = true;
    const photo = new PhotoChoiceScene(stack, input, socialState); capture("foto-rischio", photo);
    press(photo, "down"); press(photo, "a");
    for (let i = 0; !photo.result && i < 30; i++) press(photo, "a");
    if (!photo.result) throw new Error("Dossier foto non confermato");
    if (socialState.morale.cohesion !== 49) throw new Error("Linea rossa senza costo di coesione");
    capture("foto-conseguenza", photo);
    // Lo stesso percorso chiamato dal mondo: scena soltanto con uno starter,
    // scelta salvata, dialogo successivo coerente, niente premi ripetuti.
    const world = Object.create(WorldScene.prototype);
    world.state = state; world.stack = stack; world.input = input;
    world.wanderNpc = null; world.wanderTrainer = null;
    world.atto3Controller = { interactNpc: () => false };
    let reply = []; let afterCalls = 0;
    world.say = (lines, after) => { reply = lines; after?.(); };
    for (const [npcId, eventId] of Object.entries(CIVIC_NPCS)) {
      const npc = Object.values(MAPS).flatMap((map) => map.npcs).find((npc) => npc.id === npcId);
      if (!npc) throw new Error(`NPC civico assente: ${npcId}`);
      if (eventId === "bus") {
        world.interactNpc({ ...npc });
        if (stack.top?.constructor.name !== CivicScene.name) throw new Error("Il mondo non apre la scelta civica");
        press(stack.top, "down"); press(stack.top, "a"); drain(stack.top);
        if (state.morale.promises[0]?.status !== "pending") throw new Error("Promessa non registrata");
        const before = JSON.stringify(state);
        world.interactNpc({ ...npc });
        if (!reply.join(" ").includes("Restano 3")) throw new Error("NPC non ricorda la promessa");
        if (JSON.stringify(state) !== before) throw new Error("Interazione ripetuta muta il save");
      }
    }
    world.queueBattle = (start) => start();
    world.onBattleEnd = () => { stack.pop(); saveGame(state); };
    const battle = (id, result = "win") => { world.startTrainerBattle(TRAINERS[id], () => { afterCalls++; }); if (stack.top.constructor.name === "BossBriefingScene") press(stack.top,"a"); stack.top.onEnd(result); };
    battle("aide", "loss"); battle("aide"); battle("aide"); battle("stagista");
    if (state.morale.promises[0].status !== "pending" || state.morale.progress !== 2) throw new Error("Il rematch ha fatto scadere la promessa");
    battle("emittenza");
    if (state.morale.promises[0].status !== "broken" || afterCalls !== 5 || !reply.join(" ").includes("scaduta")) throw new Error("Notifica scadenza interrompe la callback della storia");
    saveGame(state);
    if (loadGame().morale.promises[0].status !== "broken") throw new Error("Scadenza persa al reload");
    resolveCivicChoice(state, "sportello", 1); resolveCivicChoice(state, "traghetto", 1);
    capture("morale-scadenza", new MoraleScene(stack, input, state));
    const moraleScene = new MoraleScene(stack, input, state);
    const fundsBefore = state.money;
    press(moraleScene, "a"); drain(moraleScene);
    if (state.money !== fundsBefore - 270 || state.morale.promises[0].status !== "repaired") throw new Error("Pagamento menu non ripara");
    const afterPay = JSON.stringify(state);
    press(moraleScene, "a"); drain(moraleScene);
    if (JSON.stringify(state) !== afterPay) throw new Error("Pagamento ripetuto dà un premio");
    keepPromise(state, "sportello");
    capture("morale-riparato", moraleScene);
    press(moraleScene, "start"); if (!moraleScene.msg.isOpen) throw new Error("Guida morale non disponibile"); drain(moraleScene);
    const legacy = structuredClone(state); delete legacy.morale;
    if (parseGameState(JSON.stringify(legacy)).morale.trust !== 50) throw new Error("Migrazione morale fallita");
    const base = newElectionState(true);
    state.election = { ...base, phase: "resolved", result: calculateElectionResult(base.districts.map((district) => ({ ...district, localConsensus: 70 })), true) };
    state.morale.trust = 80; state.morale.cohesion = 85;
    let finishCalls = 0; const ending = new Atto3EndingScene(stack, input, state, () => { finishCalls++; });
    for (let page = 0; page < ending.pages.length; page++) { capture(`epilogo-${page}`, ending); if (page < ending.pages.length - 1) press(ending, "a"); }
    const moneyBefore = state.money; press(ending, "a"); press(ending, "a");
    if (state.money !== moneyBefore + 2500 || finishCalls !== 1) throw new Error("Ricompensa epilogo duplicata");
    state.morale.trust = 10; state.morale.cohesion = 10;
    const badEnding = new Atto3EndingScene(stack, input, state, () => {}); badEnding.page = 2; capture("epilogo-sfiducia", badEnding);
    const weekly = new WeeklyCampaignScene(stack, input, state, () => {});
    for (const event of CLASSIC_MEME_EVENTS) {
      // Cerca uno schedule reale che contenga il riferimento da controllare.
      let found = false;
      for (let seed = 0; seed < 100 && !found; seed++) {
        state.weeklyCampaign = { ...state.weeklyCampaign, seed, phase: "active", cursor: 0 };
        const cursor = weeklySchedule(state.weeklyCampaign).findIndex((stage) => stage.event?.id === `meme:${event.id}`);
        if (cursor >= 0) { state.weeklyCampaign = { ...state.weeklyCampaign, cursor }; found = true; }
      }
      if (!found) throw new Error(`Meme non raggiungibile: ${event.id}`);
      capture(event.id, weekly);
    }
    return { shots, issues, statuses: Object.fromEntries(Object.keys(entries).map((id) => [id, spriteStatus(id)])), remembered: civicNpcReply(state, "egg-pensionato") };
  });
  assert.deepEqual(errors, [], "errori runtime");
  assert.deepEqual(result.issues, [], "testi fuori schermo o sovrapposti");
  for (const [id, status] of Object.entries(result.statuses)) assert.equal(status, "ready", id);
  mkdirSync("artifacts/screens/morale-satire", { recursive: true });
  for (const [name, data] of Object.entries(result.shots)) writeFileSync(`artifacts/screens/morale-satire/${name}.png`, Buffer.from(data.split(",")[1], "base64"));
  console.log(`PASS: ${Object.keys(result.shots).length} scene; NPC, scadenza, rematch, pagamento, reload, guida e finale.`);
} finally { await browser.close(); }
