import { readFileSync } from 'node:fs';

export function hqAssetPaths() {
 const manifest = JSON.parse(readFileSync('scripts/higgsfield-hq.json', 'utf8'));
 return manifest.assets.flatMap(asset => asset.items
  ? asset.items.map(id => `sprites/ui/hq/${id}.png`)
  : [asset.path.replace(/^public\//, '')]);
}
