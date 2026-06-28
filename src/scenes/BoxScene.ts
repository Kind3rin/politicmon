import { MONSTER_ART, drawMonsterSprite } from "../art/monsters";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { speciesOf, statsOf } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { drawHpBar, MessageBox, GREY, INK, PAPER } from "../ui/widgets";

// CIRCOLO DI PARTITO (il "PC box" di Politicmon): sposta i mostri tra SQUADRA
// (max 6, mai vuota) e CIRCOLO (riserva). Accessibile dal COMPUTER DI PARTITO
// nei BAR SPORT.
export class BoxScene implements Scene {
  private side: "party" | "box" = "party";
  private index = 0;
  private msg = new MessageBox();

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
    screen.clear("#2e3e52");
    screen.text("CIRCOLO DI PARTITO", 8, 5, PAPER);

    this.drawColumn(screen, "party", "SQUADRA", 4);
    this.drawColumn(screen, "box", "CIRCOLO", VIEW_W / 2 + 2);

    screen.text("A: sposta  < > cambia  B: esci", 8, VIEW_H - 10, GREY);
    this.msg.draw(screen);
  }

  private drawColumn(screen: Screen, side: "party" | "box", title: string, x: number): void {
    const w = VIEW_W / 2 - 6;
    const active = this.side === side;
    const list = this.list(side);
    screen.text(title, x + 4, 16, active ? "#f0c040" : GREY);
    if (active) {
      screen.frame(x, 14, w, VIEW_H - 30, "#f0c040");
    }
    if (list.length === 0) {
      screen.text(side === "party" ? "VUOTA" : "VUOTO", x + 6, 30, GREY);
      return;
    }
    for (let i = 0; i < list.length; i += 1) {
      const mon = list[i];
      const y = 24 + i * 22;
      const selected = active && i === this.index;
      screen.rect(x + 2, y, w - 4, 20, selected ? "#f8f8f0" : "#3a4c64");
      if (selected) {
        screen.frame(x + 2, y, w - 4, 20, INK);
      }
      drawMonsterSprite(screen, mon.speciesId, MONSTER_ART[mon.speciesId], x + 3, y + 1, 20, 19);
      const ink = selected ? INK : PAPER;
      screen.text(speciesOf(mon).name.slice(0, 9), x + 24, y + 2, ink);
      screen.text(`L${mon.level}`, x + 24, y + 11, ink);
      drawHpBar(screen, x + 50, y + 12, w - 56, mon.hp, statsOf(mon).hp);
      if (mon.hp <= 0) {
        screen.text("KO", x + w - 20, y + 2, "#d04848");
      }
    }
  }
}
