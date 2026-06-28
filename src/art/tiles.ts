import type { Pixmap } from "../engine/screen";
import { getSpriteImage } from "../engine/assets";

export const TILE = 16;

// Redesign PixelLab: i tile di TERRENO (non overlay, non animati) possono avere
// una texture PNG 16x16 in public/sprites/tiles/. Mapping char -> file. Finché il
// PNG non è caricato (o se manca) il renderer ricade sul Pixmap testuale.
// Texture terreno PNG: DISATTIVATO per ora. Il texture-swap 1-char-1-PNG senza
// autotiling Wang completo dà tile ripetuti con artefatti (bande/blob) perché i
// base-tile estratti non sono perfettamente uniformi. Il Pixmap testuale erba/
// sentiero è più pulito. L'infrastruttura (tileImage + fallback nel renderer)
// resta pronta: per riattivare basta rimettere qui le coppie char->png SEAMLESS,
// o implementare l'autotiling Wang vero (16 varianti per coppia di terreni).
// I fiori `,` erano mappati qui ma il PNG ridotto a 16px mostrava un bordo/box
// che non si fondeva con l'erba -> rimosso. I fiori restano sul Pixmap (pulito)
// finché non si rigenerano come overlay trasparente.
// Tile-terreno pieni SEAMLESS (no autotiling, rettangoli pieni): interni.
const TILE_PNG: Record<string, string> = {
  p: "tiles/floor_wood.png",   // pavimento interno (case/negozi)
  A: "tiles/wall_interior.png" // muro interno in pietra
};

export function tileImage(ch: string): HTMLImageElement | null {
  const path = TILE_PNG[ch];
  if (!path) {
    return null;
  }
  return getSpriteImage(`tile:${ch}`, path);
}

// ---- AUTOTILING WANG (corner-based) ----
// Un tileset Wang PixelLab e un foglio 4x4 (16 tile da 16px) che copre tutte le
// 16 combinazioni dei 4 ANGOLI (ogni angolo = terreno "lower" o "upper"). Per
// rendere un bordo morbido tra due terreni, per ogni cella calcoliamo quali dei
// 4 angoli appartengono al terreno "upper" guardando i tile vicini, otteniamo
// una maschera 4-bit e disegniamo il sub-tile corrispondente dal foglio.
//
// Bit della maschera: 1=TL, 2=TR, 4=BR, 8=BL (angoli). WANG_INDEX[mask] = indice
// row-major nel foglio 4x4. La convenzione del foglio PixelLab e dedotta dalla
// metadata del tileset; se l'ordine non combacia, basta correggere questa tabella
// (16 valori) senza toccare l'algoritmo.
// mask (bit 1=TL/NW, 2=TR/NE, 4=BR/SE, 8=BL/SW; upper=1) -> indice tile nel foglio
// 4x4. Calibrato dalla metadata del tileset PixelLab (corners + bounding_box).
export const WANG_INDEX: number[] = [
  6, 5, 2, 3, 7, 14, 11, 0, 10, 1, 4, 13, 9, 8, 15, 12
];

export interface WangSet {
  img: HTMLImageElement;
  // i char-tile che contano come "upper" (l'altro terreno); gli altri = "lower".
  upper: Set<string>;
}

// Foglio Wang per coppia di terreni. Registrati al caricamento (vedi assets).
const wangSets = new Map<string, WangSet>();

export function registerWangSet(key: string, img: HTMLImageElement, upperChars: string[]): void {
  wangSets.set(key, { img, upper: new Set(upperChars) });
}

export function wangSet(key: string): WangSet | undefined {
  return wangSets.get(key);
}

// Dato un foglio Wang e una maschera angoli (0..15), ritorna il rettangolo
// sorgente (sx, sy) del tile 16x16 nel foglio.
export function wangSrc(mask: number): { sx: number; sy: number } {
  const idx = WANG_INDEX[mask & 15] ?? 0;
  return { sx: (idx % 4) * 16, sy: Math.floor(idx / 4) * 16 };
}

// Coppie di terreno per l'autotiling: per ogni char-tile "lower" indica il foglio
// Wang e quali char contano come "upper" (il terreno con cui fa transizione).
// `at(x,y)` legge il char a quella cella (gestito dal renderer).
export interface TerrainWang {
  key: string;          // chiave del WangSet registrato
  isUpper: (ch: string) => boolean; // un vicino conta come "upper"?
}

