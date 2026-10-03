import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import type { GameState } from "../game/state";
import type { UiPanel } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";

export interface ContentEntry {
  readonly title: string;
  readonly description: string;
  readonly requirement: string;
  readonly unlocked: (state: GameState) => boolean;
}

export const CONTENT_CATALOG: readonly ContentEntry[] = [
  { title: "Coppa delle Poltrone", description: "Torneo con regole giornaliere e squadre temporanee.", requirement: "Sconfiggi il Garante Supremo.", unlocked: (s) => Boolean(s.flags["garante-beaten"]) },
  { title: "Atto 3: Campo Largo", description: "Nuova campagna con coalizione, foto e scelte politiche.", requirement: "Sconfiggi la Commissione a Bruxelles.", unlocked: (s) => Boolean(s.flags["ue-beaten"]) },
  { title: "Nuovi Politicmon", description: "Nuove specie, evoluzioni e mosse nelle aree dell’Atto 3.", requirement: "Raggiungi Campo Largo.", unlocked: (s) => Boolean(s.flags.atto3Started) },
  { title: "Futuro Anteriore", description: "Una sede, manifesti e un capo. Scegli la linea politica.", requirement: "Completa la foto di Campo Largo.", unlocked: (s) => Boolean(s.flags["campo-photo-complete"]) },
  { title: "Temptation Diplomacy", description: "Un vertice in formato reality. Tre scelte con costi e linee rosse.", requirement: "Sconfiggi il Segretario del Domani.", unlocked: (s) => Boolean(s.flags.futureResolved) },
  { title: "Genova Techno", description: "Attività musicale facoltativa. Non serve seguire il ritmo per proseguire.", requirement: "COMPLETA Temptation Diplomacy.", unlocked: (s) => Boolean(s.flags.diplomacyComplete) },
  { title: "Cinque collegi", description: "Un tour elettorale con dossier e promesse. Ogni collegio ha il suo consenso.", requirement: "COMPLETA Temptation Diplomacy.", unlocked: (s) => Boolean(s.flags.diplomacyComplete) },
  { title: "Palazzo dei Feed", description: "Quattro archivi e l’Algoritmo Sovrano. Alla fine si contano i voti.", requirement: "COMPLETA I Cinque collegi.", unlocked: (s) => s.election.phase === "ready" || s.election.phase === "locked" || s.election.phase === "resolved" },
  { title: "Campagna settimanale", description: "Cinque eventi, tre dibattiti e premi. Due meme cambiano ogni settimana.", requirement: "Completa l’epilogo dell’Atto 3.", unlocked: (s) => Boolean(s.flags.atto3Complete) },
  { title: "Forme meme", description: "Forme stagionali per i Politicmon della tua squadra.", requirement: "TRIONFA NELLA Campagna settimanale.", unlocked: (s) => s.unlockedMemeForms.length > 0 }
];

export class ContentScene implements Scene {
  readonly transparent = false;
  private category = 0;
  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  get uiPanel(): UiPanel {
    const groups = ["Campagna", "Attività", "Forme"];
    const indices = this.category === 0 ? [1, 2, 3, 4, 6, 7] : this.category === 1 ? [0, 5, 8] : [9];
    return {
      title: "Contenuti della campagna",
      subtitle: "Cosa puoi trovare e come sbloccarlo. Le attività facoltative restano separate dal percorso della storia.",
      tabs: groups.map((label, index) => ({ label, run: () => {
        if (this.stack.top !== this) return;
        this.category = index; this.input.reset(); audio.cursor();
      } })), selectedTab: this.category,
      blocks: indices.map((index, position) => {
        const entry = CONTENT_CATALOG[index], unlocked = entry.unlocked(this.state);
        return { title: readableCopy(entry.title), body: readableCopy(entry.description), facts: [
          { label: "Stato", value: unlocked ? "Disponibile" : "Da sbloccare" },
          { label: "Posizione", value: `${position + 1} di ${indices.length}` },
          { label: unlocked ? "Sblocco raggiunto" : "Come sbloccarlo", value: readableCopy(entry.requirement) }
        ] };
      }), actions: [], back: { label: "Indietro", run: () => {
        if (this.stack.top !== this) return;
        this.input.reset(); audio.cancel(); this.stack.pop();
      } }
    };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
