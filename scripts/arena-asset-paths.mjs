import {readFileSync} from 'node:fs';
export function arenaAssetPaths(){
 return JSON.parse(readFileSync('scripts/higgsfield-arena.json','utf8')).outputs.map(a=>a.path.replace(/^public\//,''));
}
