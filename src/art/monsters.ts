import type { Pixmap, Screen } from "../engine/screen";
import { getSpriteImage } from "../engine/assets";

// Redesign PixelLab: se esiste un PNG per la specie in `public/sprites/monsters/<id>.png`
// lo si usa al posto della caricatura testuale. Finché il PNG non è caricato (o se
// manca) si ricade sul Pixmap. `MONSTERS_WITH_PNG` elenca le specie già migrate:
// si aggiorna mano a mano che si generano gli sprite, così non si tenta di caricare
// PNG inesistenti (niente 404 a raffica).
export const MONSTERS_WITH_PNG = new Set<string>([
  "salvinator", "giorgiagon", "ellyna", "schleinix", "renzino", "grillix",
  "renzilla", "contemorfo", "calendauro", "vannaccix", "tajanide", "berlusconix",
  "draghimon", "trumpon", "xipanda", "macronfox", "mattarellux", "putingrad",
  "ursulax", "bojoon", "zelenskir", "muskrat", "vaffenix", "capitanone", "mediocrate",
  "giorgetta", "salvinott", "movimenton", "marsrat", "pontigor", "conteblob",
  "calendrone", "generorso", "tajacolomba", "telecrate", "pontimax"
]);

export function monsterImage(speciesId: string): HTMLImageElement | null {
  if (!MONSTERS_WITH_PNG.has(speciesId)) {
    return null;
  }
  return getSpriteImage(`mon:${speciesId}`, `monsters/${speciesId}.png`);
}

// Disegna lo sprite di una specie dentro una box (x, y, boxW, boxH), ancorato in
// BASSO e centrato orizzontalmente, scalando per riempire la box mantenendo le
// proporzioni. Prova il PNG PixelLab; se manca ricade sulla pixmap testuale
// (passata dal chiamante). Usato da tutte le scene fuori battaglia (dex, party,
// box, title, evoluzione) per avere un rendering uniforme PNG-o-fallback.
export function drawMonsterSprite(
  screen: Screen,
  speciesId: string,
  pix: Pixmap | undefined,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  opts?: { flipX?: boolean }
): void {
  const png = monsterImage(speciesId);
  if (png) {
    const b = screen.imageBounds(png);
    const scale = Math.min(boxW / b.w, boxH / b.h);
    const dw = b.w * scale;
    const dh = b.h * scale;
    screen.imageSpriteCropped(png, x + (boxW - dw) / 2, y + boxH - dh, { scaleX: scale, scaleY: scale, flipX: opts?.flipX });
    return;
  }
  if (!pix) {
    return;
  }
  const scale = Math.max(1, Math.floor(Math.min(boxW / (pix.art[0]?.length ?? 24), boxH / pix.art.length)));
  const dw = (pix.art[0]?.length ?? 24) * scale;
  const dh = pix.art.length * scale;
  screen.sprite(`mongfx:${speciesId}`, pix, x + (boxW - dw) / 2, y + boxH - dh, { scale, flipX: opts?.flipX });
}

// Caricature dei politici, 24px di larghezza, bottom-aligned.
// Generatore parametrico: testa 14px (cols 5-18), busto 18px (cols 3-20).
// Char: o outline, s pelle, e occhi, h capelli, B montatura, F barba,
// m bocca, M bocca aperta, S abito, w camicia/bianco, t cravatta, P extra.

const W = 24;

function c(s: string, shift = 0): string {
  const pad = Math.max(0, Math.floor((W - s.length) / 2) + shift);
  return ".".repeat(pad) + s;
}

// Riga testa: interno di 12 char (più eventuale colonna capelli esterna).
function hd(inner: string, side = "."): string {
  return `....${side}o${inner}o${side}....`;
}

const HEAD_ARC = "......oooooooooooo......";

type HairStyle =
  | "short" | "slick" | "bald" | "tuft" | "curly" | "bob"
  | "ponytail" | "long" | "straw" | "buzz";

type SuitStyle = "suit" | "double" | "hoodie" | "mao" | "military" | "tshirt" | "vest" | "blazer";

