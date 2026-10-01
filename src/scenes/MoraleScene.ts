import { sceneImage } from "../engine/assets";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { keepPromise, moraleExpMultiplier, promiseCost, PROMISES, trustPriceAdjustment } from "../game/morale";
import { saveGame, type GameState } from "../game/state";
import { drawScreenHeader, MessageBox } from "../ui/widgets";

export class MoraleScene implements Scene {
  private index = 0;
  private msg = new MessageBox();
  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(dt: number): void {
    if (this.msg.isOpen) { this.msg.update(dt, this.input); return; }
    if (this.input.wasPressed("start")) {
      this.msg.show(["I SONDAGGI misurano visibilità. La FIDUCIA ricorda come tratti i cittadini. La COESIONE riguarda chi lavora con te.", "FIDUCIA: da 70 prezzi -5%; sotto 30 prezzi +5%. COESIONE: da 70 crescita PVE +8%; sotto 30 -8%.", "Una promessa scade alla terza NUOVA vittoria contro un allenatore della storia. Selvatici, rivincite, sfide giornaliere, Coppa e campagna settimanale non contano.", "Se salti la data: fiducia -12, coesione -6. Riparare costa il 50% in più e recupera meno fiducia.", "Ogni scelta di quartiere vale una volta. I cittadini ricordano la decisione; il finale ricorda il tuo modo di governare."]);
      return;
    }
    if (this.input.wasPressed("b")) { this.stack.pop(); return; }
    const promises = this.state.morale.promises;
    if (!promises.length) return;
    if (this.input.wasPressed("up")) this.index = (this.index + promises.length - 1) % promises.length;
    if (this.input.wasPressed("down")) this.index = (this.index + 1) % promises.length;
    if (!this.input.wasPressed("a")) return;
    const result = keepPromise(this.state, promises[this.index].id);
    if (result === "funds") { audio.cancel(); this.msg.show(["Fondi insufficienti.", "Il pagamento non è stato eseguito."]); return; }
    if (result === "unavailable") { this.msg.show(["Questa voce è già chiusa nel verbale."]); return; }
    saveGame(this.state); audio.confirm();
    this.msg.show(result === "kept" ? ["Il servizio è finanziato.", "Fiducia +12. Coesione +6.", "Il manifesto può aspettare."] : ["Ripari il servizio, non il passato.", "Fiducia +7. Coesione +3.", "Il ritardo resta nel verbale."]);
  }

  draw(screen: Screen): void {
    screen.clear("#10141f");
    const morale = this.state.morale;
    drawScreenHeader(screen, "MORALE", `FID ${morale.trust} COE ${morale.cohesion}`);
    const art = sceneImage("civic:verbale", "ui/civic/verbale.png");
    if (art) screen.image(art, 8, 26, 80, 45);
    const exp = Math.round((moraleExpMultiplier(morale) - 1) * 100);
    const price = Math.round(trustPriceAdjustment(morale) * 100);
    screen.text(`PREZZI ${price >= 0 ? "+" : ""}${price}%`, 100, 28, "#e7ebf2");
    screen.text(`CRESCITA ${exp >= 0 ? "+" : ""}${exp}%`, 100, 40, "#e7ebf2");
    screen.text(`FONDI ${this.state.money}€`, 100, 52, "#ffe38a");
    screen.text("DATE: CONTANO LE NUOVE VITTORIE", 8, 76, "#a5b8c6");
    morale.promises.forEach((promise, index) => {
      const y = 88 + index * 20;
      const open = promise.status === "pending" || promise.status === "broken";
      screen.panel(6, y, 228, 19, "card");
      const selected = this.index === index;
      if (selected) screen.frame(7, y + 1, 226, 17, "#e6b944");
      const suffix = promise.status === "pending" ? `${promise.dueAt - morale.progress} SF ${promiseCost(promise)}€`
        : promise.status === "broken" ? `RIPARA ${promiseCost(promise)}€`
          : promise.status === "kept" ? "MANTENUTA" : "RIPARATA";
      screen.text(PROMISES[promise.id].title, 12, y + 5, "#10141f");
      screen.textRight(suffix, 228, y + 5, open ? "#99531e" : "#26745d");
    });
    if (!morale.promises.length) {
      screen.text("LE PROMESSE PRENDONO UNA DATA.", 10, 92, "#e7ebf2");
      screen.text("PARLA CON GLI ABITANTI.", 10, 105, "#e7ebf2");
      screen.text("LE VITTORIE NON COMPRANO FIDUCIA.", 10, 119, "#ffe38a");
    }
    const latest = morale.history.at(-1);
    if (latest) screen.text(latest.label.slice(0, 36), 8, 151, "#a5b8c6");
    screen.text("SU/GIU SCEGLI  START: GUIDA", 8, 160, "#a5b8c6");
    screen.text("A: FINANZIA  B: ESCI", 8, 171, "#ffe38a");
    this.msg.draw(screen);
  }
}
