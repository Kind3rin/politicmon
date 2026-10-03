import { drawMonsterSprite } from "../art/monsters";
import { MOVES, STATUS_LABELS, moveSummary } from "../data/moves";
import { ITEMS } from "../data/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { abilityOf, canLearnMove, heldItemOf, evolve, levelEvolution, speciesOf, statsOf, type Monster } from "../game/monster";
import { markCaught, markSeen, saveGame } from "../game/state";
import type { TouchAction } from "../engine/touchActions";
import { careerNotes } from "../game/evolutionGuide";
import { defensiveMatchups } from "../game/dexGuide";
import { EvolutionScene } from "./EvolutionScene";
import { RecallScene } from "./RecallScene";
import { archivedMoves } from "../game/moveArchive";
import type { GameState } from "../game/state";
import { drawHpBar, drawScreenHeader, wrapText, GREY, INK, PAPER } from "../ui/widgets";

export interface PartyOptions {
  mode: "view" | "battle-switch" | "forced-switch" | "use-item";
  currentUid?: string;
  title?: string; // intestazione personalizzata (es. nomina di un ministro)
  // Quando si sta usando una DIRETTIVA: marca chi può impararla (✓/✗ in lista).
  directiveMoveId?: string;
  // Squadra alternativa (es. i MIRROR del DUELLO PvP): la scena opera su
  // questa lista invece di state.party, che resta intoccato.
  partyOverride?: Monster[];
  onInspect?: (mon: Monster) => void;
  freeSwitch?: boolean;
  onChoose?: (mon: Monster) => void;
}