// Calcola la maschera dei 4 ANGOLI per la cella (cx,cy): un angolo e "upper" se
// almeno uno dei 3 tile che lo condividono (diagonale + 2 ortogonali) e upper.
// Bit: 1=TL, 2=TR, 4=BR, 8=BL.
export function cornerMask(
  cx: number, cy: number,
  at: (x: number, y: number) => string,
  isUpper: (ch: string) => boolean
): number {
  const up = (x: number, y: number): boolean => isUpper(at(x, y));
  // un angolo e upper se il diagonale o uno dei due ortogonali adiacenti lo e
  const corner = (ox: number, oy: number): boolean =>
    up(cx + ox, cy + oy) || up(cx + ox, cy) || up(cx, cy + oy);
  let m = 0;
  if (corner(-1, -1)) m |= 1; // TL
  if (corner(1, -1)) m |= 2;  // TR
  if (corner(1, 1)) m |= 4;   // BR
  if (corner(-1, 1)) m |= 8;  // BL
  return m;
}

// Oggetti OVERLAY (alberi, segnali, recinti, fiori): PNG ~32px disegnati sopra il
// terreno e ancorati in BASSO al tile (così la chioma dell'albero sborda verso
// l'alto, stile Pokémon). Fallback al Pixmap dell'overlay finché il PNG non c'è.
const OBJECT_PNG: Record<string, string> = {
  T: "tiles/tree.png",
  s: "tiles/sign.png",
  f: "tiles/fence.png",
  // Arredi interni (overlay 32px su pavimento, ancorati in basso).
  L: "tiles/obj_bed.png",
  t: "tiles/obj_table.png",
  b: "tiles/obj_shelf.png",
  P: "tiles/obj_plant.png",
  h: "tiles/obj_counter.png",
  k: "tiles/obj_machine.png",
  // erba alta `~` NON qui: il ciuffo singolo 32px (con base di terra) ripetuto su
  // un'area densa fa pasticcio (terra ripetuta + sovrapposizioni). Resta sul
  // Pixmap pulito; servirebbe un tile seamless dedicato, non un oggetto.
};

export function objectImage(ch: string): HTMLImageElement | null {
  const path = OBJECT_PNG[ch];
  if (!path) {
    return null;
  }
  return getSpriteImage(`obj:${ch}`, path);
}

// EDIFICI come building-PNG: ogni tipo di tetto mappa a un PNG 64x48 (4x3 tile)
// che copre tetto + facciata. I char tetto coinvolti (case `r`, lab `u`, bar
// `e`/`Q`, palestre `y`/`B`/`x`). Il renderer rileva l'angolo alto-sx del blocco
// tetto e disegna il building una volta. Le celle facciata (`m`/`d`/`n`) NON si
// disegnano separatamente sotto un edificio coperto dal PNG.
// Building-PNG per char-tetto. La dimensione del PNG (64x48 = 4x3 tile, oppure
// 96x48 = 6x3) determina quanti tile copre: il renderer lo disegna a dimensione
// nativa dall'angolo alto-sx. Palestre (y/B/x) e casinò ($) sono blocchi a 6
// tile di larghezza → PNG 96px.
const BUILDING_PNG: Record<string, string> = {
  r: "tiles/build_house.png",  // 64x48 (4x3)
  u: "tiles/build_lab.png",    // 64x48
  e: "tiles/build_bar.png",    // 64x48
  Q: "tiles/build_bar.png",
  y: "tiles/build_gym.png",    // 96x48 (6x3)
  B: "tiles/build_gym.png",
  x: "tiles/build_gym.png",
  $: "tiles/build_casino.png", // 96x48 (6x3)
  M: "tiles/build_palace.png", // 160x64 (10x4) — palazzo della capitale
};

// I char che fanno parte del "tetto" (per il rilevamento del blocco).
const ROOF_CHARS = new Set(Object.keys(BUILDING_PNG));

export function isRoof(ch: string): boolean {
  return ROOF_CHARS.has(ch);
}

