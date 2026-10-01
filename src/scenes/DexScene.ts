import { drawMonsterSprite } from "../art/monsters";
import { TYPE_ORDER, type PolType } from "../data/poltypes";
import { DEX_ORDER, SPECIES, STARTERS } from "../data/species";
import { ABILITIES } from "../data/abilities";
import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import type { GameState } from "../game/state";
import { drawScreenHeader, wrapText, GREY, INK } from "../ui/widgets";
import { zoneProgress } from "../data/dexzones";
import { formsForSpecies } from "../game/memeForms";
import { runtimeFeatures } from "../game/features";
import { defensiveMatchups, dexAcquisitionNotes, dexMatches, DEX_FILTERS, DEX_FILTER_LABELS, evolutionCondition, reachableDexMaps, type DexFilter } from "../game/dexGuide";

const PAGES = ["BIO", "STAT", "TIPI", "DOVE", "EVO"];
export class DexScene implements Scene {
  private index = 0;
  private detail = false;
  private scroll = 0;
  private page = 0;
  private textScroll = 0;
  private filter: DexFilter = "all";
  private typeFilter: PolType | null = null;
  private time = 0;
  private reachable: Set<string>;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.reachable = reachableDexMaps(state, runtimeFeatures());
  }

  private ids(): string[] {
    return DEX_ORDER.filter((id) => dexMatches(id, this.filter, this.state) && (!this.typeFilter || (!!this.state.dex[id] && SPECIES[id].types.includes(this.typeFilter))));
  }

  update(dt = 0): void {
    if (!this.state.reduceEffects) this.time += dt;
    const ids = this.ids();
    if (this.detail) {
      if (this.input.wasPressed("b")) {
        this.detail = false;
        const i = ids.indexOf(DEX_ORDER[this.index]);
        this.scroll = Math.max(0, Math.min(this.scroll, i));
        if (i >= this.scroll + 7) this.scroll = i - 6;
        audio.cancel(); return;
      }
      if (this.input.wasPressed("a")) {
        this.page = (this.page + 1) % this.pageCount(); this.textScroll = 0; audio.cursor(); return;
      }
      const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
      if (dir && ids.length) {
        const i = ids.indexOf(DEX_ORDER[this.index]);
        this.index = DEX_ORDER.indexOf(ids[(i + dir + ids.length) % ids.length]);
        this.page = Math.min(this.page, this.pageCount() - 1); this.textScroll = 0; audio.cursor(); return;
      }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      if (delta) { this.textScroll = Math.max(0, Math.min(this.lines().length - 7, this.textScroll + delta)); audio.cursor(); }
      return;
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
      this.detail = true; this.page = this.state.dex[DEX_ORDER[this.index]] ? 0 : 3; this.textScroll = 0; audio.confirm();
    }
  }

  private selectFirst(): void {
    const first = this.ids()[0]; if (first) this.index = DEX_ORDER.indexOf(first); this.scroll = 0;
  }
  private pageCount(): number { return 5 + formsForSpecies(DEX_ORDER[this.index], this.state.unlockedMemeForms).length; }

  private lines(): string[] {
    const id = DEX_ORDER[this.index]; const s = SPECIES[id];
    const seen = !!this.state.dex[id]; const ability = s.ability ? ABILITIES[s.ability] : undefined;
    const notes: string[] = [];
    if (!seen && this.page !== 3) notes.push("AVVISTA QUESTA SPECIE PER APRIRE IL DOSSIER. LA SCHEDA DOVE TI AIUTA A CERCARLA.");
    else if (this.page === 0) {
      notes.push(s.dexLine, "");
      notes.push(ability ? `ABILITÀ: ${ability.name}. ${ability.desc}` : "NESSUNA ABILITÀ PASSIVA.");
    } else if (this.page === 1) {
      notes.push("VALORI BASE, NON STATISTICHE DEL SINGOLO ESEMPLARE.", `CONSENSO (PV): ${s.base.hp}`, `GRINTA (FISICO): ${s.base.atk}`, `FACCIA TOSTA (DIFESA): ${s.base.def}`, `RETORICA (SPECIALE): ${s.base.spc}`, `OPPORTUNISMO (VELOCITÀ): ${s.base.spd}`);
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
    screen.clear("#efe6da");
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
    const id = DEX_ORDER[this.index]; const s = SPECIES[id]; const seen = !!this.state.dex[id];
    const forms = formsForSpecies(id, this.state.unlockedMemeForms); const form = forms[this.page - 5];
    screen.panel(4, 4, 232, 172, "card");
    if (seen) drawMonsterSprite(screen, id, 12, 12, 54, 43, { memeFormId: form?.id, animationTime: this.time });
    else screen.text("?", 30, 27, GREY, 3);
    screen.textFit(`N.${String(s.dexNum).padStart(2, "0")} ${seen ? s.name : "SCONOSCIUTO"}`, 76, 13, 150, INK);
    screen.textFit(seen ? s.category : "DOSSIER DA APRIRE", 76, 25, 150, GREY);
    screen.textFit(seen ? s.types.join(" / ") : "TIPI NON NOTI", 76, 37, 150, "#8c5b12");
    screen.text(this.state.dex[id] === "caught" ? "★ ELETTO" : seen ? "• AVVISTATO" : "? MAI VISTO", 76, 49, "#26745d");
    for (const [i, label] of PAGES.entries()) {
      screen.rect(12 + i * 43, 61, 40, 11, this.page === i ? "#fff0bd" : "#ece4d5");
      screen.text(label, 15 + i * 43, 63, this.page === i ? "#8c5b12" : GREY);
    }
    const lines = this.lines();
    for (const [i, line] of lines.slice(this.textScroll, this.textScroll + 7).entries()) screen.text(line, 14, 79 + i * 10, INK);
    screen.text(lines.length > 7 ? `SU/GIU: TESTO ${this.textScroll + 1}/${lines.length - 6}` : form ? "FORMA MEME SBLOCCATA" : "DOSSIER DI CAMPO", 14, 151, GREY);
    screen.textRight(`${this.page + 1}/${this.pageCount()}`, 226, 151, "#8c5b12");
    screen.text("A: PAGINA  ◄►: SPECIE  B: LISTA", 14, 164, GREY);
  }
}
