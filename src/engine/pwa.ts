// Gestione dell'installazione PWA: cattura beforeinstallprompt (Chrome/Edge
// Android), mostra un banner non invasivo "Installa Politicmon" e copre i casi
// dove l'evento NON arriva mai: iOS/iPadOS (installazione manuale via
// Condividi), browser Android senza supporto (Firefox/Samsung Internet, menu
// del browser) e webview in-app (Instagram/FB/TikTok: installare è impossibile,
// suggeriamo di aprire nel browser vero).
// Il banner è HTML overlay fuori dal canvas, così non interferisce col gioco.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "politicmon-pwa-dismissed";
// Il "no" non è per sempre: il banner ricompare dopo 7 giorni. Prima il ✕ (o
// un rifiuto del prompt nativo) scriveva un flag PERMANENTE: chi chiudeva una
// volta non vedeva mai più il modo di installare l'app.
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
// Fallback senza beforeinstallprompt: attesa prima di mostrare le istruzioni
// manuali (l'evento di Chrome può arrivare qualche secondo dopo il load).
const FALLBACK_DELAY_MS = 8000;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let bipSeen = false;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  // iPadOS 13+ si spaccia per "Macintosh": lo si riconosce dal multi-touch
  // (i Mac veri hanno maxTouchPoints 0). Senza questo check gli iPad non
  // ricevevano MAI le istruzioni di installazione.
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

// Webview in-app (Instagram, Facebook, Messenger, TikTok, Telegram, X...):
// niente installazione possibile, il consiglio giusto è "apri nel browser".
function isInAppBrowser(): boolean {
  return /instagram|fban|fbav|fb_iab|tiktok|musical_ly|telegram|twitter|; wv\)/i.test(
    navigator.userAgent
  );
}

function isMobile(): boolean {
  return isIos() || /android|mobile/i.test(navigator.userAgent);
}

// true = banner da non mostrare ora (installata, snooze attivo o "mai più").
function isSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) {
      return false;
    }
    if (raw === "done") {
      return true; // installata: mai più
    }
    // Valore legacy "1" (vecchio dismiss permanente): trattato come scaduto,
    // così chi aveva chiuso per sbaglio rivede il banner.
    const t = Number(raw);
    return Number.isFinite(t) && t > 1 && Date.now() - t < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // niente storage: il banner non riapparirà comunque nella sessione
  }
}

function markInstalled(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "done");
  } catch {
    // ignore
  }
}

function buildBanner(message: string, actionLabel: string | null, onAction: (() => void) | null): HTMLElement {
  const bar = document.createElement("div");
  bar.id = "pwa-banner";
  bar.setAttribute("role", "dialog");
  bar.innerHTML = `
    <div class="pwa-banner-inner">
      <span class="pwa-banner-icon">📲</span>
      <span class="pwa-banner-text">${message}</span>
      <div class="pwa-banner-actions"></div>
    </div>`;
  const actions = bar.querySelector<HTMLElement>(".pwa-banner-actions")!;
  if (actionLabel && onAction) {
    const btn = document.createElement("button");
    btn.className = "pwa-banner-install";
    btn.textContent = actionLabel;
    btn.addEventListener("click", onAction);
    actions.appendChild(btn);
  }
  const close = document.createElement("button");
  close.className = "pwa-banner-close";
  close.setAttribute("aria-label", "Chiudi");
  close.textContent = "✕";
  close.addEventListener("click", () => {
    snooze();
    bar.remove();
  });
  actions.appendChild(close);
  return bar;
}

function showBanner(bar: HTMLElement): void {
  document.getElementById("pwa-banner")?.remove();
  document.body.appendChild(bar);
  // Trigger della transizione di entrata.
  requestAnimationFrame(() => bar.classList.add("pwa-banner-show"));
}

// Istruzioni manuali per la piattaforma corrente (quando beforeinstallprompt
// non esiste o non è arrivato).
function fallbackMessage(): string | null {
  if (isInAppBrowser()) {
    return "Per installare l'app apri politicmon.vercel.app nel browser (Chrome o Safari).";
  }
  if (isIos()) {
    return "Per installare: tocca Condividi e poi 'Aggiungi a Home'.";
  }
  if (isMobile()) {
    // Android senza beforeinstallprompt: Firefox, Samsung Internet, ecc.
    return "Per installare: menu del browser (⋮) → 'Aggiungi a schermata Home' o 'Installa'.";
  }
  return null; // desktop: niente banner, l'icona di install sta nella barra URL
}

// Da chiamare una volta all'avvio.
export function initPwaInstall(): void {
  if (isStandalone()) {
    return; // già installata
  }

  // Android/Chrome: l'evento arriva quando l'app è installabile.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    bipSeen = true;
    deferredPrompt = event as BeforeInstallPromptEvent;
    if (isSnoozed()) {
      return;
    }
    const bar = buildBanner(
      "Installa POLITICMON sul telefono e gioca a schermo intero!",
      "INSTALLA",
      async () => {
        const prompt = deferredPrompt;
        if (!prompt) {
          return;
        }
        bar.remove();
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") {
          markInstalled();
        } else {
          // Rifiuto del prompt nativo: pausa, NON "mai più".
          snooze();
        }
        deferredPrompt = null;
      }
    );
    showBanner(bar);
  });

  // Una volta installata, niente più banner.
  window.addEventListener("appinstalled", () => {
    markInstalled();
    document.getElementById("pwa-banner")?.remove();
  });

  // Fallback universale: se dopo qualche secondo beforeinstallprompt non è
  // arrivato (iOS, Firefox/Samsung su Android, webview in-app), mostra le
  // istruzioni manuali della piattaforma. Prima esisteva solo per iOS via
  // user-agent stretto: iPad "Macintosh" e Android non-Chrome restavano senza
  // NESSUNA indicazione.
  window.setTimeout(() => {
    if (bipSeen || isStandalone() || isSnoozed()) {
      return;
    }
    const message = fallbackMessage();
    if (!message) {
      return;
    }
    showBanner(buildBanner(message, null, null));
  }, FALLBACK_DELAY_MS);
}

// Espone se c'è un prompt pendente (utile per un eventuale pulsante nel menu).
export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<void> {
  const prompt = deferredPrompt;
  if (!prompt) {
    return;
  }
  await prompt.prompt();
  await prompt.userChoice;
  deferredPrompt = null;
  snooze();
}
