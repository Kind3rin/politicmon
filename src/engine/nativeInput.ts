// Ponte verso la tastiera NATIVA del dispositivo. Scrivere col d-pad a schermo
// è lentissimo su mobile: qui apriamo un vero <input> HTML (fuori dallo schermo
// di gioco, invisibile) e diamo il focus. Il browser fa comparire la tastiera
// di sistema; la scena legge il valore e lo disegna col proprio font pixel.
//
// Un solo <input> riusato da tutte le scene (nickname, chat, dialogo). Ogni
// sessione di scrittura ha limite di caratteri e sanitizzatore propri.

export interface NativeInputOptions {
  initial: string;
  maxLength: number;
  // Normalizza ogni valore digitato (es. nick: solo MAIUSCOLE/numeri).
  sanitize?: (raw: string) => string;
  // Chiamato a ogni modifica del testo (per aggiornare la UI di gioco).
  onInput?: (value: string) => void;
  // Chiamato quando l'utente conferma (INVIO/GO sulla tastiera nativa).
  onSubmit?: (value: string) => void;
  // "text" (default) o "off" per disattivare autocapitalize/autocorrect.
  autocapitalize?: string;
}

let el: HTMLInputElement | null = null;
let active: NativeInputOptions | null = null;
let onInputBound: (() => void) | null = null;
let onKeyBound: ((e: KeyboardEvent) => void) | null = null;
let onBlurBound: (() => void) | null = null;

// La tastiera nativa vale la pena solo dove NON c'è una tastiera fisica: touch.
// Su desktop la on-screen keyboard del gioco + tastiera fisica bastano, e un
// <input> che ruba il focus darebbe fastidio.
export function nativeKeyboardAvailable(): boolean {
  try {
    return document.body.classList.contains("touch") || matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

function ensureEl(): HTMLInputElement {
  if (el) {
    return el;
  }
  const input = document.createElement("input");
  input.id = "native-text-input";
  input.type = "text";
  input.autocomplete = "off";
  input.setAttribute("autocorrect", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("aria-hidden", "true");
  input.tabIndex = -1;
  // Fuori dallo schermo ma NON display:none (display:none non riceve focus e la
  // tastiera non si apre). Opacità 0 + posizione fissa in alto: invisibile, ma
  // focalizzabile. Zero dimensione utile visiva.
  Object.assign(input.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    border: "0",
    padding: "0",
    margin: "0",
    zIndex: "-1",
    // Evita lo scroll-into-view/zoom automatico di iOS su focus di un input
    // con font < 16px: teniamo 16px (tanto è invisibile).
    fontSize: "16px",
    pointerEvents: "none"
  });
  document.body.appendChild(input);
  el = input;
  return input;
}

// Apre la tastiera nativa per una sessione di scrittura. Ritorna true se ha
// aperto (touch), false se non disponibile (desktop): in quel caso la scena usa
// la propria on-screen keyboard come prima.
export function openNativeKeyboard(opts: NativeInputOptions): boolean {
  if (!nativeKeyboardAvailable()) {
    return false;
  }
  const input = ensureEl();
  active = opts;
  input.maxLength = opts.maxLength;
  input.setAttribute("autocapitalize", opts.autocapitalize ?? "sentences");
  input.value = opts.initial;

  detach(); // rimuovi eventuali listener di una sessione precedente

  onInputBound = () => {
    if (!active) {
      return;
    }
    const clean = active.sanitize ? active.sanitize(input.value) : input.value;
    // Riflette il valore sanitizzato nell'input nativo, così la tastiera non
    // mostra caratteri che il gioco poi scarta.
    if (clean !== input.value) {
      input.value = clean;
    }
    active.onInput?.(clean);
  };
  onKeyBound = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const clean = active?.sanitize ? active.sanitize(input.value) : input.value;
      active?.onSubmit?.(clean);
    }
  };
  onBlurBound = () => {
    // Perso il focus (tastiera chiusa dal sistema/tasto "fine"): la sessione
    // resta viva finché la scena non chiama close(). Non facciamo nulla:
    // ri-focus aggressivo darebbe loop su alcuni browser.
  };

  input.addEventListener("input", onInputBound);
  input.addEventListener("keydown", onKeyBound);
  input.addEventListener("blur", onBlurBound);

  // Focus DEVE avvenire dentro un gesture handler dell'utente (il tap che apre
  // la scena): iOS apre la tastiera solo così. Le scene chiamano open* dentro
  // update() a seguito di un tasto, quindi siamo nel gesto.
  input.focus({ preventScroll: true });
  // Porta il cursore in fondo.
  const len = input.value.length;
  try {
    input.setSelectionRange(len, len);
  } catch {
    // alcuni tipi non supportano setSelectionRange: ininfluente
  }
  return true;
}

// Riporta il focus sulla tastiera nativa (dopo un tap sul canvas che l'ha
// tolto). Da chiamare da un gestore di tap della scena.
export function refocusNativeKeyboard(): void {
  if (el && active) {
    el.focus({ preventScroll: true });
  }
}

export function nativeKeyboardValue(): string {
  return el?.value ?? "";
}

export function setNativeKeyboardValue(value: string): void {
  if (el) {
    el.value = value;
    const len = value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      // ignore
    }
  }
}

export function isNativeKeyboardOpen(): boolean {
  return active !== null;
}

function detach(): void {
  if (!el) {
    return;
  }
  if (onInputBound) {
    el.removeEventListener("input", onInputBound);
  }
  if (onKeyBound) {
    el.removeEventListener("keydown", onKeyBound);
  }
  if (onBlurBound) {
    el.removeEventListener("blur", onBlurBound);
  }
  onInputBound = onKeyBound = onBlurBound = null;
}

// Chiude la sessione: toglie il focus (fa sparire la tastiera) e stacca i
// listener. Da chiamare in onExit/quando la scena finisce di scrivere.
export function closeNativeKeyboard(): void {
  detach();
  active = null;
  if (el) {
    el.blur();
    el.value = "";
  }
}
