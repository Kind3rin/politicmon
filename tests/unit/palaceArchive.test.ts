import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGameState} from '../../src/game/state.ts';
import {PALACE_MODULES,palaceDossier,readPalaceDossier,verifyPalaceDossier} from '../../src/game/palaceArchive.ts';
import {ALLY_NAMES,type AllyId} from '../../src/game/coalition.ts';

function ready(){const s=newGameState();s.election={...s.election,phase:'ready'};return s;}
test('Palazzo: fatti effettivi, scelte uniche e nessuna mutazione durante la lettura',()=>{
 for(let count=0;count<=5;count++){
  const s=ready(),allies=Object.keys(ALLY_NAMES) as AllyId[];
  s.election={...s.election,revision:count,endorsementDistrictByAlly:Object.fromEntries(allies.slice(0,count).map(a=>[a,'nord'])),districts:s.election.districts.map((d,i)=>({...d,outcomes:i<count?[{action:'promise',variant:'risky',baseDelta:0,appliedDelta:0},{action:'debate',variant:'win',baseDelta:0,appliedDelta:0}]:[]}))};
  for(const ally of allies.slice(0,count))s.flags[`coalition-broken:${ally}`]=true;
  const before=structuredClone(s);
  for(const module of PALACE_MODULES){const data=palaceDossier(s,module);assert.ok(data.answer.startsWith(count+' '));assert.ok(data.options.includes(data.answer));assert.equal(new Set(data.options).size,3);}
  assert.deepEqual(s,before);
 }
});
test('Palazzo: un patto teso e rotto conta una volta, conservando entrambe le prove',()=>{
 const s=ready();s.flags['coalition-broken:campo_secretary']=true;
 s.coalition={...s.coalition,members:[{allyId:'campo_secretary',status:'strained',violationCount:1,reconciliationSpent:false}]};
 const data=palaceDossier(s,'silenzio');assert.equal(data.answer,'1 PATTI IN CRISI');assert.ok(data.lines.some(l=>l.includes('PATTO TESO')));assert.ok(data.lines.some(l=>l.includes('ROTTURA REGISTRATA')));
});
test('Palazzo: verifica non letta o errata non cambia risorse, flags o morale',()=>{
 const s=ready(),before=structuredClone(s);
 assert.equal(verifyPalaceDossier(s,'algoritmo',palaceDossier(s,'algoritmo').answer),'unread');assert.deepEqual(s,before);
 assert.equal(readPalaceDossier(s,'algoritmo'),true);const read=structuredClone(s);
 assert.equal(verifyPalaceDossier(s,'algoritmo','COPIA NON VERIFICATA'),'wrong');assert.deepEqual(s,read);assert.equal(readPalaceDossier(s,'algoritmo'),false);
});
test('Palazzo: quattro verifiche aprono lo studio una volta, senza alterare la campagna',()=>{
 const s=ready(),before=structuredClone(s);
 for(const module of PALACE_MODULES){assert.equal(readPalaceDossier(s,module),true);assert.equal(verifyPalaceDossier(s,module,palaceDossier(s,module).answer),'complete');const completed=structuredClone(s);assert.equal(verifyPalaceDossier(s,module,palaceDossier(s,module).answer),'closed');assert.deepEqual(s,completed);}
 assert.equal(s.flags.palaceRoomsComplete,true);assert.deepEqual({...s,flags:before.flags},before);
});
test('Palazzo: rivalida la risposta se cambiano i dati dopo aver aperto il dossier',()=>{
 const s=ready(),old=palaceDossier(s,'algoritmo').answer;readPalaceDossier(s,'algoritmo');
 s.election={...s.election,endorsementDistrictByAlly:{generorso:'feed'}};
 const before=structuredClone(s);assert.equal(verifyPalaceDossier(s,'algoritmo',old),'wrong');assert.deepEqual(s,before);
 assert.equal(verifyPalaceDossier(s,'algoritmo',palaceDossier(s,'algoritmo').answer),'complete');
});
test('Palazzo: salvataggi congelati e vecchi archivi completi rimangono consultabili',()=>{
 for(const phase of ['inactive','tour','locked','resolved'] as const){const s=ready();s.election={...s.election,phase};const before=structuredClone(s);assert.equal(readPalaceDossier(s,'talkshow'),false);assert.equal(verifyPalaceDossier(s,'talkshow','0 VITTORIE'),'closed');assert.deepEqual(s,before);}
 const s=ready();s.flags['palace-module:talkshow']=true;const before=structuredClone(s);assert.equal(palaceDossier(s,'talkshow').complete,true);assert.equal(readPalaceDossier(s,'talkshow'),false);assert.deepEqual(s,before);
});
