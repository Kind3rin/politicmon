import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dossierPages} from '../../src/ui/dossier';
import {wrapText} from '../../src/ui/widgets';
test('dossiers paginate long paragraphs without empty pages, clipped effects or omitted words',()=>{
 const paragraphs=['Il tavolo produce un altro tavolo.',Array.from({length:70},(_,i)=>`EFFETTO${i}`).join(' '),'FONDI -900€. COESIONE -16.'];
 for(const max of [5,9]){
  const pages=dossierPages(paragraphs,max);assert.ok(pages.every(p=>p.length>0&&p.length<=max));
  assert.deepEqual(pages.flat(),paragraphs.flatMap(p=>wrapText(p.toUpperCase(),34)));
 }
});
