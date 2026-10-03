import type { Input } from '../engine/input';
import type { Scene, SceneStack } from '../engine/scene';
import type { Screen } from '../engine/screen';
import { audio } from '../engine/audio';
import { palaceDossier, readPalaceDossier, verifyPalaceDossier, type PalaceModule } from '../game/palaceArchive';
import { saveGame, type GameState } from '../game/state';
import type { UiPanel } from '../ui/kit';
import { readableCopy } from '../ui/kit/copy';

export class PalaceArchiveScene implements Scene {
  private data;
  private mode: 'study' | 'quiz' | 'feedback';
  private feedback = '';
  private correct = false;
  constructor(private stack: SceneStack, private input: Input, private state: GameState,
    private module: PalaceModule, private terminal: 'a' | 'b') {
    this.data = palaceDossier(state, module);
    this.mode = terminal === 'b' && state.election.phase === 'ready' && state.flags[`palace:${module}:a`] && !this.data.complete ? 'quiz' : 'study';
  }
  private read(): void {
    if (this.stack.top !== this || this.mode !== 'study') return;
    this.input.reset();
    if (readPalaceDossier(this.state, this.module)) saveGame(this.state);
    this.data = palaceDossier(this.state, this.module);
    audio.confirm();
    if (this.terminal === 'b' && this.state.election.phase === 'ready' && !this.data.complete) this.mode = 'quiz';
    else this.stack.pop();
  }
  private verify(answer: string): void {
    if (this.stack.top !== this || this.mode !== 'quiz' || !this.data.options.includes(answer)) return;
    this.mode = 'feedback'; this.input.reset();
    const result = verifyPalaceDossier(this.state, this.module, answer);
    this.data = palaceDossier(this.state, this.module);
    this.correct = result === 'complete';
    this.feedback = this.correct ? 'Verbale validato. Nessun voto o bonus aggiunto.' : result === 'wrong'
      ? 'La copia non regge. Rileggi i fatti: nessuna penalità.' : 'Archivio non disponibile. La risposta non ha modificato il verbale.';
    if (this.correct) { saveGame(this.state); audio.confirm(); } else audio.cancel();
  }
  get uiPanel(): UiPanel {
    const mode = this.mode;
    const back = { label: 'Indietro', run: () => { if (this.stack.top !== this || this.mode !== mode) return;
      this.input.reset(); audio.cancel(); this.stack.pop();
    } };
    if (mode === 'quiz') return { title: readableCopy(this.data.title), subtitle: 'Verifica il verbale del Tour. Una risposta errata non toglie voti o fondi.',
      blocks: [{ title: 'La domanda', body: readableCopy(this.data.question) }],
      actions: this.data.options.map(answer => ({ label: readableCopy(answer), run: () => this.verify(answer) })), back };
    return { title: readableCopy(this.data.title), subtitle: this.data.complete ? 'Archivio validato.' : 'Fatti registrati nel verbale del Tour.',
      blocks: [...(mode === 'feedback' ? [{ title: this.correct ? 'Verifica completata' : 'Verifica non superata', body: this.feedback }] : []),
        ...this.data.lines.map((line, index) => ({ title: index === 0 ? 'Dal verbale' : index === 1 ? 'Il dato da ricordare' : index === this.data.lines.length - 1 ? 'Situazione attuale' : `Riscontro ${index - 1}`, body: readableCopy(line) }))],
      actions: [{ label: mode === 'study' ? this.data.complete ? 'Chiudi il dossier' : this.terminal === 'b' && this.state.election.phase === 'ready' ? 'Ho letto · verifica' : 'Ho letto il dossier'
        : this.correct ? 'Chiudi il dossier' : 'Rileggi i fatti', run: () => {
        if (this.stack.top !== this || this.mode !== mode) return;
        if (mode === 'study') this.read(); else if (this.correct) { this.input.reset(); this.stack.pop(); }
        else { this.mode = 'study'; this.input.reset(); audio.cursor(); }
      } }], primary: 0, back };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear('#112037'); }
}
