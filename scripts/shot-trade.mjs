// Verifica SCAMBI P2P (pattern shot-mp.mjs, dev server :5179 attivo).
// (a) e2e su rete reale: invite -> accept -> offer x2 -> confirm x2 -> swap
//     simmetrico del party, hp rigenerato, flag trade-done, ministri puliti.
// (b) anti-cheat: offer forgiata (specie inesistente / level 999 / mossa
//     inventata) iniettata su TradeSession.onWire -> party mai corrotto.
// (c) screenshot UI della TradeScene.
// NB: (a) dipende dai relay Nostr pubblici -> se non si connette entro 60s
// fa SKIP (exit 0), NON è un guardrail bloccante.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();

async function boot(nick, x, species, level) {
  const page = await browser.newPage({ viewport: { width: 480, height: 720 } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.evaluate(async ({ nk, px, sp, lv }) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const { newGameState } = await import("/src/game/state.ts");
    const { createMonster, statsOf } = await import("/src/game/monster.ts");
    const { WorldScene } = await import("/src/game/world/WorldScene.ts");
    const { TradeScene } = await import("/src/scenes/TradeScene.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    // ATTENZIONE: NON importare mp direttamente ("/src/net/mp.ts"): con l'HMR
    // di Vite le scene possono usare un'istanza "?t=..." DIVERSA (due singleton
    // → i test guardano lo stato sbagliato). __mp è il singleton del grafo
    // delle scene, esposto da mp.ts per il debug.
    const mp = window.__mp;
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
    state.party.push(createMonster(sp, lv));
    // Il mon offerto è anche MINISTRO: al commit il ministero va ripulito.
    state.ministri["economia"] = state.party[0].uid;
    state.pos = { mapId: "borgo", x: px, y: 10, facing: "down" };
    const world = new WorldScene(stack, input, state);
    stack.push(world);
    window.__t = { stack, input, state, mp, createMonster, statsOf, TradeScene };
    window.__tick = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
    for (let i = 0; i < 8; i++) window.__tick();
  }, { nk: nick, px: x, sp: species, lv: level });
  return page;
}

const A = await boot("ONOREVOLE", 14, "giorgetta", 10);
const B = await boot("COMPAGNO", 15, "renzino", 12);

async function tick(n) {
  for (let i = 0; i < n; i++) {
    await A.evaluate(() => window.__tick());
    await B.evaluate(() => window.__tick());
    await new Promise((r) => setTimeout(r, 33));
  }
}

async function waitFor(page, fn, timeoutMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await tick(4);
    if (await page.evaluate(fn)) return true;
  }
  console.warn(`timeout: ${label}`);
  return false;
}

let failures = 0;
function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
}

// ---- (a) E2E su rete reale (SKIP se i relay non connettono) ----
const connected = await waitFor(
  A, () => window.__t.mp.connected && window.__t.mp.onlineCount === 1, 60000, "connessione P2P"
);
if (!connected) {
  console.log("SKIP e2e: relay Nostr/WebRTC non raggiungibili (non bloccante).");
} else {
  // A invita B e apre la TradeScene.
  await A.evaluate(() => {
    const { stack, input, state, mp, TradeScene } = window.__t;
    const peerId = [...mp.remotes.keys()][0];
    const nick = mp.remotes.get(peerId).nick;
    mp.trade.invite(peerId, "ONOREVOLE");
    stack.push(new TradeScene(stack, input, state, { peerId, peerNick: nick }));
  });
  // B riceve l'invito, accetta e apre la TradeScene.
  const invited = await waitFor(B, () => window.__t.mp.trade.pendingInvite !== null, 20000, "invito su B");
  check(invited, "l'invito arriva a B (targeted send)");
  if (invited) {
    await B.evaluate(() => {
      const { stack, input, state, mp, TradeScene } = window.__t;
      const inv = mp.trade.pendingInvite;
      mp.trade.acceptInvite("COMPAGNO");
      stack.push(new TradeScene(stack, input, state, { peerId: inv.peerId, peerNick: inv.nick }));
    });
    await waitFor(A, () => window.__t.mp.trade.phase === "negotiating", 15000, "accept su A");
    // Entrambi offrono il primo (e unico) mon del party.
    await A.evaluate(() => window.__t.mp.trade.setOffer(window.__t.state.party[0]));
    await B.evaluate(() => window.__t.mp.trade.setOffer(window.__t.state.party[0]));
    await waitFor(A, () => window.__t.mp.trade.peerOffer !== null, 15000, "offer su A");
    await waitFor(B, () => window.__t.mp.trade.peerOffer !== null, 15000, "offer su B");
    // Doppia conferma.
    await A.evaluate(() => window.__t.mp.trade.confirm());
    await B.evaluate(() => window.__t.mp.trade.confirm());
    const swapped = await waitFor(
      A, () => window.__t.state.party[0]?.speciesId === "renzino", 15000, "commit su A"
    );
    await waitFor(B, () => window.__t.state.party[0]?.speciesId === "giorgetta", 15000, "commit su B");
    check(swapped, "swap simmetrico: A riceve RENZINO");
    const aChecks = await A.evaluate(() => {
      const { state, statsOf } = window.__t;
      const m = state.party[0];
      return {
        species: m.speciesId,
        level: m.level,
        fullHp: m.hp === statsOf(m).hp,
        tradeDone: state.flags["trade-done"] === true,
        tradeDexFlag: state.flags["dex-trade:renzino"] === true,
        caught: state.dex["renzino"] === "caught",
        // Il ministero del mon uscente deve essere stato ripulito (uid orfano).
        orphanMinistri: Object.values(state.ministri).filter(
          (uid) => !state.party.some((p) => p.uid === uid)
        ).length
      };
    });
    check(aChecks.species === "renzino" && aChecks.level === 12, "specie/livello ricostruiti");
    check(aChecks.fullHp, "hp rigenerato = statsOf().hp");
    check(aChecks.tradeDone, "flag trade-done scritto");
    check(aChecks.caught && aChecks.tradeDexFlag, "dex caught + esclusione zona (dex-trade:)");
    check(aChecks.orphanMinistri === 0, "nessun ministero zombie");
    await tick(10);
    writeFileSync("artifacts/screens/trade-done.png", await A.locator("#shotcanvas").screenshot());
    console.log("salvato trade-done.png");
  }
}

