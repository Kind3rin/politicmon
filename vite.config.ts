import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { minify } from "terser";

// ID di build AUTOMATICO: cambia a ogni `vite build`, senza bump manuali.
// Alimenta sia APP_BUILD_ID (cache-busting sprite ?v=, chiavi localStorage del
// refresh) sia il nome cache del service worker: un deploy = cache nuova,
// quella vecchia viene cancellata dall'activate del SW.
const BUILD_ID = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

// Sostituisce il placeholder __APP_BUILD_ID__ dentro dist/sw.js dopo la build
// (i file in public/ sono copiati verbatim, quindi define non li tocca).
function stampServiceWorker(): Plugin {
  return {
    name: "stamp-service-worker",
    apply: "build",
    async closeBundle() {
      const swPath = resolve(__dirname, "dist/sw.js");
      if (existsSync(swPath)) {
        const src = readFileSync(swPath, "utf8");
        const distRoot = resolve(__dirname, "dist");
        const collect = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const path = resolve(dir, entry.name);
          return entry.isDirectory() ? collect(path) : [`./${path.slice(distRoot.length + 1).replaceAll("\\", "/")}`];
        });
        const coreAssets = new Set([
          "./index.html", "./manifest.webmanifest", "./icon-192.png",
          "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png",
          "./politicmon-icon.svg"
        ]);
        const runtimeAssets = collect(distRoot).filter((path) =>
          path !== "./sw.js" && path !== "./intro.mp4" && !coreAssets.has(path)
        );
        // Keep the exact precache inventory, encoding shared directory/extension
        // once per group. The worker reconstructs every original path on load.
        const assetGroups = new Map<string, string[]>();
        for (const path of runtimeAssets) {
          const slash = path.lastIndexOf("/"), dot = path.lastIndexOf(".");
          const directory = path.slice(0, slash + 1), extension = dot > slash ? path.slice(dot) : "";
          const name = path.slice(slash + 1, extension ? dot : undefined);
          if (name.includes("|")) throw new Error(`Unsupported precache filename: ${path}`);
          const key = JSON.stringify([directory, extension]);
          assetGroups.set(key, [...(assetGroups.get(key) ?? []), name]);
        }
        const encodedAssets = [...assetGroups].map(([key, names]) => [...JSON.parse(key), names.join("|")]);
        const runtimeExpression = `${JSON.stringify(encodedAssets)}.flatMap(([dir,ext,names])=>names.split("|").map(name=>dir+name+ext))`;
        const stamped = src
            .replaceAll("__APP_BUILD_ID__", BUILD_ID)
            .replace("__PRECACHE_RUNTIME_ASSETS__", runtimeExpression);
        const result = await minify(stamped, { compress: { passes: 3 }, format: { comments: false } });
        if (!result.code) throw new Error("Service worker compilation produced no code");
        writeFileSync(swPath, result.code);
      }
    }
  };
}

export default defineConfig({
  base: "./",
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID)
  },
  plugins: [stampServiceWorker()],
  build: {
    target: "es2022",
    minify: "terser",
    terserOptions: { compress: { passes: 3 } }
  },
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173,
    strictPort: false
  }
});
