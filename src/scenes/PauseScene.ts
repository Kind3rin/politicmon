import { sceneImage } from "../engine/assets";
import { MAPS } from "../data/maps";
import { audio } from "../engine/audio";
import { isGuideOn, loadControlMode, toggleControlMode, toggleGuide } from "../engine/controls";
import { haptics } from "../engine/haptics";
import { ownedVehicles, VEHICLES, type VehicleId } from "../game/vehicles";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import { sondaggiColor } from "../game/governo";
import { mp } from "../net/mp";
import { loadNick } from "../net/profile";
import { canPromptInstall, installHint, isAppInstalled, promptInstall } from "../engine/pwa";
import { drawScreenHeader, Menu, MessageBox, setReduceMotion } from "../ui/widgets";
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
import { CoalitionScene } from "./CoalitionScene";
import { SourcesScene } from "./SourcesScene";
import { ContentScene } from "./ContentScene";

// Sotto-menu del menu pausa (OPZIONI / ONLINE / EXTRA).
type SubKind = "opzioni" | "online" | "extra";
interface SubMenu {
  kind: SubKind;
  title: string;
  menu: Menu;
  entries: string[];
}

export class PauseScene implements Scene {
  readonly transparent = true;
  private menu: Menu;
  private entries: string[] = [];
  private msg = new MessageBox();
  private showCard = false;
  // Sotto-menu attivo (OPZIONI/ONLINE/EXTRA): un solo livello di profondità.
  private sub: SubMenu | null = null;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.menu = this.buildMenu();
  }

  // Menu principale: le azioni di gioco quotidiane in cima, poi i gruppi
  // ONLINE (chat/duelli) ed EXTRA (tessera/traguardi/guida tipi), VEICOLO,
  // OPZIONI, CHIUDI. Prima era un muro di 13-15 voci piatte.
  private buildMenu(): Menu {
    this.entries = [];
    const items: Array<{ label: string; rightLabel?: string }> = [];
    const push = (label: string, rightLabel?: string) => {
      this.entries.push(label);
      items.push({ label, rightLabel });
    };
    // SALVA in cima: il salvataggio manuale dev'essere la voce più scopribile.
    push("SALVA");
    // È un elemento identitario, non un extra da nascondere dietro un sotto-menu.
    push("TESSERA");
    push("SQUADRA");
    push("BORSA");
    if (this.state.flags["dex-received"]) {
      push("POLITICDEX");
    }
    if (this.state.badges.length > 0) {
      push("GOVERNO");
    }
    if (this.state.flags["coalition-menu-unlocked"]) {
      push("COALIZIONE", `${this.state.coalition.members.length}/2`);
    }
    push("MISSIONI");
    push("MAPPA");
    // Badge "N ONLINE" sulla voce: rende visibile che c'è gente senza aprirla.
    push("ONLINE", mp.isEnabled() && mp.connected ? `${mp.onlineCount + 1} ON` : undefined);
    push("EXTRA");
    // Veicoli: voce che cicla tra quelli posseduti (e "a piedi").
    if (ownedVehicles(this.state).length > 0) {
      const v = this.state.vehicle ? VEHICLES[this.state.vehicle as VehicleId].name : "A PIEDI";
      push(`VEICOLO: ${v}`);
    }
    push("OPZIONI");
    push("CHIUDI");
    return new Menu(items);
  }

  // Sotto-menu OPZIONI: tutti i toggle/impostazioni in un posto solo.
  private buildOptionsMenu(): SubMenu {
    const entries = [
      `GUIDA: ${isGuideOn() ? "SÌ" : "NO"}`,
      `AUDIO: ${audio.enabled ? "SÌ" : "NO"}`,
      `RIDUCI EFFETTI: ${this.state.reduceEffects ? "SÌ" : "NO"}`
    ];
    if (haptics.isSupported) {
      entries.push(`VIBRA: ${haptics.enabled ? "SÌ" : "NO"}`);
    }
    if (document.body.classList.contains("touch")) {
      entries.push(`TASTI: ${loadControlMode() === "stick" ? "LEVETTA" : "CROCE"}`);
    }
    if (!isAppInstalled()) {
      entries.push("INSTALLA APP");
    }
    entries.push("BACKUP", "INDIETRO");
    return { kind: "opzioni", title: "OPZIONI", entries, menu: new Menu(entries.map((label) => ({ label }))) };
  }

  // Sotto-menu ONLINE: chat di zona e duelli PvP.
  private buildOnlineMenu(): SubMenu {
    const someone = mp.isEnabled() && mp.connected && mp.onlineCount > 0;
    const entries = ["CHAT DI ZONA", "DUELLO PVP", "INDIETRO"];
    const menu = new Menu([
      { label: "CHAT DI ZONA" },
      // Senza nessuno online il duello non può partire: voce grigia, non nascosta
      // (così si sa che ESISTE — prima spariva del tutto e sembrava mancare).
      { label: "DUELLO PVP", disabled: !someone, rightLabel: someone ? undefined : "OFFLINE" },
      { label: "INDIETRO" }
    ]);
    return { kind: "online", title: "ONLINE", entries, menu };
  }

  // Sotto-menu EXTRA: consultazione non essenziale. La TESSERA è nel menu
  // principale perché il giocatore la deve ritrovare subito.
  private buildExtraMenu(): SubMenu {
    const entries = ["CONTENUTI", "TRAGUARDI", "GUIDA TIPI", "FONTI SATIRA", "INDIETRO"];
    return { kind: "extra", title: "EXTRA", entries, menu: new Menu(entries.map((label) => ({ label }))) };
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
    // Sotto-menu attivo (OPZIONI/ONLINE/EXTRA): B/INDIETRO torna al menu.
    if (this.sub) {
      const a = this.sub.menu.update(this.input);
      if (a === "cancel") {
        audio.cancel();
        this.sub = null;
        return;
      }
      if (a === "select") {
        this.handleSub(this.sub, this.sub.entries[this.sub.menu.index]);
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
      case "SALVA":
        audio.confirm();
        this.msg.show(
          saveGame(this.state)
            ? ["Partita salvata!", "A differenza delle riforme, questa resta."]
            : ["Errore di salvataggio..."]
        );
        break;
      case "TESSERA":
        audio.confirm();
        this.showCard = true;
        break;
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
      case "COALIZIONE": {
        const focus = this.state.coalition.members[0]?.allyId ?? "campo_secretary";
        this.stack.push(new CoalitionScene(this.stack, this.input, this.state, focus));
        break;
      }
      case "MISSIONI":
        this.stack.push(new QuestScene(this.stack, this.input, this.state));
        break;
      case "MAPPA":
        this.stack.push(new WorldMapScene(this.stack, this.input, this.state));
        break;
      case "ONLINE":
        audio.confirm();
        this.sub = this.buildOnlineMenu();
        break;
      case "EXTRA":
        audio.confirm();
        this.sub = this.buildExtraMenu();
        break;
      case "OPZIONI":
        audio.confirm();
        this.sub = this.buildOptionsMenu();
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

  // Smista una voce dei sotto-menu ONLINE/EXTRA/OPZIONI.
  private handleSub(sub: SubMenu, label: string): void {
    if (label === "INDIETRO") {
      audio.cancel();
      this.sub = null;
      return;
    }
    if (sub.kind === "online") {
      audio.confirm();
      if (label === "CHAT DI ZONA") {
        this.stack.push(new ChatScene(this.stack, this.input));
      } else if (label === "DUELLO PVP") {
        this.stack.push(new DuelLobbyScene(this.stack, this.input, this.state));
      }
      return;
    }
    if (sub.kind === "extra") {
      audio.confirm();
      if (label === "CONTENUTI") {
        this.stack.push(new ContentScene(this.stack, this.input, this.state));
      } else if (label === "TRAGUARDI") {
        this.stack.push(new AchievementsScene(this.stack, this.input, this.state));
      } else if (label === "GUIDA TIPI") {
        this.stack.push(new TypesScene(this.stack, this.input));
      } else if (label === "FONTI SATIRA") {
        this.stack.push(new SourcesScene(this.stack, this.input));
      }
      return;
    }
    this.handleOption(label);
  }

  // Gestisce una voce del sotto-menu OPZIONI (toggle + salva).
  private handleOption(label: string): void {
    if (label === "BACKUP") {
      audio.confirm();
      this.sub = null;
      this.stack.push(new BackupScene(this.stack, this.input, this.state));
      return;
    }
    if (label === "INSTALLA APP") {
      audio.confirm();
      if (canPromptInstall()) {
        void promptInstall();
      } else {
        this.msg.show([installHint()]);
      }
      return;
    }
    const index = this.sub?.menu.index ?? 0;
    if (label.startsWith("GUIDA")) {
      toggleGuide();
    } else if (label.startsWith("TASTI")) {
      toggleControlMode();
    } else if (label.startsWith("VIBRA")) {
      haptics.toggle();
    } else if (label.startsWith("RIDUCI EFFETTI")) {
      // Accessibilità: azzera/ripristina shake+flash+dialog-shake. Segna la
      // scelta come esplicita (reduceEffectsSet) così non viene più sovrascritta
      // dal default di sistema, aggiorna il flag globale del dialogo e salva.
      this.state.reduceEffects = !this.state.reduceEffects;
      this.state.reduceEffectsSet = true;
      setReduceMotion(this.state.reduceEffects);
      saveGame(this.state);
    } else if (label.startsWith("AUDIO")) {
      const enabled = audio.toggle();
      if (enabled) {
        audio.playMusic(MAPS[this.state.pos.mapId]?.music ?? "borgo");
      }
    }
    audio.confirm();
    this.sub = this.buildOptionsMenu();
    this.sub.menu.index = index;
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
    // Sotto-menu attivo: lista compatta con intestazione.
    if (this.sub) {
      const ow = Math.max(120, Math.min(this.sub.menu.measureWidth(), VIEW_W - 8));
      const ox = VIEW_W - ow - 4;
      screen.rect(ox + 4, 4, ow - 8, 11, "#17243d");
      screen.rect(ox + 6, 14, ow - 12, 2, "#e6b944");
      screen.text(this.sub.title, ox + 8, 6, "#fffaf0");
      this.sub.menu.draw(screen, ox, 16, ow);
      this.msg.draw(screen);
      return;
    }
    // Menu principale: solo azioni. Larghezza adattata al contenuto.
    const w = Math.max(110, Math.min(this.menu.measureWidth(), VIEW_W - 8));
    this.menu.draw(screen, VIEW_W - w - 4, 4, w);
    this.msg.draw(screen);
  }

  private drawCard(screen: Screen): void {
    screen.rect(0, 0, VIEW_W, VIEW_H, "#101827");
    drawScreenHeader(screen, "TESSERA CANDIDATO", "A/B CHIUDI");
    const title = this.state.flags["garante-beaten"]
      ? "CAMPIONE COSTITUZIONALE"
      : this.state.flags["boss-beaten"]
        ? "CAMPIONE DI PALAZZOPOLI"
        : "GIOVANE PROMESSA";

    // Documento unico, non un mockup affiancato a un pannello statistiche.
    screen.rect(9, 23, 222, 146, "#f8f1dc");
    screen.frame(9, 23, 222, 146, "#d6aa3d");
    screen.frame(12, 26, 216, 140, "#203552");
    screen.rect(13, 27, 214, 18, "#203552");
    screen.text("REPUBBLICA DELL'ITALIETTA", 20, 32, "#fff5ce");
    screen.rect(20, 47, 200, 2, "#d6aa3d");

    // Foto tessera integrata nel documento.
    screen.rect(20, 55, 55, 67, "#e8ddc2");
    screen.frame(20, 55, 55, 67, "#203552");
    screen.rect(23, 58, 49, 61, "#cdd9d2");
    const avatar = sceneImage("ui:candidate-avatar", "chars/player_south.png");
    if (avatar) {
      const avatarBounds = screen.imageBounds(avatar);
      screen.imageRegion(avatar, avatarBounds.x, avatarBounds.y, avatarBounds.w,
        avatarBounds.h, 27, 65, 41, 49);
    }

    screen.text("CANDIDATO", 84, 55, "#68758a");
    screen.textFit(loadNick() || "ONOREVOLE", 84, 66, 132, "#17243d");
    screen.text("QUALIFICA", 84, 80, "#68758a");
    screen.textFit(title, 84, 91, 132, "#17243d");
    screen.text("N. TESSERA", 84, 105, "#68758a");
    const code = `IT-${String(this.state.stepsTotal).padStart(5, "0")}-${this.state.badges.length}`;
    screen.text(code, 84, 116, "#17243d");

    const sond = this.state.sondaggi;
    const caught = Object.values(this.state.dex).filter((v) => v === "caught").length;
    screen.rect(20, 128, 200, 1, "#c7b991");
    screen.text("CONSENSO", 20, 136, "#68758a");
    screen.frame(69, 136, 58, 8, "#203552");
    screen.rect(70, 137, Math.round(56 * sond / 100), 6, sondaggiColor(sond));
    screen.textRight(`${sond}%`, 151, 137, sondaggiColor(sond));
    screen.text("ELETTI", 161, 136, "#68758a");
    screen.textRight(String(caught), 218, 137, "#17243d");
    screen.text("FONDI", 20, 151, "#68758a");
    screen.text(`${this.state.money}€`, 56, 151, "#17243d");
    screen.text("MEDAGLIE", 116, 151, "#68758a");
    screen.textRight(`${this.state.badges.length}/3`, 218, 151, "#17243d");
  }
}
