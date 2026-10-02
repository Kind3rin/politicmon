export interface TouchAction {
  label: string;
  hint?: string;
  disabled?: boolean;
  run: () => void;
}

let deck: HTMLDivElement | undefined;
let signature = "";
let current: readonly TouchAction[] = [];

/** Scene-owned commands: native buttons at thumb height, never synthetic input. */
export function renderTouchActions(actions?: readonly TouchAction[]): void {
  if (!document.body.classList.contains("touch")) return;
  current = actions ?? [];
  document.body.classList.toggle("battle-touch", current.length > 0);
  if (!current.length) {
    if (deck) deck.hidden = true;
    signature = "";
    return;
  }
  if (!deck) {
    deck = document.createElement("div");
    deck.id = "battle-actions";
    deck.setAttribute("role", "group");
    deck.setAttribute("aria-label", "Azioni della lotta");
    document.querySelector("#touch-ui")?.append(deck);
  }
  deck.hidden = false;
  const next = JSON.stringify(current.map(({ label, hint, disabled }) => [label, hint, disabled]));
  if (next === signature) return;
  signature = next;
  deck.replaceChildren(...current.map((action, index) => {
    const button = document.createElement("button");
    const label = document.createElement("strong");
    label.textContent = action.label;
    button.append(label);
    if (action.hint) {
      const hint = document.createElement("small");
      hint.textContent = action.hint;
      button.append(hint);
    }
    button.disabled = Boolean(action.disabled);
    button.onclick = () => { if (!current[index]?.disabled) current[index]?.run(); };
    return button;
  }));
}
