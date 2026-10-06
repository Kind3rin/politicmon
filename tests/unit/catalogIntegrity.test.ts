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
  // The digest also pins the learnset variety pass (scripts/balance-learnsets.ts): re-run it and update the digest together.
  // Normalize the six deliberate opening-pacing edits; all other canonical fields, including the F0 sentence-case move names, remain pinned.
  const species = structuredClone(SPECIES);
  for (const id of ['giorgetta','ellyna','renzino']) {
    assert.equal(species[id].evolutions?.[0].level, 8);
    species[id].evolutions![0].level = 16;
  }
  for (const id of ['giorgiagon','schleinix','renzilla']) {
    const next = species[id].learnset.find(([lv])=>lv===9)!;
    assert.ok(next); next[0] = 16;
  }
  const digest=createHash('sha256').update(JSON.stringify(canonical({MOVES,SPECIES:species}))).digest('hex');
  assert.equal(digest,'e630ab656f0a6c6ad14066bc042c0e4e43915c4d3db501ae72fe31342bc40356');
  for(const [id,entry]of Object.entries({...MOVES,...SPECIES}))assert.equal(id,entry.id);
});
