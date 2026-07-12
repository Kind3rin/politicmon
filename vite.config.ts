import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

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
    closeBundle() {
      const swPath = resolve(__dirname, "dist/sw.js");
      try {
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
        writeFileSync(
          swPath,
          src
            .replaceAll("__APP_BUILD_ID__", BUILD_ID)
            .replace("__PRECACHE_RUNTIME_ASSETS__", JSON.stringify(runtimeAssets))
        );
      } catch {
        // dist/sw.js assente (build parziale): niente da stampare.
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
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173,
    strictPort: false
  }
});
