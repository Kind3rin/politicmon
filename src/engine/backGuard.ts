/** The system "back" of an installed Android PWA (the swipe from either edge, the back key) closes the game. The joystick and a finger
 * dragging across the map start near the edges, so an accidental back would end the session. The guard keeps one history entry in front
 * of the page and turns each back into what a person means by it: close the panel or the dialog, open the menu from the map, and only
 * leave from the title screen. */
export type BackAction = "close" | "menu" | "leave";

/** What one "back" should do, from what is on screen. */
export function backAction(screen: { title: boolean; world: boolean }): BackAction {
  if (screen.title) return "leave";
  return screen.world ? "menu" : "close";
}

export function screenKind(body: { classList: { contains(name: string): boolean } }, doc: { querySelector(selector: string): unknown }): { title: boolean; world: boolean } {
  const covered = ["ui-panel-open", "ui-dialog-open", "ui-conversation-open", "ui-arena-open"].some(name => body.classList.contains(name));
  return { title: Boolean(doc.querySelector(".ui-splash")) && !body.classList.contains("ui-world-open"), world: body.classList.contains("ui-world-open") && !covered };
}

/** Installs the guard where it applies (Android, installed). Returns whether it did. */
export function installBackGuard(win: Window, standalone: boolean): boolean {
  if (!standalone || !/Android/i.test(win.navigator.userAgent)) return false;
  const doc = win.document;
  win.history.pushState({ politicmonGuard: true }, "");
  win.addEventListener("popstate", () => {
    const action = backAction(screenKind(doc.body, doc));
    if (action === "leave") { win.history.back(); return; } // the guard is gone; one more back leaves the app
    win.history.pushState({ politicmonGuard: true }, "");
    if (action === "menu") (doc.querySelector(".ui-world-nav button:last-child") as HTMLElement | null)?.click();
    else {
      for (const type of ["keydown", "keyup"]) doc.dispatchEvent(new KeyboardEvent(type, { code: "Escape", key: "Escape", bubbles: true }));
    }
  });
  return true;
}
