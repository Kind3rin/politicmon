import { readFileSync } from 'node:fs';
export function epilogueAssetPaths() {
 return JSON.parse(readFileSync('scripts/higgsfield-epilogue.json', 'utf8')).outputs.map(a => a.path.replace(/^public\//, ''));
}
