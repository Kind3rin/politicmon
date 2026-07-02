// DUELLO PvP: protocollo wire e validazione dei team. Zero dipendenze da
// scene o da mp.ts (mp importa QUESTO modulo). Il duello è HOST-AUTORITATIVO:
// chi invita è host, simula i turni con la propria RNG e broadcasta un
// log-eventi con valori ASSOLUTI (hpAfter, stage risultanti); il guest applica
// il log per assegnazione. Sul filo passano SOLO eventi strutturati e team
// {speciesId, level, moveIds}: le stat derivano da specie+livello, quindi
// barare su HP/stat è impossibile per costruzione (validateWireTeam).

import { MOVES, type StatKey, type StatusId } from "../data/moves";
import { SPECIES } from "../data/species";
import { createMonster, type Monster } from "../game/monster";

export type DuelSide = "host" | "guest";

// Team sul filo: speciesId, level, moveIds (1-4).
export type WireMon = { s: string; l: number; m: string[] };

export type DuelCmd =
  | { kind: "move"; moveId: string }
  | { kind: "switch"; index: number }
  | { kind: "forfeit" };

export type DuelEndReason = "ko" | "forfeit" | "timeout" | "disconnect" | "draw";

// Eventi del log di turno (unione discriminata su `e`). `side` = chi SUBISCE
// per dmg/heal/eot..., chi AGISCE per move/switch. Tutti i valori sono
// assoluti: il guest non ricalcola mai.
export type DuelEvent =
  | { e: "move"; side: DuelSide; moveId: string }
  | { e: "miss"; side: DuelSide }
  | { e: "blocked"; side: DuelSide; why: "indagato" }
  | { e: "gaffeSelf"; side: DuelSide; hpAfter: number }
  | { e: "gaffeEnd"; side: DuelSide }
  | { e: "dmg"; side: DuelSide; hpAfter: number; crit: boolean; typeMult: number }
  | { e: "heal"; side: DuelSide; hpAfter: number; cured?: boolean }
  | { e: "drain"; side: DuelSide; hpAfter: number }
  | { e: "recoil"; side: DuelSide; hpAfter: number }
  | { e: "stat"; side: DuelSide; key: StatKey; stages: number; resulting: number }
  | { e: "status"; side: DuelSide; id: StatusId }
  | { e: "gaffeStart"; side: DuelSide; turns: number }
  | { e: "eot"; side: DuelSide; hpAfter: number }
  | { e: "faint"; side: DuelSide }
  | { e: "switch"; side: DuelSide; index: number }
  | { e: "end"; winner: DuelSide | null; reason: DuelEndReason };

// Messaggi duello. `to` è la difesa in profondità sul broadcast (scartato in
// ricezione se non è per noi); il send è comunque mirato (SendOptions.target).
export type DuelMsg = { v: 1; to?: string; duelId: string } & (
  | { type: "invite"; nick: string; avg: number; maxLevel: number; preview: Array<{ s: string; l: number }> }
  | { type: "accept"; nick: string; team: WireMon[] }
  | { type: "decline"; reason?: string }
  | { type: "start"; hostTeam: WireMon[] }
  | { type: "cmd"; turn: number; cmd: DuelCmd }
  | { type: "turnlog"; turn: number; events: DuelEvent[] }
  | { type: "end"; winner: DuelSide | null; reason: DuelEndReason }
);

export const DUEL_INVITE_TIMEOUT = 30; // s: attesa risposta all'invito
export const DUEL_TURN_TIMEOUT = 30; // s: attesa cmd/turnlog -> tavolino
export const DUEL_TEAM_MAX = 6;

export function serializeTeam(party: Monster[]): WireMon[] {
  return party.slice(0, DUEL_TEAM_MAX).map((mon) => ({
    s: mon.speciesId,
    l: mon.level,
    m: mon.moves.map((slot) => slot.id)
  }));
}

export function avgLevel(wire: WireMon[]): number {
  if (wire.length === 0) {
    return 0;
  }
  return Math.round(wire.reduce((sum, w) => sum + w.l, 0) / wire.length);
}

export function maxLevel(wire: WireMon[]): number {
  return wire.reduce((max, w) => Math.max(max, w.l), 0);
}

// Stessa regola di canLearnMove (monster.ts) ma senza istanza Monster:
// mossa nel learnset della specie oppure tipo condiviso.
export function legalMoveForSpecies(speciesId: string, moveId: string): boolean {
  const species = SPECIES[speciesId];
  const move = MOVES[moveId];
  if (!species || !move) {
    return false;
  }
  return species.learnset.some(([, id]) => id === moveId) || species.types.includes(move.type);
}

// Valida e RICOSTRUISCE il team remoto (o il proprio, per simmetria: entrambi
// i lati girano su dati costruiti da questo stesso code path). null = team
// illegale (specie inesistente, livello fuori 1-50, mosse duplicate/illegali).
// HP/PP pieni per costruzione: si duella a squadre fresche.
export function validateWireTeam(wire: unknown): Monster[] | null {
  if (!Array.isArray(wire) || wire.length < 1 || wire.length > DUEL_TEAM_MAX) {
    return null;
  }
  const team: Monster[] = [];
  for (const raw of wire as Array<{ s?: unknown; l?: unknown; m?: unknown }>) {
    const species = SPECIES[String(raw?.s)];
    if (!species) {
      return null;
    }
    const level = Number(raw?.l);
    if (!Number.isInteger(level) || level < 1 || level > 50) {
      return null;
    }
    const moves = raw?.m;
    if (!Array.isArray(moves) || moves.length < 1 || moves.length > 4) {
      return null;
    }
    const ids = moves.map(String);
    if (new Set(ids).size !== ids.length) {
      return null;
    }
    for (const id of ids) {
      if (!legalMoveForSpecies(species.id, id)) {
        return null;
      }
    }
    const mon = createMonster(species.id, level);
    mon.moves = ids.map((id) => ({ id, pp: MOVES[id].pp }));
    team.push(mon);
  }
  return team;
}
