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
  KeyP: "start"
};

// Native controls and modal guides own their keyboard activation.
function isNativeControlTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) {
    return false;
  }
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "button" || tag === "select" || tag === "a" || el.isContentEditable === true || Boolean(document.querySelector('dialog[open]'));
}

// Punto in coordinate interne dello schermo (240x180).
export interface ScreenPoint {
  x: number;
  y: number;
}

// Stato input unificato tastiera + touch. `pressed` dura un solo frame.
export class Input {
  private sources = new Map<string, Button>();
  private pointers = new Set<number>();
  private pressedNow = new Set<Button>();
  // Tocco diretto sul canvas: posizione (in coord. interne) del tap rilasciato
  // in questo frame. Un singolo frame, come pressedNow.
  private tapNow: ScreenPoint | null = null;
  private releaseStick:()=>void=()=>{};
  private releaseCanvas:()=>void=()=>{};

  constructor() {
    document.addEventListener("keydown", (event) => {
      // Se il focus è su un campo di testo (la tastiera NATIVA del telefono,
      // vedi nativeInput.ts), i tasti appartengono a quel campo, NON al gioco:
      // altrimenti Invio/Spazio venivano mappati su "A" e chiudevano la scena
      // mentre l'utente scriveva. Il campo gestisce input/Enter da sé.
      if (isNativeControlTarget(event.target)) {
        return;
      }
      const button = KEY_MAP[event.code];
      if (!button) {
        return;
      }
      event.preventDefault();
      // A key held through a modal/reset must be released before it can
      // become a fresh command. Existing holds already drive continuous input.
      if (!event.repeat) this.setSource(event.code, button);
    });
    document.addEventListener("keyup", (event) => {
      const button = KEY_MAP[event.code];
      if (button) {
        this.setSource(event.code, null);
      }
    });
    this.bindTouch();
    this.bindStick();
    this.bindCanvas();
    window.addEventListener('blur',()=>this.reset());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
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
    this.releaseCanvas=()=>{downId=null;};

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

  // Each key/finger owns its hold. Releasing one cannot cancel another.
  private setSource(source: string, button: Button | null): void {
    const previous = this.sources.get(source);
    if (previous === button) return;
    const fresh = button && !this.isHeld(button);
    this.sources.delete(source);
    if (button) this.sources.set(source, button);
    if (previous && !this.isHeld(previous)) this.showHeld(previous, false);
    if (button) {
      if (fresh) this.pressedNow.add(button);
      this.showHeld(button, true);
    }
  }

  private showHeld(button: Button, held: boolean): void {
    document.querySelectorAll(`[data-key="${button}"]`).forEach(el => el.toggleAttribute('data-held', held));
  }

  private bindTouch(): void {
    for (const el of document.querySelectorAll<HTMLButtonElement>("[data-key]")) {
      const button = el.dataset.key as Button;
      const pad = el.closest<HTMLElement>('#touch-dpad');
      el.addEventListener('pointerdown', event => {
        if (document.querySelector('dialog[open]')) return;
        event.preventDefault();
        this.pointers.add(event.pointerId);
        el.setPointerCapture(event.pointerId);
        this.setSource(`pointer${event.pointerId}`, button);
      });
      el.addEventListener('pointermove', event => {
        if (!pad || !this.pointers.has(event.pointerId)) return;
        event.preventDefault();
        const r = pad.getBoundingClientRect();
        const dx = event.clientX - r.left - r.width / 2, dy = event.clientY - r.top - r.height / 2;
        const dir = Math.max(Math.abs(dx), Math.abs(dy)) < r.width / 6 ? null :
          Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        this.setSource(`pointer${event.pointerId}`, dir);
      });
      const release = (event: PointerEvent) => {
        this.pointers.delete(event.pointerId);
        this.setSource(`pointer${event.pointerId}`, null);
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
      el.addEventListener('contextmenu', event => event.preventDefault());
      el.addEventListener('click', event => {
        if (event.detail === 0 && !document.querySelector('dialog[open]')) this.pressedNow.add(button);
      });
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
      stickDir = dir;
      this.setSource('stick', dir);
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
    this.releaseStick=release;

    stick.addEventListener("pointerdown", (event) => {
      if (pointerId !== null || document.querySelector('dialog[open]')) return;
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
    stick.addEventListener("lostpointercapture", end);
    stick.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  isHeld(button: Button): boolean {
    for (const value of this.sources.values()) if (value === button) return true;
    return false;
  }

  wasPressed(button: Button): boolean {
    return this.pressedNow.has(button);
  }

  heldDirection(): Button | null {
    for (const dir of ["up", "down", "left", "right"] as const) {
      if (this.isHeld(dir)) {
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

  reset():void{this.releaseStick();this.releaseCanvas();for(const b of this.sources.values())this.showHeld(b,false);this.sources.clear();this.pointers.clear();this.pressedNow.clear();this.tapNow=null;}

  // Da chiamare a fine frame.
  endFrame(): void {
    this.pressedNow.clear();
    this.tapNow = null;
  }
}
