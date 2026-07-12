import { MONSTER_ART, drawMonsterSprite } from "../art/monsters";
import { TYPE_COLORS, typeIcon } from "../data/poltypes";
import { DEX_ORDER, SPECIES, STARTERS } from "../data/species";
import { ABILITIES } from "../data/abilities";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import { drawScreenHeader, wrapText, GREY, INK, PAPER } from "../ui/widgets";
import { zoneProgress } from "../data/dexzones";
import { VERSION_EXCLUSIVES, speciesAvailable } from "../game/version";
import { formsForSpecies } from "../game/memeForms";

// Specie di QUESTA versione non avvistabili sul campo (esclusive dell'altra
// fazione): ottenibili solo scambiando online. Tag azzurro per distinguerle.
const TRADE_ONLY = "#5aa0d8";

export class DexScene implements Scene {
  private index = 0;
  private detail = false;
  private scroll = 0;
  private formPage = false;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(): void {
    if (this.detail) {
      if (this.input.wasPressed("b")) {
        audio.cancel();
        this.detail = false;
        this.formPage = false;
        return;
      }
      if (this.input.wasPressed("a")) {
        const forms = formsForSpecies(DEX_ORDER[this.index], this.state.unlockedMemeForms);
        if (forms.length > 0) {
          this.formPage = !this.formPage;
          audio.confirm();
        } else {
          audio.cancel();
          this.detail = false;
        }
        return;
      }
      // Scorri tra le schede senza uscire: salta le specie mai viste (che non
      // hanno una scheda da mostrare). Sinistra/destra E su/giù, come i Pokédex.
      if (this.input.wasPressed("right") || this.input.wasPressed("down")) {
        this.stepDetail(1);
      } else if (this.input.wasPressed("left") || this.input.wasPressed("up")) {
        this.stepDetail(-1);
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
    // Nove righe: la decima schiacciava il messaggio che spiega davvero gli
    // scambi online, lasciando il giocatore con il solo ambiguo "SCAMBIO".
    const visibleRows = 8;
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

  // Passa alla scheda vista/catturata successiva (dir=1) o precedente (dir=-1),
  // saltando le specie sconosciute. Aggiorna anche index/scroll della lista,
  // così all'uscita il cursore è sulla specie che stavi guardando.
  private stepDetail(dir: 1 | -1): void {
    const n = DEX_ORDER.length;
    for (let step = 1; step < n; step += 1) {
      const i = (this.index + dir * step + n * step) % n;
      if (this.state.dex[DEX_ORDER[i]]) {
        this.index = i;
        this.formPage = false;
        const visibleRows = 8;
        this.scroll = Math.min(Math.max(this.scroll, i - visibleRows + 1), i);
        audio.cursor();
        return;
      }
    }
  }

  draw(screen: Screen): void {
    screen.clear("#efe6da");
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
    drawScreenHeader(screen, "POLITICDEX", `VISTI ${seen}  ELETTI ${caught}/${target}`);
    screen.panel(4, 18, VIEW_W - 8, VIEW_H - 22, "card");
    const visibleRows = 8;
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
        screen.rect(8, y - 3, VIEW_W - 16, 12, "#fff0bd");
        screen.rect(8, y - 3, 2, 12, "#e0a92f");
        screen.text("►", 10, y, "#8c5b12");
      }
      screen.text(`N.${String(species.dexNum).padStart(2, "0")}`, 18, y, GREY);
      screen.text(status ? species.name : "??????????", 52, y, status ? INK : GREY);
      // Specie esclusiva dell'ALTRA versione: si prende SOLO scambiando.
      const tradeOnly = VERSION_EXCLUSIVES[id] && !speciesAvailable(id, this.state.browserSeed);
      if (status === "caught") {
        screen.text("★", VIEW_W - 22, y, "#b04848");
      } else if (tradeOnly && status === "seen") {
        // Sintesi per riga; il footer dice esattamente come ottenerla.
        screen.text("ONLINE", VIEW_W - 54, y, TRADE_ONLY);
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
    // Riepilogo versione: quante specie restano ottenibili SOLO scambiando
    // (esclusive dell'altra fazione, non ancora catturate). Rende visibile il
    // sistema versioni e spinge allo scambio online.
    const tradeOnlyLeft = Object.keys(VERSION_EXCLUSIVES).filter(
      (id) => !speciesAvailable(id, this.state.browserSeed) && this.state.dex[id] !== "caught"
    ).length;
    const zoneY = tradeOnlyLeft > 0 ? VIEW_H - 49 : VIEW_H - 11;
    screen.textFit(`ZONE COMPLETE ${doneZones}/${zp.length}${hereTxt}`, 8, zoneY, 224, col);
    if (caught >= target) {
      screen.text("DEX COMPLETO! ORA SEI IL PALAZZO!", 12, VIEW_H - 21, "#e8c84a");
    } else if (tradeOnlyLeft > 0) {
      screen.text(`SERVONO ${tradeOnlyLeft} SCAMBI ONLINE`, 8, VIEW_H - 34, TRADE_ONLY);
      screen.text("VICINO: PARLA ► SCAMBIO", 8, VIEW_H - 23, TRADE_ONLY);
    }
  }

  private drawDetail(screen: Screen): void {
    const id = DEX_ORDER[this.index];
    const species = SPECIES[id];
    const forms = formsForSpecies(id, this.state.unlockedMemeForms);
    if (this.formPage && forms[0]) {
      this.drawFormPage(screen, id, forms[0]);
      return;
    }
    screen.clear("#efe6da");
    screen.panel(4, 4, VIEW_W - 8, VIEW_H - 8, "card");
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
      screen.textFit(`ABILITÀ: ${ability.name}`, 76, 54, VIEW_W - 76 - 8, "#e8c84a");
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
      for (let i = 0; i < Math.min(3, abLines.length); i += 1) {
        screen.text(abLines[i], 14, cy, GREY);
        cy += 10;
      }
    }
    // Esclusiva dell'altra versione: nel tuo mondo si ottiene SOLO scambiando.
    if (VERSION_EXCLUSIVES[id] && !speciesAvailable(id, this.state.browserSeed)) {
      screen.text("OTTENIBILE SOLO DA UN ALTRO", 14, cy, TRADE_ONLY);
      cy += 10;
      screen.text("GIOCATORE ONLINE", 14, cy, TRADE_ONLY);
      cy += 10;
      screen.text("VICINO: PARLA ► SCAMBIO", 14, cy, TRADE_ONLY);
      cy += 10;
      cy += 10;
    }
    if (this.state.dex[id] !== "caught") {
      screen.text("(Non ancora nella tua squadra)", 14, cy, GREY);
    }
    screen.text(forms.length > 0 ? "A: FORMA MEME   B: INDIETRO" : "◄►: SFOGLIA   A/B: INDIETRO", 14, VIEW_H - 16, forms.length > 0 ? "#a46b12" : GREY);
  }

  private drawFormPage(screen: Screen, speciesId: string, form: ReturnType<typeof formsForSpecies>[number]): void {
    screen.clear("#10141f");
    screen.panel(4, 4, VIEW_W - 8, VIEW_H - 8, "card");
    drawMonsterSprite(screen, speciesId, MONSTER_ART[speciesId], 12, 17, 58, 54, { memeFormId: form.id });
    screen.text("FORMA MEME", 80, 15, form.accent);
    screen.textFit(form.name, 80, 29, 150, INK);
    screen.text(form.season, 80, 43, GREY);
    screen.text(`BONUS ${form.stat.toUpperCase()} +${form.statPercent}%`, 80, 57, "#26745d");
    screen.text("PROVENIENZA", 14, 84, "#a46b12");
    let y = 98;
    for (const line of wrapText(form.provenance, 34).slice(0, 3)) {
      screen.text(line, 14, y, INK);
      y += 10;
    }
    screen.text(`ARCHIVIO: ${form.sourceId.toUpperCase()}`, 14, 137, GREY);
    screen.text("STESSO NUMERO DEX", 14, 149, form.accent);
    screen.text("A: SCHEDA BASE   B: INDIETRO", 14, VIEW_H - 16, GREY);
  }
}
