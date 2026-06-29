import { MONSTER_ART, drawMonsterSprite } from "../art/monsters";
import { STARTERS } from "../data/species";
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

  constructor(private stack: SceneStack, private input: Input) {
    this.menu = this.buildMenu();
    loadTitleBg();
    audio.playMusic("title");
  }

  private buildMenu(): Menu {
    const items = [{ label: "NUOVA CAMPAGNA" }];
    if (hasSave()) {
      items.unshift({ label: "CONTINUA IL MANDATO" });
      items.push({ label: "CANCELLA DOSSIER" });
    }
    items.push({ label: `NOME: ${loadNick() || "-"}`.slice(0, 18) });
    items.push({ label: `AUDIO ${audio.enabled ? "SÌ" : "NO"}` });
    return new Menu(items);
  }

  update(dt: number): void {
    this.time += dt;
    // Nota: NON chiediamo più il nome all'avvio. Prima si vede la schermata del
    // titolo; il nome si imposta dal menu o, se manca, alla prima campagna.
    const action = this.menu.update(this.input);
    if (action !== "select") {
      return;
    }
    const label = this.menu.items[this.menu.index].label;
    if (label === "CONTINUA IL MANDATO") {
      const state = loadGame();
      if (state) {
        this.start(state);
      }
    } else if (label === "NUOVA CAMPAGNA") {
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
    } else if (label === "CANCELLA DOSSIER" || label === "SICURO? PREMI ANCORA A") {
      if (!this.confirmDelete) {
        this.confirmDelete = true;
        this.menu.items[this.menu.index].label = "SICURO? PREMI ANCORA A";
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

  draw(screen: Screen): void {
    if (bgReady && bgImage) {
      // Splash AI a tutto schermo + velo per far risaltare logo e menu.
      screen.image(bgImage);
      // Velo in alto (dietro al logo) e in basso (dietro al menu) per leggibilità.
      screen.rect(0, 0, VIEW_W, 40, "rgba(10,14,28,0.42)");
      screen.rect(0, VIEW_H - this.menu.measureHeight(11) - 20, VIEW_W, this.menu.measureHeight(11) + 20, "rgba(10,14,28,0.5)");
      this.drawLogo(screen);
      this.drawMenu(screen);
      return;
    }
    // Fallback procedurale (se lo splash non è ancora caricato o manca).
    this.drawSky(screen);
    this.drawPalace(screen);
    this.drawLogo(screen);
    this.drawPodium(screen);
    this.drawMenu(screen);
  }

  // ---- Sfondo: cielo sereno a fasce, sole, nuvole nella fascia bassa. ----
  private drawSky(screen: Screen): void {
    screen.clear("#7fb2e8");
    screen.rect(0, 0, VIEW_W, 30, "#6fa3df");
    screen.rect(0, 30, VIEW_W, 26, "#8cc0ee");
    // Sole (in alto a sinistra, lontano dal logo).
    screen.rect(14, 50, 16, 16, "#ffe98a");
    screen.rect(12, 54, 20, 8, "#ffe98a");
    screen.rect(16, 48, 12, 20, "#ffe98a");
    // Nuvole che scorrono piano, sopra il prato (sotto il logo e lo slogan).
    const drift = Math.floor(this.time * 6);
    this.drawCloud(screen, ((40 + drift) % (VIEW_W + 60)) - 40, 60);
    this.drawCloud(screen, ((170 + drift) % (VIEW_W + 60)) - 40, 72);
  }

  private drawCloud(screen: Screen, x: number, y: number): void {
    screen.rect(x, y + 4, 30, 6, "#f4f8ff");
    screen.rect(x + 6, y, 18, 8, "#f4f8ff");
    screen.rect(x + 2, y + 2, 10, 6, "#ffffff");
  }

  // ---- Skyline del Palazzo, netto e simmetrico. ----
  private drawPalace(screen: Screen): void {
    const baseY = 84;
    // Prato.
    screen.rect(0, baseY + 22, VIEW_W, VIEW_H - baseY - 22, "#3f7d3a");
    screen.rect(0, baseY + 22, VIEW_W, 3, "#4e9444");
    // Corpo del Palazzo.
    screen.rect(40, baseY - 6, VIEW_W - 80, 28, "#d8d2c0");
    screen.rect(40, baseY - 6, VIEW_W - 80, 3, "#eee8d8");
    // Colonne.
    for (let x = 52; x < VIEW_W - 52; x += 22) {
      screen.rect(x, baseY - 2, 6, 24, "#c7c0aa");
      screen.rect(x + 1, baseY - 2, 2, 24, "#e6e0cc");
    }
    // Timpano (tetto triangolare).
    for (let i = 0; i < 14; i += 1) {
      screen.rect(VIEW_W / 2 - 70 + i * 5, baseY - 6 - i, (70 - i * 5) * 2, 1, "#b7ad8e");
    }
    screen.rect(VIEW_W / 2 - 2, baseY - 22, 4, 6, "#7a8a4a"); // pennone
    screen.rect(VIEW_W / 2 + 2, baseY - 22, 10, 5, "#2f9a4c");
    // Cupole laterali.
    this.drawDome(screen, 26, baseY - 4);
    this.drawDome(screen, VIEW_W - 34, baseY - 4);
  }

  private drawDome(screen: Screen, x: number, y: number): void {
    screen.rect(x, y, 8, 18, "#c7c0aa");
    screen.rect(x + 1, y - 4, 6, 6, "#9fb6c8");
    screen.rect(x + 2, y - 7, 4, 4, "#9fb6c8");
    screen.rect(x + 3, y - 10, 2, 4, "#e8c84a");
  }

  // ---- Logo con ombra netta e bandiera tricolore sotto. ----
  private drawLogo(screen: Screen): void {
    // Banda tricolore dietro al titolo.
    screen.rect(0, 8, VIEW_W, 18, "rgba(16,20,31,0.18)");
    screen.textCenter("POLITICMON", VIEW_W / 2 + 1, 13, "#0a1a3a", 2);
    screen.textCenter("POLITICMON", VIEW_W / 2, 12, "#f4d34a", 2);
    // Filetto tricolore sotto il titolo.
    const tw = 112;
    const tx = VIEW_W / 2 - tw / 2;
    screen.rect(tx, 30, tw / 3, 2, "#2f9a4c");
    screen.rect(tx + tw / 3, 30, tw / 3, 2, "#f0f0e8");
    screen.rect(tx + (tw / 3) * 2, 30, tw / 3, 2, "#d23c3c");
    // Slogan rotante (indice sempre valido, anche se this.time è NaN/negativo).
    const t = Number.isFinite(this.time) ? this.time : 0;
    const slogan = SLOGANS[Math.abs(Math.floor(t / 3)) % SLOGANS.length] ?? SLOGANS[0];
    // Clamp a 232px: nessuno slogan deve toccare i bordi dello schermo.
    screen.textCenter(clipToWidth(slogan, 232), VIEW_W / 2, 35, PAPER);
  }

  // ---- Podio con i tre starter, ben staccati e con etichetta VOTA. ----
  private drawPodium(screen: Screen): void {
    const stageY = 106;
    // Pedana.
    screen.rect(24, stageY + 16, VIEW_W - 48, 10, "#5a4632");
    screen.rect(24, stageY + 16, VIEW_W - 48, 3, "#6e573e");

    const ids = [...STARTERS];
    const spots = [46, VIEW_W / 2, VIEW_W - 46];
    for (let i = 0; i < ids.length && i < spots.length; i += 1) {
      const art = MONSTER_ART[ids[i]];
      const bob = Math.round(Math.sin(this.time * 3 + i * 2.1) * 2);
      const cx = spots[i] - 12;
      // Ombra a terra.
      screen.rect(cx - 2, stageY + 14, 28, 4, "rgba(0,0,0,0.25)");
      // PNG PixelLab (o pixmap) ancorato in basso sul podio, con bob.
      drawMonsterSprite(screen, ids[i], art, cx - 6, stageY - 28 + bob, 40, 40);
    }
  }

  // ---- Menu in basso, riquadrato e con i comandi. ----
  private drawMenu(screen: Screen): void {
    const w = 138;
    const menuH = this.menu.measureHeight(11);
    const x = VIEW_W / 2 - w / 2;
    const y = VIEW_H - menuH - 13;
    this.menu.draw(screen, x, y, w, 11);
    // Disclaimer satira: opera di parodia, personaggi caricaturali di fantasia.
    // Best practice di settore (parodia + continenza) per tono bonario e copertura.
    screen.textCenter("SATIRA - PERSONAGGI DI FANTASIA", VIEW_W / 2, y - 8, GREY);
    screen.textCenter("A/Z: SCEGLI   B/X: INDIETRO", VIEW_W / 2, VIEW_H - 9, GREY);
  }
}