// ---- (b) Anti-cheat: offer forgiate iniettate su onWire ----
const anti = await B.evaluate(async () => {
  const { mp, state } = window.__t;
  const { sanitizeTradeMon } = await import("/src/net/trade.ts");
  const { statsOf } = await import("/src/game/monster.ts");
  const out = {};
  const partyBefore = JSON.stringify(state.party.map((m) => m.speciesId));
  const s = mp.trade;
  s.reset();
  s.phase = "negotiating";
  s.peerId = "EVIL";
  // Specie inesistente -> sessione annullata, party intatto.
  s.onWire({ v: 1, t: "offer", seq: 1, mon: { speciesId: "specie-inesistente", level: 999, moves: ["hackmove"] } }, "EVIL");
  out.cancelled = s.phase === "idle" && s.peerOffer === null;
  out.partyIntact = JSON.stringify(state.party.map((m) => m.speciesId)) === partyBefore;
  // Specie valida ma level 999 + mosse illegali -> clamp 50 e filtro mosse.
  s.reset();
  s.phase = "negotiating";
  s.peerId = "EVIL";
  s.onWire({ v: 1, t: "offer", seq: 1, mon: { speciesId: "renzino", level: 999, moves: ["giravolta", "hackmove", "spread"] } }, "EVIL");
  const m = s.peerOffer;
  out.clamped = m !== null && m.level === 50;
  out.movesFiltered = m !== null && m.moves.every((sl) => ["giravolta"].includes(sl.id));
  out.statsLocal = m !== null && m.hp === statsOf(m).hp;
  // Payload con stats/hp/uid contraffatti: ignorati (ricostruzione totale).
  const forged = sanitizeTradeMon({ speciesId: "giorgetta", level: 10, moves: [], hp: 9999, exp: 9999, uid: "hack" });
  out.rebuilt = forged !== null && forged.hp === statsOf(forged).hp && forged.uid !== "hack";
  s.reset();
  return out;
});
check(anti.cancelled, "anti-cheat: specie inesistente -> scambio annullato");
check(anti.partyIntact, "anti-cheat: party mai corrotto");
check(anti.clamped, "anti-cheat: level 999 -> clamp 50");
check(anti.movesFiltered, "anti-cheat: mosse illegali filtrate");
check(anti.statsLocal && anti.rebuilt, "anti-cheat: stats/hp/uid rigenerati localmente");

// ---- (c) Screenshot UI della TradeScene (offerta finta, senza rete) ----
await B.evaluate(() => {
  const { stack, input, state, mp, createMonster, TradeScene } = window.__t;
  const s = mp.trade;
  s.reset();
  s.phase = "negotiating";
  s.timer = 90; // campo privato (solo TS): senza, il tick fa scadere subito
  s.peerId = "FAKE";
  s.peerNick = "ONOREVOLE";
  s.peerOffer = createMonster("giorgetta", 10);
  s.peerSeq = 1;
  s.setOffer(state.party[0]); // evidenzia l'offerto nella colonna sinistra
  stack.push(new TradeScene(stack, input, state, { peerId: "FAKE", peerNick: "ONOREVOLE" }));
  for (let i = 0; i < 6; i++) window.__tick();
});
writeFileSync("artifacts/screens/trade-ui.png", await B.locator("#shotcanvas").screenshot());
console.log("salvato trade-ui.png");

await browser.close();
if (failures > 0) {
  console.error(`shot-trade: ${failures} verifiche FALLITE`);
  process.exit(1);
}
console.log("shot-trade: OK");
process.exit(0);
