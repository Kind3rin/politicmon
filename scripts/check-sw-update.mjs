/** A release must not make an installed player download the game again. Builds two releases of the same sources (only the build id differs),
 * serves the first, lets the service worker install, switches to the second and counts what the update fetches from the network.
 * Then changes one sprite in a third release and expects exactly that sprite to come down. Runs `npm run build` itself (three times). */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const work = mkdtempSync(join(tmpdir(), 'politicmon-sw-'));
const build = name => {
  const run = spawnSync('npm', ['run', 'build'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  cpSync('dist', join(work, name), { recursive: true });
};
const inventory = name => { const dir = join(work, name); return JSON.parse(readFileSync(join(dir, readdirSync(dir).find(f => f.startsWith('precache-runtime-'))), 'utf8')); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf', '.webp': 'image/webp' };
let root = '';
const server = http.createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404).end(); return; }
  // As in production: art, music and bundles are immutable for a year, the page and the worker are always checked.
  const forever = /^\/(sprites|audio|fonts|assets)\//.test(path);
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': forever ? 'public, max-age=31536000, immutable' : 'no-store' });
  createReadStream(file).pipe(response);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
try {
  build('one');
  await new Promise(resolve => setTimeout(resolve, 1100)); // the build id has one-second resolution
  build('two');
  const total = inventory('two').reduce((sum, [, , names]) => sum + names.split('|').length, 0);

  const context = await browser.newContext();
  const page = await context.newPage();
  let fetched = [];
  // The worker's own downloads ask for the plain path. A `?v=` request is the page asking for a sprite while the old worker is still in charge: it is counted apart.
  let handover = 0;
  context.on('request', request => { if (!request.serviceWorker()) return; const url = new URL(request.url()); if (url.search) handover++; else fetched.push(url.pathname); });
  const installed = () => page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; return (await caches.keys()).join(',') + '|' + Boolean(registration.active); });
  const settle = async expected => { for (let i = 0; i < 120; i++) { const state = await page.evaluate(async id => { /* the page reloads itself when the new worker takes over */ const keys = await caches.keys(); const key = keys.find(k => k.endsWith(id)); if (!key || keys.length !== 1) return 0; return (await (await caches.open(key)).keys()).length; }, expected).catch(() => 0); if (state) return state; await page.waitForTimeout(500); } throw new Error('the worker did not settle on ' + expected); };
  const idOf = name => readdirSync(join(work, name)).find(f => f.startsWith('precache-runtime-')).slice('precache-runtime-'.length, -'.json'.length);

  root = join(work, 'one');
  await page.goto(base); await installed();
  const first = await settle(idOf('one'));
  const firstFetched = fetched.length;
  assert.ok(firstFetched >= total, `the first install fetched ${firstFetched} of ${total}`);

  // The same sources, a new build id.
  fetched = []; handover = 0; root = join(work, 'two');
  await page.reload().catch(() => {}); await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); }).catch(() => {});
  const second = await settle(idOf('two'));
  const sprites = fetched.filter(path => path.includes('/sprites/') || path.includes('/audio/') || path.includes('/fonts/'));
  assert.deepEqual(sprites, [], 'an update without changes downloaded art, music or fonts again');
  assert.ok(fetched.length <= 40, `an update without changes fetched ${fetched.length} files: ${fetched.join(', ')}`);
  assert.equal(second, first, 'the new cache does not hold the same number of files');
  console.log(`ok   aggiornamento senza modifiche: ${fetched.length} file scaricati dal worker invece di ${firstFetched} (${second} in cache; ${handover} richieste della pagina durante il passaggio)`);

  // A third release with one sprite changed.
  cpSync(join(work, 'two'), join(work, 'three'), { recursive: true });
  const three = join(work, 'three'), oldId = idOf('two'), newId = oldId.slice(0, -2) + String((Number(oldId.slice(-2)) + 7) % 60).padStart(2, '0');
  const groups = inventory('three'), group = groups.find(([dir, ext]) => dir.startsWith('./sprites/') && ext === '.png');
  const victim = group[0] + group[2].split('|')[0] + group[1];
  writeFileSync(join(three, victim.slice(2)), readFileSync(join(three, 'icon-192.png')));
  group[3] = 'deadbeef' + group[3].slice(8);
  rmSync(join(three, `precache-runtime-${oldId}.json`));
  writeFileSync(join(three, `precache-runtime-${newId}.json`), JSON.stringify(groups));
  writeFileSync(join(three, 'sw.js'), readFileSync(join(three, 'sw.js'), 'utf8').replaceAll(oldId, newId));
  fetched = []; root = three;
  await page.reload().catch(() => {}); await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); }).catch(() => {});
  await settle(newId);
  assert.deepEqual(fetched.filter(path => path.includes('/sprites/')), ['/' + victim.slice(2)], 'the changed sprite, and only it, comes from the network');
  await page.waitForLoadState('load').catch(() => {});
  const served = await page.evaluate(async path => (await (await caches.match(path)).arrayBuffer()).byteLength, victim);
  assert.equal(served, statSync(join(three, 'icon-192.png')).size, 'the cache serves the old picture: the download came back from the HTTP cache');
  console.log(`ok   aggiornamento con uno sprite cambiato: scaricato solo ${victim}`);
  await context.close();
} finally { await browser.close(); server.close(); rmSync(work, { recursive: true, force: true }); }
