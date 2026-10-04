import { getSpriteImage } from "../engine/assets";

export const TILE = 16;

// Redesign PixelLab: i tile di TERRENO (non overlay, non animati) possono avere
// una texture PNG 16x16 in public/sprites/tiles/. Mapping char -> file. Finché il
// PNG non è caricato, il renderer attende senza ricorrere a vecchie texture.
// Fiori ed erba alta vengono disegnati come oggetti PNG trasparenti sul terreno.
// Tile-terreno PixelLab cartoon, top-down e senza prospettiva: restano 16x16
// pieni per non far sembrare i sentieri scarpate attraversabili.
const TILE_PNG: Record<string, string> = {
  ".": "tiles/grass_flat.png",
  "=": "tiles/path_flat.png",
  z: "tiles/sand.png",
  w: "tiles/water.png",
  i: "tiles/snow_floor.png",
  I: "tiles/snow_drift.png",
  p: "tiles/floor_wood.png",   // pavimento interno (case/negozi)
  A: "tiles/wall_interior.png", // muro interno in pietra
  c: "tiles/doormat.png",       // zerbino d'uscita interni (grotta: override roccia)
  "^": "tiles/cliff_sand.png",  // scogliera sabbiosa (Stretto)
  l: "tiles/stairs_sand.png",   // scala nella roccia (Stretto)
  j: "tiles/deck_asphalt.png",  // impalcato ponte (asfalto+mezzeria)
  q: "tiles/deck_wood.png",     // molo di legno (porto di Caput Mundi)
  O: "tiles/cave_mouth.png",
  R: "tiles/cave_boulder.png",
  S: "tiles/cave_stalagmite.png",
  N: "tiles/snow_pine.png"
};

export function tileImage(ch: string): HTMLImageElement | null {
  const path = TILE_PNG[ch];
  if (!path) {
    return null;
  }
  return getSpriteImage(`tile:${ch}`, path);
}

const TERRAIN_VARIANTS:Record<string,string>={'.':'grass','=':'path',z:'sand',p:'floor',w:'water'};
export function terrainVariantImage(ch:string,variant:number):HTMLImageElement|null {
  const kind=TERRAIN_VARIANTS[ch];
  return kind?getSpriteImage(`terrain:${kind}:${variant}`,`tiles/m2/${kind}-${variant}.png`):tileImage(ch);
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
  // erba alta + fiori: ciuffi/decori trasparenti SENZA base di terra, disegnati
  // sopra l'erba. Stretto: traliccio e gru come strutture overlay sull'acqua.
  "~": "tiles/obj_tallgrass.png",
  ",": "tiles/obj_flowers.png",
  J: "tiles/obj_girder.png",
  K: "tiles/obj_crane.png",
  X: "tiles/boat_moored.png", // barca ormeggiata nel porto di Caput Mundi
  g: "tiles/obj_golddoor.png", // porta dorata (varco Atto 2 palazzo->colle)
  // Arredo urbano delle piazze (esaminabili, vedi `decoratives` in maps.ts).
  W: "tiles/obj_fountain.png",
  Y: "tiles/obj_statue.png",
  U: "tiles/obj_bench.png",
  // Atto 3: anchor su un tile; il renderer usa target dedicati e ancora in basso.
  "1": "tiles/atto3_stage.png",
  "2": "tiles/atto3_gazebo.png",
  "3": "tiles/atto3_poster.png",
  "4": "tiles/atto3_voting_booth.png",
  "5": "tiles/atto3_ballot_box.png",
  "6": "tiles/atto3_social_screen.png",
  "7": "tiles/atto3_press_van.png",
  "8": "tiles/atto3_fortress.png",
};

export function objectImage(ch: string): HTMLImageElement | null {
  const path = OBJECT_PNG[ch];
  if (!path) {
    return null;
  }
  return getSpriteImage(`obj:${ch}`, path);
}

