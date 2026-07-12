import { BADGE_TEASER, type TrainerDef } from "../../data/trainers";
import { hasMinistro, moneyMalus } from "../governo";
import type { GameState } from "../state";

const LOOT_TABLE: ReadonlyArray<{ id: string; qty: number; weight: number }> = [
  { id: "scheda", qty: 2, weight: 30 },
  { id: "caffe", qty: 1, weight: 24 },
  { id: "spritz", qty: 1, weight: 16 },
  { id: "schedona", qty: 1, weight: 14 },
  { id: "maalox", qty: 1, weight: 8 },
  { id: "mojito", qty: 1, weight: 5 },
  { id: "tessera", qty: 1, weight: 3 }
];

export interface TrainerVictoryPlan {
  payout: number;
  sondaggiGain: number;
  economyBonus: boolean;
  spotBonus: boolean;
  introLines: string[];
  badgeLead: string[];
  loot: { id: string; qty: number; jackpot: boolean } | null;
}

export function rollVictoryLoot(random: () => number = Math.random): { id: string; qty: number } {
  const total = LOOT_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of LOOT_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) return { id: entry.id, qty: entry.qty };
  }
  return { id: "scheda", qty: 1 };
}

export function buildTrainerVictoryPlan(
  state: GameState,
  trainer: TrainerDef,
  isRematch: boolean,
  random: () => number = Math.random
): TrainerVictoryPlan {
  const economyBonus = hasMinistro(state, "economia");
  const spotBonus = state.boostMoneyBattles > 0 && !isRematch;
  const payout = Math.round(trainer.money * (economyBonus ? 1.25 : 1) * (spotBonus ? 1.5 : 1) * moneyMalus(state));
  const introLines = [`Hai sconfitto ${trainer.name}!`, ...trainer.defeat, `Ricevi ${payout}€ di rimborso elettorale!`];
  if (economyBonus) introLines.push("Il MIN. ECONOMIA ha trovato la copertura: +25%!");
  if (spotBonus) introLines.push("Lo SPOT IN PRIME TIME riempie le casse: +50% fondi!");

  const badgeLead: string[] = [];
  if (trainer.badge && !state.badges.includes(trainer.badge) && state.badges.length === 0) {
    badgeLead.push(
      "BREAKING NEWS! Con la prima medaglia si apre il GOVERNO OMBRA!",
      "Dal menu (START) trovi la voce GOVERNO: 6 MINISTERI da assegnare.",
      "Ogni ministro dà un bonus passivo (soldi, cure, incontri, cattura...).",
      "Attento: da oggi ogni incarico ha anche un piccolo costo. Scegli bene."
    );
  }
  if (trainer.badge) badgeLead.push(...(BADGE_TEASER[trainer.badge] ?? []));

  const drop = random() < 0.3 ? rollVictoryLoot(random) : null;
  return {
    payout,
    sondaggiGain: state.boostSondBattles > 0 ? 12 : 6,
    economyBonus,
    spotBonus,
    introLines,
    badgeLead,
    loot: drop ? { ...drop, jackpot: drop.id === "tessera" } : null
  };
}
