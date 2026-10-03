import {test} from 'node:test';
import assert from 'node:assert/strict';
import {worldCameraAxis,worldViewportHeight} from '../../src/engine/worldCamera.ts';

test('camera: stanze piccole centrate e stabili anche durante il movimento',()=>{
  for(const center of [-50,8,40,80,152,220]){
    assert.equal(worldCameraAxis(center,160,240),-40);
    assert.equal(worldCameraAxis(center,128,180),-26);
  }
  for(const span of [1,127,128,159,160,179,180,239,240]){
    const offset=worldCameraAxis(8,span,240);
    assert.equal(Number.isInteger(offset),true);
    assert.ok(Math.abs((-offset)-(240-span+offset))<=1,'opposite margins differ by at most one pixel');
  }
});
test('portrait exploration reveals more map without changing its width or exceeding the stage',()=>{
  assert.equal(worldViewportHeight(388,663,true),410);
  assert.equal(worldViewportHeight(366,592,true),388);
  assert.equal(worldViewportHeight(296,316,true),256);
  assert.equal(worldViewportHeight(700,320,true),180);
  assert.equal(worldViewportHeight(388,663,false),180);
  assert.equal(worldViewportHeight(200,2000,true),480);
  for(const [width,height] of [[0,600],[320,0],[-1,600],[NaN,600],[320,Infinity]]){
    assert.equal(worldViewportHeight(width,height,true),180);
  }
  assert.equal(worldCameraAxis(120,256,410),-77,'a small room stays centred in the taller view');
  assert.equal(worldCameraAxis(700,960,410),495,'outdoor tracking uses the expanded height');
  assert.equal(worldCameraAxis(960,960,410),550,'the southern edge remains clamped');
});
test('camera: mappe grandi conservano tracking, limiti e coordinate intere',()=>{
  for(const span of [240,256,320,480,960])for(let center=-200;center<=span+200;center+=.5){
    assert.equal(worldCameraAxis(center,span,240),Math.max(0,Math.min(span-240,Math.round(center-120))));
  }
});