export function buildingImage(ch: string): HTMLImageElement | null {
  const path = BUILDING_PNG[ch];
  if (!path) {
    return null;
  }
  return getSpriteImage(`build:${ch}`, path);
}

export interface TileDef {
  pix: Pixmap;
  solid: boolean;
  // Tile disegnato sopra l'erba di base (ha trasparenze).
  overlay?: boolean;
  encounter?: boolean;
  water?: boolean;
}

function rows(...lines: string[]): string[] {
  return lines;
}

// ---- Tile generati proceduralmente (pattern deterministici) ----

function flatTile(fill: string, speckles: Array<[number, number, string]>): string[] {
  const grid: string[][] = [];
  for (let y = 0; y < TILE; y += 1) {
    grid.push(new Array(TILE).fill(fill));
  }
  for (const [x, y, ch] of speckles) {
    grid[y][x] = ch;
  }
  return grid.map((row) => row.join(""));
}

const grassArt = flatTile("g", [
  [2, 3, "G"], [3, 3, "G"], [10, 2, "G"], [11, 2, "G"], [6, 7, "G"], [7, 7, "G"],
  [13, 9, "G"], [14, 9, "G"], [3, 12, "G"], [4, 12, "G"], [9, 13, "G"], [10, 13, "G"]
]);

const pathArt = flatTile("p", [
  [4, 2, "q"], [12, 5, "q"], [7, 9, "q"], [2, 12, "q"], [13, 13, "q"], [9, 3, "q"]
]);

function waterArt(phase: number): string[] {
  const grid: string[][] = [];
  for (let y = 0; y < TILE; y += 1) {
    grid.push(new Array(TILE).fill("w"));
  }
  const waves: Array<[number, number]> = phase === 0
    ? [[2, 3], [3, 3], [4, 3], [9, 7], [10, 7], [11, 7], [4, 12], [5, 12], [12, 13], [13, 13]]
    : [[3, 4], [4, 4], [5, 4], [10, 8], [11, 8], [12, 8], [5, 11], [6, 11], [11, 12], [12, 12]];
  for (const [x, y] of waves) {
    grid[y][x] = "W";
  }
  return grid.map((row) => row.join(""));
}

// ---- Tile disegnati ----

const tallGrassArt = rows(
  "g.g..g.g..g.g..g",
  ".t..t.t..t.t..t.",
  "ttt.ttt..ttt.ttt",
  "ttttttttttttttt.",
  ".tdttdtttdttdtt.",
  "ttdttdt.tdttdttt",
  "tttttttttttttttt",
  ".tdt.tdt.tdt.td.",
  "ttdtttdtttdtttdt",
  "tttttttttttttttt",
  ".tdttdtttdttdtt.",
  "ttdttdt.tdttdttt",
  "tttttttttttttttt",
  ".td..tdt.tdt.td.",
  "ttdt.ttdtttd.tdt",
  "t..t.t..t.t..t.t"
);

const flowersArt = rows(
  "gggggggggggggggg",
  "gggGgggggggggggg",
  "gg.r.ggggggGgggg",
  "ggrrrgggggg.y.gg",
  "gg.r.ggggggyyygg",
  "ggggggggggg.y.gg",
  "gggggggggggggggg",
  "gggggggggggggggg",
  "ggGggggg.y.ggggg",
  "ggggggggyyygGggg",
  "gggggggg.y.ggggg",
  "gg.r.ggggggggggg",
  "ggrrrggggggggggg",
  "gg.r.gggggGggggg",
  "gggggggggggggggg",
  "gggggggggggggggg"
);

const treeArt = rows(
  ".....oooooo.....",
  "...ooLLLLLLoo...",
  "..oLLLLLLLLddo..",
  ".oLLLLLLLLddddo.",
  ".oLLLLLLLdddddo.",
  "oLLLLLLLdddddddo",
  "oLLLLLLddddddddo",
  "oLLLLLddddddddo.",
  ".oLLLdddddddo...",
  "..ooLdddddoo....",
  "....oottoo......",
  ".....obto.......",
  ".....obto.......",
  "....obbtto......",
  "...obbbbtto.....",
  "...oooooooo....."
);

