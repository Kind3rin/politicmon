import { drawMonsterSprite } from "../art/monsters";
import { TYPE_ORDER, type PolType } from "../data/poltypes";
import { DEX_ORDER, SPECIES, STARTERS } from "../data/species";
import { ABILITIES } from "../data/abilities";
import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { TouchAction } from "../engine/touchActions";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import type { GameState } from "../game/state";
import { drawScreenHeader, wrapText, GREY, INK } from "../ui/widgets";
import { zoneProgress } from "../data/dexzones";
import { formsForSpecies } from "../game/memeForms";
import { runtimeFeatures } from "../game/features";
import { defensiveMatchups, dexAcquisitionNotes, dexSummary, dexMatches, DEX_FILTERS, DEX_FILTER_LABELS, evolutionCondition, reachableDexMaps, type DexFilter } from "../game/dexGuide";

const PAGES = ["BIO", "STAT", "TIPI", "DOVE", "EVO"];
export class DexScene implements Scene {
  private index = 0;
  private detail = false;
  private scroll = 0;
  private page = -1;
  private textScroll = 0;
  private filter: DexFilter = "seen";
  private typeFilter: PolType | null = null;
  private time = 0;
  private reachable: Set<string>;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.reachable = reachableDexMaps(state, runtimeFeatures());
    if (!this.ids().length) this.filter = "all";
    this.selectFirst();
  }

  get touchActions(): readonly TouchAction[] {
    const detail = this.detail, page = this.page, id = DEX_ORDER[this.index];
    const action = (label: string, run: () => void, disabled = false): TouchAction => ({ label, disabled, run: () => {
      if (disabled || this.stack.top !== this || this.detail !== detail || this.page !== page || DEX_ORDER[this.index] !== id) return;
      this.input.reset(); audio.cursor(); run();
    } });
    const inspect = (page: number) => { this.page = page; this.textScroll = 0; };
    if (detail) return [action("HABITAT", () => inspect(3)), action("EVOLUZIONI / MOSSE", () => inspect(4), !this.state.dex[id]),
      action("DIFESE", () => inspect(2), !this.state.dex[id]), action(page === 0 ? "STATISTICHE" : "STORIA", () => inspect(page === 0 ? 1 : 0), !this.state.dex[id]),
      action("FORME MEME", () => inspect(page >= 5 ? 5 + (page - 4) % formsForSpecies(id, this.state.unlockedMemeForms).length : 5), !formsForSpecies(id, this.state.unlockedMemeForms).length),
      action(page < 0 ? "LISTA" : "SCHEDA", () => { if (page < 0) this.detail = false; else inspect(-1); })];
    const filter = (value: DexFilter) => { this.filter = value; this.selectFirst(); };
    return [action("SCHEDA", () => { this.detail = true; inspect(-1); }, !this.ids().length),
      action(this.filter === "all" ? "VISTI" : "TUTTI", () => filter(this.filter === "all" ? "seen" : "all")),
      action("QUI", () => filter("here")), action("MANCANTI", () => filter("missing")),
      action("TIPO", () => { const types: Array<PolType | null> = [null, ...TYPE_ORDER]; this.typeFilter = types[(types.indexOf(this.typeFilter) + 1) % types.length]; this.selectFirst(); }),
      action("ESCI", () => this.stack.pop())];
  }

  private ids(): string[] {
    return DEX_ORDER.filter((id) => dexMatches(id, this.filter, this.state) && (!this.typeFilter || (!!this.state.dex[id] && SPECIES[id].types.includes(this.typeFilter))));
  }

  update(dt = 0): void {
    if (!this.state.reduceEffects) this.time += dt;
    const ids = this.ids();
    if (this.detail) {
      const tap = this.input.consumeTap();
      if (this.page >= 0 && tap && tap.x >= 12 && tap.x < 227 && tap.y >= 65 && tap.y < 76) {
        this.input.clearTap(); this.page = Math.floor((tap.x - 12) / 43); this.textScroll = 0; audio.cursor(); return;
      }
      if (this.input.wasPressed("b") && this.page >= 0) { this.page = -1; this.textScroll = 0; audio.cancel(); return; }
      if (this.input.wasPressed("b")) {
        this.detail = false;
        const i = ids.indexOf(DEX_ORDER[this.index]);
        this.scroll = Math.max(0, Math.min(this.scroll, i));
        if (i >= this.scroll + 7) this.scroll = i - 6;
        audio.cancel(); return;
      }
      if (this.input.wasPressed("a")) {
        this.page = this.state.dex[DEX_ORDER[this.index]] ? (this.page + 1) % this.pageCount() : 3; this.textScroll = 0; audio.cursor(); return;
      }
      const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
      if (dir && ids.length) {
        const i = ids.indexOf(DEX_ORDER[this.index]);
        this.index = DEX_ORDER.indexOf(ids[(i + dir + ids.length) % ids.length]);
        this.page = -1; this.textScroll = 0; audio.cursor(); return;
      }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      if (delta) { this.textScroll = Math.max(0, Math.min(this.lines().length - 7, this.textScroll + delta)); audio.cursor(); }
      return;
    }
    const tap = this.input.consumeTap();
    if (tap && tap.x >= 8 && tap.x < 232 && tap.y >= 36 && tap.y < 120) {
      const id = ids[this.scroll + Math.floor((tap.y - 36) / 12)];
      if (id) { this.input.clearTap(); const selected = DEX_ORDER[this.index] === id; this.index = DEX_ORDER.indexOf(id); if (selected) { this.detail = true; this.page = -1; this.textScroll = 0; } audio.cursor(); return; }
    }
    if (this.input.wasPressed("b")) { audio.cancel(); this.stack.pop(); return; }
    const filterDir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
    if (filterDir) {
      this.filter = DEX_FILTERS[(DEX_FILTERS.indexOf(this.filter) + filterDir + DEX_FILTERS.length) % DEX_FILTERS.length];
      this.selectFirst(); audio.cursor(); return;
    }
    if (this.input.wasPressed("start")) {
      const types: Array<PolType | null> = [null, ...TYPE_ORDER];
      this.typeFilter = types[(types.indexOf(this.typeFilter) + 1) % types.length];
      this.selectFirst(); audio.cursor(); return;
    }
    const dir = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
    if (dir && ids.length) {
      const i = ids.indexOf(DEX_ORDER[this.index]);
      this.index = DEX_ORDER.indexOf(ids[(i + dir + ids.length) % ids.length]); audio.cursor();
    }
    const i = ids.indexOf(DEX_ORDER[this.index]);
    this.scroll = Math.max(0, Math.min(this.scroll, i));
    if (i >= this.scroll + 7) this.scroll = i - 6;
    if (this.input.wasPressed("a") && ids.length) {
      this.detail = true; this.page = -1; this.textScroll = 0; audio.confirm();
    }
  }

  private selectFirst(): void {
    const first = this.ids()[0]; if (first) this.index = DEX_ORDER.indexOf(first); this.scroll = 0;
  }
  private pageCount(): number { return 5 + formsForSpecies(DEX_ORDER[this.index], this.state.unlockedMemeForms).length; }

  private lines(): string[] {
    const id = DEX_ORDER[this.index]; const s = SPECIES[id];
    if (this.page < 0) return dexSummary(id, this.state, this.reachable).flatMap(note => wrapText(note, 35));
    const seen = !!this.state.dex[id]; const ability = s.ability ? ABILITIES[s.ability] : undefined;
    const notes: string[] = [];
    if (!seen && this.page !== 3) notes.push("AVVISTA QUESTA SPECIE PER APRIRE IL DOSSIER. LA SCHEDA DOVE TI AIUTA A CERCARLA.");
    else if (this.page === 0) {
      notes.push(s.dexLine, "");
      notes.push(ability ? `ABILITÀ: ${ability.name}. ${ability.desc}` : "NESSUNA ABILITÀ PASSIVA.");
    } else if (this.page === 1) {
      notes.push("VALORI BASE, NON STATISTICHE DEL SINGOLO ESEMPLARE.", `CONSENSO (PV): ${s.base.hp}`, `GRINTA (FISICO): ${s.base.atk}`, `FACCIA TOSTA (DIFESA): ${s.base.def}`, `RETORICA (SPECIALE): ${s.base.spc}`, `VELOCITÀ: ${s.base.spd}`);
      if (s.specialDefense !== undefined) notes.push(`DIFESA SPECIALE FISSA: ${s.specialDefense}`);
      notes.push("LE SPECIALI USANO FACCIA TOSTA IN DIFESA, SALVO ECCEZIONI.");
    } else if (this.page === 2) {
      notes.push("DANNO SUBITO PER TIPO:");
      for (const m of defensiveMatchups(id)) notes.push(`${m.type}: x${m.mult.toFixed(2).replace(/0$/, "")} ${m.mult > 1 ? "DEBOLE" : m.mult < 1 ? "RESISTE" : "NEUTRO"}`);
      notes.push("SONDAGGI, ABILITÀ E OGGETTI POSSONO MODIFICARE IL DANNO.");
    } else if (this.page === 3) notes.push(...dexAcquisitionNotes(id, this.state, this.reachable));
    else if (this.page === 4) {
      if (s.evolutions?.length) for (const [i, rule] of s.evolutions.entries()) notes.push(`${SPECIES[rule.id].name}: ${evolutionCondition(rule, s.evolutions.slice(0, i))}.`);
      else notes.push("FORMA FINALE: NESSUNA EVOLUZIONE.");
      notes.push("", "MOSSE APPRESE PER LIVELLO:");
      for (const [lv, move] of s.learnset) notes.push(`LV ${lv}: ${MOVES[move].name}`);
    } else {
      const form = formsForSpecies(id, this.state.unlockedMemeForms)[this.page - 5];
      if (form) notes.push(form.name, form.season, `BONUS ${form.stat.toUpperCase()} +${form.statPercent}%`, form.provenance, `ARCHIVIO: ${form.sourceId.toUpperCase()}`, "STESSO NUMERO DEX.");
    }
    return notes.flatMap((note) => note ? wrapText(note, 35) : [""]);
  }

  draw(screen: Screen): void {
    screen.clear("#101b32");
    if (this.detail) { this.drawDetail(screen); return; }
    const seen = DEX_ORDER.filter((id) => this.state.dex[id]).length;
    const caught = DEX_ORDER.filter((id) => this.state.dex[id] === "caught").length;
    const target = DEX_ORDER.length - STARTERS.filter((s) => s !== this.state.starterId).length;
    drawScreenHeader(screen, "POLITICDEX", `VISTI ${seen}  ELETTI ${caught}/${target}`);
    screen.panel(4, 18, 232, 158, "card");
    screen.text(`◄ ${DEX_FILTER_LABELS[this.filter]} ►`, 12, 24, "#8c5b12");
    screen.textRight(this.typeFilter ?? "OGNI TIPO", 226, 24, GREY);
    const ids = this.ids();
    for (let row = 0; row < 7; row++) {
      const id = ids[this.scroll + row]; if (!id) break;
      const s = SPECIES[id]; const status = this.state.dex[id]; const y = 39 + row * 12;
      if (id === DEX_ORDER[this.index]) { screen.rect(8, y - 2, 224, 11, "#fff0bd"); screen.text("►", 10, y, "#8c5b12"); }
      screen.text(`N.${String(s.dexNum).padStart(2, "0")}`, 20, y, GREY);
      screen.textFit(status ? s.name : "??????????", 54, y, 153, status ? INK : GREY);
      screen.text(status === "caught" ? "★" : status === "seen" ? "•" : "?", 218, y, status === "caught" ? "#b04848" : GREY);
    }
    if (!ids.length) { screen.text("NESSUNA SPECIE NEL FILTRO", 18, 68, GREY); screen.text("START: CAMBIA IL TIPO", 18, 82, GREY); }
    const zones = zoneProgress(this.state.dex, this.state.flags, this.state.browserSeed);
    const here = zones.find((p) => p.zone.id === this.state.pos.mapId);
    screen.textFit(here ? `${here.zone.name}: ${here.caught}/${here.total}  PREMIO ${here.zone.reward.money}€` : `ZONE COMPLETE ${zones.filter((p) => p.done).length}/${zones.length}`, 12, 129, 214, "#26745d");
    screen.textFit(`${ids.length} SPECIE  •  ${this.typeFilter ? "TIPI GIÀ AVVISTATI" : "DOVE MOSTRA I PERCORSI APERTI"}`, 12, 142, 214, GREY);
    screen.text("A: SCHEDA   START: FILTRA TIPO", 12, 155, INK);
    screen.text("◄►: FILTRO   SU/GIU: LISTA   B: ESCI", 12, 166, GREY);
  }

  private drawDetail(screen: Screen): void {
    const id = DEX_ORDER[this.index], species = SPECIES[id], seen = Boolean(this.state.dex[id]);
    const form = formsForSpecies(id, this.state.unlockedMemeForms)[this.page - 5];
    drawScreenHeader(screen, "POLITICDEX");
    screen.rect(6, 20, 228, 59, "#101b32"); screen.frame(6, 20, 228, 59, "#d3a745");
    if (seen) drawMonsterSprite(screen, id, 10, 29, 54, 45, { memeFormId: form?.id, animationTime: this.time });
    else screen.text("?", 30, 38, "#b7cedc", 3);
    screen.textFit(`N.${String(species.dexNum).padStart(2, "0")} ${seen ? species.name : "DA SCOPRIRE"}`, 76, 30, 150, "#fff3cc");
    screen.text(this.state.dex[id] === "caught" ? "★ ELETTO" : seen ? "• AVVISTATO" : "? MAI VISTO", 76, 49, "#79ddba");
    screen.panel(6, 82, 228, 83, "card");
    if (this.page < 0) {
      dexSummary(id, this.state, this.reachable).forEach((line, i) => wrapText(line, 35).slice(0, 2).forEach((part, j) => screen.text(part, 14, 89 + i * 18 + j * 8, INK)));
      screen.text(seen ? "A: STORIA  ◄►: SPECIE  B: LISTA" : "A: HABITAT  ◄►: SPECIE  B: LISTA", 8, 169, "#fff3cc");
      return;
    }
    for (const [i, label] of PAGES.entries()) {
      if (this.page === i) screen.rect(12 + i * 43, 65, 40, 11, "#fff0bd");
      screen.text(label, 15 + i * 43, 67, this.page === i ? INK : "#b7cedc");
    }
    const lines = this.lines();
    lines.slice(this.textScroll, this.textScroll + 7).forEach((line, i) => screen.text(line, 14, 89 + i * 9, INK));
    screen.text(lines.length > 7 ? `SU/GIU: TESTO ${this.textScroll + 1}/${lines.length - 6}` : "DETTAGLI SU RICHIESTA", 14, 153, GREY);
    screen.textRight(`${this.page + 1}/${this.pageCount()}`, 226, 153, "#8c5b12");
    screen.text("A: PAGINA  ◄►: SPECIE  B: SCHEDA", 8, 169, "#fff3cc");
  }
}
