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

// Ordine canonico degli 8 tipi (per la schermata GUIDA TIPI).
export const TYPE_ORDER: PolType[] = [
  "POPULISMO", "TECNO", "DESTRA", "SINISTRA", "CENTRO", "MEDIA", "ISTITUZIONE", "VERDE"
];

// Relazioni di un tipo ATTACCANTE: contro chi è forte (2x) e contro chi è
// debole (0.5x). Usato dalla schermata di aiuto e dalle schede del Dex.
export function typeRelations(attack: PolType): { strong: PolType[]; weak: PolType[] } {
  const row = CHART[attack] ?? {};
  const strong: PolType[] = [];
  const weak: PolType[] = [];
  for (const def of TYPE_ORDER) {
    const m = row[def];
    if (m !== undefined && m >= 2) {
      strong.push(def);
    } else if (m !== undefined && m < 1) {
      weak.push(def);
    }
  }
  return { strong, weak };
}

export function typeMultiplier(attack: PolType, defenderTypes: PolType[]): number {
  let mult = 1;
  for (const def of defenderTypes) {
    mult *= CHART[attack]?.[def] ?? 1;
  }
  // Comprime gli estremi: col danno attuale 2x super-efficace = ~40% HP/colpo
  // nell'early game (KO in 2-3 colpi, frustrante per chi non conosce la tabella
  // tipi). Ammorbidiamo: 4x->2.2, 2x->1.7, 0.5x->0.6, 0.25x->0.45. Il vantaggio
  // di tipo resta leggibile e premiante, ma non più letale al primo errore.
  if (mult >= 4) {
    return 2.2;
  }
  if (mult >= 2) {
    return 1.7;
  }
  if (mult > 0 && mult <= 0.25) {
    return 0.45;
  }
  if (mult > 0 && mult < 1) {
    return 0.6;
  }
  return mult;
}
