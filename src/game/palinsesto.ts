import { SPECIES } from "../data/species";
import type { PolType } from "../data/poltypes";
import type { GameState } from "./state";

/**
 * Il palinsesto: la giornata divisa in quattro fasce televisive.
 * Ogni fascia mette «in onda» due tipi (più frequenti fra i selvatici), porta qualche candidato che si vede solo a quell'ora
 * e qualche allenatore che gira solo a quell'ora. L'orologio è quello vero del giocatore, spostabile col telecomando
 * (`clockShift`): chi gioca solo di pomeriggio non perde nulla.
 */
export type SlotId = "mattina" | "giorno" | "sera" | "notte";

export interface SlotDef {
  id: SlotId;
  /** Short word for the HUD chip. */
  name: string;
  /** The programme, for the satire. */
  show: string;
  /** First hour (inclusive) and last hour (exclusive); the night wraps over midnight. */
  from: number;
  to: number;
  /** Where the clock lands when the player tunes this slot. */
  tune: number;
  /** The two types that are on the air: twice as many of them in the grass. */
  types: readonly [PolType, PolType];
  blurb: string;
  /** Accent for banners and the HUD chip. */
  color: string;
}

export const SLOTS: readonly SlotDef[] = [
  { id: "mattina", name: "MATTINA", show: "RASSEGNA STAMPA", from: 5, to: 12, tune: 8.5, types: ["ISTITUZIONE", "VERDE"],
    blurb: "Gli uffici aprono e i parchi si svegliano: istituzioni e verdi sono i primi a farsi vedere.", color: "#7ad858" },
  { id: "giorno", name: "GIORNO", show: "TELEGIORNALE", from: 12, to: 18, tune: 14.5, types: ["CENTRO", "MEDIA"],
    blurb: "Edizione delle tredici, edizione delle venti: i moderati e la stampa riempiono la piazza.", color: "#e8c84a" },
  { id: "sera", name: "SERA", show: "TALK SHOW", from: 18, to: 22, tune: 20, types: ["SINISTRA", "DESTRA"],
    blurb: "Prima serata: due poltrone, nessun moderatore. Destra e sinistra urlano ciascuna dal proprio lato.", color: "#e8845a" },
  { id: "notte", name: "NOTTE", show: "TELEVENDITE", from: 22, to: 5, tune: 23.5, types: ["POPULISMO", "TECNO"],
    blurb: "Seconda serata: promesse in offerta, algoritmi e populisti a ogni angolo.", color: "#9aa8ff" }
];

export const SLOT_BY_ID: Record<SlotId, SlotDef> = Object.fromEntries(SLOTS.map(slot => [slot.id, slot])) as Record<SlotId, SlotDef>;

/** Twice as many of a type that is on the air. */
export const IN_ONDA_WEIGHT = 2;

export function slotAtHour(hour: number): SlotDef {
  const h = ((hour % 24) + 24) % 24;
  return SLOTS.find(slot => slot.from < slot.to ? h >= slot.from && h < slot.to : h >= slot.from || h < slot.to) ?? SLOTS[0];
}

/** The player's clock: the real one, moved by the remote control. */
export function gameClock(state: Pick<GameState, "clockShift">, real: Date = new Date()): Date {
  return new Date(real.getTime() + (state.clockShift ?? 0) * 3600_000);
}

export function hourOf(date: Date): number {
  return date.getHours() + date.getMinutes() / 60;
}

export function currentSlot(state: Pick<GameState, "clockShift">, real: Date = new Date()): SlotDef {
  return slotAtHour(hourOf(gameClock(state, real)));
}

/** Hours (a whole number, 0..23) to add to the real clock so that `slot` is on the air, landing in the middle of it. */
export function shiftToTune(slot: SlotDef, real: Date = new Date()): number {
  const now = hourOf(real);
  const diff = slot.tune - now;
  return Math.round(((diff % 24) + 24) % 24) % 24;
}

export function nextSlot(slot: SlotDef): SlotDef {
  return SLOTS[(SLOTS.indexOf(slot) + 1) % SLOTS.length];
}

export function typesOnAir(slot: SlotDef, speciesId: string): boolean {
  const species = SPECIES[speciesId];
  return Boolean(species) && species.types.some(type => slot.types.includes(type));
}

/** Weight of a wild encounter during `slot`, or 0 when it is only seen in other slots. */
export function slotWeight(entry: { speciesId: string; weight: number; slots?: readonly SlotId[] }, slot: SlotDef): number {
  if (entry.slots && !entry.slots.includes(slot.id)) return 0;
  return typesOnAir(slot, entry.speciesId) ? entry.weight * IN_ONDA_WEIGHT : entry.weight;
}

export function slotsLabel(slots: readonly SlotId[]): string {
  return slots.map(id => SLOT_BY_ID[id].name).join(" E ");
}

/** "Il Talk show: sinistra e destra." */
export function onAirLine(slot: SlotDef): string {
  return `In onda: ${slot.types.map(type => type.toLocaleLowerCase("it")).join(" e ")}.`;
}

/** The schedule opens after the first duel with Gianni, so the opening stays uncluttered. */
export function palinsestoOpen(state: Pick<GameState, "flags">): boolean {
  return Boolean(state.flags["rival1-beaten"]);
}

export function clockText(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function hoursText(slot: SlotDef): string {
  return `${String(slot.from).padStart(2, "0")}:00–${String(slot.to).padStart(2, "0")}:00`;
}
