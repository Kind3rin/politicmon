// Simulazione del DUELLO PvP, PURA (niente Screen/Input/audio).
// - resolveTurn: SOLO l'host la chiama; usa la RNG iniettata (Math.random
//   dell'host) e MUTA il sim emettendo un log-eventi con valori assoluti.
// - applyEvent/applyEvents: applicazione per ASSEGNAZIONE del log (guest, e
//   presentazione passo-passo su entrambi i lati). Mai ricalcolo.
//
// SENTINELLA BILANCIAMENTO: la semantica dei TURNI replica moveSteps/startTurn
// di BattleScene.ts (INDAGATO 25%, GAFFE 33% e danno floor(lv*2/3)+2, accuracy
// con eccezione self-target, SCANDALO maxHp/8, clamp stage ±6). Il DANNO invece
// NON è più una copia: si usa direttamente calcDamage di sim.ts con la RNG
// iniettata, quindi il bilanciamento danno PVE vale automaticamente anche qui.
// Ogni futura modifica alla semantica di turno di BattleScene va replicata QUI
// (check-duel.mjs copre le divergenze).

import { MOVES, type Move } from "../../data/moves";
import { statsOf, type Monster, type MoveSlot } from "../monster";
import { calcDamage, effectiveStat, makeCombatant, type Combatant } from "./sim";
import type { DuelCmd, DuelEvent, DuelSide } from "../../net/duelproto";

export type Rng = () => number;

export interface DuelSideState {
  party: Monster[];
  activeIdx: number;
  active: Combatant;
}

export interface DuelSim {
  host: DuelSideState;
  guest: DuelSideState;
}

export function makeDuelSim(hostTeam: Monster[], guestTeam: Monster[]): DuelSim {
  return {
    host: { party: hostTeam, activeIdx: 0, active: makeCombatant(hostTeam[0]) },
    guest: { party: guestTeam, activeIdx: 0, active: makeCombatant(guestTeam[0]) }
  };
}

export function otherSide(side: DuelSide): DuelSide {
  return side === "host" ? "guest" : "host";
}

export function aliveCount(side: DuelSideState): number {
  return side.party.filter((m) => m.hp > 0).length;
}

export function usableMoves(mon: Monster): MoveSlot[] {
  return mon.moves.filter((slot) => slot.pp > 0);
}

// Mossa effettiva per un cmd "move": slot con PP, altrimenti COMIZIO gratuito
// (stesso fallback di chooseFoeMove quando i PP sono finiti).
function resolveMoveChoice(active: Combatant, moveId: string): { move: Move; slot: MoveSlot | null } {
  const usable = usableMoves(active.mon);
  if (usable.length === 0) {
    return { move: MOVES.comizio, slot: null };
  }
  const slot = usable.find((sl) => sl.id === moveId) ?? usable[0];
  return { move: MOVES[slot.id], slot };
}