const fenceArt = rows(
  "................",
  "................",
  "................",
  ".obo.......obo..",
  ".obbo......obbo.",
  ".obbooooooobbbo.",
  ".obbbbbbbbbbbbo.",
  ".obbooooooobbbo.",
  ".obbo......obbo.",
  ".obbooooooobbbo.",
  ".obbbbbbbbbbbbo.",
  ".obbooooooobbbo.",
  ".obbo......obbo.",
  ".oboo......oboo.",
  "..o..........o..",
  "................"
);

const signArt = rows(
  "................",
  "..oooooooooooo..",
  ".obbbbbbbbbbbbo.",
  ".obwwbwwwbwwbbo.",
  ".obbbbbbbbbbbbo.",
  ".obwwwbwwwwbbbo.",
  ".obbbbbbbbbbbbo.",
  "..oooooooooooo..",
  "......obbo......",
  "......obbo......",
  "......obbo......",
  "......obbo......",
  ".....oobboo.....",
  "................",
  "................",
  "................"
);

// Edifici: tetto, muro, porta, finestra, insegna.
const roofArt = (c: string, C: string) => rows(
  "oooooooooooooooo",
  `o${c.repeat(14)}o`,
  `o${C.repeat(14)}o`,
  `o${c.repeat(14)}o`,
  `o${c.repeat(14)}o`,
  `o${C.repeat(14)}o`,
  `o${c.repeat(14)}o`,
  `o${c.repeat(14)}o`,
  `o${C.repeat(14)}o`,
  `o${c.repeat(14)}o`,
  `o${c.repeat(14)}o`,
  `o${C.repeat(14)}o`,
  `o${c.repeat(14)}o`,
  `o${c.repeat(14)}o`,
  `o${C.repeat(14)}o`,
  "oooooooooooooooo"
);

// Tetto del BAR SPORT con INSEGNA: tetto verde + cartello chiaro appeso con una
// tazzina di caffè e una croce-cuore, così a colpo d'occhio si riconosce il
// "centro cura" dalle case normali. e/E verde tetto, m insegna, i bordo cartello,
// k icona scura, r accento rosso (la croce).
// Insegna in UN solo tile: tetto verde + cartello bianco con croce rossa
// centrata (simbolo cura, leggibile a colpo d'occhio). Si usa una sola `Q` al
// centro del tetto del bar, gli altri restano `e` (tetto verde normale).
const barRoofArt = rows(
  "oooooooooooooooo",
  "oeeeeeeeeeeeeeeo",
  "oEEEEEEEEEEEEEEo",
  "oeeiiiiiiiiiieeo",
  "oeimmmmmmmmmmieo",
  "oeimmmmrrmmmmieo",
  "oeimmmmrrmmmmieo",
  "oeimmrrrrrrmmieo",
  "oeimmrrrrrrmmieo",
  "oeimmmmrrmmmmieo",
  "oeimmmmrrmmmmieo",
  "oeimmmmmmmmmmieo",
  "oeiiiiiiiiiiiieo",
  "oeeeeeeeeeeeeeeo",
  "oEEEEEEEEEEEEEEo",
  "oooooooooooooooo"
);

// Tetto-insegna del CASINÒ: tetto bordeaux + cartello dorato con simbolo "$"
// (slot/fiche), per distinguerlo a colpo d'occhio dalle case col tetto giallo.
// c/C bordeaux tetto, m insegna oro, i bordo scuro, $ simbolo (usa 'r' come
// inchiostro del simbolo per riuso palette).
const casinoRoofArt = rows(
  "oooooooooooooooo",
  "occcccccccccccco",
  "oCCCCCCCCCCCCCCo",
  "occiiiiiiiiiicco",
  "ocimmmmmmmmmmico",
  "ocimmmrrrrmmmico",
  "ocimmrrmmmmmmico",
  "ocimmrrmmmmmmico",
  "ocimmmrrrrmmmico",
  "ocimmmmmmrrmmico",
  "ocimmmmmmrrmmico",
  "ocimmrrrrrrmmico",
  "ociiiiiiiiiiiico",
  "occcccccccccccco",
  "oCCCCCCCCCCCCCCo",
  "oooooooooooooooo"
);

const wallArt = rows(
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mLmmmLmmmLmmmLmm",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mmLmmmLmmmLmmmLm",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mLmmmLmmmLmmmLmm",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mmLmmmLmmmLmmmLm",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mLmmmLmmmLmmmLmm",
  "mmmmmmmmmmmmmmmm"
);

