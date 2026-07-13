import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4180";
const externalPreview = Boolean(process.env.PREVIEW_URL);
const npmCli = process.env.npm_execpath;
const viteCli = resolve("node_modules/vite/bin/vite.js");
if (!npmCli) throw new Error("npm_execpath non disponibile: avvia con npm run smoke:pwa:matrix");
let preview;

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} -> ${code}`)));
  });
}

async function waitForPreview() {
  const limit = Date.now() + 20_000;
  while (Date.now() < limit) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Il server sta ancora partendo.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`preview non raggiungibile: ${base}`);
}

try {
  await run(process.execPath, [npmCli, "run", "build"]);
  if (!externalPreview) {
    preview = spawn(process.execPath, [viteCli, "preview", "--host", "127.0.0.1", "--port", "4180"], {
      stdio: ["ignore", "pipe", "pipe"]
    });
  }
  await waitForPreview();
  await run(process.execPath, ["scripts/smoke-pwa-release.mjs"], { ...process.env, PREVIEW_URL: base });
  await run(process.execPath, ["scripts/smoke-pwa-release.mjs"], {
    ...process.env,
    PREVIEW_URL: base,
    PWA_BROWSER: "webkit"
  });
  console.log("PWA MATRIX OK: Chromium/Pixel 7 completo; WebKit/iPhone 13 completo salvo reload offline non supportato dall'engine Playwright.");
} finally {
  if (preview?.exitCode === null && preview.pid) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(preview.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      preview.kill("SIGTERM");
    }
  }
}
