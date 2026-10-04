import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {criticalSpriteEntries} from '../../src/engine/preload';

test('canonical terrain and character tables preserve every original critical boot key and path',()=>{
 const entries=Object.entries(criticalSpriteEntries()).filter(([key])=>!key.startsWith('terrain:')).sort(([a],[b])=>a<b?-1:a>b?1:0);
 assert.equal(entries.length,159);
 assert.equal(createHash('sha256').update(JSON.stringify(entries)).digest('hex'),'bff869ca7a7f2521e7729ac5f7cf1cb3e44682cc565615f112481579c223f7cd');
});

test('all twenty authored terrain variants are critical boot assets',()=>{
 const entries=criticalSpriteEntries();
 const variants=Object.keys(entries).filter(key=>key.startsWith('terrain:'));
 assert.equal(variants.length,20);
 for(const kind of ['grass','path','sand','asphalt','floor'])for(let i=0;i<4;i++)
  assert.equal(entries[`terrain:${kind}:${i}`],`tiles/m2/${kind}-${i}.png`);
});
