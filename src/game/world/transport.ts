import type { Facing } from "../../art/characters";
import type { GameState } from "../state";

export interface TransportDestination {
  label: string;
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
  requirement?: string;
  requires?: (state: GameState) => boolean;
}

export const TRANSPORT_DESTINATIONS: readonly TransportDestination[] = [
  { label: "BORGO URNE", mapId: "borgo", x: 24, y: 22, facing: "right" },
  { label: "MEDIOPOLI", mapId: "mediopoli", x: 23, y: 19, facing: "right", requirement: "SERVE IL POLITICDEX.", requires: (state) => Boolean(state.flags["dex-received"]) },
  { label: "EUROTOWN", mapId: "eurotown", x: 24, y: 14, facing: "right", requirement: "SERVE LA MEDAGLIA AUDITEL.", requires: (state) => state.badges.includes("auditel") },
  { label: "CAPUT MUNDI", mapId: "capitale", x: 23, y: 19, facing: "right", requirement: "SERVE LA MEDAGLIA SPREAD.", requires: (state) => state.badges.includes("spread") }
] as const;

export function availableTransportDestinations(state: GameState, currentMapId: string): TransportDestination[] {
  return TRANSPORT_DESTINATIONS.filter(
    (destination) => destination.mapId !== currentMapId && (!destination.requires || destination.requires(state))
  );
}

export function resolveTransportDestination(state:GameState,currentMapId:string,mapId:string):TransportDestination|null{
 if(!state.flags["dex-received"])return null;
 return availableTransportDestinations(state,currentMapId).find(d=>d.mapId===mapId)??null;
}
export function transportRequirement(state:GameState,currentMapId:string,dest:TransportDestination):string{
 if(dest.mapId===currentMapId)return "SEI GIÀ IN QUESTA CITTÀ.";
 if(!state.flags["dex-received"])return "SERVE IL POLITICDEX PER VIAGGIARE.";
 if(dest.requires&&!dest.requires(state))return dest.requirement??"TRATTA NON ANCORA AUTORIZZATA.";
 return "TRATTA AUTORIZZATA. COSTO PER TE: 0€. A LEGGE IL DOSSIER PRIMA DI PARTIRE.";
}
