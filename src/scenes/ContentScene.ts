import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import type { GameState } from "../game/state";
import { drawScreenHeader, wrapText } from "../ui/widgets";

export interface ContentEntry {
  readonly title: string;
  readonly description: string;
  readonly requirement: string;
  readonly unlocked: (state: GameState) => boolean;
}

export const CONTENT_CATALOG: readonly ContentEntry[] = [
  { title: "COPPA DELLE POLTRONE", description: "TORNEO CON REGOLE GIORNALIERE E ROSTER TEMPORANEI.", requirement: "SCONFIGGI IL GARANTE SUPREMO.", unlocked: (s) => Boolean(s.flags["garante-beaten"]) },
  { title: "ATTO 3: CAMPO LARGO", description: "NUOVA CAMPAGNA CON COALIZIONE, FOTO E SCELTE POLITICHE.", requirement: "SCONFIGGI LA COMMISSIONE A BRUXELLES.", unlocked: (s) => Boolean(s.flags["ue-beaten"]) },
  { title: "NUOVI POLITICMON", description: "NUOVE SPECIE, EVOLUZIONI E MOSSE NELLE AREE DELL'ATTO 3.", requirement: "RAGGIUNGI CAMPO LARGO.", unlocked: (s) => Boolean(s.flags.atto3Started) },
  { title: "FUTURO ANTERIORE", description: "SEDE, MANIFESTI, SCELTA DI LINEA E BOSS DEDICATO.", requirement: "COMPLETA LA FOTO DI CAMPO LARGO.", unlocked: (s) => Boolean(s.flags["campo-photo-complete"]) },
  { title: "TEMPTATION DIPLOMACY", description: "VERTICE-REALITY CON TRE SCELTE, COSTI E LINEE ROSSE.", requirement: "SCONFIGGI IL SEGRETARIO DEL DOMANI.", unlocked: (s) => Boolean(s.flags.futureResolved) },
  { title: "GENOVA TECHNO", description: "AREA OPZIONALE CON MINIGIOCO MUSICALE ACCESSIBILE.", requirement: "COMPLETA TEMPTATION DIPLOMACY.", unlocked: (s) => Boolean(s.flags.diplomacyComplete) },
  { title: "CINQUE COLLEGI", description: "TOUR ELETTORALE, DOSSIER, PROMESSE E CONSENSO LOCALE.", requirement: "COMPLETA TEMPTATION DIPLOMACY.", unlocked: (s) => Boolean(s.flags.diplomacyComplete) },
  { title: "PALAZZO DEI FEED", description: "QUATTRO ARCHIVI, ALGORITMO SOVRANO ED ELECTION NIGHT.", requirement: "COMPLETA I CINQUE COLLEGI.", unlocked: (s) => s.election.phase === "ready" || s.election.phase === "locked" || s.election.phase === "resolved" },
  { title: "CAMPAGNA SETTIMANALE", description: "5 EVENTI, 3 DIBATTITI, PREMI E DUE MEME ATTUALI A SETTIMANA.", requirement: "COMPLETA L'EPILOGO DELL'ATTO 3.", unlocked: (s) => Boolean(s.flags.atto3Complete) },
  { title: "FORME MEME", description: "FORME STAGIONALI PER I POLITICMON DELLA TUA SQUADRA.", requirement: "TRIONFA NELLA CAMPAGNA SETTIMANALE.", unlocked: (s) => s.unlockedMemeForms.length > 0 }
];

export class ContentScene implements Scene {
  readonly transparent = false;
  private index = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(): void {
    if (this.input.wasPressed("b")) { audio.cancel(); this.stack.pop(); return; }
    if (this.input.wasPressed("up")) { this.index = (this.index - 1 + CONTENT_CATALOG.length) % CONTENT_CATALOG.length; audio.cursor(); }
    if (this.input.wasPressed("down")) { this.index = (this.index + 1) % CONTENT_CATALOG.length; audio.cursor(); }
  }

  draw(screen: Screen): void {
    screen.clear("#101827");
    const entry = CONTENT_CATALOG[this.index];
    const open = entry.unlocked(this.state);
    drawScreenHeader(screen, "CONTENUTI", `${this.index + 1}/${CONTENT_CATALOG.length}`);
    screen.text("TUTTI I MODULI SONO NELLA BUILD", 10, 25, "#7ad858");
    screen.panel(8, 40, 224, 111, "card");
    screen.textFit(entry.title, 17, 51, 206, "#10141f");
    const status = open ? "DISPONIBILE" : "DA SBLOCCARE";
    screen.rect(16, 65, status.length * 6 + 8, 11, open ? "#26745d" : "#a46b12");
    screen.text(status, 20, 67, "#fffaf0");
    let y = 83;
    for (const line of wrapText(entry.description, 34).slice(0, 3)) { screen.text(line, 17, y, "#253752"); y += 10; }
    screen.text("REQUISITO", 17, 116, "#68758a");
    let ry = 128;
    for (const line of wrapText(open ? "GIÀ SBLOCCATO NEL TUO SALVATAGGIO." : entry.requirement, 34).slice(0, 2)) {
      screen.text(line, 17, ry, open ? "#26745d" : "#a0443e");
      ry += 10;
    }
    screen.text("SU/GIÙ: SFOGLIA   B: INDIETRO", 10, 163, "#ffe38a");
  }
}
