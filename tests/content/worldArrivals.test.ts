import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from '../../src/data/maps.ts';
import {TILES} from '../../src/art/tiles.ts';
import {arrivesBesideExit} from '../../src/data/maps/portalGeometry.ts';

test('arrivi: ogni warp porta a un tile esistente e attraversabile',()=>{
  for(const map of Object.values(MAPS))for(const warp of map.warps){
    const target=MAPS[warp.toMap],tile=TILES[target?.tiles[warp.toY]?.[warp.toX]];
    assert.ok(tile,map.id+' -> '+warp.toMap+' missing arrival');
    if(tile.water)assert.ok(map.outdoor&&target.outdoor,'water arrival only for outdoor transit');
    else assert.equal(tile.solid,false,map.id+' -> '+warp.toMap+' solid arrival');
  }
  for(const x of [3,13])assert.equal(MAPS.futuro_sede.tiles[5][x],'p','historical Future arrival remains a clear floor');
  const hq=MAPS.futuro_sede;
  for(const warp of hq.warps)assert.equal(hq.tiles[warp.y][warp.x],'c','Future threshold belongs on the actual portal');
  for(let y=0;y<hq.tiles.length;y++)for(let x=0;x<hq.tiles[y].length;x++){
    if(hq.tiles[y][x]==='c')assert.ok(hq.warps.some(w=>w.x===x&&w.y===y),'no decorative false doorway');
  }
});
test('arrivi: ingresso e uscita interna possono trovarsi sui quattro lati',()=>{
  const exit={x:16,y:8};
  for(const [toX,toY]of [[16,7],[16,9],[15,8],[17,8]])assert.equal(arrivesBesideExit({toX,toY},exit),true);
  for(const [toX,toY]of [[16,8],[15,7],[17,9],[16,6],[16,10],[1,8]])assert.equal(arrivesBesideExit({toX,toY},exit),false);
  const returned=MAPS.diplomacy_terrace.warps[0],exitToTerrace=MAPS.diplomacy_lobby.warps.find(w=>w.toMap==='diplomacy_terrace')!;
  assert.equal(arrivesBesideExit(returned,exitToTerrace),true);
});
