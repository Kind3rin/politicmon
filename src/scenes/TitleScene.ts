import { AudioScene } from "./AudioScene";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import { hasAnySave, hasSaveInSlot, setActiveSlot, SLOT_COUNT, loadGame, newGameState, type GameState } from "../game/state";
import { BackupScene } from "./BackupScene";
import { mp } from "../net/mp";
import { loadNick } from "../net/profile";
import { Menu } from "../ui/widgets";
import { NicknameScene } from "./NicknameScene";
import { SlotScene } from "./SlotScene";
import type { TouchAction } from "../engine/touchActions";
import type { UiPanel } from "../ui/kit";

export class TitleScene implements Scene {
  get uiPanel(): UiPanel {
    const labels: Record<string, string> = { CONTINUA: "Continua", "NUOVA CAMPAGNA": "Nuova campagna", NOME: "Nome online", AUDIO: "Audio", "SPOSTA SAVE": "Salvataggi", NORMALE: "Normale", DIFFICILE: "Difficile", INDIETRO: "Indietro" };
    const actions = this.touchActions.map(action => ({ ...action, label: labels[action.label] ?? action.label }));
    const back = this.difficultyMenu ? actions.pop() : undefined;
    return {
      title: this.difficultyMenu ? "Scegli la sfida" : "Politicmon",
      subtitle: this.difficultyMenu ? "La difficoltà vale per tutta la partita." : "Il programma è in allegato. Manca l’allegato.",
      image: this.difficultyMenu ? undefined : "/sprites/ui/title-stage.png",
      portraits: this.difficultyMenu ? undefined : ["giorgetta", "ellyna", "renzino"].map(id => ({ src: `/sprites/monsters/${id}.png`, label: id.charAt(0).toUpperCase() + id.slice(1) })),
      actions:actions, back:back, primary: 0, selected: this.difficultyMenu?.index ?? this.menu.index
    };
  }
  private menu: Menu;
  // Selettore DIFFICOLTÀ mostrato alla NUOVA CAMPAGNA (null = non attivo).
  private difficultyMenu: Menu | null = null;
  private starting = false;

  constructor(private stack: SceneStack, private input: Input) {
    this.menu = this.buildMenu();
    audio.playMusic("title");
  }

  private buildMenu(): Menu {
    const items: Array<{ label: string; rightLabel?: string }> = [{ label: "NUOVA CAMPAGNA" }];
    // Con almeno uno slot occupato mostra CONTINUA (la scelta e la cancellazione
    // dei singoli slot avvengono nel selettore SLOT, non più qui).
    if (hasAnySave()) {
      items.unshift({ label: "CONTINUA" });
    }
    items.push({ label: "NOME", rightLabel: loadNick() || "—" });
    items.push({ label: "AUDIO", rightLabel: audio.enabled ? "SÌ" : "NO" });
    // SPOSTA SAVE: import/export del codice salvataggio. Qui (non solo in pausa)
    // perché serve proprio a chi apre il gioco in un browser DIVERSO e non trova
    // i salvataggi (localStorage è isolato per browser/webview: Instagram ≠ Chrome
    // ≠ PWA). Da qui può incollare il codice esportato dall'altro browser.
    items.push({ label: "SPOSTA SAVE" });
    return new Menu(items);
  }

  get touchActions(): readonly TouchAction[] {
    const difficulty = this.difficultyMenu;
    const action = (label: string, hint: string, run: () => void): TouchAction => ({ label, hint, disabled: this.starting, run: () => {
      if (this.starting || this.stack.top !== this || this.difficultyMenu !== difficulty) return;
      this.input.reset(); audio.confirm(); run();
    } });
    if (difficulty) return [action("NORMALE", "Consigliata alla prima campagna", () => { this.difficultyMenu = null; this.beginNewCampaign(false); }),
      action("DIFFICILE", "Avversari più forti · scelta permanente", () => { this.difficultyMenu = null; this.beginNewCampaign(true); }),
      action("INDIETRO", "Torna al titolo", () => { this.difficultyMenu = null; })];
    return this.menu.items.map(({ label }) => action(label, label === "CONTINUA" ? "Riprendi uno slot salvato" : label.startsWith("NUOVA") ? "Scegli la sfida e parti" : label === "SPOSTA SAVE" ? "Importa o esporta la campagna" : label === "NOME" ? "Facoltativo · identità online" : "Musica, effetti e volume", () => this.choose(label)));
  }

