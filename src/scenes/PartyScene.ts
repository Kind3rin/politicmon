import { MONSTER_ART, drawMonsterSprite } from "../art/monsters";
import { MOVES, STATUS_LABELS, moveSummary } from "../data/moves";
import { TYPE_COLORS, typeIcon } from "../data/poltypes";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { abilityOf, canLearnMove, heldItemOf, nextEvolutionLevel, speciesOf, statsOf, type Monster } from "../game/monster";
import { saveGame } from "../game/state";
import type { GameState } from "../game/state";
import { clipToWidth, drawHpBar, wrapText, GREY, INK, PAPER } from "../ui/widgets";

export interface PartyOptions {
  mode: "view" | "battle-switch" | "forced-switch" | "use-item";
  currentUid?: string;
  title?: string; // intestazione personalizzata (es. nomina di un ministro)
  // Quando si sta usando una DIRETTIVA: marca chi può impararla (✓/✗ in lista).
  directiveMoveId?: string;
  // Squadra alternativa (es. i MIRROR del DUELLO PvP): la scena opera su
  // questa lista invece di state.party, che resta intoccato.
  partyOverride?: Monster[];
  onChoose?: (mon: Monster) => void;
}

export class PartyScene implements Scene {
  private index = 0;
  private summary: Monster | null = null;
  private moveFrom: number | null = null; // slot "preso" per lo scambio (mode view)
  // Cursore nel DETTAGLIO: scorre le voci ispezionabili (mosse + abilità) per
  // mostrarne la descrizione in basso. -1 = nessuna selezione (vista neutra).
  private detailIndex = 0;

