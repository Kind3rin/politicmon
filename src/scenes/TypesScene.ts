import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { TYPE_ORDER, typeMultiplier } from "../data/poltypes";
import type { UiPanel } from "../ui/kit";

export class TypesScene implements Scene {
  private index = 0;
  private detail = false;
  constructor(private stack: SceneStack, private input: Input) {}

  get uiPanel(): UiPanel {
    const attack = TYPE_ORDER[this.index];
    const close = () => {
      if (this.stack.top !== this) return;
      this.input.reset(); audio.cancel();
      if (this.detail) this.detail = false;
      else this.stack.pop();
    };
    if (!this.detail) return {
      title: "Efficacia dei tipi",
      subtitle: "Scegli il tipo della mossa per vedere quali avversari favorisce.",
      blocks: [{ title: "La mossa e il bersaglio", body: "Conta il tipo della mossa usata, non solo quello del compagno che attacca." }],
      actions: TYPE_ORDER.map((type, index) => ({ label: type, icon: `/sprites/ui/type_${type.toLocaleLowerCase('it')}.png`, group: "Tipo della mossa", run: () => {
        if (this.stack.top !== this || this.detail) return;
        this.input.reset(); this.index = index; this.detail = true; audio.confirm();
      } })), selected: this.index, back: { label: "Indietro", run: close }
    };
    const facts = (types: typeof TYPE_ORDER) => types.map(type => ({ label: type, value: `×${typeMultiplier(attack, [type]).toLocaleString('it')}` }));
    const strong = TYPE_ORDER.filter(type => typeMultiplier(attack, [type]) > 1);
    const weak = TYPE_ORDER.filter(type => typeMultiplier(attack, [type]) < 1);
    const neutral = TYPE_ORDER.filter(type => typeMultiplier(attack, [type]) === 1);
    return { title: attack, subtitle: `${this.index + 1} di ${TYPE_ORDER.length} · Tipo della mossa`,
      blocks: [
        { title: "Danno aumentato", body: strong.length ? "Il tipo ti dà un vantaggio." : "Nessun vantaggio di tipo singolo.", facts: facts(strong) },
        { title: "Danno ridotto", body: weak.length ? "Questi avversari resistono alla mossa." : "Nessuna resistenza di tipo singolo.", facts: facts(weak) },
        { title: "Danno normale", facts: facts(neutral) },
        { title: "Avversari con due tipi", body: "Entrambi i tipi contano. Consulta la scheda del compagno per le sue difese complete." },
        { title: "Il tipo è un fattore", body: "I valori sono quelli usati in lotta. Potenza, statistiche, abilità e oggetti modificano il danno finale." }
      ], actions: [], back: { label: "Indietro", hint: "Scegli un altro tipo.", run: close } };
  }

  update(): void {
    if (this.input.wasPressed("b")) { audio.cancel(); if (this.detail) this.detail = false; else this.stack.pop(); }
  }
  draw(screen: Screen): void { screen.clear("#112037"); }
}
