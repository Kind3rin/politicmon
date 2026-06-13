import { MOVES, type Move, type StatKey } from "../../data/moves";
import { typeMultiplier } from "../../data/poltypes";
import { ITEMS } from "../../data/items";
import { speciesOf, statsOf, type Monster } from "../monster";

export interface Combatant {
  mon: Monster;
  stages: Record<StatKey, number>;
  gaffeTurns: number;
}

export function makeCombatant(mon: Monster): Combatant {
  return { mon, stages: { atk: 0, def: 0, spc: 0, spd: 0 }, gaffeTurns: 0 };
}

function stageMult(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

export function effectiveStat(c: Combatant, key: StatKey): number {
  let value = statsOf(c.mon)[key] * stageMult(c.stages[key]);
  if (key === "spd" && c.mon.status === "indagato") {
    value *= 0.5;
  }
  return Math.max(1, Math.floor(value));
}

export interface DamageResult {
  damage: number;
  crit: boolean;
  typeMult: number;
}

export function calcDamage(attacker: Combatant, defender: Combatant, move: Move): DamageResult {
  if (move.power <= 0) {
    return { damage: 0, crit: false, typeMult: 1 };
  }
  const atkKey: StatKey = move.category === "fisico" ? "atk" : "spc";
  const defKey: StatKey = move.category === "fisico" ? "def" : "spc";
  const critChance = move.effect?.highCrit ? 0.25 : 1 / 16;
  const crit = Math.random() < critChance;
  // In caso di critico si ignorano gli stage (come nei vecchi giochi).
  const atk = crit ? statsOf(attacker.mon)[atkKey] : effectiveStat(attacker, atkKey);
  const def = crit ? statsOf(defender.mon)[defKey] : effectiveStat(defender, defKey);
  const level = attacker.mon.level * (crit ? 2 : 1);
  const stab = speciesOf(attacker.mon).types.includes(move.type) ? 1.5 : 1;
  const tMult = typeMultiplier(move.type, speciesOf(defender.mon).types);
  const base = (((2 * level) / 5 + 2) * move.power * atk) / def / 50 + 2;
  const random = 0.85 + Math.random() * 0.15;
  const damage = Math.max(1, Math.floor(base * stab * tMult * random));
  return { damage: tMult === 0 ? 0 : damage, crit, typeMult: tMult };
}

// Probabilità di cattura in stile prima generazione, semplificata.
// `extraBonus` arriva da fattori esterni (es. Ministero della Propaganda).
export function catchChance(foe: Monster, ballId: string, extraBonus = 1): number {
  const species = speciesOf(foe);
  const maxHp = statsOf(foe).hp;
  const hpFactor = 1 - (2 / 3) * (foe.hp / maxHp);
  const statusBonus = foe.status ? 1.5 : 1;
  const ballBonus = ITEMS[ballId]?.ballBonus ?? 1;
  const rate = (species.catchRate / 255) * hpFactor * statusBonus * ballBonus * extraBonus;
  return Math.max(0.02, Math.min(0.95, rate));
}

export function runChance(player: Combatant, foe: Combatant, attempts: number): number {
  const ps = effectiveStat(player, "spd");
  const fs = effectiveStat(foe, "spd");
  if (ps >= fs) {
    return 1;
  }
  return Math.min(0.95, (ps / fs) * 0.7 + attempts * 0.15);
}

// L'IA sa leggere i matchup, ma sbaglia abbastanza da lasciare spazio al player.
export function chooseFoeMove(foe: Combatant, target: Combatant): Move {
  const usable = foe.mon.moves.filter((slot) => slot.pp > 0).map((slot) => MOVES[slot.id]);
  if (usable.length === 0) {
    return MOVES.comizio;
  }
  if (Math.random() < 0.5) {
    return usable[Math.floor(Math.random() * usable.length)];
  }
  let best = usable[0];
  let bestScore = -1;
  for (const move of usable) {
    let score: number;
    if (move.power > 0) {
      const tMult = typeMultiplier(move.type, speciesOf(target.mon).types);
      const stab = speciesOf(foe.mon).types.includes(move.type) ? 1.5 : 1;
      score = move.power * tMult * stab * (move.accuracy / 100);
    } else if (move.effect?.healRatio) {
      const maxHp = statsOf(foe.mon).hp;
      score = foe.mon.hp / maxHp < 0.4 ? 90 : 5;
    } else {
      score = 25;
    }
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

export function statName(key: StatKey): string {
  switch (key) {
    case "atk":
      return "GRINTA";
    case "def":
      return "FACCIA TOSTA";
    case "spc":
      return "RETORICA";
    case "spd":
      return "OPPORTUNISMO";
  }
}
