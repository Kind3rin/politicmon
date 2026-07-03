import { audio } from "../engine/audio";
import { MONSTER_ART, drawMonsterSprite } from "../art/monsters";
import { STARTERS } from "../data/species";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { clearSave, hasSave, loadGame, newGameState, type GameState } from "../game/state";
import { mp } from "../net/mp";
import { hasNick, loadNick } from "../net/profile";
import { Menu, MessageBox, clipToWidth, GREY, PAPER } from "../ui/widgets";
import { NicknameScene } from "./NicknameScene";
import { WorldScene } from "../game/world/WorldScene";

// Slogan rotanti sotto il logo: uno alla volta, niente sovrapposizioni.
const SLOGANS = [
  "CATTURALI TUTTI, PRIMA CHE TI TASSINO.",
  "DAL BORGO AL PALAZZO A COLPI DI COMIZIO.",
  "TRE STARTER, ZERO PROGRAMMI SCRITTI.",
  "SATIRA PORTATILE, CONSENSO TASCABILE."
];

// Splash AI di sfondo (generato con Higgsfield, in stile pixel coerente col
// gioco). Caricato una volta sola e condiviso tra le istanze della TitleScene.
// Se manca o non carica, si ricade sullo sfondo procedurale: niente crash.
let bgImage: HTMLImageElement | null = null;
let bgReady = false;
function loadTitleBg(): void {
  if (bgImage) {
    return;
  }
  const img = new Image();
  img.onload = () => {
    bgReady = true;
  };
  img.onerror = () => {
    bgReady = false;
  };
  img.src = "title-bg.png";
  bgImage = img;
}

export class TitleScene implements Scene {
  private menu: Menu;
  private time = 0;
  private confirmDelete = false;
  private menuTapGeom: { x: number; y: number; w: number; rowH: number } | null = null;
  // Selettore DIFFICOLTÀ mostrato alla NUOVA CAMPAGNA (null = non attivo).
  private difficultyMenu: Menu | null = null;
  private diffMsg = new MessageBox();

  constructor(private stack: SceneStack, private input: Input) {
    this.menu = this.buildMenu();
    loadTitleBg();
    audio.playMusic("title");
  }

  private buildMenu(): Menu {
    const items: Array<{ label: string; rightLabel?: string }> = [{ label: "NUOVA CAMPAGNA" }];
    if (hasSave()) {
      items.unshift({ label: "CONTINUA" });
      items.push({ label: "CANCELLA DOSSIER" });
    }
    items.push({ label: "NOME", rightLabel: clipToWidth(loadNick() || "—", 60) });
    items.push({ label: "AUDIO", rightLabel: audio.enabled ? "SÌ" : "NO" });
    return new Menu(items);
  }

