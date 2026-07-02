import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { exportSaveCode, importSaveCode, saveGame, type GameState } from "../game/state";
import { Menu, MessageBox, GREY, INK } from "../ui/widgets";

// BACKUP del salvataggio: esporta/importa un "CODICE SALVATAGGIO" (btoa del
// JSON). La copia usa navigator.clipboard con fallback a un overlay HTML con
// testo selezionato; l'incolla usa sempre un overlay HTML (unico modo per
// ricevere testo lungo su canvas, anche su mobile).
export class BackupScene implements Scene {
  readonly transparent = true;
  private menu: Menu;
  private entries = ["COPIA CODICE", "INCOLLA CODICE", "INDIETRO"];
  private msg = new MessageBox();
  private overlay: HTMLDivElement | null = null;
  private pendingImport: GameState | null = null;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.menu = new Menu(this.entries.map((label) => ({ label })));
  }

  update(dt: number): void {
    if (this.overlay) {
      return; // input gestito dal DOM finché l'overlay è aperto
    }
    if (this.pendingImport) {
      // Conferma sovrascrittura: A = importa (e ricarica), B = annulla.
      if (this.input.wasPressed("a")) {
        saveGame(this.pendingImport);
        location.reload();
        return;
      }
      if (this.input.wasPressed("b")) {
        audio.cancel();
        this.pendingImport = null;
      }
      return;
    }
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    const action = this.menu.update(this.input);
    if (action === "cancel") {
      this.stack.pop();
      return;
    }
    if (action !== "select") {
      return;
    }
    switch (this.entries[this.menu.index]) {
      case "COPIA CODICE":
        this.copyCode();
        break;
      case "INCOLLA CODICE":
        this.openOverlay("");
        break;
      case "INDIETRO":
        this.stack.pop();
        break;
    }
  }

  private copyCode(): void {
    const code = exportSaveCode(this.state);
    audio.confirm();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => this.msg.show(["CODICE COPIATO NEGLI APPUNTI!", "Conservalo in un posto sicuro."]))
        .catch(() => this.openOverlay(code));
    } else {
      this.openOverlay(code);
    }
  }

  // Overlay HTML: textarea (con il codice per la copia manuale, o vuota per
  // l'incolla) + bottoni OK/ANNULLA. I tasti dentro la textarea non devono
  // arrivare al gioco (stopPropagation).
  private openOverlay(code: string): void {
    const isImport = code === "";
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.75);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;font-family:monospace";
    const label = document.createElement("div");
    label.textContent = isImport ? "INCOLLA QUI IL CODICE SALVATAGGIO:" : "CODICE SALVATAGGIO (copialo tutto):";
    label.style.cssText = "color:#e8c84a;font-size:14px;text-align:center";
    const ta = document.createElement("textarea");
    ta.value = code;
    ta.readOnly = !isImport;
    ta.style.cssText = "width:min(90vw,480px);height:40vh;background:#10141f;color:#eee;border:2px solid #e8c84a;padding:8px;font-size:11px";
    ta.addEventListener("keydown", (e) => e.stopPropagation());
    ta.addEventListener("keyup", (e) => e.stopPropagation());
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:12px";
    const mkBtn = (text: string) => {
      const b = document.createElement("button");
      b.textContent = text;
      b.style.cssText = "background:#e8c84a;color:#10141f;border:0;padding:8px 18px;font-family:monospace;font-size:14px;cursor:pointer";
      return b;
    };
    const ok = mkBtn(isImport ? "IMPORTA" : "OK");
    const cancel = mkBtn("ANNULLA");
    ok.addEventListener("click", () => {
      const text = ta.value;
      this.closeOverlay();
      if (isImport) {
        const imported = importSaveCode(text);
        if (!imported) {
          audio.cancel();
          this.msg.show(["CODICE NON VALIDO.", "Controlla di averlo incollato tutto."]);
        } else {
          audio.confirm();
          this.pendingImport = imported;
        }
      }
    });
    cancel.addEventListener("click", () => {
      this.closeOverlay();
      audio.cancel();
    });
    if (isImport) {
      row.append(ok, cancel);
    } else {
      row.append(ok);
    }
    wrap.append(label, ta, row);
    document.body.appendChild(wrap);
    this.overlay = wrap;
    ta.focus();
    if (!isImport) {
      ta.select();
    }
  }

  private closeOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  draw(screen: Screen): void {
    screen.dim(0.5);
    screen.panel(24, 30, VIEW_W - 48, VIEW_H - 60);
    screen.text("BACKUP SALVATAGGIO", 34, 38, INK);
    if (this.pendingImport) {
      screen.text("SOVRASCRIVERE IL", 34, 58, INK);
      screen.text("SALVATAGGIO ATTUALE?", 34, 68, INK);
      screen.text("A: SÌ   B: NO", 34, 88, GREY);
    } else {
      this.menu.draw(screen, 34, 52, VIEW_W - 68);
      screen.text("B: indietro", 34, VIEW_H - 42, GREY);
    }
    this.msg.draw(screen);
  }
}