const doorArt = rows(
  "mmmmmmmmmmmmmmmm",
  "moooooooooooooom",
  "moddddddddddddom",
  "moddddddddddddom",
  "modDDDDDDDDDDdom",
  "modDDDDDDDDDDdom",
  "modDDDDDDDDDDdom",
  "modDDDDDDDDDDdom",
  "modDDDDDDDDDDdom",
  "modDDDDDDwDDDdom",
  "modDDDDDDwDDDdom",
  "modDDDDDDDDDDdom",
  "modDDDDDDDDDDdom",
  "modDDDDDDDDDDdom",
  "modDDDDDDDDDDdom",
  "oooooooooooooooo"
);

const windowArt = rows(
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mmoooooooooooomm",
  "mmowwwwwwwwwwomm",
  "mmowbbbbbbbbwomm",
  "mmowbbbbbbbbwomm",
  "mmowwwwwwwwwwomm",
  "mmowbbbbbbbbwomm",
  "mmowbbbbbbbbwomm",
  "mmowwwwwwwwwwomm",
  "mmoooooooooooomm",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mLmmmLmmmLmmmLmm",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm"
);

// Facciata Palazzo: marmo con colonne.
const marbleArt = rows(
  "MMMMMMMMMMMMMMMM",
  "MMMMMMMMMMMMMMMM",
  "MlMMMMlMMMMlMMMM",
  "MMMMMMMMMMMMMMMM",
  "MMMMlMMMMlMMMMlM",
  "MMMMMMMMMMMMMMMM",
  "MlMMMMlMMMMlMMMM",
  "MMMMMMMMMMMMMMMM",
  "MMMMlMMMMlMMMMlM",
  "MMMMMMMMMMMMMMMM",
  "MlMMMMlMMMMlMMMM",
  "MMMMMMMMMMMMMMMM",
  "MMMMlMMMMlMMMMlM",
  "MMMMMMMMMMMMMMMM",
  "MlMMMMlMMMMlMMMM",
  "MMMMMMMMMMMMMMMM"
);

const columnArt = rows(
  "oooooooooooooooo",
  "MMMMMMMMMMMMMMMM",
  "oooooooooooooooo",
  ".oMMlMMMMlMMMMo.",
  ".oMMlMMMMlMMMMo.",
  ".oMMlMMMMlMMMMo.",
  ".oMMlMMMMlMMMMo.",
  ".oMMlMMMMlMMMMo.",
  ".oMMlMMMMlMMMMo.",
  ".oMMlMMMMlMMMMo.",
  ".oMMlMMMMlMMMMo.",
  ".oMMlMMMMlMMMMo.",
  ".oMMlMMMMlMMMMo.",
  "oooooooooooooooo",
  "MMMMMMMMMMMMMMMM",
  "oooooooooooooooo"
);

const flagArt = rows(
  "MMMMMMMMMMMMMMMM",
  "MMoMMMMMMMMMMMMM",
  "MMoggwwwrrMMMMMM",
  "MMoggwwwrrMMMMMM",
  "MMoggwwwrrMMMMMM",
  "MMoggwwwrrMMMMMM",
  "MMoggwwwrrMMMMMM",
  "MMoMMMMMMMMMMMMM",
  "MMoMMMMMMMMMMMMM",
  "MMoMMMMMMMMMMMMM",
  "MMMMMMMMMMMMMMMM",
  "MlMMMMlMMMMlMMMM",
  "MMMMMMMMMMMMMMMM",
  "MMMMlMMMMlMMMMlM",
  "MMMMMMMMMMMMMMMM",
  "MMMMMMMMMMMMMMMM"
);

// ---- Stretto di Messina: spiaggia e cantiere eterno ----

const sandArt = flatTile("z", [
  [3, 2, "Z"], [12, 4, "Z"], [7, 6, "Z"], [2, 9, "Z"], [13, 11, "Z"],
  [5, 13, "Z"], [10, 14, "Z"], [14, 1, "Z"]
]);

