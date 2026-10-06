import { statsOf } from "../monster";
import type { Combatant } from "./sim";
import { riteForSpecies } from "../legends";

export const FIELD_EVENTS = [
  { id: "click", name: "CLICK DAY", rule: "SE AGISCI PRIMA: POLEMICA +1", cue: "PRIMO +1 P", frame: 0 },
  { id: "equal", name: "PAR CONDICIO", rule: "BONUS ALLE STATISTICHE AZZERATI", cue: "BONUS A ZERO", frame: 1 },
  { id: "poll", name: "SONDAGGIO LAMPO", rule: "CHI HA MENO PV% RECUPERA IL 10%", cue: "MENO PV% +10%", frame: 2 }
] as const;
/** Area events: after the first badge each part of the country has its own rule of the day. */
export const AREA_EVENTS = [
  { id: "taglio", name: "TAGLIO LINEARE", rule: "TUTTI PERDONO L'8% DEI PV", cue: "PV -8%", frame: 3 },
  { id: "diretta", name: "DIRETTA TV", rule: "GRINTA +1 A ENTRAMBI", cue: "GRINTA +1", frame: 3 },
  { id: "standard", name: "STANDARD CE", rule: "LE STATISTICHE TORNANO TRA -1 E +1", cue: "STAT ±1", frame: 3 },
  { id: "cantiere", name: "CANTIERE APERTO", rule: "VELOCITÀ -1 A ENTRAMBI", cue: "VEL -1", frame: 3 }
] as const;
export type BattleField = typeof FIELD_EVENTS[number] | typeof AREA_EVENTS[number];

const AREA_OF: Record<string, BattleField["id"]> = {
  capitale: "taglio", palazzo: "taglio", colle: "taglio", casino: "taglio",
  mediopoli: "diretta", route2: "diretta", gymtv: "diretta", redazione: "diretta", salotto: "diretta",
  eurotown: "standard", bruxelles: "standard", gymue: "standard", commissione: "standard",
  route3: "cantiere", grotta2: "cantiere", stretto: "cantiere", offshore: "cantiere", "oblast-meme": "cantiere"
};

/** Every third fight that is not a gym leader, a legend or a scripted duel gets the rule of the place it is fought in. */
export function chooseAreaEvent(mapId: string, battles: number): BattleField | undefined {
  if (battles % 3 !== 0) return undefined;
  const id = AREA_OF[mapId];
  return AREA_EVENTS.find(event => event.id === id);
}

export function chooseFieldEvent(battles: number): BattleField {
  return FIELD_EVENTS[Math.max(0, battles - 1) % FIELD_EVENTS.length];
}

/** Each legend fights under the rule of its own rite. */
export function chooseLegendEvent(speciesId: string): BattleField | undefined {
  const rite = riteForSpecies(speciesId);
  return rite ? AREA_EVENTS.find(event => event.id === rite.field) : undefined;
}

/** A scheduled event belongs to the battle, never to a species or real person. */
export function applyFieldEvent(field: BattleField, player: Combatant, foe: Combatant): string {
  if (field.id === "equal") {
    for (const c of [player, foe]) for (const key of ["atk", "def", "spc", "spd"] as const) c.stages[key] = Math.min(0, c.stages[key]);
    return "BONUS AZZERATI.\nI MALUS RESTANO IN ONDA.";
  }
  if (field.id === "taglio") {
    for (const c of [player, foe]) {
      if (c.mon.hp <= 0) continue;
      const cut = Math.max(1, Math.floor(statsOf(c.mon).hp * .08));
      c.mon.hp = Math.max(1, c.mon.hp - cut);
    }
    return "TAGLIO LINEARE: -8% PV A TUTTI.\nNESSUNO VA KO, TUTTI PROTESTANO.";
  }
  if (field.id === "diretta") {
    for (const c of [player, foe]) c.stages.atk = Math.min(6, c.stages.atk + 1);
    return "IN DIRETTA SI ALZANO I TONI.\nGRINTA +1 A ENTRAMBI.";
  }
  if (field.id === "standard") {
    for (const c of [player, foe]) for (const key of ["atk", "def", "spc", "spd"] as const) c.stages[key] = Math.max(-1, Math.min(1, c.stages[key]));
    return "STANDARD CE: STATISTICHE\nRIPORTATE TRA -1 E +1.";
  }
  if (field.id === "cantiere") {
    for (const c of [player, foe]) c.stages.spd = Math.max(-6, c.stages.spd - 1);
    return "CANTIERE APERTO SULLA STRADA.\nVELOCITÀ -1 A ENTRAMBI.";
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
