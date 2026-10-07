import { APP_BUILD_ID } from "./build";

// Registry degli sprite PNG (redesign PixelLab). Gli asset di gioco non sono più
// solo pixel-map testuali: i mostri, i tile, il personaggio e gli NPC possono
// essere PNG generati con PixelLab e serviti da `public/sprites/...`.
//
// Filosofia anti-regressione: gli sprite critici vengono pre-caricati al boot e
// versionati con APP_BUILD_ID, così PWA/browser non mostrano asset vecchi dopo
// una release. I salvataggi non sono toccati: la grafica è solo presentazione.

export type SpriteStatus = "idle" | "loading" | "ready" | "missing";

interface Entry {
  status: SpriteStatus;
  img: HTMLImageElement | null;
}

const registry = new Map<string, Entry>();
let spriteRevision = 0;
export function spriteAssetRevision(): number { return spriteRevision; }
const SPRITE_VERSION = APP_BUILD_ID;

export interface SpriteRegistryStats {
  entries: number;
  ready: number;
  loading: number;
  missing: number;
  decodedBytesEstimate: number;
}

export function spriteRegistryStats(): SpriteRegistryStats {
  let ready = 0;
  let loading = 0;
  let missing = 0;
  let decodedBytesEstimate = 0;
  for (const entry of registry.values()) {
    if (entry.status === "ready") {
      ready += 1;
      if (entry.img) decodedBytesEstimate += (entry.img.naturalWidth || entry.img.width) * (entry.img.naturalHeight || entry.img.height) * 4;
    } else if (entry.status === "loading") loading += 1;
    else if (entry.status === "missing") missing += 1;
  }
  return { entries: registry.size, ready, loading, missing, decodedBytesEstimate };
}

// Base path degli sprite serviti staticamente. In Vite tutto ciò che sta in
// `public/` è servito dalla radice; con base relativa (PWA) `import.meta.env.BASE_URL`
// tiene conto di eventuali sottocartelle di deploy.
function spriteUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base.replace(/\/$/, "")}/sprites/${path}?v=${SPRITE_VERSION}`;
}

// Restituisce l'immagine pronta per `id`, oppure null se non ancora caricata /
// assente. Avvia il caricamento lazy alla prima richiesta.
export function getSpriteImage(id: string, path: string): HTMLImageElement | null {
  const existing = registry.get(id);
  if (existing) {
    if (existing.status === "ready") return existing.img;
    promote(id); // a scene is drawing it now: it no longer waits its turn behind the background downloads
    return null;
  }
  loadSprite(id, path);
  return null;
}

// Background downloads (the art a first frame does not need) go a few at a time and at low priority, so that what the player has just
// asked for — the world's code, the music of the first town, a sprite a scene is drawing — is not stuck behind hundreds of pictures on a
// slow connection. A queued sprite that a scene asks for is started at once.
const BACKGROUND_LIMIT = 4;
const queued = new Map<string, (low: boolean) => void>();
const order: string[] = [];
let running = 0;

function pump(): void {
  while (running < BACKGROUND_LIMIT && order.length) {
    const job = queued.get(order.shift()!);
    if (job) job(true);
  }
}

function promote(id: string): void {
  queued.get(id)?.(false);
}

export function loadSprite(id: string, path: string, background = false): void {
  if (registry.has(id)) {
    if (!background) promote(id);
    return;
  }
  const entry: Entry = { status: "loading", img: null };
  registry.set(id, entry);
  const start = (low: boolean) => {
    queued.delete(id);
    if (low) running += 1;
    const img = new Image();
    if (low) (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
    const settle = (status: SpriteStatus) => {
      entry.status = status;
      spriteRevision++;
      if (low) { running -= 1; pump(); }
    };
    img.onload = () => { entry.img = img; settle("ready"); };
    img.onerror = () => settle("missing");
    img.src = spriteUrl(path);
  };
  if (!background) { start(false); return; }
  queued.set(id, start);
  order.push(id);
  pump();
}

// Pre-carica un batch di sprite (id → path). Da chiamare all'avvio per i mostri
// e i tile, così sono pronti prima della prima battaglia / del primo frame mappa.
// `background`: in coda, pochi alla volta e a bassa priorità (vedi sopra).
export function preloadSprites(entries: Record<string, string>, background = false): void {
  for (const [id, path] of Object.entries(entries)) {
    loadSprite(id, path, background);
  }
}

export function spriteStatus(id: string): SpriteStatus {
  return registry.get(id)?.status ?? "idle";
}

export function waitForSprites(ids: string[], timeoutMs = 2000): Promise<void> {
  const started = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const done = ids.every((id) => {
        promote(id); // somebody is waiting for it
        const status = spriteStatus(id);
        return status === "ready" || status === "missing";
      });
      if (done || performance.now() - started >= timeoutMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

// Immagine generica per id+path (sfondi scena, ecc.): ritorna l'HTMLImageElement
// pronto o null, avviando il caricamento lazy. Wrapper su getSpriteImage con
// chiave esplicita.
export function sceneImage(id: string, path: string): HTMLImageElement | null {
  return getSpriteImage(id, path);
}