// Esegue la mossa di `side` emettendo eventi (semantica di moveSteps).
function executeMove(sim: DuelSim, side: DuelSide, moveId: string, events: DuelEvent[], rng: Rng): void {
  const attacker = sim[side].active;
  const defender = sim[otherSide(side)].active;
  if (attacker.mon.hp <= 0 || defender.mon.hp <= 0) {
    return;
  }
  // INDAGATO: 25% di saltare il turno.
  if (attacker.mon.status === "indagato" && rng() < 0.25) {
    events.push({ e: "blocked", side, why: "indagato" });
    return;
  }
  // GAFFE: decremento, chiarimento o auto-danno (33%).
  if (attacker.gaffeTurns > 0) {
    attacker.gaffeTurns -= 1;
    if (attacker.gaffeTurns === 0) {
      events.push({ e: "gaffeEnd", side });
    } else if (rng() < 0.33) {
      const self = Math.max(1, Math.floor((attacker.mon.level * 2) / 3) + 2);
      attacker.mon.hp = Math.max(0, attacker.mon.hp - self);
      events.push({ e: "gaffeSelf", side, hpAfter: attacker.mon.hp });
      faintCheck(sim, side, events);
      return;
    }
  }
  const { move, slot } = resolveMoveChoice(attacker, moveId);
  if (slot) {
    slot.pp = Math.max(0, slot.pp - 1);
  }
  events.push({ e: "move", side, moveId: move.id });

  const selfTargeted = move.power === 0 && !move.effect?.status && move.effect?.stat?.target !== "foe";
  if (!selfTargeted && rng() * 100 >= move.accuracy) {
    events.push({ e: "miss", side });
    return;
  }

  const defSide = otherSide(side);
  if (move.power > 0) {
    const result = calcDamage(attacker, defender, move, rng);
    defender.mon.hp = Math.max(0, defender.mon.hp - result.damage);
    events.push({ e: "dmg", side: defSide, hpAfter: defender.mon.hp, crit: result.crit, typeMult: result.typeMult });
    if (move.effect?.drainRatio) {
      const healed = Math.max(1, Math.floor(result.damage * move.effect.drainRatio));
      attacker.mon.hp = Math.min(statsOf(attacker.mon).hp, attacker.mon.hp + healed);
      events.push({ e: "drain", side, hpAfter: attacker.mon.hp });
    }
    if (move.effect?.recoilRatio) {
      const recoil = Math.max(1, Math.floor(result.damage * move.effect.recoilRatio));
      attacker.mon.hp = Math.max(0, attacker.mon.hp - recoil);
      events.push({ e: "recoil", side, hpAfter: attacker.mon.hp });
    }
  }

  const effect = move.effect;
  if (effect?.healRatio) {
    const max = statsOf(attacker.mon).hp;
    attacker.mon.hp = Math.min(max, attacker.mon.hp + Math.floor(max * effect.healRatio));
    if (effect.cureStatus) {
      attacker.mon.status = null;
    }
    events.push({ e: "heal", side, hpAfter: attacker.mon.hp, cured: Boolean(effect.cureStatus) });
  }
  if (effect?.stat) {
    const targetSide = effect.stat.target === "self" ? side : defSide;
    const target = sim[targetSide].active;
    if ((effect.stat.chance ?? 100) > rng() * 100) {
      const resulting = Math.max(-6, Math.min(6, target.stages[effect.stat.key] + effect.stat.stages));
      target.stages[effect.stat.key] = resulting;
      events.push({ e: "stat", side: targetSide, key: effect.stat.key, stages: effect.stat.stages, resulting });
    }
  }
  if (effect?.status && defender.mon.hp > 0) {
    if (rng() * 100 < effect.status.chance) {
      const id = effect.status.id;
      if (!(defender.mon.status || (id === "gaffe" && defender.gaffeTurns > 0))) {
        if (id === "gaffe") {
          const turns = 2 + Math.floor(rng() * 3);
          defender.gaffeTurns = turns;
          events.push({ e: "gaffeStart", side: defSide, turns });
        } else {
          defender.mon.status = id;
          events.push({ e: "status", side: defSide, id });
        }
      }
    }
  }

  faintCheck(sim, defSide, events);
  faintCheck(sim, side, events); // recoil/gaffe possono stendere l'attaccante
}

function faintCheck(sim: DuelSim, side: DuelSide, events: DuelEvent[]): void {
  const c = sim[side].active;
  if (c.mon.hp > 0) {
    return;
  }
  // Evita doppioni: un solo faint per mostro attivo per log.
  const already = events.some((ev) => ev.e === "faint" && ev.side === side);
  if (!already) {
    events.push({ e: "faint", side });
  }
}

function duelEndCheck(sim: DuelSim, events: DuelEvent[]): boolean {
  const hostDead = aliveCount(sim.host) === 0;
  const guestDead = aliveCount(sim.guest) === 0;
  if (!hostDead && !guestDead) {
    return false;
  }
  if (hostDead && guestDead) {
    events.push({ e: "end", winner: null, reason: "draw" });
  } else {
    events.push({ e: "end", winner: hostDead ? "guest" : "host", reason: "ko" });
  }
  return true;
}

// Cambio (volontario o forzato): valida l'indice ed emette l'evento.
export function applySwitch(sim: DuelSim, side: DuelSide, index: number, events: DuelEvent[]): boolean {
  const st = sim[side];
  const target = st.party[index];
  if (!target || target.hp <= 0 || index === st.activeIdx) {
    return false;
  }
  st.activeIdx = index;
  st.active = makeCombatant(target); // reset stage/gaffe come switchTo PVE
  events.push({ e: "switch", side, index });
  return true;
}

