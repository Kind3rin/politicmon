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

  // 4) HOLD ITEM (Round 39): santino +10% fisico, gilet -15% subito.
  {
    const move = MOVES.comizio; // fisica, 100 acc
    const base = () => {
      const p = makeCombatant(createMonster("giorgetta", 20));
      const f = makeCombatant(createMonster("salvinott", 20));
      return { p, f };
    };
    // seed che NON produce crit al primo tiro (verificato: mulberry32(1) primo ~0.26)
    const noCrit = () => mulberry32(1);
    let a = base();
    const plain = calcDamage(a.p, a.f, move, noCrit()).damage;
    a = base();
    a.p.mon.heldItem = "santino";
    const withSantino = calcDamage(a.p, a.f, move, noCrit()).damage;
    check(withSantino > plain, "hold: SANTINO aumenta il danno fisico", `${plain} -> ${withSantino}`);
    a = base();
    a.f.mon.heldItem = "gilet";
    const withGilet = calcDamage(a.p, a.f, move, noCrit()).damage;
    check(withGilet < plain, "hold: GILET riduce il danno subito", `${plain} -> ${withGilet}`);
    // heldItem sconosciuto (item rimosso dal gioco): nessun crash, nessun effetto.
    a = base();
    a.p.mon.heldItem = "itemFantasma";
    const withGhost = calcDamage(a.p, a.f, move, noCrit()).damage;
    check(withGhost === plain && a.p.mon.heldItem === undefined, "hold: id sconosciuto ignorato e ripulito", `${withGhost}`);
  }

  // 5) ABILITÀ: LODO dimezza SOLO il primo colpo; MAGGIORANZA +10% se HP>50%.
  {
    const move = MOVES.comizio;
    const atk = makeCombatant(createMonster("giorgetta", 20));
    const lodoDef = makeCombatant(createMonster("berlusconix", 20)); // ability lodo
    const first = calcDamage(atk, lodoDef, move, mulberry32(1));
    const second = calcDamage(atk, lodoDef, move, mulberry32(1));
    check(first.lodo === true && second.lodo !== true && first.damage < second.damage,
      "abilità: LODO dimezza solo il primo colpo", `${first.damage} poi ${second.damage}`);
    const magg = makeCombatant(createMonster("giorgiagon", 20)); // ability maggioranza
    const plainDef = () => makeCombatant(createMonster("salvinott", 20));
    const full = calcDamage(magg, plainDef(), move, mulberry32(1)).damage;
    magg.mon.hp = 1; // sotto il 50%: niente bonus
    const low = calcDamage(magg, plainDef(), move, mulberry32(1)).damage;
    check(full > low, "abilità: MAGGIORANZA solo con HP>50%", `${full} vs ${low}`);
    // VOLTAGABBANA: +1 OPPORTUNISMO all'ingresso (da makeCombatant).
    const volta = makeCombatant(createMonster("renzino", 10));
    check(volta.stages.spd === 1, "abilità: VOLTAGABBANA +1 SPD all'ingresso", `spd=${volta.stages.spd}`);
  }

  // 5b) ABILITÀ LEGGENDARI (Round 41): WHATEVER IT TAKES scala il danno sotto
  // 1/3 PV; GARANZIA COSTITUZIONALE è immune a ENTRAMBI stat-drop e status.
  {
    const move = MOVES.comizio;
    const plainDef = () => makeCombatant(createMonster("salvinott", 30));
    const draghi = makeCombatant(createMonster("draghimon", 30)); // ability whatever
    const highHp = calcDamage(draghi, plainDef(), move, mulberry32(1)).damage;
    draghi.mon.hp = 1; // sotto 1/3: bonus +25%
    const lowHp = calcDamage(draghi, plainDef(), move, mulberry32(1)).damage;
    check(lowHp > highHp, "abilità: WHATEVER IT TAKES +danno sotto 1/3 PV", `${highHp} -> ${lowHp}`);

    // GARANZIA COSTITUZIONALE: mattarellux immune a stat-drop e status. Lo
    // verifichiamo a livello di flag abilità (la logica di turno vive in
    // BattleScene/duelsim; qui basta che l'abilità sia agganciata alla specie).
    const { abilityOf } = await import("/src/game/monster.ts");
    const mat = createMonster("mattarellux", 40);
    check(abilityOf(mat)?.id === "garanzia", "abilità: MATTARELLUX ha GARANZIA COSTITUZIONALE", `${abilityOf(mat)?.id}`);
  }

  // 6) SONDAGGI COME METEO: ctx alza il danno dei tipi giusti, il default è neutro.
  {
    const { sondaggiMoveMult } = await import("/src/game/battle/sim.ts");
    const move = MOVES.moralsuasion ?? MOVES.decreto ?? MOVES.comizio;
    const atk = () => makeCombatant(createMonster("draghimon", 20)); // ISTITUZIONE/TECNO
    const def = () => makeCombatant(createMonster("salvinott", 20));
    const mvIst = Object.values(MOVES).find((m) => m.type === "ISTITUZIONE" && m.power > 0);
    const neutral = calcDamage(atk(), def(), mvIst, mulberry32(1)).damage;
    const boosted = calcDamage(atk(), def(), mvIst, mulberry32(1), { sondaggi: 80 }).damage;
    const opposed = calcDamage(atk(), def(), mvIst, mulberry32(1), { sondaggi: 30 }).damage;
    check(boosted > neutral && opposed === neutral,
      "sondaggi-meteo: +15% establishment a >=70, neutro a <=40", `${neutral}/${boosted}/${opposed}`);
    check(sondaggiMoveMult(undefined, "ISTITUZIONE") === 1 && sondaggiMoveMult(30, "POPULISMO") === 1.15,
      "sondaggi-meteo: default neutro, anti-establishment a <=40", "");
    void move;
  }

  // 7) LEVEL CAP 55 (Round 42): gainExp non supera 55; expForLevel(55) è finito
  // e maggiore di expForLevel(54) (la curva regge fino al nuovo cap).
  {
    const { gainExp, expForLevel, LEVEL_CAP } = await import("/src/game/monster.ts");
    check(LEVEL_CAP === 55, "cap: LEVEL_CAP === 55", `cap=${LEVEL_CAP}`);
    const mon = createMonster("giorgetta", 54);
    gainExp(mon, expForLevel(56) * 4); // exp abbondante per superare 55
    check(mon.level === 55, "cap: gainExp si ferma a 55 anche con exp in eccesso", `lv=${mon.level}`);
    const capped = createMonster("giorgetta", 55);
    const before = capped.exp;
    const ev = gainExp(capped, 999999);
    check(ev.length === 0 && capped.exp === before, "cap: al cap 55 nessun altro level-up e exp invariata", `ev=${ev.length}`);
    const e54 = expForLevel(54), e55 = expForLevel(55);
    check(Number.isFinite(e55) && e55 > e54, "cap: expForLevel(55) finito e crescente", `${e54} -> ${e55}`);
  }

  // 8) SOFT-CAP DANNO (Round 42): il moltiplicatore finale non supera 3.5. Si
  // verifica sul caso peggiore (STAB + super-efficace + meteo + abilità offensiva
  // sotto soglia): il mult effettivo (damage/base_teorico) resta <= 3.5.
  {
    const { DAMAGE_MULT_CAP } = await import("/src/game/battle/sim.ts");
    check(DAMAGE_MULT_CAP === 3.5, "soft-cap: DAMAGE_MULT_CAP === 3.5", `cap=${DAMAGE_MULT_CAP}`);
    // draghimon (TECNO) usa SPREAD (TECNO) super-efficace su un CENTRO, con
    // WHATEVER (PV<1/3) e meteo establishment >=70: worst-case cumulativo.
    const move = MOVES.spread; // TECNO, power 70
    const atk = makeCombatant(createMonster("draghimon", 30));
    atk.mon.hp = 1; // sotto 1/3: WHATEVER +25%
    const def = makeCombatant(createMonster("macronfox", 30)); // CENTRO (TECNO super)
    // Danno "base teorico" senza moltiplicatori: ricavato azzerando stab/type via
    // confronto. Più semplice: verifichiamo che con soft-cap il danno non superi
    // il danno che darebbe un mult di 3.5 sul base. Usiamo una sonda RNG fissa.
    const res = calcDamage(atk, def, move, mulberry32(3), { sondaggi: 90 });
    // base = ((2*lv/5+2)*power*atk/def/58 + 2). Ricalcolo con gli stessi stat.
    const a = statsOf(atk.mon).spc, d = statsOf(def.mon).def;
    const base = ((2 * 30) / 5 + 2) * move.power * a / d / 58 + 2;
    check(res.damage <= Math.floor(base * DAMAGE_MULT_CAP) + 1,
      "soft-cap: danno worst-case entro base*3.5", `dmg=${res.damage} base=${base.toFixed(1)}`);
    check(Array.isArray(res.offensive) && res.offensive.includes("whatever"),
      "soft-cap: WHATEVER segnalato tra i trigger offensivi", `${JSON.stringify(res.offensive)}`);
  }

  // 9) TYPE CHART: VERDE super-efficace su TECNO (Round 42), senza rompere le
  // altre relazioni VERDE (DESTRA/MEDIA restano 2×, POPULISMO 0.5×).
  {
    const { typeMultiplier } = await import("/src/data/poltypes.ts");
    // typeMultiplier comprime 2×→1.7; basta che sia > 1 (super) su TECNO.
    check(typeMultiplier("VERDE", ["TECNO"]) > 1, "type-chart: VERDE super su TECNO", `${typeMultiplier("VERDE", ["TECNO"])}`);
    check(typeMultiplier("VERDE", ["DESTRA"]) > 1 && typeMultiplier("VERDE", ["MEDIA"]) > 1,
      "type-chart: VERDE resta super su DESTRA e MEDIA", "");
    check(typeMultiplier("VERDE", ["POPULISMO"]) < 1, "type-chart: VERDE resta debole su POPULISMO", "");
    // TECNO ora ha 2 attaccanti super (POPULISMO storico + VERDE nuovo).
    check(typeMultiplier("POPULISMO", ["TECNO"]) > 1, "type-chart: POPULISMO resta super su TECNO", "");
  }

  // 10) GAFFE nerf (Round 42): telepromessa/covfefe/memedoge scendono da 100 a 65.
  {
    const gaffe100 = ["telepromessa", "covfefe", "memedoge"].filter((id) => MOVES[id]?.effect?.status?.chance === 100);
    const gaffe65 = ["telepromessa", "covfefe", "memedoge"].every((id) => MOVES[id]?.effect?.status?.chance === 65);
    check(gaffe100.length === 0 && gaffe65, "gaffe: le 3 mosse GAFFE ora al 65% (non più 100%)", `res100=${gaffe100.join(",")}`);
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
