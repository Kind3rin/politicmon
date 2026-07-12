import { MEME_EVENTS } from "../data/memeevents";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { drawScreenHeader, GREY, INK, wrapText } from "../ui/widgets";

export interface SourceEntry { readonly title: string; readonly label: string; readonly url: string; }
export const SOURCE_ENTRIES: readonly SourceEntry[] = MEME_EVENTS.map((event) => ({ title: event.title, label: event.source.label, url: event.source.url }));

export function openSource(entry: SourceEntry, opener: (url: string) => unknown = (url) => window.open(url, "_blank", "noopener,noreferrer")): boolean {
  if (!entry.url.startsWith("https://")) return false;
  opener(entry.url); return true;
}

export class SourcesScene implements Scene {
  private index = 0;
  private scroll = 0;
  private message = "A: APRI LA FONTE NEL BROWSER";

  constructor(private stack: SceneStack, private input: Input) {}

  update(): void {
    if (this.input.wasPressed("b")) { audio.cancel(); this.stack.pop(); return; }
    if (this.input.wasPressed("up")) { this.index = (this.index + SOURCE_ENTRIES.length - 1) % SOURCE_ENTRIES.length; audio.cursor(); }
    if (this.input.wasPressed("down")) { this.index = (this.index + 1) % SOURCE_ENTRIES.length; audio.cursor(); }
    const visible = 4;
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + visible) this.scroll = this.index - visible + 1;
    if (this.input.wasPressed("a")) {
      this.message = openSource(SOURCE_ENTRIES[this.index]) ? "FONTE APERTA IN UNA NUOVA SCHEDA" : "LINK NON DISPONIBILE";
      audio.confirm();
    }
  }

  draw(screen: Screen): void {
    screen.clear("#10141f");
    drawScreenHeader(screen, "FONTI DELLA SATIRA", `${this.index + 1}/${SOURCE_ENTRIES.length}`);
    for (let row = 0; row < 4; row += 1) {
      const i = this.scroll + row; if (i >= SOURCE_ENTRIES.length) break;
      const y = 23 + row * 20; const selected = i === this.index;
      screen.panel(6, y, 228, 17, "card");
      if (selected) screen.frame(7, y + 1, 226, 15, "#e6b944");
      screen.textFit(`${selected ? "► " : "  "}${SOURCE_ENTRIES[i].title}`, 11, y + 5, 204, INK);
    }
    const entry = SOURCE_ENTRIES[this.index];
    screen.panel(6, 106, 228, 52, "dialog");
    let y = 116;
    for (const line of wrapText(entry.label, 35).slice(0, 3)) { screen.text(line, 12, y, INK); y += 10; }
    screen.textFit(this.message, 12, 148, 216, "#a46b12");
    screen.text("SU/GI: SCEGLI   A: APRI   B: ESCI", 10, 166, GREY);
  }
}
