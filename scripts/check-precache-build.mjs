// Validate the actual built inventory and worker installation, including failure.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
const files=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(d,e.name)):[join(d,e.name)]);
const all=files('dist'),manifest=all.find(p=>/precache-runtime-[^/]+\.json$/.test(p));
assert.ok(manifest,'Missing versioned inventory');
const groups=JSON.parse(readFileSync(manifest,'utf8'));
const worker=readFileSync('dist/sw.js','utf8');
assert.ok(worker.includes(manifest.slice(5)),'Worker references a different inventory');
async function install(status=200,body=JSON.stringify(groups)){
 const handlers={},added=[],stored=[];let pending,requests=0;
 const cache={addAll:async paths=>added.push(...paths),put:async(path,response)=>stored.push([path,await response.text()])};
 vm.runInNewContext(worker,{self:{addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{},location:{origin:'https://fixture.test'}},caches:{open:async()=>cache},fetch:async(path,options)=>{assert.equal(path,'./'+manifest.slice(5));assert.equal(options.cache,'reload');requests++;return new Response(body,{status});},URL});
 handlers.install({waitUntil:p=>pending=p});
 try{await pending;return{added,stored,requests,error:null};}catch(error){return{added,stored,requests,error};}
}
const result=await install();assert.equal(result.error,null);assert.equal(result.requests,1);
const actual=new Set([...result.added,...result.stored.map(([path])=>path)]);
const expected=new Set(['./',...all.filter(p=>!['dist/sw.js','dist/intro.mp4','dist/og.png'].includes(p)).map(p=>'./'+p.slice(5))]);
assert.deepEqual(actual,expected,'Precache lost, duplicated or added build resources');
assert.equal(result.added.length,new Set(result.added).size);
assert.equal(result.stored[0][1],JSON.stringify(groups));
for(const [status,body] of [[503,'unavailable'],[200,'malformed json']]){
 const failed=await install(status,body);assert.ok(failed.error);assert.deepEqual(failed.added,[]);assert.deepEqual(failed.stored,[]);
}
console.log(`PASS: ${actual.size} exact build resources, one inventory request, unavailable/malformed inventory rejects installation.`);