// EDIFICI PNG: asset frontali coerenti col grid. I vecchi PNG 3/4 erano stati
// scartati perche rompevano porte e sentieri; questi nuovi sono ortografici e
// agganciati alla footprint reale dell'edificio.
const BUILDING_PNG: Record<string, string> = {
  r: "tiles/build_house_front_red.png",
  H: "tiles/build_house_front_brick.png",
  v: "tiles/build_house_front_blue.png",
  o: "tiles/build_house_front_green.png",
  "!": "tiles/build_circolo_front.png",
  "?": "tiles/build_apartment_front.png",
  "@": "tiles/build_kiosk_front.png",
  u: "tiles/build_lab_front.png",
  e: "tiles/build_bar_front.png",
  Q: "tiles/build_bar_front.png",
  y: "tiles/build_gym_front.png",
  B: "tiles/build_gym_front.png",
  x: "tiles/build_gym_front.png",
  $: "tiles/build_casino_front.png",
  M: "tiles/build_palace.png", // 160x64 (10x4) — palazzo della capitale
};

const BUILDING_FOOTPRINT_PNG: Record<string, Record<string, string>> = {
  x: {
    "4x2": "tiles/build_studio_front.png"
  },
  y: {
    "4x2": "tiles/build_bistro_front.png"
  }
};

// One canonical asset table serves rendering and the existing boot inventory.
// The deck and Atto3 furniture retain their lazy/background loading policy.
export function coreTerrainEntries():Record<string,string>{
 return Object.fromEntries([
  ...["grass","path","sand","asphalt","floor","water"].flatMap(kind=>Array.from({length:4},(_,i)=>[`terrain:${kind}:${i}`,`tiles/m2/${kind}-${i}.png`])),
  ...Object.entries(TILE_PNG).filter(([ch])=>ch!=='q').map(([ch,path])=>[`tile:${ch}`,path]),
  ...Object.entries(OBJECT_PNG).filter(([ch])=>ch!=='X'&&!/^\d$/.test(ch)).map(([ch,path])=>[`obj:${ch}`,path]),
  ...Object.entries(BUILDING_PNG).flatMap(([ch,path])=>[path,...Object.values(BUILDING_FOOTPRINT_PNG[ch]??{})].map(file=>[`build:${ch}:${file}`,file]))
 ]);
}

// I PNG PixelLab hanno la porta al CENTRO della facciata: con footprint a
// larghezza PARI la porta visiva cavalca i DUE tile centrali (w/2-1 e w/2).
// Le mappe quindi mettono `d` su entrambi (es. `mddm`, `mmddmm`) con un warp
// per tile: si entra camminando dritti sulla porta, senza scarto laterale.
export function centralDoorTiles(w: number): [number, number] {
  return [w / 2 - 1, w / 2];
}

// I char che fanno parte del "tetto" (per il rilevamento del blocco).
const ROOF_CHARS = new Set(Object.keys(BUILDING_PNG));

export function isRoof(ch: string): boolean {
  return ROOF_CHARS.has(ch);
}

// Char di FACCIATA che stanno SOTTO un tetto e fanno parte dello stesso edificio
// (muro `m`, porta `d`, finestra `n`, porta-palazzo `D`/`g`). Il renderer estende
// il footprint del building-PNG verso il basso finché trova queste celle, così il
// PNG copre tetto + muro + porta in un colpo solo, scalato alla footprint reale.
// `C` (colonna) e `G` (bandiera) compaiono SOLO nel blocco del palazzo (mai
// standalone): le contiamo come facciata così il building-PNG del palazzo le
// copre invece di lasciarle come tile-pixmap esposti ai lati.
const FACADE_CHARS = new Set(["m", "d", "n", "D", "g", "C", "G"]);

export function isFacade(ch: string): boolean {
  return FACADE_CHARS.has(ch);
}

export interface BuildingFootprint {
  w: number;
  h: number;
}

export function buildingPath(ch: string, footprint?: BuildingFootprint): string | null {
  const key = footprint ? `${footprint.w}x${footprint.h}` : "";
  return BUILDING_FOOTPRINT_PNG[ch]?.[key] ?? BUILDING_PNG[ch] ?? null;
}

export function buildingImage(ch: string, footprint?: BuildingFootprint): HTMLImageElement | null {
  const path = buildingPath(ch, footprint);
  if (!path) {
    return null;
  }
  return getSpriteImage(`build:${ch}:${path}`, path);
}

