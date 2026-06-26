import { BAG_ORDER, ITEMS } from "../data/items";
import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { canLearnMove, evolve, itemEvolution, speciesOf, statsOf } from "../game/monster";
import { markCaught, markSeen, saveGame, type GameState } from "../game/state";
import { Menu, MessageBox, wrapText, GREY, INK, PAPER } from "../ui/widgets";
import { PartyScene } from "./PartyScene";
import { TeachScene } from "./TeachScene";
import { EvolutionScene } from "./EvolutionScene";

export interface BagOptions {
  inBattle: boolean;
  onUse?: (itemId: string) => void;
}

export class BagScene implements Scene {
  private menu: Menu;
  private itemIds: string[];
  private msg = new MessageBox();

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: BagOptions
  ) {
    this.itemIds = BAG_ORDER.filter((id) => (this.state.bag[id] ?? 0) > 0);
    this.menu = new Menu(
      this.itemIds.map((id) => ({
        label: ITEMS[id].name,
        rightLabel: `x${this.state.bag[id]}`
      }))
    );
  }

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    const action = this.menu.update(this.input);
    if (action === "cancel") {
      this.stack.pop();
      return;
    }
    if (action !== "select") {
      return;
    }
    const itemId = this.itemIds[this.menu.index];
    if (!itemId) {
      return;
    }
    const item = ITEMS[itemId];
    if (this.opts.inBattle) {
      this.stack.pop();
      this.opts.onUse?.(itemId);
      return;
    }
    // Uso fuori battaglia.
    if (item.kind === "ball") {
      this.msg.show(["Qui non c'è nessuno da reclutare.", "Prova nell'erba alta, dove i candidati sono allo stato brado."]);
      return;
    }
    // Oggetti chiave: passivi, non si "usano" — spiega l'effetto.
    if (item.kind === "key") {
      this.msg.show(["È sempre attivo, basta possederlo.", item.desc]);
      return;
    }
    // DIRETTIVE DI PARTITO: insegnano una mossa a chi è del tipo giusto.
    if (item.kind === "tm") {
      const moveId = item.moveId;
      if (!moveId) {
        return;
      }
      this.stack.push(
        new PartyScene(this.stack, this.input, this.state, {
          mode: "use-item",
          title: `Direttiva ${MOVES[moveId].name} (tipo ${MOVES[moveId].type}):`,
          directiveMoveId: moveId,
          onChoose: (mon) => {
            if (!canLearnMove(mon, moveId)) {
              const has = mon.moves.some((slot) => slot.id === moveId);
              this.msg.show(
                has
                  ? [`${speciesOf(mon).name} segue già questa linea.`]
                  : [`${speciesOf(mon).name} non ha la tessera giusta.`, "Questa direttiva è per un'altra corrente."]
              );
              return;
            }
            this.stack.push(
              new TeachScene(this.stack, this.input, mon, moveId, () => {
                this.state.flags["used-directive"] = true;
                markSeen(this.state, mon.speciesId);
                saveGame(this.state); // le direttive non si consumano
              })
            );
          }
        })
      );
      return;
    }
    this.stack.push(
      new PartyScene(this.stack, this.input, this.state, {
        mode: "use-item",
        title: item.kind === "evo" ? "A chi consegni la tessera?" : undefined,
        onChoose: (mon) => {
          if (item.kind === "evo") {
            const targetId = itemEvolution(mon, itemId);
            if (!targetId) {
              this.msg.show(["Annusa la tessera, la restituisce.", "Questa carriera non fa per lui."]);
              return;
            }
            const fromId = mon.speciesId;
            this.consume(itemId);
            // Scena dedicata con animazione; l'evoluzione si applica al termine.
            this.stack.push(
              new EvolutionScene(this.stack, this.input, fromId, targetId, () => {
                evolve(mon, targetId);
                markSeen(this.state, targetId);
                markCaught(this.state, targetId);
                saveGame(this.state);
              })
            );
            return;
          }
          if (item.kind === "heal") {
            const max = statsOf(mon).hp;
            if (mon.hp >= max || mon.hp <= 0) {
              this.msg.show(["Non avrebbe alcun effetto."]);
              return;
            }
            const heal = item.percent != null ? Math.ceil(max * item.percent) : (item.amount ?? 20);
            mon.hp = Math.min(max, mon.hp + heal);
            audio.heal();
            this.consume(itemId);
            this.msg.show([`${item.name} ridà fiato alla campagna!`]);
          } else {
            if (!mon.status) {
              this.msg.show(["Nessuno scandalo da insabbiare, per ora."]);
              return;
            }
            mon.status = null;
            audio.heal();
            this.consume(itemId);
            this.msg.show(["Tutto archiviato. Non se ne parla più."]);
          }
        }
      })
    );
  }

  private consume(itemId: string): void {
    this.state.bag[itemId] = Math.max(0, (this.state.bag[itemId] ?? 0) - 1);
    this.itemIds = BAG_ORDER.filter((id) => (this.state.bag[id] ?? 0) > 0);
    this.menu = new Menu(
      this.itemIds.map((id) => ({
        label: ITEMS[id].name,
        rightLabel: `x${this.state.bag[id]}`
      }))
    );
  }

  draw(screen: Screen): void {
    screen.clear("#3a3050");
    screen.text("BORSA DEL CANDIDATO", 8, 6, PAPER);
    if (this.itemIds.length === 0) {
      screen.panel(10, 24, VIEW_W - 20, 40);
      screen.text("La borsa è vuota.", 20, 36, INK);
      screen.text("Come le promesse mantenute.", 20, 48, GREY);
    } else {
      this.menu.draw(screen, 10, 20, VIEW_W - 20);
      const item = ITEMS[this.itemIds[this.menu.index]];
      if (item) {
        const y = 24 + this.menu.measureHeight();
        screen.panel(10, y, VIEW_W - 20, 40);
        const lines = wrapText(item.desc, 34);
        for (let i = 0; i < Math.min(3, lines.length); i += 1) {
          screen.text(lines[i], 18, y + 9 + i * 10, INK);
        }
      }
    }
    screen.text("A: usa  B: chiudi", 8, VIEW_H - 10, GREY);
    this.msg.draw(screen);
  }
}
