import type { Move } from "../../data/moves";
import { STATUS_NAMES } from "../../data/moves";
import { abilityOf, statsOf } from "../monster";
import { calcDamage, effectiveStat, statName, type Combatant, type DamageContext } from "./sim";
import { statDropBlockReason, statusBlockReason } from "./effectContract";

function snapshot(c: Combatant): Combatant { return { ...c, stages: { ...c.stages }, mon: { ...c.mon, moves: c.mon.moves.map((m) => ({ ...m })) } }; }

// calcDamage records first-hit/first-attack flags. Run it on snapshots: reading
// an estimate must never spend LODO/PRIMA PAGINA or advance a live RNG stream.
export function damageRange(attacker: Combatant, defender: Combatant, move: Move, ctx?: DamageContext): { min: number; max: number; typeMult: number } {
  const results = [0, .999999].map((variance) => {
    let calls = 0;
    return calcDamage(snapshot(attacker), snapshot(defender), move, () => calls++ === 0 ? .999999 : variance, ctx);
  });
  return { min: Math.min(...results.map((r) => r.damage)), max: Math.max(...results.map((r) => r.damage)), typeMult: results[0].typeMult };
}

export function moveTactics(attacker: Combatant, defender: Combatant, move: Move, ctx?: DamageContext): string[] {
  attacker = snapshot(attacker); defender = snapshot(defender);
  const range = damageRange(attacker, defender, move, ctx);
  const notes: string[] = [];
  const self = move.power === 0 && !move.effect?.status && move.effect?.stat?.target !== "foe";
  notes.push(`${move.type} / ${move.category.toUpperCase()}`, `PRECISIONE ${self ? 100 : move.accuracy}%  PRIORITÀ ${move.effect?.priority ?? 0}`);
  if (move.power > 0) {
    notes.push(`DANNO ${range.min}-${range.max} PV, SENZA CRITICO.`, `EFFICACIA x${range.typeMult.toFixed(2).replace(/0$/, "")}`);
    if (range.min >= defender.mon.hp && defender.mon.hp > 0) notes.push("KO SE COLPISCE NELLO STATO ATTUALE.");
    else if (range.max >= defender.mon.hp && defender.mon.hp > 0) notes.push("KO POSSIBILE SE COLPISCE.");
  }
  const effect = move.effect;
  if (effect?.healRatio) notes.push(`CURA FINO A ${Math.floor(statsOf(attacker.mon).hp * effect.healRatio)} PV.`);
  if (effect?.cureStatus) notes.push("RIMUOVE LO STATUS DI CHI LA USA.");
  if (effect?.drainRatio) notes.push(`ASSORBE ${Math.round(effect.drainRatio * 100)}% DEL DANNO.`);
  if (effect?.recoilRatio) notes.push(`RINCULO ${Math.round(effect.recoilRatio * 100)}% DEL DANNO: PUÒ CAUSARE IL TUO KO.`);
  for (const status of [effect?.status, effect?.statusIfFirst]) {
    if (!status) continue;
    const blocked = statusBlockReason(defender.mon, status.id);
    notes.push(blocked ? `${STATUS_NAMES[status.id]} BLOCCATO DA ${blocked.toUpperCase()}.` : defender.mon.status || (status.id === "gaffe" && defender.gaffeTurns > 0) ? "IL BERSAGLIO HA GIÀ UNO STATUS." : `${STATUS_NAMES[status.id]} ${status.chance}% DOPO IL COLPO${status === effect?.statusIfFirst ? ", SOLO SE AGISCI PRIMA" : ""}.`);
  }
  if (effect?.stat) {
    const s = effect.stat; const target = s.target === "self" ? attacker : defender;
    const blocked = s.target === "foe" && s.stages < 0 ? statDropBlockReason(target.mon) : null;
    const delta = Math.max(-6, Math.min(6, target.stages[s.key] + s.stages)) - target.stages[s.key];
    notes.push(blocked ? `CALO STATISTICHE BLOCCATO: ${blocked.toUpperCase()}.` : `${s.target === "self" ? "TU" : "NEMICO"}: ${statName(s.key)} ${delta >= 0 ? "+" : ""}${delta} (${s.chance ?? 100}%).`);
  }
  if (attacker.mon.status === "indagato") notes.push("INDAGATO: 25% DI NON AGIRE.");
  if (attacker.gaffeTurns > 1) notes.push("GAFFE: 33% DI COLPIRSI PRIMA DELLA MOSSA.");
  notes.push("STIMA ADESSO: CAMBI, STATUS E MOSSE NEMICHE POSSONO MODIFICARLA.");
  return notes;
}

export function fieldTactics(attacker: Combatant, defender: Combatant, ctx?: DamageContext): string[] {
  attacker = snapshot(attacker); defender = snapshot(defender);
  const speed = effectiveStat(attacker, "spd"); const foeSpeed = effectiveStat(defender, "spd");
  const notes = [`VELOCITÀ TU ${speed} / NEMICO ${foeSpeed}`, `${speed > foeSpeed ? "AGISCI PRIMA" : speed < foeSpeed ? "AGISCE PRIMA IL NEMICO" : "PARITÀ: ORDINE CASUALE"} A PARITÀ DI PRIORITÀ.`, "LE MOSSE CON PRIORITÀ POSSONO INVERTIRE L'ORDINE."];
  if (ctx?.sondaggi !== undefined) notes.push(`SONDAGGI ${ctx.sondaggi}%: ${ctx.sondaggi >= 70 ? "+15% ISTITUZIONE, TECNO, CENTRO, MEDIA" : ctx.sondaggi <= 40 ? "+15% POPULISMO, DESTRA, SINISTRA, VERDE" : "NESSUN BONUS DI DANNO"}.`);
  else notes.push("DUELLO: SONDAGGI NEUTRALI.");
  for (const [label, c] of [["TU", attacker], ["NEMICO", defender]] as const) {
    const ability = abilityOf(c.mon); if (ability) notes.push(`${label}: ${ability.name}. ${ability.desc}`);
    for (const key of ["atk", "def", "spc", "spd"] as const) if (c.stages[key]) notes.push(`${label}: ${statName(key)} ${c.stages[key] > 0 ? "+" : ""}${c.stages[key]}.`);
    if (c.mon.status === "scandalo") notes.push(`${label}: SCANDALO CONSUMA PV A FINE TURNO.`);
  }
  return notes;
}
