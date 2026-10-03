import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import type { UiPanel, UiBlock } from "../ui/kit";

// MONUMENTO AL CANDIDATO — money-sink TERMINALE (R42 economia, LOTTO 3). Dopo la
// Coppa/UE i soldi non servono più: qui si bruciano in un monumento a sé stessi,
// puramente cosmetico. Satira bonaria sul candidato che si erige statue coi
// propri soldi (qui è legale). 3 livelli a costo crescente; al 3° un TITOLO.
//
// Lo stato vive in state.monumentLevel (0..3), GIÀ nel save v13 (nessuna nuova
// migrazione). La statua diventa via via più grottesca; la scena mostra la
// descrizione del livello corrente e permette di salire al successivo.

// Costo crescente per SALIRE al livello (index = livello che si sta comprando).
// [0] porta da 0→1, [1] da 1→2, [2] da 2→3.
export const MONUMENT_COSTS = [10000, 25000, 50000];
export const MONUMENT_MAX = MONUMENT_COSTS.length; // 3
export const MONUMENT_TITLE = "PADRE DELLA PATRIA (AUTOPROCLAMATO)";

// Descrizione satirica di ogni stadio (index = livello raggiunto, 0 = niente).
const MONUMENT_STAGES = [
  [
    "Un basamento vuoto con una targa: «Qui sorgerà qualcosa di grandioso».",
    "L’architetto di corte attende il tuo generoso finanziamento."
  ],
  [
    "Un busto in bronzo con lo sguardo statista rivolto ai sondaggi.",
    "Sotto, la scritta: «Al servizio del Paese. E di sé»."
  ],
  [
    "Una statua equestre: tu a cavallo, il dito puntato verso il futuro.",
    "Il cavallo, però, guarda l'uscita. Anche lui ha i suoi sondaggi."
  ],
  [
    "Un colosso di tre piani. Una mano sul cuore, l’altra sul portafoglio.",
    "Fontane di champagne, fuochi d'artificio a orario continuato, un coro assunto.",
    "I turisti scattano selfie. I contabili, invece, piangono in silenzio."
  ]
];

// Testo di esame della statua nel mondo (overworld): il MONUMENTO cresce col
// livello. lv 0 usa la decorativa originale (gestito dal chiamante).
export function monumentDecoLines(level: number): string[] {
  const lv = Math.max(1, Math.min(MONUMENT_MAX, Math.floor(level)));
  return [`MONUMENTO AL CANDIDATO (LIVELLO ${lv}).`, ...MONUMENT_STAGES[lv]];
}

export function buyMonumentLevel(state: GameState, expectedLevel: number): boolean {
  const cost = MONUMENT_COSTS[expectedLevel];
  if (state.monumentLevel !== expectedLevel || !Number.isInteger(expectedLevel) || cost === undefined || state.money < cost) return false;
  state.money -= cost;
  state.monumentLevel++;
  return true;
}

export class MonumentScene implements Scene {
  private mode: "view" | "review" = "view";
  private expectedLevel = 0;
  private notice?: UiBlock;
  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}
  private purchase(): void {
    if (this.stack.top !== this || this.mode !== "review") return;
    const level = this.expectedLevel, funds = this.state.money;
    // Clear the quote before mutation: a stale confirmation cannot spend twice.
    this.mode = "view"; this.input.reset();
    if (!buyMonumentLevel(this.state, level)) {
      audio.cancel(); this.notice = { title: "Spesa non effettuata", body: "I fondi o il livello sono cambiati. Nessun addebito: controlla il nuovo preventivo." }; return;
    }
    saveGame(this.state); audio.badgeFanfare();
    this.notice = { title: "Monumento inaugurato", body: "La cerimonia è facoltativa. La fattura no.",
      facts: [{ label: "Fondi personali", value: `${funds} → ${this.state.money} €` },
        { label: "Livello", value: `${level} → ${this.state.monumentLevel} di ${MONUMENT_MAX}` }] };
  }
  get uiPanel(): UiPanel {
    const current = this.state.monumentLevel, quote = this.mode === "review";
    const level = quote ? this.expectedLevel + 1 : current, cost = MONUMENT_COSTS[this.expectedLevel];
    const stages = MONUMENT_STAGES[Math.max(0, Math.min(MONUMENT_MAX, level))];
    const available = quote && current === this.expectedLevel && cost !== undefined && this.state.money >= cost;
    return { title: "Monumento al candidato", subtitle: quote ? "Controlla il costo prima di pagare." : "Un selfie non paga la fattura.",
      image: `/sprites/ui/epilogue/monument_${level}.png`, imageHeight: 160,
      blocks: [...(!quote && this.notice ? [this.notice] : []),
        { title: quote ? "Il prossimo monumento" : "Il tuo monumento", body: stages.join("\n\n"),
          facts: [{ label: "Livello", value: quote ? `${current} → ${level} di ${MONUMENT_MAX}` : `${current} di ${MONUMENT_MAX}` }] },
        { title: quote ? "Preventivo" : "Fondi personali", body: "Spesa cosmetica con i tuoi fondi. Nessun bonus alle lotte o ai sondaggi.",
          facts: [{ label: "Fondi disponibili", value: `${this.state.money} €` },
            ...(quote ? [{ label: "Costo", value: `${cost} €` }, { label: "Fondi dopo la spesa", value: available ? `${this.state.money - cost} €` : "Spesa non disponibile" }]
              : current < MONUMENT_MAX ? [{ label: "Prossimo livello", value: `${MONUMENT_COSTS[current]} €` }] : [])] },
        ...(level === MONUMENT_MAX ? [{ title: "Titolo nella tessera", body: "Padre della patria (autoproclamato). Il titolo è interamente autoproclamato." }] : [])],
      actions: quote ? [{ label: "Paga e inaugura", disabled: !available,
        hint: !available ? current !== this.expectedLevel ? "Il livello è cambiato. Torna al monumento." : "Fondi insufficienti." : undefined,
        run: () => this.purchase() }] : current < MONUMENT_MAX ? [{ label: "Anteprima del prossimo livello", run: () => {
          if (this.stack.top !== this || this.mode !== "view" || this.state.monumentLevel !== current) return;
          this.expectedLevel = current; this.mode = "review"; this.input.reset(); audio.cursor();
        } }] : [], primary: quote || current < MONUMENT_MAX ? 0 : undefined,
      back: { label: "Indietro", run: () => { if (this.stack.top !== this || (this.mode === "review") !== quote) return;
        this.input.reset(); audio.cancel(); if (quote) this.mode = "view"; else this.stack.pop();
      } } };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
