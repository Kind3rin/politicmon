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
