import { VIEW_H, VIEW_W } from "./screen";

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

// Punto in coordinate interne dello schermo (240x180).
export interface ScreenPoint {
  x: number;
  y: number;
}

// Stato input unificato tastiera + touch. `pressed` dura un solo frame.
export class Input {
  private held = new Set<Button>();
  private pressedNow = new Set<Button>();
  // Tocco diretto sul canvas: posizione (in coord. interne) del tap rilasciato
  // in questo frame. Un singolo frame, come pressedNow.
  private tapNow: ScreenPoint | null = null;

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
    this.bindCanvas();
  }

  // Tocco diretto sullo schermo di gioco: traduce le coordinate del puntatore
  // sul canvas in coordinate interne 240x180, così le scene possono fare
  // hit-test su voci di menu, pulsanti a schermo e box di dialogo. Un "tap" è
  // un tocco che si solleva senza essere trascinato troppo (non è uno swipe).
  private bindCanvas(): void {
    const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
    if (!canvas) {
      return;
    }
    let downId: number | null = null;
    let downClientX = 0;
    let downClientY = 0;

    const toInternal = (clientX: number, clientY: number): ScreenPoint => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * VIEW_W;
      const y = ((clientY - rect.top) / rect.height) * VIEW_H;
      return { x, y };
    };

    canvas.addEventListener("pointerdown", (event) => {
      downId = event.pointerId;
      downClientX = event.clientX;
      downClientY = event.clientY;
    });
    const lift = (event: PointerEvent) => {
      if (event.pointerId !== downId) {
        return;
      }
      const moved = Math.hypot(event.clientX - downClientX, event.clientY - downClientY);
      const rect = canvas.getBoundingClientRect();
      // Soglia swipe proporzionale alla scala del canvas (~ mezza cella font).
      const threshold = (rect.width / VIEW_W) * 6;
      if (moved <= threshold) {
        this.tapNow = toInternal(event.clientX, event.clientY);
      }
      downId = null;
    };
    canvas.addEventListener("pointerup", lift);
    canvas.addEventListener("pointercancel", () => {
      downId = null;
    });
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

  // Tap rilasciato sul canvas in questo frame (coord. interne 240x180), o null.
  consumeTap(): ScreenPoint | null {
    return this.tapNow;
  }

  // È stato fatto tap dentro il rettangolo (x,y,w,h)? Consuma il tap se sì,
  // così non viene gestito due volte nello stesso frame.
  tapInRect(x: number, y: number, w: number, h: number): boolean {
    const t = this.tapNow;
    if (!t || t.x < x || t.x >= x + w || t.y < y || t.y >= y + h) {
      return false;
    }
    this.tapNow = null;
    return true;
  }

  clearTap(): void {
    this.tapNow = null;
  }

  // Da chiamare a fine frame.
  endFrame(): void {
    this.pressedNow.clear();
    this.tapNow = null;
  }
}
