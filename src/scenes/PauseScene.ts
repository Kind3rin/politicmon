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
import { canPromptInstall, installHint, isAppInstalled, promptInstall } from "../engine/pwa";
import { Menu, MessageBox, GREY, INK, setReduceMotion } from "../ui/widgets";
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

  // Sotto-menu EXTRA: consultazione (tessera, traguardi, guida tipi).
  private buildExtraMenu(): SubMenu {
    const entries = ["TESSERA", "TRAGUARDI", "GUIDA TIPI", "FONTI SATIRA", "INDIETRO"];
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
      if (label === "TESSERA") {
        this.showCard = true;
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
    screen.dim(0.5);
    screen.panel(14, 10, VIEW_W - 28, VIEW_H - 20, "card");
    const title = this.state.flags["garante-beaten"]
      ? "CAMPIONE COSTITUZIONALE"
      : this.state.flags["boss-beaten"]
        ? "CAMPIONE DI PALAZZOPOLI"
        : "GIOVANE PROMESSA";
    screen.text("TESSERA DEL CANDIDATO", 24, 18, INK);
    // Hint di chiusura in alto a destra: libera la coda della card (dove la
    // versione + i tag COPPA/HARD si accavallavano col vecchio footer a fondo).
    screen.textRight("A/B: CHIUDI", VIEW_W - 24, 18, GREY);
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
    // Cursore Y progressivo per la coda della card: extraLine (COPPA/HARD) è
    // condizionale, quindi la versione e il footer NON possono stare a y fisse
    // (prima la versione a y159 finiva sopra "A/B: chiudi" a y158 quando
    // extraLine era presente — comune con coppaWins>0 o hardMode).
    const duelTag = this.state.duelWins >= 10 ? "  ★PORTAVOCE" : "";
    screen.text(`DUELLI PVP: ${this.state.duelWins}V/${this.state.duelLosses}P${duelTag}`.slice(0, 33), 24, 141, INK);
    let cy = 151;
    // Titolo COPPA DELLE POLTRONE + tag MODALITÀ DIFFICILE (immutabile).
    const coppaTag = this.state.coppaWins > 0 ? `★PORTAVOCE DEL POPOLO (${this.state.coppaWins})` : "";
    const hardTag = this.state.hardMode ? "* HARD" : "";
    const extraLine = [coppaTag, hardTag].filter(Boolean).join("   ");
    if (extraLine) {
      screen.text(extraLine.slice(0, 33), 24, cy, "#e8c84a");
      cy += 9;
    }
    // Versione: ultima riga della card (il footer di chiusura ora è in alto a
    // destra, così la coda non trabocca oltre il pannello).
    screen.text(versionLabel(this.state), 24, cy, GREY);
  }
}
