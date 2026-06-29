// Registry degli sprite PNG (redesign PixelLab). Gli asset di gioco non sono più
// solo pixel-map testuali: i mostri, i tile, il personaggio e gli NPC possono
// essere PNG generati con PixelLab e serviti da `public/sprites/...`.
//
// Filosofia anti-regressione: il caricamento è ASYNC e non bloccante. Finché il
// PNG non è pronto (o se manca del tutto), il renderer ricade sul vecchio
// `Pixmap` testuale. Così il gioco non mostra mai un buco e i salvataggi non
// sono toccati (la grafica è puramente di presentazione).

export type SpriteStatus = "idle" | "loading" | "ready" | "missing";

interface Entry {
  status: SpriteStatus;
  img: HTMLImageElement | null;
}

const registry = new Map<string, Entry>();
const SPRITE_VERSION = "nonbar-buildings-6e84b4b";

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
    return existing.status === "ready" ? existing.img : null;
  }
  loadSprite(id, path);
  return null;
}

export function loadSprite(id: string, path: string): void {
  if (registry.has(id)) {
    return;
  }
  const entry: Entry = { status: "loading", img: null };
  registry.set(id, entry);
  const img = new Image();
  img.onload = () => {
    entry.img = img;
    entry.status = "ready";
  };
  img.onerror = () => {
    entry.status = "missing";
  };
  img.src = spriteUrl(path);
}

// Pre-carica un batch di sprite (id → path). Da chiamare all'avvio per i mostri
// e i tile, così sono pronti prima della prima battaglia / del primo frame mappa.
export function preloadSprites(entries: Record<string, string>): void {
  for (const [id, path] of Object.entries(entries)) {
    loadSprite(id, path);
  }
}

export function spriteStatus(id: string): SpriteStatus {
  return registry.get(id)?.status ?? "idle";
}

// Immagine generica per id+path (sfondi scena, ecc.): ritorna l'HTMLImageElement
// pronto o null, avviando il caricamento lazy. Wrapper su getSpriteImage con
// chiave esplicita.
export function sceneImage(id: string, path: string): HTMLImageElement | null {
  return getSpriteImage(id, path);
}

// Carica la cornice 9-slice PixelLab e la registra su `screen` appena pronta.
// Non bloccante: finché non c'è, `panel()` usa il fallback Game Boy a codice.
export function loadPanelImage(
  setPanel: (img: HTMLImageElement, border: number) => void,
  path = "ui/dialog.png",
  border = 12
): void {
  const img = new Image();
  img.onload = () => setPanel(img, border);
  img.src = spriteUrl(path);
}
