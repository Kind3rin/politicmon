import { chromium } from "playwright";
const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4180";
const browser = await chromium.launch(); const context = await browser.newContext(); const page = await context.newPage();
const stage = (name) => console.log(`[pwa-smoke] ${name}`);
const within = (promise, name, ms = 15_000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout: ${name}`)), ms))
]);
stage("apertura online");
await page.goto(base, { waitUntil: "domcontentloaded", timeout: 20_000 });
stage("attesa service worker");
const installed = await within(page.evaluate(async () => { if (!("serviceWorker" in navigator)) return false; await navigator.serviceWorker.ready; return true; }), "service worker ready");
if (!installed) throw new Error("service worker non installato");
stage("verifica precache");
const cacheEvidence = await page.evaluate(async () => {
  const keys = await caches.keys();
  const requests = (await Promise.all(keys.map(async (key) => [...await (await caches.open(key)).keys()].map((request) => request.url)))).flat();
  return {
    worldChunk: requests.some((url) => /\/assets\/WorldScene-[^/]+\.js$/.test(new URL(url).pathname)),
    pixelLabSprite: requests.some((url) => /\/sprites\/monsters\/.+\.png$/.test(new URL(url).pathname)),
    introExcluded: !requests.some((url) => new URL(url).pathname.endsWith("/intro.mp4"))
  };
});
if (!cacheEvidence.worldChunk) throw new Error("chunk WorldScene non pre-cacheato");
if (!cacheEvidence.pixelLabSprite) throw new Error("sprite PixelLab non pre-cacheati");
if (!cacheEvidence.introExcluded) throw new Error("video intro pesante incluso nel precache");
const sentinel = JSON.stringify({ rc: "1.0.0-rc.1", value: "save-preserved" });
await page.evaluate((value) => localStorage.setItem("politicmon-rc-smoke-save", value), sentinel);
stage("aggiornamento service worker");
await within(page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; await reg.update(); }), "service worker update");
stage("reload online");
await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
const preserved = await page.evaluate(() => localStorage.getItem("politicmon-rc-smoke-save"));
if (preserved !== sentinel) throw new Error("update PWA ha alterato localStorage");
stage("reload offline");
await context.setOffline(true); await page.reload({ waitUntil: "domcontentloaded" });
const offline = await page.locator("#game-canvas").count() === 1;
if (!offline) throw new Error("PWA non riparte offline");
stage("verifica campagna offline");
const offlineWorld = await page.evaluate(async () => {
  const keys = await caches.keys();
  const requests = (await Promise.all(keys.map(async (key) => [...await (await caches.open(key)).keys()].map((request) => request.url)))).flat();
  const world = requests.find((url) => /\/assets\/WorldScene-[^/]+\.js$/.test(new URL(url).pathname));
  if (!world) return false;
  const response = await fetch(world);
  return response.ok && (await response.text()).length > 10_000;
});
if (!offlineWorld) throw new Error("chunk campagna non disponibile offline");
console.log("PWA SMOKE OK: installazione, chunk campagna, sprite PixelLab, update save-safe e avvio offline."); await browser.close();
