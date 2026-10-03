import {readdir,readFile} from 'node:fs/promises';
import {dirname,resolve,relative} from 'node:path';

// Inspect local scene bases too: an inherited panel is valid only when its
// implementation also has no coordinate-based text or panels.
const scenes=(await readdir('src/scenes')).filter(file=>file.endsWith('.ts')).map(file=>`src/scenes/${file}`);
const files=[...scenes,'src/game/battle/BattleScene.ts','src/game/battle/PvpBattleScene.ts'];
const cache=new Map();
async function inspect(file,ancestors=new Set()){
 const path=resolve(file);
 if(cache.has(path))return cache.get(path);
 if(ancestors.has(path))return {native:false,legacy:[],source:''};
 const source=await readFile(path,'utf8');
 const legacy=[...source.matchAll(/\bscreen\.(text(?:Fit|Right|Center)?|panel)\s*\(/g)];
 let native=/\bget\s+uiPanel\b|\brenderUi(?:Battle|Dialog|Overlay)\b/.test(source);
 const base=source.match(/class\s+\w+\s+extends\s+(\w+)/)?.[1];
 if(base){
  const imports=[...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)];
  const ref=imports.find(match=>match[1].split(',').some(name=>name.trim()===base)&&match[2].startsWith('.'));
  if(ref){const parent=await inspect(resolve(dirname(path),`${ref[2]}.ts`),new Set([...ancestors,path]));native=native||parent.native;if(parent.legacy.length)legacy.push(...parent.legacy);}
 }
 const result={native,legacy,source};cache.set(path,result);return result;
}
const failures=[];
for(const file of new Set(files)){
 const {native,legacy,source}=await inspect(file);
 if(legacy.length||!native)failures.push({file,count:legacy.length,line:legacy.length?source.slice(0,legacy[0].index).split('\n').length:1,native});
}
console.log(`UI kit: ${new Set(files).size-failures.length}/${new Set(files).size} scene senza testo o pannelli a coordinate.`);
for(const failure of failures)console.error(`${failure.file}:${failure.line} — ${failure.count} chiamate residue; kit ${failure.native?"presente":"assente"}`);
if(failures.length)process.exitCode=1;

// Shared battle artwork must not reintroduce bitmap HUDs behind native scenes.
for (const file of ['src/game/battle/view.ts']) {
 const source=await readFile(file,'utf8');
 const legacy=[...source.matchAll(/\bscreen\.(text(?:Fit|Right|Center)?|panel)\s*\(/g)];
 if(legacy.length){console.error(`${file} — ${legacy.length} chiamate bitmap nel renderer condiviso`);process.exitCode=1;}
 else console.log(`UI kit: renderer condiviso della lotta senza testo bitmap.`);
}
