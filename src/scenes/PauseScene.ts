import { BADGE_ART } from "../art/monsters";
import { sceneImage } from "../engine/assets";
import { MAPS } from "../data/maps";
import { BADGES } from "../data/trainers";
import { audio } from "../engine/audio";
import { isGuideOn, loadControlMode, toggleControlMode, toggleGuide } from "../engine/controls";
import { haptics } from "../engine/haptics";
import { ownedVehicles, VEHICLES, type VehicleId } from "../game/vehicles";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import { sondaggiColor, sondaggiLabel, MINISTERO_ORDER, ministroDi, MINISTERI } from "../game/governo";
import { speciesOf } from "../game/monster";
import { versionLabel } from "../game/version";
import { mp } from "../net/mp";
import { Menu, MessageBox, GREY, INK } from "../ui/widgets";
import { BackupScene } from "./BackupScene";
import { BagScene } from "./BagScene";
import { ChatScene } from "./ChatScene";
import { DuelLobbyScene } from "./DuelLobbyScene";
import { DexScene } from "./DexScene";
import { GovScene } from "./GovScene";
import { PartyScene } from "./PartyScene";
import { QuestScene } from "./QuestScene";
import { AchievementsScene } from "./AchievementsScene";
import { TypesScene } from "./TypesScene";
import { WorldMapScene } from "./WorldMapScene";

