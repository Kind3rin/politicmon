import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { worldAssetPaths } from './world-asset-paths.mjs';

const base = new URL(process.env.PREVIEW_URL ?? 'https://politicmon.vercel.app/');
const paths = worldAssetPaths();
assert.equal(paths.length, 295);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function fetchBytes(path) {
 const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) });
 assert.ok(response.ok, `${path}: HTTP ${response.status}`);
 return Buffer.from(await response.arrayBuffer());
}
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
 while (cursor < paths.length) {
  const path = paths[cursor++];
  assert.equal(hash(await fetchBytes(path)), hash(readFileSync(`public/${path}`)), `${path}: deployed bytes differ`);
 }
}));
const html = (await fetchBytes('')).toString();
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
let source = (await Promise.all(scripts.map(fetchBytes))).map(bytes => bytes.toString()).join('\n');
const worldChunks = [...new Set([...source.matchAll(/WorldScene-[\w-]+\.js/g)].map(match => `assets/${match[0]}`))];
source += (await Promise.all(worldChunks.map(fetchBytes))).map(bytes => bytes.toString()).join('\n');
assert.ok(source.includes('QUARTA INAUGURAZIONE'), 'civic dialogue missing from deployed bundles');
assert.ok(source.includes('cantiere:build'), 'bridge decision missing from deployed bundles');
console.log(`PASS: ${paths.length} deployed PNG checksums and civic dialogue/bridge code at ${base.origin}.`);
