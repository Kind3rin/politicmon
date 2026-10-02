// Bitmap font 5x7 in stile Game Boy. Tutto il testo viene reso in maiuscolo.
// '#' = pixel acceso, '.' = trasparente.

export const GLYPH_W = 5;
export const GLYPH_H = 7;
export const CHAR_W = 6; // 5 + 1 di spaziatura
export const LINE_H = 9;

// Seven rows per glyph, each a five-bit mask encoded as ASCII A + mask.
// Decode once per used glyph; the renderer retains exactly the original pixels.
const GLYPH_KEYS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.,!?'\"-+:;/()%►◄▼▲♂♀ÈÉÀÌÒÙ★♪…€";
const GLYPH_ROWS = "ORTVZROEMEEEEOORBCEI`ORBGBROCGKS`CC`Q_BBROOQQ_RRO`BCEIIIORRORROORRPBBOORR`RRR_RR_RR_ORQQQRO_RRRRR_`QQ_QQ``QQ_QQQORQXRRORRR`RRROEEEEEOHCCCCSMRSUYUSRQQQQQQ`R\\VVRRRRZVTRRRORRRRRO_RR_QQQORRRVSN_RR_USRPQQOBB_`EEEEEERRRRRRORRRRRKERRRVV\\RRRKEKRRRRKEEEE`BCEIQ`AAAAAMMAAAAGEIEEEEEAEORBCEAEEEAAAAAKKAAAAAAAAOAAAAEE`EEAAMMAMMAAMMAMIQBCCEIIQCEEEEECIEEEEEIZZCEITTQY]_]YQBDHPHDBAA`OEAAAAEO`AAHBDNSSMORROEOEIA`Q]Q`CA`Q]Q`IAOR`RRIAOEEEOIAORRROIARRRROEE`OKRAGFEEE]]AAAAAAVOQ]Q]QO";
const glyphs: Record<string, string[]> = {};
export function getGlyph(char: string): string[] | undefined {
  const key = char.toUpperCase();
  if (glyphs[key]) return glyphs[key];
  const index = GLYPH_KEYS.indexOf(key);
  if (key.length !== 1 || index < 0) return undefined;
  return glyphs[key] = Array.from(GLYPH_ROWS.slice(index * GLYPH_H, (index + 1) * GLYPH_H), row => (row.charCodeAt(0) - 65).toString(2).padStart(GLYPH_W, "0").replaceAll("0", ".").replaceAll("1", "#"));
}

export function textWidth(text: string): number {
  return text.length * CHAR_W - 1;
}
