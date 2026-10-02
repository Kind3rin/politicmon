import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import type { GameState } from "../game/state";
import { drawScreenHeader } from "../ui/widgets";
import { dossierPages, drawDossierPage } from "../ui/dossier";

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
  private page = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(): void {
    if (this.input.wasPressed("b")) { audio.cancel(); this.stack.pop(); return; }
    if (this.input.wasPressed("up") || this.input.wasPressed("down")) {
      this.index = (this.index + (this.input.wasPressed("up") ? CONTENT_CATALOG.length - 1 : 1)) % CONTENT_CATALOG.length;
      this.page = 0; audio.cursor();
    }
    const count = this.pages().length;
    if (this.input.wasPressed("left")) this.page = Math.max(0, this.page - 1);
    if (this.input.wasPressed("right") || this.input.wasPressed("a")) this.page = (this.page + 1) % count;
  }

  private pages() {
    const entry = CONTENT_CATALOG[this.index];
    return dossierPages([entry.unlocked(this.state) ? "DISPONIBILE NEL TUO SALVATAGGIO." : `DA SBLOCCARE: ${entry.requirement}`, entry.description], 9);
  }

  draw(screen: Screen): void {
    screen.clear("#101827");
    drawScreenHeader(screen, "CONTENUTI", `${this.index + 1}/${CONTENT_CATALOG.length}`);
    this.page = drawDossierPage(screen, this.pages(), this.page, CONTENT_CATALOG[this.index].title, false, "SU/GIU CAPITOLI", "B ESCI");
  }
}
