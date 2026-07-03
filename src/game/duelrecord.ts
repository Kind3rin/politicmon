import { mp } from "../net/mp";
import { bumpDailyQuest } from "./dailyquests";
import { saveGame, type GameState } from "./state";

export type DuelResult = "win" | "loss" | "draw";

// Registra l'esito di un duello PvP. Chiamata SOLO al ritorno al mondo (dagli
// onEnd di lobby/WorldScene, mai dentro PvpBattleScene): l'invariante "il
// duello non tocca il save DURANTE" resta — la scrittura avviene a duello
// chiuso. Aggiorna anche il profilo broadcast (duelWins accanto al nick).
export function recordDuelResult(state: GameState, result: DuelResult): void {
  if (result === "win") {
    state.duelWins = Math.min(99999, state.duelWins + 1);
  } else if (result === "loss") {
    state.duelLosses = Math.min(99999, state.duelLosses + 1);
  }
  bumpDailyQuest(state, "social1"); // un duello completato conta (salva se completa)
  saveGame(state);
  mp.setDuelWins(state.duelWins);
}
