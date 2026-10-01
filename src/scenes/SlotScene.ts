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
import { drawScreenHeader, Menu, MessageBox, INK } from "../ui/widgets";
import { drawHqBackdrop, drawHqIcon } from "../ui/hqArt";

type SlotMode = "load" | "new";

// Selettore degli SLOT di salvataggio (1/2/3). In modalità "load" apre lo slot
// scelto (CONTINUA); in "new" lo seleziona per una nuova campagna, chiedendo
// conferma se non è vuoto. L'esito torna al chiamante via callback:
//  - "load": onPick(state) con la partita caricata dallo slot.
//  - "new":  onPick(null) dopo aver fissato lo slot attivo (ripulito se serviva).
export class SlotScene implements Scene {
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
    const tapAction = this.handleSlotTap();
    const action = tapAction === undefined ? this.menu.update(this.input) : tapAction;
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

  private handleSlotTap(): "select" | null | undefined {
    const tap = this.input.consumeTap();
    if (!tap || tap.x < 5 || tap.x >= VIEW_W - 5) return undefined;
    const row = tap.y >= 50 && tap.y < 50 + SLOT_COUNT * 29
      ? Math.floor((tap.y - 50) / 29) : tap.y >= 141 && tap.y < 154 ? SLOT_COUNT : -1;
    if (row < 0) return undefined;
    if (row !== this.menu.index) {
      this.menu.index = row;
      audio.cursor();
      return null;
    }
    if (this.menu.items[row].disabled) {
      audio.cancel();
      return null;
    }
    return "select";
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
    drawHqBackdrop(screen, "saves");
    drawScreenHeader(screen, this.mode === "load" ? "ARCHIVIO CAMPAGNE" : "NUOVA CAMPAGNA");
    screen.rect(4, 34, VIEW_W - 8, 12, "rgba(16,20,31,0.82)");
    screen.text("TRE SLOT. IL QUARTO MANDATO NON C'È.", 8, 37, "#fffaf0");
    for (let i = 0; i < SLOT_COUNT; i++) {
      const sum = this.summaries[i];
      const selected = this.menu.index === i;
      const y = 50 + i * 29;
      screen.panel(5, y, VIEW_W - 10, 27, "card");
      if (selected) screen.frame(6, y + 1, VIEW_W - 12, 25, "#e6b944");
      drawHqIcon(screen, "backup", 10, y + 4, 20);
      screen.text(`${selected ? ">" : " "} SLOT ${i + 1}`, 34, y + 6, INK);
      screen.textRight(sum.exists ? this.summaryTag(sum) : "LIBERO", VIEW_W - 12, y + 6, sum.exists ? "#497b65" : "#526279");
      screen.textFit(sum.exists ? MAPS[sum.mapId]?.name ?? sum.mapId
        : this.mode === "load" ? "Nessuna campagna da riprendere" : "La prima promessa parte qui",
        34, y + 16, VIEW_W - 47, INK);
    }
    const sum = this.summaries[this.menu.index];
    screen.textFit(sum?.exists ? `FONDI ${sum.money}€ / SONDAGGI ${sum.sondaggi}%`
      : this.menu.index === SLOT_COUNT ? "> INDIETRO" : "SLOT LIBERO", 8, 143, VIEW_W - 16, "#fffaf0");
    screen.text(this.mode === "load" ? "A CARICA  B INDIETRO" : "A SCEGLI  B INDIETRO", 8, 158, "#ffe38a");
    screen.text("START CANCELLA LO SLOT SELEZIONATO", 8, 170, "#fffaf0");
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
    screen.dim(0.7);
    screen.panel(x, y, w, h, "dialog");
    screen.textFit(question, x + 8, y + 6, w - 16, INK);
    screen.text("A CONFERMA - B ANNULLA", x + 8, y + 18, "#526279");
  }
}
