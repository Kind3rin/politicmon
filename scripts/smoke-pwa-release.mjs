import { chromium, devices, webkit } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const fixtureState = (name) => {
  const spec = JSON.parse(readFileSync(resolve("tests/fixtures/saves", name), "utf8"));
  return spec.extends ? { ...fixtureState(spec.extends), ...structuredClone(spec.patch) } : structuredClone(spec.state);
};
const legacySave = JSON.stringify(fixtureState("v13-post-ue.json"));
const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4180";
const browserName = process.env.PWA_BROWSER === "webkit" ? "webkit" : "chromium";
const browserType = browserName === "webkit" ? webkit : chromium;
const browser = await browserType.launch();
const deviceName = browserName === "webkit" ? "iPhone 13" : "Pixel 7";
const context = await browser.newContext({
  ...devices[deviceName],
  serviceWorkers: "allow"
});
const page = await context.newPage();
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
stage("pulizia cache obsoleta");
const cacheCleanup = await page.evaluate(async () => {
  const before = await caches.keys();
  const current = before.find((key) => key.startsWith("politicmon-"));
  if (!current) return { current: false, staleRemoved: false };
  await caches.open("politicmon-stale-smoke");
  navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_RUNTIME_CACHES" });
  const limit = Date.now() + 5_000;
  while ((await caches.keys()).includes("politicmon-stale-smoke") && Date.now() < limit) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const after = await caches.keys();
  return { current: after.includes(current), staleRemoved: !after.includes("politicmon-stale-smoke") };
});
if (!cacheCleanup.current) throw new Error("pulizia cache ha eliminato la build corrente");
if (!cacheCleanup.staleRemoved) throw new Error("cache obsoleta non eliminata");
const sentinel = JSON.stringify({ rc: "1.0.0-rc.1", value: "save-preserved" });
await page.evaluate(({ value, save }) => {
  localStorage.setItem("politicmon-rc-smoke-save", value);
  localStorage.setItem("politicmon-save-v13", save);
  localStorage.removeItem("politicmon-save-v18__s0");
  localStorage.removeItem("politicmon-save-v18__s0.bak");
}, { value: sentinel, save: legacySave });
stage("aggiornamento service worker");
await within(page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; await reg.update(); }), "service worker update");
stage("reload online");
await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
const preserved = await page.evaluate(() => localStorage.getItem("politicmon-rc-smoke-save"));
if (preserved !== sentinel) throw new Error("update PWA ha alterato localStorage");
const migrated = await page.evaluate(() => {
  const raw = localStorage.getItem("politicmon-save-v18__s0");
  if (!raw || localStorage.getItem("politicmon-save-v13") !== null) return false;
  const state = JSON.parse(raw);
  return state.pos?.mapId === "bruxelles" && state.flags?.["ue-beaten"] === true && state.party?.length > 0;
});
if (!migrated) throw new Error("salvataggio reale v13 non migrato nello slot v18");
stage("reload offline");
if (browserName !== "webkit") {
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
}
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
stage("resume dopo background");
if (browserName !== "webkit") await context.setOffline(false);
const background = await context.newPage();
await background.goto("about:blank");
await page.bringToFront();
await page.evaluate(() => {
  window.dispatchEvent(new Event("blur"));
  window.dispatchEvent(new PageTransitionEvent("pagehide"));
  window.dispatchEvent(new PageTransitionEvent("pageshow"));
  window.dispatchEvent(new Event("focus"));
});
await page.waitForTimeout(250);
if (await page.locator("#game-canvas").count() !== 1) throw new Error("canvas perso dopo background/foreground");
const offlineLabel = browserName === "webkit" ? "precache offline verificata (reload offline non supportato da Playwright WebKit)" : "riavvio offline";
console.log(`PWA SMOKE OK (${browserName}/${deviceName}): installazione, runtime, sprite, cache, update, ${offlineLabel} e resume.`); await browser.close();
