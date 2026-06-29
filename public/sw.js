// Service worker di Politicmon: gioco offline una volta installato.
// Gli asset buildati hanno hash nel nome -> cache-first sicura.
// index.html e manifest -> network-first per ricevere gli aggiornamenti.
//
// Auto-update: la versione del nome cache va bumpata a ogni release (o cambia
// comunque perché il file sw.js viene rigenerato). All'attivazione le cache
// vecchie vengono cancellate. Lo skipWaiting NON è automatico all'install: la
// pagina chiede l'attivazione via messaggio SKIP_WAITING così il reload avviene
// solo quando c'è davvero una versione nuova (vedi main.ts). Il salvataggio è
// in localStorage, mai toccato da questa cache.

const CACHE = "politicmon-v3";
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
  // NON chiamare skipWaiting qui: il nuovo SW resta "waiting" finché la pagina
  // non conferma (messaggio SKIP_WAITING). Così il reload scatta solo su un vero
  // aggiornamento, non alla primissima installazione.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

// La pagina (main.ts) invia SKIP_WAITING quando un SW nuovo è pronto: attivalo.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
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
  if (request.mode === "navigate" || request.url.includes("manifest.webmanifest")) {
    event.respondWith(
      fetch(request)
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
      fetch(request)
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
