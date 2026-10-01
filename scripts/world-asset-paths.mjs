import { readFileSync } from 'node:fs';

// Derive actual selected runtime files, excluding rejected/superseded cells.
export function worldAssetPaths() {
 const paths = [];
 for (const name of ['characters', 'environment']) {
  const manifest = JSON.parse(readFileSync(`scripts/higgsfield-world-${name}.json`, 'utf8'));
  for (const asset of manifest.assets) {
   if (asset.status !== 'completed') continue;
   if (asset.outputs) {
    paths.push(...asset.outputs.filter(output => !output.superseded).map(output => output.path.replace(/^public\//, '')));
   } else if (asset.kind === 'single') {
    paths.push(asset.path.replace(/^public\//, ''));
   } else {
    for (let row = 0; row < asset.rows; row++) for (let column = 0; column < asset.columns; column++) {
     if (asset.processing?.skipCells?.includes(row * asset.columns + column)) continue;
     const directions = ['south', 'north', 'east', 'west'];
     if (asset.kind === 'vehicle') paths.push(`sprites/chars/${asset.id}_${directions[row * asset.columns + column]}.png`);
     else {
      const role = asset.role ?? asset.id, dir = asset.direction ?? directions[column];
      paths.push(`sprites/chars/${role === 'player' ? 'player' : `npc_${role}`}_${dir}${row === 0 ? '' : `_w${row - 1}`}.png`);
     }
    }
   }
  }
 }
 return [...new Set(paths)];
}
