export type InputDevice = "keyboard" | "touch" | "controller";
export type CommandHint = "a" | "b" | "start" | "inspect";
let device: InputDevice = "keyboard";
let padStyle: "xbox" | "playstation" | "generic" = "generic";

export function currentInputDevice(): InputDevice { return device; }
export function commandHint(command: CommandHint): string {
  if (device === "touch") return "";
  if (device === "keyboard") return { a: "Z", b: "Esc", start: "P", inspect: "I" }[command];
  if (padStyle === "playstation") return { a: "×", b: "○", start: "Options", inspect: "□" }[command];
  if (padStyle === "xbox") return { a: "A", b: "B", start: "Menu", inspect: "X" }[command];
  return { a: "Sud", b: "Est", start: "Start", inspect: "Ovest" }[command];
}

export function setInputDevice(next: InputDevice, padId = ""): void {
  const style = /playstation|dualshock|dualsense|054c/i.test(padId) ? "playstation" : /xbox|xinput|045e/i.test(padId) ? "xbox" : "generic";
  if (device === next && (next !== "controller" || padStyle === style)) return;
  device = next;
  if (next === "controller") padStyle = style;
  refreshInputHints();
}

/** Device changes update small labels only; they never remount a text field. */
export function refreshInputHints(): void {
  if (typeof document === "undefined") return;
  document.body.dataset.inputDevice = device;
  document.querySelectorAll<HTMLElement>("[data-command-hint]").forEach(node => {
    node.textContent = commandHint(node.dataset.commandHint as CommandHint);
  });
  const guide: Record<string, string> = device === "touch" ? {
    move: "Trascina la leva o tocca una casella della mappa. Rilascia la leva per fermarti.",
    confirm: "Tocca il personaggio o l’oggetto. Il pulsante in basso dice cosa farà.",
    back: "Indietro chiude un solo livello del menù.",
    menu: "Tocca Menu. Squadra e Mappa hanno accessi diretti.",
    inspect: "Tieni premuta una scheda mossa per leggerne il dettaglio. Non consuma il turno."
  } : device === "controller" ? {
    move: "Croce direzionale o leva sinistra. Nei menù sposta la selezione.",
    confirm: `${commandHint("a")}: conferma o interagisci. È il pulsante frontale in basso.`,
    back: `${commandHint("b")}: Indietro. È il pulsante frontale a destra; chiude un solo livello.`,
    menu: `${commandHint("start")}: apri il menù. Premi di nuovo per tornare al gioco.`,
    inspect: `${commandHint("inspect")}: dettaglio della mossa selezionata. È il pulsante frontale a sinistra.`
  } : {
    move: "Frecce o WASD. Nei menù sposta la selezione; nelle schede lunghe scorri con Su e Giù.",
    confirm: "Z o Invio: conferma o interagisci. Il pulsante selezionato mostra cosa farà.",
    back: "X o Esc: Indietro. Chiude un solo livello del menù.",
    menu: "P: apri il menù. Premi di nuovo per tornare al gioco.",
    inspect: "I: dettaglio della mossa selezionata. Non consuma il turno."
  };
  document.querySelectorAll<HTMLElement>("[data-guide-command]").forEach(node => { node.textContent = guide[node.dataset.guideCommand!] ?? ""; });
  const hint = document.querySelector("#shell-hint");
  if (hint) hint.textContent = device === "controller"
    ? `Croce / leva: muovi · ${commandHint("a")}: conferma · ${commandHint("b")}: Indietro · ${commandHint("start")}: Menu`
    : device === "touch" ? "Trascina per muoverti · Tocca per scegliere" : "Frecce / WASD: muovi · Z / Invio: conferma · X / Esc: Indietro · P: Menu";
}
