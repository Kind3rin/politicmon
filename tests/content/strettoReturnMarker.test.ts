import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/data/maps";
import { TILES } from "../../src/art/tiles";

test("ritorno dallo Stretto: imbarco visibile e posizionato sull'acqua", () => {
  const stretto = MAPS.stretto;
  const ritorno = stretto.warps.find((warp) => warp.toMap === "capitale");

  assert.ok(ritorno, "manca il ritorno a Caput Mundi");
  assert.match(ritorno.markerLabel ?? "", /TRAGHETTO.*CAPUT MUNDI/);
  assert.match(ritorno.confirm ?? "", /CAPUT MUNDI/);
  const tile = stretto.tiles[ritorno.y]?.[ritorno.x];
  assert.equal(TILES[tile]?.water, true, "il marker deve indicare la vera casella navigabile");
});