// Impalcato del ponte: asfalto nuovo di zecca con striscia di mezzeria.
// (L'asfalto c'è. Il resto del ponte, meno.)
const deckArt = rows(
  "nnnnnnnyynnnnnnn",
  "nnnnnnnyynnnnnnn",
  "nnnNnnnnnnnnNnnn",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnyynnnnnnn",
  "nnnnnnnyynnnnnnn",
  "nNnnnnnnnnnnnnNn",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnyynnnnnnn",
  "nnnnnnnyynnnnnnn",
  "nnnNnnnnnnnnNnnn",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnyynnnnnnn",
  "nnnnnnnyynnnnnnn",
  "nNnnnnnnnnnnnNnn",
  "nnnnnnnnnnnnnnnn"
);

// Trave laterale del ponte: traliccio d'acciaio sull'acqua.
const girderArt = rows(
  "SSSSSSSSSSSSSSSS",
  "SwwwwwwwwwwwwwwS",
  "SSwwwwwwwwwwwwSS",
  "SwSSwwwwwwwwSSwS",
  "SwwwSSwwwwSSwwwS",
  "SwwwwwSSSSwwwwwS",
  "SwwwwwSSSSwwwwwS",
  "SwwwSSwwwwSSwwwS",
  "SSSSSSSSSSSSSSSS",
  "SwwwSSwwwwSSwwwS",
  "SwwwwwSSSSwwwwwS",
  "SwwwwwSSSSwwwwwS",
  "SwwwSSwwwwSSwwwS",
  "SSwwwwwwwwwwwwSS",
  "SwwwwwwwwwwwwwwS",
  "SSSSSSSSSSSSSSSS"
);

// Piattaforma di cantiere con gru: ferma lì dal primo appalto.
const craneArt = rows(
  "wwwwwwwwwwwwwwww",
  "wwyyyyyyyyyyyyww",
  "wwyywwwwwwwbwwww",
  "wwyywwwwwwwbwwww",
  "wwyywwwwwwwOwwww",
  "wwyywwwwwwwwwwww",
  "wwyywwwwwwwwwwww",
  "wwyywwwwwwwwwwww",
  "wyyyywwwwwwwwwww",
  "CCCCCCCCCCCCCCCC",
  "CccccccccccccccC",
  "CcrrccrrccrrcccC",
  "CccccccccccccccC",
  "CCCCCCCCCCCCCCCC",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww"
);

// ---- Interni ----

const floorArt = flatTile("f", [
  [3, 3, "F"], [11, 3, "F"], [7, 7, "F"], [3, 11, "F"], [11, 11, "F"]
]);

const innerWallArt = rows(
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "aaaaaaaaaaaaaaaa",
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "aaaaaaaaaaaaaaaa",
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAA",
  "oooooooooooooooo"
);

const shelfArt = rows(
  "oooooooooooooooo",
  "obbbbbbbbbbbbbbo",
  "obrbybgbrbbbybbo",
  "obrbybgbrbbbybbo",
  "obrbybgbrbbbybbo",
  "oooooooooooooooo",
  "obbbbbbbbbbbbbbo",
  "obgbbrbybbgbrbbo",
  "obgbbrbybbgbrbbo",
  "obgbbrbybbgbrbbo",
  "oooooooooooooooo",
  "obbbbbbbbbbbbbbo",
  "obybgbbbrbybgbbo",
  "obybgbbbrbybgbbo",
  "obybgbbbrbybgbbo",
  "oooooooooooooooo"
);

const tableArt = rows(
  "................",
  "................",
  ".oooooooooooooo.",
  "oTTTTTTTTTTTTTTo",
  "oTTTTTTTTTTTTTTo",
  "oTttttttttttttTo",
  "oTttttttttttttTo",
  "oTttttttttttttTo",
  "oTttttttttttttTo",
  "oTTTTTTTTTTTTTTo",
  ".oooooooooooooo.",
  "..obo......obo..",
  "..obo......obo..",
  "..obo......obo..",
  "................",
  "................"
);