interface PolOpts {
  skin?: string;
  hair: string;
  hairStyle: HairStyle;
  suit: string;
  suitStyle?: SuitStyle;
  shirt?: string;
  tie?: string;
  longTie?: boolean;
  glasses?: "round" | "sun";
  beard?: string;
  mustache?: boolean;
  mouth?: "smile" | "flat" | "shout" | "grin";
  brows?: boolean;
  halo?: boolean;
  ears?: "panda" | "mouse";
  pin?: string;
  pochette?: boolean;
  sash?: boolean;
  rainbow?: boolean;
  kid?: boolean;
}

function caricature(opts: PolOpts): Pixmap {
  const rows: string[] = [];
  const mouth = opts.mouth ?? "flat";

  // ---- Capelli / cima della testa ----
  if (opts.halo) {
    // Aureola sopra la testa: niente riga vuota di stacco (prima l'aureola
    // fluttuava distante dal cranio). Un anello sottile largo quanto la testa.
    rows.push(c("yyyyyyyyyyyy"));
  }
  if (opts.ears) {
    rows.push("....PPP..........PPP....", "....PPP..........PPP....");
  }
  switch (opts.hairStyle) {
    case "tuft":
      // Ciuffo (Trumpon): confinato sopra la testa (col 6..17) con leggero flop
      // a destra, niente più sbordo a sinistra fuori dal cranio.
      rows.push(c("hhhhhhhhhhhh", 1), HEAD_ARC, hd("hhhhhhhhhhhh"), hd("hhsssssssshh"));
      break;
    case "straw":
      // 12 char allineati al cranio (col 6..17): ciuffi spettinati senza sbordo.
      rows.push(c("h.hhh.hh.hhh"), HEAD_ARC, hd("hh.hhhhhh.hh"), hd("hhsssssssshh"));
      break;
    case "curly":
      rows.push(c("hh.hhh.hhh.h"), HEAD_ARC, hd("hhhhhhhhhhhh"), hd("hhsssssssshh"));
      break;
    case "bob":
    case "long":
    case "ponytail":
      rows.push(HEAD_ARC, hd("hhhhhhhhhhhh"), hd("hhhhhhhhhhhh"), hd("hssssssssssh"));
      break;
    case "slick":
      rows.push(HEAD_ARC, hd("hhhhhhhhhhhh"), hd("hsssssssssss"), hd("ssssssssssss"));
      break;
    case "bald":
      rows.push(HEAD_ARC, hd("ssssssssssss"), hd("hssssssssssh"), hd("ssssssssssss"));
      break;
    case "buzz":
      rows.push(HEAD_ARC, hd("hhhhhhhhhhhh"), hd("ssssssssssss"), hd("ssssssssssss"));
      break;
    case "short":
    default:
      rows.push(HEAD_ARC, hd("hhhhhhhhhhhh"), hd("hhhhhhhhhhhh"), hd("hssssssssssh"));
      break;
  }

  // ---- Occhi / occhiali ----
  if (opts.glasses === "round") {
    rows.push(hd("sBBBssssBBBs"), hd("sBeBssssBeBs"), hd("sBBBssssBBBs"));
  } else if (opts.glasses === "sun") {
    rows.push(hd("sBBBBssBBBBs"), hd("sBBBBssBBBBs"), hd("ssssssssssss"));
  } else {
    rows.push(hd(opts.brows ? "sshhsssshhss" : "ssssssssssss"), hd("sssessssesss"), hd("ssssssssssss"));
  }

  // ---- Naso, bocca, mento ----
  const sideHair = opts.hairStyle === "bob" || opts.hairStyle === "long" ? "h" : ".";
  const F = opts.beard ? "F" : "s";
  rows.push(hd(`${F}ssssNNssss${F}`, sideHair));
  if (opts.mustache) {
    rows.push(hd(`${F}ssFFFFFFss${F}`, sideHair));
    rows.push(hd(`${F}sssmmmmsss${F}`, sideHair));
  } else {
    const mouthRow =
      mouth === "smile" ? `${F}ssmmmmmmss${F}`
      : mouth === "grin" ? `${F}smwwwwwwms${F}`
      : mouth === "shout" ? `${F}ssMMMMMMss${F}`
      : `${F}sssmmmmsss${F}`;
    rows.push(hd(mouthRow, sideHair));
    rows.push(hd(mouth === "shout" ? `${F}sssMMMMsss${F}` : `${F}ssssssssss${F}`, sideHair));
  }
  rows.push(opts.beard ? hd("FFFFFFFFFFFF", sideHair) : hd("ssssssssssss", sideHair));
  rows.push("......oooooooooooo......");

  // ---- Collo ----
  rows.push(c("osssso"));

  // ---- Busto (interno 16 char) ----
  const tieRows = opts.tie ? (opts.longTie ? 5 : 3) : 0;
  const bodyRows = opts.kid ? 4 : 6;
  const shoulders =
    opts.suitStyle === "hoodie" ? "SSSSSSwsswSSSSSS"
    : opts.suitStyle === "mao" ? "SSSSSSSooSSSSSSS"
    : opts.suitStyle === "tshirt" ? "SSSSSssssssSSSSS"
    : opts.suitStyle === "vest" ? "wwwSSSSwwSSSSwww"
    : opts.shirt ? "SSSSSwwwwwwSSSSS"
    : "SSSSSSSSSSSSSSSS";
  rows.push(`...o${shoulders}o...`);
  for (let i = 0; i < bodyRows; i += 1) {
    let inner: string;
    if (opts.suitStyle === "vest") {
      inner = "wwSSSSSwwSSSSSww";
    } else if (opts.suitStyle === "hoodie") {
      inner = i < 2 ? "SSSSSSwzzwSSSSSS" : "SSSSSSSzzSSSSSSS";
    } else if (opts.suitStyle === "mao") {
      inner = "SSSSSSSwwSSSSSSS";
    } else if (opts.suitStyle === "military") {
      inner = i === 2 ? "SSooSSSSSSSSooSS" : "SSSSSSSSSSSSSSSS";
    } else if (opts.suitStyle === "double") {
      inner = i < 3 && opts.tie ? "SSSSwSwttwSwSSSS" : "SSSSwSSwwSSwSSSS";
    } else if (i < tieRows && opts.tie) {
      inner = "SSSSSSwttwSSSSSS";
    } else if (opts.tie) {
      inner = "SSSSSSSttSSSSSSS";
    } else if (i === 0 && opts.shirt) {
      inner = "SSSSSSwwwwSSSSSS";
    } else {
      inner = "SSSSSSSSSSSSSSSS";
    }
    rows.push(`...o${inner}o...`);
  }
  rows.push(c("oooooooooooooooooo"));

  // ---- Patch su griglia ----
  const grid = rows.map((r) => [...r.padEnd(W, ".")]);
  const bodyStart = rows.length - 1 - bodyRows;
  if (opts.pin) {
    grid[bodyStart + 1][15] = "y";
  }
  if (opts.pochette) {
    grid[bodyStart + 1][15] = "w";
    grid[bodyStart + 1][16] = "w";
  }
  if (opts.sash) {
    for (let i = 0; i < bodyRows; i += 1) {
      grid[bodyStart + i][7] = "g";
      grid[bodyStart + i][8] = "w";
      grid[bodyStart + i][9] = "r";
    }
  }
  if (opts.rainbow) {
    const colors = ["r", "y", "g", "b", "P"];
    for (let i = 0; i < bodyRows; i += 1) {
      grid[bodyStart + i][5] = colors[i % colors.length];
      grid[bodyStart + i][18] = colors[(i + 2) % colors.length];
    }
  }
  if (opts.hairStyle === "ponytail") {
    const top = opts.halo ? 2 : 0;
    for (let i = 1; i <= 4; i += 1) {
      if (grid[top + i]) {
        grid[top + i][3] = "h";
        grid[top + i][4] = "h";
      }
    }
  }
  if (opts.longTie && opts.tie) {
    // La cravatta lunga di Trumpon scende oltre la giacca.
    grid[bodyStart + 5][11] = "t";
    grid[bodyStart + 5][12] = "t";
  }

  const art = grid.map((r) => r.join(""));

  const pal: Record<string, string> = {
    o: "#1c2333",
    s: opts.skin ?? "#f0c8a0",
    N: "#d8a87c",
    e: "#1c2333",
    h: opts.hair,
    B: "#2a2a3a",
    F: opts.beard ?? "#5a4632",
    m: "#b06850",
    M: "#7a2e2e",
    w: "#f8f8f0",
    S: opts.suit,
    t: opts.tie ?? "#888888",
    z: "#c8c8d0",
    y: "#e8c030",
    g: "#2f9a4c",
    r: "#d23c3c",
    b: "#3868c8",
    P: opts.ears ? (opts.ears === "panda" ? "#22222e" : "#9aa0ae") : "#9858b8"
  };
  return { art, pal };
}

