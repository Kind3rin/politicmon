import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore: Node-only audit, deliberately outside runtime.
import {inputContract} from '../../scripts/audit-input-contracts.mjs';

for(const quote of ["'",'"'])test(`input audit recognizes ${quote} inputs and rejects missing contracts`,()=>{
 const input=`input.wasPressed(${quote}down${quote}); input.wasPressed(${quote}a${quote});`;
 assert.deepEqual(inputContract(`${input} screen.text('► A: SCEGLI B: ESCI');`),{focus:true,aHint:true,bHint:true});
 assert.deepEqual(inputContract(`${input} screen.text('A: SCEGLI B: ESCI');`),{focus:false,aHint:true,bHint:true});
 assert.deepEqual(inputContract(`${input} screen.text('► B: ESCI');`),{focus:true,aHint:false,bHint:true});
 assert.deepEqual(inputContract(`${input} screen.text('► A: SCEGLI');`),{focus:true,aHint:true,bHint:false});
});
test('input audit excludes input without directional confirmation',()=>{
 assert.equal(inputContract("input.wasPressed('a'); screen.text('A: AVANTI');"),null);
 assert.equal(inputContract('input.wasPressed("left");'),null);
});
test('shared dossier focus still requires visible A/B hints',()=>{
 const input="input.wasPressed('right'); input.wasPressed('a'); drawDossierPage(screen,pages,index);";
 assert.deepEqual(inputContract(input),{focus:true,aHint:false,bHint:false});
 assert.deepEqual(inputContract(`${input} screen.text('A PAGINE B ESCI');`),{focus:true,aHint:true,bHint:true});
});
test('starter pager requires both the current tab title and page indicator',()=>{
 const source=readFileSync(new URL('../../src/scenes/StarterPreviewScene.ts',import.meta.url),'utf8');
 assert.deepEqual(inputContract(source),{focus:true,aHint:true,bHint:true});
 assert.equal(inputContract(source.replace('][this.tab]',']'))?.focus,false);
 assert.equal(inputContract(source.replace('${this.page+1}/${this.pages().length}','PAGINA'))?.focus,false);
});