const machineArt = rows(
  "oooooooooooooooo",
  "oAAAAAAAAAAAAAAo",
  "oAooooooooooooAo",
  "oAowwggwwggwwoAo",
  "oAowgwwggwwgwoAo",
  "oAowwggwwggwwoAo",
  "oAooooooooooooAo",
  "oAAAAAAAAAAAAAAo",
  "oAArAAgAAyAAbAAo",
  "oAAAAAAAAAAAAAAo",
  "oAAAAAAAAAAAAAAo",
  "oaaaaaaaaaaaaaao",
  "oaaaaaaaaaaaaaao",
  "oAAAAAAAAAAAAAAo",
  "oAAAAAAAAAAAAAAo",
  "oooooooooooooooo"
);

const carpetArt = rows(
  "rrrrrrrrrrrrrrrr",
  "rRRRRRRRRRRRRRRr",
  "rRrrrrrrrrrrrrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrRRRRRRRRRRrRr",
  "rRrrrrrrrrrrrrRr",
  "rRRRRRRRRRRRRRRr",
  "rrrrrrrrrrrrrrrr"
);

// Tendone bar (cura squadra).
const barArt = rows(
  "oooooooooooooooo",
  "orwrwrwrwrwrwrwo",
  "orwrwrwrwrwrwrwo",
  "oooooooooooooooo",
  "omsmmmmmmmmmmsmo",
  "omsmoooooooomsmo",
  "omsmowwwwbbomsmo",
  "omsmobwwwwwomsmo",
  "omsmoooooooomsmo",
  "omsmmmmmmmmmmsmo",
  "omsmmmmmmmmmmsmo",
  "omsmmmmmmmmmmsmo",
  "omsmmmmmmmmmmsmo",
  "oooooooooooooooo",
  "................",
  "................"
);

// Letto (arredo casa): testiera scura, coperta colorata, cuscino chiaro.
const bedArt = rows(
  "................",
  ".oooooooooooooo.",
  ".oDDDDDDDDDDDDo.",
  ".oMMMMoBBBBBBBo.",
  ".oMMMMoBBBBBBBo.",
  ".oMMMMoBBBBBBBo.",
  ".oBBBBBBBBBBBBo.",
  ".oBBBBBBBBBBBBo.",
  ".oBBBBBBBBBBBBo.",
  ".oBBBBBBBBBBBBo.",
  ".oBBBBBBBBBBBBo.",
  ".oBBBBBBBBBBBBo.",
  ".oBBBBBBBBBBBBo.",
  ".oDDDDDDDDDDDDo.",
  ".oooooooooooooo.",
  "................"
);

// Pianta in vaso (arredo casa): foglie verdi, vaso terracotta.
const plantArt = rows(
  "................",
  "......gg........",
  "....ggGggg......",
  "...gGgggGgg.....",
  "..ggGgtgGggg....",
  "..gGggtggGgg....",
  "...ggttgggg.....",
  "....ggtgg.......",
  ".....ott........",
  ".....obo........",
  ".....obo........",
  "....obbbo.......",
  "....obbbo.......",
  ".....ooo........",
  "................",
  "................"
);

// ---- Palette condivise ----

const P = {
  o: "#1c2333",
  g: "#7ec850",
  G: "#6ab33e",
  t: "#4e9a34",
  d: "#3a7d24",
  L: "#5cb846",
  p: "#e6d3a0",
  q: "#d2ba80",
  w: "#4a90d9",
  W: "#8cc4ee",
  r: "#d04848",
  R: "#a83434",
  y: "#e8c84a",
  b: "#8a5a2a",
  B: "#4868c8",
  m: "#ece4d2",
  M: "#e2dcc8",
  l: "#c6bea4",
  D: "#7a4a22",
  A: "#d8d0e8",
  a: "#b8aed0",
  f: "#d8c8a8",
  F: "#c9b78f",
  T: "#c8c2d8",
  s: "#8898a8"
};

export function pix(art: string[], extra?: Record<string, string>): Pixmap {
  return { art, pal: { ...P, ...extra } };
}