export const MONSTER_ART: Record<string, Pixmap> = {
  // ---- Italiani ----
  giorgetta: caricature({
    hair: "#e8c84a", hairStyle: "ponytail", suit: "#e8e4da", suitStyle: "tshirt",
    mouth: "smile", kid: true, pin: "#d23c3c"
  }),
  giorgiagon: caricature({
    hair: "#e8c84a", hairStyle: "long", suit: "#2e3e5e", shirt: "#f8f8f0",
    suitStyle: "blazer", mouth: "shout", brows: true, pin: "#d23c3c"
  }),
  ellyna: caricature({
    hair: "#6a4a30", hairStyle: "curly", suit: "#c84848", suitStyle: "tshirt",
    glasses: "round", mouth: "smile", kid: true
  }),
  schleinix: caricature({
    hair: "#6a4a30", hairStyle: "curly", suit: "#4a4458", suitStyle: "blazer",
    glasses: "round", mouth: "smile", rainbow: true
  }),
  renzino: caricature({
    hair: "#5a4632", hairStyle: "short", suit: "#f8f8f0", suitStyle: "tshirt",
    mouth: "grin", kid: true
  }),
  renzilla: caricature({
    hair: "#5a4632", hairStyle: "short", suit: "#3868c8", suitStyle: "vest",
    mouth: "grin", pin: "#f8f8f0"
  }),
  salvinott: caricature({
    hair: "#6a5238", hairStyle: "short", suit: "#2e4470", suitStyle: "hoodie",
    mouth: "smile", kid: true
  }),
  salvinator: caricature({
    hair: "#6a5238", hairStyle: "short", suit: "#2e4470", suitStyle: "hoodie",
    glasses: "sun", beard: "#7a6044", mouth: "shout", pin: "#7ad858"
  }),
  grillix: caricature({
    hair: "#c8c8c8", hairStyle: "curly", suit: "#3a3a46", suitStyle: "tshirt",
    beard: "#b8b8b8", mouth: "shout", brows: true
  }),
  contemorfo: caricature({
    hair: "#8a8a96", hairStyle: "slick", suit: "#2e3650", shirt: "#f8f8f0",
    tie: "#3a4a6a", mouth: "smile", pochette: true
  }),
  calendauro: caricature({
    hair: "#5a4632", hairStyle: "bald", suit: "#3a4258", shirt: "#f8f8f0",
    tie: "#6a3a3a", glasses: "round", beard: "#4a3a2a", mouth: "flat"
  }),
  vannaccix: caricature({
    hair: "#3a3228", hairStyle: "buzz", suit: "#4a6838", suitStyle: "military",
    mustache: true, brows: true
  }),
  tajanide: caricature({
    hair: "#b8b8c0", hairStyle: "short", suit: "#3a4258", shirt: "#f8f8f0",
    tie: "#3868c8", glasses: "round", mouth: "smile", pin: "#e8c030"
  }),
  berlusconix: caricature({
    skin: "#f0bc90", hair: "#2a2226", hairStyle: "slick", suit: "#2e3650",
    suitStyle: "double", tie: "#5a6a8a", mouth: "grin"
  }),
  draghimon: caricature({
    hair: "#c8c8cc", hairStyle: "short", suit: "#5a5e6e", shirt: "#f8f8f0",
    tie: "#2e4470", brows: true, mouth: "flat"
  }),
  mattarellux: caricature({
    hair: "#e8e8ea", hairStyle: "short", suit: "#2e3240", shirt: "#f8f8f0",
    tie: "#4a4a5a", glasses: "round", mouth: "smile", halo: true, sash: true
  }),
  // ---- Mondiali ----
  trumpon: caricature({
    skin: "#f0a060", hair: "#f0d050", hairStyle: "tuft", suit: "#2e3e5e",
    shirt: "#f8f8f0", tie: "#d23c3c", longTie: true, brows: true, mouth: "shout"
  }),
  putingrad: caricature({
    skin: "#f4d8c0", hair: "#c8bca8", hairStyle: "bald", suit: "#26262e",
    shirt: "#f8f8f0", tie: "#3a3a46", brows: true, mouth: "flat"
  }),
  xipanda: caricature({
    hair: "#22222e", hairStyle: "short", suit: "#4a4e58", suitStyle: "mao",
    mouth: "smile", ears: "panda", pin: "#d23c3c"
  }),
  macronfox: caricature({
    hair: "#7a5a3a", hairStyle: "slick", suit: "#2e4a8a", shirt: "#f8f8f0",
    tie: "#22305a", mouth: "smile"
  }),
  ursulax: caricature({
    hair: "#ecd890", hairStyle: "bob", suit: "#4a78b8", suitStyle: "blazer",
    shirt: "#f8f8f0", mouth: "flat", pin: "#e8c030"
  }),
  bojoon: caricature({
    hair: "#f0e0a0", hairStyle: "straw", suit: "#3a3e4e", shirt: "#f8f8f0",
    tie: "#7a3a4a", mouth: "smile"
  }),
  zelenskir: caricature({
    hair: "#4a3a2c", hairStyle: "buzz", suit: "#4e5a3c", suitStyle: "military",
    beard: "#4a3a2c", mouth: "flat", brows: true
  }),
  muskrat: caricature({
    hair: "#5a4632", hairStyle: "short", suit: "#26262e", suitStyle: "tshirt",
    mouth: "smile", ears: "mouse", pin: "#f8f8f0"
  }),
  // ---- Evoluzioni avanzate ----
  vaffenix: caricature({
    hair: "#d8d8d8", hairStyle: "curly", suit: "#7a2828", suitStyle: "tshirt",
    beard: "#c8c8c8", mouth: "shout", brows: true
  }),
  movimenton: caricature({
    hair: "#b8b8c0", hairStyle: "slick", suit: "#2e3650", shirt: "#f8f8f0",
    tie: "#e8c030", mouth: "smile", pin: "#e8c030"
  }),
  capitanone: caricature({
    hair: "#6a5238", hairStyle: "short", suit: "#26324e", suitStyle: "military",
    glasses: "sun", beard: "#7a6044", mouth: "shout", sash: true
  }),
  marsrat: caricature({
    hair: "#5a4632", hairStyle: "buzz", suit: "#4a4e58", suitStyle: "mao",
    glasses: "sun", mouth: "grin", ears: "mouse", pin: "#d23c3c"
  }),
  // MEDIOCRATE: mezzobusto da TV — capelli impomatati, completo, occhiali tondi.
  mediocrate: caricature({
    hair: "#3a3630", hairStyle: "slick", suit: "#2a3344", shirt: "#f8f8f0",
    tie: "#b83030", glasses: "round", mouth: "grin", pin: "#e8c030"
  }),
  // PONTIGÒR: kaiju da cantiere — casco/giacca hi-vis, occhiali da sole, barba.
  pontigor: caricature({
    hair: "#caa030", hairStyle: "buzz", suit: "#c87a1a", suitStyle: "military",
    glasses: "sun", beard: "#6a5a3a", mouth: "shout", brows: true, pin: "#e8c84a"
  }),
  conteblob: caricature({
    hair: "#8a8a96", hairStyle: "slick", suit: "#24385f", shirt: "#f8f8f0",
    tie: "#3a4a8a", mouth: "smile", pochette: true
  }),
  calendrone: caricature({
    hair: "#5a4632", hairStyle: "bald", suit: "#3a4258", shirt: "#f8f8f0",
    tie: "#6a3a3a", glasses: "round", beard: "#4a3a2a", mouth: "shout", brows: true
  }),
  generorso: caricature({
    hair: "#2e2a24", hairStyle: "buzz", suit: "#3f5f34", suitStyle: "military",
    mustache: true, brows: true, mouth: "shout", pin: "#e8c030"
  }),
  tajacolomba: caricature({
    hair: "#c8c8c8", hairStyle: "short", suit: "#3e5a78", shirt: "#f8f8f0",
    tie: "#345ca8", glasses: "round", mouth: "smile", pin: "#e8c030"
  }),
  telecrate: caricature({
    hair: "#2a2630", hairStyle: "slick", suit: "#22385e", shirt: "#f8f8f0",
    tie: "#a8323a", glasses: "round", mouth: "grin", brows: true
  }),
  pontimax: caricature({
    hair: "#d8a830", hairStyle: "short", suit: "#d87820", suitStyle: "vest",
    beard: "#5a3a28", glasses: "sun", mouth: "shout", pin: "#9aa4b8"
  })
};