export class PartyScene implements Scene {
  get expandedViewport(): boolean { return this.opts.mode === "view"; }
  get touchLayout(): "growth" | undefined { return this.opts.mode === "view" ? "growth" : undefined; }
  private index = 0;
  private summary: Monster | null = null;
  private moveFrom: number | null = null; // slot "preso" per lo scambio (mode view)
  // Cursore nel DETTAGLIO: scorre le voci ispezionabili (mosse + abilità) per
  // mostrarne la descrizione in basso. -1 = nessuna selezione (vista neutra).
  private detailIndex = 0;
  private summaryPage = 0;
  private summaryScroll = 0;
  private time = 0;
  private visibleLines = 7;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: PartyOptions
  ) {
    if (opts.mode === "battle-switch" || opts.mode === "forced-switch") {
      this.index = Math.max(0, (opts.partyOverride ?? state.party).findIndex(mon => mon.hp > 0 && mon.uid !== opts.currentUid));
    }
  }

  private chooseSwitch(mon: Monster): void {
    if (this.stack.top !== this || !(this.opts.partyOverride ?? this.state.party).includes(mon) || mon.hp <= 0 || mon.uid === this.opts.currentUid) return;
    this.input.reset(); audio.confirm(); this.stack.pop(); this.opts.onChoose?.(mon);
  }

  private openEvolution(mon: Monster): void {
    const target = levelEvolution(mon, this.state.sondaggi);
    if (!target || this.opts.partyOverride) return;
    this.stack.push(new EvolutionScene(this.stack, this.input, mon.speciesId, target, () => {
      evolve(mon, target); markSeen(this.state, target); markCaught(this.state, target); saveGame(this.state); this.summaryScroll = 0;
    }, { mon, reduceEffects: this.state.reduceEffects, battleSpeed: this.state.battleSpeed }));
  }
  private nextCandidate(): void {
    const party = this.opts.partyOverride ?? this.state.party;
    this.index = (this.index + 1) % party.length;
    this.summary = party[this.index]; this.detailIndex = 0; this.summaryScroll = 0;
  }
  get touchActions(): readonly TouchAction[] | undefined {
    const mon = this.summary;
    if (!mon && (this.opts.mode === "battle-switch" || this.opts.mode === "forced-switch")) {
      const bench = (this.opts.partyOverride ?? this.state.party).filter(target => target.uid !== this.opts.currentUid);
      return [...Array.from({ length: 5 }, (_, i): TouchAction => {
        const target = bench[i];
        return { label: target ? speciesOf(target).name : "—", hint: target ? `LV${target.level} · PV ${target.hp}/${statsOf(target).hp} · ${target.hp <= 0 ? "KO" : (this.opts.freeSwitch || this.opts.mode === "forced-switch") ? "rimpasto gratis" : "nemico risponde"}` : "Nessun candidato",
          disabled: !target || target.hp <= 0, run: () => { if (target) this.chooseSwitch(target); } };
      }), { label: "INDIETRO", hint: this.opts.mode === "forced-switch" ? "Scegli chi continua la lotta" : "Resti in campo · nessun turno speso", disabled: this.opts.mode === "forced-switch", run: () => {
        if (this.stack.top !== this || this.opts.mode === "forced-switch") return;
        this.input.reset(); audio.cancel(); this.stack.pop();
      } }];
    }
    if (!mon && this.opts.mode === "view") {
      const party = this.opts.partyOverride ?? this.state.party, page = Math.floor(this.index / 4);
      const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled, run: () => {
        if (disabled || this.stack.top !== this || this.summary || this.opts.mode !== "view" || Math.floor(this.index / 4) !== page) return;
        this.input.reset(); audio.confirm(); run();
      } });
      return [...Array.from({ length: 4 }, (_, i) => {
        const index = page * 4 + i, target = party[index];
        return action(target ? speciesOf(target).name : "—", target ? `LV${target.level} · PV ${target.hp}/${statsOf(target).hp}` : "Nessun candidato", () => {
          this.index = index; this.summary = target; this.summaryPage = 0; this.summaryScroll = 0;
        }, !target);
      }), action("ALTRI", "Altra pagina della squadra", () => { this.index = ((page + 1) * 4) % party.length; }, party.length <= 4),
        action("ESCI", "Torna alla pausa", () => this.stack.pop())];
    }
    if (!mon) return undefined;
    const page = this.summaryPage, party = this.opts.partyOverride ?? this.state.party;
    const action = (label: string, run: () => void, disabled = false, hint?: string): TouchAction => ({ label, hint, disabled, run: () => {
      if (disabled || this.stack.top !== this || this.summary !== mon || this.summaryPage !== page) return;
      this.input.reset(); audio.confirm(); run();
    } });
    const profile = () => { this.summaryPage = 0; this.summaryScroll = 0; };
    if (page === 1) return [...Array.from({ length: 4 }, (_, i) => {
      const slot = mon.moves[i], move = slot && MOVES[slot.id];
      return action(move?.name ?? "—", () => { this.detailIndex = i; this.summaryScroll = 0; }, !move, move ? `${move.type} · PP ${slot.pp}/${move.pp}` : "Slot libero");
    }), action("SCORRI", () => { const end = Math.max(0, this.summaryLines(mon).length - this.visibleLines); this.summaryScroll = this.summaryScroll < end ? this.summaryScroll + 1 : 0; }, this.summaryLines(mon).length <= this.visibleLines), action("PROFILO", profile)];
    if (page !== 0) return [action("PROFILO", profile), action("MOSSE", () => { this.summaryPage = 1; this.summaryScroll = 0; }),
      action("CARRIERA", () => { this.summaryPage = 3; this.summaryScroll = 0; }, page === 3),
      action("SCORRI", () => { const end = Math.max(0, this.summaryLines(mon).length - this.visibleLines); this.summaryScroll = this.summaryScroll < end ? this.summaryScroll + 1 : 0; }, this.summaryLines(mon).length <= this.visibleLines),
      action("EVOLVI", () => this.openEvolution(mon), !levelEvolution(mon, this.state.sondaggi) || !!this.opts.partyOverride),
      action("CANDIDATO", () => this.nextCandidate(), party.length <= 1, "Scheda successiva")];
    return [action("EVOLVI", () => this.openEvolution(mon), !levelEvolution(mon, this.state.sondaggi) || !!this.opts.partyOverride),
      action("MOSSE", () => { this.summaryPage = 1; }), action("DATI", () => { this.summaryPage = 2; }),
      action("ARCHIVIO", () => this.stack.push(new RecallScene(this.stack, this.input, this.state, mon)), this.opts.mode !== "view" || !!this.opts.partyOverride || !archivedMoves(mon).length),
      action("DIFESE", () => { this.summaryPage = 4; }), action("SQUADRA", () => { this.summary = null; })];
  }
  update(dt = 0): void {
    if (!this.state.reduceEffects) this.time += dt;
    const party = this.opts.partyOverride ?? this.state.party;
    if (this.summary) {
      const mon = this.summary;
      if (this.input.wasPressed("b")) { audio.cancel(); this.summary = null; return; }
      if (this.input.wasPressed("a")) { this.summaryPage = (this.summaryPage + 1) % 6; this.summaryScroll = 0; audio.cursor(); return; }
      const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
      if (dir && party.length > 1) {
        this.index = (this.index + dir + party.length) % party.length;
        this.summary = party[this.index]; this.detailIndex = 0; this.summaryScroll = 0; audio.cursor(); return;
      }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      if (delta) { this.summaryScroll = Math.max(0, Math.min(Math.max(0, this.summaryLines(mon).length - this.visibleLines), this.summaryScroll + delta)); audio.cursor(); return; }
      if (this.input.wasPressed("start")) {
        if (this.summaryPage === 5 && this.opts.mode === "view" && !this.opts.partyOverride) {
          this.stack.push(new RecallScene(this.stack, this.input, this.state, mon)); audio.confirm(); return;
        }
        if (this.summaryPage === 1) { this.detailIndex = (this.detailIndex + 1) % Math.max(1, mon.moves.length); this.summaryScroll = 0; audio.cursor(); return; }
        if (this.summaryPage === 3 && !this.opts.partyOverride) {
          this.openEvolution(mon); return;
        }
        if (this.summaryPage === 0 && !this.opts.partyOverride) {
          const held = heldItemOf({ ...mon });
          if (held) { delete mon.heldItem; this.state.bag[held.id] = (this.state.bag[held.id] ?? 0) + 1; saveGame(this.state); audio.confirm(); this.summaryScroll = 0; return; }
        }
        audio.cancel();
      }
      return;
    }
    if (this.opts.onInspect && this.input.wasPressed("start")) {
      const mon = party[this.index];
      if (!mon || mon.hp <= 0 || mon.uid === this.opts.currentUid) { audio.cancel(); return; }
      audio.confirm(); this.opts.onInspect(mon); return;
    }
    // Riordino squadra (solo nel menu PARTY): START prende lo slot, START su un
    // altro lo scambia. Il primo della lista combatte per primo.
    if (this.opts.mode === "view" && this.input.wasPressed("start") && party.length > 1) {
      if (this.moveFrom === null) {
        this.moveFrom = this.index;
        audio.confirm();
      } else if (this.moveFrom === this.index) {
        this.moveFrom = null;
        audio.cancel();
      } else {
        const tmp = party[this.moveFrom];
        party[this.moveFrom] = party[this.index];
        party[this.index] = tmp;
        this.moveFrom = null;
        audio.confirm();
        saveGame(this.state);
      }
      return;
    }
    if (this.input.wasPressed("up")) {
      this.index = (this.index + party.length - 1) % party.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % party.length;
      audio.cursor();
    }
    if (this.input.wasPressed("b")) {
      // In modalità "sposta" B annulla lo spostamento invece di uscire.
      if (this.moveFrom !== null) {
        this.moveFrom = null;
        audio.cancel();
        return;
      }
      if (this.opts.mode !== "forced-switch") {
        audio.cancel();
        this.stack.pop();
        return;
      }
    }
    if (this.input.wasPressed("a")) {
      const mon = party[this.index];
      if (!mon) {
        return;
      }
      if (this.opts.mode === "view") {
        audio.confirm();
        this.moveFrom = null;
        this.detailIndex = 0;
        this.summary = mon;
        this.summaryPage = 0; this.summaryScroll = 0;
        return;
      }
      if (this.opts.mode === "battle-switch" || this.opts.mode === "forced-switch") {
        this.chooseSwitch(mon);
        return;
      }
      if (this.opts.mode === "use-item") {
        audio.confirm();
        this.stack.pop();
        this.opts.onChoose?.(mon);
      }
    }
  }

  draw(screen: Screen): void {
    screen.clear("#101b32");
    if (this.summary) {
      this.drawSummary(screen, this.summary);
      return;
    }
    drawScreenHeader(screen,
      this.opts.title ??
        (this.opts.mode === "forced-switch"
          ? "Scegli il prossimo candidato!"
          : this.opts.mode === "use-item"
            ? "Su chi lo usi?"
            : "LA TUA SQUADRA")
    );
    const party = this.opts.partyOverride ?? this.state.party;
    const rowH = this.opts.mode === "view" ? Math.min(72, Math.floor((screen.height - 34) / Math.max(4, party.length))) : 23;
    for (let i = 0; i < party.length; i += 1) {
      const mon = party[i];
      const y = 16 + i * rowH, h = rowH - 1;
      const selected = i === this.index;
      const picked = i === this.moveFrom;
      screen.rect(4, y, VIEW_W - 8, h, selected ? "#fff0bd" : "#263954");
      screen.rect(4, y, 3, h, selected ? "#e0a92f" : "#7aa2b8");
      if (picked) {
        // Slot "preso" per lo scambio: cornice gialla evidente.
        screen.frame(4, y, VIEW_W - 8, h, "#f0c040");
        screen.frame(5, y + 1, VIEW_W - 10, h - 2, "#f0c040");
      } else if (selected) {
        screen.frame(4, y, VIEW_W - 8, h, this.moveFrom !== null ? "#f0c040" : INK);
      }
      // Mini-sprite nello slot lista (box 26x21, ancorato in basso).
      const portraitW = rowH > 30 ? 48 : 26, nameX = portraitW + 10;
      drawMonsterSprite(screen, mon.speciesId, 6, y + 1, portraitW, h - 2, { memeFormId: mon.memeFormId });
      const ink = selected ? INK : "#fff3cc";
      screen.text(speciesOf(mon).name, nameX, y + 3, ink);
      screen.textRight(`L${mon.level}`, VIEW_W - 64, y + 3, ink);
      drawHpBar(screen, nameX, y + h - 9, 70, mon.hp, statsOf(mon).hp);
      screen.textRight(`${mon.hp}/${statsOf(mon).hp}`, VIEW_W - 14, y + h - 9, ink);
      if (rowH > 30) screen.textFit(levelEvolution(mon, this.state.sondaggi) ? "EVOLUZIONE PRONTA" : speciesOf(mon).types.join("/"), nameX, y + 17, 150, selected ? "#26745d" : "#b7cedc");
      // Compatibilità con la direttiva in uso: chi può impararla è evidenziato.
      if (this.opts.directiveMoveId) {
        const ok = canLearnMove(mon, this.opts.directiveMoveId);
        const tag = ok ? "OK" : "NO";
        screen.rect(VIEW_W - 32, y + 2, 17, 9, ok ? "#3a8c4a" : "#5a5a5a");
        screen.text(tag, VIEW_W - 30, y + 3, PAPER);
      } else if (mon.status) {
        screen.rect(VIEW_W - 32, y + 2, 17, 9, "#b04848");
        screen.text(STATUS_LABELS[mon.status], VIEW_W - 31, y + 3, PAPER);
      }
      if (mon.hp <= 0) {
        screen.text("KO", VIEW_W - 56, y + 3, "#d04848");
      }
    }
    if (this.opts.onInspect) {
      const mon = party[this.index];
      screen.text(mon?.uid === this.opts.currentUid ? "GIA IN CAMPO" : mon?.hp === 0 ? "CANDIDATO KO" : (this.opts.freeSwitch || this.opts.mode === "forced-switch") ? "RIMPASTO GRATIS" : "CAMBIO: TURNO AL NEMICO", 8, 156, "#fff3cc");
      screen.text(this.opts.mode === "forced-switch" ? "A: CAMBIA START: DOSSIER" : "A: CAMBIA START: DOSSIER B: TORNA", 8, VIEW_H - 10, "#59657d");
      return;
    }
    const hint = this.opts.mode !== "view"
      ? "A: scegli"
      : this.moveFrom !== null
        ? "START: scambia qui  B: annulla"
        : "A: dettagli  START: sposta  B: chiudi";
    screen.text(screen.height > 180 ? "SCEGLI CHI PREPARARE" : hint, 8, screen.height - 10, GREY);
  }

  private profileFacts(mon: Monster): string[] {
    const stats = statsOf(mon), target = levelEvolution(mon, this.state.sondaggi), ability = abilityOf(mon);
    return [`PV ${mon.hp}/${stats.hp} / ${mon.status ? STATUS_LABELS[mon.status] : "STATUS OK"}`,
      `GRINTA ${stats.atk} / RETORICA ${stats.spc}`,
      `ABILITÀ: ${ability?.name ?? "NESSUNA"}`,
      target ? `EVOLUZIONE PRONTA: ${speciesOf({ ...mon, speciesId: target }).name}` : `OGGETTO: ${ITEMS[mon.heldItem ?? ""]?.name ?? "NESSUNO"}`];
  }

  private summaryLines(mon: Monster): string[] {
    const species = speciesOf(mon), stats = statsOf(mon), held = ITEMS[mon.heldItem ?? ""];
    let notes: string[];
    if (this.summaryPage === 0) {
      notes = this.profileFacts(mon);
    } else if (this.summaryPage === 1) {
      const slot = mon.moves[this.detailIndex] ?? mon.moves[0], move = slot ? MOVES[slot.id] : undefined;
      notes = move && slot ? [`${this.detailIndex + 1}/${mon.moves.length}: ${move.name}.`, `PP ${slot.pp}/${move.pp} / ${move.accuracy}% PRECISIONE.`, `TIPO ${move.type}.`, moveSummary(move).replace(/^DANNO /, "POTENZA "), `PRIORITÀ ${move.effect?.priority ?? 0}.`, slot.pp === 0 ? "PP ESAURITI: NON DISPONIBILE IN LOTTA." : "I PP SI CONSUMANO SOLO USANDO LA MOSSA."] : ["NESSUNA MOSSA."];
    } else if (this.summaryPage === 2) {
      const ability = abilityOf(mon);
      notes = [ability ? `${ability.name}. ${ability.desc}` : "NESSUNA ABILITÀ PASSIVA.", `FACCIA TOSTA ${stats.def}. VELOCITÀ ${stats.spd}. EXP ${mon.exp}.`, held?.kind === "hold" ? `${held.name}. ${held.desc}` : "NESSUN OGGETTO TENUTO.", species.dexLine];
    } else if (this.summaryPage === 3) {
      notes = careerNotes(mon, this.state.sondaggi).map((line) => line.replace("A APRE IL CONFRONTO", "START APRE IL CONFRONTO"));
      if (this.opts.partyOverride) notes.unshift("MIRROR: LE EVOLUZIONI SI GESTISCONO NELLA SQUADRA ORIGINALE.");
    } else if (this.summaryPage === 4) notes = ["DANNO SUBITO PER TIPO:", ...defensiveMatchups(mon.speciesId).map((m) => `${m.type}: x${m.mult} ${m.mult > 1 ? "DEBOLE" : m.mult < 1 ? "RESISTE" : "NEUTRO"}.`), "ABILITÀ, OGGETTI E SONDAGGI POSSONO MODIFICARE IL RISULTATO."];
    else notes = [this.opts.mode === "view" && !this.opts.partyOverride ? "START: APRI L'ARCHIVIO GRATUITO." : "ARCHIVIO DISPONIBILE FUORI LOTTA NELLA SQUADRA ORIGINALE.", "PUOI RIPRENDERE LE MOSSE DELLA FORMA ATTUALE FINO AL TUO LIVELLO.", ...archivedMoves(mon).map((id) => MOVES[id].name), "CONFRONTI E CONFERMI PRIMA DI CANCELLARE UNA MOSSA. GLI ALTRI PP RESTANO."];
    return notes.flatMap((line) => wrapText(line, 35));
  }

  private drawSummary(screen: Screen, mon: Monster): void {
    const species = speciesOf(mon), party = this.opts.partyOverride ?? this.state.party;
    screen.clear("#101b32");

    drawScreenHeader(screen, "LA TUA SQUADRA");
    const heroH = 59 + Math.round((screen.height - 180) * .45), panelY = 23 + heroH, panelH = screen.height - panelY - 15;
    screen.rect(6, 20, 228, heroH, "#101b32");
    screen.frame(6, 20, 228, heroH, "#d3a745");
    const size = Math.min(100, heroH - 14);
    drawMonsterSprite(screen, mon.speciesId, 10, 29, size, heroH - 14, { memeFormId: mon.memeFormId, animationTime: this.time });
    const textX = size + 18;
    screen.textFit(species.name, textX, 25, 232 - textX, "#fff3cc");
    screen.text(`L${mon.level}  ${this.index + 1}/${party.length}`, textX, 38, "#b7cedc");
    species.types.forEach((type, i) => screen.text(type, textX, 51 + i * 11, "#fff3cc"));
    if (this.summaryPage === 0) {
      const facts = this.profileFacts(mon), rowH = panelH / 4;
      facts.forEach((fact, i) => {
        const y = panelY + i * rowH;
        screen.panel(6, y, 228, rowH - 3, "card");
        const parts = wrapText(fact, 35).slice(0, 2);
        parts.forEach((line, j) => screen.text(line, 14, y + (rowH - parts.length * 8) / 2 + j * 8, INK));
      });
      screen.text(screen.height > 180 ? "EVOLUZIONE E MOSSE SONO QUI SOTTO" : "A: MOSSE  MENU: OGGETTO  B: LISTA", 8, screen.height - 11, "#fff3cc");
      return;
    }
    screen.panel(6, panelY, 228, panelH, "card");
    screen.text(["PROFILO", "MOSSE", "ABILITÀ/OGGETTO", "CARRIERA", "DIFESE", "ARCHIVIO DELLE LINEE"][this.summaryPage], 14, panelY + 6, "#8c5b12");
    const lines = this.summaryLines(mon);
    const lineH = screen.height > 180 ? Math.min(18, (panelH - 27) / Math.max(1, Math.min(8, lines.length))) : 8;
    this.visibleLines = Math.floor((panelH - 27) / lineH);
    this.summaryScroll = Math.min(this.summaryScroll, Math.max(0, lines.length - this.visibleLines));
    lines.slice(this.summaryScroll, this.summaryScroll + this.visibleLines).forEach((line, i) => screen.text(line, 14, panelY + 15 + i * lineH, INK));
    screen.text(`TESTO ${this.summaryScroll + 1}/${Math.max(1, lines.length - this.visibleLines + 1)}`, 14, screen.height - 26, "#59657d");
    screen.text(screen.height > 180 ? this.summaryPage === 1 ? "TOCCA UNA MOSSA PER GLI EFFETTI" : "PROFILO E MOSSE QUI SOTTO" : "A:PAGINA MENU:MOSSA B:LISTA", 8, screen.height - 11, "#fff3cc");
  }
}
