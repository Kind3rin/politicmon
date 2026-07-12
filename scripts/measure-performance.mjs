import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { newGameState, parseGameState, serializeGameState } from "../src/game/state.ts";
import { createMonster } from "../src/game/monster.ts";
import { SPECIES } from "../src/data/species.ts";

const ROOT = process.cwd();
const BASELINE_PATH = resolve(ROOT, "docs/performance-baseline.json");
const REPORT_PATH = resolve(ROOT, "artifacts/reports/performance-latest.json");
const MARKDOWN_PATH = resolve(ROOT, "docs/performance-baseline.md");
const writeBaseline = process.argv.includes("--write-baseline");
const checkBaseline = process.argv.includes("--check");

async function waitForServer(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { const response = await fetch(url); if (response.ok) return; } catch { /* retry */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Server non pronto: ${url}`);
}

function startVite(mode, port) {
  const args = [resolve(ROOT, "node_modules/vite/bin/vite.js"), mode, "--host", "127.0.0.1", "--port", String(port), "--strictPort"];
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("exit", (code) => { if (code && code !== 0) console.error(`vite ${mode} exit ${code}: ${stderr}`); });
  return child;
}

async function withServer(mode, port, task) {
  const child = startVite(mode, port);
  try {
    const url = `http://127.0.0.1:${port}`;
    await waitForServer(url);
    return await task(url);
  } finally {
    child.kill("SIGTERM");
  }
}

async function mobileSession(browser, page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  return cdp;
}

async function measureBoot(browser) {
  return withServer("preview", 4181, async (url) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block" });
    const page = await context.newPage();
    const cdp = await mobileSession(browser, page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 40, downloadThroughput: 4_000_000 / 8, uploadThroughput: 1_000_000 / 8
    });
    const wallStart = performance.now();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.getEntriesByName("politicmon:boot-first-frame").length > 0, null, { timeout: 15_000 });
    const wallMs = performance.now() - wallStart;
    const result = await page.evaluate(() => {
      const duration = (name) => performance.getEntriesByName(name).at(-1)?.duration ?? null;
      const resources = performance.getEntriesByType("resource");
      return {
        assetsReadyMs: duration("politicmon:boot-assets"),
        firstFrameMs: duration("politicmon:boot-first-frame"),
        resourceRequestsAtFirstFrame: resources.length,
        resourceTransferBytesAtFirstFrame: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)
      };
    });
    await context.close();
    return { ...result, wallMs: Number(wallMs.toFixed(2)) };
  });
}

async function measureScenes(browser) {
  return withServer("serve", 4182, async (url) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block" });
    const page = await context.newPage();
    await mobileSession(browser, page);
    await page.goto(`${url}/scripts/perf-harness.html`, { waitUntil: "networkidle" });
    const result = await page.evaluate(async () => {
      const [{ Screen }, { Input }, { SceneStack }, { WorldScene }, { BattleScene }, { DexScene }, stateMod, monsterMod, speciesMod, assetsMod, audioMod] = await Promise.all([
        import("/src/engine/screen.ts"), import("/src/engine/input.ts"), import("/src/engine/scene.ts"),
        import("/src/game/world/WorldScene.ts"), import("/src/game/battle/BattleScene.ts"), import("/src/scenes/DexScene.ts"),
        import("/src/game/state.ts"), import("/src/game/monster.ts"), import("/src/data/species.ts"), import("/src/engine/assets.ts"), import("/src/engine/audio.ts")
      ]);
      audioMod.audio.enabled = false;
      const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
      const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack();
      const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)];
      const summarize = (values) => ({
        frames: values.length,
        meanMs: values.reduce((sum, value) => sum + value, 0) / values.length,
        p50Ms: percentile(values, 0.5), p95Ms: percentile(values, 0.95), p99Ms: percentile(values, 0.99), maxMs: Math.max(...values)
      });
      async function sample(scene) {
        stack.replace(scene);
        for (let i = 0; i < 30; i += 1) { stack.update(1 / 60); stack.draw(screen); input.endFrame(); }
        await new Promise((resolveWait) => setTimeout(resolveWait, 800));
        const work = [];
        const intervals = [];
        await new Promise((resolveFrames) => {
          let previous = 0;
          let frames = 0;
          const tick = (now) => {
            if (previous) intervals.push(now - previous);
            previous = now;
            const start = performance.now();
            stack.update(1 / 60); stack.draw(screen); input.endFrame();
            work.push(performance.now() - start);
            frames += 1;
            if (frames >= 240) resolveFrames(); else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        return { work: summarize(work), interval: summarize(intervals), framesOver100ms: intervals.filter((value) => value > 100).length };
      }
      const worldState = stateMod.newGameState();
      worldState.flags["intro-done"] = true; worldState.flags["dex-received"] = true;
      worldState.party = [monsterMod.createMonster("giorgiagon", 30), monsterMod.createMonster("renzilla", 30)];
      worldState.pos = { mapId: "capitale", x: 15, y: 14, facing: "down" };
      const world = await sample(new WorldScene(stack, input, worldState));
      const battleState = stateMod.newGameState(); battleState.flags["intro-done"] = true;
      battleState.party = [monsterMod.createMonster("giorgiagon", 30), monsterMod.createMonster("renzilla", 29)];
      const battle = await sample(new BattleScene(stack, input, { state: battleState, foeTeam: [monsterMod.createMonster("mattarellux", 32)], onEnd: () => undefined }));
      const dexState = stateMod.newGameState();
      for (const id of Object.keys(speciesMod.SPECIES)) dexState.dex[id] = "caught";
      const dex = await sample(new DexScene(stack, input, dexState));
      return { world, battle, dex, spriteRegistry: assetsMod.spriteRegistryStats(), rasterCache: screen.cacheStats() };
    });
    for (const scene of ["world", "battle", "dex"]) for (const group of ["work", "interval"]) for (const key of ["meanMs", "p50Ms", "p95Ms", "p99Ms", "maxMs"]) result[scene][group][key] = Number(result[scene][group][key].toFixed(3));
    await context.close();
    return result;
  });
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) output.push(...await walkFiles(path)); else output.push(path);
  }
  return output;
}

