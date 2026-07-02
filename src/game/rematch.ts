import {
  GYM_LEADER_IDS, GYM_REMATCH_INTROS, GYM_REMATCH_TEAMS, REMATCHABLE_TRAINERS,
  type TrainerDef
} from "../data/trainers";
import type { GameState } from "./state";

// ---------------------------------------------------------------- RIVINCITE
// Gli allenatori normali tornano sfidabili parlandoci dopo un cooldown a passi
// (orologio = state.stepsTotal, persistente). I capipalestra solo post-game
// (flag garante-beaten) con cooldown più lungo. Nessun re-aggro a vista: la
// RIVINCITA parte SOLO da interazione volontaria con prompt SÌ/NO.

export const REMATCH_COOLDOWN_STEPS = 400;
// Capipalestra: cooldown lungo (audit C4: il payout gym a raffica azzerava i
// sink dell'economia) + payout tagliato al 60% per TUTTI i rematch (sotto).
export const GYM_REMATCH_COOLDOWN_STEPS = 1500;

// Moltiplicatore payout dei rematch: 60% del valore scalato (audit C4).
const REMATCH_PAYOUT = 0.6;

export type RematchAvailability = "first" | "ready" | "cooldown" | "never";

// Stato di sfidabilità di un trainer:
// - "first": mai battuto → flusso normale (invariato).
// - "ready": battuto e cooldown scaduto → prompt RIVINCITA.
// - "cooldown": battuto di recente → battuta dedicata.
// - "never": boss narrativi / gym pre-postgame → dialogo post-sconfitta.
export function rematchAvailability(state: GameState, trainerId: string): RematchAvailability {
  if (!state.defeatedTrainers.includes(trainerId)) {
    return "first";
  }
  if (GYM_LEADER_IDS.includes(trainerId)) {
    if (!state.flags["garante-beaten"]) {
      return "never"; // i capipalestra si ribattono solo a storia finita
    }
    const last = state.trainerRematch[trainerId];
    if (last === undefined) {
      return "ready"; // save v9 migrato: trainer già battuti subito pronti
    }
    return state.stepsTotal - last >= GYM_REMATCH_COOLDOWN_STEPS ? "ready" : "cooldown";
  }
  if (!REMATCHABLE_TRAINERS.has(trainerId)) {
    return "never"; // boss, garante, giudici, ilcapitano, rival-*, wander:*, daily:*
  }
  const last = state.trainerRematch[trainerId];
  if (last === undefined) {
    return "ready"; // save v9 migrato: trainer già battuti subito pronti
  }
  return state.stepsTotal - last >= REMATCH_COOLDOWN_STEPS ? "ready" : "cooldown";
}

// Costruisce il TrainerDef della RIVINCITA: NUOVO oggetto (mai mutare TRAINERS),
// SEMPRE senza badge né reward (audit C4: niente medaglie/item duplicati
// farmabili). Capipalestra: team fisso lv 50-55; normali: team scalato sulle
// medaglie (floor 6+5*badge, cap 50 = level cap del giocatore, audit C2).
export function buildRematchDef(state: GameState, def: TrainerDef): TrainerDef {
  if (GYM_LEADER_IDS.includes(def.id) && GYM_REMATCH_TEAMS[def.id]) {
    return {
      id: def.id,
      name: def.name,
      pal: def.pal,
      team: GYM_REMATCH_TEAMS[def.id].map(([sp, lv]) => [sp, lv] as [string, number]),
      intro: GYM_REMATCH_INTROS[def.id] ?? def.intro,
      defeat: def.defeat,
      money: Math.round(def.money * 2.5 * REMATCH_PAYOUT)
      // NIENTE badge, NIENTE reward: strippati per costruzione.
    };
  }
  const postGame = Boolean(state.flags["garante-beaten"]);
  const floor = postGame ? 45 : 6 + 5 * state.badges.length;
  const moneyMult = postGame ? 3 : 1 + 0.25 * state.badges.length;
  return {
    id: def.id,
    name: def.name,
    pal: def.pal,
    // Preserva la tupla a 3 elementi [specie, lv, mosse] se presente.
    team: def.team.map((member) => {
      const lv = Math.min(50, Math.max(member[1] + 2, floor));
      return member.length === 3
        ? ([member[0], lv, member[2]] as [string, number, string[]])
        : ([member[0], lv] as [string, number]);
    }),
    intro: [`RIVINCITA! ${def.intro[0]}`, ...def.intro.slice(1)],
    defeat: def.defeat,
    money: Math.round(def.money * moneyMult * REMATCH_PAYOUT)
  };
}

// Registra l'orologio della rivincita: chiamata a OGNI vittoria su un trainer
// reale (non wander:/daily:), prima sconfitta inclusa.
export function markRematchClock(state: GameState, trainerId: string): void {
  state.trainerRematch[trainerId] = state.stepsTotal;
}
