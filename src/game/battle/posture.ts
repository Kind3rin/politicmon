/** One free choice per turn, read against the opponent's declared intent:
 * hit harder, brush the blow off, or stall for resources. */
export type Posture = "none" | "attacca" | "smentisci" | "tempo";

export const POSTURES: Record<Exclude<Posture, "none">, { label: string; short: string; rule: string; tip: string }> = {
  attacca: {
    label: "Attacca", short: "più danno", rule: "Colpisci ×1,3, ma subisci ×1,3.",
    tip: "Conviene quando l'avversario prepara uno status: nessun colpo da incassare."
  },
  smentisci: {
    label: "Smentisci", short: "meno danni", rule: "Subisci ×0,55 e gli status vengono respinti. Colpisci ×0,8.",
    tip: "Conviene quando l'avversario prepara un attacco forte."
  },
  tempo: {
    label: "Temporeggia", short: "senza PP", rule: "La mossa non consuma PP e dà +1 Polemica. Colpisci ×0,9.",
    tip: "Conviene a mosse quasi finite o per arrivare al Fuorionda."
  }
};

export const postureDealt = (posture: Posture): number => posture === "attacca" ? 1.3 : posture === "smentisci" ? 0.8 : posture === "tempo" ? 0.9 : 1;
export const postureTaken = (posture: Posture): number => posture === "attacca" ? 1.3 : posture === "smentisci" ? 0.55 : 1;
export const postureBlocksStatus = (posture: Posture): boolean => posture === "smentisci";
export const postureKeepsPP = (posture: Posture): boolean => posture === "tempo";
export const posturePolemica = (posture: Posture): number => posture === "tempo" ? 1 : 0;

/** Damage is never rounded down to nothing, and nothing is added to a miss. */
export function postureDamage(damage: number, factor: number): number {
  return damage <= 0 ? 0 : Math.max(1, Math.round(damage * factor));
}
