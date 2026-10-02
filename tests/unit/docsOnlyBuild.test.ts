import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
// @ts-ignore: Node-only deployment script, deliberately outside runtime.
import {docsOnlyBuild} from '../../scripts/ignore-docs-only-build.mjs';

function fixture(){
 const cwd=mkdtempSync(join(tmpdir(),'politicmon-docs-build-'));
 const git=(...args:string[])=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
 git('init','-q');git('config','user.name','Build fixture');git('config','user.email','fixture@example.invalid');
 mkdirSync(join(cwd,'src'));mkdirSync(join(cwd,'docs'));writeFileSync(join(cwd,'src/game.ts'),'export const version=1;');writeFileSync(join(cwd,'docs/round.md'),'Initial evidence');
 const commit=()=>{git('add','.');git('commit','-qm','Fixture change');return git('rev-parse','HEAD');};
 return{cwd,git,commit,initial:commit()};
}
test('deployment: docs-only updates skip, but first/missing baselines and redeploys build',()=>{
 const f=fixture();try{
  writeFileSync(join(f.cwd,'docs/round.md'),'Verified public evidence');writeFileSync(join(f.cwd,'docs/path with spaces.json'),'{}');const currentSha=f.commit();
  assert.equal(docsOnlyBuild({cwd:f.cwd,previousSha:f.initial,currentSha}).skip,true);
  for(const previousSha of [undefined,'invalid','0'.repeat(40),currentSha])assert.equal(docsOnlyBuild({cwd:f.cwd,previousSha,currentSha}).skip,false);
 }finally{rmSync(f.cwd,{recursive:true,force:true});}
});
test('deployment: an undeployed code change stays visible behind subsequent docs; moves and unknown inputs build',()=>{
 const f=fixture();try{
  writeFileSync(join(f.cwd,'src/game.ts'),'export const version=2;');const codeSha=f.commit();
  writeFileSync(join(f.cwd,'docs/round.md'),'Docs following code in same push');const currentSha=f.commit();
  assert.equal(docsOnlyBuild({cwd:f.cwd,previousSha:f.initial,currentSha}).skip,false);
  assert.equal(docsOnlyBuild({cwd:f.cwd,previousSha:codeSha,currentSha}).skip,true);
  renameSync(join(f.cwd,'docs/round.md'),join(f.cwd,'src/round.md'));const moved=f.commit();assert.equal(docsOnlyBuild({cwd:f.cwd,previousSha:currentSha,currentSha:moved}).skip,false);
  writeFileSync(join(f.cwd,'future-build-config.json'),'{}');const unknown=f.commit();assert.equal(docsOnlyBuild({cwd:f.cwd,previousSha:moved,currentSha:unknown}).skip,false);
 }finally{rmSync(f.cwd,{recursive:true,force:true});}
});
