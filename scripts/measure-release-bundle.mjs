// Measure deployed code, including lazy chunks, against the unchanged build budget.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';

const base=new URL(process.env.PREVIEW_URL??'https://politicmon.vercel.app/');
const bytes=async url=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
 assert.ok(response.ok,`${url}: HTTP ${response.status}`);
 return Buffer.from(await response.arrayBuffer());
};
const html=await bytes(base),sources=new Map([[base.href,html]]);
const pending=[new URL('sw.js',base),...Array.from(html.toString().matchAll(/(?:src|href)="([^" ]+\.(?:js|css))"/g),m=>new URL(m[1],base))];
while(pending.length){
 const url=pending.shift();if(sources.has(url.href))continue;
 const source=await bytes(url);sources.set(url.href,source);
 if(!url.pathname.endsWith('.js')||url.pathname.endsWith('/sw.js'))continue;
 // Vite's emitted imports and preload lists use quoted, hashed basenames.
 for(const match of source.toString().matchAll(/["']((?:\.\/)?[\w-]+-[\w-]+\.(?:js|css))["']/g)){
  const chunk=new URL(match[1],url);if(chunk.origin===base.origin)pending.push(chunk);
 }
}
assert.ok([...sources.keys()].some(u=>/\/WorldScene-[\w-]+\.js$/.test(new URL(u).pathname)),'Lazy world chunk was not included in the measurement');
const sizes=[...sources].map(([url,source])=>({url,bytes:gzipSync(source).length}));
const total=sizes.reduce((sum,s)=>sum+s.bytes,0),budget=350*1024;
const result={base:base.href,sizes,total,budget,margin:budget-total};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/release-bundle.json',JSON.stringify(result,null,2)+'\n');
assert.ok(total<=budget,`Deployed code ${total} gzip bytes exceeds ${budget}`);
console.log(`PASS deployed bundle: ${total}/${budget} gzip bytes, ${result.margin} margin, ${sizes.length} files including lazy chunks.`);
