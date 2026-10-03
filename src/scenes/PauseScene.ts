import { earnedEndingSouvenirs, ENDING_SOUVENIRS } from "../game/atto3Ending";
import { MONUMENT_TITLE } from "./MonumentScene";
import { FieldGuideScene } from "./FieldGuideScene";
import { welcomeGuide } from "../game/onboarding";
import { currentQuest } from "../data/quests";
import type { TouchAction } from "../engine/touchActions";
import { statsOf } from "../game/monster";
import { epiloguePages } from "../ui/epilogueArt";
import { wrapText } from "../ui/widgets";
import { sceneImage } from "../engine/assets";
import { AudioScene } from "./AudioScene";
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
import { MoraleScene } from "./MoraleScene";

// Sotto-menu del menu pausa (OPZIONI / ONLINE / EXTRA).
type SubKind = "opzioni" | "online" | "extra";
interface SubMenu {
  kind: SubKind;
  title: string;
  menu: Menu;
  entries: string[];
}

export class PauseScene implements Scene {
  readonly transparent = false;
  private menu: Menu;
  private more = false;
  private primaryIndex = 0;
  private readonly primary = ["SQUADRA", "CURA", "POLITICDEX", "MORALE", "ALTRO", "GIOCA"];
  private entries: string[] = [];
  private msg = new MessageBox();
  private showCard = false;
  private souvenirIndex = 0;
  private cardAwards = false;
  private notePage = 0;
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
    push("BORSA"); push("SALVA"); push("MAPPA"); push("OPZIONI"); push("TESSERA");
    if (this.state.badges.length > 0) {
      push("GOVERNO");
    }
    if (this.state.flags["coalition-menu-unlocked"]) {
      push("COALIZIONE", `${this.state.coalition.members.length}/2`);
    }
    push("MISSIONI");
    // Badge "N ONLINE" sulla voce: rende visibile che c'è gente senza aprirla.
    push("ONLINE", mp.isEnabled() && mp.connected ? `${mp.onlineCount + 1} ON` : undefined);
    push("EXTRA");
    // Veicoli: voce che cicla tra quelli posseduti (e "a piedi").
    if (ownedVehicles(this.state).length > 0) {
      const v = this.state.vehicle ? VEHICLES[this.state.vehicle as VehicleId].name : "A PIEDI";
      push(`VEICOLO: ${v}`);
    }
    push("CHIUDI");
    return new Menu(items);
  }

  // Sotto-menu OPZIONI: tutti i toggle/impostazioni in un posto solo.
  private buildOptionsMenu(): SubMenu {
    const entries = [
      `GUIDA: ${isGuideOn() ? "SÌ" : "NO"}`,
      `AUDIO: ${audio.enabled ? "SÌ" : "NO"}`,
      `RITMO LOTTE: ${this.state.battleSpeed === 2 ? "RAPIDO" : "NORMALE"}`,
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
    const entries = ["GUIDA CAMPAGNA", "CONTENUTI", "TRAGUARDI", "GUIDA TIPI", "FONTI SATIRA", "INDIETRO"];
    return { kind: "extra", title: "EXTRA", entries, menu: new Menu(entries.map((label) => ({ label }))) };
  }

  get touchActions(): readonly TouchAction[] | undefined {
    if (this.showCard) return undefined;
    const more = this.more, sub = this.sub, menu = sub?.menu ?? this.menu;
    const page = Math.floor(menu.index / 4);
    const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled: disabled || this.msg.isOpen, run: () => {
      if (disabled || this.stack.top !== this || this.showCard || this.msg.isOpen || this.more !== more || this.sub !== sub || Math.floor(menu.index / 4) !== page) return;
      this.input.reset(); audio.cursor(); run();
    } });
    if (!more && !sub) return this.primary.map((label, i) => action(label, this.primaryHint(i), () => { this.primaryIndex = i; this.handleMain(label); }, label === "POLITICDEX" && !this.state.flags["dex-received"]));
    return [...Array.from({ length: 4 }, (_, i) => {
      const index = page * 4 + i, item = menu.items[index];
      return action(item?.label ?? "—", item?.rightLabel ?? "Apri direttamente", () => {
        if (!item) return; menu.index = index;
        if (sub) this.handleSub(sub, item.label); else this.handleMain(item.label);
      }, !item || !!item.disabled);
    }), action("ALTRE", "Altre voci", () => { menu.index = ((page + 1) * 4) % menu.items.length; this.notePage = 0; }, menu.items.length <= 4),
      action("INDIETRO", "Torna alla pausa", () => { if (this.sub) this.sub = null; else this.more = false; })];
  }
  private primaryHint(index: number): string {
    const hints = [`${this.state.party.length} candidati · ${this.state.party.filter((mon) => mon.hp < statsOf(mon).hp).length} da curare`,
      "Scegli il candidato e recupera PV", "Collezione, habitat e crescita", `Fiducia ${this.state.morale.trust} · coesione ${this.state.morale.cohesion}`,
      "Borsa, salva, mappa e opzioni", "Riprendi la campagna"];
    return hints[index];
  }

  update(dt: number): void {
    const moraleIndex=this.entries.indexOf("MORALE"),coalitionIndex=this.entries.indexOf("COALIZIONE"),onlineIndex=this.entries.indexOf("ONLINE");
    if(moraleIndex>=0)this.menu.items[moraleIndex].rightLabel=`${this.state.morale.trust}/${this.state.morale.cohesion}`;
    if(coalitionIndex>=0)this.menu.items[coalitionIndex].rightLabel=`${this.state.coalition.members.length}/2`;
    if(onlineIndex>=0)this.menu.items[onlineIndex].rightLabel=mp.isEnabled()&&mp.connected?`${mp.onlineCount+1} ON`:undefined;
    if(this.sub?.kind==="online"){
      const someone=mp.isEnabled()&&mp.connected&&mp.onlineCount>0;
      this.sub.menu.items[1].disabled=!someone;this.sub.menu.items[1].rightLabel=someone?undefined:"OFFLINE";
    }
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    if (this.showCard) {
      if (this.input.wasPressed("start")) this.cardAwards = !this.cardAwards;
      const count = earnedEndingSouvenirs(this.state).length;
      if (count && (this.input.wasPressed("left") || this.input.wasPressed("right"))) this.souvenirIndex = (this.souvenirIndex + (this.input.wasPressed("left") ? count - 1 : 1)) % count;
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) {
        audio.cancel();
        this.showCard = false;
      }
      return;
    }
    if (!this.more && !this.sub) {
      if (this.input.wasPressed("b") || this.input.wasPressed("start")) { this.stack.pop(); return; }
      if (this.input.wasPressed("up") || this.input.wasPressed("down")) {
        this.primaryIndex = (this.primaryIndex + (this.input.wasPressed("up") ? 5 : 1)) % 6; audio.cursor();
      }
      const tap = this.input.consumeTap();
      if (tap && tap.x >= 8 && tap.x < 232 && tap.y >= 76 && tap.y < 160) {
        this.primaryIndex = Math.floor((tap.y - 76) / 28) * 2 + (tap.x >= 120 ? 1 : 0);
        this.handleMain(this.primary[this.primaryIndex]);
      } else if (this.input.wasPressed("a")) this.handleMain(this.primary[this.primaryIndex]);
      return;
    }
    if(this.input.wasPressed("left")||this.input.wasPressed("right")){
      const count=this.helpPages().length;
      this.notePage=(this.notePage+(this.input.wasPressed("left")?count-1:1))%count;
    }
    if(this.input.wasPressed("up")||this.input.wasPressed("down"))this.notePage=0;
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
      this.more = false;
      return;
    }
    if (action !== "select") {
      return;
    }
    this.handleMain(this.entries[this.menu.index]);
  }

  private handleMain(label: string): void {
    switch (label) {
      case "SALVA":
        audio.confirm();
        this.msg.show(
          saveGame(this.state)
            ? ["Partita salvata!", "A differenza delle riforme, questa resta."]
            : ["Errore di salvataggio..."], undefined, true
        );
        break;
      case "TESSERA":
        audio.confirm();
        this.showCard = true;
        this.cardAwards = false;
        break;
      case "POLITICDEX":
        if (!this.state.flags["dex-received"]) break;
        this.stack.push(new DexScene(this.stack, this.input, this.state));
        break;
      case "SQUADRA":
        this.stack.push(new PartyScene(this.stack, this.input, this.state, { mode: "view" }));
        break;
      case "MORALE":
        this.stack.push(new MoraleScene(this.stack, this.input, this.state));
        break;
      case "CURA":
        this.stack.push(new BagScene(this.stack, this.input, this.state, { inBattle: false, quickHeal: true }));
        break;
      case "ALTRO":
        this.more = true;
        break;
      case "GIOCA":
        this.stack.pop();
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
      if (label === "GUIDA CAMPAGNA") {
        this.stack.push(new FieldGuideScene(this.stack,this.input,"GUIDA CAMPAGNA",welcomeGuide(this.state)));
      } else if (label === "CONTENUTI") {
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
    } else if (label.startsWith("RITMO LOTTE")) {
      this.state.battleSpeed = this.state.battleSpeed === 2 ? 1 : 2;
      saveGame(this.state);
    } else if (label.startsWith("RIDUCI EFFETTI")) {
      // Accessibilità: azzera/ripristina shake+flash+dialog-shake. Segna la
      // scelta come esplicita (reduceEffectsSet) così non viene più sovrascritta
      // dal default di sistema, aggiorna il flag globale del dialogo e salva.
      this.state.reduceEffects = !this.state.reduceEffects;
      this.state.reduceEffectsSet = true;
      setReduceMotion(this.state.reduceEffects);
      saveGame(this.state);
    } else if (label.startsWith("AUDIO")) {
      this.stack.push(new AudioScene(this.stack, this.input, () => {
        this.sub = this.buildOptionsMenu(); this.sub.menu.index = index;
      }));
      return;
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
    screen.clear("#17243d");
    drawScreenHeader(screen, this.sub?.title ?? (this.more ? "ALTRO" : "PAUSA"));
    screen.rect(0,17,240,13,"#263954");screen.text(`${this.state.money}€`,8,21,"#fffaf0");screen.textRight(`SOND ${this.state.sondaggi}%`,232,21,"#fffaf0");
    if (!this.more && !this.sub) {
      screen.rect(8, 36, 224, 32, "#fff3cc");
      const quest = currentQuest(this.state);
      wrapText(quest?.step ?? "La campagna continua.", 34).slice(0, 2).forEach((line, i) => screen.text(line, 15, 43 + i * 11, "#17243d"));
      this.primary.forEach((label, i) => {
        const x = 8 + (i % 2) * 116, y = 76 + Math.floor(i / 2) * 28, selected = i === this.primaryIndex;
        screen.rect(x, y, 108, 24, selected ? "#fff3cc" : "#263954");
        screen.text(label, x + 7, y + 8, selected ? "#17243d" : "#fffaf0");
      });
      screen.text("MENO MODULI. PIÙ CAMPAGNA.", 12, 169, "#80d1b0");
    } else {
      const menu = this.sub?.menu ?? this.menu, start = Math.floor(menu.index / 4) * 4;
      for (let i = start; i < Math.min(start + 4, menu.items.length); i++) {
        const item = menu.items[i], y = 38 + (i - start) * 19, selected = i === menu.index;
        screen.rect(8, y, 224, 17, selected ? "#fff3cc" : "#263954");
        screen.textFit(item.label, 15, y + 5, 210, item.disabled ? "#8594a7" : selected ? "#17243d" : "#fffaf0");
      }
      const pages = this.helpPages(); this.notePage %= pages.length;
      screen.panel(8, 120, 224, 40, "card"); pages[this.notePage].forEach((line, i) => screen.text(line, 16, 128 + i * 10, "#17243d"));
      screen.text(`INFO ${this.notePage + 1}/${pages.length}  A:APRI  B:PAUSA`, 12, 169, "#fffaf0");
    }
    this.msg.draw(screen);
  }

  private helpPages():string[][]{
    const menu=this.sub?.menu??this.menu,label=this.sub?.entries[menu.index]??this.entries[menu.index]??"";
    const quest=currentQuest(this.state);
    let note="A APRE LA SEZIONE. B TORNA AL QUARTIER GENERALE.";
    if(label==="SALVA")note="REGISTRA LA PARTITA NELLO SLOT ATTIVO. IL MESSAGGIO CONFERMA SE LA SCRITTURA RIESCE.";
    else if(label==="MISSIONI")note=quest?`${quest.title}. ${quest.step}`:"MISSIONI PRINCIPALI CONCLUSE. CONSULTA ANCHE LE STORIE DI QUARTIERE.";
    else if(label==="MORALE")note=`FIDUCIA ${this.state.morale.trust}, COESIONE ${this.state.morale.cohesion}. APRI PROMESSE, SCADENZE E VERBALE DELLE SCELTE.`;
    else if(label==="SQUADRA")note="CONSULTA MOSSE E CRESCITA, SCEGLI IL LEADER E GLI OGGETTI TENUTI.";
    else if(label.startsWith("VEICOLO"))note="A CAMBIA MEZZO TERRESTRE. IL TRAGHETTO SI ATTIVA SULL’ACQUA, SE POSSEDUTO.";
    else if(label.startsWith("RIDUCI EFFETTI"))note="RIDUCE MOVIMENTO, SCOSSE E LAMPI. LA SCELTA SI SALVA E PREVALE SUL DEFAULT DEL DISPOSITIVO.";
    else if(label.startsWith("RITMO LOTTE"))note="ACCELERA I MESSAGGI DELLE LOTTE; REGOLE E TURNI RESTANO GLI STESSI.";
    else if(label==="DUELLO PVP"&&!(mp.isEnabled()&&mp.connected&&mp.onlineCount>0))note="SERVE UN ALTRO GIOCATORE CONNESSO PER AVVIARE IL DUELLO.";
    else if(label==="BACKUP")note="ESPORTA O IMPORTA IL CODICE PARTITA. VERIFICA LO SLOT PRIMA DI SOSTITUIRLO.";
    else if(label==="GUIDA CAMPAGNA")note="RILEGGI CONTROLLI, PROSSIMA META E SIGNIFICATO DELLA MORALE.";
    return epiloguePages([label,note],34,3);
  }

  private drawCard(screen: Screen): void {
    screen.rect(0, 0, VIEW_W, VIEW_H, "#101827");
    drawScreenHeader(screen, "TESSERA CANDIDATO", "A/B CHIUDI");
    const earned = earnedEndingSouvenirs(this.state);
    const souvenir = earned.length ? ENDING_SOUVENIRS[earned[this.souvenirIndex % earned.length]] : null;
    if (this.cardAwards) {
      screen.panel(8, 28, 224, 128, "card");
      const lines = ["RICORDI DELLA CAMPAGNA", souvenir ? souvenir.name : "NESSUN SOUVENIR DELL'EPILOGO.", this.state.monumentLevel === 3 ? MONUMENT_TITLE : `MONUMENTO: LIVELLO ${this.state.monumentLevel}/3.`, ...(this.state.coppaWins > 0 ? [`PORTAVOCE DEL POPOLO: ${this.state.coppaWins} TRIONFI.`] : []), "SOLO COSMETICI, NESSUN BONUS."];
      let y = 39;
      for (const paragraph of lines) { for (const line of wrapText(paragraph, 34)) { screen.text(line, 16, y, "#17243d"); y += 10; } y += 5; }
      if (souvenir) { const icon = sceneImage(`epilogue:${souvenir.image}`, `ui/epilogue/${souvenir.image}.png`); if (icon) screen.image(icon, 192, 34, 32, 32); }
      screen.text("SIN/DES: RICORDO  START: TESSERA", 12, 167, "#fffaf0");
      return;
    }
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

    if (souvenir) {
      const icon = sceneImage(`epilogue:${souvenir.image}`, `ui/epilogue/${souvenir.image}.png`);
      if (icon) screen.image(icon, 51, 96, 24, 24);
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
    screen.text("START: RICONOSCIMENTI", 12, 172, "#fffaf0");
  }
}