export const TILES: Record<string, TileDef> = {
  ".": { pix: pix(grassArt), solid: false },
  ",": { pix: pix(flowersArt), solid: false },
  "~": { pix: pix(tallGrassArt, { t: "#3f8a2a", d: "#2c6a1a", g: "#5aa53c" }), solid: false, encounter: true },
  "=": { pix: pix(pathArt), solid: false },
  w: { pix: pix(waterArt(0)), solid: true, water: true },
  T: { pix: pix(treeArt), solid: true, overlay: true },
  f: { pix: pix(fenceArt, { b: "#b8884a" }), solid: true, overlay: true },
  s: { pix: pix(signArt, { b: "#c8a05a", w: "#7a5a28" }), solid: true, overlay: true },
  // Edifici (tetti rossi case, blu lab, verde bar, palestre)
  r: { pix: pix(roofArt("r", "R")), solid: true },
  u: { pix: pix(roofArt("B", "v"), { v: "#3450a0" }), solid: true },
  e: { pix: pix(roofArt("e", "E"), { e: "#3f9a5c", E: "#2f7a46" }), solid: true },
  // Tetto-insegna del BAR SPORT (centro cura): verde + cartello riconoscibile.
  Q: {
    pix: pix(barRoofArt, {
      e: "#3f9a5c", E: "#2f7a46", m: "#f4f4ec", i: "#7a5a28", r: "#d83c3c"
    }),
    solid: true
  },
  y: { pix: pix(roofArt("y", "Y"), { y: "#d8a830", Y: "#b88820" }), solid: true },
  // Tetto-insegna del CASINÒ: bordeaux + cartello oro con "$". c/C bordeaux,
  // m oro cartello, i bordo scuro, r inchiostro del simbolo (oro scuro).
  $: {
    pix: pix(casinoRoofArt, {
      c: "#7a1e2a", C: "#5a141e", m: "#f0d040", i: "#3a1015", r: "#8a6810"
    }),
    solid: true
  },
  B: { pix: pix(roofArt("B", "Y"), { B: "#2e4a9a", Y: "#d8b838" }), solid: true },
  x: { pix: pix(roofArt("x", "X"), { x: "#b89048", X: "#8a6830" }), solid: true },
  m: { pix: pix(wallArt), solid: true },
  d: { pix: pix(doorArt), solid: false },
  n: { pix: pix(windowArt, { b: "#384868", w: "#a8d8f0" }), solid: true },
  // Palazzo
  M: { pix: pix(marbleArt), solid: true },
  C: { pix: pix(columnArt), solid: true },
  G: { pix: pix(flagArt, { g: "#2f9a4c" }), solid: true },
  D: { pix: pix(doorArt, { m: "#e2dcc8" }), solid: false },
  // Porta dorata: il varco verso il COLLE (Atto 2). Sempre visibile come
  // aspirazione; sbloccata dal flag boss-beaten sul warp.
  g: { pix: pix(doorArt, { D: "#d8b020", d: "#f0d040", m: "#8a6810", o: "#5a4408", w: "#fff0a0" }), solid: false },
  // Interni
  p: { pix: pix(floorArt), solid: false },
  A: { pix: pix(innerWallArt), solid: true },
  b: { pix: pix(shelfArt, { b: "#a87838", r: "#c04848", y: "#d8b848", g: "#48a058" }), solid: true },
  t: { pix: pix(tableArt), solid: true },
  k: { pix: pix(machineArt, { g: "#58c878", w: "#283848", r: "#d04848", y: "#d8b848", b: "#4868c8" }), solid: true },
  c: { pix: pix(carpetArt, { r: "#b04040", R: "#d86060" }), solid: false },
  h: { pix: pix(barArt, { s: "#b8884a", m: "#d8c8a8", w: "#f0e8d8", b: "#6a4a2a" }), solid: true, overlay: true },
  // Arredi casa
  L: { pix: pix(bedArt, { D: "#6a4a2a", M: "#f0e8d8", B: "#5878c8" }), solid: true },
  P: { pix: pix(plantArt, { g: "#4ca84c", G: "#2f8a3c", t: "#3a7a2a", b: "#b06838" }), solid: true, overlay: true },
  // Stretto di Messina
  z: { pix: pix(sandArt, { z: "#eed9a6", Z: "#d8bc7c" }), solid: false },
  j: { pix: pix(deckArt, { n: "#8a8a96", N: "#74747f" }), solid: false },
  J: { pix: pix(girderArt, { S: "#9aa4b8" }), solid: true },
  K: { pix: pix(craneArt, { C: "#8a929c", c: "#b8bec6", b: "#3a3a44", O: "#10141f" }), solid: true }
};

export const waterFrames: Pixmap[] = [pix(waterArt(0)), pix(waterArt(1))];
