import type { StatusId } from "../../data/moves";
import { abilityOf, heldItemOf, statsOf, type Monster } from "../monster";
import type { Combatant } from "./sim";

export const EFFECT_PHASE_ORDER = ["preMove", "damage", "postMove", "switch", "ko", "endTurn"] as const;
export type EffectPhase = (typeof EFFECT_PHASE_ORDER)[number];
export type EffectParity = "shared" | "pve-only" | "pvp-only";

export interface EffectHandlerDeclaration {
  id: string;
  phase: EffectPhase;
  parity: EffectParity;
  source: "status" | "move" | "ability" | "hold" | "system";
}

// Inventario autoritativo per review e content extension. Un nuovo effetto Atto 3
// deve dichiarare fase e parità prima di aggiungere branch nelle scene.
export const EFFECT_HANDLERS: readonly EffectHandlerDeclaration[] = [
  { id: "indagato-block", phase: "preMove", parity: "shared", source: "status" },
  { id: "gaffe", phase: "preMove", parity: "shared", source: "status" },
  { id: "calc-damage", phase: "damage", parity: "shared", source: "system" },
  { id: "maggioranza", phase: "damage", parity: "shared", source: "ability" },
  { id: "opposizione", phase: "damage", parity: "shared", source: "ability" },
  { id: "whatever", phase: "damage", parity: "shared", source: "ability" },
  { id: "caimano", phase: "damage", parity: "shared", source: "ability" },
  { id: "lodo", phase: "damage", parity: "shared", source: "ability" },
  { id: "primapagina", phase: "damage", parity: "shared", source: "ability" },
  { id: "sondaggi-weather", phase: "damage", parity: "pve-only", source: "system" },
  { id: "sondtruccato", phase: "damage", parity: "pve-only", source: "hold" },
  { id: "santino", phase: "damage", parity: "pve-only", source: "hold" },
  { id: "agendarossa", phase: "damage", parity: "pve-only", source: "hold" },
  { id: "gilet", phase: "damage", parity: "pve-only", source: "hold" },
  { id: "drain", phase: "postMove", parity: "shared", source: "move" },
  { id: "recoil", phase: "postMove", parity: "shared", source: "move" },
  { id: "heal", phase: "postMove", parity: "shared", source: "move" },
  { id: "cure-status", phase: "postMove", parity: "shared", source: "move" },
  { id: "stat-stage", phase: "postMove", parity: "shared", source: "move" },
  { id: "status-apply", phase: "postMove", parity: "shared", source: "move" },
  { id: "teflon", phase: "postMove", parity: "shared", source: "ability" },
  { id: "garanzia", phase: "postMove", parity: "shared", source: "ability" },
  { id: "contraddittorio", phase: "postMove", parity: "shared", source: "ability" },
  { id: "telecamera", phase: "postMove", parity: "pve-only", source: "hold" },
  { id: "voltagabbana", phase: "switch", parity: "shared", source: "ability" },
  { id: "tabularasa", phase: "switch", parity: "shared", source: "ability" },
  { id: "staffetta", phase: "ko", parity: "shared", source: "ability" },
  { id: "faint", phase: "ko", parity: "shared", source: "system" },
  { id: "pve-ko-progression", phase: "ko", parity: "pve-only", source: "system" },
  { id: "scandalo", phase: "endTurn", parity: "shared", source: "status" },
  { id: "galleggiamento", phase: "endTurn", parity: "shared", source: "ability" },
  { id: "caffettiera", phase: "endTurn", parity: "pve-only", source: "hold" }
];

export interface PreMoveResolution {
  canAct: boolean;
  gaffeTurns: number;
  event: "none" | "indagato" | "gaffeEnd" | "gaffeSelf";
  selfDamage: number;
}

export function resolvePreMove(combatant: Combatant, rng: () => number): PreMoveResolution {
  if (combatant.mon.status === "indagato" && rng() < 0.25) {
    return { canAct: false, gaffeTurns: combatant.gaffeTurns, event: "indagato", selfDamage: 0 };
  }
  if (combatant.gaffeTurns <= 0) {
    return { canAct: true, gaffeTurns: 0, event: "none", selfDamage: 0 };
  }
  const gaffeTurns = combatant.gaffeTurns - 1;
  if (gaffeTurns === 0) {
    return { canAct: true, gaffeTurns, event: "gaffeEnd", selfDamage: 0 };
  }
  if (rng() < 0.33) {
    return {
      canAct: false,
      gaffeTurns,
      event: "gaffeSelf",
      selfDamage: Math.max(1, Math.floor((combatant.mon.level * 2) / 3) + 2)
    };
  }
  return { canAct: true, gaffeTurns, event: "none", selfDamage: 0 };
}

export type EffectBlockReason = "teflon" | "garanzia" | "telecamera" | "poltrona";