// Risolve un turno completo (SOLO HOST). Muta `sim` ed emette il log.
export function resolveTurn(sim: DuelSim, hostCmd: DuelCmd, guestCmd: DuelCmd, rng: Rng = Math.random): DuelEvent[] {
  const events: DuelEvent[] = [];

  // Resa: fine immediata (normalmente viaggia come msg "end", questo è il
  // fallback difensivo se arriva come cmd).
  if (hostCmd.kind === "forfeit" || guestCmd.kind === "forfeit") {
    const winner: DuelSide | null =
      hostCmd.kind === "forfeit" && guestCmd.kind === "forfeit" ? null : hostCmd.kind === "forfeit" ? "guest" : "host";
    events.push({ e: "end", winner, reason: winner === null ? "draw" : "forfeit" });
    return events;
  }

  // 1) Gli switch risolvono prima delle mosse (host per primo).
  if (hostCmd.kind === "switch") {
    applySwitch(sim, "host", hostCmd.index, events);
  }
  if (guestCmd.kind === "switch") {
    applySwitch(sim, "guest", guestCmd.index, events);
  }

  // 2) Ordine mosse: priority, poi OPPORTUNISMO effettivo, tie con RNG host
  // (replica di startTurn di BattleScene).
  const movers: DuelSide[] = [];
  if (hostCmd.kind === "move" && guestCmd.kind === "move") {
    const hMove = resolveMoveChoice(sim.host.active, hostCmd.moveId).move;
    const gMove = resolveMoveChoice(sim.guest.active, guestCmd.moveId).move;
    const hPri = hMove.effect?.priority ?? 0;
    const gPri = gMove.effect?.priority ?? 0;
    const hostFirst =
      hPri !== gPri
        ? hPri > gPri
        : effectiveStat(sim.host.active, "spd") === effectiveStat(sim.guest.active, "spd")
          ? rng() < 0.5
          : effectiveStat(sim.host.active, "spd") > effectiveStat(sim.guest.active, "spd");
    movers.push(hostFirst ? "host" : "guest", hostFirst ? "guest" : "host");
  } else if (hostCmd.kind === "move") {
    movers.push("host");
  } else if (guestCmd.kind === "move") {
    movers.push("guest");
  }

  for (let i = 0; i < movers.length; i += 1) {
    const side = movers[i];
    const cmd = side === "host" ? hostCmd : guestCmd;
    if (cmd.kind !== "move") {
      continue;
    }
    // La seconda mossa parte solo se entrambi gli attivi sono vivi.
    if (sim.host.active.mon.hp <= 0 || sim.guest.active.mon.hp <= 0) {
      break;
    }
    executeMove(sim, side, cmd.moveId, events, rng);
    if (duelEndCheck(sim, events)) {
      return events;
    }
  }

  // 3) Fine turno: SCANDALO logora entrambi (host poi guest, come PVE
  // player->foe).
  for (const side of ["host", "guest"] as DuelSide[]) {
    const c = sim[side].active;
    if (c.mon.hp > 0 && c.mon.status === "scandalo") {
      c.mon.hp = Math.max(0, c.mon.hp - Math.max(1, Math.floor(statsOf(c.mon).hp / 8)));
      events.push({ e: "eot", side, hpAfter: c.mon.hp });
      faintCheck(sim, side, events);
    }
  }
  duelEndCheck(sim, events);
  return events;
}

// Applica UN evento per assegnazione (guest e presentazione passo-passo).
export function applyEvent(sim: DuelSim, ev: DuelEvent): void {
  switch (ev.e) {
    case "move": {
      const active = sim[ev.side].active;
      const slot = active.mon.moves.find((sl) => sl.id === ev.moveId);
      if (slot && slot.pp > 0) {
        slot.pp -= 1;
      }
      return;
    }
    case "switch": {
      const st = sim[ev.side];
      const target = st.party[ev.index];
      if (target) {
        st.activeIdx = ev.index;
        st.active = makeCombatant(target);
      }
      return;
    }
    case "dmg":
    case "eot":
    case "drain":
    case "recoil":
      sim[ev.side].active.mon.hp = ev.hpAfter;
      return;
    case "gaffeSelf": {
      const c = sim[ev.side].active;
      c.mon.hp = ev.hpAfter;
      c.gaffeTurns = Math.max(0, c.gaffeTurns - 1);
      return;
    }
    case "gaffeEnd":
      sim[ev.side].active.gaffeTurns = 0;
      return;
    case "gaffeStart":
      sim[ev.side].active.gaffeTurns = ev.turns;
      return;
    case "heal": {
      const c = sim[ev.side].active;
      c.mon.hp = ev.hpAfter;
      if (ev.cured) {
        c.mon.status = null;
      }
      return;
    }
    case "stat":
      sim[ev.side].active.stages[ev.key] = ev.resulting;
      return;
    case "status":
      sim[ev.side].active.mon.status = ev.id;
      return;
    case "faint":
      sim[ev.side].active.mon.hp = 0;
      return;
    case "blocked":
    case "miss":
    case "end":
      return;
  }
}

export function applyEvents(sim: DuelSim, events: DuelEvent[]): void {
  for (const ev of events) {
    applyEvent(sim, ev);
  }
}
