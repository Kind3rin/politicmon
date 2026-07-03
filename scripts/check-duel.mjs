// Guardrail DUELLO PvP (dev server :5179 attivo). Due pagine Playwright in
// CONTESTI separati (localStorage indipendenti) nello stesso browser:
// 1) handshake invite -> accept -> start su rete P2P reale;
// 2) un turno completo con HP dei MIRROR identici sulle due pagine;
// 3) resa con banner corretti e ritorno al mondo su entrambe;
// 4) INVARIANTE C9 (raffinato R39): il duello NON tocca il save DURANTE.
//    Al RITORNO AL MONDO il lotto retention scrive (per design) il record
//    duelli e le missioni giornaliere: il confronto ignora quindi SOLO i campi
//    duelWins/duelLosses/dailyQuestsDone/lastDailyQuestDate/money e la chiave
//    di backup .bak — tutto il resto del save deve restare IDENTICO;
// 4b) duelWins/duelLosses aggiornati (vincitore/perdente) e duelWins
//     broadcastato nel profilo (visibile sul peer remoto);
// 5) check statico di validateWireTeam (team illegali respinti).
// Se i relay Nostr non connettono entro 60s -> SKIP dell'e2e (exit 0), non FAIL.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();

async function boot(nick, x, team) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.evaluate(async ({ nk, px, tm }) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const { newGameState } = await import("/src/game/state.ts");
    const { createMonster } = await import("/src/game/monster.ts");
    const { WorldScene } = await import("/src/game/world/WorldScene.ts");
    const { DuelLobbyScene } = await import("/src/scenes/DuelLobbyScene.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    // Singleton del grafo delle scene (NON reimportare mp: con l'HMR di Vite
    // si rischiano due istanze — vedi nota in shot-trade.mjs).
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
    for (const [sp, lv] of tm) state.party.push(createMonster(sp, lv));
    state.pos = { mapId: "borgo", x: px, y: 10, facing: "down" };
    stack.push(new WorldScene(stack, input, state));
    window.__t = { stack, input, state, mp, DuelLobbyScene };
    window.__tick = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
    // Avanza (A) SOLO quando è sicuro: messaggi del duello (coda) o banner
    // finale. Mai nei menu (selezionerebbe voci a caso).
    window.__advance = () => {
      const d = window.__duel;
      const press = d && !d.finished && (d.mode === "queue" || d.done);
      if (press) {
        document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", bubbles: true, cancelable: true }));
        window.__tick();
        document.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyZ", bubbles: true, cancelable: true }));
      }
      for (let i = 0; i < 3; i++) window.__tick();
    };
    for (let i = 0; i < 8; i++) window.__tick();
  }, { nk: nick, px: x, tm: team });
  return page;
}

const A = await boot("ONOREVOLE", 14, [["giorgetta", 10], ["renzino", 10]]);
const B = await boot("COMPAGNO", 15, [["ellyna", 10], ["salvinott", 10]]);

async function tick(n, advance = false) {
  for (let i = 0; i < n; i++) {
    await A.evaluate((adv) => (adv ? window.__advance() : window.__tick()), advance);
    await B.evaluate((adv) => (adv ? window.__advance() : window.__tick()), advance);
    await new Promise((r) => setTimeout(r, 25));
  }
}

// Preme A (KeyZ) incondizionatamente sulla pagina (per menu e conferme).
async function pressA(page) {
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", bubbles: true, cancelable: true }));
    window.__tick();
    document.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyZ", bubbles: true, cancelable: true }));
    for (let i = 0; i < 3; i++) window.__tick();
  });
}

async function pressKey(page, code) {
  await page.evaluate((c) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code: c, bubbles: true, cancelable: true }));
    window.__tick();
    document.dispatchEvent(new KeyboardEvent("keyup", { code: c, bubbles: true, cancelable: true }));
    for (let i = 0; i < 3; i++) window.__tick();
  }, code);
}

async function waitFor(page, fn, timeoutMs, label, advance = false) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await tick(3, advance);
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

