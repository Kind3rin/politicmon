import { MONSTER_ACTION_ART, MONSTER_ART } from "../art/monsters";
import { SPECIES } from "../data/species";
import { TYPE_COLORS, typeIcon } from "../data/poltypes";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { Menu, wrapText, GREY, INK, PAPER } from "../ui/widgets";

// Anteprima dello starter prima della scelta: sprite grande animato (respiro +
// urlo periodico), tipo, statistiche base e descrizione del Dex. Conferma SÌ/NO.
export class StarterPreviewScene implements Scene {
  private menu = new Menu([{ label: "SCELGO LUI!" }, { label: "FAMMI PENSARE" }]);
  private time = 0;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private speciesId: string,
    private onConfirm: () => void
  ) {}

  update(dt: number): void {
    this.time += dt;
    const action = this.menu.update(this.input);
    if (action === "cancel") {
      this.stack.pop();
      return;
    }
    if (action === "select") {
      if (this.menu.index === 0) {
        this.stack.pop();
        this.onConfirm();
      } else {
        audio.cancel();
        this.stack.pop();
      }
    }
  }

  draw(screen: Screen): void {
    const species = SPECIES[this.speciesId];
    screen.clear("#1c2740");
    // Riflettori da palco.
    screen.rect(0, 0, VIEW_W, 4, "#f4d34a");
    screen.text("LA TUA PRIMA SCHEDA", 8, 10, "#f4d34a");

    // Sprite grande, animato: respiro + urlo periodico (frame d'azione se c'è).
    const breath = Math.sin(this.time * 3) * 0.04;
    const shout = Math.sin(this.time * 1.2) > 0.7; // ogni tanto "parla"
    const action = MONSTER_ACTION_ART[this.speciesId];
    const art = shout && action ? action : MONSTER_ART[this.speciesId];
    if (art) {
      const w = art.art[0].length;
      const h = art.art.length;
      const scale = 3;
      const sx = 1 - breath;
      const sy = 1 + breath;
      const cx = 56;
      const by = 118;
      const drawW = w * scale * sx;
      const drawH = h * scale * sy;
      // Piedistallo + ombra.
      screen.rect(cx - 24, by - 2, 48, 6, "rgba(0,0,0,0.3)");
      screen.sprite(`preview:${this.speciesId}${shout && action ? ":a" : ""}`, art, cx - drawW / 2, by - drawH, {
        scale, scaleX: sx, scaleY: sy
      });
    }

    // Scheda informativa a destra.
    const px = 104;
    screen.text(species.name, px, 26, PAPER);
    let tx = px;
    for (const type of species.types) {
      const icon = typeIcon(type);
      const iconW = icon ? 11 : 0;
      const w = type.length * 6 + 6 + iconW;
      screen.rect(tx, 36, w, 11, TYPE_COLORS[type]);
      if (icon) {
        screen.imageSprite(icon, tx + 1, 37, { scaleX: 9 / icon.width, scaleY: 9 / icon.height });
      }
      screen.text(type, tx + 3 + iconW, 38, PAPER);
      tx += w + 4;
    }
    screen.text(species.category, px, 50, GREY);

    // Barre statistiche base.
    const stats: Array<[string, number]> = [
      ["PV", species.base.hp], ["GRT", species.base.atk], ["DIF", species.base.def],
      ["RET", species.base.spc], ["VEL", species.base.spd]
    ];
    for (let i = 0; i < stats.length; i += 1) {
      const y = 62 + i * 9;
      screen.text(stats[i][0], px, y, PAPER);
      screen.frame(px + 24, y, 102, 6, "#39415a");
      const fill = Math.round((Math.min(120, stats[i][1]) / 120) * 100);
      screen.rect(px + 25, y + 1, fill, 4, "#6aa8ff");
    }

    // Dexline in basso, su due righe.
    screen.panel(4, 112, VIEW_W - 8, 40);
    const lines = wrapText(species.dexLine, 38);
    for (let i = 0; i < Math.min(2, lines.length); i += 1) {
      screen.text(lines[i], 12, 120 + i * 10, INK);
    }

    this.menu.draw(screen, VIEW_W - 130, VIEW_H - 30, 126, 11);
  }
}
