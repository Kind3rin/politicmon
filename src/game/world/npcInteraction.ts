import type { NpcDef } from "../../data/maps";
import { rematchAvailability, type RematchAvailability } from "../rematch";
import type { GameState } from "../state";
import type { WorldSceneId } from "./worldContext";

export type NpcInteractionRoute =
  | { kind: "versionSurvey" }
  | { kind: "trainer"; availability: Exclude<RematchAvailability, "never"> }
  | { kind: "guide" }
  | { kind: "transport" }
  | { kind: "daily" }
  | { kind: "tournament" }
  | { kind: "openScene"; scene: WorldSceneId }
  | { kind: "healer" }
  | { kind: "legendary" }
  | { kind: "gift" }
  | { kind: "vehicleGift" }
  | { kind: "dialog"; setFlag?: string }
  | { kind: "none" };

export function routeNpcInteraction(state: GameState, npc: NpcDef): NpcInteractionRoute {
  if (npc.id === "sondaggista-versioni") return { kind: "versionSurvey" };
  if (npc.trainerId) {
    const availability = rematchAvailability(state, npc.trainerId);
    if (availability !== "never") return { kind: "trainer", availability };
  }
  if (npc.guide) return { kind: "guide" };
  if (npc.transport) return { kind: "transport" };
  if (npc.daily) return { kind: "daily" };
  if (npc.coppa) return { kind: "tournament" };
  if (npc.shop) return { kind: "openScene", scene: "shop" };
  if (npc.casino) return { kind: "openScene", scene: "casino" };
  if (npc.box) return { kind: "openScene", scene: "box" };
  if (npc.mafia) return { kind: "openScene", scene: "mafia" };
  if (npc.monument) return { kind: "openScene", scene: "monument" };
  if (npc.healer) return { kind: "healer" };
  if (npc.legendary) return { kind: "legendary" };
  if (npc.gift && !state.flags[npc.gift.flag]) return { kind: "gift" };
  if (npc.vehicleGift && !state.flags[npc.vehicleGift.flag]) return { kind: "vehicleGift" };
  if (npc.lines?.length || (npc.setFlag && !state.flags[npc.setFlag])) {
    return { kind: "dialog", setFlag: npc.setFlag && !state.flags[npc.setFlag] ? npc.setFlag : undefined };
  }
  return { kind: "none" };
}
