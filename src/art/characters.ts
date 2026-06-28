import type { Pixmap } from "../engine/screen";
import { getSpriteImage } from "../engine/assets";

// Redesign PixelLab: il PLAYER (e in futuro gli NPC) usa sprite PNG a 4 direzioni
// in public/sprites/chars/. Il PNG ha la direzione "west" nativa, quindi NIENTE
// flip (a differenza del pixmap che specchia "right"). Fallback al pixmap finché
// il PNG non è pronto/presente.
const FACING_FILE: Record<string, string> = {
  down: "south", up: "north", left: "west", right: "east"
};

export function playerImage(facing: Facing): HTMLImageElement | null {
  const dir = FACING_FILE[facing] ?? "south";
  return getSpriteImage(`player:${dir}`, `chars/player_${dir}.png`);
}

// Sprite personaggi 16x16, stile GBC: testa grande, corpo piccolo.
// Palette parametrica: o outline, h cappello/capelli, s pelle, e occhi,
// c maglia, p pantaloni, x scarpe/accento.

export type Facing = "down" | "up" | "left" | "right";

const DOWN_0 = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhhhhhhhhho..",
  "..ohssssssssho..",
  "...osesssseso...",
  "...osssssssso...",
  "....ossmmsso....",
  "....occcccco....",
  "...occcccccco...",
  "...osccccccso...",
  "....oppppppo....",
  "....opp..ppo....",
  "....oxx..xxo....",
  "................"
];

const DOWN_1 = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhhhhhhhhho..",
  "..ohssssssssho..",
  "...osesssseso...",
  "...osssssssso...",
  "....ossmmsso....",
  "....occcccco....",
  "...occcccccco...",
  "...osccccccso...",
  "....oppppppo....",
  "....opp.oppo....",
  "....oxx..oo.....",
  "................"
];

const SIDE_0 = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhhhhhhhhho..",
  "..ohhssssssoho..",
  "...ohsssseso....",
  "...ossssssso....",
  "....osssmso.....",
  "....occccco.....",
  "....occcccso....",
  "....occccco.....",
  "....opppppo.....",
  "....opp.ppo.....",
  "....oxx.xxo.....",
  "................"
];

const SIDE_1 = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhhhhhhhhho..",
  "..ohhssssssoho..",
  "...ohsssseso....",
  "...ossssssso....",
  "....osssmso.....",
  "....occccco.....",
  "...osccccco.....",
  "....occccco.....",
  "....opppppo.....",
  "...opp..ppo.....",
  "...oxx..xxo.....",
  "................"
];

const UP_0 = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhhhhhhhhho..",
  "..ohhhhhhhhhho..",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "....ossssso.....",
  "....occcccco....",
  "...occxxxxcco...",
  "...occxxxxcco...",
  "....oppppppo....",
  "....opp..ppo....",
  "....oxx..xxo....",
  "................"
];

const UP_1 = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhhhhhhhhho..",
  "..ohhhhhhhhhho..",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "....ossssso.....",
  "....occcccco....",
  "...occxxxxcco...",
  "...occxxxxcco...",
  "....oppppppo....",
  "....opp.oppo....",
  "....oxx..oo.....",
  "................"
];

// ---- Veicoli: si disegnano SOTTO il personaggio, per direzione. ----
// Palette: o outline, k carrozzeria, w ruota/cingolo, g vetro/accento,
// y giallo cantiere (ruspa). Solo la metà bassa è dipinta: la testa/busto del
// personaggio resta sopra, così "si vede" che è in sella.

const MONOPATTINO_SIDE = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".........ooo....",
  ".........ogo....",
  "..o......ooo....",
  "..oooooooooo....",
  ".owo......owo...",
  ".owo......owo...",
  "..o........o...."
];

const MONOPATTINO_FRONT = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......ooo......",
  ".......ogo......",
  ".......ooo......",
  ".....oooooo.....",
  "....owo..owo....",
  "....owo..owo....",
  ".....o....o....."
];

