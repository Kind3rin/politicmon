import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/data/maps";
import { TILES } from "../../src/art/tiles";

const ROUTES = [
  ["stretto", "offshore", "PARADISO OFFSHORE"],
  ["offshore", "stretto", "STRETTO"],
  ["offshore", "bruxelles", "BRUXELLES"],
  ["bruxelles", "offshore", "PARADISO OFFSHORE"]
] as const;

test("continuità marittima: ogni rotta ha marker, destinazione e conferma", () => {
  for (const [from, to, label] of ROUTES) {
    const warps = MAPS[from].warps.filter((warp) => warp.toMap === to);
    assert.ok(warps.length > 0, `${from} -> ${to}: rotta assente`);
    assert.equal(warps.filter((warp) => warp.markerLabel?.includes(label)).length, 1, `${from} -> ${to}: marker ambiguo`);
    assert.ok(warps.every((warp) => warp.confirm?.includes(label)), `${from} -> ${to}: conferma incompleta`);
    assert.ok(warps.every((warp) => {
      const tile = TILES[MAPS[from].tiles[warp.y]?.[warp.x]];
      return tile?.water || tile?.overWater;
    }), `${from} -> ${to}: uscita fuori dall'acqua o dal molo`);
  }
});
