import { MONSTER_ART, drawMonsterSprite } from "../art/monsters";
import { TYPE_COLORS, typeIcon } from "../data/poltypes";
import { DEX_ORDER, SPECIES, STARTERS } from "../data/species";
import { ABILITIES } from "../data/abilities";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import { clipToWidth, wrapText, GREY, INK, PAPER } from "../ui/widgets";
import { zoneProgress } from "../data/dexzones";
import { VERSION_EXCLUSIVES, speciesAvailable } from "../game/version";

// Specie di QUESTA versione non avvistabili sul campo (esclusive dell'altra
// fazione): ottenibili solo scambiando online. Tag azzurro per distinguerle.
const TRADE_ONLY = "#5aa0d8";

export class DexScene implements Scene {
  private index = 0;
  private detail = false;
  private scroll = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(): void {
    if (this.detail) {
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) {
        audio.cancel();
        this.detail = false;
      }
      return;
    }
    if (this.input.wasPressed("up")) {
      this.index = (this.index + DEX_ORDER.length - 1) % DEX_ORDER.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % DEX_ORDER.length;
      audio.cursor();
    }
    const visibleRows = 10;
    if (this.index < this.scroll) {
      this.scroll = this.index;
    }
    if (this.index >= this.scroll + visibleRows) {
      this.scroll = this.index - visibleRows + 1;
    }
    if (this.input.wasPressed("b")) {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (this.input.wasPressed("a")) {
      const id = DEX_ORDER[this.index];
      if (this.state.dex[id]) {
        audio.confirm();
        this.detail = true;
      } else {
        audio.cancel();
      }
    }
  }

  draw(screen: Screen): void {
    screen.clear("#7a2828");
    if (this.detail) {
      this.drawDetail(screen);
      return;
    }
    const seen = Object.keys(this.state.dex).length;
    const caught = Object.values(this.state.dex).filter((v) => v === "caught").length;
    // Target REALISTICO: i 2 starter non scelti non sono ottenibili in un save,
    // quindi escluderli rende il Dex davvero completabile (e quindi motivante).
    const skipped = STARTERS.filter((s) => s !== this.state.starterId).length;
    const target = DEX_ORDER.length - skipped;
    screen.text("POLITICDEX", 8, 5, PAPER);
    screen.textRight(`VISTI ${seen}  ELETTI ${caught}/${target}`, VIEW_W - 8, 5, PAPER);
    screen.panel(4, 15, VIEW_W - 8, VIEW_H - 19);
    const visibleRows = 10;
    for (let row = 0; row < visibleRows; row += 1) {
      const i = this.scroll + row;
      if (i >= DEX_ORDER.length) {
        break;
      }
      const id = DEX_ORDER[i];
      const species = SPECIES[id];
      const status = this.state.dex[id];
      const y = 22 + row * 13;
      if (i === this.index) {
        screen.text("►", 10, y, INK);
      }
      screen.text(`N.${String(species.dexNum).padStart(2, "0")}`, 18, y, GREY);
      screen.text(status ? species.name : "??????????", 52, y, status ? INK : GREY);
      // Specie esclusiva dell'ALTRA versione: si prende SOLO scambiando.
      const tradeOnly = VERSION_EXCLUSIVES[id] && !speciesAvailable(id, this.state.browserSeed);
      if (status === "caught") {
        screen.text("★", VIEW_W - 22, y, "#b04848");
      } else if (tradeOnly) {
        // Etichetta a destra: non è "mancante per svogliatezza", serve un cambio.
        screen.text("SCAMBIO", VIEW_W - 62, y, TRADE_ONLY);
      } else if (status === "seen") {
        screen.text("•", VIEW_W - 22, y, GREY);
      }
    }
    // Progresso ZONE: quante complete su 5 + dettaglio della zona corrente.
    // Spinge a completare il roster locale per la ricompensa.
    const zp = zoneProgress(this.state.dex, this.state.flags, this.state.browserSeed);
    const doneZones = zp.filter((p) => p.done).length;
    const here = zp.find((p) => p.zone.id === this.state.pos.mapId);
    const hereTxt = here ? `  -  QUI ${here.zone.name} ${here.caught}/${here.total}` : "";
    const col = doneZones >= zp.length ? "#e8c84a" : GREY;
    screen.text(clipToWidth(`ZONE COMPLETE ${doneZones}/${zp.length}${hereTxt}`, 224), 8, VIEW_H - 11, col);
    // Riepilogo versione: quante specie restano ottenibili SOLO scambiando
    // (esclusive dell'altra fazione, non ancora catturate). Rende visibile il
    // sistema versioni e spinge allo scambio online.
    const tradeOnlyLeft = Object.keys(VERSION_EXCLUSIVES).filter(
      (id) => !speciesAvailable(id, this.state.browserSeed) && this.state.dex[id] !== "caught"
    ).length;
    if (caught >= target) {
      screen.text("DEX COMPLETO! ORA SEI IL PALAZZO!", 12, VIEW_H - 21, "#e8c84a");
    } else if (tradeOnlyLeft > 0) {
      screen.text(`SOLO VIA SCAMBIO: ${tradeOnlyLeft}`, 8, VIEW_H - 21, TRADE_ONLY);
    }
  }

