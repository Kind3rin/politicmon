/** How long a first-time player on a slow phone waits: serves a built game (`DIR`, default dist) with production caching headers and measures,
 * on a throttled connection and CPU, the time to the title, and from "Nuova campagna" to a world that is ready to play.
 * `NET=slow4g|3g|fast`, `CPU=4`. No service worker: this is the first visit. */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';
import http from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(process.env.DIR || 'dist');
const NETS = { fast: null, slow4g: { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }, '3g': { latency: 300, downloadThroughput: 750e3 / 8, uploadThroughput: 250e3 / 8 } };
const net = NETS[process.env.NET || 'slow4g'], cpu = Number(process.env.CPU || 4);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf', '.webp': 'image/webp' };
const packed = new Map();
const server = http.createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname), file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404).end(); return; }
  const cache = /^\/(sprites|audio|fonts|assets)\//.test(path) ? 'public, max-age=31536000, immutable' : 'no-store';
  // Text is compressed as the host does it; otherwise the bundles would weigh four times what a player downloads.
  if (/\.(js|css|html|json|svg|webmanifest)$/.test(file)) { const body = packed.get(file) ?? packed.set(file, brotliCompressSync(readFileSync(file))).get(file); response.writeHead(200, { 'content-type': TYPES[extname(file)], 'content-encoding': 'br', 'content-length': body.length, 'cache-control': cache }); response.end(body); return; }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'content-length': statSync(file).size, 'cache-control': cache });
  createReadStream(file).pipe(response);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 400, height: 835 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  if (net) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...net });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  let requests = 0, bytes = 0;
  page.on('response', response => { requests++; bytes += Number(response.headers()['content-length'] || 0); });
  await page.addInitScript(() => sessionStorage.setItem('politicmon-intro-seen', '1'));
  const start = Date.now();
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'commit' });
  await page.getByRole('button', { name: /Nuova campagna/ }).waitFor({ timeout: 180000 });
  const title = Date.now() - start, atTitle = [requests, bytes];
  await page.getByRole('button', { name: /Nuova campagna/ }).tap();
  await page.getByRole('button', { name: /Normale/ }).tap();
  const tapped = Date.now();
  await page.waitForFunction(() => document.body.classList.contains('ui-world-open') && document.querySelector('canvas')?.dataset.worldReady === 'true', null, { timeout: 300000 });
  const world = Date.now() - tapped;
  console.log(JSON.stringify({ dir: process.env.DIR || 'dist', net: process.env.NET || 'slow4g', cpu, titleMs: title, requestsAtTitle: atTitle[0], kbAtTitle: Math.round(atTitle[1] / 1024), newGameToWorldMs: world, requestsAtWorld: requests, kbAtWorld: Math.round(bytes / 1024) }));
} finally { await browser.close(); server.close(); }
