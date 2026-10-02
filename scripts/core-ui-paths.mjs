import { readFileSync } from 'node:fs';

export function coreUiPaths() {
 const manifest = JSON.parse(readFileSync('scripts/higgsfield-core-ui.json', 'utf8'));
 return manifest.outputs.filter(asset => !(manifest.retiredPaths ?? []).includes(asset.path)).map(asset => asset.path.replace(/^public\//, ''));
}
