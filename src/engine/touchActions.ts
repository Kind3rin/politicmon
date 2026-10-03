export interface TouchAction {
  command?: "a" | "b" | "start" | "inspect";
  label: string;
  icon?: string;
  group?: string;
  groupHint?: string;
  groupFacts?: readonly { label: string; value: string }[];
  route?: "main" | "branch";
  hint?: string;
  facts?: readonly { label: string; value: string }[];
  order?: "AGISCI PRIMA" | "AGISCI DOPO" | "PARITÀ: 50%";
  disabled?: boolean;
  onInspect?: () => void;
  run: () => void;
}

let deck: HTMLDivElement | undefined;
let signature = "";
let current: readonly TouchAction[] = [];

/** Scene-owned commands: native buttons at thumb height, never synthetic input. */
export function renderTouchActions(actions?: readonly TouchAction[], layout?: "battle" | "growth"): void {
  if (!document.body.classList.contains("touch")) return;
  document.body.classList.toggle("battle-arena", layout === "battle");
  document.body.classList.toggle("growth-stage", layout === "growth");
  current = actions ?? [];
  document.body.classList.toggle("battle-touch", current.length > 0);
  document.body.classList.toggle("battle-moves", current.some(action => action.order));
  if (!current.length) {
    if (deck) deck.hidden = true;
    signature = "";
    return;
  }
  if (!deck) {
    deck = document.createElement("div");
    deck.id = "battle-actions";
    deck.setAttribute("role", "group");
    deck.setAttribute("aria-label", "Azioni del gioco");
    document.querySelector("#touch-ui")?.append(deck);
  }
  deck.hidden = false;
  const next = JSON.stringify(current.map(({ label, hint, order, disabled }) => [label, hint, order, disabled]));
  if (next === signature) return;
  signature = next;
  deck.replaceChildren(...current.map((action, index) => {
    const button = document.createElement("button");
    const label = document.createElement("strong");
    label.textContent = action.label;
    button.append(label);
    if (action.order) {
      const order = document.createElement("span");
      order.className = "action-order";
      order.textContent = action.order;
      button.append(order);
    }
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