const RUSPA_SIDE = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "...........oooo.",
  "..........oyyyo.",
  ".oo......oyyyyo.",
  "oyyooooooyyyyy..",
  "oyyyyyyyyyyyyo..",
  "oyyyyyyyyyyyyo..",
  ".owwwwwwwwwwo...",
  ".owkwkwkwkwko...",
  ".owwwwwwwwwwo...",
  "..oooooooooo....",
  "................"
];

const RUSPA_FRONT = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....oooooooo....",
  "...oyyyyyyyyo...",
  "...oyyyyyyyyo...",
  "...oyyyyyyyyo...",
  "..owwwwwwwwwwo..",
  "..owkwkwkwkwko..",
  "..owwwwwwwwwwo..",
  "..owwwwwwwwwwo..",
  "...oooooooooo...",
  "................"
];

// AUTO BLU elettorale: berlina tozza e ben visibile. Vista laterale (muso a
// destra), frontale (paraurti + fari) e posteriore (luci rosse). Carrozzeria
// blu `b`, vetri `g`, fari `f`, stop `s`, ruote `w`.
const AUTO_SIDE = [
  "................",
  "................",
  "................",
  "................",
  "................",
  ".....ooooo......",
  "....obgggboo....",
  "...obbbbbbbbo...",
  "..obbbbbbbbbfo..",
  "..obbbbbbbbbbo..",
  "..obbbbbbbbbbo..",
  "..oowwoooowwoo..",
  "...owwo..owwo...",
  "....oo....oo....",
  "................",
  "................"
];

const AUTO_FRONT = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "...oooooooo.....",
  "..obggggggbo....",
  "..obgggggggo....",
  ".obbbbbbbbbbo...",
  ".ofbbbbbbbbfo...",
  ".obbbbbbbbbbo...",
  ".oowwoooowwoo...",
  "..owwo..owwo....",
  "...oo....oo.....",
  "................",
  "................"
];

const AUTO_BACK = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "...oooooooo.....",
  "..obggggggbo....",
  "..obgggggggo....",
  ".obbbbbbbbbbo...",
  ".osbbbbbbbbso...",
  ".obbbbbbbbbbo...",
  ".oowwoooowwoo...",
  "..owwo..owwo....",
  "...oo....oo.....",
  "................",
  "................"
];

const VEHICLE_PAL: Record<string, string> = {
  o: "#1c2333",
  k: "#2a3142",
  w: "#3a4150",
  g: "#9fd0e8",
  y: "#e8b020",
  b: "#2e5aa8", // carrozzeria auto blu
  f: "#ffe98a", // fari
  s: "#d04848" // stop posteriori
};

export interface VehicleSprite {
  pix: Pixmap;
  flip: boolean;
  key: string;
}

const vehicleCache = new Map<string, Pixmap>();

// Sprite del veicolo per (id, direzione). down/up usano la vista frontale,
// left/right la vista laterale (right specchiata).
export function vehicleSprite(vehicleId: string, facing: Facing): VehicleSprite {
  const side = facing === "left" || facing === "right";
  // L'AUTO ha tre viste (front/back/side); monopattino e ruspa solo front/side.
  let art: string[];
  let viewKey: string;
  if (vehicleId === "auto") {
    if (side) {
      art = AUTO_SIDE;
      viewKey = "side";
    } else if (facing === "up") {
      art = AUTO_BACK;
      viewKey = "back";
    } else {
      art = AUTO_FRONT;
      viewKey = "front";
    }
  } else if (vehicleId === "ruspa") {
    art = side ? RUSPA_SIDE : RUSPA_FRONT;
    viewKey = side ? "side" : "front";
  } else {
    art = side ? MONOPATTINO_SIDE : MONOPATTINO_FRONT;
    viewKey = side ? "side" : "front";
  }
  const cacheKey = `${vehicleId}:${viewKey}`;
  let pix = vehicleCache.get(cacheKey);
  if (!pix) {
    pix = { art, pal: VEHICLE_PAL };
    vehicleCache.set(cacheKey, pix);
  }
  return { pix, flip: facing === "right", key: `veh:${cacheKey}` };
}

