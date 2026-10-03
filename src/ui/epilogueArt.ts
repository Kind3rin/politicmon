import { sceneImage } from "../engine/assets";
import type { Screen } from "../engine/screen";
import { wrapText } from "./widgets";

export function drawEpilogueBackdrop(screen: Screen, kind: string): void {
  screen.clear("#17243d");
  const image = sceneImage(`epilogue:${kind}`, `ui/epilogue/${kind}.png`);
  if (image) screen.image(image, 0, 17, 240, 163);
  screen.dim(0.2);
  screen.rect(0, 161, 240, 19, "#17243d");
}

// Every paragraph is retained, including long names and the last line.
export function epiloguePages(paragraphs: readonly string[], width = 34, height = 8): string[][] {
  const pages: string[][] = [[]];
  for (const paragraph of paragraphs) {
    for (const line of wrapText(paragraph, width)) {
      if (pages.at(-1)!.length === height) pages.push([]);
      pages.at(-1)!.push(line);
    }
    if (pages.at(-1)!.length < height) pages.at(-1)!.push("");
  }
  return pages;
}

export function drawEpiloguePage(screen: Screen, lines: readonly string[], height = 96): void {
  screen.panel(8, 60, 224, height, "dialog");
  lines.forEach((line, i) => screen.text(line, 16, 68 + i * 10, "#17243d"));
}
