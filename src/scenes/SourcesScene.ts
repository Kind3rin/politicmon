import { MEME_EVENTS } from "../data/memeevents";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import type { UiPanel } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";

export interface SourceEntry { readonly title: string; readonly label: string; readonly url: string; }
export const SOURCE_ENTRIES: readonly SourceEntry[] = MEME_EVENTS.map((event) => ({ title: event.title, label: event.source.label, url: event.source.url }));

export function openSource(entry: SourceEntry, opener: (url: string) => unknown = (url) => window.open(url, "_blank", "noopener,noreferrer")): boolean {
  if (!entry.url.startsWith("https://")) return false;
  opener(entry.url); return true;
}

export class SourcesScene implements Scene {
  private index = 0;
  private notice = "";
  constructor(private stack: SceneStack, private input: Input) {}

  get uiPanel(): UiPanel {
    return {
      title: "Fonti della satira",
      subtitle: "Le notizie e le clip dietro le battute. Ogni fonte si apre in una nuova scheda del browser.",
      blocks: this.notice ? [{ title: "Browser", body: this.notice }] : [],
      actions: SOURCE_ENTRIES.map((entry, index) => ({
        label: readableCopy(entry.title), hint: entry.label,
        group: "Notizie e clip", run: () => {
          if (this.stack.top !== this) return;
          this.input.reset(); this.index = index;
          this.notice = openSource(entry) ? "Fonte aperta in una nuova scheda." : "Il collegamento non è disponibile.";
          audio.confirm();
        }
      })), selected: this.index,
      back: { label: "Indietro", run: () => {
        if (this.stack.top !== this) return;
        this.input.reset(); audio.cancel(); this.stack.pop();
      } }
    };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}