export class PauseScene implements Scene {
  readonly transparent = true;
  private menu: Menu;
  private entries: string[] = [];
  private msg = new MessageBox();
  private showCard = false;
  // Sotto-menu OPZIONI (toggle raccolti, fuori dalla lista principale).
  private optionsMenu: Menu | null = null;
  private optEntries: string[] = [];

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.menu = this.buildMenu();
  }

  // Menu principale: SOLO le azioni di gioco + VEICOLO + OPZIONI + CHIUDI.
  // I toggle (audio/vibra/guida/salva/tasti) sono raccolti in OPZIONI così la
  // lista non è più un muro di 13 voci miste.
  private buildMenu(): Menu {
    this.entries = [];
    if (this.state.flags["dex-received"]) {
      this.entries.push("POLITICDEX");
    }
    this.entries.push("SQUADRA", "BORSA");
    if (this.state.badges.length > 0) {
      this.entries.push("GOVERNO");
    }
    this.entries.push("MISSIONI", "MAPPA", "TRAGUARDI", "GUIDA TIPI", "TESSERA", "CHAT ONLINE");
    // DUELLO PvP: ha senso solo con qualcuno online sulla stessa mappa.
    if (mp.isEnabled() && mp.connected && mp.onlineCount > 0) {
      this.entries.push("DUELLO PVP");
    }
    // Veicoli: voce che cicla tra quelli posseduti (e "a piedi").
    if (ownedVehicles(this.state).length > 0) {
      const v = this.state.vehicle ? VEHICLES[this.state.vehicle as VehicleId].name : "A PIEDI";
      this.entries.push(`VEICOLO: ${v}`);
    }
    this.entries.push("OPZIONI", "CHIUDI");
    return new Menu(this.entries.map((label) => ({ label })));
  }

  // Sotto-menu OPZIONI: tutti i toggle/impostazioni in un posto solo.
  private buildOptionsMenu(): Menu {
    this.optEntries = [
      "SALVA",
      `GUIDA: ${isGuideOn() ? "SÌ" : "NO"}`,
      `AUDIO: ${audio.enabled ? "SÌ" : "NO"}`
    ];
    if (haptics.isSupported) {
      this.optEntries.push(`VIBRA: ${haptics.enabled ? "SÌ" : "NO"}`);
    }
    if (document.body.classList.contains("touch")) {
      this.optEntries.push(`TASTI: ${loadControlMode() === "stick" ? "LEVETTA" : "CROCE"}`);
    }
    this.optEntries.push("BACKUP", "INDIETRO");
    return new Menu(this.optEntries.map((label) => ({ label })));
  }

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    if (this.showCard) {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) {
        audio.cancel();
        this.showCard = false;
      }
      return;
    }
    // Sotto-menu OPZIONI attivo: gestisci i toggle, B/INDIETRO torna al menu.
    if (this.optionsMenu) {
      const a = this.optionsMenu.update(this.input);
      if (a === "cancel") {
        audio.cancel();
        this.optionsMenu = null;
        return;
      }
      if (a === "select") {
        this.handleOption(this.optEntries[this.optionsMenu.index]);
      }
      return;
    }
    if (this.input.wasPressed("start")) {
      this.stack.pop();
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
    const label = this.entries[this.menu.index];
    switch (label) {
      case "POLITICDEX":
        this.stack.push(new DexScene(this.stack, this.input, this.state));
        break;
      case "SQUADRA":
        this.stack.push(new PartyScene(this.stack, this.input, this.state, { mode: "view" }));
        break;
      case "BORSA":
        this.stack.push(new BagScene(this.stack, this.input, this.state, { inBattle: false }));
        break;
      case "GOVERNO":
        this.stack.push(new GovScene(this.stack, this.input, this.state));
        break;
      case "MISSIONI":
        this.stack.push(new QuestScene(this.stack, this.input, this.state));
        break;
      case "MAPPA":
        this.stack.push(new WorldMapScene(this.stack, this.input, this.state));
        break;
      case "TRAGUARDI":
        this.stack.push(new AchievementsScene(this.stack, this.input, this.state));
        break;
      case "GUIDA TIPI":
        this.stack.push(new TypesScene(this.stack, this.input));
        break;
      case "TESSERA":
        this.showCard = true;
        break;
      case "CHAT ONLINE":
        this.stack.push(new ChatScene(this.stack, this.input));
        break;
      case "DUELLO PVP":
        this.stack.push(new DuelLobbyScene(this.stack, this.input, this.state));
        break;
      case "OPZIONI":
        audio.confirm();
        this.optionsMenu = this.buildOptionsMenu();
        break;
      case "CHIUDI":
        this.stack.pop();
        break;
      default: {
        // L'unica voce "ciclabile" rimasta nel menu principale è il VEICOLO.
        if (label.startsWith("VEICOLO")) {
          const index = this.menu.index;
          this.cycleVehicle();
          audio.confirm();
          this.menu = this.buildMenu();
          this.menu.index = index;
        }
        break;
      }
    }
  }

  // Gestisce una voce del sotto-menu OPZIONI (toggle + salva).
  private handleOption(label: string): void {
    if (label === "INDIETRO") {
      audio.cancel();
      this.optionsMenu = null;
      return;
    }
    if (label === "BACKUP") {
      audio.confirm();
      this.optionsMenu = null;
      this.stack.push(new BackupScene(this.stack, this.input, this.state));
      return;
    }
    if (label === "SALVA") {
      this.msg.show(
        saveGame(this.state)
          ? ["Partita salvata!", "A differenza delle riforme, questa resta."]
          : ["Errore di salvataggio..."]
      );
      this.optionsMenu = null;
      return;
    }
    const index = this.optionsMenu?.index ?? 0;
    if (label.startsWith("GUIDA")) {
      toggleGuide();
    } else if (label.startsWith("TASTI")) {
      toggleControlMode();
    } else if (label.startsWith("VIBRA")) {
      haptics.toggle();
    } else if (label.startsWith("AUDIO")) {
      const enabled = audio.toggle();
      if (enabled) {
        audio.playMusic(MAPS[this.state.pos.mapId]?.music ?? "borgo");
      }
    }
    audio.confirm();
    this.optionsMenu = this.buildOptionsMenu();
    this.optionsMenu.index = index;
  }

  // Cicla: a piedi -> primo veicolo -> ... -> a piedi. Il TRAGHETTO è escluso:
  // si attiva/disattiva da solo quando entri/esci dall'acqua (gestito in
  // WorldScene.syncFerryVehicle), non è un mezzo terrestre selezionabile a mano.
  private cycleVehicle(): void {
    const owned = ownedVehicles(this.state).filter((v) => v !== "traghetto");
    const order: (VehicleId | null)[] = [null, ...owned];
    const cur = order.indexOf((this.state.vehicle as VehicleId | null) ?? null);
    this.state.vehicle = order[(cur + 1) % order.length];
    saveGame(this.state);
  }

  draw(screen: Screen): void {
    if (this.showCard) {
      this.drawCard(screen);
      return;
    }
    // Sotto-menu OPZIONI: lista compatta dei toggle con intestazione.
    if (this.optionsMenu) {
      const ow = Math.max(120, Math.min(this.optionsMenu.measureWidth(), VIEW_W - 8));
      const ox = VIEW_W - ow - 4;
      screen.rect(ox, 4, ow, 10, "rgba(16,20,31,0.92)");
      screen.text("OPZIONI", ox + 4, 5, "#e8c84a");
      this.optionsMenu.draw(screen, ox, 16, ow);
      this.msg.draw(screen);
      return;
    }
    // Menu principale: solo azioni. Larghezza adattata al contenuto.
    const w = Math.max(110, Math.min(this.menu.measureWidth(), VIEW_W - 8));
    this.menu.draw(screen, VIEW_W - w - 4, 4, w);
    this.msg.draw(screen);
  }

  private drawCard(screen: Screen): void {
    screen.dim(0.5);
    screen.panel(14, 10, VIEW_W - 28, VIEW_H - 20);
    const title = this.state.flags["garante-beaten"]
      ? "CAMPIONE COSTITUZIONALE"
      : this.state.flags["boss-beaten"]
        ? "CAMPIONE DI PALAZZOPOLI"
        : "GIOVANE PROMESSA";
    screen.text("TESSERA DEL CANDIDATO", 24, 18, INK);
    screen.rect(22, 28, VIEW_W - 44, 1, GREY);
    screen.text(title, 24, 34, INK);
    screen.text(`FONDI: ${this.state.money}€`, 24, 47, INK);
    const sond = this.state.sondaggi;
    screen.text("SONDAGGI:", 24, 59, INK);
    screen.frame(86, 59, 84, 7, INK);
    screen.rect(87, 60, Math.round(82 * (sond / 100)), 5, sondaggiColor(sond));
    screen.textRight(`${sond}%`, VIEW_W - 26, 59, sondaggiColor(sond));
    screen.text(sondaggiLabel(sond), 86, 69, GREY);
    const caught = Object.values(this.state.dex).filter((v) => v === "caught").length;
    const seen = Object.keys(this.state.dex).length;
    screen.text(`DEX: ${seen} visti, ${caught} eletti`, 24, 81, INK);
    screen.text("MEDAGLIE:", 24, 94, INK);
    const badgeIds = ["auditel", "spread", "dazio"];
    for (let i = 0; i < badgeIds.length; i += 1) {
      const x = 88 + i * 30;
      if (this.state.badges.includes(badgeIds[i])) {
        const badgeImg = sceneImage("ui:badge", "ui/badge.png");
        if (badgeImg) {
          const bs = 14 / Math.max(badgeImg.width, badgeImg.height);
          screen.imageSprite(badgeImg, x - 1, 89, { scaleX: bs, scaleY: bs });
        } else {
          screen.sprite("badge", BADGE_ART, x, 90);
        }
      } else {
        screen.frame(x, 90, 12, 12, GREY);
      }
    }
    const owned = this.state.badges.map((b) => BADGES[b]?.name).filter(Boolean);
    screen.text(
      owned.length > 0 ? `${owned.length}/3 conquistate` : "Nessuna medaglia. Per ora.",
      24, 108, GREY
    );
    const ministri = MINISTERO_ORDER
      .map((id) => ({ id, mon: ministroDi(this.state, id) }))
      .filter((entry) => entry.mon !== null);
    screen.text(
      ministri.length > 0
        ? `GOVERNO: ${ministri.length}/6 ministeri assegnati`
        : "GOVERNO: nessun incarico. Tutto su di te.",
      24, 121, GREY
    );
    if (ministri.length > 0) {
      const first = ministri[0];
      screen.text(
        `${MINISTERI[first.id].name}: ${speciesOf(first.mon!).name}`.slice(0, 33),
        24, 131, GREY
      );
    }
    // Record duelli PvP (titolo PORTAVOCE a 10+ vittorie) + versione del gioco.
    const duelTag = this.state.duelWins >= 10 ? "  ★PORTAVOCE" : "";
    screen.text(`DUELLI PVP: ${this.state.duelWins}V/${this.state.duelLosses}P${duelTag}`.slice(0, 33), 24, 141, INK);
    // Titolo COPPA DELLE POLTRONE + tag MODALITÀ DIFFICILE (immutabile).
    const coppaTag = this.state.coppaWins > 0 ? `★PORTAVOCE DEL POPOLO (${this.state.coppaWins})` : "";
    const hardTag = this.state.hardMode ? "☠ HARD" : "";
    const extraLine = [coppaTag, hardTag].filter(Boolean).join("   ");
    if (extraLine) {
      screen.text(extraLine.slice(0, 33), 24, 150, "#e8c84a");
      screen.text(versionLabel(this.state), 24, 159, GREY);
    } else {
      screen.text(versionLabel(this.state), 24, 150, GREY);
    }
    screen.text("A/B: chiudi", 24, VIEW_H - 22, GREY);
  }
}
