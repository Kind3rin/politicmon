// Service worker di Politicmon: gioco offline una volta installato.
// Gli asset buildati hanno hash nel nome -> cache-first sicura.
// index.html e manifest -> network-first per ricevere gli aggiornamenti.
//
// Auto-update: la versione del nome cache va bumpata a ogni release. Il service
// worker nuovo prende subito il controllo: i progressi stanno in localStorage,
// separati dalle cache statiche.

// Il placeholder è stampato con l'ID di build da vite.config.ts (plugin
// stamp-service-worker): ogni deploy = nome cache nuovo, l'activate cancella
// le cache delle build precedenti. Niente più bump manuali.
const CACHE = "politicmon-__APP_BUILD_ID__";
const RUNTIME_MANIFEST = "./precache-runtime-__APP_BUILD_ID__.json";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./politicmon-icon.svg"
];

// La precache salva i PNG canonici; il registry li richiede con ?v=BUILD_ID.
// Riusa il canonico SOLO nella cache della stessa build e SOLO per la versione
// corrente: anche il primo incontro offline trova lo sfondo prima mai aperto.
async function matchCurrentBuild(request) {
  const cache = await caches.open(CACHE);
  const exact = await cache.match(request);
  if (exact) return exact;
  const url = new URL(request.url);
  if (url.searchParams.get("v") !== "__APP_BUILD_ID__" || [...url.searchParams.keys()].some((key) => key !== "v")) return undefined;
  url.search = "";
  return cache.match(url.href);
}

// Every release has a cache of its own, but most of a release is the same files as the one before: a thousand sprites and the music.
// The inventory carries a short content hash for each file (fourth item of a group, eight characters a name). Whatever the previous
// cache holds under the same path with the same hash is copied across; only what changed is downloaded. Any doubt means "download".
const HASH = 8;
async function reuseUnchanged(cache, groups) {
  const copied = new Set();
  try {
    const wanted = new Map();
    for (const [dir, ext, names, hashes] of groups) {
      if (typeof hashes !== "string") continue;
      names.split("|").forEach((name, i) => wanted.set(dir + name + ext, hashes.slice(i * HASH, i * HASH + HASH)));
    }
    if (!wanted.size) return copied;
    const previous = (await caches.keys()).filter((key) => key.startsWith("politicmon-") && key !== CACHE);
    for (const key of previous) {
      const old = await caches.open(key);
      const inventory = (await old.keys()).find((request) => request.url.includes("/precache-runtime-"));
      const stored = inventory && await old.match(inventory);
      if (!stored) continue;
      for (const [dir, ext, names, hashes] of await stored.json()) {
        if (typeof hashes !== "string") continue;
        const list = names.split("|");
        for (let i = 0; i < list.length; i += 1) {
          const path = dir + list[i] + ext;
          if (copied.has(path) || wanted.get(path) !== hashes.slice(i * HASH, i * HASH + HASH)) continue;
          const hit = await old.match(new URL(path, self.location.href).href);
          if (!hit || !hit.ok) continue;
          await cache.put(path, hit);
          copied.add(path);
        }
      }
    }
  } catch {
    // The copy is a saving, never a requirement: what was not copied is fetched below.
  }
  return copied;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    // The asset inventory is versioned data. Read it only during installation;
    // an installed worker needs no network request to reconstruct its cache.
    const response = await fetch(RUNTIME_MANIFEST, { cache: "reload" });
    if (!response.ok) throw new Error("Precache inventory unavailable");
    const groups = await response.clone().json();
    const runtime = groups.flatMap(([dir, ext, names]) => names.split("|").map(name => dir + name + ext));
    const cache = await caches.open(CACHE);
    const copied = await reuseUnchanged(cache, groups);
    // What is downloaded bypasses the HTTP cache: the sprites are served as immutable for a year under a path that does not change
    // when the picture does, and a download that came back from that cache would put the old picture in the new release.
    const fresh = (path) => (typeof Request === "function" ? new Request(path, { cache: "reload" }) : path);
    await cache.addAll([...PRECACHE, ...runtime.filter((path) => !copied.has(path))].map(fresh));
    await cache.put(RUNTIME_MANIFEST, response);
  })());
});

// La pagina (main.ts) invia SKIP_WAITING quando un SW nuovo è pronto: attivalo.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_RUNTIME_CACHES") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }
  const url = new URL(request.url);

  // Navigazioni e manifest: prova la rete, ripiega sulla cache (offline).
  if (request.mode === "navigate" || request.url.includes("manifest.webmanifest") || url.pathname.endsWith("/sw.js")) {
    event.respondWith(
      fetch(request, { cache: "reload" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match("./index.html")))
    );
    return;
  }

  // Sprite in public/sprites/: cache-first. Gli URL portano ?v=APP_BUILD_ID
  // (assets.ts spriteUrl), quindi ogni versione è un URL DIVERSO e immutabile:
  // una rigenerazione asset cambia APP_BUILD_ID (build.ts) → nuovo URL → nessuno
  // stale servito. Il vecchio network-first ({cache:"reload"}) ri-scaricava ~330
  // sprite a OGNI avvio (rompeva la promessa PWA/offline e sprecava dati su mobile);
  // il cache-busting rende quel ri-scarico inutile.
  if (url.pathname.includes("/sprites/")) {
    event.respondWith(
      matchCurrentBuild(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Bundle con hash e icone: cache-first.
  event.respondWith(
    matchCurrentBuild(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
