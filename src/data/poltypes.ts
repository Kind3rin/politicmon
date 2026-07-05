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

// Icona-simbolo PixelLab per ogni ideologia (megafono/ingranaggio/...), disegnata
// sul chip colorato accanto al nome del tipo. Null finché il PNG non c'è.
const TYPE_ICON_FILE: Record<PolType, string> = {
  POPULISMO: "type_populismo",
  TECNO: "type_tecno",
  DESTRA: "type_destra",
  SINISTRA: "type_sinistra",
  CENTRO: "type_centro",
  MEDIA: "type_media",
  ISTITUZIONE: "type_istituzione",
  VERDE: "type_verde"
};

export function typeIcon(type: PolType): HTMLImageElement | null {
  // import dinamico evitato: assets è leggero e già caricato altrove
  return getTypeIconImage(`type:${type}`, `ui/${TYPE_ICON_FILE[type]}.png`);
}

// piccolo wrapper per non importare assets in cima (mantiene poltypes data-only).
let _getImg: ((id: string, path: string) => HTMLImageElement | null) | null = null;
export function setTypeIconLoader(fn: (id: string, path: string) => HTMLImageElement | null): void {
  _getImg = fn;
}
function getTypeIconImage(id: string, path: string): HTMLImageElement | null {
  return _getImg ? _getImg(id, path) : null;
}

// Moltiplicatori: 2 super efficace, 0.5 non molto efficace, 1 default.
// Nota di design: SINISTRA è super efficace contro SINISTRA.
const CHART: Partial<Record<PolType, Partial<Record<PolType, number>>>> = {
  POPULISMO: { TECNO: 2, ISTITUZIONE: 2, CENTRO: 0.5 },
  TECNO: { CENTRO: 2, MEDIA: 2, POPULISMO: 0.5 },
  DESTRA: { SINISTRA: 2, VERDE: 2, ISTITUZIONE: 0.5, CENTRO: 0.5 },
  // SINISTRA→CENTRO: 2 chiude il triangolo degli starter (DESTRA>SINISTRA>CENTRO>
  // DESTRA). Prima ellyna/SINISTRA non aveva vantaggio su renzino/CENTRO (che anzi
  // la resisteva 0.6×): lo starter di sinistra era offensivamente il più debole.
  SINISTRA: { DESTRA: 2, SINISTRA: 2, CENTRO: 2, POPULISMO: 0.5 },
  CENTRO: { DESTRA: 2, SINISTRA: 0.5, TECNO: 0.5 },
  // MEDIA→DESTRA: 0.5 dà a DESTRA la sua PRIMA resistenza (era debole a 3 tipi e
  // resistito da 0, il peggior tipo difensivo pur essendo il più comune, 12/39).
  // Flavor: la destra istituzionale incassa la gogna mediatica.
  MEDIA: { ISTITUZIONE: 2, CENTRO: 2, DESTRA: 0.5, TECNO: 0.5 },
  ISTITUZIONE: { POPULISMO: 2, MEDIA: 0.5, ISTITUZIONE: 0.5 },
  // R42: VERDE super-efficace anche contro TECNO (attivismo vs tecnocrazia).
  // Dà a TECNO una seconda debolezza diretta (aveva solo POPULISMO), senza
  // toccare le altre relazioni VERDE. POPULISMO resta senza aggiunte (SINISTRA→
  // POPULISMO romperebbe il flavor).
  VERDE: { TECNO: 2, DESTRA: 2, MEDIA: 2, POPULISMO: 0.5 }
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
