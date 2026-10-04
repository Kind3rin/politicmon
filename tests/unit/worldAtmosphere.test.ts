import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WorldAtmosphere,daylightAt,waterFrame,grassBend,footSurface} from '../../src/game/world/worldAtmosphere';
import type {MapDef} from '../../src/data/maps/types';
test('real clock selects four light periods including the midnight wrap',()=>{
 assert.equal(daylightAt(6).period,'alba');assert.equal(daylightAt(12).period,'giorno');assert.equal(daylightAt(18).period,'tramonto');
 assert.equal(daylightAt(23).lamps,true);assert.equal(daylightAt(24).period,'notte');assert.equal(daylightAt(12).alpha,0);
});
test('water visits four frames; reduced effects freeze water and grass',()=>{
 assert.deepEqual([0,.25,.5,.75,1].map(t=>waterFrame(t,false)),[0,1,2,3,0]);
 for(const time of [0,1,9,100]){assert.equal(waterFrame(time,true),0);assert.equal(grassBend(time,10,true,true),0);}
 assert.equal(grassBend(0,0,false,true,-1),-2);
});
test('foot surfaces select wet sounds in rain and distinguish sand, dirt and wood',()=>{
 assert.equal(footSurface('=','sereno'),'dirt');assert.equal(footSurface('z','sereno'),'sand');assert.equal(footSurface('q','sereno'),'wood');assert.equal(footSurface('=','pioggia'),'wet');
});
test('reduced effects remove weather, particles and existing step marks',()=>{
 let draws=0;const ctx=new Proxy({}, {get:(_,k)=>['save','restore','fillRect','beginPath','moveTo','lineTo','stroke'].includes(String(k))?()=>{if(k==='fillRect'||k==='stroke')draws++}:undefined,set:()=>true}) as CanvasRenderingContext2D;
 const map={id:'qa',outdoor:true,tiles:['.....'],weather:'pioggia'} as MapDef;
 const fx=new WorldAtmosphere();fx.step(8,8,'dirt',0,false);fx.update(.1,true);fx.drawSteps(ctx,0,0,false);assert.equal(draws,0);
 fx.draw(ctx,map,0,0,240,180,2,true,12,[]);assert.equal(draws,0);
 fx.draw(ctx,map,0,0,240,180,2,false,12,[]);assert.ok(draws>0);
});
