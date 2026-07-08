// Splash video iniziale (Ponte sullo Stretto + marcetta satirica).
// Si chiude a fine video, al tocco/click o sul tasto SALTA. Non blocca il gioco:
// se il file manca o il browser rifiuta l'autoplay, si chiude subito e si passa
// alla schermata del titolo. Mostrato una volta per sessione del browser (così
// non infastidisce a ogni ricarica) — cambia STORAGE_KEY per rivederlo sempre.

const SEEN_KEY = "politicmon-intro-seen";

export function playIntro(): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.querySelector<HTMLDivElement>("#intro-overlay");
    const video = document.querySelector<HTMLVideoElement>("#intro-video");
    const skip = document.querySelector<HTMLButtonElement>("#intro-skip");

    // Se l'overlay non c'è, o l'abbiamo già visto in questa sessione, salta.
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      alreadySeen = false;
    }
    if (!overlay || !video || alreadySeen) {
      overlay?.setAttribute("hidden", "");
      resolve();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // sessionStorage non disponibile: pazienza, lo rivedrà.
      }
      video.pause();
      overlay.setAttribute("hidden", "");
      overlay.removeEventListener("pointerdown", finish);
      skip?.removeEventListener("click", finish);
      resolve();
    };

    overlay.removeAttribute("hidden");
    video.addEventListener("ended", finish, { once: true });
    video.addEventListener("error", finish, { once: true });
    overlay.addEventListener("pointerdown", finish);
    skip?.addEventListener("click", finish);

    // Sicurezza: se in 8s non è finito (video lungo o evento perso), chiudi.
    window.setTimeout(finish, 8000);

    // Il video ha preload="none" (non ruba banda al bundle su mobile): il
    // download parte solo ora, per chi lo deve davvero vedere.
    video.preload = "auto";
    video.load();

    // Autoplay: parte muto per rispettare le policy, poi alza il volume appena
    // possibile (molti browser bloccano l'audio finché non c'è un gesto utente,
    // ma il video parte comunque).
    video.muted = false;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Audio bloccato: riprova muto così almeno le immagini scorrono.
        video.muted = true;
        video.play().catch(finish);
      });
    }
  });
}
