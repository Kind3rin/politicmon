import type { Facing } from "../../art/characters";
import type { GameState } from "../state";

export interface TransportDestination {
  label: string;
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
  requires?: (state: GameState) => boolean;
}

export const TRANSPORT_DESTINATIONS: readonly TransportDestination[] = [
  { label: "BORGO URNE", mapId: "borgo", x: 24, y: 22, facing: "right" },
  { label: "MEDIOPOLI", mapId: "mediopoli", x: 23, y: 19, facing: "right", requires: (state) => Boolean(state.flags["dex-received"]) },
  { label: "EUROTOWN", mapId: "eurotown", x: 24, y: 14, facing: "right", requires: (state) => state.badges.includes("auditel") },
  { label: "CAPUT MUNDI", mapId: "capitale", x: 23, y: 19, facing: "right", requires: (state) => state.badges.includes("spread") }
] as const;

export function availableTransportDestinations(state: GameState, currentMapId: string): TransportDestination[] {
  return TRANSPORT_DESTINATIONS.filter(
    (destination) => destination.mapId !== currentMapId && (!destination.requires || destination.requires(state))
  );
}
