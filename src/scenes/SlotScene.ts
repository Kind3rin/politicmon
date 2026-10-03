import { audio } from "../engine/audio";
import { MAP_NAMES } from "../data/maps/names";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
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
import { Menu, MessageBox } from "../ui/widgets";
import type { TouchAction } from "../engine/touchActions";
import type { UiPanel } from "../ui/kit";

type SlotMode = "load" | "new";

// Selettore degli SLOT di salvataggio (1/2/3). In modalità "load" apre lo slot
// scelto (CONTINUA); in "new" lo seleziona per una nuova campagna, chiedendo
// conferma se non è vuoto. L'esito torna al chiamante via callback:
//  - "load": onPick(state) con la partita caricata dallo slot.
//  - "new":  onPick(null) dopo aver fissato lo slot attivo (ripulito se serviva).
export class SlotScene implements Scene {
  get uiPanel(): UiPanel {
    if (this.msg.isOpen) return { title: "Salvataggio illeggibile", blocks: [{ title: "La partita non si può aprire", body: this.msg.pageText }], actions: [{ label: "Continua", run: () => { if (this.stack.top === this && this.msg.isOpen) { this.input.reset(); this.msg.advancePage(); } } }], back:{label:"Indietro",run:()=>{if(this.stack.top!==this)return;this.input.reset();this.msg.close();audio.cancel();}} };
    const pending = this.pendingOverwrite >= 0 || this.pendingDelete >= 0;
    const slot = this.pendingOverwrite >= 0 ? this.pendingOverwrite : this.pendingDelete;
    const actions = this.touchActions.filter(action => action.label !== "INDIETRO" && action.label !== "ANNULLA").map((action, i) => ({ ...action,
      label: pending ? "Conferma" : action.label === "CANCELLA" ? "Gestisci campagne" : `${this.deleting ? "Cancella " : "Campagna "}${i + 1}`,
      hint: pending ? undefined : i < SLOT_COUNT ? (this.summaries[i].exists ? MAP_NAMES[this.summaries[i].mapId] : "Nessuna partita salvata") : "Scegli quale eliminare",
      facts: !pending && i < SLOT_COUNT && this.summaries[i].exists ? [{ label: "Livello", value: String(this.summaries[i].level) }, { label: "Medaglie", value: String(this.summaries[i].badges) }] : undefined
    }));
    return { title: pending ? "Conferma la scelta" : this.deleting ? "Gestisci campagne" : "Le tue campagne", subtitle: pending ? `La campagna ${slot + 1} sarà ${this.pendingDelete >= 0 ? "cancellata" : "sostituita"}. Il salvataggio attuale andrà perso.` : "Tre campagne. Il quarto mandato non c’è.", actions, selected: this.menu.index,
      back: { label: "Indietro", run: () => { if (this.stack.top !== this) return; this.input.reset(); audio.cancel(); if (pending) { this.pendingOverwrite = -1; this.pendingDelete = -1; } else if (this.deleting) this.deleting = false; else this.stack.pop(); } }
    };
  }
  private menu: Menu;
  private msg = new MessageBox();
  private summaries: SlotSummary[] = [];
  // Slot in attesa di conferma sovrascrittura/cancellazione (modalità "new"/delete).
  private pendingOverwrite = -1;
  private pendingDelete = -1;
  private deleting = false;

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

  get touchActions(): readonly TouchAction[] {
    const overwrite = this.pendingOverwrite, deletion = this.pendingDelete, selected = this.menu.index, deleting = this.deleting;
    const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled: disabled || this.msg.isOpen, run: () => {
      if (disabled || this.msg.isOpen || this.stack.top !== this || this.pendingOverwrite !== overwrite || this.pendingDelete !== deletion || this.menu.index !== selected || this.deleting !== deleting) return;
      this.input.reset(); run();
    } });
    if (overwrite >= 0 || deletion >= 0) return [action("CONFERMA", `Lo slot ${(overwrite >= 0 ? overwrite : deletion) + 1} sarà sostituito o cancellato`, () => this.confirmPending()),
      action("ANNULLA", "Conserva la campagna", () => { this.pendingOverwrite = -1; this.pendingDelete = -1; this.deleting = false; })];
    return [...this.summaries.map((sum, index) => action(`${deleting ? "CANCELLA " : ""}SLOT ${index + 1}`, sum.exists ? `${MAP_NAMES[sum.mapId] ?? sum.mapId} · ${this.summaryTag(sum)}` : "Vuoto", () => { if (deleting) this.pendingDelete = index; else this.pick(index); }, (this.mode === "load" || deleting) && !sum.exists)),
      action(deleting ? "ANNULLA" : "CANCELLA", deleting ? "Conserva tutte le campagne" : "Scegli uno slot · chiede conferma", () => { this.deleting = !deleting; }),
      action("INDIETRO", "Torna al titolo", () => this.stack.pop())];
  }
  private confirmPending(): void {
    if (this.pendingOverwrite >= 0) { const slot = this.pendingOverwrite; this.pendingOverwrite = -1; this.commitNew(slot); }
    else if (this.pendingDelete >= 0) { const slot = this.pendingDelete; this.pendingDelete = -1; this.deleting = false; clearSlot(slot); audio.confirm(); this.menu = this.buildMenu(); }
  }

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    // In attesa di conferma sovrascrittura (nuova campagna su slot pieno).
    if (this.pendingOverwrite >= 0) {
      if (this.input.wasPressed("a")) {
        this.confirmPending();
      } else if (this.input.wasPressed("b")) {
        audio.cancel();
        this.pendingOverwrite = -1;
      }
      return;
    }
    // In attesa di conferma cancellazione (SELECT/tasto su slot pieno in "load").
    if (this.pendingDelete >= 0) {
      if (this.input.wasPressed("a")) {
        this.confirmPending();
      } else if (this.input.wasPressed("b")) {
        audio.cancel();
        this.pendingDelete = -1;
      }
      return;
    }
    const action = this.menu.update(this.input);
    if (action === "cancel") {
      audio.cancel();
      if (this.deleting) { this.deleting = false; return; }
      this.stack.pop();
      return;
    }
    if (action !== "select") {
      return;
    }
    this.pick(this.menu.index);
  }

  private pick(idx: number): void {
    this.menu.index = idx;
    if (this.deleting && idx < SLOT_COUNT) { if (this.summaries[idx].exists) this.pendingDelete = idx; return; }
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

  draw(screen: Screen): void { screen.clear("#101c30"); }
}
