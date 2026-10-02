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

test('fixed engine aliases survive separate chunk minification while Scene and payload contracts retain names',async()=>{
 const root=mkdtempSync(join(tmpdir(),'politicmon-engine-'));
 try{
  mkdirSync(join(root,'src/engine'),{recursive:true});
  writeFileSync(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',useDefineForClassFields:true,strict:true},include:['src']}));
  const engine=`export class Screen {private calls=0;constructor(public readonly ctx:{text:string}){} text(value:string){this.calls++;return this.ctx.text+value+this.calls;} get color(){return this.ctx.text;} set color(value:string){this.ctx.text=value;}}`;
  const consumer=`import {Screen} from './engine/screen';interface Scene {draw():string;update():void;} export function check(){const screen=new Screen({text:'wire:'});screen.color='kept:';const foreign={text:'public',ctx:'public'};const scene:Scene={draw:()=>screen.text('hello'),update:()=>{}};scene.update();return {text:scene.draw(),ctx:foreign.ctx,color:screen.color,wire:{text:foreign.text},contracts:Object.keys(scene)};}`;
  const enginePath=join(root,'src/engine/screen.ts'),consumerPath=join(root,'src/consumer.ts');writeFileSync(enginePath,engine);writeFileSync(consumerPath,consumer);
  const plugin=compactPrivateMembers(root);(plugin.buildStart as Function)();
  const transform=(s:string,p:string)=>(plugin.transform as Function)(s,p).code;
  const compile=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,useDefineForClassFields:true}}).outputText;
  const compact=async(s:string)=>{
   const r=await minify(compile(s),{module:true,mangle:{properties:{regex:/^__pmPrivate_/}}});assert.ok(r.code);return r.code;
  };
  // Each chunk gets an independent Terser invocation, as Vite does.
  const compiledEngine=await compact(transform(engine,enginePath));
  const url='data:text/javascript;base64,'+Buffer.from(compiledEngine).toString('base64');
  const compiledConsumer=await compact(transform(consumer,consumerPath).replace('./engine/screen',url));
  assert.match(compiledEngine,/\$[0-9a-z]/);assert.match(compiledConsumer,/\.draw\(/);assert.match(compiledConsumer,/\.update\(/);
  const module=await import('data:text/javascript;base64,'+Buffer.from(compiledConsumer).toString('base64'));
  assert.deepEqual(module.check(),{text:'kept:hello1',ctx:'public',color:'kept:',wire:{text:'public'},contracts:['draw','update']});
 }finally{rmSync(root,{recursive:true,force:true});}
});
