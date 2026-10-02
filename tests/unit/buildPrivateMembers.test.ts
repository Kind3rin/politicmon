import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import {minify} from 'terser';
import {compactPrivateMembers} from '../../scripts/build-private-members';

test('private-member compilation preserves constructor bindings, callbacks, public/wire keys and foreign same-name fields',async()=>{
 const root=mkdtempSync(join(tmpdir(),'politicmon-private-'));
 try{
  mkdirSync(join(root,'src'));writeFileSync(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',useDefineForClassFields:true,strict:true},include:['src']}));
  const source=`
    export class Counter {
      private counter=2; public t=11; public i=22; public u=33;
      constructor(private state:{counter:number},public readonly id:string,public initial=state.counter){this.counter+=state.counter+initial;}
      private value(){return this.counter+this.state.counter;}
      public run(foreign:{counter:number}){
        const callback=()=>this.value();
        return {letters:[this.t,this.i,this.u],id:this.id,counter:foreign.counter,value:callback(),bracket:this['counter'],wire:{state:this.state}};
      }
    }
    class ShorthandOnly {public snapshot:{wire:string}; constructor(private wire:string){this.snapshot={wire};}}
    export function check(){const c=new Counter({counter:4},'public-id');return {result:{counter:c.run({counter:99}),shorthand:new ShorthandOnly('keep-wire-key').snapshot},keys:Object.keys(c).filter(k=>!k.startsWith('__pmPrivate_'))};}
  `;
  const path=join(root,'src/fixture.ts');writeFileSync(path,source);
  const plugin=compactPrivateMembers(root);
  (plugin.buildStart as Function)();
  const transformed=(plugin.transform as Function)(source,path).code;
  assert.match(transformed,/__pmPrivate_/);assert.match(transformed,/foreign\.counter/);
  const compile=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,useDefineForClassFields:true}}).outputText;
  const ordinary=await import('data:text/javascript;base64,'+Buffer.from(compile(source)).toString('base64'));
  const compact=await minify(compile(transformed),{module:true,mangle:{properties:{regex:/^__pmPrivate_/}}});
  assert.ok(compact.code);assert.ok(!/\.__pmPrivate_|this\[['"]__pmPrivate_/.test(compact.code));
  const built=await import('data:text/javascript;base64,'+Buffer.from(compact.code).toString('base64'));
  assert.deepEqual(built.check().result,ordinary.check().result);
  assert.deepEqual(built.check().keys.filter((k:string)=>k==='id'),['id']);
 }finally{rmSync(root,{recursive:true,force:true});}
});
