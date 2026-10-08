import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {criticalSpriteEntries,rosterSpriteEntries} from '../../src/engine/preload';

// The roster left the awaited set (it opens the background queue), the tables did not change: together they are the original list.
test('canonical terrain and character tables preserve every original critical boot key and path',()=>{
 const entries=Object.entries({...criticalSpriteEntries(),...rosterSpriteEntries()}).filter(([key])=>!key.startsWith('terrain:')).sort(([a],[b])=>a<b?-1:a>b?1:0);
 // Changed on purpose: the odd-width building facades (3, 5, 7 and 9 tiles wide) replace the two-tile ones, see src/art/tiles.ts.
 assert.equal(entries.length,173);
 assert.equal(createHash('sha256').update(JSON.stringify(entries)).digest('hex'),'0cb21cb31b542f3aad1113d69af0295eb9c03b692d20b8f6014c578c64b806a6');
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
