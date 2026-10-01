import { readFileSync } from 'node:fs';
export function campaignUiPaths() {
 return JSON.parse(readFileSync('scripts/higgsfield-campaign-ui.json', 'utf8')).outputs.map(a => a.path.replace(/^public\//, ''));
}
