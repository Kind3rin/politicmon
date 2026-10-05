import {test} from 'node:test';
import assert from 'node:assert/strict';
import {followCamera,unzoomWorldPoint} from '../../src/engine/worldCamera';
test('follow converges equally at 30 and 60 fps without overshooting',()=>{
 const run=(hz:number)=>{let x=0;for(let i=0;i<hz/2;i++)x=followCamera(x,100,1/hz);return x;};
 assert.ok(Math.abs(run(30)-run(60))<.001);assert.ok(run(60)<100&&run(60)>99);
 assert.equal(followCamera(0,100,1/60,true),100);
});
test('pointer inversion preserves targets during the ten-percent dialogue zoom',()=>{
 const x=48,y=95,w=240,h=380,z=1.1;
 const p=unzoomWorldPoint(w/2+(x-w/2)*z,h/2+(y-h/2)*z,w,h,z);
 assert.ok(Math.abs(p.x-x)<.001&&Math.abs(p.y-y)<.001);
});
import {phoneWorldZoom,zoomedCameraAxis,clearanceCeiling,worldCameraAxis} from '../../src/engine/worldCamera';
import {stickDirection} from '../../src/engine/stick';
test('phones in portrait enlarge the world, everything else keeps the original scale',()=>{
 assert.equal(phoneWorldZoom(375,true,true),1.5);
 assert.equal(phoneWorldZoom(412,true,true),1.25);
 assert.equal(phoneWorldZoom(320,true,true),1.75);
 assert.equal(phoneWorldZoom(375,true,false),1);
 assert.equal(phoneWorldZoom(375,false,true),1);
 assert.equal(phoneWorldZoom(800,true,true),1);
 assert.equal(phoneWorldZoom(0,true,true),1);
});
test('a zoomed camera never shows past the map edge and never moves the player off screen',()=>{
 const mapW=480,view=240,z=1.5;
 for(const player of [8,60,240,420,472]){
  const cam=zoomedCameraAxis(player+8,mapW,view,z);
  const screenX=view/2+(player+8-cam-view/2)*z;
  assert.ok(screenX>=0&&screenX<=view,`player ${player} lands at ${screenX}`);
  const left=cam+(view-view/z)/2,right=cam+(view+view/z)/2;
  assert.ok(left>=0&&right<=mapW,`window ${left}..${right}`);
 }
 assert.equal(zoomedCameraAxis(100,480,240,1),worldCameraAxis(100,480,240));
});
test('a zoomed camera in a narrow room stays centred',()=>{
 const cam=zoomedCameraAxis(80,160,240,1.5);
 assert.equal(cam+(240-240/1.5)/2,Math.round((160-240/1.5)/2));
});
test('the player keeps the requested clearance under the top strip at any zoom',()=>{
 for(const z of [1,1.25,1.5]){
  const player=20,view=520,clearance=74;
  const cam=clearanceCeiling(player,view,z,clearance);
  const screenY=view/2+(player-cam-view/2)*z;
  assert.ok(Math.abs(screenY-clearance)<.001,`zoom ${z}: ${screenY}`);
 }
});
test('the stick holds its axis through a drifting thumb and turns on a clear change',()=>{
 assert.equal(stickDirection(5,5,null),null);
 assert.equal(stickDirection(30,10,null),'right');
 assert.equal(stickDirection(30,35,'right'),'right','a small lead does not flip the axis');
 assert.equal(stickDirection(30,45,'right'),'down','a clear lead turns the corner');
 assert.equal(stickDirection(-35,30,'down'),'down');
 assert.equal(stickDirection(-45,30,'down'),'left');
 assert.equal(stickDirection(0,-40,'left'),'up');
});
