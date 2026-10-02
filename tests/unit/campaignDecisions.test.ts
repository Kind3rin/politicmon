import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMPAIGN_CHOICES, commitCampaignDecision, diplomacyAccountLines, previewCampaignDecision, redeemCoalitionRepair, type CampaignKind } from "../../src/game/campaignDecisions.ts";
import { ALLY_NAMES, addAlly, applyLineRedEvent, coalitionBonuses, reconcileAlly } from "../../src/game/coalition.ts";
import { newElectionState } from "../../src/game/election.ts";
import { newGameState } from "../../src/game/state.ts";
import { moraleExpMultiplier } from "../../src/game/morale.ts";
import { shopAdjustments, shopPrice } from "../../src/game/governo.ts";
import { buildTrainerVictoryPlan } from "../../src/game/battle/postBattle.ts";
import { TRAINERS } from "../../src/data/trainers.ts";

function ready() {
  const state = newGameState(); state.money = 2000; state.sondaggi = 99; state.election = newElectionState(true);
  for (const id of ["campo_secretary", "quantum_centrist"] as const) { const added = addAlly(state.coalition, id); if (added.ok) state.coalition = added.state; }
  for (const id of ["campo_secretary", "quantum_centrist", "civic_mayor"]) state.flags[`coalition-candidate-seen:${id}`] = true;
  return state;
}

test("dossier: tutte le scelte sono pure e la conferma corrisponde ai delta effettivi", () => {
  for (const kind of Object.keys(CAMPAIGN_CHOICES) as CampaignKind[]) for (let index = 0; index < CAMPAIGN_CHOICES[kind].keys.length; index++) {
    for (const cohesion of [3, 60, 98]) {
      const state = ready(); state.morale.cohesion = cohesion;
      if (kind === "diplomacy" && index === 1) state.coalition = applyLineRedEvent(state.coalition, 10).state;
      const before = structuredClone(state), preview = previewCampaignDecision(state, kind, index);
      assert.deepEqual(state, before); assert.ok(preview.ok); if (!preview.ok) continue;
      assert.deepEqual(commitCampaignDecision(state, kind, index), preview);
      assert.equal(state.money - before.money, preview.moneyDelta);
      assert.equal(state.sondaggi - before.sondaggi, preview.pollsDelta);
      assert.equal(state.morale.cohesion - cohesion, preview.cohesionDelta);
      assert.deepEqual(state.party, before.party); assert.equal(state.morale.trust, before.morale.trust);
      const committed = structuredClone(state);
      assert.equal(commitCampaignDecision(state, kind, index).ok, false); assert.deepEqual(state, committed);
    }
  }
});

test("dossier: fondi insufficienti, candidati ignoti e slot pieni non mutano nulla", () => {
  const state = ready(); state.money = 0;
  const invalid = structuredClone(state);
  assert.equal(commitCampaignDecision(state, "future", 99).ok, false); assert.deepEqual(state, invalid);
  for (const [kind, index] of [["photo", 1], ["future", 0]] as const) {
    const before = structuredClone(state); assert.equal(commitCampaignDecision(state, kind, index).ok, false); assert.deepEqual(state, before);
  }
  state.flags = {}; assert.equal(previewCampaignDecision(state, "photo", 0).ok, false);
  state.money = 2000; const added = addAlly(state.coalition, "civic_mayor"); if (added.ok) state.coalition = added.state;
  const before = structuredClone(state); assert.equal(commitCampaignDecision(state, "future", 0).ok, false); assert.deepEqual(state, before);
});

test("foto: consenso al limite mostra il delta realmente disponibile", () => {
  const state = ready(); state.election = { ...state.election, districts: state.election.districts.map(d => d.id === "centro" ? { ...d, localConsensus: 98 } : d) };
  const preview = previewCampaignDecision(state, "photo", 1); assert.ok(preview.ok); if (preview.ok) assert.equal(preview.localDelta, 2);
});

test("diplomazia: consenso saturo può comunque rompere un patto, il dossier mostra il conto successivo", () => {
  const state = ready(); state.sondaggi = 100;
  state.coalition = applyLineRedEvent(state.coalition, 13).state;
  const before = structuredClone(state), preview = previewCampaignDecision(state, "diplomacy", 2);
  assert.ok(preview.ok); assert.deepEqual(state, before);
  assert.equal(preview.pollsDelta, 0); assert.equal(preview.cohesionDelta, -16);
  assert.match(preview.lines.join(" "), /AUMENTO EFFETTIVO 0.*PATTI POSSONO COMUNQUE STRAPPARSI/);
  assert.ok(!preview.lines.some(l => l.startsWith(`${ALLY_NAMES.quantum_centrist}:`) && l.includes("TESO")));
  assert.ok(commitCampaignDecision(state, "diplomacy", 2).ok);
  assert.equal(state.coalition.members.some(m => m.allyId === "quantum_centrist"), false);
  assert.deepEqual(state.morale.promises, before.morale.promises);
  assert.equal(state.morale.trust, before.morale.trust);
});

