import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGameState} from '../../src/game/state.ts';
import {STARTERS,SPECIES,RIVAL_COUNTER} from '../../src/data/species.ts';
import {MOVES} from '../../src/data/moves.ts';
import {movesAtLevel} from '../../src/game/monster.ts';
import {starterDossier,firstDebateGuide,welcomeGuide} from '../../src/game/onboarding.ts';
import {typeMultiplier} from '../../src/data/poltypes.ts';
import {TRANSPORT_DESTINATIONS,resolveTransportDestination,transportRequirement} from '../../src/game/world/transport.ts';

test('Starter dossiers retain the whole Dex story, every actual starting move and correct matchup',()=>{
 for(const id of STARTERS){
  const identity=starterDossier(id,0).join(' ');assert.ok(identity.includes(SPECIES[id].dexLine));
  const moves=starterDossier(id,1).join(' '),types=starterDossier(id,2).join(' ');
  for(const slot of movesAtLevel(id,5)){const m=MOVES[slot.id];assert.ok(moves.includes(m.name));assert.ok(moves.includes(m.flavor));if(m.power>0)assert.ok(types.includes(`${m.name} CONTRO GIANNI: ×${typeMultiplier(m.type,SPECIES[RIVAL_COUNTER[id]].types)}`));}
  assert.ok(starterDossier(id,3).join(' ').includes('LIVELLO 16'));
 }
});
test('Guides are read-only, follow the current mission and disclose the hard tutorial level',()=>{
 const s=newGameState(),before=JSON.stringify(s);
 assert.ok(welcomeGuide(s).join(' ').includes('UN CANDIDATO TUTTO TUO'));assert.equal(JSON.stringify(s),before);
 assert.ok(firstDebateGuide(s,'ellyna')[0].includes('LIVELLO 4'));s.hardMode=true;assert.ok(firstDebateGuide(s,'ellyna')[0].includes('LIVELLO 7'));
 s.flags['starter-chosen']=true;assert.ok(welcomeGuide(s).join(' ').includes('PRIMO DIBATTITO'));
});
test('Travel resolver requires Dex and exact badges, excludes current city and never mutates state',()=>{
 const s=newGameState();assert.equal(resolveTransportDestination(s,'borgo','mediopoli'),null);
 s.flags['dex-received']=true;assert.equal(resolveTransportDestination(s,'borgo','mediopoli')?.mapId,'mediopoli');assert.equal(resolveTransportDestination(s,'borgo','borgo'),null);
 const euro=TRANSPORT_DESTINATIONS.find(d=>d.mapId==='eurotown')!;assert.match(transportRequirement(s,'borgo',euro),/AUDITEL/);
 s.badges=['auditel'];assert.equal(resolveTransportDestination(s,'borgo','eurotown')?.mapId,'eurotown');assert.equal(resolveTransportDestination(s,'borgo','capitale'),null);
 s.badges.push('spread');const before=JSON.stringify(s);assert.equal(resolveTransportDestination(s,'borgo','capitale')?.mapId,'capitale');assert.equal(resolveTransportDestination(s,'borgo','not-a-route'),null);assert.equal(JSON.stringify(s),before);
});


test('Training rival teaches without enemy heals; later rival fights keep their boss profile', async()=>{
 const {trainerAi}=await import('../../src/game/battle/trainerStyle.ts');
 assert.equal(trainerAi('rival1',false,false,0).canHeal,false);assert.equal(trainerAi('rival1',false,true,0).canHeal,false);
 assert.equal(trainerAi('rival2',false,false,0).canHeal,true);
});
