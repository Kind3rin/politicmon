import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import { Menu, MessageBox, wrapText, GREY, INK, PAPER } from "../ui/widgets";

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

export class MonumentScene implements Scene {
  private menu: Menu;
  private msg = new MessageBox();
  private time = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.menu = this.buildMenu();
  }

  private nextCost(): number | null {
    const lv = this.state.monumentLevel;
    return lv < MONUMENT_MAX ? MONUMENT_COSTS[lv] : null;
  }

  private buildMenu(): Menu {
    const cost = this.nextCost();
    const items = cost === null
      ? [{ label: "IL MONUMENTO È COMPLETO" }, { label: "ESCI" }]
      : [
          { label: this.state.monumentLevel === 0 ? "FINANZIA IL MONUMENTO" : "AMPLIA IL MONUMENTO", rightLabel: `${cost}€` },
          { label: "ESCI" }
        ];
    return new Menu(items);
  }

  update(dt: number): void {
    this.time += dt;
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
    const cost = this.nextCost();
    // Ultima voce = ESCI (o quando è completo, index 1).
    const buyIndex = cost === null ? -1 : 0;
    if (this.menu.index === buyIndex && cost !== null) {
      this.build(cost);
      return;
    }
    this.stack.pop();
  }

  private build(cost: number): void {
    if (this.state.money < cost) {
      audio.cancel();
      this.msg.show([
        "L'ARCHITETTO scuote la testa: fondi insufficienti.",
        `Servono ${cost}€. Il marmo di Carrara non si paga a strette di mano.`
      ]);
      return;
    }
    this.state.money -= cost;
    this.state.monumentLevel = Math.min(MONUMENT_MAX, this.state.monumentLevel + 1);
    const lv = this.state.monumentLevel;
    audio.badgeFanfare();
    saveGame(this.state);
    this.menu = this.buildMenu();
    const lines = [
      `LIVELLO ${lv} INAUGURATO! ${cost}€ ben spesi (per te).`,
      ...MONUMENT_STAGES[lv]
    ];
    if (lv >= MONUMENT_MAX) {
      // Al livello 3: TITOLO permanente + achievement (satira).
      lines.push(
        `Da oggi sei ${MONUMENT_TITLE}.`,
        "Un titolo che nessuno ti ha dato, ma che ti sei preso. Legalmente."
      );
    }
    this.msg.show(lines);
  }

  draw(screen: Screen): void {
    screen.clear("#1c2230");
    // Cielo istituzionale sfumato in alto.
    screen.rect(0, 0, VIEW_W, 12, "#2a3550");
    screen.text("MONUMENTO AL CANDIDATO", 8, 8, "#f4d34a");
    screen.textRight(`${this.state.money}€`, VIEW_W - 8, 8, "#e8c84a");

    const lv = this.state.monumentLevel;
    // "Anteprima" ASCII del monumento: cresce col livello (pilastro + corpo).
    this.drawMonument(screen, VIEW_W / 2, 26, lv);

    // Descrizione dello stadio corrente (a capo pulito entro la larghezza schermo).
    // Fallback all'ultimo stadio se lv è fuori range (save manomesso): parseState
    // già clampa a 0..3, questa è difesa in profondità per non crashare mai.
    const desc = MONUMENT_STAGES[lv] ?? MONUMENT_STAGES[MONUMENT_STAGES.length - 1];
    const wrapped = desc.flatMap((line) => wrapText(line, 36));
    let y = VIEW_H - 66;
    screen.text(`LIVELLO ${lv}/${MONUMENT_MAX}`, 10, y, PAPER);
    y += 10;
    for (const line of wrapped.slice(0, 3)) {
      screen.text(line, 10, y, INK);
      y += 8;
    }

    this.menu.draw(screen, 14, VIEW_H - 24, VIEW_W - 28);
    if (this.msg.isOpen) {
      this.msg.draw(screen);
    } else {
      screen.text("A: scegli  B: esci", 8, VIEW_H - 8, GREY);
    }
  }

  // Statua stilizzata che cresce col livello: base sempre, poi corpo/busto,
  // poi braccia, poi aureola di stelle. Puramente cosmetica (nessun asset).
  private drawMonument(screen: Screen, cx: number, top: number, lv: number): void {
    const gold = "#d8b838";
    const bronze = "#b8884a";
    const marble = "#cfc7b0";
    const baseY = top + 40;
    // Basamento in marmo (sempre presente).
    screen.rect(cx - 20, baseY, 40, 6, marble);
    screen.rect(cx - 14, baseY - 4, 28, 4, "#b8b0a0");
    if (lv >= 1) {
      // Busto / colonna centrale.
      screen.rect(cx - 4, baseY - 20, 8, 16, bronze);
      screen.rect(cx - 5, baseY - 26, 10, 6, bronze); // testa
    }
    if (lv >= 2) {
      // Statua a figura intera: corpo più alto + braccio puntato.
      screen.rect(cx - 5, baseY - 34, 10, 14, bronze);
      screen.rect(cx + 4, baseY - 32, 10, 3, bronze); // braccio teso
    }
    if (lv >= 3) {
      // Colosso dorato: piedistallo esteso, corpo altissimo, aureola di stelle.
      screen.rect(cx - 24, baseY - 2, 48, 4, gold);
      screen.rect(cx - 6, baseY - 44, 12, 20, gold);
      screen.rect(cx - 7, baseY - 50, 14, 8, gold); // testa/corona
      for (let i = -2; i <= 2; i += 1) {
        screen.text("*", cx + i * 8 - 2, baseY - 60, "#f4d34a");
      }
    }
  }
}
