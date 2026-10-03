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
  private index = 0;
  private summary: Monster | null = null;
  private moveFrom: number | null = null; // slot "preso" per lo scambio (mode view)
  // Cursore nel DETTAGLIO: scorre le voci ispezionabili (mosse + abilità) per
  // mostrarne la descrizione in basso. -1 = nessuna selezione (vista neutra).
  private detailIndex = 0;
  private summaryPage = 0;
  private summaryScroll = 0;
  private time = 0;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: PartyOptions
  ) {}

  private openEvolution(mon: Monster): void {
    const target = levelEvolution(mon, this.state.sondaggi);
    if (!target || this.opts.partyOverride) return;
    this.stack.push(new EvolutionScene(this.stack, this.input, mon.speciesId, target, () => {
      evolve(mon, target); markSeen(this.state, target); markCaught(this.state, target); saveGame(this.state); this.summaryScroll = 0;
    }, { mon, reduceEffects: this.state.reduceEffects, battleSpeed: this.state.battleSpeed }));
  }
  get touchActions(): readonly TouchAction[] | undefined {
    const mon = this.summary;
    if (!mon || this.summaryPage !== 0) return undefined;
    const action = (label: string, run: () => void, disabled = false): TouchAction => ({ label, disabled, run: () => {
      if (disabled || this.stack.top !== this || this.summary !== mon || this.summaryPage !== 0) return;
      this.input.reset(); audio.confirm(); run();
    } });
    return [action("EVOLVI", () => this.openEvolution(mon), !levelEvolution(mon, this.state.sondaggi) || !!this.opts.partyOverride),
      action("MOSSE", () => { this.summaryPage = 1; }), action("DATI", () => { this.summaryPage = 2; }),
      action("ARCHIVIO", () => this.stack.push(new RecallScene(this.stack, this.input, this.state, mon)), this.opts.mode !== "view" || !!this.opts.partyOverride),
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
      if (delta) { this.summaryScroll = Math.max(0, Math.min(Math.max(0, this.summaryLines(mon).length - 7), this.summaryScroll + delta)); audio.cursor(); return; }
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
        if (mon.hp <= 0 || mon.uid === this.opts.currentUid) {
          audio.cancel();
          return;
        }
        audio.confirm();
        this.stack.pop();
        this.opts.onChoose?.(mon);
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
    screen.clear("#e3ebef");
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
    for (let i = 0; i < party.length; i += 1) {
      const mon = party[i];
      const y = 16 + i * 23;
      const selected = i === this.index;
      const picked = i === this.moveFrom;
      screen.rect(4, y, VIEW_W - 8, 22, selected ? "#fff0bd" : "#fffaf0");
      screen.rect(4, y, 3, 22, selected ? "#e0a92f" : "#7aa2b8");
      if (picked) {
        // Slot "preso" per lo scambio: cornice gialla evidente.
        screen.frame(4, y, VIEW_W - 8, 22, "#f0c040");
        screen.frame(5, y + 1, VIEW_W - 10, 20, "#f0c040");
      } else if (selected) {
        screen.frame(4, y, VIEW_W - 8, 22, this.moveFrom !== null ? "#f0c040" : INK);
      }
      // Mini-sprite nello slot lista (box 26x21, ancorato in basso).
      drawMonsterSprite(screen, mon.speciesId, 6, y + 1, 26, 21, { memeFormId: mon.memeFormId });
      const ink = INK;
      screen.text(speciesOf(mon).name, 36, y + 3, ink);
      screen.textRight(`L${mon.level}`, VIEW_W - 64, y + 3, ink);
      drawHpBar(screen, 50, y + 13, 70, mon.hp, statsOf(mon).hp);
      screen.textRight(`${mon.hp}/${statsOf(mon).hp}`, VIEW_W - 14, y + 13, ink);
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
      screen.text(mon?.uid === this.opts.currentUid ? "GIA IN CAMPO" : mon?.hp === 0 ? "CANDIDATO KO" : this.opts.freeSwitch ? "RIMPASTO GRATIS" : "CAMBIO: TURNO AL NEMICO", 8, 156, INK);
      screen.text(this.opts.mode === "forced-switch" ? "A: CAMBIA START: DOSSIER" : "A: CAMBIA START: DOSSIER B: TORNA", 8, VIEW_H - 10, "#59657d");
      return;
    }
    const hint = this.opts.mode !== "view"
      ? "A: scegli"
      : this.moveFrom !== null
        ? "START: scambia qui  B: annulla"
        : "A: dettagli  START: sposta  B: chiudi";
    screen.text(hint, 8, VIEW_H - 10, GREY);
  }

  private summaryLines(mon: Monster): string[] {
    const species = speciesOf(mon), stats = statsOf(mon), held = ITEMS[mon.heldItem ?? ""];
    let notes: string[];
    if (this.summaryPage === 0) {
      const target = levelEvolution(mon, this.state.sondaggi), ability = abilityOf(mon);
      notes = [`PV ${mon.hp}/${stats.hp} / ${mon.status ? STATUS_LABELS[mon.status] : "STATUS OK"}`,
        `GRINTA ${stats.atk} / RETORICA ${stats.spc}`,
        `ABILITÀ: ${ability?.name ?? "NESSUNA"}`,
        target ? `EVOLUZIONE PRONTA: ${speciesOf({ ...mon, speciesId: target }).name}` : `OGGETTO: ${held?.name ?? "NESSUNO"}`];
    } else if (this.summaryPage === 1) {
      const slot = mon.moves[this.detailIndex] ?? mon.moves[0], move = slot ? MOVES[slot.id] : undefined;
      notes = move && slot ? ["START: PROSSIMA MOSSA.", `${this.detailIndex + 1}/${mon.moves.length}: ${move.name}.`, `PP ${slot.pp}/${move.pp}. TIPO ${move.type}.`, moveSummary(move), `PRIORITÀ ${move.effect?.priority ?? 0}.`, slot.pp === 0 ? "PP ESAURITI: NON DISPONIBILE IN LOTTA." : "I PP SI CONSUMANO SOLO USANDO LA MOSSA."] : ["NESSUNA MOSSA."];
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
    screen.rect(6, 20, 228, 59, "#101b32");
    screen.frame(6, 20, 228, 59, "#d3a745");
    drawMonsterSprite(screen, mon.speciesId, 10, 29, 54, 45, { memeFormId: mon.memeFormId, animationTime: this.time });
    screen.text(species.name, 76, 25, "#fff3cc");
    screen.text(`L${mon.level}  ${this.index + 1}/${party.length}`, 76, 38, "#b7cedc");
    species.types.forEach((type, i) => screen.text(type, 76, 51 + i * 11, "#fff3cc"));
    screen.panel(6, 82, 228, 83, "card");
    if (this.summaryPage === 0) {
      this.summaryLines(mon).slice(0, 7).forEach((line, i) => screen.text(line, 14, 90 + i * 9, INK));
      screen.text("A: MOSSE  MENU: OGGETTO  B: LISTA", 8, 169, "#fff3cc");
      return;
    }
    screen.text(["PROFILO", "MOSSE", "ABILITÀ/OGGETTO", "CARRIERA", "DIFESE", "ARCHIVIO DELLE LINEE"][this.summaryPage], 14, 88, "#8c5b12");
    const lines = this.summaryLines(mon);
    this.summaryScroll = Math.min(this.summaryScroll, Math.max(0, lines.length - 7));
    lines.slice(this.summaryScroll, this.summaryScroll + 7).forEach((line, i) => screen.text(line, 14, 97 + i * 8, INK));
    screen.text(`SU/GIU: TESTO ${this.summaryScroll + 1}/${Math.max(1, lines.length - 6)}`, 14, 154, "#59657d");
    screen.text("A:PAGINA ◄►:SQUADRA B:LISTA", 8, 169, "#fff3cc");
  }
}
