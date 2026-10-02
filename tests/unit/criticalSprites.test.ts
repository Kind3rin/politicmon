import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {criticalSpriteEntries} from '../../src/engine/preload';

test('canonical terrain and character tables preserve every original critical boot key and path',()=>{
 const entries=Object.entries(criticalSpriteEntries()).sort(([a],[b])=>a<b?-1:a>b?1:0);
 assert.equal(entries.length,159);
 assert.equal(createHash('sha256').update(JSON.stringify(entries)).digest('hex'),'bff869ca7a7f2521e7729ac5f7cf1cb3e44682cc565615f112481579c223f7cd');
});
