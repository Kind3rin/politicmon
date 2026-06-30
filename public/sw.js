// Service worker di Politicmon: gioco offline una volta installato.
// Gli asset buildati hanno hash nel nome -> cache-first sicura.
// index.html e manifest -> network-first per ricevere gli aggiornamenti.
//
// Auto-update: la versione del nome cache va bumpata a ogni release. Il service
// worker nuovo prende subito il controllo: i progressi stanno in localStorage,
// separati dalle cache statiche.

const CACHE = "politicmon-v8-item-icons-pixellab-only";
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

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
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
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
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

  // Gli sprite in public/ mantengono spesso lo stesso nome: network-first evita
  // case/personaggi vecchi presi dalla cache PWA dopo una rigenerazione asset.
  if (url.pathname.includes("/sprites/")) {
    event.respondWith(
      fetch(request, { cache: "reload" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Bundle con hash e icone: cache-first.
  event.respondWith(
    caches.match(request).then(
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
