import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGameState} from '../../src/game/state';
import {newElectionState,DISTRICT_IDS,resolveAction} from '../../src/game/election';
import {addAlly,applyLineRedEvent} from '../../src/game/coalition';
import {previewDistrictDecision,commitDistrictDecision} from '../../src/game/districtDecisions';
import {moraleExpMultiplier} from '../../src/game/morale';

function ready(){
 const state=newGameState();state.election=newElectionState(true);state.money=2000;
 for(const id of ['campo_secretary','quantum_centrist'] as const){const added=addAlly(state.coalition,id);assert.ok(added.ok);if(added.ok)state.coalition=added.state;}
 return state;
}
test('Tour previews are pure, display capped effects, and commit charges exactly once',()=>{
 for(const id of DISTRICT_IDS)for(const choice of ['prudent','risky','endorsement'] as const)for(const cohesion of [0,3,60]){
  const state=ready();state.morale.cohesion=cohesion;state.election.districts.find(d=>d.id===id)!.localConsensus=99;
  const before=structuredClone(state),preview=previewDistrictDecision(state,id,choice,'campo_secretary');
  assert.ok(preview.ok);assert.deepEqual(state,before);if(!preview.ok)continue;
  assert.equal(commitDistrictDecision(state,id,choice,'campo_secretary').ok,true);
  assert.equal(state.money-before.money,preview.moneyDelta);
  assert.equal(state.morale.cohesion-cohesion,preview.cohesionDelta);
  assert.equal(state.election.districts.find(d=>d.id===id)!.localConsensus-99,preview.localDelta);
  assert.deepEqual(state.morale.promises,before.morale.promises);assert.equal(state.morale.trust,before.morale.trust);
  assert.deepEqual(state.party,before.party);assert.deepEqual(state.bag,before.bag);
  const after=structuredClone(state);assert.equal(commitDistrictDecision(state,id,choice,'campo_secretary').ok,false);assert.deepEqual(state,after);
 }
});
test('Tour confirmation revalidates funds, ally membership and the global one-use endorsement',()=>{
 const state=ready();assert.ok(previewDistrictDecision(state,'nord','risky').ok);state.money=999;
 const before=structuredClone(state);assert.equal(commitDistrictDecision(state,'nord','risky').ok,false);assert.deepEqual(state,before);
 state.money=2000;assert.ok(previewDistrictDecision(state,'centro','endorsement','campo_secretary').ok);
 assert.ok(commitDistrictDecision(state,'sud','endorsement','campo_secretary').ok);
 const used=structuredClone(state);assert.deepEqual(previewDistrictDecision(state,'centro','endorsement','campo_secretary'),{ok:false,error:'SOSTEGNO GIÀ USATO: SUD'});
 assert.equal(commitDistrictDecision(state,'centro','endorsement','campo_secretary').ok,false);assert.deepEqual(state,used);
 state.coalition={...state.coalition,members:[]};const lost=structuredClone(state);
 assert.equal(commitDistrictDecision(state,'centro','endorsement','quantum_centrist').ok,false);assert.deepEqual(state,lost);
});
test('Tour debate opens preparation without recording a fabricated result; second action excludes the third',()=>{
 const state=ready(),before=structuredClone(state);
 assert.ok(commitDistrictDecision(state,'nord','debate').ok);assert.deepEqual(state,before);
 assert.ok(commitDistrictDecision(state,'nord','prudent').ok);
 const preview=previewDistrictDecision(state,'nord','endorsement','quantum_centrist');assert.ok(preview.ok);
 if(preview.ok)assert.match(preview.lines.join(' '),/RINUNCI A DIBATTITO/);
 assert.ok(commitDistrictDecision(state,'nord','endorsement','quantum_centrist').ok);
 assert.ok(state.flags['district-complete:nord']);assert.ok(state.flags['district-dossier:nord']);
 const complete=structuredClone(state);assert.equal(commitDistrictDecision(state,'nord','debate').ok,false);assert.deepEqual(state,complete);
 assert.equal(state.flags.tourComplete,undefined);
 for(const id of DISTRICT_IDS.filter(id=>id!=='nord')){
  // Domain fixture only: this does not certify a played battle victory.
  const battle=resolveAction(state.election,{districtId:id,action:'debate',variant:'loss',baseDelta:-4});assert.ok(battle.ok);if(battle.ok)state.election=battle.state;
  assert.ok(commitDistrictDecision(state,id,'prudent').ok);
 }
 assert.equal(state.election.phase,'ready');assert.equal(state.flags.tourComplete,true);
});
test('Tour risky promises break an already strained pact, lower earned EXP and retain civic debts',()=>{
 const state=ready();state.coalition=applyLineRedEvent(state.coalition,13).state;state.morale.cohesion=35;
 state.morale.promises=[{id:'bus',status:'broken',dueAt:3}];const before=structuredClone(state);
 const preview=previewDistrictDecision(state,'sud','risky');assert.ok(preview.ok);if(!preview.ok)return;
 assert.equal(preview.moneyDelta,-900);assert.equal(preview.cohesionDelta,-16);assert.match(preview.lines.join(' '),/CENTRISTA QUANTICO: PATTO ROTTO/);
 assert.ok(commitDistrictDecision(state,'sud','risky').ok);assert.equal(state.morale.cohesion,19);
 assert.equal(moraleExpMultiplier(state.morale),.92);assert.equal(state.flags['coalition-broken:quantum_centrist'],true);
 assert.deepEqual(state.morale.promises,before.morale.promises);assert.equal(state.morale.trust,before.morale.trust);
 assert.equal(state.morale.history.at(-1)?.cohesion,-16);
});
