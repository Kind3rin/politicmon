// Diagnosi multiplayer LIVE: due client reali nello stesso browser (contesti
// separati) joinano la stessa mappa e si devono vedere. Logga errori console,
// fallimenti websocket (relay Nostr) e lo stato ICE, per capire DOVE si rompe:
// scoperta peer (relay) o connessione WebRTC (STUN/TURN).
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();

async function mkClient(name) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => { const t = m.text(); if (/error|warn|\[mp\]|relay|nostr|ice|turn/i.test(t)) logs.push(`[${name}] ${m.type()}: ${t}`); });
  page.on("websocket", (ws) => {
    logs.push(`[${name}] WS open: ${ws.url()}`);
    ws.on("socketerror", (e) => logs.push(`[${name}] WS ERROR ${ws.url()}: ${e}`));
    ws.on("close", () => logs.push(`[${name}] WS closed: ${ws.url()}`));
  });
  await page.goto(BASE, { waitUntil: "networkidle" });
  // join diretto via modulo mp (senza pilotare il gioco)
  await page.evaluate(async (nick) => {
    const { mp } = await import("/src/net/mp.ts");
    window.__mp = mp;
    mp.setIdentity(nick, "player");
    mp.joinMap("borgo", 10, 10, "down");
    // tick manuale: il gioco chiama mp.update nel loop; qui lo facciamo noi
    setInterval(() => mp.update(0.05), 50);
    // manda posizione periodica (trigger di presence)
    setInterval(() => mp.sendMove(10, 10, "down"), 1000);
  }, name);
  return { page, logs, ctx };
}

const a = await mkClient("ALFA");
const b = await mkClient("BETA");

// aspetta fino a 25s che si vedano
let seen = { a: 0, b: 0, aConn: false, bConn: false };
for (let i = 0; i < 25; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  seen = await (async () => ({
    a: await a.page.evaluate(() => window.__mp.remotePlayers().length),
    b: await b.page.evaluate(() => window.__mp.remotePlayers().length),
    aConn: await a.page.evaluate(() => window.__mp.connected),
    bConn: await b.page.evaluate(() => window.__mp.connected),
  }))();
  if (seen.a > 0 && seen.b > 0) break;
}

console.log("RISULTATO:", JSON.stringify(seen));
console.log(seen.a > 0 && seen.b > 0 ? "PASS: i due client si VEDONO" : "FAIL: i client NON si vedono");
console.log("\n--- LOG (relay/ws/errori) ---");
for (const l of [...a.logs, ...b.logs].slice(0, 40)) console.log(l);

await browser.close();
process.exit(seen.a > 0 && seen.b > 0 ? 0 : 1);
