import {readFileSync} from 'node:fs';
export function deskAssetPaths(){return JSON.parse(readFileSync('scripts/higgsfield-desk.json','utf8')).outputs.map(a=>a.path.replace(/^public\//,''));}
