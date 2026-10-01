import { readFileSync } from 'node:fs';

export function nativeFallbackPaths() {
 const manifest = JSON.parse(readFileSync('scripts/higgsfield-monster-fallbacks.json', 'utf8'));
 return manifest.assets.map(asset => asset.path.replace(/^public\//, ''));
}
