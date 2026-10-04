import { earnedEndingSouvenirs, ENDING_SOUVENIRS } from "../game/atto3Ending";
import { MONUMENT_TITLE } from "./MonumentScene";
import { FieldGuideScene } from "./FieldGuideScene";
import { welcomeGuide } from "../game/onboarding";
import type { TouchAction } from "../engine/touchActions";
import type { UiPanel } from "../ui/kit";
import { AudioScene } from "./AudioScene";
import { audio } from "../engine/audio";
import { isGuideOn, loadControlMode, toggleControlMode, toggleGuide, loadTextSpeed, toggleTextSpeed } from "../engine/controls";
import { haptics } from "../engine/haptics";
import { ownedVehicles, VEHICLES, type VehicleId } from "../game/vehicles";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import { mp } from "../net/mp";
import { loadNick } from "../net/profile";
import { canPromptInstall, installHint, isAppInstalled, promptInstall } from "../engine/pwa";
import { Menu, MessageBox, setReduceMotion } from "../ui/widgets";
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
  readonly transparent = true;
  readonly expandedViewport = true;
  private menu: Menu;
  private more = false;
  private primaryIndex = 0;
  private moreIndex = 0;
  private readonly primary = ["SQUADRA", "BORSA", "MISSIONI", "MAPPA", "POLITICDEX", "ALTRO"];
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

  get uiPanel(): UiPanel | undefined {
    if (this.msg.isOpen) return { pause:{money:this.state.money,polls:this.state.sondaggi,grid:false}, title: "La tua campagna", blocks: [{ title: "Avviso", body: this.msg.pageText }], actions: [{ label: "Continua", run: () => { if (this.stack.top === this && this.msg.isOpen) { this.input.reset(); this.msg.advancePage(); } } }], primary: 0, back:{label:"Indietro",run:()=>{if(this.stack.top!==this)return;this.input.reset();this.msg.close();audio.cancel();}} };
    if (this.showCard) {
      const earned = earnedEndingSouvenirs(this.state);
      const souvenir = earned.length ? ENDING_SOUVENIRS[earned[this.souvenirIndex % earned.length]] : undefined;
      return { pause:{money:this.state.money,polls:this.state.sondaggi,grid:false}, title: this.cardAwards ? "Ricordi della campagna" : "Tessera candidato", blocks: [{ title: loadNick() || "Onorevole", facts: [{ label: "Sondaggi", value: `${this.state.sondaggi}%` }, { label: "Medaglie", value: `${this.state.badges.length}/3` }] }, { title: souvenir?.name ?? "I ricordi si conquistano giocando", body: this.state.monumentLevel === 3 ? MONUMENT_TITLE : `Monumento: livello ${this.state.monumentLevel} di 3.` }], actions: [], back: { label: "Indietro", run: () => { if (this.stack.top === this) { this.input.reset(); this.showCard = false; } } } };
    }
    const sub = this.sub, more = this.more;
    const labels: Record<string, string> = { SQUADRA: "Squadra", BORSA: "Borsa", MISSIONI: "Missioni", MAPPA: "Mappa", POLITICDEX: "Politicdex", ALTRO: "Altro", SALVA: "Salva partita", CURA: "Cura squadra", MORALE: "Morale", OPZIONI: "Opzioni", TESSERA: "Tessera", ONLINE: "Gioco online", EXTRA: "Guide e archivi", GOVERNO: "Governo ombra", COALIZIONE: "Coalizione", CHIUDI: "Torna al gioco" };
    const action = (label: string, run: () => void, disabled = false, hint?: string): TouchAction => ({ label, hint, disabled, run: () => {
      if (this.stack.top !== this || this.msg.isOpen || this.showCard || this.sub !== sub || this.more !== more || disabled) return;
      this.input.reset(); audio.confirm(); run();
    } });
    const menu = sub?.menu ?? this.menu;
    const primary = !this.more && !sub;
    const icons = ["team", "bag", "missions", "map", "dex", "more"];
    let actions = primary ? this.primary.map((label, i) => ({ ...action(labels[label], () => { this.primaryIndex = i; this.handleMain(label); }, label === "POLITICDEX" && !this.state.flags["dex-received"], this.primaryHint(i)), icon: `/sprites/ui/kit/${icons[i]}.png` }))
      : menu.items.filter(item => item.label !== "INDIETRO" && item.label !== "CHIUDI").map(item => action(labels[item.label] ?? item.label.charAt(0) + item.label.slice(1).toLocaleLowerCase("it"), () => {
        menu.index = menu.items.indexOf(item);
        if (sub) this.handleSub(sub, item.label); else this.handleMain(item.label);
      }, Boolean(item.disabled), item.rightLabel));
    if (this.more && !sub) {
      const names: Record<string, string> = { "GUIDA CAMPAGNA": "Come giocare", CONTENUTI: "Contenuti della campagna", TRAGUARDI: "Traguardi", "GUIDA TIPI": "Efficacia dei tipi", "FONTI SATIRA": "Fonti della satira", "CHAT DI ZONA": "Chat di zona", "DUELLO PVP": "Duello online", BACKUP: "Esporta e importa salvataggi", "INSTALLA APP": "Installa app" };
      const extras = this.menu.items.filter(item => !["OPZIONI", "ONLINE", "EXTRA", "CHIUDI"].includes(item.label));
      actions = extras.map(item => ({ ...action(item.label.startsWith("VEICOLO") ? "Mezzo di trasporto" : labels[item.label] ?? item.label, () => { this.moreIndex = extras.indexOf(item); this.handleMain(item.label); }), group: "Campagna",
        hint: item.label === "SALVA" ? "Salva i progressi nello slot attuale." : item.label === "CURA" ? "Scegli il compagno e controlla la cura." : undefined,
        facts: item.label === "MORALE" ? [{ label: "Fiducia", value: String(this.state.morale.trust) }, { label: "Coesione", value: String(this.state.morale.cohesion) }] : item.label === "COALIZIONE" ? [{ label: "Alleati", value: `${this.state.coalition.members.length} di 2` }] : item.label.startsWith("VEICOLO") ? [{ label: "Attuale", value: this.state.vehicle ? VEHICLES[this.state.vehicle as VehicleId].name : "A piedi" }] : undefined }));
      for (const section of [this.buildOptionsMenu(), this.buildOnlineMenu(), this.buildExtraMenu()]) {
        for (const item of section.menu.items.filter(item => item.label !== "INDIETRO")) {
          const raw = item.label, split = raw.indexOf(":"), prefix = split >= 0 ? raw.slice(0, split) : raw;
          const settingNames: Record<string, string> = { TESTO: "Velocità del testo", GUIDA: "Guida sul campo", AUDIO: "Audio e volume", "RITMO LOTTE": "Ritmo delle lotte", "RIDUCI EFFETTI": "Riduci effetti", VIBRA: "Vibrazione", TASTI: "Comandi di movimento" };
          const values: Record<string, string> = { "SÌ": "Attiva", NO: "Disattiva", ISTANTANEO: "Istantaneo", NORMALE: "Normale", RAPIDO: "Rapido", LEVETTA: "Leva virtuale", CROCE: "Croce fissa" };
          const index = actions.length;
          actions.push({ ...action(settingNames[prefix] ?? names[raw] ?? raw, () => { this.moreIndex = index; this.handleSub(section, raw); }, !!item.disabled, prefix === "AUDIO" ? "Musica, effetti e volumi." : item.disabled ? "Serve un altro giocatore connesso." : undefined),
            group: section.kind === "opzioni" ? "Impostazioni e salvataggi" : section.kind === "online" ? "Gioco online" : "Guide e archivi",
            facts: split >= 0 && prefix !== "AUDIO" ? [{ label: "Impostazione", value: values[raw.slice(split + 1).trim()] ?? raw.slice(split + 1).trim() }] : undefined });
        }
      }
    }
    return { pause:{money:this.state.money,polls:this.state.sondaggi,grid:primary}, title: sub ? (sub.kind === "opzioni" ? "Opzioni" : sub.kind === "online" ? "Gioco online" : "Guide e archivi") : this.more ? "Altro" : "Menu",
      actions, columns: primary ? 2 : 1, selected: primary ? this.primaryIndex : !sub ? this.moreIndex : menu.index,
      back: action("Indietro", () => { if (this.sub) this.sub = null; else if (this.more) this.more = false; else {
        if(this.state.flags["controls-intro"]&&!this.state.flags["controls-returned"]){this.state.flags["controls-returned"]=true;saveGame(this.state);}
        this.stack.pop();
      } }) };
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
    push("SALVA"); push("CURA"); push("MORALE"); push("OPZIONI"); push("TESSERA");
    if (this.state.badges.length > 0) {
      push("GOVERNO");
    }
    if (this.state.flags["coalition-menu-unlocked"]) {
      push("COALIZIONE", `${this.state.coalition.members.length}/2`);
    }
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
      `TESTO: ${loadTextSpeed() === "instant" ? "ISTANTANEO" : loadTextSpeed() === "fast" ? "RAPIDO" : "NORMALE"}`,
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

  get touchActions(): readonly TouchAction[] | undefined { return this.uiPanel?.actions; }
  private primaryHint(index: number): string {
    const hints = [`${this.state.party.length} ${this.state.party.length===1?"compagno":"compagni"}`, "Cure, schede e oggetti", "Obiettivo e ricompense", "Luoghi e prossima meta", "Specie, habitat e crescita", "Salvataggi e impostazioni"];
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
      if (this.input.wasPressed("a")) this.handleMain(this.primary[this.primaryIndex]);
      return;
    }
    if(this.input.wasPressed("left")||this.input.wasPressed("right")){
      const count=1;
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
    const flat = !this.sub;
    const index = this.sub?.menu.index ?? 0;
    if (label.startsWith("GUIDA")) {
      toggleGuide();
    } else if (label.startsWith("TESTO")) {
      toggleTextSpeed();
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
        if (!flat) { this.sub = this.buildOptionsMenu(); this.sub.menu.index = index; }
      }));
      return;
    }
    audio.confirm();
    if (!flat) { this.sub = this.buildOptionsMenu(); this.sub.menu.index = index; }
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

  draw(_screen: Screen): void {}
}