export function statusBlockReason(mon: Monster, status: StatusId): EffectBlockReason | null {
  const ability = abilityOf(mon)?.id;
  if (ability === "teflon") return "teflon";
  if (ability === "garanzia") return "garanzia";
  if (status === "gaffe" && heldItemOf(mon)?.id === "telecamera") return "telecamera";
  return null;
}

export function statDropBlockReason(mon: Monster): EffectBlockReason | null {
  const ability = abilityOf(mon)?.id;
  return ability === "poltrona" ? "poltrona" : ability === "garanzia" ? "garanzia" : null;
}

export interface EndTurnEffect {
  id: "scandalo" | "galleggiamento" | "caffettiera";
  hpAfter: number;
  kind: "damage" | "heal";
}

export function resolveEndTurn(combatant: Combatant, includeHeldItems: boolean): EndTurnEffect[] {
  const maxHp = statsOf(combatant.mon).hp;
  let hp = combatant.mon.hp;
  const effects: EndTurnEffect[] = [];
  if (hp > 0 && combatant.mon.status === "scandalo") {
    hp = Math.max(0, hp - Math.max(1, Math.floor(maxHp / 8)));
    effects.push({ id: "scandalo", hpAfter: hp, kind: "damage" });
  }
  if (hp > 0 && hp < maxHp && abilityOf(combatant.mon)?.id === "galleggiamento") {
    hp = Math.min(maxHp, hp + Math.max(1, Math.floor(maxHp / 16)));
    effects.push({ id: "galleggiamento", hpAfter: hp, kind: "heal" });
  }
  if (includeHeldItems && hp > 0 && hp < maxHp && heldItemOf(combatant.mon)?.id === "caffettiera") {
    hp = Math.min(maxHp, hp + Math.max(1, Math.floor(maxHp / 16)));
    effects.push({ id: "caffettiera", hpAfter: hp, kind: "heal" });
  }
  return effects;
}

export interface FuturoPhaseResolution {
  readonly triggered: boolean;
  readonly stages: Combatant["stages"];
}

export interface EntryAbilityResolution {
  readonly triggered: boolean;
  readonly entrantStages: Combatant["stages"];
  readonly opponentStages: Combatant["stages"];
}

const ZERO_STAGES: Combatant["stages"] = { atk: 0, def: 0, spc: 0, spd: 0 };

// TABULA RASA è un effetto d'ingresso: azzera soltanto gli stage. PV, status,
// PP e stato one-shot delle altre abilità non vengono toccati.
export function resolveEntryAbility(entrant: Combatant, opponent: Combatant): EntryAbilityResolution {
  if (abilityOf(entrant.mon)?.id !== "tabularasa") {
    return {
      triggered: false,
      entrantStages: { ...entrant.stages },
      opponentStages: { ...opponent.stages }
    };
  }
  return { triggered: true, entrantStages: { ...ZERO_STAGES }, opponentStages: { ...ZERO_STAGES } };
}

export interface AbilityStageResolution {
  readonly triggered: boolean;
  readonly key: "spc" | "spd";
  readonly resulting: number;
}

export function resolveHitReactionAbility(defender: Combatant): AbilityStageResolution {
  if (abilityOf(defender.mon)?.id !== "contraddittorio" || defender.hitReactionUsed || defender.mon.hp <= 0) {
    return { triggered: false, key: "spc", resulting: defender.stages.spc };
  }
  defender.hitReactionUsed = true;
  return { triggered: true, key: "spc", resulting: Math.min(6, defender.stages.spc + 1) };
}

export function resolveKoAbility(attacker: Combatant, defender: Combatant): AbilityStageResolution {
  if (abilityOf(attacker.mon)?.id !== "staffetta" || defender.mon.hp > 0 || attacker.mon.hp <= 0) {
    return { triggered: false, key: "spd", resulting: attacker.stages.spd };
  }
  return { triggered: true, key: "spd", resulting: Math.min(6, attacker.stages.spd + 1) };
}

// Boss R1: sotto metà PV cambia linea. Reset solo dei propri stage negativi e
// +1 VEL, una volta per battaglia. Non cura, non aumenta HP e resta leggibile.
export function resolveFuturoPhase(combatant: Combatant, alreadyTriggered: boolean): FuturoPhaseResolution {
  const maxHp = statsOf(combatant.mon).hp;
  if (alreadyTriggered || combatant.mon.hp <= 0 || combatant.mon.hp * 2 > maxHp) {
    return { triggered: false, stages: { ...combatant.stages } };
  }
  return {
    triggered: true,
    stages: {
      atk: Math.max(0, combatant.stages.atk),
      def: Math.max(0, combatant.stages.def),
      spc: Math.max(0, combatant.stages.spc),
      spd: Math.min(6, Math.max(0, combatant.stages.spd) + 1)
    }
  };
}
