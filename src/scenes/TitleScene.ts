import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { clearSave, hasSave, loadGame, newGameState, type GameState } from "../game/state";
import { mp } from "../net/mp";
import { hasNick, loadNick } from "../net/profile";
import { Menu, clipToWidth, GREY, PAPER } from "../ui/widgets";
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
      // Se non hai ancora un nome (per la chat online), te lo chiediamo ora —
      // ma solo al momento di iniziare davvero, non all'apertura del gioco.
      if (!hasNick()) {
        this.stack.push(
          new NicknameScene(this.stack, this.input, (nick) => {
            mp.setIdentity(nick, "player");
            this.start(newGameState());
          }, true)
        );
      } else {
        this.start(newGameState());
      }
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
    screen.rect(0, 0, VIEW_W, 46, "rgba(6,8,16,0.58)");
    screen.rect(0, 46, VIEW_W, 16, "rgba(6,8,16,0.24)");
    this.drawLogo(screen);
    this.drawMenu(screen);
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

  // ---- Menu in basso, centrato e riquadrato, con comandi e disclaimer. ----
  private drawMenu(screen: Screen): void {
    const rowH = 14;
    const menuH = this.menu.items.length * rowH;
    const w = Math.min(VIEW_W - 20, Math.max(154, this.menu.measureWidth() + 8));
    const footerH = 10;
    const x = Math.round((VIEW_W - w) / 2);
    const y = VIEW_H - menuH - footerH - 8;
    this.menuTapGeom = { x, y, w, rowH };

    screen.rect(0, y - 8, VIEW_W, menuH + footerH + 16, "rgba(6,8,16,0.68)");
    screen.rect(x - 4, y - 4, w + 8, menuH + 8, "rgba(16,20,31,0.94)");
    screen.frame(x - 4, y - 4, w + 8, menuH + 8, "#f4d34a");
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
      screen.text(clipToWidth(item.label, w - 20 - rightW), x + 10, rowY + 4, color);
      if (item.rightLabel) {
        screen.textRight(item.rightLabel, x + w - 8, rowY + 4, selected ? "#10141f" : "#cfe6ff");
      }
    }
    screen.textCenter("A SCEGLI   B INDIETRO   SATIRA", VIEW_W / 2, VIEW_H - 8, GREY);
  }
}
