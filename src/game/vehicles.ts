import type { GameState } from "./state";

// Veicoli speciali: si sbloccano con un flag e si attivano/disattivano dal menu.
// MONOPATTINO: in città cammini sempre "di corsa" (più veloce).
// RUSPA: puoi abbattere gli alberi (tile "T") che bloccano i passaggi.
// AUTO BLU: veicolo guidabile, veloce all'aperto. (Il teletrasporto fra città
//   resta gestito a parte dalla SCORTA col menu di trasporto.)

export type VehicleId = "monopattino" | "ruspa" | "auto" | "traghetto";

export interface VehicleDef {
  id: VehicleId;
  name: string;
  flag: string; // flag di sblocco in state.flags
  desc: string;
}

export const VEHICLES: Record<VehicleId, VehicleDef> = {
  monopattino: {
    id: "monopattino",
    name: "MONOPATTINO",
    flag: "veh-monopattino",
    desc: "Sfreccia sui marciapiedi. Ti muovi più veloce in città."
  },
  ruspa: {
    id: "ruspa",
    name: "RUSPA",
    flag: "veh-ruspa",
    desc: "Ruspa simbolica: abbatte gli alberi che sbarrano i passaggi."
  },
  auto: {
    id: "auto",
    name: "AUTO BLU",
    flag: "veh-auto",
    desc: "La macchina elettorale: scorre veloce su strada e in città."
  },
  traghetto: {
    id: "traghetto",
    name: "TRAGHETTO",
    flag: "veh-traghetto",
    desc: "Comandato dal CAPITANO SCHETTINO: naviga l'acqua. Inchino compreso."
  }
};

export const VEHICLE_ORDER: VehicleId[] = ["monopattino", "ruspa", "auto", "traghetto"];

export function hasVehicle(state: GameState, id: VehicleId): boolean {
  return Boolean(state.flags[VEHICLES[id].flag]);
}

export function ownedVehicles(state: GameState): VehicleId[] {
  return VEHICLE_ORDER.filter((id) => hasVehicle(state, id));
}

export function unlockVehicle(state: GameState, id: VehicleId): void {
  state.flags[VEHICLES[id].flag] = true;
}

// Chiave di un albero abbattuto, univoca per mappa+coordinata.
export function bulldozedKey(mapId: string, x: number, y: number): string {
  return `${mapId}:${x}:${y}`;
}

export function isBulldozed(state: GameState, mapId: string, x: number, y: number): boolean {
  return state.bulldozed.includes(bulldozedKey(mapId, x, y));
}
