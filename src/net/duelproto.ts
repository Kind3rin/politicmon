// DUELLO PvP: protocollo wire e validazione dei team. Zero dipendenze da
// scene o da mp.ts (mp importa QUESTO modulo). Il duello è HOST-AUTORITATIVO:
// chi invita è host, simula i turni con la propria RNG e broadcasta un
// log-eventi con valori ASSOLUTI (hpAfter, stage risultanti); il guest applica
// il log per assegnazione. Sul filo passano SOLO eventi strutturati e team
// {speciesId, level, moveIds}: le stat derivano da specie+livello, quindi
// barare su HP/stat è impossibile per costruzione (validateWireTeam).

import { MOVES, type StatKey, type StatusId } from "../data/moves";
import { SPECIES } from "../data/species";
import { createMonster, LEVEL_CAP, type Monster } from "../game/monster";

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
  | { e: "dmg"; side: DuelSide; hpAfter: number; crit: boolean; typeMult: number; pollEstimate?: "low" | "high" }
  | { e: "heal"; side: DuelSide; hpAfter: number; cured?: boolean }
  | { e: "drain"; side: DuelSide; hpAfter: number }
  | { e: "recoil"; side: DuelSide; hpAfter: number }
  | { e: "stat"; side: DuelSide; key: StatKey; stages: number; resulting: number }
  | { e: "status"; side: DuelSide; id: StatusId }
  | { e: "gaffeStart"; side: DuelSide; turns: number }
  | { e: "eot"; side: DuelSide; hpAfter: number }
  | { e: "faint"; side: DuelSide }
  | { e: "switch"; side: DuelSide; index: number }
  | { e: "stageReset"; side: DuelSide }
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
  // DIALOGO 1:1 (TalkScene): viaggia sul canale duello per non toccare mp.ts
  // (nessun nuovo makeAction). `duelId` fa da talkId. Le scene duello ignorano
  // questi tipi per costruzione (filtrano su un duelId che non combacia mai);
  // i client vecchi li scartano nel fall-through di onDuelMsg.
  | { type: "talk-invite"; nick: string }
  | { type: "talk-accept" }
  | { type: "talk-decline"; reason?: string }
  | { type: "talk-line"; text: string }
  | { type: "talk-end" }
);

export const DUEL_INVITE_TIMEOUT = 30; // s: attesa risposta all'invito
export const TALK_INVITE_TIMEOUT = 20; // s: attesa risposta a "vuole parlarti"
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

// Mappa inversa delle evoluzioni (id evoluto -> id della pre-evoluzione),
// costruita una volta da SPECIES[].evolutions: serve a risalire la catena.
const PRE_EVO: Record<string, string> = {};
for (const sp of Object.values(SPECIES)) {
  for (const rule of sp.evolutions ?? []) {
    PRE_EVO[rule.id] = sp.id;
  }
}

