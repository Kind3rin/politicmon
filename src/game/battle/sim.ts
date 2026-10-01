import { MOVES, type Move, type StatKey } from "../../data/moves";
import { typeMultiplier, type PolType } from "../../data/poltypes";
import { ITEMS } from "../../data/items";
import { abilityOf, heldItemOf, speciesOf, statsOf, type Monster } from "../monster";
import { statDropBlockReason, statusBlockReason } from "./effectContract";
import type { AiStyle } from "./trainerStyle";

export interface Combatant {
  mon: Monster;
  stages: Record<StatKey, number>;
  gaffeTurns: number;
  // Abilità LODO: il primo colpo subito in battaglia fa danno dimezzato.
  // Stato per-combattente (come stages/gaffe), resettato a ogni ingresso.
  firstHitTaken: boolean;
  firstAttackUsed: boolean;
  hitReactionUsed: boolean;
}

export function makeCombatant(mon: Monster): Combatant {
  const c: Combatant = {
    mon, stages: { atk: 0, def: 0, spc: 0, spd: 0 }, gaffeTurns: 0,
    firstHitTaken: false, firstAttackUsed: false, hitReactionUsed: false
  };
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
export type OffensiveTrigger = "maggioranza" | "opposizione" | "whatever" | "caimano" | "primapagina" | "santino" | "agendarossa";

export interface DamageResult {
  damage: number;
  crit: boolean;
  typeMult: number;
  lodo?: boolean; // il colpo è stato dimezzato dall'abilità LODO del difensore
  // Trigger offensivi scattati in questo colpo (per l'annuncio testuale R42).
  offensive?: OffensiveTrigger[];
  pollEstimate?: "low" | "high";
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
  const specialDefense = move.category === "speciale" ? speciesOf(defender.mon).specialDefense : undefined;
  const def = specialDefense !== undefined
    ? crit ? specialDefense : Math.max(1, Math.floor(specialDefense * stageMult(defender.stages.spc)))
    : crit ? statsOf(defender.mon)[defKey] : effectiveStat(defender, defKey);
  const level = attacker.mon.level * (crit ? 2 : 1);
  const stab = speciesOf(attacker.mon).types.includes(move.type) ? 1.5 : 1;
  const tMult = typeMultiplier(move.type, speciesOf(defender.mon).types);
  // Divisore 58: il giocatore reale (sotto-livello, mosse non ottimali) infligge
  // ~40% del danno teorico, quindi le lotte gli sembravano lunghissime. Con 58 il
  // danno sale ~20% e le lotte tornano corte anche per chi non gioca perfetto,
  // lasciando comunque spazio a status/buff (target ~5-7 turni player-perfetto).
  const power = dynamicMovePower(attacker, move);
  const base = (((2 * level) / 5 + 2) * power * atk) / def / 58 + 2;
  const pollFork = abilityOf(attacker.mon)?.id === "forchettasondaggi" && move.category === "speciale";
  const pollEstimate = pollFork ? (rng() < 0.5 ? "low" : "high") : undefined;
  // FORCHETTA SONDAGGI sostituisce il roll standard 0,88..1,00: non si somma.
  const random = pollEstimate === "low" ? 0.85 : pollEstimate === "high" ? 1.15 : 0.88 + rng() * 0.12;
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
  if (atkAbility === "primapagina" && !attacker.firstAttackUsed) {
    mult *= 1.2;
    offensive.push("primapagina");
  }
  attacker.firstAttackUsed = true;
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
    offensive: offensive.length > 0 ? offensive : undefined,
    pollEstimate
  };
}

// EXIT POLL legge i PV all'inizio del colpo: 50% esatto appartiene alla stima alta.
export function dynamicMovePower(attacker: Combatant, move: Move): number {
  if (move.id !== "exit_poll") return move.power;
  return attacker.mon.hp * 2 >= statsOf(attacker.mon).hp ? 100 : 60;
}

// Probabilità di cattura in stile prima generazione, semplificata.
// `extraBonus` arriva da fattori esterni (es. Ministero della Propaganda).
export function catchChance(foe: Monster, ballId: string, extraBonus = 1, temporaryGaffe = false): number {
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
  // GAFFE lives on Combatant.gaffeTurns, unlike persistent SCANDALO/INDAGATO.
  // The live capture path passes it explicitly so all three statuses help.
  const statusBonus = foe.status || temporaryGaffe ? 2.0 : 1;
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
  style?: AiStyle;
}
export const AI_COMPETENT: AiProfile = { whiff: 0.25, canHeal: true, finisher: true };

