import { audio } from "../engine/audio";
import { sceneImage } from "../engine/assets";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { drawScreenHeader, INK, wrapText } from "../ui/widgets";

export class AudioScene implements Scene {
  private index = 0;
  constructor(private stack: SceneStack, private input: Input, private onClose: () => void = () => {}) {}
  onExit(): void { this.onClose(); }
  update(_dt: number): void {
    if (this.input.wasPressed("b")) { audio.cancel(); this.stack.pop(); return; }
    const move = this.input.wasPressed("up") ? -1 : this.input.wasPressed("down") ? 1 : 0;
    if (move) { this.index = (this.index + move + 5) % 5; audio.cursor(); }
    let activate = this.input.wasPressed("a");
    const tap = this.input.consumeTap();
    if (tap && tap.x >= 8 && tap.x < 232 && tap.y >= 82 && tap.y < 157) {
      this.index = Math.floor((tap.y - 82) / 15); activate = true;
      if ((this.index === 1 || this.index === 2) && tap.x >= 112) {
        audio.setVolume(this.index === 1 ? "music" : "effects", (tap.x - 112) / .72);
        activate = false; audio.cursor();
      }
    }
    const delta = this.input.wasPressed("left") ? -10 : this.input.wasPressed("right") ? 10 : 0;
    if (delta && (this.index === 1 || this.index === 2)) {
      const channel = this.index === 1 ? "music" : "effects";
      audio.setVolume(channel, audio.mix[channel] + delta); audio.cursor();
    }
    if (!activate) return;
    if (this.index === 0) audio.toggle();
    else if (this.index === 3) { audio.hit(); audio.heal(); }
    else if (this.index === 4) { this.stack.pop(); return; }
    audio.confirm();
  }
  draw(screen: Screen): void {
    screen.clear("#101b32");
    const image = sceneImage("ui:audio", "ui/audio.png"); if (image) screen.image(image, 0, 0, 240, 180);
    drawScreenHeader(screen, "REGIA AUDIO");
    screen.text("IL VOLUME DEL NASTRO", 10, 29, "#fff3cc");
    screen.text("LO SCEGLI TU.", 10, 39, "#72d4c0");
    screen.panel(6, 51, 228, 29, "card");
    wrapText(audio.trackTitle, 35).slice(0, 2).forEach((line, i) => screen.text(line, 14, 56 + i * 9, INK));
    screen.panel(6, 82, 228, 78, "card");
    const mix = audio.mix, labels = [`AUDIO: ${mix.enabled ? "SÌ" : "NO"}`, "MUSICA", "EFFETTI", "PROVA EFFETTI", "CHIUDI"];
    for (const [i, label] of labels.entries()) {
      const y = 85 + i * 15;
      if (i === this.index) screen.rect(8, y - 2, 224, 14, "#fff0bd");
      screen.text(i === this.index ? "►" : " ", 10, y, "#8c5b12"); screen.text(label, 22, y, INK);
      if (i === 1 || i === 2) {
        const value = mix[i === 1 ? "music" : "effects"];
        screen.rect(112, y + 1, 72, 5, "#c4ccd3"); screen.rect(112, y + 1, Math.round(value * .72), 5, "#237f76");
        screen.textRight(`${value}%`, 225, y, "#59657d");
      }
    }
    screen.text("◄►:VOLUME A:PROVA/ON B:TORNA", 8, 164, "#fff3cc");
    screen.textCenter("SALVATO SU QUESTO DISPOSITIVO", 120, 173, "#72d4c0");
  }
}
