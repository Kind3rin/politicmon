// Gestione dell'installazione PWA: cattura beforeinstallprompt (Android/Chrome),
// mostra un banner non invasivo "Installa Politicmon" e gestisce il caso iOS
// (dove l'installazione è manuale: Condividi -> Aggiungi a Home).
// Il banner è HTML overlay fuori dal canvas, così non interferisce col gioco.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "politicmon-pwa-dismissed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // niente storage: il banner non riapparirà comunque nella sessione
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
    markDismissed();
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

// Da chiamare una volta all'avvio.
export function initPwaInstall(): void {
  if (isStandalone() || wasDismissed()) {
    return; // già installata o l'utente non vuole
  }

  // Android/Chrome: l'evento arriva quando l'app è installabile.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    if (wasDismissed()) {
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
        if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
          markDismissed();
        }
        deferredPrompt = null;
      }
    );
    showBanner(bar);
  });

  // Una volta installata, niente più banner.
  window.addEventListener("appinstalled", () => {
    markDismissed();
    document.getElementById("pwa-banner")?.remove();
  });

  // iOS: nessun beforeinstallprompt. Se è Safari su iPhone e non standalone,
  // mostra le istruzioni manuali dopo qualche secondo di gioco.
  if (isIos() && !isStandalone()) {
    window.setTimeout(() => {
      if (wasDismissed() || isStandalone()) {
        return;
      }
      const bar = buildBanner(
        "Per installare: tocca Condividi e poi 'Aggiungi a Home'.",
        null,
        null
      );
      showBanner(bar);
    }, 6000);
  }
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
  markDismissed();
}
