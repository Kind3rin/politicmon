// Verifica la TOPOLOGIA della traversata Caput Mundi ⇄ Stretto sui dati MAPS:
// warp diretti (niente mappa "mare"), celle d'approdo valide, coerenza andata/ritorno.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const res = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const out = [];
  const A = (n, c) => out.push({ n, ok: !!c });

  const tileAt = (map, x, y) => {
    const row = map.tiles[y];
    return row ? row[x] : undefined;
  };
  const isSolid = (ch) => Boolean(TILES[ch]?.solid);
  const isWater = (ch) => Boolean(TILES[ch]?.water);

  // 1) La mappa "mare" è stata rimossa.
  A("mappa 'mare' rimossa", MAPS["mare"] === undefined);

  const cap = MAPS["capitale"];
  const str = MAPS["stretto"];
  A("capitale esiste", !!cap);
  A("stretto esiste", !!str);

  // 2) Nessun warp residuo punta a "mare".
  const allWarps = Object.values(MAPS).flatMap((m) => (m.warps ?? []).map((w) => ({ id: m.id, w })));
  A("nessun warp punta più a 'mare'", allWarps.every((e) => e.w.toMap !== "mare"));

  // 3) Andata: capitale ha un warp alla punta del MOLO (6,21) → stretto.
  const imbarco = cap.warps.find((w) => w.x === 6 && w.y === 21);
  A("imbarco capitale (6,21) esiste", !!imbarco);
  A("imbarco → stretto", imbarco && imbarco.toMap === "stretto");
  A("imbarco gated da veh-traghetto", imbarco && imbarco.requiresFlag === "veh-traghetto");
  // Cella d'approdo nello stretto: valida (in mappa) e sull'acqua (arrivo in traghetto).
  if (imbarco) {
    const ch = tileAt(str, imbarco.toX, imbarco.toY);
    A(`approdo stretto (${imbarco.toX},${imbarco.toY}) dentro mappa`, ch !== undefined);
    A("approdo stretto è ACQUA (traghetto)", isWater(ch));
  }

  // 4) Ritorno: una darsena visibile in acqua porta a capitale.
  const ritorni = str.warps.filter((w) => w.toMap === "capitale");
  A("stretto ha warp di ritorno → capitale", ritorni.length >= 1);
  for (const r of ritorni) {
    const departure = tileAt(str, r.x, r.y);
    A(`darsena stretto (${r.x},${r.y}) è ACQUA`, isWater(departure));
    A("darsena stretto ha marker CAPUT MUNDI", /CAPUT MUNDI/.test(r.markerLabel ?? ""));
    A("darsena stretto chiede conferma", /CAPUT MUNDI/.test(r.confirm ?? ""));
    const ch = tileAt(cap, r.toX, r.toY);
    A(`ritorno capitale (${r.toX},${r.toY}) dentro mappa`, ch !== undefined);
    A(`ritorno capitale (${r.toX},${r.toY}) NON su tile solido`, ch !== undefined && !isSolid(ch));
  }

  // 5) La cella d'imbarco a capitale (6,21) non è solida (ci cammini sopra).
  const chImb = tileAt(cap, 6, 21);
  A("cella imbarco capitale (6,21) calpestabile", chImb !== undefined && !isSolid(chImb));

  return out;
});

await browser.close();
let fail = 0;
for (const r of res) { console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.n}`); if (!r.ok) fail++; }
console.log(`\n${res.length - fail}/${res.length} check`);
process.exit(fail ? 1 : 0);
