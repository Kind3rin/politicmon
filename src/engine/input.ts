export type Button = "up" | "down" | "left" | "right" | "a" | "b" | "start";

const KEY_MAP: Record<string, Button> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  KeyZ: "a",
  KeyK: "a",
  Space: "a",
  Enter: "a",
  KeyX: "b",
  KeyJ: "b",
  Escape: "b",
  Backspace: "b",
  KeyP: "start",
  Tab: "start"
};

// Stato input unificato tastiera + touch. `pressed` dura un solo frame.
export class Input {
  private held = new Set<Button>();
  private pressedNow = new Set<Button>();

  constructor() {
    document.addEventListener("keydown", (event) => {
      const button = KEY_MAP[event.code];
      if (!button) {
        return;
      }
      event.preventDefault();
      if (!this.held.has(button)) {
        this.pressedNow.add(button);
      }
      this.held.add(button);
    });
    document.addEventListener("keyup", (event) => {
      const button = KEY_MAP[event.code];
      if (button) {
        this.held.delete(button);
      }
    });
    this.bindTouch();
    this.bindStick();
  }

  private bindTouch(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>("[data-key]");
    for (const el of buttons) {
      const button = el.dataset.key as Button;
      const press = (event: Event) => {
        event.preventDefault();
        if (!this.held.has(button)) {
          this.pressedNow.add(button);
        }
        this.held.add(button);
      };
      const release = (event: Event) => {
        event.preventDefault();
        this.held.delete(button);
      };
      el.addEventListener("pointerdown", press);
      el.addEventListener("pointerup", release);
      el.addEventListener("pointerleave", release);
      el.addEventListener("pointercancel", release);
      el.addEventListener("contextmenu", (event) => event.preventDefault());
    }
  }

  // Levetta analogica virtuale: il trascinamento dal centro viene tradotto
  // nella direzione cardinale dominante (il movimento è a griglia, niente
  // diagonali). Tiene la direzione "held" finché il dito resta fuori dalla
  // deadzone e ricentra il cappuccio al rilascio.
  private bindStick(): void {
    const stick = document.querySelector<HTMLElement>("[data-stick]");
    const cap = document.querySelector<HTMLElement>("#touch-stick-cap");
    if (!stick) {
      return;
    }
    const DEADZONE = 14; // px prima che la levetta registri una direzione
    const MAX = 40; // corsa massima visiva del cappuccio
    let pointerId: number | null = null;
    let originX = 0;
    let originY = 0;
    let stickDir: Button | null = null;

    const setDir = (dir: Button | null) => {
      if (dir === stickDir) {
        return;
      }
      // Rilascia la direzione precedente, premi quella nuova.
      if (stickDir) {
        this.held.delete(stickDir);
      }
      stickDir = dir;
      if (dir) {
        if (!this.held.has(dir)) {
          this.pressedNow.add(dir);
        }
        this.held.add(dir);
      }
    };

    const moveCap = (dx: number, dy: number) => {
      if (!cap) {
        return;
      }
      const cx = Math.max(-MAX, Math.min(MAX, dx));
      const cy = Math.max(-MAX, Math.min(MAX, dy));
      cap.style.transform = `translate(${cx}px, ${cy}px)`;
    };

    const onMove = (clientX: number, clientY: number) => {
      const dx = clientX - originX;
      const dy = clientY - originY;
      if (Math.hypot(dx, dy) < DEADZONE) {
        setDir(null);
        moveCap(dx, dy);
        return;
      }
      // Asse dominante -> direzione cardinale (no diagonali).
      const dir: Button =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      setDir(dir);
      moveCap(dx, dy);
    };

    const release = () => {
      pointerId = null;
      setDir(null);
      if (cap) {
        cap.style.transform = "translate(0px, 0px)";
      }
    };

    stick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      pointerId = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      const rect = stick.getBoundingClientRect();
      // Origine al centro della levetta (così il primo tocco non scatta).
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
      onMove(event.clientX, event.clientY);
    });
    stick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) {
        return;
      }
      event.preventDefault();
      onMove(event.clientX, event.clientY);
    });
    const end = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) {
        return;
      }
      event.preventDefault();
      release();
    };
    stick.addEventListener("pointerup", end);
    stick.addEventListener("pointercancel", end);
    stick.addEventListener("pointerleave", end);
    stick.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  isHeld(button: Button): boolean {
    return this.held.has(button);
  }

  wasPressed(button: Button): boolean {
    return this.pressedNow.has(button);
  }

  heldDirection(): Button | null {
    for (const dir of ["up", "down", "left", "right"] as const) {
      if (this.held.has(dir)) {
        return dir;
      }
    }
    return null;
  }

  // Da chiamare a fine frame.
  endFrame(): void {
    this.pressedNow.clear();
  }
}
