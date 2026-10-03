import { namedCatalog } from "./catalog";
import { roster } from "./roster";
import type { PolType } from "./poltypes";

export type StatusId = "indagato" | "scandalo" | "gaffe";
export type StatKey = "atk" | "def" | "spc" | "spd";

export interface MoveEffect {
  status?: { id: StatusId; chance: number; target: "foe" };
  stat?: { key: StatKey; stages: number; target: "self" | "foe"; chance?: number };
  healRatio?: number; // frazione dei PV massimi recuperata
  drainRatio?: number; // frazione del danno recuperata
  recoilRatio?: number; // frazione del danno subita come rinculo
  cureStatus?: boolean;
  highCrit?: boolean;
  priority?: number;
  /** Proc offensivo applicato soltanto alla prima azione del turno. */
  statusIfFirst?: { id: StatusId; chance: number; target: "foe" };
}

export interface Move {
  id: string;
  name: string;
  type: PolType;
  category: "fisico" | "speciale" | "status";
  power: number;
  accuracy: number; // 0-100; le mosse su se stessi non falliscono
  pp: number;
  effect?: MoveEffect;
  flavor: string;
}

export const MOVES: Record<string, Move> = namedCatalog<Omit<Move, "name">>(roster.moves);

// Etichette brevi delle statistiche, per le righe di riepilogo mossa.
const STAT_SHORT: Record<StatKey, string> = {
  atk: "GRINTA",
  def: "FACCIA",
  spc: "RETORICA",
  spd: "VELOCITÀ"
};

const STATUS_SHORT: Record<StatusId, string> = {
  indagato: "INDAGATO",
  scandalo: "SCANDALO",
  gaffe: "GAFFE"
};

// Categoria della mossa come parola chiara: COLPO / SPECIALE / EFFETTO.
export function moveKindLabel(move: Move): string {
  if (move.category === "status") {
    return "EFFETTO";
  }
  return move.category === "fisico" ? "COLPO" : "SPECIALE";
}

// Spiega a colpo d'occhio cosa fa una mossa: danno e/o effetti, buff/debuff,
// cure, status. Restituisce una riga compatta per il menu di lotta.
// Le frecce "▲"/"▼" esistono nel bitmap font (src/engine/font.ts).
export function moveSummary(move: Move, perspective: "player" | "foe" = "player"): string {
  const parts: string[] = [];
  if (move.power > 0) {
    parts.push(`${perspective === "foe" ? "POTENZA" : "DANNO"} ${move.power}`);
  }
  const fx = move.effect;
  if (fx) {
    if (fx.healRatio) {
      parts.push(`CURA ${Math.round(fx.healRatio * 100)}% PV`);
    }
    if (fx.drainRatio) {
      parts.push("RUBA PV");
    }
    if (fx.recoilRatio) {
      parts.push("CONTRACCOLPO");
    }
    if (fx.cureStatus) {
      parts.push("TOGLIE STATUS");
    }
    if (fx.stat) {
      const arrow = fx.stat.stages > 0 ? "▲" : "▼";
      const who = (fx.stat.target === "self") === (perspective === "player") ? "TUO" : "NEMICO";
      const arrows = arrow.repeat(Math.min(2, Math.abs(fx.stat.stages)));
      parts.push(`${STAT_SHORT[fx.stat.key]} ${who} ${arrows}`);
    }
    if (fx.status) {
      const chance = fx.status.chance >= 100 ? "" : `${fx.status.chance}% `;
      parts.push(`${chance}${STATUS_SHORT[fx.status.id]}`);
    }
    if (fx.statusIfFirst) {
      parts.push(`${fx.statusIfFirst.chance}% ${STATUS_SHORT[fx.statusIfFirst.id]} SE PRIMO`);
    }
    if (fx.highCrit) {
      parts.push("CRITICO FACILE");
    }
    if (fx.priority && fx.priority > 0) {
      parts.push("COLPISCE PRIMA");
    }
  }
  if (parts.length === 0) {
    parts.push("DANNO BASE");
  }
  return parts.join("  ");
}

export const STATUS_LABELS: Record<StatusId, string> = {
  indagato: "IND",
  scandalo: "SCA",
  gaffe: "GAF"
};

export const STATUS_NAMES: Record<StatusId, string> = {
  indagato: "INDAGATO",
  scandalo: "NELLO SCANDALO",
  gaffe: "IN GAFFE"
};