// Frame d'azione (bocca urlante) per i mostri "chiave": starter, loro evoluzioni
// e leggendari. Alternati col frame base nell'idle e mostrati durante l'attacco
// per dare espressività extra. Le altre specie usano solo l'animazione
// procedurale (squash/stretch) sullo stesso sprite.
// Stessi parametri dello sprite base, ma con la bocca urlante (`shout`): così
// l'alternanza idle/azione non "scatta" su tratti diversi, cambia solo la bocca.
export const MONSTER_ACTION_ART: Record<string, Pixmap> = {
  giorgetta: caricature({
    hair: "#e8c84a", hairStyle: "ponytail", suit: "#e8e4da", suitStyle: "tshirt",
    mouth: "shout", kid: true, pin: "#d23c3c"
  }),
  giorgiagon: caricature({
    hair: "#e8c84a", hairStyle: "long", suit: "#2e3e5e", shirt: "#f8f8f0",
    suitStyle: "blazer", mouth: "shout", brows: true, pin: "#d23c3c"
  }),
  ellyna: caricature({
    hair: "#6a4a30", hairStyle: "curly", suit: "#c84848", suitStyle: "tshirt",
    glasses: "round", mouth: "shout", kid: true
  }),
  schleinix: caricature({
    hair: "#6a4a30", hairStyle: "curly", suit: "#4a4458", suitStyle: "blazer",
    glasses: "round", mouth: "shout", rainbow: true
  }),
  renzino: caricature({
    hair: "#5a4632", hairStyle: "short", suit: "#f8f8f0", suitStyle: "tshirt",
    mouth: "shout", kid: true
  }),
  renzilla: caricature({
    hair: "#5a4632", hairStyle: "short", suit: "#3868c8", suitStyle: "vest",
    mouth: "shout", pin: "#f8f8f0"
  }),
  berlusconix: caricature({
    skin: "#f0bc90", hair: "#2a2226", hairStyle: "slick", suit: "#2e3650",
    suitStyle: "double", tie: "#5a6a8a", mouth: "shout"
  }),
  draghimon: caricature({
    hair: "#c8c8cc", hairStyle: "short", suit: "#5a5e6e", shirt: "#f8f8f0",
    tie: "#2e4470", brows: true, mouth: "shout"
  })
};

// Scheda Elettorale: la "ball" del gioco (10x10).
export const BALLOT_ART: Pixmap = {
  art: [
    "..oooooo..",
    ".owwwwwwo.",
    "owwrwwrwwo",
    "owwwrrwwwo",
    "owwwrrwwwo",
    "owwrwwrwwo",
    "owwwwwwwwo",
    "owbbbbbbwo",
    ".owwwwwwo.",
    "..oooooo.."
  ],
  pal: { o: "#1c2333", w: "#f4f0e0", r: "#c84040", b: "#9098b0" }
};

// Medaglia (12x12) per la tessera del candidato.
export const BADGE_ART: Pixmap = {
  art: [
    "...oooooo...",
    "..oyyyyyyo..",
    ".oyyYYYYyyo.",
    "oyyYYyyYYyyo",
    "oyYYyyyyYYyo",
    "oyYYyyyyYYyo",
    "oyyYYyyYYyyo",
    ".oyyYYYYyyo.",
    "..oyyyyyyo..",
    "...oooooo...",
    "....obbo....",
    "....obbo...."
  ],
  pal: { o: "#1c2333", y: "#e8c030", Y: "#f8e8a0", b: "#b04848" }
};
