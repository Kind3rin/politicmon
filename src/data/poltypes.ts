// Tipi politici e tabella delle efficacie (satira inclusa nel dato).

export type PolType =
  | "POPULISMO"
  | "TECNO"
  | "DESTRA"
  | "SINISTRA"
  | "CENTRO"
  | "MEDIA"
  | "ISTITUZIONE"
  | "VERDE";

export const TYPE_COLORS: Record<PolType, string> = {
  POPULISMO: "#d88030",
  TECNO: "#5878b8",
  DESTRA: "#384878",
  SINISTRA: "#c84848",
  CENTRO: "#9888b8",
  MEDIA: "#d8b838",
  ISTITUZIONE: "#48988a",
  VERDE: "#48a058"
};

// Moltiplicatori: 2 super efficace, 0.5 non molto efficace, 1 default.
// Nota di design: SINISTRA è super efficace contro SINISTRA.
const CHART: Partial<Record<PolType, Partial<Record<PolType, number>>>> = {
  POPULISMO: { TECNO: 2, ISTITUZIONE: 2, CENTRO: 0.5 },
  TECNO: { CENTRO: 2, MEDIA: 2, POPULISMO: 0.5 },
  DESTRA: { SINISTRA: 2, VERDE: 2, ISTITUZIONE: 0.5, CENTRO: 0.5 },
  SINISTRA: { DESTRA: 2, SINISTRA: 2, POPULISMO: 0.5 },
  CENTRO: { DESTRA: 2, SINISTRA: 0.5, TECNO: 0.5 },
  MEDIA: { ISTITUZIONE: 2, CENTRO: 2, TECNO: 0.5 },
  ISTITUZIONE: { POPULISMO: 2, MEDIA: 0.5, ISTITUZIONE: 0.5 },
  VERDE: { DESTRA: 2, MEDIA: 2, POPULISMO: 0.5 }
};

export function typeMultiplier(attack: PolType, defenderTypes: PolType[]): number {
  let mult = 1;
  for (const def of defenderTypes) {
    mult *= CHART[attack]?.[def] ?? 1;
  }
  return mult;
}
