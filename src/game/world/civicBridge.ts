import type { GameState } from "../state";

// Public works alter both collision and rendering through WorldScene.tileAt.
// Keep MAPS immutable: importing another save must never inherit this bridge.
export function civicBridgeTile(state: GameState, mapId: string, x: number, y: number, raw: string): string {
  return mapId === "route1" && y === 7 && x >= 4 && x <= 7 && raw === "w"
    && state.morale.decisions.includes("cantiere:build") ? "q" : raw;
}