async function measureSizes() {
  const distFiles = await walkFiles(resolve(ROOT, "dist"));
  const codeFiles = distFiles.filter((path) => /\.(js|css|html)$/.test(path));
  const indexPath = resolve(ROOT, "dist/index.html");
  const indexHtml = await readFile(indexPath, "utf8");
  const initialRefs = [...indexHtml.matchAll(/(?:src|href)=["']\.\/(assets\/[^"']+\.(?:js|css))["']/g)]
    .map((match) => resolve(ROOT, "dist", match[1]));
  const initialCodeFiles = [indexPath, ...initialRefs];
  const spriteFiles = await walkFiles(resolve(ROOT, "public/sprites"));
  async function total(files) { let sum = 0; for (const file of files) sum += (await stat(file)).size; return sum; }
  let gzipBytes = 0;
  for (const file of codeFiles) gzipBytes += gzipSync(await readFile(file)).length;
  let initialGzipBytes = 0;
  for (const file of initialCodeFiles) initialGzipBytes += gzipSync(await readFile(file)).length;
  let spriteDecodedBytesEstimate = 0;
  for (const file of spriteFiles.filter((path) => path.endsWith(".png"))) {
    const png = await readFile(file);
    if (png.length >= 24 && png.toString("hex", 1, 4) === "504e47") spriteDecodedBytesEstimate += png.readUInt32BE(16) * png.readUInt32BE(20) * 4;
  }
  return { codeRawBytes: await total(codeFiles), codeGzipBytes: gzipBytes, initialCodeGzipBytes: initialGzipBytes, spriteCompressedBytes: await total(spriteFiles), spriteDecodedBytesEstimate, spriteFiles: spriteFiles.length };
}

function measureSave() {
  const state = newGameState();
  state.party = Object.keys(SPECIES).slice(0, 6).map((id, index) => createMonster(id, 20 + index));
  for (const id of Object.keys(SPECIES)) state.dex[id] = "caught";
  for (let i = 0; i < 300; i += 1) state.flags[`perf-${i}`] = i % 2 === 0;
  const payload = serializeGameState(state);
  const loops = 3000;
  let start = performance.now(); for (let i = 0; i < loops; i += 1) parseGameState(payload); const parseMs = (performance.now() - start) / loops;
  start = performance.now(); for (let i = 0; i < loops; i += 1) serializeGameState(state); const serializeMs = (performance.now() - start) / loops;
  return { payloadBytes: Buffer.byteLength(payload), parseMeanMs: Number(parseMs.toFixed(4)), serializeMeanMs: Number(serializeMs.toFixed(4)) };
}