  update(dt: number): void {
    this.time += dt;
    // Selettore DIFFICOLTÀ in primo piano: gestiscilo prima di tutto il resto.
    if (this.difficultyMenu) {
      if (this.diffMsg.isOpen) {
        this.diffMsg.update(dt, this.input);
        return;
      }
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
    const tapAction = this.handleMenuTap();
    // Nota: NON chiediamo più il nome all'avvio. Prima si vede la schermata del
    // titolo; il nome si imposta dal menu o, se manca, alla prima campagna.
    const action = tapAction ?? this.menu.update(this.input);
    if (action !== "select") {
      return;
    }
    const label = this.menu.items[this.menu.index].label;
    if (label.startsWith("CONTINUA")) {
      const state = loadGame();
      if (state) {
        this.start(state);
      }
    } else if (label.startsWith("NUOVA")) {
      // Prima di creare la partita, scegli la DIFFICOLTÀ (immutabile dopo).
      audio.confirm();
      this.difficultyMenu = new Menu([{ label: "NORMALE" }, { label: "MODALITÀ DIFFICILE" }]);
    } else if (label.startsWith("NOME")) {
      this.openNickname();
    } else if (label.startsWith("AUDIO")) {
      const enabled = audio.toggle();
      if (enabled) {
        audio.playMusic("title");
      }
      const index = this.menu.index;
      this.menu = this.buildMenu();
      this.menu.index = Math.min(index, this.menu.items.length - 1);
    } else if (label.startsWith("CANCELLA") || label.startsWith("SICURO")) {
      if (!this.confirmDelete) {
        this.confirmDelete = true;
        this.menu.items[this.menu.index].label = "SICURO? PREMI A";
      } else {
        clearSave();
        this.confirmDelete = false;
        this.menu = this.buildMenu();
      }
    }
  }

  // Crea lo stato con la difficoltà scelta e avvia (chiedendo il nome se manca).
  private beginNewCampaign(hard: boolean): void {
    const makeState = (): GameState => {
      const state = newGameState();
      state.hardMode = hard; // IMMUTABILE da qui in poi
      return state;
    };
    if (!hasNick()) {
      this.stack.push(
        new NicknameScene(this.stack, this.input, (nick) => {
          mp.setIdentity(nick, "player");
          this.start(makeState());
        }, true)
      );
    } else {
      this.start(makeState());
    }
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

  private start(state: GameState): void {
    this.stack.replace(new WorldScene(this.stack, this.input, state));
  }

  private handleMenuTap(): "select" | null | undefined {
    const geom = this.menuTapGeom;
    const tap = this.input.consumeTap();
    if (!geom || !tap) {
      return undefined;
    }
    const h = this.menu.items.length * geom.rowH;
    if (tap.x < geom.x || tap.x >= geom.x + geom.w || tap.y < geom.y || tap.y >= geom.y + h) {
      return undefined;
    }
    this.input.clearTap();
    const row = Math.floor((tap.y - geom.y) / geom.rowH);
    if (row < 0 || row >= this.menu.items.length) {
      return null;
    }
    if (row === this.menu.index) {
      audio.confirm();
      return "select";
    }
    this.menu.index = row;
    audio.cursor();
    return null;
  }

  draw(screen: Screen): void {
    if (bgReady && bgImage) {
      screen.image(bgImage);
    } else {
      this.drawTitleFallback(screen);
    }
    screen.rect(0, 0, VIEW_W, 43, "rgba(6,8,16,0.58)");
    screen.rect(0, 43, VIEW_W, 12, "rgba(6,8,16,0.24)");
    this.drawLogo(screen);
    this.drawStarterShowcase(screen);
    if (this.difficultyMenu) {
      this.drawDifficulty(screen);
      return;
    }
    this.drawMenu(screen);
  }

  // Pannello DIFFICOLTÀ: due voci + spiegazione della modalità difficile.
  private drawDifficulty(screen: Screen): void {
    screen.rect(0, 44, VIEW_W, VIEW_H - 44, "rgba(6,8,16,0.82)");
    const w = 188;
    const h = 114;
    const x = Math.round((VIEW_W - w) / 2);
    const y = 46;
    screen.rect(x, y, w, h, "rgba(16,20,31,0.96)");
    screen.frame(x, y, w, h, "#f4d34a");
    screen.textCenter("SCEGLI LA SFIDA", VIEW_W / 2, y + 6, "#f4d34a");
    this.difficultyMenu!.draw(screen, x + 8, y + 18, w - 16, 12);
    const hard = this.difficultyMenu!.index === 1;
    const lines = hard
      ? ["Avversari +livelli, niente", "ONDA DEL CONSENSO,", "rivincite piu lente.", "Immutabile: scegli col cuore."]
      : ["Il percorso classico verso", "il PALAZZO. Pacing equilibrato.", "Consigliata alla prima corsa."];
    for (let i = 0; i < lines.length; i += 1) {
      screen.textCenter(lines[i], VIEW_W / 2, y + 60 + i * 9, GREY);
    }
    this.diffMsg.draw(screen);
  }

  private drawTitleFallback(screen: Screen): void {
    screen.clear("#10141f");
    screen.rect(0, 0, VIEW_W, VIEW_H, "#141c2f");
    screen.rect(0, 116, VIEW_W, 64, "#2f6f3c");
    screen.rect(18, 112, 204, 4, "#f0d068");
    screen.rect(42, 82, 156, 34, "#d8d2c0");
    screen.rect(42, 78, 156, 4, "#f4ead0");
    for (let x = 55; x <= 179; x += 24) {
      screen.rect(x, 86, 7, 30, "#b9af92");
      screen.rect(x + 2, 86, 2, 30, "#eee6d0");
    }
    screen.rect(84, 72, 24, 44, "#2f9a4c");
    screen.rect(108, 72, 24, 44, "#f4f4ec");
    screen.rect(132, 72, 24, 44, "#d23c3c");
  }

  // ---- Logo con ombra netta e bandiera tricolore sotto. ----
  private drawLogo(screen: Screen): void {
    // Titolo con doppia ombra per staccarsi dallo sfondo (nero + blu scuro).
    screen.textCenter("POLITICMON", VIEW_W / 2 + 1, 8, "#06080f", 2);
    screen.textCenter("POLITICMON", VIEW_W / 2, 6, "#f4d34a", 2);
    // Filetto tricolore sotto il titolo, centrato e largo quanto il logo.
    const tw = 120;
    const tx = Math.round(VIEW_W / 2 - tw / 2);
    screen.rect(tx, 23, Math.round(tw / 3), 2, "#2f9a4c");
    screen.rect(tx + Math.round(tw / 3), 23, Math.round(tw / 3), 2, "#f0f0e8");
    screen.rect(tx + Math.round(tw / 3) * 2, 23, tw - Math.round(tw / 3) * 2, 2, "#d23c3c");
    // Slogan rotante (indice sempre valido, anche se this.time è NaN/negativo).
    const t = Number.isFinite(this.time) ? this.time : 0;
    const slogan = SLOGANS[Math.abs(Math.floor(t / 3)) % SLOGANS.length] ?? SLOGANS[0];
    // Clamp a 220px: lo slogan non tocca mai i bordi (margine 10px per lato).
    screen.textCenter(clipToWidth(slogan, 220), VIEW_W / 2, 30, PAPER);
  }

  private drawStarterShowcase(screen: Screen): void {
    const slots = [
      { x: 20, color: "#d23c3c", flip: false },
      { x: 94, color: "#3f9a5c", flip: false },
      { x: 168, color: "#d8a830", flip: true }
    ];
    screen.rect(0, 50, VIEW_W, 54, "rgba(6,8,16,0.22)");
    for (let i = 0; i < STARTERS.length; i += 1) {
      const id = STARTERS[i];
      const slot = slots[i];
      const bob = Math.round(Math.sin(this.time * 2 + i * 1.7) * 2);
      const cx = slot.x + 26;
      screen.rect(cx - 22, 94, 44, 4, "rgba(0,0,0,0.34)");
      screen.rect(cx - 18, 90, 36, 4, slot.color);
      screen.rect(cx - 18, 94, 12, 2, "#2f9a4c");
      screen.rect(cx - 6, 94, 12, 2, "#f4f4ec");
      screen.rect(cx + 6, 94, 12, 2, "#d23c3c");
      screen.frame(cx - 19, 89, 38, 8, "#10141f");
      drawMonsterSprite(screen, id, MONSTER_ART[id], slot.x + 5, 52 + bob, 42, 40, { flipX: slot.flip });
    }
  }

  private drawMenuPreview(screen: Screen, x: number, y: number, w: number, h: number): void {
    const label = this.menu.items[this.menu.index]?.label ?? "";
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    screen.rect(x, y, w, h, "rgba(16,20,31,0.86)");
    screen.frame(x, y, w, h, "#5f6d8a");

    if (label.startsWith("NUOVA") || label.startsWith("CONTINUA")) {
      screen.rect(x + 10, y + 8, 22, 30, "#f4f4ec");
      screen.frame(x + 10, y + 8, 22, 30, "#10141f");
      screen.rect(x + 14, y + 13, 14, 2, "#d23c3c");
      screen.rect(x + 14, y + 18, 14, 2, "#3f9a5c");
      screen.rect(x + 14, y + 23, 14, 2, "#4868c8");
      screen.rect(x + 42, y + 30, 30, 3, "#d8bc7c");
      screen.rect(x + 49, y + 20, 3, 13, "#d8bc7c");
      screen.rect(x + 56, y + 16, 3, 17, "#d8bc7c");
      const starterId = STARTERS[Math.floor(this.time * 1.2) % STARTERS.length];
      drawMonsterSprite(screen, starterId, MONSTER_ART[starterId], x + 49, y + 7, 28, 26);
      return;
    }

    if (label.startsWith("NOME")) {
      screen.rect(cx - 10, cy - 16, 20, 20, "#f0c8a0");
      screen.frame(cx - 10, cy - 16, 20, 20, "#10141f");
      screen.rect(cx - 5, cy - 7, 3, 3, "#10141f");
      screen.rect(cx + 4, cy - 7, 3, 3, "#10141f");
      screen.rect(cx - 4, cy + 1, 10, 2, "#a84040");
      screen.rect(cx - 16, cy + 8, 32, 12, "#4868c8");
      screen.frame(cx - 16, cy + 8, 32, 12, "#10141f");
      return;
    }

    if (label.startsWith("AUDIO")) {
      const on = audio.enabled;
      screen.rect(cx - 24, cy - 8, 10, 16, on ? "#f4d34a" : "#5f6d8a");
      screen.rect(cx - 14, cy - 13, 8, 26, on ? "#f4d34a" : "#5f6d8a");
      for (let i = 0; i < 3; i += 1) {
        const hh = on ? 8 + i * 6 : 3;
        screen.rect(cx + i * 9, cy - Math.floor(hh / 2), 5, hh, on ? "#6aa8ff" : "#5f6d8a");
      }
      return;
    }

    screen.rect(cx - 16, cy - 10, 32, 22, "#6b1f2a");
    screen.frame(cx - 16, cy - 10, 32, 22, "#f06060");
    screen.rect(cx - 12, cy - 16, 24, 4, "#f06060");
    screen.rect(cx - 8, cy - 4, 16, 2, "#f4f4ec");
    screen.rect(cx - 8, cy + 2, 16, 2, "#f4f4ec");
  }

  private drawMenuIcon(screen: Screen, label: string, x: number, y: number, selected: boolean): void {
    const dark = selected ? "#10141f" : "#f4d34a";
    const light = selected ? "#4868c8" : "#f4f4ec";
    if (label.startsWith("NUOVA") || label.startsWith("CONTINUA")) {
      screen.rect(x, y, 8, 8, light);
      screen.frame(x, y, 8, 8, dark);
      screen.rect(x + 2, y + 2, 4, 1, "#d23c3c");
      screen.rect(x + 2, y + 4, 4, 1, "#2f9a4c");
      screen.rect(x + 2, y + 6, 4, 1, "#4868c8");
      return;
    }
    if (label.startsWith("NOME")) {
      screen.rect(x + 1, y, 6, 6, "#f0c8a0");
      screen.frame(x + 1, y, 6, 6, dark);
      screen.rect(x + 2, y + 2, 1, 1, dark);
      screen.rect(x + 5, y + 2, 1, 1, dark);
      screen.rect(x + 2, y + 7, 4, 1, light);
      return;
    }
    if (label.startsWith("AUDIO")) {
      screen.rect(x, y + 3, 3, 3, light);
      screen.rect(x + 3, y + 1, 2, 7, light);
      const on = audio.enabled;
      screen.rect(x + 6, y + 2, 1, on ? 5 : 2, on ? "#6aa8ff" : "#5f6d8a");
      screen.rect(x + 8, y + 1, 1, on ? 7 : 2, on ? "#6aa8ff" : "#5f6d8a");
      return;
    }
    screen.rect(x + 1, y + 2, 7, 6, "#6b1f2a");
    screen.frame(x + 1, y + 2, 7, 6, "#f06060");
    screen.rect(x + 2, y, 5, 1, "#f06060");
  }

  // ---- Menu compatto: comandi a sinistra, anteprima visuale a destra. ----
  private drawMenu(screen: Screen): void {
    const rowH = 12;
    const menuH = this.menu.items.length * rowH;
    const w = Math.min(128, Math.max(116, this.menu.measureWidth() + 10));
    const footerH = 12;
    const x = 8;
    const y = VIEW_H - menuH - footerH - 6;
    this.menuTapGeom = { x, y, w, rowH };

    screen.rect(0, y - 6, VIEW_W, menuH + footerH + 12, "rgba(6,8,16,0.58)");
    screen.rect(x - 3, y - 3, w + 6, menuH + 6, "rgba(16,20,31,0.92)");
    screen.frame(x - 3, y - 3, w + 6, menuH + 6, "#f4d34a");
    for (let i = 0; i < this.menu.items.length; i += 1) {
      const item = this.menu.items[i];
      const rowY = y + i * rowH;
      const selected = i === this.menu.index;
      if (selected) {
        screen.rect(x, rowY + 1, w, rowH - 2, "#f4d34a");
        screen.rect(x + 2, rowY + 3, 3, rowH - 6, "#10141f");
      }
      const color = selected ? "#10141f" : PAPER;
      const rightW = item.rightLabel ? item.rightLabel.length * 6 + 6 : 0;
      this.drawMenuIcon(screen, item.label, x + 7, rowY + 2, selected);
      screen.text(clipToWidth(item.label, w - 30 - rightW), x + 20, rowY + 3, color);
      if (item.rightLabel) {
        screen.textRight(item.rightLabel, x + w - 8, rowY + 3, selected ? "#10141f" : "#cfe6ff");
      }
    }
    this.drawMenuPreview(screen, x + w + 10, y, VIEW_W - x - w - 18, menuH);
    screen.textCenter("A SCEGLI   B INDIETRO   SATIRA", VIEW_W / 2, VIEW_H - 8, GREY);
  }
}
