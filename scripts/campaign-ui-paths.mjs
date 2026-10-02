import { readFileSync } from 'node:fs';
export function campaignUiPaths() {
 return ['campaign-ui','government'].flatMap(name=>JSON.parse(readFileSync(`scripts/higgsfield-${name}.json`, 'utf8')).outputs.map(a => a.path.replace(/^public\//, '')));
}