  private drawDetail(screen: Screen): void {
    const id = DEX_ORDER[this.index];
    const species = SPECIES[id];
    screen.clear("#7a2828");
    screen.panel(4, 4, VIEW_W - 8, VIEW_H - 8);
    // Box mostro: ancorato in basso a y=70, max 60x54 (PNG PixelLab o pixmap).
    drawMonsterSprite(screen, id, MONSTER_ART[id], 8, 16, 60, 54);
    screen.text(`N.${String(species.dexNum).padStart(2, "0")} ${species.name}`, 76, 14, INK);
    screen.text(species.category, 76, 26, GREY);
    let tx = 76;
    for (const type of species.types) {
      const icon = typeIcon(type);
      const iconW = icon ? 11 : 0;
      const w = type.length * 6 + 6 + iconW;
      screen.rect(tx, 38, w, 11, TYPE_COLORS[type]);
      if (icon) {
        screen.imageSprite(icon, tx + 1, 39, { scaleX: 9 / icon.width, scaleY: 9 / icon.height });
      }
      screen.text(type, tx + 3 + iconW, 40, PAPER);
      tx += w + 4;
    }
    // ABILITÀ passiva (se la specie ne ha una): nome + descrizione breve.
    const ability = species.ability ? ABILITIES[species.ability] : undefined;
    if (ability) {
      // Clip: "GARANZIA COSTITUZIONALE" (23) sforava il pannello/schermo a x=76.
      screen.text(clipToWidth(`ABILITÀ: ${ability.name}`, VIEW_W - 76 - 8), 76, 54, "#e8c84a");
    }
    // Cursore Y progressivo: descrizione, poi abilità, poi footer si impilano
    // senza offset fissi (prima la 2a riga dell'abilità cadeva sul footer con
    // dexLine di 3 righe, es. TAJANIDE). Righe totali limitate per stare nel
    // pannello (fondo utile ~y150 prima di "A/B: indietro").
    let cy = 80;
    const dexLines = wrapText(species.dexLine, 35);
    for (let i = 0; i < dexLines.length && i < 3; i += 1) {
      screen.text(dexLines[i], 14, cy, INK);
      cy += 10;
    }
    if (ability) {
      cy += 2; // stacco visivo tra dexLine e abilità
      const abLines = wrapText(ability.desc, 35);
      for (let i = 0; i < Math.min(2, abLines.length); i += 1) {
        screen.text(abLines[i], 14, cy, GREY);
        cy += 10;
      }
    }
    // Esclusiva dell'altra versione: nel tuo mondo si ottiene SOLO scambiando.
    if (VERSION_EXCLUSIVES[id] && !speciesAvailable(id, this.state.browserSeed)) {
      screen.text("SOLO VIA SCAMBIO ONLINE", 14, cy, TRADE_ONLY);
      cy += 10;
    }
    if (this.state.dex[id] !== "caught") {
      screen.text("(Non ancora nella tua squadra)", 14, cy, GREY);
    }
    screen.text("A/B: indietro", 14, VIEW_H - 16, GREY);
  }
}
