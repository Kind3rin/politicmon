import type { GameState } from "./state";

/**
 * The coach: one short tip at the moment it is useful, never twice.
 * Each tip is a flag in the save (`tip-<id>`), so a tip that has been read, dismissed or simply acted upon is gone for good.
 * The situations are plain numbers read from the scene, so the choice of tip is a pure function.
 */
export interface CoachTip { id: string; title: string; body: string }

export const BATTLE_TIPS = {
  fuorionda: { id: "fuorionda", title: "Fuorionda pronto!", body: "Tocca FUORIONDA: un colpo sicuro da quattro decimi dei PV. Oppure RECLUTA in modo virale, senza usare schede." },
  lowhp: { id: "lowhp", title: "Compagno in difficoltà", body: "Tocca BORSA per un caffè, o CAMBIO per far entrare un altro. Dopo la lotta il Bar Sport cura tutti, gratis." },
  recruit: { id: "recruit", title: "Ora puoi reclutarlo", body: "È indebolito: tocca RECLUTA e usa una scheda. Se lo mandi KO non si può più reclutare." },
  efficacy: { id: "efficacy", title: "Scegli una mossa", body: "Il colore è il tipo. ▲ colpisce forte questo avversario, ▼ colpisce poco: guarda le frecce sulle carte." },
  polemica: { id: "polemica", title: "La Polemica", body: "Ogni mossa riuscita carica un cerchio ●○○ sotto i tuoi PV. A tre si apre FUORIONDA." },
  intent: { id: "intent", title: "Cosa farà il rivale", body: "L'icona in alto a destra lo dice. Spada: attacca, SMENTISCI dimezza i danni. Megafono: prepara uno stato, ATTACCA colpisce di più." }
} as const satisfies Record<string, CoachTip>;

export type BattleTipId = keyof typeof BATTLE_TIPS;

/** In the order they are offered when several apply at once. */
const BATTLE_ORDER: readonly BattleTipId[] = ["fuorionda", "lowhp", "recruit", "efficacy", "polemica", "intent"];

export interface BattleSituation {
  /** A candidate in the grass (as opposed to a trainer). */
  wild: boolean;
  /** HP of the companion in the field and of the opponent, 0..1. */
  ownRatio: number;
  foeRatio: number;
  /** At least one of the moves shows an arrow against this opponent. */
  arrows: boolean;
  polemica: number;
  /** The opponent has declared what it will do. */
  intent: boolean;
  /** Voting cards in the bag. */
  cards: number;
  /** Something to heal with or someone to bring in. */
  help: boolean;
}

export const tipKey = (id: string): string => `tip-${id}`;
export const tipSeen = (state: Pick<GameState, "flags">, id: string): boolean => Boolean(state.flags[tipKey(id)]);
export function markTip(state: Pick<GameState, "flags">, id: string): void { state.flags[tipKey(id)] = true; }

export function nextBattleTip(state: Pick<GameState, "flags">, s: BattleSituation): CoachTip | undefined {
  const applies: Record<BattleTipId, boolean> = {
    fuorionda: s.polemica >= 3,
    lowhp: s.ownRatio > 0 && s.ownRatio <= .3 && s.help,
    recruit: s.wild && s.foeRatio > 0 && s.foeRatio <= .5 && s.cards > 0,
    efficacy: s.arrows,
    polemica: s.polemica >= 1,
    intent: s.intent
  };
  const id = BATTLE_ORDER.find(tip => applies[tip] && !tipSeen(state, tip));
  return id && BATTLE_TIPS[id];
}

export const WORLD_TIPS = {
  tired: { id: "tired", title: "Squadra stanca", body: "In ogni città il Bar Sport cura tutti i compagni, gratis. Fermati lì prima di una sfida: la Mappa ti dice dove." },
  cards: { id: "cards", title: "Schede finite", body: "Senza schede non si recluta. Le compri al Discount di una città: le trovi sulla Mappa." }
} as const satisfies Record<string, CoachTip>;

export type WorldTipId = keyof typeof WORLD_TIPS;

export interface WorldSituation {
  /** Nothing is going on: no dialogue, no battle, the story is past its opening. */
  calm: boolean;
  /** Someone in the party is under a third of their HP (or down). */
  hurt: boolean;
  cards: number;
  /** The player has already met a candidate: only then do the cards matter. */
  recruiting: boolean;
}

export function nextWorldTip(state: Pick<GameState, "flags">, s: WorldSituation): CoachTip | undefined {
  if (!s.calm) return undefined;
  if (s.hurt && !tipSeen(state, "tired")) return WORLD_TIPS.tired;
  if (s.recruiting && s.cards <= 0 && !tipSeen(state, "cards")) return WORLD_TIPS.cards;
  return undefined;
}
