import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGameState,beginTemporaryParty,serializeGameState,exportSaveCode,importSaveCode,parseGameState} from '../../src/game/state.ts';
import {createMonster} from '../../src/game/monster.ts';
import {CASINO_CHIP_CAP,CASINO_PRIZES,commitCasino,previewCasino,slotPayout} from '../../src/game/casino.ts';
import {COPPA_RULES,initTournament,coppaOpponentDef,prepareCoppaParty,buildGhostTeam,playerOpponent} from '../../src/game/tournament.ts';
import {buildTrainerTeam} from '../../src/game/world/battleCoordinator.ts';

test('All 125 slot outcomes match disclosed probability and expected return',()=>{
 let triples=0,pairs=0,zero=0,gross=0;
 for(let a=0;a<5;a++)for(let b=0;b<5;b++)for(let c=0;c<5;c++){
  const payout=slotPayout([a,b,c]);gross+=payout;
  if(a===b&&b===c)triples++;else if(payout===5)pairs++;else zero++;
  const s=newGameState();s.chips=5;let i=0;
  const result=commitCasino(s,{kind:'slot'},()=>[a,b,c][i++]/5+.01);
  assert.ok(result.ok);assert.equal(s.chips,payout);assert.equal(result.net,payout-5);assert.equal(i,3);
 }
 assert.deepEqual([triples,pairs,zero],[5,60,60]);assert.equal(gross/125,4.96);
 assert.equal(slotPayout([99,99,99]),0);
});
test('Casino reviews and denied transactions consume neither money nor randomness',()=>{
 const s=newGameState();s.money=0;s.chips=0;
 const before=JSON.stringify(s);const rng=()=>{throw Error('Randomness consumed');};
 for(const action of [{kind:'slot'},{kind:'exchange',sell:false,units:1},{kind:'exchange',sell:true,units:1},{kind:'prize',index:0},{kind:'club',index:0}] as const){
  assert.equal(previewCasino(s,action).ok,false);assert.equal(commitCasino(s,action,rng).ok,false);
 }
 assert.equal(JSON.stringify(s),before);
 s.chips=100;s.money=1000;const funded=JSON.stringify(s);
 for(const action of [{kind:'slot'},{kind:'exchange',sell:false,units:1},{kind:'prize',index:0},{kind:'club',index:0}] as const)assert.ok(previewCasino(s,action).ok);
 assert.equal(JSON.stringify(s),funded);
});
test('Exchange has exact round-trip loss, bounded capacity, and unique reusable prizes',()=>{
 const s=newGameState();s.money=1000;
 assert.ok(commitCasino(s,{kind:'exchange',sell:false,units:10}).ok);assert.equal(s.chips,900);assert.equal(s.money,0);
 assert.ok(commitCasino(s,{kind:'exchange',sell:true,units:10}).ok);assert.equal(s.money,800);assert.equal(s.chips,0);
 assert.equal(commitCasino(s,{kind:'exchange',sell:false,units:-1}).ok,false);
 s.chips=CASINO_CHIP_CAP;assert.equal(commitCasino(s,{kind:'exchange',sell:false,units:1}).ok,false);
 const before=s.chips;const result=commitCasino(s,{kind:'slot'},()=>.99);assert.ok(result.ok);assert.equal(result.gross,5);assert.equal(s.chips,before);
 const index=2,p=CASINO_PRIZES[index];s.chips=p.chips;
 assert.ok(commitCasino(s,{kind:'prize',index}).ok);assert.equal(s.chips,0);assert.equal(s.bag[p.itemId],1);
 s.chips=p.chips;assert.equal(commitCasino(s,{kind:'prize',index}).ok,false);assert.equal(s.chips,p.chips);
});
test('One daily invitation closes all three tables, survives import, and pays actual clamped morale',()=>{
 for(let table=0;table<3;table++)for(let outcome=0;outcome<3;outcome++){
  const s=newGameState();s.chips=30;s.money=1000;s.sondaggi=100;s.morale.trust=0;s.morale.cohesion=0;
  const result=commitCasino(s,{kind:'club',index:table},()=>outcome/3+.01,'2026-10-02');assert.ok(result.ok);assert.equal(s.chips,15);
  const restored=importSaveCode(exportSaveCode(s));assert.ok(restored);
  for(let other=0;other<3;other++)assert.equal(commitCasino(restored,{kind:'club',index:other},()=>{throw Error('Daily repeat rolled');},'2026-10-02').ok,false);
  assert.ok(previewCasino(restored,{kind:'club',index:table},'2026-10-03').ok);
  if(table===1){assert.equal(s.morale.trust,0);assert.equal(s.morale.cohesion,0);assert.ok(result.lines.includes('FIDUCIA 0. COESIONE 0.'));}
 }
});
test('Chip import rejects negative, non-finite and fractional currency and caps oversized wallet',()=>{
 for(const [raw,expected] of [[-10,0],[12.8,12],[1e10,CASINO_CHIP_CAP],['20',0],[null,0]] as const){
  const s=newGameState();const restored=parseGameState(JSON.stringify({...s,chips:raw}));assert.ok(restored);assert.equal(restored.chips,expected);
 }
});
test('Temporary battle party never replaces campaign party in any serialized save or export',()=>{
 const s=newGameState();s.party=[createMonster('ellyna',17),createMonster('salisound',23)];s.party[0].hp=7;s.party[0].moves[0].pp=1;
 const original=s.party,snapshot=structuredClone(original),rule=COPPA_RULES.find(r=>r.id==='level50')!;
 const prepared=prepareCoppaParty(original,rule);assert.ok(prepared.ok);const restore=beginTemporaryParty(s,prepared.party);
 assert.throws(()=>beginTemporaryParty(s,[]),/already active/);
 s.party[0].hp=0;s.party[0].exp+=100;s.party[0].moves[0].pp=0;s.money-=1500;s.bag.maalox=2;
 assert.deepEqual(JSON.parse(serializeGameState(s)).party,snapshot);
 const imported=importSaveCode(exportSaveCode(s));assert.ok(imported);assert.deepEqual(imported.party,snapshot);assert.equal(imported.money,s.money);assert.equal(imported.bag.maalox,2);
 assert.equal(s.party,prepared.party);restore();restore();assert.equal(s.party,original);assert.deepEqual(s.party,snapshot);
});
test('Coppa dossier and actual opponents agree under all five rules even in hard mode',()=>{
 for(const hard of [false,true])for(const rule of COPPA_RULES){
  const s=newGameState();s.hardMode=hard;
  const def=coppaOpponentDef(initTournament('2026-10-02'),rule)!;
  const actual=buildTrainerTeam(s,def,{fallbackTeam:()=>[],bossTrainerIds:[]});
  assert.deepEqual(actual.map(m=>[m.speciesId,m.level]),def.team.map(([id,level])=>[id,level]));
  if(rule.id==='level50'){assert.ok(actual.every(m=>m.level===50));assert.ok(buildGhostTeam(playerOpponent(initTournament('2026-10-02'))!,55,true).every(m=>m.level===50));}
 }
});
