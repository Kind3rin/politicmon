import { drawMonsterSprite } from "../art/monsters";
import type { TrainerDef } from "../data/trainers";
import { ITEMS } from "../data/items";
import { TYPE_ORDER } from "../data/poltypes";
import { sceneImage } from "../engine/assets";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { speciesOf, statsOf, type Monster } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { trainerStyle, type TrainerStyle } from "../game/battle/trainerStyle";
import { preparationNotes } from "../game/battle/preparation";
import { drawScreenHeader, GREY, INK, wrapText } from "../ui/widgets";

// Prima di costruire BattleScene: nessun PP, status, flag dex o turno cambia.
// Il leader scelto viene salvato prima dell'inizio effettivo della lotta.
export class BossBriefingScene implements Scene {
  private page = 0;
  private index = 0;
  private scroll = 0;
  private foeIndex = 0;
  private started = false;
  private style: TrainerStyle;
  constructor(private stack: SceneStack, private input: Input, private state: GameState, private trainer: TrainerDef, private team: Monster[], private begin: () => void, private cancel: () => void = () => {}) {
    this.style = trainerStyle(trainer.id);
    this.index = Math.max(0, state.party.findIndex((m) => m.hp > 0));
    if (this.style.art) sceneImage(`boss:${this.style.art}`, `ui/boss/${this.style.art}.png`);
  }
  update(): void {
    if (this.started) return;
    if (this.input.wasPressed("b")) { audio.cancel(); this.stack.pop(); this.cancel(); return; }
    if (this.input.wasPressed("start")) { this.page = this.page === 1 ? 0 : 1; this.scroll = 0; audio.cursor(); return; }
    const direction = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
    if (direction && this.page !== 1) {
      if (this.page === 0) this.page = 2;
      else this.foeIndex = (this.foeIndex + direction + this.team.length) % this.team.length;
      this.scroll = 0; audio.cursor(); return;
    }
    if (this.input.wasPressed("a")) {
      if (this.page === 2) { this.page = 0; this.scroll = 0; audio.cursor(); return; }
      if (this.page === 1) {
        const mon = this.state.party[this.index];
        if (!mon || mon.hp <= 0) { audio.cancel(); return; }
        if (this.index > 0) { this.state.party.splice(this.index, 1); this.state.party.unshift(mon); saveGame(this.state); }
        this.index = 0; this.page = 0; audio.confirm(); return;
      }
      this.started = true; this.stack.pop(); this.begin(); return;
    }
    const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
    if (!delta) return;
    if (this.page === 1 && this.state.party.length) this.index = (this.index + delta + this.state.party.length) % this.state.party.length;
    else this.scroll = Math.max(0, Math.min(Math.max(0, this.notes().length - (this.page === 2 ? 10 : 3)), this.scroll + delta));
    audio.cursor();
  }
  private notes(): string[] {
    if (this.page === 2) return preparationNotes(this.state, this.team[this.foeIndex]).flatMap((line) => wrapText(line, 35));
    const types = TYPE_ORDER.filter((type) => this.team.some((m) => speciesOf(m).types.includes(type)));
    return [`${this.team.length} AVVERSARI, LV ${Math.min(...this.team.map((m) => m.level))}-${Math.max(...this.team.map((m) => m.level))}.`, `APERTURA: ${speciesOf(this.team[0]).types.join(" / ")}.`, `TIPI ANNUNCIATI: ${types.join(", ")}.`, ...this.style.hints].flatMap((line) => wrapText(line, 35));
  }
  draw(screen: Screen): void {
    screen.clear("#efe6da"); drawScreenHeader(screen, "BRIEFING", this.state.hardMode ? "DIFFICILE" : "NORMALE");
    screen.panel(4, 18, 232, 158, "card");
    if (this.page === 1) { this.drawParty(screen); return; }
    if (this.page === 2) {
      const foe = this.team[this.foeIndex];
      screen.textFit(`${this.foeIndex + 1}/${this.team.length} ${speciesOf(foe).name} L${foe.level}`, 14, 26, 212, "#8c5b12");
      const lines = this.notes();
      lines.slice(this.scroll, this.scroll + 10).forEach((line, i) => screen.text(line, 14, 40 + i * 10, INK));
      screen.text(`SU/GIU ${this.scroll + 1}/${Math.max(1, lines.length - 9)}`, 14, 146, GREY);
      screen.text("◄►:RIVALE A:PIANO B:TORNA", 14, 163, GREY); return;
    }
    const image = this.style.art ? sceneImage(`boss:${this.style.art}`, `ui/boss/${this.style.art}.png`) : null;
    if (image) screen.image(image, 8, 22, 224, 78);
    else { screen.rect(8, 22, 224, 78, "#26344c"); screen.textCenter("LA SFIDA TI ASPETTA", 120, 53, "#fff0bd"); }
    screen.rect(8, 22, 224, 13, "#17243d");screen.textFit(this.trainer.name, 12, 25, 214, "#fff0bd");
    screen.textFit(this.style.label, 14, 104, 212, "#8c5b12");
    const lines = this.notes();
    for (const [i,line] of lines.slice(this.scroll,this.scroll+3).entries()) screen.text(line,14,118+i*10,INK);
    screen.text("A:SFIDA ►:DOSSIER START:LEADER B:VIA",14,163,"#59657d");
    if (lines.length>3) screen.textRight(`SU/GIU ${this.scroll+1}/${lines.length-2}`,226,151,"#59657d");
  }
  private drawParty(screen: Screen): void {
    screen.text("SCEGLI CHI APRE IL DIBATTITO",14,26,INK);
    for (const [i,mon] of this.state.party.entries()) {
      const y=40+i*13;if(i===this.index)screen.rect(8,y-2,224,12,"#fff0bd");
      screen.text(i===this.index?"►":" ",10,y,"#8c5b12");
      screen.textFit(speciesOf(mon).name,22,y,126,mon.hp>0?INK:GREY);
      screen.textRight(`${mon.hp}/${statsOf(mon).hp} PV`,226,y,mon.hp>0?GREY:"#b04848");
    }
    const mon=this.state.party[this.index];if(mon) {
      drawMonsterSprite(screen,mon.speciesId,10,121,48,32);
      screen.textFit(`LV ${mon.level} ${speciesOf(mon).types.join("/")}`,64,123,162,INK);
      screen.textFit(mon.status ? `STATUS: ${mon.status.toUpperCase()}` : "PRONTO AL DIBATTITO",64,135,162,mon.status?"#b04848":GREY);
      screen.textFit(mon.heldItem?ITEMS[mon.heldItem]?.name??"OGGETTO NON NOTO":"NESSUN OGGETTO TENUTO",64,147,162,GREY);
    }
    screen.text("A: LEADER  START: PIANO  B: TORNA",14,164,"#59657d");
  }
}
