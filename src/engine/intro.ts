// Optional silent opening. The title is already running underneath it.
const SEEN_KEY = "politicmon-intro-seen";

export function playIntro(): void {
  const overlay = document.querySelector<HTMLDivElement>("#intro-overlay");
  const video = document.querySelector<HTMLVideoElement>("#intro-video");
  const skip = document.querySelector<HTMLButtonElement>("#intro-skip");
  const app = document.querySelector<HTMLElement>("#app");
  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    alreadySeen = false;
  }
  if (!overlay || !video || alreadySeen || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    overlay?.setAttribute("hidden", "");
    return;
  }

  let done = false;
  const finish = () => {
    if (done) {
      return;
    }
    done = true;
    clearTimeout(timer);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // sessionStorage non disponibile: pazienza, lo rivedrà.
    }
    video.pause();
    // Stop unfinished downloads when skipped or connectivity stalls.
    video.removeAttribute("src");
    video.load();
    overlay.setAttribute("hidden", "");
    if (app) app.inert = false;
    overlay.removeEventListener("pointerdown", finish);
    skip?.removeEventListener("click", finish);
    video.onended = video.onerror = null;
    document.removeEventListener("keydown", key, true);
    document.querySelector<HTMLCanvasElement>("#game-canvas")?.focus({preventScroll:true});
  };
  // Consume keys before game input: skipping must not choose a title option.
  const key = (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (["Enter", "Escape", "Space", "KeyZ", "KeyX", "KeyK", "KeyJ", "Backspace"].includes(event.code)) finish();
  };
  const timer = window.setTimeout(finish, 8000);
  overlay.removeAttribute("hidden");
  if (app) app.inert = true;
  skip?.focus({preventScroll:true});
  video.onended = video.onerror = finish;
  overlay.addEventListener("pointerdown", finish);
  skip?.addEventListener("click", finish);
  document.addEventListener("keydown", key, true);

  // Il video ha preload="none" (non ruba banda al bundle su mobile): il
  // download parte solo ora, per chi lo deve davvero vedere.
  video.preload = "auto";
  video.load();

  video.muted = true;
  video.play().catch(finish);
}
