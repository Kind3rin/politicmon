import { test } from "node:test";
import assert from "node:assert/strict";
import { newGameState, exportSaveCode, importSaveCode } from "../../src/game/state.ts";
import { ATTO3_ENDINGS, applyAtto3EndingReward, earnedEndingSouvenirs } from "../../src/game/atto3Ending.ts";
import { campaignEpilogue } from "../../src/game/campaignEpilogue.ts";
import { calculateElectionResult, newElectionState } from "../../src/game/election.ts";
import { buyMonumentLevel, MONUMENT_COSTS } from "../../src/scenes/MonumentScene.ts";
import { newTechnoRun, pressTechno, tickTechno, claimTechnoReward, TECHNO_SEQUENCE, technoReward } from "../../src/game/genovaTechno.ts";
import { deriveSliceEnding } from "../../src/scenes/SliceEndingScene.ts";

test("Epilogue remembers individual promises and broken allies even when the table is empty", () => {
 const s=newGameState(), base=newElectionState(true);
 s.election={...base,result:calculateElectionResult(base.districts,true)};
 s.flags["coalition-broken:generorso"]=true;
 s.flags["a3.future.ally"]=true;
 s.morale.promises=[{id:"bus",status:"repaired",dueAt:3},{id:"sportello",status:"broken",dueAt:3}];
 const before=JSON.stringify(s), text=campaignEpilogue(s,ATTO3_ENDINGS.opposition_fractured).flatMap(s=>s.paragraphs).join(" ");
 assert.match(text,/GENERORSO: PATTO ROTTO/);assert.match(text,/GENERORSO AL TAVOLO/);assert.match(text,/CORSA DEL BORGO: RIPARATA IN RITARDO/);assert.match(text,/SPORTELLO APERTO: SCADUTA/);
 assert.equal(deriveSliceEnding(s),"fractured"); assert.equal(JSON.stringify(s),before);
});
test("Claimed ending souvenir survives save normalization and cannot multiply rewards", () => {
 for(const ending of Object.values(ATTO3_ENDINGS)){
  const s=newGameState();applyAtto3EndingReward(s,ending);
  const restored=importSaveCode(exportSaveCode(s));assert.ok(restored);
  assert.deepEqual(earnedEndingSouvenirs(restored),[ending.id]);const money=restored.money;
  assert.equal(applyAtto3EndingReward(restored,ending),false);assert.equal(restored.money,money);
 }
});
test("Monument requires the reviewed level and funds, charges exact steps, refuses repeats and max", () => {
 const s=newGameState();s.money=85000;
 for(let level=0;level<3;level++){
  const before=s.money;assert.equal(buyMonumentLevel(s,level),true);
  assert.equal(s.money,before-MONUMENT_COSTS[level]);assert.equal(buyMonumentLevel(s,level),false);
 }
 assert.equal(s.money,0);assert.equal(s.monumentLevel,3);assert.equal(buyMonumentLevel(s,3),false);
 const poor=newGameState();poor.money=9999;assert.equal(buyMonumentLevel(poor,0),false);assert.equal(poor.money,9999);
 assert.equal(buyMonumentLevel(poor,NaN),false);
});
test("Techno rejects early spam, distinguishes late input, freezes accessible mode and clamps claimed polls", () => {
 const ready=newTechnoRun(false);assert.equal(pressTechno(ready,"left"),ready);
 let late=ready;for(let i=0;i<5;i++)late=tickTechno(late,.25);late=pressTechno(late,"left");assert.equal(late.hits,0);assert.equal(late.misses,1);
 let run=newTechnoRun(true);run=tickTechno(run,9999);assert.equal(run.index,0);
 const s=newGameState();s.sondaggi=99;const before=s.money;assert.deepEqual(claimTechnoReward(s,run),{money:0,sondaggi:0});
 for(const key of TECHNO_SEQUENCE)run=pressTechno(run,key);
 assert.deepEqual(claimTechnoReward(s,run),{money:1200,sondaggi:1});assert.equal(s.money,before+1200);
 assert.deepEqual(claimTechnoReward(s,run),{money:0,sondaggi:0});assert.equal(technoReward(5).grade,"IN ONDA");
});
