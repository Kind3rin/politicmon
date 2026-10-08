import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MAPS} from '../../src/data/maps.ts';
import {TILES} from '../../src/art/tiles.ts';

test('Palazzo: tutte le risorse dichiarate conservano checksum e dimensioni native',()=>{
 const paths=new Set();
 for(const name of ['palace','palace-dossiers']){
  const manifest=JSON.parse(readFileSync(`scripts/higgsfield-${name}.json`,'utf8'));
  for(const asset of manifest.assets)for(const path of asset.outputs??[asset.path]){
   const png=readFileSync(path);assert.equal(createHash('sha256').update(png).digest('hex'),asset.outputSha256s[path]);assert.equal(png.readUInt32BE(16),asset.width);assert.equal(png.readUInt32BE(20),asset.height);paths.add(path);
  }
 }
 assert.equal(paths.size,60);
});
test('Palazzo: pavimenti distinti, attori dedicati e porte storiche attraversabili',()=>{
 const ids=['palazzo_feed','palazzo_algoritmo','palazzo_factcheck','palazzo_talkshow','palazzo_silenzio','palazzo_feed_studio','palazzo_feed_terrazza'];
 const floors=new Set();
 for(const id of ids){const map=MAPS[id];floors.add(map.tileOverrides?.p);for(const npc of map.npcs)assert.ok(npc.spriteSet?.startsWith('palace-'));for(const warp of map.warps)assert.equal(TILES[map.tiles[warp.y][warp.x]].solid,false);}
 assert.equal(floors.size,7);
 assert.deepEqual(MAPS.palazzo_feed_terrazza.warps.map(w=>[w.x,w.y]),[[5,9],[6,9],[10,11],[11,11]]);
 for(const id of ids.slice(1,5))assert.deepEqual(MAPS[id].warps.map(w=>[w.x,w.y]),[[5,6]]);
});