  // Voci ispezionabili del dettaglio, nell'ordine di navigazione: prima le mosse
  // poi l'abilità (se la specie ne ha una). Ognuna con label e descrizione.
  private detailEntries(mon: Monster): Array<{ label: string; desc: string }> {
    const entries = mon.moves.map((slot) => {
      const move = MOVES[slot.id];
      return { label: move.name, desc: moveSummary(move) };
    });
    const ability = abilityOf(mon);
    if (ability) {
      entries.push({ label: `ABILITÀ: ${ability.name}`, desc: ability.desc });
    }
    return entries;
  }

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: PartyOptions
  ) {}

  update(): void {
    const party = this.opts.partyOverride ?? this.state.party;
    if (this.summary) {
      // START nel dettaglio: togli l'oggetto tenuto (torna nella borsa).
      if (this.input.wasPressed("start")) {
        const held = heldItemOf(this.summary);
        if (held) {
          delete this.summary.heldItem;
          this.state.bag[held.id] = (this.state.bag[held.id] ?? 0) + 1;
          audio.confirm();
          saveGame(this.state);
        } else {
          audio.cancel();
        }
        return;
      }
      // Su/giù: scorre mosse+abilità per leggerne la descrizione in basso.
      const entries = this.detailEntries(this.summary);
      if (entries.length > 0) {
        if (this.input.wasPressed("up")) {
          this.detailIndex = (this.detailIndex + entries.length - 1) % entries.length;
          audio.cursor();
        }
        if (this.input.wasPressed("down")) {
          this.detailIndex = (this.detailIndex + 1) % entries.length;
          audio.cursor();
        }
      }
      // Sinistra/destra: passa al mostro precedente/successivo senza uscire
      // (come la sfoglia del Politicdex). Il cursore lista segue.
      if (party.length > 1) {
        const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
        if (dir !== 0) {
          this.index = (this.index + dir + party.length) % party.length;
          this.summary = party[this.index];
          this.detailIndex = 0;
          audio.cursor();
          return;
        }
      }
      if (this.input.wasPressed("a") || this.input.wasPressed("b")) {
        audio.cancel();
        this.summary = null;
      }
      return;
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
    screen.clear("#2e3e52");
    if (this.summary) {
      this.drawSummary(screen, this.summary);
      return;
    }
    screen.text(
      this.opts.title ??
        (this.opts.mode === "forced-switch"
          ? "Scegli il prossimo candidato!"
          : this.opts.mode === "use-item"
            ? "Su chi lo usi?"
            : "LA TUA SQUADRA"),
      8, 5, PAPER
    );
    const party = this.opts.partyOverride ?? this.state.party;
    for (let i = 0; i < party.length; i += 1) {
      const mon = party[i];
      const y = 16 + i * 23;
      const selected = i === this.index;
      const picked = i === this.moveFrom;
      screen.rect(4, y, VIEW_W - 8, 22, selected ? "#f8f8f0" : "#3a4c64");
      if (picked) {
        // Slot "preso" per lo scambio: cornice gialla evidente.
        screen.frame(4, y, VIEW_W - 8, 22, "#f0c040");
        screen.frame(5, y + 1, VIEW_W - 10, 20, "#f0c040");
      } else if (selected) {
        screen.frame(4, y, VIEW_W - 8, 22, this.moveFrom !== null ? "#f0c040" : INK);
      }
      // Mini-sprite nello slot lista (box 26x21, ancorato in basso).
      drawMonsterSprite(screen, mon.speciesId, MONSTER_ART[mon.speciesId], 6, y + 1, 26, 21);
      const ink = selected ? INK : PAPER;
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
    const hint = this.opts.mode !== "view"
      ? "A: scegli"
      : this.moveFrom !== null
        ? "START: scambia qui  B: annulla"
        : "A: dettagli  START: sposta  B: chiudi";
    screen.text(hint, 8, VIEW_H - 10, GREY);
  }

  private drawSummary(screen: Screen, mon: Monster): void {
    const species = speciesOf(mon);
    screen.clear("#2e3e52");
    screen.panel(4, 4, VIEW_W - 8, VIEW_H - 8);
    drawMonsterSprite(screen, mon.speciesId, MONSTER_ART[mon.speciesId], 8, 8, 56, 54);
    screen.text(species.name, 70, 12, INK);
    // Sfoglia ◄►: indicatore posizione nella squadra (come nel Politicdex).
    const party = this.opts.partyOverride ?? this.state.party;
    if (party.length > 1) {
      screen.textRight(`◄${this.index + 1}/${party.length}►`, 226, 12, GREY);
    }
    // Anticipa la prossima evoluzione: dà il gancio "ancora un livello".
    // La categoria si clippa per lasciare spazio all'etichetta EVOLVE a destra
    // (prima "LUCERTOLA SVELTA" ci finiva sotto).
    const evoLv = nextEvolutionLevel(mon);
    const evoLabel = evoLv !== undefined ? `EVOLVE a L${evoLv}` : "";
    const catMax = 226 - 70 - (evoLabel.length > 0 ? evoLabel.length * 6 + 8 : 0);
    screen.text(clipToWidth(`L${mon.level}  ${species.category}`, catMax), 70, 22, GREY);
    if (evoLabel) {
      screen.textRight(evoLabel, 226, 22, "#e8c84a");
    }
    let tx = 70;
    for (const type of species.types) {
      const icon = typeIcon(type);
      const iconW = icon ? 11 : 0;
      const w = type.length * 6 + 6 + iconW;
      screen.rect(tx, 32, w, 11, TYPE_COLORS[type]);
      if (icon) {
        screen.imageSprite(icon, tx + 1, 33, { scaleX: 9 / icon.width, scaleY: 9 / icon.height });
      }
      screen.text(type, tx + 3 + iconW, 34, PAPER);
      tx += w + 4;
    }
    // STAT: colonna destra accanto allo sprite (x 70..226), 5 righe y48..88.
    // Occupa SOLO la metà destra: la lista MOSSE sta interamente SOTTO (da y98),
    // così le due colonne non si sovrappongono più (prima le mosse lunghe a
    // x=14 invadevano la fascia delle stat).
    const stats = statsOf(mon);
    const rows: Array<[string, number]> = [
      ["PV", stats.hp], ["GRINTA", stats.atk], ["FACCIA TOSTA", stats.def],
      ["RETORICA", stats.spc], ["OPPORTUN.", stats.spd]
    ];
    for (let i = 0; i < rows.length; i += 1) {
      screen.text(rows[i][0], 70, 48 + i * 9, INK);
      screen.textRight(String(rows[i][1]), 226, 48 + i * 9, INK);
    }
    // MOSSE + ABILITÀ ispezionabili: la voce selezionata (detailIndex) è
    // evidenziata e la sua descrizione appare nel box in basso. Le mosse
    // occupano gli indici 0..n-1, l'abilità (se c'è) l'indice n.
    const ability = abilityOf(mon);
    screen.text("MOSSE:", 14, 95, GREY);
    for (let i = 0; i < mon.moves.length; i += 1) {
      const slot = mon.moves[i];
      const move = MOVES[slot.id];
      const my = 105 + i * 9;
      const sel = this.detailIndex === i;
      if (sel) {
        // Barra d'evidenza + cursore sulla voce selezionata.
        screen.rect(10, my - 1, VIEW_W - 20, 9, "#3a4c64");
        screen.text("►", 10, my, "#e8c84a");
      }
      screen.text(move.name.slice(0, 20), 18, my, sel ? PAPER : INK);
      screen.textRight(`PP ${slot.pp}/${move.pp}`, 226, my, sel ? PAPER : GREY);
    }
    // ABILITÀ passiva della specie (voce ispezionabile, indice = n. mosse) +
    // OGGETTO tenuto sulla STESSA riga a destra: libera lo spazio in basso per
    // il box descrizione. Cursore Y progressivo sotto l'ultima mossa.
    const abilityY = 105 + mon.moves.length * 9 + 3;
    const abilityIdx = mon.moves.length;
    const abilitySel = ability !== null && this.detailIndex === abilityIdx;
    if (abilitySel) {
      screen.rect(10, abilityY - 1, VIEW_W - 20, 9, "#3a4c64");
      screen.text("►", 10, abilityY, "#e8c84a");
    }
    // OGGETTO tenuto (raro): se presente riserva la metà destra della riga e
    // l'abilità si clippa più corta; altrimenti l'abilità ha tutta la riga.
    const held = heldItemOf(mon);
    const abilityMax = held ? 8 : 22;
    screen.text(
      `ABILITÀ: ${ability ? ability.name.slice(0, abilityMax) : "—"}`,
      18, abilityY, ability ? "#e8c84a" : (abilitySel ? PAPER : GREY)
    );
    if (held) {
      screen.textRight(`OGG: ${held.name.slice(0, 10)}`, 226, abilityY, INK);
    }
    // Box descrizione della voce selezionata (mossa o abilità), ancorato in
    // fondo. Max 2 righe (le desc stanno tutte in ~76 char): niente overflow.
    const entries = this.detailEntries(mon);
    const entry = entries[this.detailIndex];
    if (entry) {
      const descLines = wrapText(entry.desc, 38).slice(0, 2);
      const boxH = 5 + descLines.length * 8;
      const boxY = VIEW_H - 4 - boxH;
      screen.rect(6, boxY, VIEW_W - 12, boxH, "#1a2432");
      for (let i = 0; i < descLines.length; i += 1) {
        screen.text(descLines[i], 10, boxY + 3 + i * 8, PAPER);
      }
    }
  }
}
