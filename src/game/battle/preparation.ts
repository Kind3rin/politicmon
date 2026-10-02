import { MOVES, moveSummary } from "../../data/moves";
import { ITEMS } from "../../data/items";
import { abilityOf, speciesOf, type Monster } from "../monster";
import type { GameState } from "../state";
import { makeCombatant } from "./sim";
import { damageRange, switchPreview } from "./tactics";

// Pure estimates for a fresh entry, never a promise about a future battle.
export function preparationNotes(state: GameState, foe: Monster): string[] {
  const ability = abilityOf(foe), held = ITEMS[foe.heldItem ?? ""];
  const boost = foe.moves.map((s) => MOVES[s.id]).find((m) => m.effect?.stat?.target === "self" && m.effect.stat.key === "def" && m.effect.stat.stages > 0);
  return [`${speciesOf(foe).types.join(" / ")}.`, ability ? `${ability.name}: ${ability.desc}` : "NESSUNA ABILITÀ.",
    held ? `${held.name}: ${held.desc}` : "NESSUN OGGETTO TENUTO.", "LE MOSSE ANNUNCIATE:",
    ...foe.moves.flatMap((slot) => { const move = MOVES[slot.id]; return [`${move.name}: ${move.category}, PP ${slot.pp}.`, moveSummary(move)]; }),
    "LA TUA SQUADRA: STIMA AL RIMPASTO, SENZA CRITICO.", ...state.party.flatMap((mon) => {
      const name = speciesOf(mon).name;
      if (mon.hp <= 0) return [`${name}: KO, PRIMA TORNA AL BAR.`];
      const preview = switchPreview(mon, makeCombatant(foe));
      const attacks = mon.moves.filter((s) => s.pp > 0 && MOVES[s.id].power > 0).map((s) => ({
        move: MOVES[s.id], range: damageRange(preview.entrant, preview.opponent, MOVES[s.id], { sondaggi: state.sondaggi })
      })).sort((a, b) => b.range.min - a.range.min);
      const best = attacks[0];
      if (!best) return [`${name}: NESSUN ATTACCO CON PP.`];
      const notes = [`${name}: ${best.move.name}, ${best.range.min}-${best.range.max} PV SE COLPISCE.`];
      if (boost) {
        preview.opponent.stages.def = Math.min(6, preview.opponent.stages.def + boost.effect!.stat!.stages);
        const range = damageRange(preview.entrant, preview.opponent, best.move, { sondaggi: state.sondaggi });
        notes.push(`DOPO ${boost.name}: ${range.min}-${range.max} PV.`);
      }
      notes.push(...mon.moves.filter((s) => s.pp > 0 && MOVES[s.id].effect?.stat?.target === "self").map((s) => `PREPARAZIONE: ${MOVES[s.id].name}. ${moveSummary(MOVES[s.id])}`));
      return notes;
    }), "TIPI, PV, STATUS E POTENZIAMENTI CAMBIANO IL RISULTATO. ANCHE GLI ATTACCHI SPECIALI USANO FACCIA TOSTA, SALVO DIFESE SPECIFICHE.",
    "LINEE DIMENTICATE: START > SQUADRA > DOSSIER > ARCHIVIO. CONFRONTO GRATUITO; SOLO MOSSE GIÀ DISPONIBILI."];
}
