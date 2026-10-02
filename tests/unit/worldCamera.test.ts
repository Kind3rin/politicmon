import {test} from 'node:test';
import assert from 'node:assert/strict';
import {worldCameraAxis} from '../../src/engine/worldCamera.ts';

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
test('camera: mappe grandi conservano tracking, limiti e coordinate intere',()=>{
  for(const span of [240,256,320,480,960])for(let center=-200;center<=span+200;center+=.5){
    assert.equal(worldCameraAxis(center,span,240),Math.max(0,Math.min(span-240,Math.round(center-120))));
  }
});
