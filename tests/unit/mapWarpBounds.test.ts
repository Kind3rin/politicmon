import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from '../../src/data/maps';

test('every map warp remains within its actual layout, including reused terraces',()=>{
  for(const map of Object.values(MAPS))for(const warp of map.warps){
    assert.ok(warp.y>=0 && warp.y<map.tiles.length,`${map.id}: exit y=${warp.y} outside map`);
    assert.ok(warp.x>=0 && warp.x<map.tiles[warp.y].length,`${map.id}: exit x=${warp.x} outside map`);
    const target=MAPS[warp.toMap];
    assert.ok(target,`${map.id}: missing target ${warp.toMap}`);
    assert.ok(warp.toY>=0 && warp.toY<target.tiles.length,`${map.id}: arrival y=${warp.toY} outside ${target.id}`);
    assert.ok(warp.toX>=0 && warp.toX<target.tiles[warp.toY].length,`${map.id}: arrival x=${warp.toX} outside ${target.id}`);
  }
});

test('visible exterior doors have a travel destination, including shared postgame layouts',()=>{
  for(const map of Object.values(MAPS).filter(m=>m.outdoor))for(let y=0;y<map.tiles.length;y++)for(let x=0;x<map.tiles[y].length;x++){
    if(!['d','D','g'].includes(map.tiles[y][x]))continue;
    assert.ok(map.warps.some(w=>w.x===x&&w.y===y),`${map.id}: visible door (${x},${y}) has no warp`);
  }
});
