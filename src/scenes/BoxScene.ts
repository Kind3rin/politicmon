import { drawMonsterSprite } from "../art/monsters";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { speciesOf, statsOf } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader, MessageBox, GREY, INK } from "../ui/widgets";
import { drawHqBackdrop, drawHqIcon } from "../ui/hqArt";

// CIRCOLO DI PARTITO (il "PC box" di Politicmon): sposta i mostri tra SQUADRA
// (max 6, mai vuota) e CIRCOLO (riserva). Accessibile dal COMPUTER DI PARTITO
// nei BAR SPORT.
export class BoxScene implements Scene {
  private side: "party" | "box" = "party";
  private index = 0;
  private msg = new MessageBox();
  // Finestra scorrevole per colonna: il CIRCOLO può superare le righe visibili
  // (prima le voci oltre la sesta erano fuori schermo e il cursore "spariva").
  private scroll: Record<"party" | "box", number> = { party: 0, box: 0 };
  private static readonly VISIBLE_ROWS = 6;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState
  ) {}

  private list(side: "party" | "box") {
    return side === "party" ? this.state.party : this.state.boxed;
  }

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    const cur = this.list(this.side);

    if (this.input.wasPressed("b")) {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (this.input.wasPressed("up") && cur.length > 0) {
      this.index = (this.index + cur.length - 1) % cur.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down") && cur.length > 0) {
      this.index = (this.index + 1) % cur.length;
      audio.cursor();
    }
    if (this.input.wasPressed("left") || this.input.wasPressed("right")) {
      this.side = this.side === "party" ? "box" : "party";
      this.index = 0;
      audio.cursor();
    }
    if (this.input.wasPressed("a")) {
      this.move();
    }
    // Tieni il cursore dentro la finestra visibile della colonna attiva.
    const vis = BoxScene.VISIBLE_ROWS;
    const sc = this.scroll[this.side];
    if (this.index < sc) {
      this.scroll[this.side] = this.index;
    } else if (this.index >= sc + vis) {
      this.scroll[this.side] = this.index - vis + 1;
    }
    // Clamp (dopo uno spostamento la lista può essersi accorciata).
    const len = this.list(this.side).length;
    this.scroll[this.side] = Math.max(0, Math.min(this.scroll[this.side], Math.max(0, len - vis)));
  }

  private move(): void {
    const cur = this.list(this.side);
    const mon = cur[this.index];
    if (!mon) {
      audio.cancel();
      return;
    }
    if (this.side === "box") {
      // CIRCOLO -> SQUADRA: solo se c'è posto (max 6).
      if (this.state.party.length >= 6) {
        audio.cancel();
        this.msg.show(["La squadra è già al completo (6).", "Manda prima qualcuno al CIRCOLO."]);
        return;
      }
      this.state.boxed.splice(this.index, 1);
      this.state.party.push(mon);
    } else {
      // SQUADRA -> CIRCOLO: mai lasciare la squadra vuota.
      if (this.state.party.length <= 1) {
        audio.cancel();
        this.msg.show(["Non puoi restare senza candidati!", "Tieni almeno un POLITICMON in squadra."]);
        return;
      }
      this.state.party.splice(this.index, 1);
      this.state.boxed.push(mon);
    }
    audio.confirm();
    // Clamp del cursore alla nuova lunghezza della lista corrente.
    const after = this.list(this.side);
    if (this.index >= after.length) {
      this.index = Math.max(0, after.length - 1);
    }
    saveGame(this.state);
  }

  draw(screen: Screen): void {
    drawHqBackdrop(screen, "box");
    drawScreenHeader(screen, "CIRCOLO DI PARTITO");

    const mon = this.list(this.side)[this.index];
    screen.panel(4, 21, VIEW_W - 8, 38, "card");
    if (mon) {
      const species = speciesOf(mon);
      drawMonsterSprite(screen, mon.speciesId, 8, 23, 32, 32, { memeFormId: mon.memeFormId });
      screen.textFit(species.name, 45, 26, VIEW_W - 56, INK);
      screen.text(`L${mon.level}  ${species.types.join(" / ")}`, 45, 37, "#497b65");
      screen.text(`${mon.hp}/${statsOf(mon).hp} PV${mon.status ? `  ${mon.status}` : ""}`, 45, 48, mon.hp <= 0 ? "#a0443e" : INK);
    } else {
      drawHqIcon(screen, "warehouse", 9, 25, 28);
      screen.text("IL CIRCOLO HA POSTI LIBERI.", 44, 28, INK);
      screen.text("I VOLANTINI NON SI PIEGANO DA SOLI.", 12, 48, "#497b65");
    }

    this.drawColumn(screen, "party", "SQUADRA", 4);
    this.drawColumn(screen, "box", "CIRCOLO", VIEW_W / 2 + 2);

    screen.text("A SPOSTA  < > CAMBIA  B ESCI", 8, VIEW_H - 9, "#fffaf0");
    this.msg.draw(screen);
  }

  private drawColumn(screen: Screen, side: "party" | "box", title: string, x: number): void {
    const w = VIEW_W / 2 - 6;
    const active = this.side === side;
    const list = this.list(side);
    screen.rect(x, 63, w, 101, active ? "#e6b944" : "#526279");
    screen.rect(x + 1, 64, w - 2, 99, "#18243a");
    screen.text(title, x + 5, 67, active ? "#ffe38a" : "#fffaf0");
    screen.textRight(`${list.length}${side === "party" ? "/6" : ""}`, x + w - 5, 67, "#fffaf0");
    if (list.length === 0) {
      screen.text(side === "party" ? "VUOTA" : "VUOTO", x + 6, 86, GREY);
      drawHqIcon(screen, "warehouse", x + 38, 109, 32);
      return;
    }
    const vis = BoxScene.VISIBLE_ROWS;
    const sc = Math.max(0, Math.min(this.scroll[side], Math.max(0, list.length - vis)));
    // Frecce di overflow: segnalano che la lista continua sopra/sotto.
    if (sc > 0) {
      screen.text("▲", x + 65, 67, "#ffe38a");
    }
    if (sc + vis < list.length) {
      screen.text("▼", x + 77, 67, "#ffe38a");
    }
    for (let row = 0; row < vis; row += 1) {
      const i = sc + row;
      if (i >= list.length) {
        break;
      }
      const mon = list[i];
      const y = 78 + row * 14;
      const selected = active && i === this.index;
      screen.rect(x + 2, y, w - 4, 13, selected ? "#fff0bd" : "#fffaf0");
      screen.rect(x + 2, y, 2, 13, selected ? "#e0a92f" : "#7aa2b8");
      if (selected) {
        screen.frame(x + 2, y, w - 4, 13, INK);
      }
      drawMonsterSprite(screen, mon.speciesId, x + 3, y, 14, 13, { memeFormId: mon.memeFormId });
      screen.textFit(speciesOf(mon).name, x + 20, y + 3, w - 25, mon.hp <= 0 ? "#a0443e" : INK);
    }
  }
}