export interface CharPalette {
  h: string;
  c: string;
  p: string;
  x: string;
  s?: string;
}

export const CHAR_PALETTES: Record<string, CharPalette> = {
  player: { h: "#d23c3c", c: "#3868c8", p: "#2e3e52", x: "#8a5a2a" },
  rival: { h: "#7848b8", c: "#48a058", p: "#384858", x: "#583828" },
  professor: { h: "#b8b8c4", c: "#f0eee8", p: "#5a5a6a", x: "#3a3a48" },
  aide: { h: "#584838", c: "#76828e", p: "#3a4250", x: "#28303c" },
  journalist: { h: "#c89838", c: "#e0d8c0", p: "#6a5a48", x: "#4a3828" },
  barista: { h: "#383840", c: "#3f9a5c", p: "#4a3a2e", x: "#2e2424" },
  granny: { h: "#dcdce4", c: "#b868a8", p: "#705a70", x: "#4a3a48" },
  guard: { h: "#283c60", c: "#3850a0", p: "#222e48", x: "#161e30" },
  boss: { h: "#26262e", c: "#3a3a46", p: "#26262e", x: "#16161e" },
  influencer: { h: "#d8b8d8", c: "#d84878", p: "#383848", x: "#e8e8e8" },
  kid: { h: "#6a4a2a", c: "#e8b838", p: "#4868c8", x: "#383838" }
};

const BASE_PAL = {
  o: "#1c2333",
  s: "#f0c8a0",
  e: "#202030",
  m: "#c87858"
};


function frames(palId: string): Record<Facing, Pixmap[]> {
  const cp = CHAR_PALETTES[palId] ?? CHAR_PALETTES.player;
  const pal = { ...BASE_PAL, ...cp, s: cp.s ?? BASE_PAL.s };
  const make = (art: string[]): Pixmap => ({ art, pal });
  return {
    down: [make(DOWN_0), make(DOWN_1)],
    up: [make(UP_0), make(UP_1)],
    left: [make(SIDE_0), make(SIDE_1)],
    right: [make(SIDE_0), make(SIDE_1)]
  };
}

const cache = new Map<string, Record<Facing, Pixmap[]>>();

// Tavolozza di tinte per gli avatar dei giocatori remoti: ognuno riceve un
// colore di maglia/capelli stabile derivato dal proprio id, così si distinguono.
const REMOTE_TINTS: Array<{ h: string; c: string }> = [
  { h: "#d23c3c", c: "#3868c8" }, { h: "#2f9a4c", c: "#d8a838" },
  { h: "#9858b8", c: "#48a0a0" }, { h: "#d8783c", c: "#384878" },
  { h: "#3a8ad8", c: "#c84878" }, { h: "#c8b838", c: "#5a4632" },
  { h: "#48a058", c: "#b04848" }, { h: "#b868a8", c: "#384858" }
];

// Registra (una volta) una palette per un giocatore remoto e ne restituisce l'id.
export function remotePalId(playerId: string): string {
  const id = `remote:${playerId}`;
  if (!CHAR_PALETTES[id]) {
    let hash = 0;
    for (let i = 0; i < playerId.length; i += 1) {
      hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0;
    }
    const tint = REMOTE_TINTS[hash % REMOTE_TINTS.length];
    CHAR_PALETTES[id] = { h: tint.h, c: tint.c, p: "#2e3140", x: "#3a3030" };
    cache.delete(id); // forza rigenerazione con la nuova palette
  }
  return id;
}

// Restituisce pixmap e flag flip per (personaggio, direzione, frame).
export function charSprite(palId: string, facing: Facing, frame: number): { pix: Pixmap; flip: boolean; key: string } {
  let set = cache.get(palId);
  if (!set) {
    set = frames(palId);
    cache.set(palId, set);
  }
  const list = set[facing];
  const idx = frame % list.length;
  // SIDE è disegnato rivolto a sinistra: per "right" lo specchiamo.
  const flip = facing === "right";
  return { pix: list[idx], flip, key: `char:${palId}:${facing}:${idx}` };
}
