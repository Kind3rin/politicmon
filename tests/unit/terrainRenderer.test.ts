import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TerrainRenderer, terrainCell, terrainHash, type TerrainSource } from '../../src/game/world/terrainRenderer';
const image={} as CanvasImageSource;
const source:TerrainSource={map:{id:'route1',tiles:['...','...','...']},revision:'0',sample:()=>({kind:'grass',image})};
test('terrain variants are stable, map-specific, and cover all four variants',()=>{
 const variants=new Set<number>();
 for(let x=-20;x<20;x++) {variants.add(terrainCell(source,x,4).variant);assert.equal(terrainHash('route1',x,4),terrainHash('route1',x,4));}
 assert.equal(variants.size,4); assert.notEqual(terrainHash('route1',4,7),terrainHash('borgo',4,7));
});
test('cardinal transition masks cover all 16 cases; diagonal cut-ins are separate',()=>{
 for(let mask=0;mask<16;mask++) {
  const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
  const s:TerrainSource={...source,sample:(x,y)=>({kind:dirs.some(([dx,dy],i)=>dx===x&&dy===y&&Boolean(mask&(1<<i)))?'water':'grass',image})};
  assert.equal(terrainCell(s,0,0).edges,mask);
 }
 const s:TerrainSource={...source,sample:(x,y)=>({kind:x===1&&y===-1?'water':'grass',image})};
 assert.equal(terrainCell(s,0,0).edges,0);assert.equal(terrainCell(s,0,0).corners,1);
});
test('scatter never enters water and zero density produces no details',()=>{
 const s={...source,map:{...source.map,scatter:[{kind:'flower',density:0}]}};
 for(let x=0;x<20;x++)assert.equal(terrainCell(s,x,0).scatter,undefined);
 s.map.scatter[0].density=1;assert.equal(terrainCell(s,1,1).scatter,'flower');
 assert.equal(terrainCell({...s,sample:()=>({kind:'water',image})},1,1).scatter,undefined);
});
test('cache rebuilds on map/revision changes and retries incomplete assets',()=>{
 let calls=0;
 const canvas={width:0,height:0,getContext:()=>({drawImage:()=>calls++,fillRect:()=>{},save:()=>{},restore:()=>{},beginPath:()=>{},rect:()=>{},clip:()=>{},moveTo:()=>{},lineTo:()=>{},closePath:()=>{},fill:()=>{},imageSmoothingEnabled:true})} as unknown as HTMLCanvasElement;
 const renderer=new TerrainRenderer(()=>canvas);
 renderer.prepare(source);assert.equal(calls,9);
 renderer.prepare(source);assert.equal(calls,9);
 renderer.prepare({...source,revision:'bridge-built'});assert.equal(calls,18);
 renderer.prepare({...source,map:{...source.map,id:'borgo'}});assert.equal(calls,27);
 const missing={...source,sample:()=>({kind:'grass' as const,image:null})};
 renderer.prepare(missing);assert.equal(renderer.stats().complete,false);
 renderer.prepare(source);assert.equal(calls,36);assert.equal(renderer.stats().complete,true);
 renderer.invalidate();renderer.prepare(source);assert.equal(calls,45);
});

test('pending assets do not allocate a new map bitmap each frame',()=>{
 const canvas={width:0,height:0,getContext:()=>({drawImage:()=>{},fillRect:()=>{},save:()=>{},restore:()=>{}})} as unknown as HTMLCanvasElement;
 const renderer=new TerrainRenderer(()=>canvas);
 const pending:TerrainSource={...source,assetRevision:0,sample:()=>({kind:'grass',image:null})};
 renderer.prepare(pending);renderer.prepare(pending);assert.equal(renderer.stats().builds,1);
 renderer.prepare({...source,assetRevision:1});assert.equal(renderer.stats().builds,2);assert.equal(renderer.stats().complete,true);
});