// L'IA legge la situazione: picchia super-efficace, cura quando è ferita, si
// potenzia quando è in salute, infligge status/debuff quando conviene. Il
// profilo `ai` decide quanto è dura (whiff alto + niente cura/finisher = facile).
export function chooseFoeMove(foe: Combatant, target: Combatant, ai: AiProfile = AI_COMPETENT, rng: () => number = Math.random, ctx?: DamageContext): Move {
  const usable = foe.mon.moves.filter((slot) => slot.pp > 0).map((slot) => MOVES[slot.id]);
  if (usable.length === 0) {
    return MOVES.comizio;
  }
  const scored = usable.map((move) => ({ move, score: foeMoveScore(foe, target, move, ai, ctx) }));
  // Errori credibili: una scelta subottimale, senza sprecare volontariamente
  // una cura a PV pieni o uno status contro un'immunità già visibile.
  const useful = scored.filter((entry) => entry.score > 0);
  const candidates = useful.length ? useful : scored;
  if (rng() < ai.whiff) return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))].move;
  const best = Math.max(...candidates.map((entry) => entry.score));
  const ties = candidates.filter((entry) => entry.score >= best - .001);
  return ties[Math.min(ties.length - 1, Math.floor(rng() * ties.length))].move;
}

function combatantCopy(c: Combatant): Combatant {
  return { ...c, stages: { ...c.stages }, mon: { ...c.mon, moves: c.mon.moves.map((s) => ({ ...s })) } };
}

// Usa la formula del danno su copie. Leggere il campo non consuma PRIMA
// PAGINA/LODO, PP o RNG della simulazione. Non riceve il comando del giocatore.
export function foeMoveScore(foe: Combatant, target: Combatant, move: Move, ai: AiProfile = AI_COMPETENT, ctx?: DamageContext): number {
  foe = combatantCopy(foe); target = combatantCopy(target);
  const maxHp = statsOf(foe.mon).hp, targetHp = statsOf(target.mon).hp;
  const health = foe.mon.hp / maxHp, targetHealth = target.mon.hp / targetHp;
  const self = move.power === 0 && !move.effect?.status && move.effect?.stat?.target !== "foe";
  const accuracy = self ? 1 : move.accuracy / 100;
  let n = 0;
  const damage = calcDamage(foe, target, move, () => n++ === 0 ? .999999 : .5, ctx).damage;
  let score = 100 * Math.min(damage, target.mon.hp) / targetHp * accuracy;
  if (ai.style === "rush") score *= 1.15;
  if (damage >= target.mon.hp && target.mon.hp > 0 && ai.finisher) score += 32 * accuracy;
  if (move.effect?.priority && damage > 0 && effectiveStat(foe, "spd") <= effectiveStat(target, "spd")) score += 8 * move.effect.priority * accuracy;
  const effect = move.effect;
  if (effect?.healRatio && ai.canHeal && health < .45) {
    const healed = Math.min(maxHp - foe.mon.hp, Math.floor(maxHp * effect.healRatio));
    score += healed / maxHp * 95 * (ai.style === "fortress" ? 1.15 : 1);
  }
  if (effect?.cureStatus && ai.canHeal && (foe.mon.status || foe.gaffeTurns > 0)) score += 25;
  if (effect?.drainRatio) score += Math.min(maxHp - foe.mon.hp, damage * effect.drainRatio) / maxHp * 65 * accuracy;
  if (effect?.recoilRatio) {
    const recoil = Math.max(1, Math.floor(damage * effect.recoilRatio));
    score -= recoil / maxHp * 28;
    if (recoil >= foe.mon.hp && damage < target.mon.hp) score -= 50;
  }
  for (const proc of [effect?.status, effect?.statusIfFirst]) {
    if (!proc || target.mon.hp <= 0 || target.mon.status || (proc.id === "gaffe" && target.gaffeTurns > 0) || statusBlockReason(target.mon, proc.id)) continue;
    if (proc === effect?.statusIfFirst && (effect?.priority ?? 0) <= 0 && effectiveStat(foe, "spd") < effectiveStat(target, "spd")) continue;
    const value = proc.id === "scandalo" ? 34 : proc.id === "indagato" ? 30 : 23;
    score += value * proc.chance / 100 * accuracy * Math.min(1, targetHealth * 2) * (ai.style === "pressure" || ai.style === "control" ? 1.3 : 1);
  }
  if (effect?.stat) {
    const s = effect.stat, c = s.target === "self" ? foe : target;
    const delta = Math.max(-6, Math.min(6, c.stages[s.key] + s.stages)) - c.stages[s.key];
    const attackCategory = s.key === "atk" ? "fisico" : "speciale";
    const irrelevant = (s.key === "atk" || s.key === "spc") && !c.mon.moves.some((slot) => slot.pp > 0 && MOVES[slot.id]?.power > 0 && MOVES[slot.id]?.category === attackCategory);
    const blocked = s.target === "foe" && s.stages < 0 && statDropBlockReason(target.mon);
    if (delta && !blocked && !irrelevant) {
      const benefit = s.target === "self" ? delta : -delta;
      const room = Math.max(0, 1 - Math.abs(c.stages[s.key]) / 4);
      score += benefit * 13 * room * accuracy * (s.chance ?? 100) / 100 * Math.min(1, health * 2) * Math.min(1, targetHealth * 2) * (ai.style === "setup" || ai.style === "control" ? 1.3 : ai.style === "rush" ? .65 : 1);
    }
  }
  return Math.max(0, score);
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
