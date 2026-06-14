// Vibrazione tattile (Vibration API). Centralizzata qui così i pattern sono
// legati a EVENTI di gioco precisi (conferme, colpi, cattura, level-up) e non
// sparsi a caso. Si autoesclude se l'API non c'è (desktop/iOS Safari) o se
// l'utente disattiva l'audio (usiamo lo stesso interruttore: niente suono =
// niente vibrazione, coerente con "modalità silenziosa").

type Pattern = number | number[];

const PREF_KEY = "politicmon-haptics";

class Haptics {
  enabled = true;
  private supported =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  constructor() {
    try {
      this.enabled = localStorage.getItem(PREF_KEY) !== "off";
    } catch {
      this.enabled = true;
    }
  }

  // C'è hardware di vibrazione utilizzabile? (per nascondere il toggle dove inutile)
  get isSupported(): boolean {
    return this.supported;
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    try {
      localStorage.setItem(PREF_KEY, this.enabled ? "on" : "off");
    } catch {
      // localStorage non disponibile: vale per la sessione
    }
    return this.enabled;
  }

  private buzz(pattern: Pattern): void {
    if (!this.enabled || !this.supported) {
      return;
    }
    try {
      navigator.vibrate(pattern);
    } catch {
      // Alcuni browser lanciano se chiamata fuori da un gesto utente: ignora.
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on && this.supported) {
      try {
        navigator.vibrate(0); // interrompe eventuali vibrazioni in corso
      } catch {
        // ignora
      }
    }
  }

  // ---- Pattern semantici (durate in ms) ----
  tap(): void {
    this.buzz(8); // tocco leggero di un pulsante/voce di menu
  }
  confirm(): void {
    this.buzz(14);
  }
  cancel(): void {
    this.buzz([10, 30, 10]);
  }
  hit(): void {
    this.buzz(22); // colpo normale in battaglia
  }
  hitSuper(): void {
    this.buzz([30, 20, 45]); // super efficace: doppio colpo
  }
  faint(): void {
    this.buzz([40, 40, 70]);
  }
  catch(): void {
    this.buzz([18, 60, 18, 60, 18]); // la pallina che traballa
  }
  levelUp(): void {
    this.buzz([12, 30, 12, 30, 24]);
  }
  alert(): void {
    this.buzz([0, 50, 40, 50]); // incontro/sfida: pre-allerta
  }
}

export const haptics = new Haptics();
