import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MOVES} from '../../src/data/moves';
import {SPECIES} from '../../src/data/species';

function canonical(value:unknown):unknown {
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
  return value;
}

test('catalog identity deduplication preserves all 78 moves and 52 species fields',()=>{
  // Captured from the published data before removing duplicate names/keys.
  const digest=createHash('sha256').update(JSON.stringify(canonical({MOVES,SPECIES}))).digest('hex');
  assert.equal(digest,'86b189e723e4c5e577709acd0fa7290668a2dc70c6970126af0393e68677a32f');
  for(const [id,entry]of Object.entries({...MOVES,...SPECIES}))assert.equal(id,entry.id);
});
