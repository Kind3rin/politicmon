import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader } from "../ui/widgets";
import { sceneImage } from "../engine/assets";
import { drawEpilogueBackdrop, drawEpiloguePage, epiloguePages } from "../ui/epilogueArt";

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
    "Un basamento vuoto con una targa: 'QUI SORGERÀ QUALCOSA DI GRANDIOSO'.",
    "L'ARCHITETTO DI CORTE attende solo il tuo generoso finanziamento."
  ],
  [
    "Un busto in bronzo con lo sguardo statista rivolto ai SONDAGGI.",
    "Sotto, la scritta: 'AL SERVIZIO DEL PAESE (E DI SÉ)'."
  ],
  [
    "Una statua equestre: tu a cavallo, il dito puntato verso il futuro.",
    "Il cavallo, però, guarda l'uscita. Anche lui ha i suoi sondaggi."
  ],
  [
    "Un COLOSSO alto tre piani: mano sul cuore, altra mano sul portafoglio.",
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
  readonly transparent = false;
  private mode: "view" | "review" | "story" = "view";
  private page = 0;
  private pages: string[][] = [];
  private expectedLevel = 0;
  private notice = "";
  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}
  update(): void {
    if (this.input.wasPressed("b")) {
      if (this.mode !== "view") { this.mode = "view"; this.page = 0; }
      else this.stack.pop();
      return;
    }
    if (this.mode === "view") {
      const level = this.state.monumentLevel;
      if (this.input.wasPressed("start")) {
        this.mode = "story"; this.page = 0;
        this.pages = epiloguePages([...MONUMENT_STAGES[level], ...(level === 3 ? [MONUMENT_TITLE, "IL TITOLO È VISIBILE NELLA TESSERA. È INTERAMENTE AUTOPROCLAMATO."] : [])]);
      } else if (this.input.wasPressed("a") && level < MONUMENT_MAX) {
        this.expectedLevel = level; this.mode = "review"; this.page = 0;
        this.pages = epiloguePages([`LIVELLO ${level + 1}: COSTO ${MONUMENT_COSTS[level]}€.`, ...MONUMENT_STAGES[level + 1], "SPESA COSMETICA CON I TUOI FONDI. NESSUN BONUS ALLE LOTTE O AI SONDAGGI.", "LA CERIMONIA È FACOLTATIVA. LA FATTURA NO. A ALLA FINE CONFERMA; B ANNULLA."]);
      }
      return;
    }
    if (!this.input.wasPressed("a")) return;
    if (this.page < this.pages.length - 1) { this.page++; return; }
    if (this.mode === "review") {
      if (buyMonumentLevel(this.state, this.expectedLevel)) {
        saveGame(this.state); audio.badgeFanfare(); this.notice = `INAUGURATO: LIVELLO ${this.state.monumentLevel}.`;
      } else { audio.cancel(); this.notice = "FONDI O LIVELLO NON DISPONIBILI."; }
    }
    this.mode = "view"; this.page = 0;
  }
  draw(screen: Screen): void {
    drawEpilogueBackdrop(screen, "monument");
    const level = this.mode === "review" ? this.expectedLevel + 1 : this.state.monumentLevel;
    drawScreenHeader(screen, "MONUMENTO AL CANDIDATO", this.mode === "view" ? `${level}/3` : `${this.page + 1}/${this.pages.length}`);
    const image = sceneImage(`epilogue:monument_${level}`, `ui/epilogue/monument_${level}.png`);
    if (this.mode !== "view") {
      if (image) screen.image(image, 10, 20, 32, 38);
      drawEpiloguePage(screen, this.pages[this.page]);
      screen.text(this.mode === "review" && this.page === this.pages.length - 1 ? "A: PAGA   B: ANNULLA" : "A: AVANTI   B: INDIETRO", 12, 167, "#fffaf0");
      return;
    }
    if (image) screen.image(image, 9, 27, 64, 76);
    screen.panel(83, 29, 149, 73, "card");
    screen.text("FONDI PERSONALI", 92, 40, "#68758a");
    screen.text(`${this.state.money}€`, 92, 53, "#17243d");
    screen.text(level < 3 ? "PROSSIMO LIVELLO" : "COLLEZIONE COMPLETA", 92, 70, "#68758a");
    screen.text(level < 3 ? `${MONUMENT_COSTS[level]}€` : "TITOLO NELLA TESSERA", 92, 83, "#17243d");
    screen.panel(8, 109, 224, 47, "dialog");
    screen.text(this.notice || "UN SELFIE NON PAGA LA FATTURA.", 16, 119, "#17243d");
    screen.text("START: LEGGI TUTTA LA STORIA.", 16, 132, "#17243d");
    screen.text("SOLO COSMETICO. NESSUN BONUS.", 16, 144, "#17243d");
    screen.text(level < 3 ? "A: ANTEPRIMA   B: ESCI" : "START: STORIA   B: ESCI", 12, 167, "#fffaf0");
  }
}
