// Guardrail SIM (dev server :5179 attivo): unit-test runtime di
// src/game/battle/sim.ts e src/game/governo.ts via pagina Playwright
// (pattern dei guardrail: import dei moduli TS reali dal dev server).
// Exit 1 su qualunque assert fallito.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(BASE, { waitUntil: "networkidle" });
} catch {
  console.error(`check-sim: dev server non raggiungibile su ${BASE}`);
  await browser.close();
  process.exit(1);
}

const results = await page.evaluate(async () => {
  const { makeCombatant, calcDamage, catchChance } = await import("/src/game/battle/sim.ts");
  const { createMonster, statsOf } = await import("/src/game/monster.ts");
  const { MOVES } = await import("/src/data/moves.ts");
  const { bumpSondaggi } = await import("/src/game/governo.ts");
  const { newGameState } = await import("/src/game/state.ts");

  const out = [];
  const check = (ok, label, detail = "") => out.push({ ok, label, detail });

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 1) Danno end-to-end con RNG fisso: starter lv5 vs comune lv5, mossa base.
  // Turni per KO nel range 3-10 (target pacing ~5-8, margine sui bordi).
  {
    const rng = mulberry32(12345);
    const player = makeCombatant(createMonster("giorgetta", 5));
    const foe = makeCombatant(createMonster("salvinott", 5));
    const move = MOVES.comizio;
    let turns = 0;
    while (foe.mon.hp > 0 && turns < 30) {
      turns += 1;
      foe.mon.hp = Math.max(0, foe.mon.hp - calcDamage(player, foe, move, rng).damage);
    }
    check(turns >= 3 && turns <= 10, "calcDamage: KO comune lv5 in 3-10 colpi", `turni=${turns}`);
    // RNG iniettata = deterministico: due run con lo stesso seed danno lo stesso danno.
    const d1 = calcDamage(player, foe, move, mulberry32(777)).damage;
    const d2 = calcDamage(player, foe, move, mulberry32(777)).damage;
    check(d1 === d2, "calcDamage: deterministico con stessa RNG", `d1=${d1} d2=${d2}`);
    // Retro-compatibilità: senza rng usa Math.random e produce danno valido.
    const d3 = calcDamage(player, foe, move).damage;
    check(d3 >= 1, "calcDamage: default Math.random retro-compatibile", `d=${d3}`);
  }

  // 2) catchChance: comune a 1 HP + status con scheda base >= 0.9.
  {
    const foe = createMonster("salvinott", 5);
    foe.hp = 1;
    foe.status = "scandalo";
    const c = catchChance(foe, "scheda");
    check(c >= 0.9, "catchChance: 1HP+status su comune >= 0.9", `c=${c.toFixed(3)}`);
    // Sanity: a HP pieni senza status deve essere nettamente più bassa.
    const full = createMonster("salvinott", 5);
    const c2 = catchChance(full, "scheda");
    check(c2 < c, "catchChance: HP pieni < 1HP+status", `pieno=${c2.toFixed(3)}`);
  }

  // 3) bumpSondaggi: milestone annunciate SOLO al superamento di 25/40/55/70/85.
  {
    const thresholds = [25, 40, 55, 70, 85];
    let allOk = true, detail = "";
    for (const t of thresholds) {
      const st = newGameState();
      st.sondaggi = t - 1;
      const r = bumpSondaggi(st, 1);
      if (!(r.milestone && r.milestone.includes(`${t}%`))) {
        allOk = false; detail += ` soglia ${t} non annunciata;`;
      }
    }
    // Nessun annuncio se non si attraversa una soglia o se si scende.
    const st1 = newGameState();
    st1.sondaggi = 50;
    if (bumpSondaggi(st1, 2).milestone !== null) { allOk = false; detail += " falso positivo 50->52;"; }
    const st2 = newGameState();
    st2.sondaggi = 26;
    if (bumpSondaggi(st2, -3).milestone !== null) { allOk = false; detail += " annuncio in discesa;"; }
    // Attraversamento multiplo: annuncia la soglia PIU ALTA.
    const st3 = newGameState();
    st3.sondaggi = 20;
    const multi = bumpSondaggi(st3, 60);
    if (!(multi.milestone && multi.milestone.includes("70%"))) { allOk = false; detail += " multi-soglia non massima;"; }
    check(allOk, "bumpSondaggi: soglie 25/40/55/70/85 corrette", detail.trim());
  }

  return out;
});

await browser.close();
let failures = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail ? ` (${r.detail})` : ""}`);
  if (!r.ok) failures += 1;
}
if (failures > 0) {
  console.error(`check-sim: ${failures} verifiche FALLITE`);
  process.exit(1);
}
console.log("check-sim: OK");
process.exit(0);
