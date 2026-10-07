import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {criticalSpriteEntries,rosterSpriteEntries} from '../../src/engine/preload';

// The roster left the awaited set (it opens the background queue), the tables did not change: together they are the original list.
test('canonical terrain and character tables preserve every original critical boot key and path',()=>{
 const entries=Object.entries({...criticalSpriteEntries(),...rosterSpriteEntries()}).filter(([key])=>!key.startsWith('terrain:')).sort(([a],[b])=>a<b?-1:a>b?1:0);
 assert.equal(entries.length,159);
 assert.equal(createHash('sha256').update(JSON.stringify(entries)).digest('hex'),'bff869ca7a7f2521e7729ac5f7cf1cb3e44682cc565615f112481579c223f7cd');
});

test('all twenty-four authored terrain variants are critical boot assets',()=>{
 const entries=criticalSpriteEntries();
 const variants=Object.keys(entries).filter(key=>key.startsWith('terrain:'));
 assert.equal(variants.length,24);
 for(const kind of ['grass','path','sand','asphalt','floor','water'])for(let i=0;i<4;i++)
  assert.equal(entries[`terrain:${kind}:${i}`],`tiles/m2/${kind}-${i}.png`);
});

test('the title does not wait for the roster',()=>{
 assert.equal(Object.keys(criticalSpriteEntries()).filter(key=>key.startsWith('mon:')).length,0);
 assert.ok(Object.keys(rosterSpriteEntries()).length>50);
});
