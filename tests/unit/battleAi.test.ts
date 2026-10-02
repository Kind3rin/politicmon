import assert from "node:assert/strict";
import test from "node:test";
import { MOVES } from "../../src/data/moves";
import { DEX_ORDER } from "../../src/data/species";
import { createMonster, statsOf } from "../../src/game/monster";
import { chooseFoeMove, foeMoveScore, makeCombatant, type AiProfile } from "../../src/game/battle/sim";
import { BOSS_ART_IDS, trainerAi } from "../../src/game/battle/trainerStyle";

const deliberate: AiProfile = { whiff: 0, canHeal: true, finisher: true };
const pair = () => [makeCombatant(createMonster("giorgetta", 30)), makeCombatant(createMonster("ellyna", 30))] as const;

test("IA: valutare danni e immunità non consuma PP o abilità una tantum", () => {
  const foe=makeCombatant(createMonster("salistrobo",30)), target=makeCombatant(createMonster("contemorfo",30));
  const before=JSON.stringify([foe,target]);
  for(const move of Object.values(MOVES)) foeMoveScore(foe,target,move,deliberate,{sondaggi:80});
  chooseFoeMove(foe,target,deliberate,()=>.9,{sondaggi:80});
  assert.equal(JSON.stringify([foe,target]),before);
});

test("IA: preferisce il danno effettivo anche a una mossa con potenza nominale maggiore", () => {
  const [foe,target]=pair();foe.stages.atk=-6;foe.stages.spc=6;
  foe.mon.moves=[{id:"comizio",pp:35},{id:"tweet",pp:30}];
  assert.equal(chooseFoeMove(foe,target,deliberate,()=>.9).id,"tweet");
});

test("IA: cure e potenziamenti esauriti non sono candidati utili", () => {
  const [foe,target]=pair();
  assert.equal(foeMoveScore(foe,target,MOVES.mojito,deliberate),0);
  foe.mon.hp=Math.floor(statsOf(foe.mon).hp*.3);
  assert.ok(foeMoveScore(foe,target,MOVES.mojito,deliberate)>0);
  assert.equal(foeMoveScore(foe,target,MOVES.mojito,{...deliberate,canHeal:false}),0);
  foe.stages.atk=6;
  const capped={...MOVES.comizio,power:0,effect:{stat:{key:"atk" as const,stages:2,target:"self" as const}}};
  assert.equal(foeMoveScore(foe,target,capped,deliberate),0);
});

test("IA: TEFLON, GARANZIA e TELECAMERA rendono inutile uno status puro", () => {
  const [foe,target]=pair();
  const status={...MOVES.comizio,power:0,effect:{status:{id:"gaffe" as const,chance:100,target:"foe" as const}}};
  assert.ok(foeMoveScore(foe,target,status,deliberate)>0);
  for(const species of ["contemorfo","mattarellux"]) {
    assert.equal(foeMoveScore(foe,makeCombatant(createMonster(species,30)),status,deliberate),0);
  }
  target.mon.heldItem="telecamera";
  assert.equal(foeMoveScore(foe,target,status,deliberate),0);
  delete target.mon.heldItem;target.gaffeTurns=3;
  assert.equal(foeMoveScore(foe,target,status,deliberate),0);
});

test("IA: la priorità e il rinculo influiscono sulla decisione", () => {
  const [foe,target]=pair();foe.stages.spd=-6;
  const ordinary={...MOVES.comizio,effect:undefined},priority={...ordinary,effect:{priority:1}};
  assert.ok(foeMoveScore(foe,target,priority,deliberate)>foeMoveScore(foe,target,ordinary,deliberate));
  foe.mon.hp=1;
  const recoil={...ordinary,effect:{recoilRatio:1}};
  assert.ok(foeMoveScore(foe,target,recoil,deliberate)<foeMoveScore(foe,target,ordinary,deliberate));
});

test("IA: PP esauriti esclusi anche in una scelta subottimale", () => {
  const [foe,target]=pair();foe.mon.moves=[{id:"tweet",pp:0},{id:"comizio",pp:1},{id:"mojito",pp:10}];
  const fallible={...deliberate,whiff:1};
  assert.equal(chooseFoeMove(foe,target,fallible,()=>0).id,"comizio");
  assert.equal(chooseFoeMove(foe,target,fallible,()=>.999).id,"comizio");
  foe.mon.moves.forEach(s=>s.pp=0);
  assert.equal(chooseFoeMove(foe,target,deliberate,()=>0).id,"comizio");
});

test("IA: tutte le specie e le mosse producono punteggi finiti", () => {
  for(const id of DEX_ORDER) {
    const foe=makeCombatant(createMonster(id,45)), target=makeCombatant(createMonster("draghimon",45));
    for(const move of Object.values(MOVES)) {
      const score=foeMoveScore(foe,target,move,deliberate,{sondaggi:30});
      assert.ok(Number.isFinite(score)&&score>=0,`${id}/${move.id}`);
    }
  }
});

test("IA: boss con stili distinti e profili di difficoltà separati", () => {
  assert.equal(new Set(BOSS_ART_IDS).size,10);
  assert.ok(BOSS_ART_IDS.includes("stagista"));
  assert.equal(trainerAi("stagista",false,false,0).canHeal,false);
  assert.equal(trainerAi("stagista",false,true,0).canHeal,false);
  assert.equal(trainerAi("emittenza",true,false,1).whiff,.28);
  assert.equal(trainerAi("boss",false,true,3).whiff,.1);
  assert.equal(trainerAi("ladydirettiva",true,false,2).style,"control");
  assert.equal(trainerAi("futuro-anteriore",false,false,3).style,"setup");
  assert.equal(trainerAi("",false,true,3).canHeal,false);
  assert.equal(trainerAi("daily:one",false,true,3).canHeal,true);
});