  update(_dt: number): void {
    if (this.starting) return;
    // Selettore DIFFICOLTÀ in primo piano: gestiscilo prima di tutto il resto.
    if (this.difficultyMenu) {
      const a = this.difficultyMenu.update(this.input);
      if (a === "cancel") {
        audio.cancel();
        this.difficultyMenu = null;
        return;
      }
      if (a === "select") {
        const hard = this.difficultyMenu.index === 1;
        this.difficultyMenu = null;
        this.beginNewCampaign(hard);
      }
      return;
    }
    // Online identity is optional: first play must not require a keyboard.
    const action = this.menu.update(this.input);
    if (action !== "select") {
      return;
    }
    this.choose(this.menu.items[this.menu.index].label);
  }

  private choose(label: string): void {
    if (label.startsWith("CONTINUA")) {
      audio.confirm();
      // Selettore SLOT: apre lo slot scelto (o torna indietro senza caricare).
      this.stack.push(
        new SlotScene(this.stack, this.input, "load", (state) => {
          if (state) {
            this.start(state);
          } else {
            // Tornati dal selettore senza scelta: ricostruisci il menu (uno slot
            // potrebbe essere stato cancellato lì dentro).
            this.menu = this.buildMenu();
          }
        })
      );
    } else if (label.startsWith("NUOVA")) {
      // Prima di creare la partita, scegli la DIFFICOLTÀ (immutabile dopo).
      // NORMALE è il default (indice 0) e porta la label "(CONSIGLIATA)" per
      // guidare la prima corsa; l'hardcore trova subito la MODALITÀ DIFFICILE.
      audio.confirm();
      this.difficultyMenu = new Menu([
        { label: "NORMALE (CONSIGLIATA)" },
        { label: "MODALITÀ DIFFICILE" }
      ]);
    } else if (label.startsWith("SPOSTA SAVE")) {
      audio.confirm();
      // Se c'è un save nello slot attivo lo passiamo (così l'export ha senso);
      // altrimenti uno stato nuovo: l'IMPORT (il caso d'uso qui) non usa lo stato.
      const existing = hasAnySave() ? loadGame() : null;
      this.stack.push(new BackupScene(this.stack, this.input, existing ?? newGameState()));
    } else if (label.startsWith("NOME")) {
      this.openNickname();
    } else if (label.startsWith("AUDIO")) {
      const index = this.menu.index;
      this.stack.push(new AudioScene(this.stack, this.input, () => {
        this.menu = this.buildMenu(); this.menu.index = Math.min(index, this.menu.items.length - 1);
      }));
    }
  }

  // Empty slots need no selection. Full archives keep explicit overwrite choice.
  private beginNewCampaign(hard: boolean): void {
    const makeState = (): GameState => {
      const state = newGameState();
      state.hardMode = hard; // IMMUTABILE da qui in poi
      return state;
    };
    const launch = (): void => {
      mp.setIdentity(loadNick() || "OSPITE", "player");
      void this.start(makeState());
    };
    const empty = Array.from({ length: SLOT_COUNT }, (_, slot) => slot).find((slot) => !hasSaveInSlot(slot));
    if (empty !== undefined) {
      setActiveSlot(empty);
      launch();
      return;
    }
    this.stack.push(
      new SlotScene(this.stack, this.input, "new", (picked) => {
        // picked === null ⇒ slot scelto e fissato: procedi. (SlotScene chiude da sé
        // in caso di INDIETRO senza invocare il callback.)
        void picked;
        launch();
      })
    );
  }

  private openNickname(firstTime = false): void {
    this.stack.push(
      new NicknameScene(this.stack, this.input, (nick) => {
        mp.setIdentity(nick, "player");
        const index = this.menu.index;
        this.menu = this.buildMenu();
        this.menu.index = Math.min(index, this.menu.items.length - 1);
      }, firstTime)
    );
  }

  private async start(state: GameState): Promise<void> {
    if (this.starting) return;
    this.starting = true;
    try {
      // Il mondo trascina battaglie, mappe, post-game e scene opzionali. Lo
      // carichiamo soltanto quando il giocatore avvia davvero una campagna:
      // titolo e gestione save restano un bootstrap piccolo e immediato.
      const { WorldScene } = await import("../game/world/WorldScene");
      this.stack.replace(new WorldScene(this.stack, this.input, state));
    } catch (error) {
      this.starting = false;
      console.error("Impossibile caricare la campagna", error);
    }
  }

  draw(screen: Screen): void { screen.clear("#101c30"); }
}
