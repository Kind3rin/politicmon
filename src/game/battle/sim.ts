import { MOVES, type Move, type StatKey } from "../../data/moves";
import { typeMultiplier, type PolType } from "../../data/poltypes";
import { ITEMS } from "../../data/items";
import { abilityOf, heldItemOf, speciesOf, statsOf, type Monster } from "../monster";

export interface Combatant {
  mon: Monster;
  stages: Record<StatKey, number>;
  gaffeTurns: number;
  // Abilità LODO: il primo colpo subito in battaglia fa danno dimezzato.
  // Stato per-combattente (come stages/gaffe), resettato a ogni ingresso.
  firstHitTaken: boolean;
}

export function makeCombatant(mon: Monster): Combatant {
  const c: Combatant = { mon, stages: { atk: 0, def: 0, spc: 0, spd: 0 }, gaffeTurns: 0, firstHitTaken: false };
  // VOLTAGABBANA: +1 OPPORTUNISMO a ogni ingresso in campo. Vive QUI perché
  // ogni creazione di Combatant è un ingresso (PVE: lead/switch; duello:
  // makeDuelSim/applySwitch/applyEvent "switch" — host e guest identici).
  if (abilityOf(mon)?.id === "voltagabbana") {
    c.stages.spd = 1;
  }
  return c;
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

// Effetto offensivo (abilità o hold dell'ATTACCANTE) che ha alzato il danno.
// Serve alla BattleScene per annunciarli come già fa coi difensivi (LODO/GILET).
export type OffensiveTrigger = "maggioranza" | "opposizione" | "whatever" | "caimano" | "santino" | "agendarossa";

export interface DamageResult {
  damage: number;
  crit: boolean;
  typeMult: number;
  lodo?: boolean; // il colpo è stato dimezzato dall'abilità LODO del difensore
  // Trigger offensivi scattati in questo colpo (per l'annuncio testuale R42).
  offensive?: OffensiveTrigger[];
}

// Tetto al moltiplicatore di danno finale (soft-cap, Round 42): impedisce i
// one-shot fuori scala quando STAB+tipo+abilità+meteo si sommano. Vedi calcDamage.
export const DAMAGE_MULT_CAP = 3.5;

// SONDAGGI COME "METEO" (Round 39): la divisione establishment/anti.
// Establishment = il "sistema" (palazzi, tecnici, moderati, grandi giornali);
// anti-establishment = la piazza (populisti, ali dure e movimenti).
// Gradimento >=70: il vento soffia per il GOVERNO (+15% ai tipi establishment);
// <=40: soffia per l'OPPOSIZIONE (+15% agli anti-establishment).
export const ESTABLISHMENT_TYPES: PolType[] = ["ISTITUZIONE", "TECNO", "CENTRO", "MEDIA"];
export const ANTI_ESTABLISHMENT_TYPES: PolType[] = ["POPULISMO", "DESTRA", "SINISTRA", "VERDE"];

// Contesto opzionale di battaglia: default NEUTRO. La BattleScene passa i
// SONDAGGI reali; il duello PvP NON lo passa (duello sempre neutrale).
export interface DamageContext {
  sondaggi?: number;
}

// Moltiplicatore "meteo politico" per una mossa (esposto anche per la UI).
export function sondaggiMoveMult(sondaggi: number | undefined, moveType: PolType): number {
  if (sondaggi === undefined) {
    return 1;
  }
  if (sondaggi >= 70 && ESTABLISHMENT_TYPES.includes(moveType)) {
    return 1.15;
  }
  if (sondaggi <= 40 && ANTI_ESTABLISHMENT_TYPES.includes(moveType)) {
    return 1.15;
  }
  return 1;
}

// `rng` iniettabile (default Math.random): il duello PvP passa la sua RNG
// host-side per il replay deterministico; il PVE usa il default.
// `ctx` opzionale: SONDAGGI (solo PVE). Held item e abilità vengono letti
// direttamente dai Monster/Combatant (nel duello i mon non hanno heldItem:
// il filo non lo trasporta, quindi gli hold restano un vantaggio solo PVE).
export function calcDamage(
  attacker: Combatant,
  defender: Combatant,
  move: Move,
  rng: () => number = Math.random,
  ctx?: DamageContext
): DamageResult {
  if (move.power <= 0) {
    return { damage: 0, crit: false, typeMult: 1 };
  }
  const atkKey: StatKey = move.category === "fisico" ? "atk" : "spc";
  // L'attacco speciale usa RETORICA (spc), ma la DIFESA è sempre FACCIA TOSTA (def):
  // prima le speciali leggevano spc anche in difesa e FACCIA TOSTA non proteggeva mai.
  const defKey: StatKey = "def";
  let critChance = move.effect?.highCrit ? 0.25 : 1 / 16;
  // SONDAGGIO TRUCCATO (hold): critico 1/8 (non peggiora le mosse highCrit).
  if (heldItemOf(attacker.mon)?.id === "sondtruccato") {
    critChance = Math.max(critChance, 1 / 8);
  }
  const crit = rng() < critChance;
  // In caso di critico si ignorano gli stage (come nei vecchi giochi).
  const atk = crit ? statsOf(attacker.mon)[atkKey] : effectiveStat(attacker, atkKey);
  const def = crit ? statsOf(defender.mon)[defKey] : effectiveStat(defender, defKey);
  const level = attacker.mon.level * (crit ? 2 : 1);
  const stab = speciesOf(attacker.mon).types.includes(move.type) ? 1.5 : 1;
  const tMult = typeMultiplier(move.type, speciesOf(defender.mon).types);
  // Divisore 58: il giocatore reale (sotto-livello, mosse non ottimali) infligge
  // ~40% del danno teorico, quindi le lotte gli sembravano lunghissime. Con 58 il
  // danno sale ~20% e le lotte tornano corte anche per chi non gioca perfetto,
  // lasciando comunque spazio a status/buff (target ~5-7 turni player-perfetto).
  const base = (((2 * level) / 5 + 2) * move.power * atk) / def / 58 + 2;
  const random = 0.88 + rng() * 0.12;
  let mult = stab * tMult * random;
  const offensive: OffensiveTrigger[] = [];

  // ---- HOLD ITEM (solo chi ha heldItem: nel duello v1 nessuno) ----
  const atkHeld = heldItemOf(attacker.mon)?.id;
  if (atkHeld === "santino" && move.category === "fisico") {
    mult *= 1.1; // SANTINO ELETTORALE: +10% alle mosse fisiche
    offensive.push("santino");
  }
  if (atkHeld === "agendarossa" && move.category === "speciale") {
    mult *= 1.1; // AGENDA ROSSA: +10% alle mosse speciali
    offensive.push("agendarossa");
  }
  if (heldItemOf(defender.mon)?.id === "gilet") {
    mult *= 0.85; // GILET ANTIPROIETTILE: -15% danno subito
  }

  // ---- ABILITÀ (derivate dalla specie: valgono anche nel duello) ----
  const atkAbility = abilityOf(attacker.mon)?.id;
  const atkMaxHp = statsOf(attacker.mon).hp;
  if (atkAbility === "maggioranza" && attacker.mon.hp > atkMaxHp / 2) {
    mult *= 1.1;
    offensive.push("maggioranza");
  }
  if (atkAbility === "opposizione" && attacker.mon.hp <= atkMaxHp / 2) {
    mult *= 1.15;
    offensive.push("opposizione");
  }
  // WHATEVER IT TAKES (draghimon): con lo spread alla gola (PV < 1/3) colpisce
  // devastante. Pura moltiplicazione di danno → arriva anche nel duello via
  // calcDamage (nessun dato dal filo).
  if (atkAbility === "whatever" && attacker.mon.hp <= atkMaxHp / 3) {
    mult *= 1.25;
    offensive.push("whatever");
  }
  if (atkAbility === "caimano" && defender.mon.status) {
    mult *= 1.2;
    offensive.push("caimano");
  }
  // LODO: il primo colpo subito in battaglia è dimezzato.
  let lodo = false;
  if (abilityOf(defender.mon)?.id === "lodo" && !defender.firstHitTaken) {
    mult *= 0.5;
    lodo = true;
  }
  defender.firstHitTaken = true;

  // ---- SONDAGGI COME METEO (solo PVE: il duello non passa ctx) ----
  mult *= sondaggiMoveMult(ctx?.sondaggi, move.type);

  // SOFT-CAP MOLTIPLICATORE (Round 42): il prodotto stab×type×random×hold×
  // ability×lodo×meteo può accumularsi al peggio a ~4.2× (STAB 1.5 · type 2.2 ·
  // random 1.0 · MAGGIORANZA/CAIMANO/WHATEVER · meteo 1.15), abbastanza da
  // one-shottare fuori scala. Clampiamo il moltiplicatore FINALE a 3.5 (LODO
  // resta sotto, è un halving difensivo). Non tocca i singoli numeri: taglia
  // solo la coda estrema. Vale anche nel duello (duelsim usa questo calcDamage).
  mult = Math.min(mult, DAMAGE_MULT_CAP);

  const damage = Math.max(1, Math.floor(base * mult));
  return {
    damage: tMult === 0 ? 0 : damage,
    crit,
    typeMult: tMult,
    lodo,
    offensive: offensive.length > 0 ? offensive : undefined
  };
}

// Probabilità di cattura in stile prima generazione, semplificata.
// `extraBonus` arriva da fattori esterni (es. Ministero della Propaganda).
export function catchChance(foe: Monster, ballId: string, extraBonus = 1): number {
  const species = speciesOf(foe);
  const maxHp = statsOf(foe).hp;
  // A HP pieno fattore 0.45, a HP quasi a zero fattore ~1.9: indebolire il
  // bersaglio premia molto di più (prima il cap a 0.333 rendeva la cattura
  // frustrante anche a 1 HP). hpFrac alto = sano, basso = agli sgoccioli.
  const hpFrac = foe.hp / maxHp;
  // Indebolire deve PREMIARE forte (come in Pokémon): a 1 HP il fattore arriva
  // a ~3.1, così "indebolito + status + scheda base" cattura un comune ~95%.
  // I rari/leggendari restano duri grazie al loro catchRate basso (3-15).
  const hpFactor = 0.55 + (1 - hpFrac) * 2.6;
  const statusBonus = foe.status ? 2.0 : 1;
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

// Profilo di difficoltà dell'IA: regola quanto spesso "sbaglia" (whiff = mossa
// a caso), se sa curarsi al momento perfetto e se infierisce sul bersaglio
// agli sgoccioli. I wild e i primi allenatori sono clementi; palestre e boss
// giocano quasi senza errori. Il default tiene il comportamento "competente".
export interface AiProfile {
  whiff: number; // probabilità di una mossa casuale (più alto = più facile)
  canHeal: boolean; // si auto-cura al timing ottimale
  finisher: boolean; // dà priorità a finire il bersaglio sotto soglia HP
}
export const AI_COMPETENT: AiProfile = { whiff: 0.25, canHeal: true, finisher: true };

// L'IA legge la situazione: picchia super-efficace, cura quando è ferita, si
// potenzia quando è in salute, infligge status/debuff quando conviene. Il
// profilo `ai` decide quanto è dura (whiff alto + niente cura/finisher = facile).
export function chooseFoeMove(foe: Combatant, target: Combatant, ai: AiProfile = AI_COMPETENT): Move {
  const usable = foe.mon.moves.filter((slot) => slot.pp > 0).map((slot) => MOVES[slot.id]);
  if (usable.length === 0) {
    return MOVES.comizio;
  }
  if (Math.random() < ai.whiff) {
    return usable[Math.floor(Math.random() * usable.length)];
  }
  const maxHp = statsOf(foe.mon).hp;
  const hpRatio = foe.mon.hp / maxHp;
  const foeHurt = hpRatio < 0.45;
  const foeHealthy = hpRatio > 0.6;
  const targetMaxHp = statsOf(target.mon).hp;
  const targetLow = target.mon.hp / targetMaxHp < 0.35;

  let best = usable[0];
  let bestScore = -1;
  for (const move of usable) {
    let score: number;
    if (move.power > 0) {
      const tMult = typeMultiplier(move.type, speciesOf(target.mon).types);
      const stab = speciesOf(foe.mon).types.includes(move.type) ? 1.5 : 1;
      score = move.power * tMult * stab * (move.accuracy / 100);
      // Se il bersaglio è agli sgoccioli, finiscilo: priorità ai colpi.
      // Solo gli avversari "competenti" infieriscono; i comuni lasciano scampo.
      if (targetLow && ai.finisher) {
        score *= 1.4;
      }
    } else if (move.effect?.healRatio) {
      // Cura solo se serve davvero, e tanto più quanto è ferita. Gli avversari
      // comuni (canHeal=false) non si curano al timing perfetto: la mossa cade
      // nel punteggio neutro più sotto e viene usata solo ogni tanto.
      score = ai.canHeal && foeHurt ? 120 + (0.45 - hpRatio) * 200 : 0;
    } else if (move.effect?.stat) {
      const buff = move.effect.stat.target === "self";
      if (buff) {
        // Potenziarsi conviene da sani e a inizio scontro (stage non già alti).
        const current = foe.stages[move.effect.stat.key];
        score = foeHealthy && current < 3 ? 70 + move.effect.stat.stages * 8 : 12;
      } else {
        // Debuffare il nemico: utile se non l'abbiamo già fatto.
        const current = target.stages[move.effect.stat.key];
        score = current > -3 ? 55 : 10;
      }
    } else if (move.effect?.status) {
      // Status: ottimo se il bersaglio è ancora "pulito" e ha HP da logorare.
      score = target.mon.status || targetLow ? 8 : 50 + move.effect.status.chance * 0.3;
    } else {
      score = 30;
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
