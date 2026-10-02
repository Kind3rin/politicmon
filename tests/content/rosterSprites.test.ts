import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPECIES} from '../../src/data/species';
import {MONSTERS_WITH_PNG} from '../../src/art/monsters';
import {ANIMATED_MONSTERS} from '../../src/art/monsterFrames';

test('complete canonical roster has an idle PNG and four-frame animation sheet for every species',()=>{
 const ids=Object.keys(SPECIES).sort();assert.equal(ids.length,52);
 assert.deepEqual([...MONSTERS_WITH_PNG].sort(),ids);assert.deepEqual([...ANIMATED_MONSTERS].sort(),ids);
 for(const id of ids){
  const idle=readFileSync(`public/sprites/monsters/${id}.png`),strip=readFileSync(`public/sprites/monsters/animated/${id}.png`);
  assert.equal(idle.subarray(1,4).toString(),'PNG',id);assert.equal(strip.subarray(1,4).toString(),'PNG',id);
  assert.equal(strip.readUInt32BE(16),256,id);assert.equal(strip.readUInt32BE(20),64,id);
 }
});
