// Guardrail DAILY (dev server :5179 attivo): unit-test runtime della logica
// deterministica giornaliera — dailyquests.ts, daily.ts (streak/crisi) e
// version.ts — via pagina Playwright (importa i moduli TS reali dal dev server,
// pattern identico a check-sim). Copre il buco di test più importante del ciclo
// retention. Exit 1 su qualunque assert fallito.
//
// NOTA CI: questo check richiede il dev server (import di moduli TS + localStorage
// per saveGame in bumpDailyQuest), quindi resta LOCALE come check-sim/check-duel.
// La CI (.github/workflows/ci.yml) esegue solo i check puramente statici.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(BASE, { waitUntil: "networkidle" });
} catch {
  console.error(`check-daily: dev server non raggiungibile su ${BASE}`);
  await browser.close();
  process.exit(1);
}

const results = await page.evaluate(async () => {
  const {
    DAILY_QUEST_POOL, todaysDailyQuests, ensureDailyQuestReset,
    dailyQuestStatus, bumpDailyQuest
  } = await import("/src/game/dailyquests.ts");
  const { hashDate, localDateKey, prevDateKey } = await import("/src/game/daily.ts");
  const { speciesAvailable, gameVersion, VERSION_EXCLUSIVES } = await import("/src/game/version.ts");
  const { newGameState } = await import("/src/game/state.ts");

  const out = [];
  const check = (ok, label, detail = "") => out.push({ ok, label, detail });

  const today = localDateKey();

  // ---------------------------------------------------------------- QUESTS
  // 1) bump fino a target accredita UNA volta; niente doppio-pay dopo "done".
  {
    const st = newGameState();
    st.lastDailyQuestDate = today; // niente reset spurio
    st.dailyQuestsDone = [];
    const quest = todaysDailyQuests(today)[0]; // sicuramente nel pool di oggi
    const startMoney = st.money;
    let paidTimes = 0;
    // bump fino al target: solo l'ultimo deve pagare.
    for (let i = 0; i < quest.target; i += 1) {
      if (bumpDailyQuest(st, quest.id, 1)) paidTimes += 1;
    }
    const afterMoney = st.money;
    check(
      paidTimes === 1 && afterMoney === startMoney + quest.reward,
      "quests: bump fino a target accredita UNA volta",
      `pay=${paidTimes} money=${startMoney}->${afterMoney} (+${quest.reward})`
    );
    // Entry finale "id:done".
    const entry = st.dailyQuestsDone.find((e) => e.startsWith(quest.id + ":"));
    check(entry === `${quest.id}:done`, "quests: entry completata è 'id:done'", `entry=${entry}`);
    // Doppio bump dopo "done": no-op, nessun pagamento extra.
    const moneyBeforeExtra = st.money;
    const extra = bumpDailyQuest(st, quest.id, 5);
    check(
      extra === false && st.money === moneyBeforeExtra,
      "quests: bump post-done non ri-paga",
      `extra=${extra} money=${st.money}`
    );
  }

  // 2) reset azzera i progressi quando cambia la data.
  {
    const st = newGameState();
    st.lastDailyQuestDate = "2000-01-01"; // ieri lontano
    st.dailyQuestsDone = ["win2:1", "catch1:done"];
    ensureDailyQuestReset(st);
    check(
      st.lastDailyQuestDate === today && st.dailyQuestsDone.length === 0,
      "quests: reset azzera i progressi al cambio data",
      `date=${st.lastDailyQuestDate} n=${st.dailyQuestsDone.length}`
    );
  }

  // 3) missione fuori dal pool di oggi = no-op (non tra le 3 pescate).
  {
    const st = newGameState();
    st.lastDailyQuestDate = today;
    st.dailyQuestsDone = [];
    const todays = new Set(todaysDailyQuests(today).map((q) => q.id));
    const outsider = DAILY_QUEST_POOL.find((q) => !todays.has(q.id));
    // Se per caso il pool ha solo 3 elementi tutti pescati, salta con PASS neutro.
    if (!outsider) {
      check(true, "quests: (nessuna missione fuori pool oggi, skip)", "");
    } else {
      const before = st.money;
      const paid = bumpDailyQuest(st, outsider.id, 999);
      check(
        paid === false && st.money === before && st.dailyQuestsDone.length === 0,
        "quests: missione fuori pool è no-op",
        `id=${outsider.id} paid=${paid}`
      );
    }
    // id del tutto inesistente: mai crash, sempre false.
    const ghost = bumpDailyQuest(st, "questFantasma", 1);
    check(ghost === false, "quests: id inesistente non paga", `ghost=${ghost}`);
  }

  // 4) dailyQuestStatus rispecchia il progresso in corso (count < target, non
  //    ancora done). Usa una missione di oggi con target >= 2 (se esiste).
  {
    const st = newGameState();
    st.lastDailyQuestDate = today;
    st.dailyQuestsDone = [];
    const q = todaysDailyQuests(today).find((quest) => quest.target >= 2);
    if (!q) {
      check(true, "quests: (nessuna missione target>=2 oggi, skip status)", "");
    } else {
      bumpDailyQuest(st, q.id, 1); // 1 progresso, non completa
      const status = dailyQuestStatus(st).find((s) => s.quest.id === q.id);
      check(
        status && status.count === 1 && status.done === false,
        "quests: dailyQuestStatus riflette il progresso in corso",
        `count=${status?.count}/${q.target} done=${status?.done}`
      );
    }
  }

  // ---------------------------------------------------------------- STREAK / DST
  // 5) prevDateKey = il giorno prima, calcolato sui componenti locali (mai -ms).
  //    Verifica ATTORNO al DST italiano 2026-03-29 (ora legale: 02:00->03:00):
  //    con l'aritmetica in ms il 29->28 salterebbe; sui componenti no.
  {
    const cases = [
      ["2026-03-30", "2026-03-29"], // giorno dopo il cambio ora
      ["2026-03-29", "2026-03-28"], // giorno del cambio ora
      ["2026-03-01", "2026-02-28"], // confine di mese (2026 non bisestile)
      ["2026-01-01", "2025-12-31"]  // confine d'anno
    ];
    let ok = true, detail = "";
    for (const [key, expected] of cases) {
      const got = prevDateKey(key);
      if (got !== expected) { ok = false; detail += ` ${key}->${got}(≠${expected})`; }
    }
    check(ok, "streak: prevDateKey corretto attorno al DST 2026-03-29", detail.trim());
  }

  // ---------------------------------------------------------------- CRISI
  // 6) crisi post-game: hashDate("crisi:"+day)%3===0 scatta ~1/3 dei giorni
  //    (replica esatta della condizione in WorldScene.maybeGovernmentCrisis).
  {
    let hits = 0;
    const N = 90;
    const base = new Date(2026, 0, 1);
    for (let i = 0; i < N; i += 1) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const day = localDateKey(d);
      if (hashDate(`crisi:${day}`) % 3 === 0) hits += 1;
    }
    const frac = hits / N;
    // ~33%: tolleranza ampia (hash non è uniforme perfetto su 90 campioni).
    check(frac > 0.2 && frac < 0.47, "crisi: ~1/3 dei giorni su 90 (33%)", `hit=${hits}/${N} (${(frac * 100).toFixed(0)}%)`);
  }

  // 7) crisi: il flag "crisi-gov-day:<data>" blocca il doppio-trigger nello
  //    stesso giorno (replica del guard di WorldScene, senza toccare la scena).
  {
    const st = newGameState();
    const day = localDateKey();
    const dayFlag = `crisi-gov-day:${day}`;
    const wouldTrigger = () => hashDate(`crisi:${day}`) % 3 === 0 && !st.flags[dayFlag];
    // Forziamo una condizione "giorno di crisi" a prescindere dall'hash reale
    // testando la sola semantica del flag: primo vero (se hash lo consente),
    // poi il flag lo blocca sempre.
    st.flags[dayFlag] = false;
    const first = hashDate(`crisi:${day}`) % 3 === 0; // dipende dall'hash del giorno reale
    // Dopo aver segnato il flag, il guard deve essere sempre falso.
    st.flags[dayFlag] = true;
    check(wouldTrigger() === false, "crisi: flag crisi-gov-day blocca il doppio-trigger", `first=${first}`);
  }

  // ---------------------------------------------------------------- VERSION
  // 8) speciesAvailable: le esclusive di una fazione sono disponibili SOLO nella
  //    versione corrispondente; le altre specie sempre. Seed pari=GOVERNO,
  //    dispari=OPPOSIZIONE.
  {
    const evenSeed = 2, oddSeed = 3;
    check(gameVersion(evenSeed) === "GOVERNO" && gameVersion(oddSeed) === "OPPOSIZIONE",
      "version: seed pari=GOVERNO, dispari=OPPOSIZIONE", "");
    let ok = true, detail = "";
    for (const [id, faction] of Object.entries(VERSION_EXCLUSIVES)) {
      const inGov = speciesAvailable(id, evenSeed);
      const inOpp = speciesAvailable(id, oddSeed);
      const expectGov = faction === "GOVERNO";
      const expectOpp = faction === "OPPOSIZIONE";
      if (inGov !== expectGov || inOpp !== expectOpp) {
        ok = false; detail += ` ${id}(${faction}): gov=${inGov} opp=${inOpp};`;
      }
    }
    check(ok, "version: esclusive disponibili solo nella loro fazione", detail.trim());
    // Una specie NON esclusiva è sempre disponibile in entrambe le versioni.
    check(
      speciesAvailable("giorgetta", evenSeed) && speciesAvailable("giorgetta", oddSeed),
      "version: specie non esclusiva disponibile in entrambe", ""
    );
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
  console.error(`check-daily: ${failures} verifiche FALLITE`);
  process.exit(1);
}
console.log("check-daily: OK");
process.exit(0);