// ---- Check statico validazione team (gira anche offline) ----
const staticChecks = await A.evaluate(async () => {
  const { legalMoveForSpecies, sanitizeTurnlog, validateWireTeam } = await import("/src/net/duelproto.ts");
  const { sanitizeTradeMon } = await import("/src/net/trade.ts");
  const { statsOf } = await import("/src/game/monster.ts");
  const out = {};
  out.badSpecies = validateWireTeam([{ s: "specie-inventata", l: 10, m: ["comizio"] }]) === null;
  out.badLevel = validateWireTeam([{ s: "renzino", l: 99, m: ["giravolta"] }]) === null;
  out.badMove = validateWireTeam([{ s: "renzino", l: 10, m: ["hackmove"] }]) === null;
  out.illegalMove = validateWireTeam([{ s: "renzino", l: 10, m: ["spread"] }]) === null; // TECNO su CENTRO
  out.tooMany = validateWireTeam(Array(7).fill({ s: "renzino", l: 10, m: ["giravolta"] })) === null;
  out.dupes = validateWireTeam([{ s: "renzino", l: 10, m: ["giravolta", "giravolta"] }]) === null;
  const ok = validateWireTeam([{ s: "renzino", l: 12, m: ["giravolta", "comizio"] }]);
  out.rebuilt = ok !== null && ok[0].hp === statsOf(ok[0]).hp && ok[0].level === 12;
  // Mosse pre-evoluzione conservate da evolve(): devono restare legali su
  // TUTTA la catena (starter evoluti + tessere), per duello E scambio.
  const preEvoCases = [
    ["schleinix", "comizio"],
    ["renzilla", "promessa"],
    ["giorgiagon", "slogan"],
    ["conteblob", "inciucio"],
    ["marsrat", "memedoge"]
  ];
  out.preEvoLegal = preEvoCases.every(([s, m]) => legalMoveForSpecies(s, m));
  out.preEvoTeam = validateWireTeam([{ s: "schleinix", l: 20, m: ["comizio", "sciopero"] }]) !== null;
  const traded = sanitizeTradeMon({ speciesId: "renzilla", level: 20, moves: ["promessa", "comizio"] });
  out.preEvoTrade = traded !== null && traded.moves.some((sl) => sl.id === "promessa");
  // Mossa totalmente estranea alla catena: deve ancora FALLIRE.
  out.foreignMove = legalMoveForSpecies("schleinix", "spread") === false;
  // Turnlog dal filo: eventi malformati scartano l'INTERO log (niente crash).
  out.tlBadSide = sanitizeTurnlog([{ e: "dmg", side: "x", hpAfter: 0, crit: false, typeMult: 1 }]) === null;
  out.tlBadEvent = sanitizeTurnlog([{ e: "hackevent", side: "host" }]) === null;
  out.tlBadHp = sanitizeTurnlog([{ e: "dmg", side: "host", hpAfter: "NaN?", crit: false, typeMult: 1 }]) === null;
  out.tlNonArray = sanitizeTurnlog("non-un-array") === null;
  const goodLog = sanitizeTurnlog([
    { e: "move", side: "host", moveId: "comizio" },
    { e: "dmg", side: "guest", hpAfter: 12, crit: false, typeMult: 1 },
    { e: "end", winner: "host", reason: "ko" }
  ]);
  out.tlGood = goodLog !== null && goodLog.length === 3 && goodLog[1].hpAfter === 12;

  // R42: il SOFT-CAP del danno vive in calcDamage di sim.ts, che duelsim usa
  // direttamente (executeMove → calcDamage). Verifichiamo che il duello erediti
  // il cap: due colpi worst-case risolti da resolveTurn non superano base*3.5.
  const { makeDuelSim, resolveTurn } = await import("/src/game/battle/duelsim.ts");
  const { createMonster: mkMon, statsOf: sOf } = await import("/src/game/monster.ts");
  const { DAMAGE_MULT_CAP } = await import("/src/game/battle/sim.ts");
  const { MOVES: MV } = await import("/src/data/moves.ts");
  function mb(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // host = draghimon (TECNO) con SPREAD su guest CENTRO: super-efficace + STAB.
  const host = mkMon("draghimon", 40); host.moves = [{ id: "spread", pp: 10 }];
  const guest = mkMon("macronfox", 40); guest.moves = [{ id: "giravolta", pp: 10 }];
  const guestMaxHp = sOf(guest).hp;
  const sim = makeDuelSim([host], [guest]);
  const evs = resolveTurn(sim, { kind: "move", moveId: "spread" }, { kind: "move", moveId: "giravolta" }, mb(9));
  const dmgEv = evs.find((e) => e.e === "dmg" && e.side === "guest");
  const dealt = dmgEv ? guestMaxHp - dmgEv.hpAfter : 0;
  const a = sOf(host).spc, d = sOf(guest).def;
  const base = ((2 * 40) / 5 + 2) * MV.spread.power * a / d / 58 + 2;
  out.duelSoftCap = dealt > 0 && dealt <= Math.floor(base * DAMAGE_MULT_CAP) + 1;
  out.duelSoftCapDetail = `dealt=${dealt} base=${base.toFixed(1)} cap=${DAMAGE_MULT_CAP}`;
  return out;
});
check(staticChecks.badSpecies, "validateWireTeam: specie inesistente respinta");
check(staticChecks.badLevel, "validateWireTeam: livello 99 respinto");
check(staticChecks.badMove && staticChecks.illegalMove, "validateWireTeam: mosse inventate/illegali respinte");
check(staticChecks.tooMany && staticChecks.dupes, "validateWireTeam: 7+ mon / mosse duplicate respinti");
check(staticChecks.rebuilt, "validateWireTeam: team legale ricostruito a HP pieni");
check(staticChecks.preEvoLegal, "legalMoveForSpecies: mosse pre-evoluzione accettate (starter evoluti e tessere)");
check(staticChecks.preEvoTeam, "validateWireTeam: team con mosse pre-evoluzione VALIDO");
check(staticChecks.preEvoTrade, "sanitizeTradeMon: mosse pre-evoluzione NON strippate nello scambio");
check(staticChecks.foreignMove, "legalMoveForSpecies: mossa estranea alla catena ancora respinta");
check(
  staticChecks.tlBadSide && staticChecks.tlBadEvent && staticChecks.tlBadHp && staticChecks.tlNonArray,
  "sanitizeTurnlog: turnlog malformato respinto in blocco (niente crash guest)"
);
check(staticChecks.tlGood, "sanitizeTurnlog: turnlog legale ricostruito intatto");
check(staticChecks.duelSoftCap, `duello: SOFT-CAP danno ereditato da calcDamage (${staticChecks.duelSoftCapDetail})`);

// ---- Connessione P2P (SKIP dell'e2e se i relay sono giù) ----
const connected = await waitFor(
  A, () => window.__t.mp.connected && window.__t.mp.onlineCount === 1, 60000, "connessione P2P"
);
if (!connected) {
  console.log("SKIP e2e duello: relay Nostr/WebRTC non raggiungibili (non bloccante).");
  await browser.close();
  process.exit(failures > 0 ? 1 : 0);
}

// Baseline localStorage (dopo i saveGame di boot, PRIMA del duello).
// C9 raffinato R39: al ritorno al mondo il gioco scrive PER DESIGN il record
// duelli e le missioni giornaliere → il confronto normalizza il save ignorando
// SOLO duelWins/duelLosses/dailyQuestsDone/lastDailyQuestDate/money e le chiavi
// di backup .bak. Tutto il resto deve restare IDENTICO byte-per-byte.
const snap = (page) => page.evaluate(() => {
  const VOLATILE = ["duelWins", "duelLosses", "dailyQuestsDone", "lastDailyQuestDate", "money"];
  return JSON.stringify(
    Object.entries(localStorage)
      .filter(([k]) => !k.endsWith(".bak"))
      .map(([k, v]) => {
        try {
          const o = JSON.parse(v);
          if (o && typeof o === "object" && !Array.isArray(o)) {
            for (const f of VOLATILE) {
              delete o[f];
            }
            return [k, JSON.stringify(o)];
          }
        } catch {
          // valore non-JSON: confrontato così com'è
        }
        return [k, v];
      })
      .sort()
  );
});
await tick(5);
const lsA0 = await snap(A);
const lsB0 = await snap(B);

// ---- Handshake: A (host) invita via lobby, B accetta dal prompt mondo ----
await A.evaluate(() => {
  const { stack, input, state, mp, DuelLobbyScene } = window.__t;
  const peerId = [...mp.remotes.keys()][0];
  stack.push(new DuelLobbyScene(stack, input, state, { invitePeerId: peerId }));
});
const invited = await waitFor(
  B,
  () => Boolean(window.__t.stack.scenes?.[0]?.askMenu),
  20000,
  "prompt invito su B"
);
check(invited, "handshake: invito arriva e apre il prompt SÌ/NO su B");
if (invited) {
  await pressA(B); // SÌ -> accept
}
const inDuelA = await waitFor(A, () => Boolean(window.__duel), 20000, "PvpBattleScene su A");
const inDuelB = await waitFor(B, () => Boolean(window.__duel), 20000, "PvpBattleScene su B");
check(inDuelA && inDuelB, "handshake: entrambe le pagine entrano in PvpBattleScene");

if (inDuelA && inDuelB) {
  // Intro -> menu su entrambe (i messaggi avanzano via __advance).
  const menuA = await waitFor(A, () => window.__duel?.mode === "menu", 30000, "menu su A", true);
  const menuB = await waitFor(B, () => window.__duel?.mode === "menu", 30000, "menu su B", true);
  check(menuA && menuB, "intro completata: menu azioni su entrambe");

  // Turno 1: entrambe scelgono LOTTA -> prima mossa.
  await pressA(A); // LOTTA
  await pressA(A); // prima mossa
  await pressA(B);
  await pressA(B);
  const turnA = await waitFor(A, () => window.__duel?.turn === 2 && window.__duel?.mode === "menu", 40000, "turno 1 su A", true);
  const turnB = await waitFor(B, () => window.__duel?.turn === 2 && window.__duel?.mode === "menu", 40000, "turno 1 su B", true);
  check(turnA && turnB, "turno 1 risolto su entrambe (host-autoritativo)");

  const duelA = await A.evaluate(() => window.__duel);
  const duelB = await B.evaluate(() => window.__duel);
  const mirror =
    JSON.stringify(duelA.host) === JSON.stringify(duelB.host) &&
    JSON.stringify(duelA.guest) === JSON.stringify(duelB.guest);
  check(mirror, `HP speculari sulle due pagine (host=${JSON.stringify(duelA.host)} guest=${JSON.stringify(duelA.guest)})`);
  writeFileSync("artifacts/screens/duel.png", await A.locator("#shotcanvas").screenshot());
  console.log("salvato duel.png");

  // Resa da B: menu -> giù x2 -> RESA -> conferma SÌ.
  await pressKey(B, "ArrowDown");
  await pressKey(B, "ArrowDown");
  await pressA(B); // RESA
  await pressA(B); // conferma SÌ
  const endedA = await waitFor(A, () => window.__duel?.finished === true, 30000, "fine duello su A", true);
  const endedB = await waitFor(B, () => window.__duel?.finished === true, 30000, "fine duello su B", true);
  check(endedA && endedB, "resa: il duello si chiude su entrambe");

  // Ritorno al mondo: in cima allo stack deve restare la WorldScene.
  const backA = await waitFor(A, () => window.__t.stack.top?.constructor?.name === "WorldScene", 15000, "mondo su A", true);
  const backB = await waitFor(B, () => window.__t.stack.top?.constructor?.name === "WorldScene", 15000, "mondo su B", true);
  check(backA && backB, "ritorno al mondo su entrambe (lobby e scene poppate)");

  // INVARIANTE C9 (raffinato): il duello non tocca il save DURANTE; il record
  // duelli/missioni scritto al ritorno è escluso dal confronto (snap normalizza).
  await tick(5);
  check(lsA0 === (await snap(A)), "C9: save di A IDENTICO prima/dopo (al netto del record duelli/missioni)");
  check(lsB0 === (await snap(B)), "C9: save di B IDENTICO prima/dopo (al netto del record duelli/missioni)");

  // 4b: record duelli scritto SOLO al ritorno al mondo. B si è arreso → A vince.
  const recA = await A.evaluate(() => ({ w: window.__t.state.duelWins, l: window.__t.state.duelLosses }));
  const recB = await B.evaluate(() => ({ w: window.__t.state.duelWins, l: window.__t.state.duelLosses }));
  check(recA.w === 1 && recA.l === 0, `4b: A (vincitore) duelWins=1/duelLosses=0 (visto ${recA.w}/${recA.l})`);
  check(recB.w === 0 && recB.l === 1, `4b: B (perdente) duelWins=0/duelLosses=1 (visto ${recB.w}/${recB.l})`);

  // 4b: duelWins ribroadcastato nel profilo → visibile sul peer remoto (B vede A).
  const seen = await waitFor(
    B, () => [...window.__t.mp.remotes.values()][0]?.duelWins === 1, 15000, "broadcast duelWins", true
  );
  check(seen, "4b: duelWins di A broadcastato nel profilo e visibile su B");
}

await browser.close();
if (failures > 0) {
  console.error(`check-duel: ${failures} verifiche FALLITE`);
  process.exit(1);
}
console.log("check-duel: OK");
process.exit(0);