// Stessa regola di canLearnMove (monster.ts) ma senza istanza Monster: mossa
// nel learnset oppure tipo condiviso. evolve() conserva mon.moves, quindi le
// mosse legali per QUALSIASI pre-evoluzione della catena restano legittime
// (es. SCHLEINIX con COMIZIO imparato da ELLYNA).
export function legalMoveForSpecies(speciesId: string, moveId: string): boolean {
  const move = MOVES[moveId];
  if (!move) {
    return false;
  }
  const seen = new Set<string>();
  let species = SPECIES[speciesId];
  while (species && !seen.has(species.id)) {
    seen.add(species.id);
    if (species.learnset.some(([, id]) => id === moveId) || species.types.includes(move.type)) {
      return true;
    }
    species = SPECIES[PRE_EVO[species.id] ?? ""];
  }
  return false;
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
    if (!Number.isInteger(level) || level < 1 || level > LEVEL_CAP) {
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

const DUEL_SIDES = new Set<string>(["host", "guest"]);
const STAT_KEYS = new Set<string>(["atk", "def", "spc", "spd"]);
const STATUS_IDS = new Set<string>(["indagato", "scandalo", "gaffe"]);
const END_REASONS = new Set<string>(["ko", "forfeit", "timeout", "disconnect", "draw"]);

function clampInt(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// Valida e RICOSTRUISCE il comando del guest (host-side). null = malformato:
// il chiamante lo ignora (il timeout di turno fa il resto).
export function sanitizeDuelCmd(raw: unknown): DuelCmd | null {
  const cmd = raw as { kind?: unknown; moveId?: unknown; index?: unknown } | null;
  if (!cmd || typeof cmd !== "object") {
    return null;
  }
  if (cmd.kind === "forfeit") {
    return { kind: "forfeit" };
  }
  if (cmd.kind === "move" && typeof cmd.moveId === "string" && MOVES[cmd.moveId]) {
    return { kind: "move", moveId: cmd.moveId };
  }
  if (cmd.kind === "switch") {
    const index = clampInt(cmd.index, 0, DUEL_TEAM_MAX - 1);
    return index === null ? null : { kind: "switch", index };
  }
  return null;
}

// Valida e RICOSTRUISCE il turnlog dal filo (guest-side): il log viene
// applicato per assegnazione dentro l'update loop, quindi un evento malformato
// (side inventato, hpAfter non numerico...) congelerebbe il client. Un solo
// evento invalido scarta l'INTERO log: protocollo rotto, il chiamante chiude.
export function sanitizeTurnlog(raw: unknown): DuelEvent[] | null {
  if (!Array.isArray(raw) || raw.length > 200) {
    return null;
  }
  const out: DuelEvent[] = [];
  for (const item of raw) {
    const ev = item as { [k: string]: unknown } | null;
    if (!ev || typeof ev !== "object") {
      return null;
    }
    const side = String(ev.side);
    const hpAfter = clampInt(ev.hpAfter, 0, 9999);
    switch (ev.e) {
      case "move":
        if (!DUEL_SIDES.has(side) || typeof ev.moveId !== "string" || !MOVES[ev.moveId]) {
          return null;
        }
        out.push({ e: "move", side: side as DuelSide, moveId: ev.moveId });
        break;
      case "miss":
      case "faint":
      case "gaffeEnd":
      case "stageReset":
        if (!DUEL_SIDES.has(side)) {
          return null;
        }
        out.push({ e: ev.e, side: side as DuelSide });
        break;
      case "blocked":
        if (!DUEL_SIDES.has(side)) {
          return null;
        }
        out.push({ e: "blocked", side: side as DuelSide, why: "indagato" });
        break;
      case "gaffeSelf":
      case "drain":
      case "recoil":
      case "eot":
        if (!DUEL_SIDES.has(side) || hpAfter === null) {
          return null;
        }
        out.push({ e: ev.e, side: side as DuelSide, hpAfter });
        break;
      case "dmg": {
        const typeMult = Number(ev.typeMult);
        if (!DUEL_SIDES.has(side) || hpAfter === null || !Number.isFinite(typeMult)) {
          return null;
        }
        out.push({
          e: "dmg", side: side as DuelSide, hpAfter,
          crit: Boolean(ev.crit), typeMult: Math.max(0, Math.min(4, typeMult)),
          pollEstimate: ev.pollEstimate === "low" || ev.pollEstimate === "high" ? ev.pollEstimate : undefined
        });
        break;
      }
      case "heal":
        if (!DUEL_SIDES.has(side) || hpAfter === null) {
          return null;
        }
        out.push({ e: "heal", side: side as DuelSide, hpAfter, cured: Boolean(ev.cured) });
        break;
      case "stat": {
        const stages = clampInt(ev.stages, -6, 6);
        const resulting = clampInt(ev.resulting, -6, 6);
        if (!DUEL_SIDES.has(side) || !STAT_KEYS.has(String(ev.key)) || stages === null || resulting === null) {
          return null;
        }
        out.push({ e: "stat", side: side as DuelSide, key: ev.key as StatKey, stages, resulting });
        break;
      }
      case "status":
        if (!DUEL_SIDES.has(side) || !STATUS_IDS.has(String(ev.id))) {
          return null;
        }
        out.push({ e: "status", side: side as DuelSide, id: ev.id as StatusId });
        break;
      case "gaffeStart": {
        const turns = clampInt(ev.turns, 1, 9);
        if (!DUEL_SIDES.has(side) || turns === null) {
          return null;
        }
        out.push({ e: "gaffeStart", side: side as DuelSide, turns });
        break;
      }
      case "switch": {
        const index = clampInt(ev.index, 0, DUEL_TEAM_MAX - 1);
        if (!DUEL_SIDES.has(side) || index === null) {
          return null;
        }
        out.push({ e: "switch", side: side as DuelSide, index });
        break;
      }
      case "end": {
        const winner = ev.winner === null ? null : String(ev.winner);
        if ((winner !== null && !DUEL_SIDES.has(winner)) || !END_REASONS.has(String(ev.reason))) {
          return null;
        }
        out.push({ e: "end", winner: winner as DuelSide | null, reason: ev.reason as DuelEndReason });
        break;
      }
      default:
        return null;
    }
  }
  return out;
}