// Chiave-gruppo di un edificio = il file PNG che lo rappresenta. Char di tetto
// diversi che mappano allo STESSO PNG (es. `e` ed `Q` del bar, `y`/`B`/`x` delle
// palestre) appartengono allo stesso blocco-edificio: il renderer li tratta come
// un'unica impronta invece di spezzarli in tanti micro-edifici. null se non-tetto.
export function buildingKey(ch: string): string | null {
  return BUILDING_PNG[ch] ?? null;
}


// Collision, encounter and substrate metadata only. The world renderer uses
// PNGs; historical text textures were never read and needlessly shipped.
export interface TileDef { solid: boolean; overlay?: boolean; encounter?: boolean; water?: boolean; overWater?: boolean }

export const TILES: Record<string, TileDef> = {
  "1": {
    "solid": true,
    "overlay": true
  },
  "2": {
    "solid": true,
    "overlay": true
  },
  "3": {
    "solid": true,
    "overlay": true
  },
  "4": {
    "solid": true,
    "overlay": true
  },
  "5": {
    "solid": true,
    "overlay": true
  },
  "6": {
    "solid": true,
    "overlay": true
  },
  "7": {
    "solid": true,
    "overlay": true
  },
  "8": {
    "solid": true,
    "overlay": true
  },
  ".": {
    "solid": false
  },
  ",": {
    "solid": false
  },
  "~": {
    "solid": false,
    "encounter": true
  },
  "=": {
    "solid": false
  },
  "i": {
    "solid": false
  },
  "I": {
    "solid": false,
    "encounter": true
  },
  "w": {
    "solid": true,
    "water": true
  },
  "T": {
    "solid": true,
    "overlay": true
  },
  "N": {
    "solid": true
  },
  "f": {
    "solid": true,
    "overlay": true
  },
  "s": {
    "solid": true,
    "overlay": true
  },
  "W": {
    "solid": true,
    "overlay": true
  },
  "Y": {
    "solid": true,
    "overlay": true
  },
  "U": {
    "solid": true,
    "overlay": true
  },
  "O": {
    "solid": false
  },
  "R": {
    "solid": true
  },
  "S": {
    "solid": true
  },
  "r": {
    "solid": true
  },
  "v": {
    "solid": true
  },
  "o": {
    "solid": true
  },
  "H": {
    "solid": true
  },
  "!": {
    "solid": true
  },
  "?": {
    "solid": true
  },
  "@": {
    "solid": true
  },
  "u": {
    "solid": true
  },
  "e": {
    "solid": true
  },
  "Q": {
    "solid": true
  },
  "y": {
    "solid": true
  },
  "$": {
    "solid": true
  },
  "B": {
    "solid": true
  },
  "x": {
    "solid": true
  },
  "m": {
    "solid": true
  },
  "d": {
    "solid": false
  },
  "n": {
    "solid": true
  },
  "M": {
    "solid": true
  },
  "C": {
    "solid": true
  },
  "G": {
    "solid": true
  },
  "D": {
    "solid": false
  },
  "g": {
    "solid": false
  },
  "p": {
    "solid": false
  },
  "A": {
    "solid": true
  },
  "b": {
    "solid": true
  },
  "t": {
    "solid": true
  },
  "k": {
    "solid": true
  },
  "c": {
    "solid": false
  },
  "h": {
    "solid": true,
    "overlay": true
  },
  "L": {
    "solid": true
  },
  "P": {
    "solid": true,
    "overlay": true
  },
  "z": {
    "solid": false
  },
  "^": {
    "solid": true
  },
  "l": {
    "solid": false
  },
  "j": {
    "solid": false,
    "overWater": true
  },
  "J": {
    "solid": true,
    "overlay": true,
    "overWater": true
  },
  "K": {
    "solid": true,
    "overlay": true,
    "overWater": true
  },
  "q": {
    "solid": false,
    "overWater": true
  },
  "X": {
    "solid": true,
    "overlay": true,
    "overWater": true
  }
};
