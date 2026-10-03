import { statsOf } from "../monster";
import type { Combatant } from "./sim";

export const FIELD_EVENTS = [
  { id: "click", name: "CLICK DAY", rule: "SE AGISCI PRIMA: POLEMICA +1", cue: "PRIMO +1 P", frame: 0 },
  { id: "equal", name: "PAR CONDICIO", rule: "BONUS ALLE STATISTICHE AZZERATI", cue: "BONUS A ZERO", frame: 1 },
  { id: "poll", name: "SONDAGGIO LAMPO", rule: "CHI HA MENO PV% RECUPERA IL 10%", cue: "MENO PV% +10%", frame: 2 }
] as const;
export type BattleField = typeof FIELD_EVENTS[number];

export function chooseFieldEvent(battles: number): BattleField {
  return FIELD_EVENTS[Math.max(0, battles - 1) % FIELD_EVENTS.length];
}

/** A scheduled event belongs to the battle, never to a species or real person. */
export function applyFieldEvent(field: BattleField, player: Combatant, foe: Combatant): string {
  if (field.id === "equal") {
    for (const c of [player, foe]) for (const key of ["atk", "def", "spc", "spd"] as const) c.stages[key] = Math.min(0, c.stages[key]);
    return "BONUS AZZERATI.\nI MALUS RESTANO IN ONDA.";
  }
  if (field.id === "poll") {
    const pMax = statsOf(player.mon).hp, fMax = statsOf(foe.mon).hp;
    const p = player.mon.hp / pMax, f = foe.mon.hp / fMax;
    if (p === f) return "SONDAGGIO: PARITÀ.\nNESSUNO SI PRENDE IL BONUS.";
    const c = p < f ? player : foe, max = p < f ? pMax : fMax;
    if (c.mon.hp <= 0) return "IL SONDAGGIO NON RIANIMA UN KO.";
    const before = c.mon.hp;
    c.mon.hp = Math.min(max, before + Math.max(1, Math.floor(max * .1)));
    return `${p < f ? "LA TUA SQUADRA" : "IL NEMICO"}: PV +${c.mon.hp - before}.\nIL SONDAGGIO PREMIAVA IL RITARDO.`;
  }
  return "";
}

export function fieldPreview(field: BattleField | undefined, turn: number, player: Combatant, foe: Combatant): [Combatant, Combatant] {
  if (field?.id !== "equal" || turn !== 1) return [player, foe];
  const copy = (c: Combatant): Combatant => ({ ...c, stages: { ...c.stages } });
  const p = copy(player), f = copy(foe);
  applyFieldEvent(field, p, f);
  return [p, f];
}
