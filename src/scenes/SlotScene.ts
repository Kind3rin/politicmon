import { audio } from "../engine/audio";
import { MAPS } from "../data/maps";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import {
  clearSlot,
  hasSaveInSlot,
  loadGame,
  setActiveSlot,
  slotSummary,
  SLOT_COUNT,
  type GameState,
  type SlotSummary
} from "../game/state";
import { Menu, MessageBox, GREY, INK } from "../ui/widgets";

type SlotMode = "load" | "new";

// Selettore degli SLOT di salvataggio (1/2/3). In modalità "load" apre lo slot
// scelto (CONTINUA); in "new" lo seleziona per una nuova campagna, chiedendo
// conferma se non è vuoto. L'esito torna al chiamante via callback:
//  - "load": onPick(state) con la partita caricata dallo slot.
//  - "new":  onPick(null) dopo aver fissato lo slot attivo (ripulito se serviva).
export class SlotScene implements Scene {
  readonly transparent = true;
  private menu: Menu;
  private msg = new MessageBox();
  private summaries: SlotSummary[] = [];
  // Slot in attesa di conferma sovrascrittura/cancellazione (modalità "new"/delete).
  private pendingOverwrite = -1;
  private pendingDelete = -1;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private mode: SlotMode,
    private onPick: (state: GameState | null) => void
  ) {
    this.menu = this.buildMenu();
  }

  private buildMenu(): Menu {
    this.summaries = [];
    const items: Array<{ label: string; rightLabel?: string; disabled?: boolean }> = [];
    for (let s = 0; s < SLOT_COUNT; s += 1) {
      const sum = slotSummary(s);
      this.summaries.push(sum);
      const right = sum.exists ? this.summaryTag(sum) : "VUOTO";
      // In "load" gli slot vuoti non sono selezionabili.
      const disabled = this.mode === "load" && !sum.exists;
      items.push({ label: `SLOT ${s + 1}`, rightLabel: right, disabled });
    }
    items.push({ label: "INDIETRO" });
    return new Menu(items);
  }

  // Tag compatto per la riga: livello squadra + medaglie (+ * se MODALITÀ DIFFICILE).
  // Nota: niente glyph esotici (il font 5x7 non ha ☠); "*" segnala l'hard mode.
  private summaryTag(sum: SlotSummary): string {
    const hard = sum.hardMode ? "*" : "";
    return `LV${sum.level} - ${sum.badges}M${hard}`;
  }

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    // In attesa di conferma sovrascrittura (nuova campagna su slot pieno).
    if (this.pendingOverwrite >= 0) {
      if (this.input.wasPressed("a")) {
        const slot = this.pendingOverwrite;
        this.pendingOverwrite = -1;
        this.commitNew(slot);
      } else if (this.input.wasPressed("b")) {
        audio.cancel();
        this.pendingOverwrite = -1;
      }
      return;
    }
    // In attesa di conferma cancellazione (SELECT/tasto su slot pieno in "load").
    if (this.pendingDelete >= 0) {
      if (this.input.wasPressed("a")) {
        const slot = this.pendingDelete;
        this.pendingDelete = -1;
        clearSlot(slot);
        audio.confirm();
        this.menu = this.buildMenu();
      } else if (this.input.wasPressed("b")) {
        audio.cancel();
        this.pendingDelete = -1;
      }
      return;
    }
    // CANCELLA lo slot evidenziato con il tasto "start" (solo se pieno).
    if (this.input.wasPressed("start")) {
      const idx = this.menu.index;
      if (idx < SLOT_COUNT && this.summaries[idx]?.exists) {
        this.pendingDelete = idx;
        audio.confirm();
      }
      return;
    }
    const action = this.menu.update(this.input);
    if (action === "cancel") {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (action !== "select") {
      return;
    }
    const idx = this.menu.index;
    if (idx >= SLOT_COUNT) {
      // INDIETRO.
      audio.cancel();
      this.stack.pop();
      return;
    }
    const sum = this.summaries[idx];
    if (this.mode === "load") {
      if (!sum.exists) {
        return; // slot vuoto: non selezionabile (già disabled).
      }
      audio.confirm();
      setActiveSlot(idx);
      const state = loadGame();
      if (state) {
        this.stack.pop();
        this.onPick(state);
      } else {
        this.msg.show(["Salvataggio illeggibile.", "Slot corrotto o vuoto."]);
      }
      return;
    }
    // mode === "new"
    if (sum.exists) {
      // Slot occupato: chiedi conferma prima di sovrascrivere.
      this.pendingOverwrite = idx;
      audio.confirm();
      return;
    }
    this.commitNew(idx);
  }

  // Fissa lo slot attivo per una nuova campagna (ripulendolo se era pieno) e
  // restituisce il controllo al chiamante, che creerà lo stato iniziale.
  private commitNew(slot: number): void {
    audio.confirm();
    setActiveSlot(slot);
    if (hasSaveInSlot(slot)) {
      clearSlot(slot);
    }
    this.stack.pop();
    this.onPick(null);
  }

  draw(screen: Screen): void {
    screen.dim(0.55);
    const w = 180;
    const x = Math.round((VIEW_W - w) / 2);
    const y = 20;
    screen.panel(x, y, w, 128);
    const title = this.mode === "load" ? "CARICA PARTITA" : "NUOVA CAMPAGNA";
    screen.text(title, x + 8, y + 6, "#e8c84a");
    this.menu.draw(screen, x + 6, y + 18, w - 12, 16);

    // Riga di dettaglio dello slot evidenziato + suggerimenti tasti.
    const idx = this.menu.index;
    const sum = idx < SLOT_COUNT ? this.summaries[idx] : undefined;
    let hint = "";
    if (sum?.exists) {
      const place = MAPS[sum.mapId]?.name ?? sum.mapId;
      hint = `${place} - ${sum.money}€ - ${sum.sondaggi}%`;
    } else if (idx < SLOT_COUNT) {
      hint = this.mode === "load" ? "Slot vuoto." : "Slot libero: inizia qui.";
    }
    screen.text(hint.slice(0, 30), x + 8, y + 104, GREY);
    const keys = this.mode === "load" ? "A CARICA - START CANCELLA" : "A SCEGLI - START CANCELLA";
    screen.text(keys, x + 8, y + 116, GREY);

    // Overlay di conferma (sovrascrittura o cancellazione).
    if (this.pendingOverwrite >= 0) {
      this.drawConfirm(screen, `SOVRASCRIVERE SLOT ${this.pendingOverwrite + 1}?`);
    } else if (this.pendingDelete >= 0) {
      this.drawConfirm(screen, `CANCELLARE SLOT ${this.pendingDelete + 1}?`);
    }
    this.msg.draw(screen);
  }

  private drawConfirm(screen: Screen, question: string): void {
    const w = 168;
    const h = 34;
    const x = Math.round((VIEW_W - w) / 2);
    const y = Math.round((VIEW_H - h) / 2);
    screen.panel(x, y, w, h);
    screen.text(question.slice(0, 27), x + 8, y + 6, INK);
    screen.text("A CONFERMA - B ANNULLA", x + 8, y + 18, GREY);
  }
}
