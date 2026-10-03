import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { loadNick, NICK_MAX, sanitizeNick, saveNick } from "../net/profile";
import type { UiPanel } from "../ui/kit";

export class NicknameScene implements Scene {
  private value = loadNick();
  private closed = false;
  constructor(private stack: SceneStack, private input: Input,
    private onDone: (nick: string) => void, private firstTime = false) {}

  private commit(random = false): void {
    if (this.closed || this.stack.top !== this || (!random && !sanitizeNick(this.value))) return;
    this.closed = true; this.input.reset();
    const saved = saveNick(random ? "" : this.value);
    audio.confirm(); this.stack.pop(); this.onDone(saved);
  }
  get uiPanel(): UiPanel {
    return {
      title: this.firstTime ? "Scegli il nome online" : "Nome online",
      subtitle: "È il nome visibile agli altri giocatori. Vale per tutte le tue campagne.",
      blocks: [{ title: "Come apparirai", body: "Massimo 12 caratteri: lettere A–Z, numeri, spazi e trattini bassi. Il nome viene salvato in maiuscolo." }],
      field: { label: "Il tuo nome", value: this.value, singleLine: true, maxLength: NICK_MAX,
        autofocus: true, placeholder: "Scrivi un nome", onSubmit: () => this.commit(),
        onChange: value => { if (this.stack.top === this && !this.closed) this.value = value; } },
      actions: [{ label: "Salva nome", disabled: !sanitizeNick(this.value),
        hint: !sanitizeNick(this.value) ? "Nome non valido." : undefined, run: () => this.commit() },
        ...(this.firstTime ? [{ label: "Usa un nome casuale", run: () => this.commit(true) }] : [])], primary: 0,
      back: { label: "Indietro", hint: "Annulla le modifiche.", run: () => {
        if (this.closed || this.stack.top !== this) return;
        this.closed = true; this.input.reset(); audio.cancel(); this.stack.pop();
      } }
    };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