test("diplomazia: autonomia senza patto riparabile dichiara l'incasso e non inventa riparazioni", () => {
  const state = ready(), before = structuredClone(state), preview = previewCampaignDecision(state, "diplomacy", 1);
  assert.ok(preview.ok); assert.equal(preview.repairTarget, null); assert.ok(preview.moneyDelta > 0);
  assert.match(preview.lines.join(" "), /NESSUN PATTO RIPARATO: INCASSO/);
  assert.deepEqual(state, before);
  assert.ok(commitCampaignDecision(state, "diplomacy", 1).ok);
  assert.deepEqual(state.coalition, before.coalition); assert.deepEqual(state.morale, before.morale);
  assert.match(diplomacyAccountLines(state).join(" "), /PATTI E I SERVIZI HANNO CONTI DISTINTI/);
});

test("patto violato: coesione, EXP e ledger di rottura cambiano una volta", () => {
  const state = ready(); state.morale.cohesion = 35;
  state.coalition = applyLineRedEvent(state.coalition, 13).state;
  const result = commitCampaignDecision(state, "future", 2); assert.ok(result.ok);
  assert.equal(state.morale.cohesion, 19); assert.equal(moraleExpMultiplier(state.morale), .92);
  assert.equal(state.flags["coalition-broken:quantum_centrist"], true);
  assert.equal(state.coalition.members.some(m => m.allyId === "quantum_centrist"), false);
  assert.equal(state.morale.history.at(-1)?.cohesion, -16);
});

test("autonomia: il pagamento ripara subito, recupera COE e non cancella la violazione", () => {
  const state = ready(); state.coalition = applyLineRedEvent(state.coalition, 10).state;
  const beforeBonus = coalitionBonuses(state.coalition).bonus.territoryGain;
  assert.ok(commitCampaignDecision(state, "diplomacy", 1).ok);
  const member = state.coalition.members[0]; assert.equal(member.status, "reconciled"); assert.equal(member.violationCount, 1);
  assert.equal(member.reconciliationSpent, true); assert.equal(state.money, 1500); assert.equal(state.morale.cohesion, 66);
  assert.ok(coalitionBonuses(state.coalition).bonus.territoryGain > beforeBonus);
  assert.equal(redeemCoalitionRepair(state, member.allyId), false);
  assert.deepEqual(applyLineRedEvent(state.coalition, 10).broken, ["campo_secretary"]);
});

test("buono storico: versione esatta, nessun doppio pagamento o doppio recupero", () => {
  const state = ready(); state.coalition = applyLineRedEvent(state.coalition, 10).state;
  state.flags["reconcile-token:campo_secretary:v2"] = true;
  const before = structuredClone(state); assert.equal(redeemCoalitionRepair(state, "campo_secretary"), false); assert.deepEqual(state, before);
  state.flags["reconcile-token:campo_secretary:v1"] = true;
  assert.equal(redeemCoalitionRepair(state, "campo_secretary"), true); assert.equal(state.money, 2000); assert.equal(state.morale.cohesion, 66);
  const after = structuredClone(state); assert.equal(redeemCoalitionRepair(state, "campo_secretary"), false); assert.deepEqual(state, after);
  assert.equal(reconcileAlly({ ...before.coalition, locked: true }, "campo_secretary"), null);
});

test("alleanze: prezzi, rimborso e sondaggi usano davvero i bonus dichiarati", () => {
  const state = ready(); state.coalition = { ...state.coalition, members: [state.coalition.members[1]] };
  assert.deepEqual(shopAdjustments(state).find(e => e.label === "COALIZIONE"), { label: "COALIZIONE", percent: -15 });
  const item = { price: 1000 } as Parameters<typeof shopPrice>[1];
  const price = shopPrice(state, item), without = { ...state, coalition: { ...state.coalition, members: [] } };
  assert.ok(price < shopPrice(without, item));
  const added = addAlly(without.coalition, "steel_governor"); if (added.ok) state.coalition = added.state;
  assert.equal(buildTrainerVictoryPlan(state, TRAINERS.tycoon, false, () => 1).payout, Math.round(TRAINERS.tycoon.money * 1.15));
  const civic = addAlly(without.coalition, "civic_mayor"); if (civic.ok) state.coalition = civic.state;
  assert.equal(buildTrainerVictoryPlan(state, TRAINERS.tycoon, false, () => 1).sondaggiGain, 7);
});
