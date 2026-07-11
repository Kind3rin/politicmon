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

// R42 economia (LOTTO 3): rubinetto rematch dimezzato. Cooldown 400→600 (rematch
// meno frequenti) + moltiplicatore post-game ×3→×2 (payout più basso, sotto).
// Insieme portano il faucet per-1000-passi da ~4.5× a ~2.0× il money base del
// trainer: circa -56%. I rematch restano un premio, non punitivi.
export const REMATCH_COOLDOWN_STEPS = 600;
// Capipalestra: cooldown lungo (audit C4: il payout gym a raffica azzerava i
// sink dell'economia) + payout tagliato al 60% per TUTTI i rematch (sotto).
export const GYM_REMATCH_COOLDOWN_STEPS = 1500;

// MODALITÀ DIFFICILE: cooldown rivincita RADDOPPIATI (il farming rallenta).
function rematchCooldown(state: GameState, base: number): number {
  return state.hardMode ? base * 2 : base;
}

// MODALITÀ DIFFICILE: +livelli agli avversari trainer. +3 di base, +5 sui boss
// (team a partire da lv 45: gym rematch, garante, giudici, offshore).
export function hardModeLevelBonus(state: GameState, level: number): number {
  if (!state.hardMode) {
    return 0;
  }
  return level >= 45 ? 5 : 3;
}

// Moltiplicatore payout dei rematch: 60% del valore scalato (audit C4).
const REMATCH_PAYOUT = 0.6;

export type RematchAvailability = "first" | "ready" | "cooldown" | "never";
export type GymRematchDoctrine = "government" | "opposition" | "coalition";

const ADAPTIVE_GYM_TEAMS: Readonly<Record<string, Readonly<Record<GymRematchDoctrine, readonly [string, number][]>>>> = {
  emittenza: {
    government: [["tajanide", 50], ["telecrate", 52], ["berlusconix", 54]],
    opposition: [["contepop", 50], ["salisound", 52], ["telecrate", 54]],
    coalition: [["campocorno", 50], ["referendodo", 52], ["contemorfo", 54]]
  },
  ladydirettiva: {
    government: [["macronfox", 51], ["calendrone", 52], ["ursulax", 54]],
    opposition: [["verdoribelle", 51], ["contepop", 52], ["salisound", 54]],
    coalition: [["campocorno", 51], ["futurorso", 52], ["referendodo", 54]]
  },
  tycoon: {
    government: [["bojoon", 51], ["generorso", 52], ["marsrat", 53], ["trumpon", 55]],
    opposition: [["salvinurlo", 51], ["pontimax", 52], ["muskrat", 53], ["trumpon", 55]],
    coalition: [["campocorno", 51], ["crosettank", 52], ["referendodo", 53], ["trumpon", 55]]
  }
};

export const GYM_DOCTRINE_LABEL: Readonly<Record<GymRematchDoctrine, string>> = {
  government: "ROSTER DI GOVERNO", opposition: "ROSTER D'OPPOSIZIONE", coalition: "ROSTER DI COALIZIONE"
};

export function gymRematchDoctrine(state: GameState): GymRematchDoctrine {
  const fractured = state.coalition.members.some((member) => member.status === "strained")
    || Object.keys(state.flags).some((flag) => flag.startsWith("coalition-broken:") && state.flags[flag]);
  if (fractured) return "coalition";
  return state.election.result?.ending === "government" ? "government" : "opposition";
}

export function adaptiveGymRoster(state: GameState, trainerId: string): { doctrine: GymRematchDoctrine; label: string; team: readonly [string, number][] } | null {
  const catalog = ADAPTIVE_GYM_TEAMS[trainerId]; if (!catalog) return null;
  const doctrine = gymRematchDoctrine(state);
  return { doctrine, label: GYM_DOCTRINE_LABEL[doctrine], team: catalog[doctrine] };
}

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
    return state.stepsTotal - last >= rematchCooldown(state, GYM_REMATCH_COOLDOWN_STEPS) ? "ready" : "cooldown";
  }
  if (!REMATCHABLE_TRAINERS.has(trainerId)) {
    return "never"; // boss, garante, giudici, ilcapitano, rival-*, wander:*, daily:*
  }
  const last = state.trainerRematch[trainerId];
  if (last === undefined) {
    return "ready"; // save v9 migrato: trainer già battuti subito pronti
  }
  return state.stepsTotal - last >= rematchCooldown(state, REMATCH_COOLDOWN_STEPS) ? "ready" : "cooldown";
}

// Costruisce il TrainerDef della RIVINCITA: NUOVO oggetto (mai mutare TRAINERS),
// SEMPRE senza badge né reward (audit C4: niente medaglie/item duplicati
// farmabili). Capipalestra: team fisso lv 50-55; normali: team scalato sulle
// medaglie (floor 6+5*badge, cap 55 = level cap del giocatore, audit C2/R42).
export function buildRematchDef(state: GameState, def: TrainerDef): TrainerDef {
  if (GYM_LEADER_IDS.includes(def.id) && GYM_REMATCH_TEAMS[def.id]) {
    const adaptive = adaptiveGymRoster(state, def.id);
    const team = adaptive?.team ?? GYM_REMATCH_TEAMS[def.id];
    return {
      id: def.id,
      name: def.name,
      pal: def.pal,
      team: team.map(([sp, lv]) => [sp, lv] as [string, number]),
      intro: [...(adaptive ? [`${adaptive.label}: la palestra ha studiato la tua run.`] : []), ...(GYM_REMATCH_INTROS[def.id] ?? def.intro)],
      defeat: def.defeat,
      money: Math.round(def.money * 2.5 * REMATCH_PAYOUT)
      // NIENTE badge, NIENTE reward: strippati per costruzione.
    };
  }
  const postGame = Boolean(state.flags["garante-beaten"]);
  const floor = postGame ? 45 : 6 + 5 * state.badges.length;
  // R42: post-game ×3→×2 (era il rubinetto dominante, ~38k€/ciclo). Vedi nota su
  // REMATCH_COOLDOWN_STEPS: la coppia mult+cooldown dimezza il faucet.
  const moneyMult = postGame ? 2 : 1 + 0.25 * state.badges.length;
  return {
    id: def.id,
    name: def.name,
    pal: def.pal,
    // Preserva la tupla a 3 elementi [specie, lv, mosse] se presente.
    team: def.team.map((member) => {
      const lv = Math.min(55, Math.max(member[1] + 2, floor));
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
