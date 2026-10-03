import type { TouchAction } from "../engine/touchActions";
import { healingQuote, useHealingSupply, type HealingQuote } from "../game/supplyGuide";
import { BAG_ORDER, ITEMS } from "../data/items";
import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import { canLearnMove, evolve, heldItemOf, itemEvolution, speciesOf, statsOf, type Monster } from "../game/monster";
import { markCaught, markSeen, saveGame, type GameState } from "../game/state";
import { BAR_RESPAWN } from "../data/maps";
import { Menu, MessageBox, wrapText, INK } from "../ui/widgets";
import { SupplyView } from "../ui/SupplyView";
import { PartyScene } from "./PartyScene";
import { TeachScene } from "./TeachScene";
import { EvolutionScene } from "./EvolutionScene";

export interface BagOptions {
  inBattle: boolean;
  quickHeal?: boolean;
  onUse?: (itemId: string) => void;
}

export class BagScene implements Scene {
  private view: SupplyView;
  private quickPage = 0;
  private quickIndex = 0;
  private quickDone = false;
  private msg = new MessageBox();
  // Conferma SÌ/NO per lo swap di un hold item già equipaggiato.
  private ask: { text: string; yes: () => void } | null = null;
  private askMenu = new Menu([{ label: "SÌ" }, { label: "NO" }]);

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: BagOptions
  ) {
    this.view = new SupplyView(state, false, opts.inBattle);
    this.refresh();
  }

  private get quick(): boolean { return !!this.opts.quickHeal && !this.opts.inBattle; }
  private targets(): Monster[] { return this.state.party.slice(this.quickPage * 4, this.quickPage * 4 + 4); }
  private quickHint(mon: Monster, quote: HealingQuote | null): string {
    if (quote) return `${ITEMS[quote.id].name} x${quote.quantity} · PV ${quote.before} → ${quote.after}/${quote.max}`;
    return mon.hp <= 0 ? "KO: cura al bar" : mon.hp >= statsOf(mon).hp ? "PV pieni" : "Nessuna cura in borsa";
  }
  get touchActions(): readonly TouchAction[] | undefined {
    if (!this.quick) return undefined;
    const page = this.quickPage;
    const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled, run: () => {
      if (disabled || this.stack.top !== this || !this.quick || this.msg.isOpen || this.quickPage !== page) return;
      this.input.reset(); run();
    } });
    const targets = this.targets();
    return [...targets.map((mon) => {
      const quote = healingQuote(this.state, mon);
      return action(speciesOf(mon).name, this.quickHint(mon, quote), () => { if (quote) this.healQuick(mon, quote); }, !quote || this.msg.isOpen);
    }), ...Array.from({ length: 4 - targets.length }, () => action("—", "Nessun candidato", () => {}, true)),
      action(this.state.party.length > 4 ? "ALTRI" : "BORSA", this.state.party.length > 4 ? "Altra pagina della squadra" : "Status, schede e altri oggetti", () => {
        if (this.state.party.length > 4) { this.quickPage = (page + 1) % Math.ceil(this.state.party.length / 4); this.quickIndex = 0; }
        else this.opts.quickHeal = false;
        audio.cursor();
      }, this.msg.isOpen), action("INDIETRO", "Torna alla pausa", () => this.stack.pop(), this.msg.isOpen)];
  }
  private healQuick(mon: Monster, quote: HealingQuote): void {
    if (!useHealingSupply(this.state, mon, quote)) return;
    audio.heal(); saveGame(this.state); this.quickDone = true;
    this.msg.show([`${speciesOf(mon).name}: PV ${mon.hp}/${quote.max}.`], undefined, true);
  }
  private updateQuick(): void {
    if (this.input.wasPressed("b")) { this.stack.pop(); return; }
    const targets = this.targets(), tap = this.input.consumeTap();
    if (this.input.wasPressed("up") || this.input.wasPressed("down")) {
      this.quickIndex = (this.quickIndex + (this.input.wasPressed("up") ? targets.length - 1 : 1)) % Math.max(1, targets.length); audio.cursor();
    }
    if (this.input.wasPressed("start")) { this.opts.quickHeal = false; return; }
    if (this.input.wasPressed("right") || this.input.wasPressed("left")) {
      this.quickPage = (this.quickPage + 1) % Math.max(1, Math.ceil(this.state.party.length / 4)); this.quickIndex = 0; return;
    }
    if (tap && tap.x >= 8 && tap.x < 232 && tap.y >= 38 && tap.y < 150) {
      this.quickIndex = Math.floor((tap.y - 38) / 28);
      const mon = targets[this.quickIndex], quote = mon && healingQuote(this.state, mon);
      if (mon && quote) this.healQuick(mon, quote);
    } else if (this.input.wasPressed("a")) {
      const mon = targets[this.quickIndex], quote = mon && healingQuote(this.state, mon);
      if (mon && quote) this.healQuick(mon, quote);
    }
  }
  private drawQuick(screen: Screen): void {
    screen.clear("#17243d"); screen.text("CURA RAPIDA", 12, 8, "#fffaf0", 2);
    screen.text("PV, NON PROMESSE.", 12, 27, "#80d1b0");
    this.targets().forEach((mon, i) => {
      const quote = healingQuote(this.state, mon), y = 38 + i * 28;
      screen.rect(8, y, 224, 25, i === this.quickIndex ? "#fff3cc" : "#263954");
      const color = i === this.quickIndex ? "#17243d" : "#fffaf0";
      screen.text(speciesOf(mon).name, 15, y + 4, color);
      screen.textRight(`${mon.hp}/${statsOf(mon).hp} PV`, 224, y + 4, color);
      const note = quote ? `${ITEMS[quote.id].name} x${quote.quantity}: +${quote.after - quote.before} PV` : this.quickHint(mon, quote);
      screen.textFit(note, 15, y + 15, 209, color);
    });
    screen.text("NON RECUPERA PP O STATUS. KO: AL BAR.", 12, 155, "#fffaf0");
    screen.text("A:CURA  START:BORSA  B:PAUSA", 12, 170, "#80d1b0");
  }

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      if (!this.msg.isOpen && this.quickDone) this.stack.pop();
      return;
    }
    if (this.quick) { this.updateQuick(); return; }
    if (this.ask) {
      const a = this.askMenu.update(this.input);
      if (a === "select") {
        const yes = this.askMenu.index === 0 ? this.ask.yes : null;
        this.ask = null;
        yes?.();
      } else if (a === "cancel") {
        audio.cancel();
        this.ask = null;
      }
      return;
    }
    this.refresh();
    const action = this.view.update(this.input);
    this.refresh();
    if (action === "cancel") {
      this.stack.pop();
      return;
    }
    if (action !== "select") {
      return;
    }
    const itemId = this.view.selected;
    if (!itemId) {
      return;
    }
    const item = ITEMS[itemId];
    if (this.opts.inBattle) {
      // I boost campagna si attivano dal mondo, non in battaglia: bloccali qui.
      if (!["ball", "heal", "cure"].includes(item.kind)) {
        this.msg.show(["Il kit si prepara prima dei riflettori.", "In lotta puoi usare solo cure e schede di reclutamento."]);
        return;
      }
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
    // HOLD ITEM: scegli il POLITICMON che lo terrà (1 slot; swap con conferma).
    if (item.kind === "hold") {
      this.stack.push(
        new PartyScene(this.stack, this.input, this.state, {
          mode: "use-item",
          title: `A chi affidi ${item.name}?`,
          onChoose: (mon) => this.equipHold(mon, itemId)
        })
      );
      return;
    }
    // OGGETTI DA CAMPO: repellente e teletrasporto al bar.
    if (item.kind === "field") {
      this.useFieldItem(itemId);
      return;
    }
    // CAMPAGNA ELETTORALE: attiva un buff a tempo (contatore battaglie nel save).
    if (item.kind === "boost") {
      this.useBoostItem(itemId);
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
            // Scena dedicata con animazione; l'evoluzione si applica al termine.
            this.stack.push(
              new EvolutionScene(this.stack, this.input, fromId, targetId, () => {
                this.consume(itemId);
                evolve(mon, targetId);
                markSeen(this.state, targetId);
                markCaught(this.state, targetId);
                saveGame(this.state);
              }, { mon, reduceEffects: this.state.reduceEffects, battleSpeed: this.state.battleSpeed })
            );
            return;
          }
          if (item.kind === "heal") {
            const quote = healingQuote(this.state, mon, itemId);
            if (!quote || !useHealingSupply(this.state, mon, quote)) {
              this.msg.show(["Non avrebbe alcun effetto."]); return;
            }
            audio.heal(); this.refresh(); saveGame(this.state);
            this.msg.show([`${speciesOf(mon).name}: PV ${mon.hp}/${quote.max}.`], undefined, true);
          } else {
            if (!mon.status) {
              this.msg.show(["Nessuno scandalo da insabbiare, per ora."]);
              return;
            }
            mon.status = null;
            audio.heal();
            this.consume(itemId);
            saveGame(this.state);
            this.msg.show(["Tutto archiviato. Non se ne parla più."], undefined, true);
          }
        }
      })
    );
  }

  // Equipaggia un hold item: se il mostro ne tiene già uno, chiede lo swap
  // (il vecchio torna nella borsa). Parse difensivo via heldItemOf.
  private equipHold(mon: Monster, itemId: string): void {
    const item = ITEMS[itemId];
    const current = heldItemOf(mon);
    if (current?.id === itemId) {
      this.msg.show([`${speciesOf(mon).name} tiene già ${item.name}.`]);
      return;
    }
    const doEquip = () => {
      if (current) {
        this.state.bag[current.id] = (this.state.bag[current.id] ?? 0) + 1;
      }
      mon.heldItem = itemId;
      this.consume(itemId);
      audio.confirm();
      saveGame(this.state);
      this.msg.show([
        `${speciesOf(mon).name} ora tiene ${item.name}!`,
        ...(current ? [`${current.name} torna nella borsa.`] : [])
      ]);
    };
    if (current) {
      this.askMenu.index = 0;
      this.ask = {
        text: `${speciesOf(mon).name} tiene già ${current.name}. Scambiare con ${item.name}?`,
        yes: doEquip
      };
    } else {
      doEquip();
    }
  }

  // SPRAY ANTI-COMIZIO e TESSERA RIMBORSO SPESE (kind "field").
  // Vietati solo in battaglia (gestito da BattleScene.useItem): qui siamo
  // sempre fuori battaglia, quindi si usano e basta.
  private useFieldItem(itemId: string): void {
    if (itemId === "spray") {
      if (this.state.repellentSteps > 0) {
        this.msg.show(["Lo SPRAY è ancora attivo.", `Passi rimanenti: ${this.state.repellentSteps}.`]);
        return;
      }
      this.consume(itemId);
      this.state.repellentSteps = 150;
      audio.confirm();
      saveGame(this.state);
      this.msg.show([
        "PSSST! Una nube di par condicio ti avvolge.",
        "Niente candidati selvatici per 150 passi."
      ]);
      return;
    }
    if (itemId === "rimborso") {
      const city = this.state.lastBar && BAR_RESPAWN[this.state.lastBar] ? this.state.lastBar : "borgo";
      const spot = BAR_RESPAWN[city];
      this.consume(itemId);
      this.state.pos = { mapId: city, x: spot.x, y: spot.y, facing: "down" };
      audio.confirm();
      saveGame(this.state);
      // Chiude BORSA e MENU PAUSA: la WorldScene sottostante rileva il cambio
      // di mappa (riconciliazione in update) e ricarica la destinazione.
      this.stack.pop(); // BagScene
      this.stack.pop(); // PauseScene
      return;
    }
    this.msg.show(["Non succede niente. Sospetto."]);
  }

  // CAMPAGNA ELETTORALE (kind "boost"): attiva il buff a tempo. Se è già attivo,
  // RICARICA il contatore (non stacka indefinitamente: si somma ma è comunque un
  // sink). Consuma l'item e salva.
  private useBoostItem(itemId: string): void {
    const item = ITEMS[itemId];
    const boost = item.boost;
    if (!boost) {
      this.msg.show(["Non succede niente. Sospetto."]);
      return;
    }
    this.state[boost.field] += boost.battles;
    this.consume(itemId);
    audio.confirm();
    saveGame(this.state);
    this.msg.show([
      `${item.name} lanciato sul territorio!`,
      `Effetto attivo per le prossime ${this.state[boost.field]} battaglie.`
    ]);
  }

  private refresh(): void {
    this.view.sync(BAG_ORDER.filter((id) => (this.state.bag[id] ?? 0) > 0), (id) => `x${this.state.bag[id]}`);
  }

  private consume(itemId: string): void {
    this.state.bag[itemId] = Math.max(0, (this.state.bag[itemId] ?? 0) - 1);
    this.refresh();
  }

  draw(screen: Screen): void {
    this.refresh();
    if (this.ask) {
      screen.clear("#101b32");
      screen.panel(6, 24, 228, 140, "dialog");
      wrapText(this.ask.text, 35).forEach((line, i) => screen.text(line, 14, 32 + i * 10, INK));
      this.askMenu.draw(screen, 142, 120, 84, 12);
      screen.text("A:SCEGLI B:ANNULLA", 8, 169, "#fff3cc");
      return;
    }
    if (this.quick) this.drawQuick(screen);
    else this.view.draw(screen);
    if (this.msg.isOpen) this.msg.draw(screen);
  }
}
