import { audio } from "./engine/audio";
import { applyControlMode, loadControlMode } from "./engine/controls";
import { playIntro } from "./engine/intro";
import { initPwaInstall } from "./engine/pwa";
import { mp } from "./net/mp";
import { loadNick } from "./net/profile";
import { flushActiveState } from "./game/state";
import { Input } from "./engine/input";
import { SceneStack } from "./engine/scene";
import { Screen } from "./engine/screen";
import { TitleScene } from "./scenes/TitleScene";
import "./styles.css";

// Mostra i controlli touch sui dispositivi senza mouse.
if (window.matchMedia("(pointer: coarse)").matches) {
  document.body.classList.add("touch");
}

// Applica la preferenza dei controlli di movimento (levetta vs d-pad).
applyControlMode(loadControlMode());

// PWA: offline e installazione su telefono (solo in produzione,
// in dev il service worker intralcerebbe l'HMR di Vite).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  });
}

// Chiede di installare l'app (banner non invasivo, gestisce anche iOS).
initPwaInstall();

// Multiplayer: imposta l'identità online (nickname salvato) prima di connettersi.
mp.setIdentity(loadNick(), "player");

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) {
  throw new Error("Canvas di gioco mancante.");
}

const screen = new Screen(canvas);
const input = new Input();
const stack = new SceneStack();

// In sviluppo esponiamo lo stack delle scene per ispezione/test manuali.
if (import.meta.env.DEV) {
  (window as unknown as { stack: SceneStack }).stack = stack;
}

// La schermata del titolo viene creata SUBITO, così il game loop ha sempre una
// scena da aggiornare/disegnare (niente schermo nero se l'intro tarda).
stack.push(new TitleScene(stack, input));

// Splash video iniziale: un overlay HTML che copre il canvas sopra la TitleScene
// finché il video non finisce (o l'utente lo salta). L'audio del gioco resta
// bloccato finché non c'è un gesto utente, quindi il tema del titolo non si
// accavalla col jingle del video. Non blocca nulla: se l'intro è già stata vista
// o non è disponibile, l'overlay si chiude subito e si vede il titolo.
void playIntro();

// L'audio si può attivare solo dopo il primo input utente.
const unlock = () => {
  audio.unlock();
  document.removeEventListener("pointerdown", unlock);
  document.removeEventListener("keydown", unlock);
};
document.addEventListener("pointerdown", unlock);
document.addEventListener("keydown", unlock);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Salva PRIMA di mettere in pausa: su mobile l'OS può uccidere la scheda
    // in background senza altri eventi, e tutto il progresso non salvato
    // andrebbe perso.
    flushActiveState();
    audio.pauseForLifecycle();
  } else {
    audio.resumeForLifecycle();
  }
});
// La musica si ferma anche quando la finestra perde il focus (alt-tab),
// non solo quando la scheda viene nascosta.
window.addEventListener("blur", () => audio.pauseForLifecycle());
window.addEventListener("focus", () => audio.resumeForLifecycle());
window.addEventListener("pagehide", () => {
  flushActiveState();
  audio.destroy();
});
window.addEventListener("pageshow", () => audio.resumeForLifecycle());
window.addEventListener("beforeunload", () => {
  flushActiveState();
  audio.destroy();
});

let last = performance.now();

function frame(now: number): void {
  const raw = (now - last) / 1000;
  const dt = Number.isFinite(raw) ? Math.min(0.1, Math.max(0, raw)) : 0;
  last = now;
  stack.update(dt);
  stack.draw(screen);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
