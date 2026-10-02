import type { Move } from "../../data/moves";

/** Battle-local attention. Failed actions and repeated slogans earn nothing. */
export class Polemica {
  value = 0;
  private lastMove: string | null = null;

  gainFor(move: Move): number {
    return move.id === FUORIONDA.id || move.id === this.lastMove || (move.power === 0 && (move.effect?.healRatio || move.effect?.cureStatus)) ? 0 : move.power === 0 ? 2 : 1;
  }

  reward(move: Move, changed: boolean): number {
    if (!changed || move.id === FUORIONDA.id) return 0;
    const gain = this.gainFor(move);
    this.lastMove = move.id;
    const before = this.value;
    this.value = Math.min(3, this.value + gain);
    return this.value - before;
  }

  spend(): boolean {
    if (this.value < 3) return false;
    this.value = 0;
    this.lastMove = null;
    return true;
  }
}

export const FUORIONDA: Move = {
  id: "battle-fuorionda", name: "FUORIONDA", type: "MEDIA", category: "speciale",
  power: 1, accuracy: 100, pp: 1,
  flavor: "Il microfono era aperto. Ora lo sanno tutti."
};

export function fuoriondaDamage(maxHp: number): number {
  return Math.max(1, Math.round(maxHp * .4));
}

export function recruitmentChance(base: number, appello: boolean, viral = false): number {
  return Math.min(.95, base * (appello ? 2 : 1) * (viral ? 1.65 : 1));
}