function markdown(report) {
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
  return `# Baseline prestazioni R0\n\nProfilo: Chromium mobile 390×844, DPR 2, CPU ×4; boot con latenza 40 ms e download 4 Mbps.\n\n| Metrica | Valore |\n|---|---:|\n| Boot asset critici | ${report.boot.assetsReadyMs.toFixed(1)} ms |\n| Primo frame pronto | ${report.boot.firstFrameMs.toFixed(1)} ms |\n| World intervallo p95 / max | ${report.scenes.world.interval.p95Ms} / ${report.scenes.world.interval.maxMs} ms |\n| Battle intervallo p95 / max | ${report.scenes.battle.interval.p95Ms} / ${report.scenes.battle.interval.maxMs} ms |\n| Dex intervallo p95 / max | ${report.scenes.dex.interval.p95Ms} / ${report.scenes.dex.interval.maxMs} ms |\n| World/Battle/Dex costo draw p95 | ${report.scenes.world.work.p95Ms} / ${report.scenes.battle.work.p95Ms} / ${report.scenes.dex.work.p95Ms} ms |\n| Working set sprite decoded | ${mb(report.scenes.spriteRegistry.decodedBytesEstimate)} MiB |\n| Tutti gli sprite decoded (worst-case) | ${mb(report.sizes.spriteDecodedBytesEstimate)} MiB |\n| Cache raster | ${report.scenes.rasterCache.rasterizedSprites} sprite / ${report.scenes.rasterCache.rasterizedPixels} px; ${report.scenes.rasterCache.cachedGlyphs} glifi |\n| Bundle iniziale gzip | ${mb(report.sizes.initialCodeGzipBytes)} MiB |\n| Bundle totale gzip | ${mb(report.sizes.codeGzipBytes)} MiB |\n| Sprite compressi | ${mb(report.sizes.spriteCompressedBytes)} MiB (${report.sizes.spriteFiles} file) |\n| Save parse / serialize | ${report.save.parseMeanMs} / ${report.save.serializeMeanMs} ms |\n\nBudget automatici locali: intervallo rAF p95 ≤33,4 ms, nessun frame >100 ms, parse/serialize ≤10 ms, bundle iniziale ≤250 KiB e totale ≤350 KiB. Conferma finale FPS richiesta su device reale.\n`;
}

function assertBudgets(report, baseline) {
  const failures = [];
  for (const scene of ["world", "battle", "dex"]) {
    if (report.scenes[scene].interval.p95Ms > 33.4) failures.push(`${scene} intervallo p95 ${report.scenes[scene].interval.p95Ms}ms > 33.4ms`);
    if (report.scenes[scene].interval.maxMs > 100 || report.scenes[scene].framesOver100ms > 0) failures.push(`${scene} ha frame >100ms`);
  }
  if (report.save.parseMeanMs > 10 || report.save.serializeMeanMs > 10) failures.push("save parse/serialize >10ms");
  if (report.sizes.initialCodeGzipBytes > 250 * 1024) failures.push("bundle iniziale gzip oltre 250 KiB");
  if (report.sizes.codeGzipBytes > 350 * 1024) failures.push("bundle totale gzip oltre 350 KiB");
  if (failures.length) throw new Error(`Performance budget fallito:\n- ${failures.join("\n- ")}`);
}

const browser = await chromium.launch();
let report;
try {
  report = {
    schemaVersion: 2,
    profile: { viewport: "390x844", deviceScaleFactor: 2, cpuThrottle: 4, bootNetwork: "40ms/4Mbps" },
    boot: await measureBoot(browser), scenes: await measureScenes(browser), sizes: await measureSizes(), save: measureSave()
  };
} finally { await browser.close(); }
await mkdir(resolve(ROOT, "artifacts/reports"), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
let baseline = null;
try { baseline = JSON.parse(await readFile(BASELINE_PATH, "utf8")); } catch { /* prima baseline */ }
assertBudgets(report, checkBaseline ? baseline : null);
if (writeBaseline) {
  await writeFile(BASELINE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(MARKDOWN_PATH, markdown(report));
}
console.log(`PERF OK — interval p95 world ${report.scenes.world.interval.p95Ms}ms, battle ${report.scenes.battle.interval.p95Ms}ms, dex ${report.scenes.dex.interval.p95Ms}ms, bundle iniziale ${(report.sizes.initialCodeGzipBytes / 1024).toFixed(1)}KiB / totale ${(report.sizes.codeGzipBytes / 1024).toFixed(1)}KiB.`);
