// Preferenza dei controlli di movimento su touch: levetta analogica o d-pad.
// Persistita in localStorage e riflessa con una classe sul <body>, così il CSS
// mostra solo l'elemento attivo.

export type ControlMode = "stick" | "dpad";

const KEY = "politicmon-control";

export function loadControlMode(): ControlMode {
  try {
    return localStorage.getItem(KEY) === "dpad" ? "dpad" : "stick";
  } catch {
    return "stick";
  }
}

export function applyControlMode(mode: ControlMode): void {
  document.body.classList.toggle("ctrl-stick", mode === "stick");
  document.body.classList.toggle("ctrl-dpad", mode === "dpad");
}

export function setControlMode(mode: ControlMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // localStorage non disponibile: la preferenza resta solo per la sessione.
  }
  applyControlMode(mode);
}

export function toggleControlMode(): ControlMode {
  const next: ControlMode = loadControlMode() === "stick" ? "dpad" : "stick";
  setControlMode(next);
  return next;
}

// Modalità guidata: mostra una freccia verso il prossimo obiettivo della storia.
const GUIDE_KEY = "politicmon-guide";

export function isGuideOn(): boolean {
  try {
    return localStorage.getItem(GUIDE_KEY) !== "off"; // attiva di default
  } catch {
    return true;
  }
}

export function toggleGuide(): boolean {
  const next = !isGuideOn();
  try {
    localStorage.setItem(GUIDE_KEY, next ? "on" : "off");
  } catch {
    // localStorage non disponibile: vale per la sessione
  }
  return next;
}
