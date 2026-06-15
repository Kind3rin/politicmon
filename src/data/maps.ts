import type { Facing } from "../art/characters";

export interface NpcDef {
  id: string;
  pal: string;
  x: number;
  y: number;
  facing: Facing;
  lines?: string[];
  trainerId?: string;
  sightRange?: number;
  healer?: boolean;
  shop?: boolean;
  casino?: boolean;
  transport?: boolean;
  gift?: { itemId: string; qty: number; flag: string; lines: string[] };
  vehicleGift?: { vehicle: "monopattino" | "ruspa"; flag: string; lines: string[] };
  legendary?: {
    speciesId: string;
    level: number;
    flag: string;
    lines: string[];
    afterRunLines?: string[];
    afterGoneLines?: string[];
  };
  showIfFlag?: string;
  hideIfFlag?: string;
  setFlag?: string; // flag impostato quando ci parli (per le quest "hai parlato con...")
}

export interface WarpDef {
  x: number;
  y: number;
  toMap: string;
  toX: number;
  toY: number;
  facing: Facing;
  requiresBadges?: number;
  requiresFlag?: string;
  lockedLines?: string[];
}

export interface SignDef {
  x: number;
  y: number;
  lines: string[];
}

export interface PickupDef {
  id: string;
  x: number;
  y: number;
  itemId: string;
  qty: number;
  hidden?: boolean; // tesoro segreto: non disegnato, si trova esaminando il tile
}

export interface EncounterEntry {
  speciesId: string;
  weight: number;
  minLv: number;
  maxLv: number;
}

export interface EdgeDef {
  toMap: string;
  offsetX: number;
}

export interface MapDef {
  id: string;
  name: string;
  tiles: string[];
  outdoor: boolean;
  warps: WarpDef[];
  npcs: NpcDef[];
  signs: SignDef[];
  pickups: PickupDef[];
  edges?: { north?: EdgeDef; south?: EdgeDef };
  encounters?: EncounterEntry[];
  encounterRate?: number;
  music?: string; // traccia di audio.playMusic (default "borgo")
}

// ---------------------------------------------------------------- BORGO URNE

const BORGO_TILES = [
  "TTTTTTTTTTTTT====TTTTTTTTTTTT",
  "TT...........====...........TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~.f..====..f.~~~~~..TT",
  "TT..~~~~~.f..====..f.~~~~~..TT",
  "TT........f..====..f........TT",
  "TT...........====...........TT",
  "TT.....s.....====...........TT",
  "TT...........====...........TT",
  "TT...uuuu....====....rrrr...TT",
  "TT...uuuu....====....rrrr...TT",
  "TT...mdnm....====....mndm...TT",
  "TT....=......====......=....TT",
  "TT....=......====......=....TT",
  "TT....==================....TT",
  "TT.s.........====...hh......TT",
  "TT..eeee.....====......,,...TT",
  "TT..mdnm.....====......,,...TT",
  "TT...........====...........TT",
  "TT..wwww.....====.....wwww..TT",
  "TT..wwww.....====.....wwww..TT",
  "TT...........====...........TT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
];

// ---------------------------------------------------------------- MEDIOPOLI

const MEDIOPOLI_TILES = [
  "TTTTTTTTTTTTT====TTTTTTTTTTTT",
  "TT...........====...........TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~..f.====.f..~~~~~..TT",
  "TT.........f.====.f.........TT",
  "TT....s......====...........TT",
  "TT...........====...........TT",
  "TT..yyyyyy...====...rrrr....TT",
  "TT..yyyyyy...====...rrrr....TT",
  "TT..mmdnmm...====...mdnm....TT",
  "TT....=......====.....=.....TT",
  "TT....=......====.....=.....TT",
  "TT....=================.....TT",
  "TT...........====....rrrr...TT",
  "TT...hh......====....rrrr...TT",
  "TT...........====....mdnm...TT",
  "TT..eeee.....====......=....TT",
  "TT..mdnm.....====.......s...TT",
  "TT...........====...........TT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTT"
];

// ---------------------------------------------------------------- EUROTOWN

const EUROTOWN_TILES = [
  "TTTTTTTTTTTTT====TTTTTTTTTTTT",
  "TT...........====...........TT",
  "TT..,,.......====.......,,..TT",
  "TT..BBBBBB...====...rrrr....TT",
  "TT..BBBBBB...====...rrrr....TT",
  "TT..mmdnmm...====...mdnm....TT",
  "TT....=......====.....=.....TT",
  "TT....=================.....TT",
  "TT..xxxx.....====...yyyy....TT",
  "TT..mdnm.....====...mdnm....TT",
  "TT....ww.....====.....hh....TT",
  "TT...........====...........TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT...........====...........TT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTT"
];

// ------------------------------------------------------------- CAPUT MUNDI

const CAPITALE_TILES = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT........MMMMMMMMMM........TT",
  "TT........MGMMMMMMGM........TT",
  "TT........MMMMMMMMMM........TT",
  "TT........CMMMDDMMMC........TT",
  "TT..,,....==========....,,..TT",
  "TT..,,......======......,,..TT",
  "TT...........====...........TT",
  "TT..xxxxxx...====..yyyyyy...TT",
  "TT..xxxxxx...====..yyyyyy...TT",
  "TT..mmdnmm...====..mmdnmm...TT",
  "TT....=......====.....=.h...TT",
  "TT....============...===....TT",
  "TT...........====...........TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT.rrrr~~....====....~~yyyy.TT",
  "TT.mdnm......====......mdnm.TT",
  "TT.....s.....====...........TT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTT"
];

// ---------------------------------------------------- STRETTO DI MESSINA
// Spiaggia stile Papeete + ponte eternamente incompiuto che finisce in mare.

const STRETTO_TILES = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.......eeee...............TT",
  "TT..~~~~.mdnm.s.......~~~~..TT",
  "TT..~~~~..............~~~~..TT",
  "TT..~~~~.....hh.......~~~~..TT",
  "TT...s......................TT",
  "TTzzzzzzzzzzzz==zzzzzzzzzzzzTT",
  "TTzzzzzzzzzzzz==zzzzzzzzzzzzTT",
  "wwwwwwwwwwwwwJjjJwwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjjJwwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjjJwwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjjJwwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjjJwwwwwwwwwwwww",
  "wwwwwwwwwwwwKJjjJKwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjjJwwwwwwwwwwwww",
  "wwwwwwwwwwwwwjjjjwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwwwwwwwwwwwwwwwww"
];

// ------------------------------------------------------------------ INTERNI

const LAB_TILES = [
  "AAAAAAAAAAAA",
  "AbbbkkkkbbbA",
  "AppppppppppA",
  "ApptttttpppA",
  "AppppppppppA",
  "AppppppppppA",
  "AppppppppppA",
  "AppppccppppA",
  "AAAAAAAAAAAA"
];

const GYM_TILES = [
  "AAAAAAAAAA",
  "AkppppppkA",
  "AppppppppA",
  "AppppppppA",
  "AppppppppA",
  "AppppppppA",
  "AppppppppA",
  "AppppccppA",
  "AAAAAAAAAA"
];

const MARKET_TILES = [
  "AAAAAAAAAA",
  "AbbbbbbbbA",
  "AppppppppA",
  "AppppppppA",
  "AppppppppA",
  "AppppccppA",
  "AAAAAAAAAA"
];

// Scalinata della Consulta: corridoio cerimoniale, tre giudici e il Garante.
const COLLE_TILES = [
  "AAAAAAAAAAAA",
  "AkpppccpppkA",
  "AppppccppppA",
  "AppppccppppA",
  "AppppccppppA",
  "AppppccppppA",
  "AppppccppppA",
  "AppppccppppA",
  "AppppccppppA",
  "AAAAAAAAAAAA"
];

const PALAZZO_TILES = [
  "AAAAAAAAAAAA",
  "AkpppccpppkA",
  "AppppccppppA",
  "AppppccppppA",
  "AppppccppppA",
  "AppppccppppA",
  "AppppccppppA",
  "AppppccppppA",
  "AAAAAAAAAAAA"
];

function gymMap(
  id: string,
  name: string,
  city: string,
  doorX: number,
  doorY: number,
  npcs: NpcDef[],
  signLines: string[]
): MapDef {
  return {
    id,
    name,
    tiles: GYM_TILES,
    outdoor: false,
    music: "interior",
    warps: [
      { x: 4, y: 7, toMap: city, toX: doorX, toY: doorY, facing: "down" },
      { x: 5, y: 7, toMap: city, toX: doorX, toY: doorY, facing: "down" }
    ],
    signs: [{ x: 0, y: 1, lines: signLines }, { x: 9, y: 1, lines: signLines }],
    pickups: [],
    npcs
  };
}

function marketMap(id: string, city: string, doorX: number, doorY: number): MapDef {
  return {
    id,
    name: "DISCOUNT ELETTORALE",
    tiles: MARKET_TILES,
    outdoor: false,
    music: "interior",
    warps: [
      { x: 4, y: 5, toMap: city, toX: doorX, toY: doorY, facing: "down" },
      { x: 5, y: 5, toMap: city, toX: doorX, toY: doorY, facing: "down" }
    ],
    signs: [],
    pickups: [],
    npcs: [
      {
        id: `${id}-clerk`, pal: "kid", x: 2, y: 2, facing: "down", shop: true,
        lines: ["Benvenuto al DISCOUNT ELETTORALE!", "Tutto in offerta, tranne le promesse."]
      }
    ]
  };
}

// Interni di case visitabili. Tre piantine diverse per non farle sembrare
// tutte uguali: tile A=parete, p=pavimento, L=letto, t=tavolo, b=scaffale,
// P=pianta, c=tappeto/zerbino d'uscita (le 2 celle in basso fanno da porta).
const HOUSE_TILES_A = [
  "AAAAAAAAAA",
  "ALLApppbbA",
  "ALLAppptpA",
  "ApppppptpA",
  "AppPpppppA",
  "AppppccppA",
  "AAAAAAAAAA"
];

const HOUSE_TILES_B = [
  "AAAAAAAAAA",
  "AbbbppLLpA",
  "ApttpLLppA",
  "AptttppppA",
  "AppppppPpA",
  "AppppccppA",
  "AAAAAAAAAA"
];

const HOUSE_TILES_C = [
  "AAAAAAAAAAAA",
  "ALLAppppbbbA",
  "ALLApttpbbbA",
  "AppppttppppA",
  "AppppppppPpA",
  "AppPpppppppA",
  "AppppccppppA",
  "AAAAAAAAAAAA"
];

const HOUSE_LAYOUTS = [HOUSE_TILES_A, HOUSE_TILES_B, HOUSE_TILES_C];

// Genera l'interno di una casa. `variant` sceglie la piantina; `door` è la
// cella della città su cui si riemerge uscendo.
function houseMap(
  id: string,
  name: string,
  city: string,
  doorX: number,
  doorY: number,
  npcs: NpcDef[],
  opts: { variant?: number; signs?: SignDef[]; pickups?: PickupDef[] } = {}
): MapDef {
  const tiles = HOUSE_LAYOUTS[(opts.variant ?? 0) % HOUSE_LAYOUTS.length];
  const exitY = tiles.length - 2; // riga delle due celle "cc"
  // Trova la prima 'c' per centrare il warp d'uscita.
  const row = tiles[exitY];
  const cx = Math.max(0, row.indexOf("c"));
  return {
    id,
    name,
    tiles,
    outdoor: false,
    music: "interior",
    warps: [
      { x: cx, y: exitY, toMap: city, toX: doorX, toY: doorY, facing: "down" },
      { x: cx + 1, y: exitY, toMap: city, toX: doorX, toY: doorY, facing: "down" }
    ],
    signs: opts.signs ?? [],
    pickups: opts.pickups ?? [],
    npcs
  };
}

export const MAPS: Record<string, MapDef> = {
  borgo: {
    id: "borgo",
    name: "BORGO URNE",
    tiles: BORGO_TILES,
    outdoor: true,
    music: "borgo",
    edges: { north: { toMap: "mediopoli", offsetX: 0 } },
    warps: [
      { x: 6, y: 12, toMap: "lab", toX: 5, toY: 6, facing: "up" },
      { x: 23, y: 12, toMap: "home", toX: 4, toY: 5, facing: "up" },
      { x: 5, y: 18, toMap: "circolo", toX: 5, toY: 5, facing: "up" }
    ],
    encounterRate: 0.10,
    encounters: [
      { speciesId: "salvinott", weight: 40, minLv: 2, maxLv: 4 },
      { speciesId: "grillix", weight: 20, minLv: 3, maxLv: 5 },
      { speciesId: "tajanide", weight: 16, minLv: 3, maxLv: 5 },
      { speciesId: "bojoon", weight: 14, minLv: 4, maxLv: 5 },
      { speciesId: "contemorfo", weight: 10, minLv: 4, maxLv: 5 }
    ],
    signs: [
      {
        x: 3, y: 16,
        lines: ["BORGO URNE", "Dove ogni promessa è per sempre. O almeno fino al ballottaggio."]
      },
      {
        x: 7, y: 8,
        lines: ["CAMPAGNA ELETTORALE NORD", "Attenti ai candidati selvatici nell'erba alta.", "Dicono che nei vicoli più sperduti qualcuno nasconda 'fondi neri'... esplora gli angoli!", "A nord: MEDIOPOLI, la città che decide cosa pensi."]
      },
      {
        x: 23, y: 12,
        lines: ["CASA TUA.", "Mamma non c'è: è a un talk show a difendere il tuo operato."]
      }
    ],
    pickups: [
      { id: "pk-b1", x: 4, y: 6, itemId: "scheda", qty: 2 },
      { id: "pk-b2", x: 4, y: 22, itemId: "caffe", qty: 1 },
      { id: "pk-b3", x: 25, y: 19, itemId: "spritz", qty: 1 },
      // Tesori nascosti: angoli morti che premiano chi gironzola.
      { id: "pk-b-hide1", x: 26, y: 1, itemId: "schedona", qty: 1, hidden: true },
      { id: "pk-b-hide2", x: 2, y: 16, itemId: "caffe", qty: 2, hidden: true }
    ],
    npcs: [
      {
        id: "granny", pal: "granny", x: 10, y: 17, facing: "down",
        lines: [
          "Ai miei tempi i politici si catturavano col televoto.",
          "Ora servono le SCHEDE ELETTORALI: indebolisci il candidato e lanciagliela!"
        ]
      },
      {
        id: "egg-pensionato", pal: "granny", x: 10, y: 7, facing: "down",
        lines: [
          "Una poltrona? Io ne ho viste cadere centinaia.",
          "C'è chi dice che se cammini abbastanza nell'erba alta...",
          "...prima o poi sbuca pure il PRESIDENTE OMBRA in persona. Leggende da bar."
        ]
      },
      {
        id: "egg-complotto", pal: "aide", x: 18, y: 9, facing: "down",
        lines: [
          "Lo sai che le SCIE delle promesse non svaniscono mai?",
          "Restano lì, nell'atmosfera. Per questo l'aria è irrespirabile a Roma.",
          "Sveglia, pecorella elettorale!"
        ]
      },
      {
        id: "barista-borgo", pal: "barista", x: 20, y: 17, facing: "down", healer: true,
        lines: ["Benvenuto al BAR SPORT, sede di ogni dibattito che conta."]
      },
      {
        id: "scorta-borgo", pal: "guard", x: 25, y: 22, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "Salta su: la macchina elettorale conosce ogni scorciatoia."]
      },
      {
        id: "tipografo", pal: "kid", x: 17, y: 15, facing: "left",
        gift: {
          itemId: "scheda", qty: 5, flag: "gift-tipografo",
          lines: [
            "Psst! Stampo schede elettorali. Tutte regolari, giuro.",
            "Tieni: 5 SCHEDE ELETTORALI omaggio. Ricordati di me al ministero."
          ]
        },
        lines: ["Le ristampe costano. Torna dopo le elezioni."]
      },
      {
        id: "tr-aide", pal: "aide", x: 9, y: 6, facing: "right",
        trainerId: "aide", sightRange: 3,
        lines: ["I miei SALVINOTT non mollano mai. Purtroppo."]
      },
      {
        id: "tr-journalist", pal: "journalist", x: 20, y: 3, facing: "left",
        trainerId: "journalist", sightRange: 3,
        lines: ["Il pezzo era già scritto, mancavano solo i fatti."]
      }
    ]
  },

  mediopoli: {
    id: "mediopoli",
    name: "MEDIOPOLI",
    tiles: MEDIOPOLI_TILES,
    outdoor: true,
    music: "mediopoli",
    edges: {
      north: { toMap: "eurotown", offsetX: 0 },
      south: { toMap: "borgo", offsetX: 0 }
    },
    warps: [
      { x: 6, y: 10, toMap: "gymtv", toX: 4, toY: 6, facing: "up" },
      { x: 21, y: 10, toMap: "market1", toX: 4, toY: 4, facing: "up" },
      { x: 5, y: 18, toMap: "attico", toX: 4, toY: 5, facing: "up" },
      { x: 22, y: 16, toMap: "redazione", toX: 4, toY: 5, facing: "up" }
    ],
    encounterRate: 0.10,
    encounters: [
      { speciesId: "vannaccix", weight: 20, minLv: 8, maxLv: 11 },
      { speciesId: "contemorfo", weight: 18, minLv: 8, maxLv: 11 },
      { speciesId: "calendauro", weight: 16, minLv: 9, maxLv: 12 },
      { speciesId: "bojoon", weight: 15, minLv: 9, maxLv: 12 },
      { speciesId: "macronfox", weight: 10, minLv: 10, maxLv: 12 },
      { speciesId: "grillix", weight: 8, minLv: 9, maxLv: 12 },
      { speciesId: "salvinott", weight: 6, minLv: 8, maxLv: 10 },
      { speciesId: "muskrat", weight: 3, minLv: 12, maxLv: 13 }
    ],
    signs: [
      {
        x: 6, y: 6,
        lines: ["MEDIOPOLI", "La città che decide cosa pensi. In onda dal 1980."]
      },
      {
        x: 24, y: 18,
        lines: ["PALESTRA TV: STUDIO 5", "Capopalestra: SUA EMITTENZA.", "Medaglia in palio: AUDITEL."]
      }
    ],
    pickups: [
      { id: "pk-m1", x: 3, y: 17, itemId: "maalox", qty: 1 },
      { id: "pk-m2", x: 26, y: 16, itemId: "schedona", qty: 1 },
      { id: "pk-m-hide1", x: 26, y: 1, itemId: "spritz", qty: 2, hidden: true },
      { id: "pk-m-hide2", x: 2, y: 19, itemId: "maalox", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "barista-medio", pal: "barista", x: 4, y: 16, facing: "down", healer: true,
        lines: ["BAR SPORT di MEDIOPOLI: qui il dibattito è in onda h24."]
      },
      {
        id: "scorta-medio", pal: "guard", x: 24, y: 19, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "Destinazioni rapide, sirena inclusa, spiegazioni escluse."]
      },
      {
        id: "tr-influencer", pal: "influencer", x: 10, y: 12, facing: "right",
        trainerId: "influencer", sightRange: 3,
        lines: ["Questa sconfitta finisce nelle storie in evidenza."]
      },
      {
        id: "fan-tv", pal: "granny", x: 18, y: 14, facing: "left",
        lines: [
          "SUA EMITTENZA non perde da quarant'anni.",
          "Dicono che il suo BERLUSCONIX sia immune alla par condicio."
        ]
      },
      {
        id: "sindacalista", pal: "barista", x: 15, y: 7, facing: "down",
        gift: {
          itemId: "divisa", qty: 1, flag: "gift-divisa",
          lines: [
            "Sindacato dei POLITICMON in panchina: anche loro vogliono crescere!",
            "Tieni la DIVISA EQUA: spartisce i PUNTI CONSENSO con tutta la squadra.",
            "Equità prima di tutto. Almeno a parole."
          ]
        },
        lines: ["La DIVISA EQUA ce l'hai. Ora nessuno resta indietro... in teoria."]
      },
      {
        id: "rider-monopattino", pal: "kid", x: 15, y: 16, facing: "down",
        vehicleGift: {
          vehicle: "monopattino", flag: "gift-monopattino",
          lines: [
            "Rider in sciopero: ho mollato le consegne, mi tengo il mezzo.",
            "Tieni il MONOPATTINO: sfreccia in città, tanto le piste ciclabili non le useremo mai."
          ]
        },
        lines: ["Il MONOPATTINO te l'ho già dato. Pedala, anzi... spingi."]
      },
      {
        id: "talkshow-fan", pal: "journalist", x: 3, y: 7, facing: "right",
        lines: [
          "Stasera tre talk show in contemporanea, stessi ospiti su ogni canale.",
          "Cambio rete, stessa faccia. Cambio idea, stessa faccia. Magia della TV."
        ]
      }
    ]
  },

  eurotown: {
    id: "eurotown",
    name: "EUROTOWN",
    tiles: EUROTOWN_TILES,
    outdoor: true,
    music: "eurotown",
    edges: {
      north: { toMap: "capitale", offsetX: 0 },
      south: { toMap: "mediopoli", offsetX: 0 }
    },
    warps: [
      { x: 6, y: 5, toMap: "gymue", toX: 4, toY: 6, facing: "up" },
      { x: 21, y: 5, toMap: "market2", toX: 4, toY: 4, facing: "up" },
      { x: 5, y: 9, toMap: "lobbystudio", toX: 4, toY: 5, facing: "up" },
      { x: 21, y: 9, toMap: "bistrot", toX: 4, toY: 5, facing: "up" }
    ],
    encounterRate: 0.10,
    encounters: [
      { speciesId: "macronfox", weight: 24, minLv: 12, maxLv: 15 },
      { speciesId: "zelenskir", weight: 20, minLv: 13, maxLv: 15 },
      { speciesId: "bojoon", weight: 15, minLv: 12, maxLv: 15 },
      { speciesId: "tajanide", weight: 14, minLv: 12, maxLv: 14 },
      { speciesId: "calendauro", weight: 12, minLv: 12, maxLv: 15 },
      { speciesId: "ursulax", weight: 5, minLv: 15, maxLv: 15 },
      { speciesId: "draghimon", weight: 5, minLv: 16, maxLv: 16 },
      { speciesId: "muskrat", weight: 5, minLv: 14, maxLv: 15 }
    ],
    signs: [
      {
        x: 21, y: 11,
        lines: ["EUROTOWN", "Gemellata con se stessa in 27 lingue diverse.", "PALESTRA UE: medaglia SPREAD in palio."]
      }
    ],
    pickups: [
      { id: "pk-e1", x: 26, y: 2, itemId: "spritz", qty: 1 },
      { id: "pk-e2", x: 2, y: 2, itemId: "dirGreen", qty: 1 },
      { id: "pk-e-hide1", x: 26, y: 14, itemId: "dirBunga", qty: 1, hidden: true },
      { id: "pk-e-hide2", x: 2, y: 14, itemId: "mojito", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "barista-euro", pal: "barista", x: 22, y: 10, facing: "down", healer: true,
        lines: ["BAR SPORT di EUROTOWN. Il caffè qui si chiama espresso normato."]
      },
      {
        id: "scorta-euro", pal: "guard", x: 24, y: 14, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "Abbiamo una corsia preferenziale approvata in 27 lingue."]
      },
      {
        id: "tr-lobbista", pal: "aide", x: 9, y: 11, facing: "right",
        trainerId: "lobbista", sightRange: 3,
        lines: ["Rappresento interessi. Quali? Dipende da chi paga."]
      },
      {
        id: "fan-ue", pal: "journalist", x: 18, y: 8, facing: "left",
        lines: [
          "LADY DIRETTIVA ha regolamentato persino questa conversazione.",
          "Il suo URSULAX multa chiunque la sfidi."
        ]
      },
      {
        id: "euroburocrate", pal: "aide", x: 3, y: 11, facing: "right",
        lines: [
          "Modulo 27/B per attraversare la piazza: l'ha compilato?",
          "No? Allora tecnicamente lei non è qui. Buona giornata."
        ]
      },
      {
        id: "pensionato-euro", pal: "granny", x: 21, y: 11, facing: "down",
        lines: [
          "Ai miei tempi il consenso si conquistava in fabbrica, non su TikTok.",
          "Adesso vince chi balla meglio. Mah."
        ]
      }
    ]
  },

  capitale: {
    id: "capitale",
    name: "CAPUT MUNDI",
    tiles: CAPITALE_TILES,
    outdoor: true,
    music: "capitale",
    edges: { south: { toMap: "eurotown", offsetX: 0 } },
    warps: [
      { x: 6, y: 11, toMap: "gymglobal", toX: 4, toY: 6, facing: "up" },
      { x: 21, y: 11, toMap: "casino", toX: 4, toY: 4, facing: "up" },
      { x: 4, y: 18, toMap: "salotto", toX: 4, toY: 5, facing: "up" },
      { x: 24, y: 18, toMap: "retroscena", toX: 4, toY: 5, facing: "up" },
      {
        x: 14, y: 5, toMap: "palazzo", toX: 5, toY: 7, facing: "up",
        requiresBadges: 3,
        lockedLines: ["Il portone è sbarrato.", "Un cartello: 'SI RICEVE SOLO CON 3 MEDAGLIE.'"]
      },
      {
        x: 15, y: 5, toMap: "palazzo", toX: 6, toY: 7, facing: "up",
        requiresBadges: 3,
        lockedLines: ["Il portone è sbarrato.", "Un cartello: 'SI RICEVE SOLO CON 3 MEDAGLIE.'"]
      }
    ],
    encounterRate: 0.11,
    encounters: [
      { speciesId: "zelenskir", weight: 18, minLv: 15, maxLv: 18 },
      { speciesId: "muskrat", weight: 16, minLv: 15, maxLv: 18 },
      { speciesId: "vannaccix", weight: 13, minLv: 15, maxLv: 18 },
      { speciesId: "macronfox", weight: 10, minLv: 15, maxLv: 18 },
      { speciesId: "putingrad", weight: 8, minLv: 18, maxLv: 18 },
      { speciesId: "xipanda", weight: 8, minLv: 18, maxLv: 18 },
      { speciesId: "draghimon", weight: 6, minLv: 17, maxLv: 18 },
      { speciesId: "trumpon", weight: 5, minLv: 18, maxLv: 18 },
      { speciesId: "grillix", weight: 4, minLv: 16, maxLv: 18 },
      { speciesId: "mattarellux", weight: 1, minLv: 20, maxLv: 20 }
    ],
    signs: [
      {
        x: 7, y: 19,
        lines: ["CAPUT MUNDI", "Qui i potenti del mondo vengono a farsi fotografare."]
      },
      {
        x: 23, y: 12,
        lines: ["PALESTRA GLOBAL TOWER", "Capopalestra: MR. TYCOON.", "Medaglia DAZIO. Ingresso gratuito, uscita tassata."]
      }
    ],
    pickups: [
      { id: "pk-c1", x: 25, y: 8, itemId: "schedona", qty: 2 },
      { id: "pk-c2", x: 4, y: 18, itemId: "spritz", qty: 1 },
      { id: "pk-c3", x: 4, y: 2, itemId: "dirWhatever", qty: 1 },
      // Tesoro grosso nella capitale: la TESSERA DORATA per evolvere.
      { id: "pk-c-hide1", x: 2, y: 8, itemId: "tessera", qty: 1, hidden: true },
      { id: "pk-c-hide2", x: 26, y: 14, itemId: "mojito", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "barista-cap", pal: "barista", x: 21, y: 11, facing: "down", healer: true,
        lines: ["BAR SPORT di CAPUT MUNDI: i cappuccini costano come un emendamento."]
      },
      {
        id: "scorta-cap", pal: "guard", x: 24, y: 18, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "Davanti al Palazzo non si cammina: si arriva con lampeggiante istituzionale."]
      },
      {
        id: "corazziere", pal: "guard", x: 12, y: 6, facing: "right",
        lines: [
          "Il PALAZZO riceve solo candidati con 3 MEDAGLIE.",
          "AUDITEL, SPREAD e DAZIO. Poi possiamo parlare."
        ]
      },
      {
        id: "ruspista", pal: "aide", x: 8, y: 18, facing: "down",
        vehicleGift: {
          vehicle: "ruspa", flag: "gift-ruspa",
          lines: [
            "Cantiere fermo, appalto sospeso, ma la RUSPA è ancora carica.",
            "Tienila tu: davanti a un albero che ti sbarra la strada, premi A.",
            "Useremo il verbale come scorciatoia. Anzi: useremo la RUSPA."
          ]
        },
        lines: ["La RUSPA ce l'hai. Usala con parsimonia... o no, fai te."]
      },
      {
        id: "turista-cap", pal: "kid", x: 17, y: 19, facing: "up",
        lines: [
          "Sono venuto a Roma per la storia, la cultura, l'arte...",
          "...e invece sto facendo la fila per un selfie col PRESIDENTE OMBRA.",
          "Bravo eh, però spostati che non si vede il monumento."
        ]
      },
      {
        id: "influencer-cap", pal: "influencer", x: 22, y: 19, facing: "left",
        lines: [
          "Story, reel, dirette: il consenso oggi si fa col telefono.",
          "Tu invece giri a piedi nell'erba alta come nel 2005. Tenero."
        ]
      }
    ]
  },

  lab: {
    id: "lab",
    name: "LABORATORIO DEL CONSENSO",
    tiles: LAB_TILES,
    outdoor: false,
    music: "interior",
    warps: [
      { x: 5, y: 7, toMap: "borgo", toX: 6, toY: 13, facing: "down" },
      { x: 6, y: 7, toMap: "borgo", toX: 6, toY: 13, facing: "down" }
    ],
    signs: [
      {
        x: 2, y: 1,
        lines: ["Tesi del Professore:", "'Il consenso: crearlo dal nulla e perderlo in un weekend.'"]
      },
      {
        x: 9, y: 1,
        lines: ["SONDAGGIOTRON 3000.", "Schermata attuale: 'MARGINE DI ERRORE: 100%'."]
      }
    ],
    pickups: [],
    npcs: [
      {
        id: "professor", pal: "professor", x: 9, y: 4, facing: "left",
        lines: [
          "Io sono il PROFESSOR QUIRINO, studioso del consenso.",
          "Sul tavolo ci sono tre SCHEDE STARTER: avvicinati a una e premi A per esaminarla.",
          "Ne scegli SOLO una: sarà il tuo primo POLITICMON. Le altre? Le prenderà chi viene dopo di te..."
        ]
      }
    ]
  },

  gymtv: gymMap(
    "gymtv", "STUDIO 5 - PALESTRA TV", "mediopoli", 6, 11,
    [
      {
        id: "gym1-allievo", pal: "journalist", x: 2, y: 4, facing: "right",
        trainerId: "stagista", sightRange: 3,
        lines: ["Lo stage dura da undici anni. Ma sono in onda!"]
      },
      {
        id: "gym1-capo", pal: "boss", x: 4, y: 1, facing: "down",
        trainerId: "emittenza",
        lines: ["Torna quando vuoi: la pubblicità paga comunque."]
      },
      {
        id: "berlusconix-legend", pal: "boss", x: 7, y: 1, facing: "down",
        showIfFlag: "legend-berlusconix-ready",
        hideIfFlag: "legend-berlusconix-gone",
        legendary: {
          speciesId: "berlusconix",
          level: 18,
          flag: "legend-berlusconix-gone",
          lines: [
            "Dietro le quinte lampeggia un telecomando d'oro.",
            "SUA EMITTENZA: hai conquistato l'AUDITEL. Ora puoi vedere il vero ospite della serata.",
            "BERLUSCONIX emerge dal maxischermo: sorriso a trentadue denti e sigla anni novanta."
          ],
          afterRunLines: [
            "BERLUSCONIX rientra nello schermo ridendo.",
            "Il telecomando d'oro resta acceso: puoi ritentare quando vuoi."
          ],
          afterGoneLines: [
            "Il maxischermo si spegne. In studio resta solo un applauso registrato.",
            "BERLUSCONIX è diventato una leggenda nel tuo POLITICDEX."
          ]
        },
        lines: ["Il maxischermo è spento. Sembra aspettare lo share giusto."]
      }
    ],
    ["REGOLAMENTO DELLO STUDIO:", "sorridere sempre, contraddire mai."]
  ),

  gymue: gymMap(
    "gymue", "PALESTRA UE", "eurotown", 6, 6,
    [
      {
        id: "gym2-allievo", pal: "aide", x: 7, y: 4, facing: "left",
        trainerId: "funzionario", sightRange: 3,
        lines: ["Ho un modulo per ogni emozione. In triplice copia."]
      },
      {
        id: "gym2-capo", pal: "granny", x: 4, y: 1, facing: "down",
        trainerId: "ladydirettiva",
        lines: ["La tua vittoria sarà recepita negli ordinamenti nazionali."]
      }
    ],
    ["AVVISO UE:", "questa palestra è conforme alla direttiva 2026/1, allegato C."]
  ),

  gymglobal: gymMap(
    "gymglobal", "GLOBAL TOWER", "capitale", 6, 12,
    [
      {
        id: "gym3-allievo1", pal: "guard", x: 2, y: 5, facing: "right",
        trainerId: "diplomatico", sightRange: 3,
        lines: ["La diplomazia è l'arte di perdere con stile."]
      },
      {
        id: "gym3-allievo2", pal: "aide", x: 7, y: 3, facing: "left",
        trainerId: "oligarca", sightRange: 3,
        lines: ["Io non perdo mai. Al massimo rinegozio."]
      },
      {
        id: "gym3-capo", pal: "boss", x: 4, y: 1, facing: "down",
        trainerId: "tycoon",
        lines: ["Nessuno perde meglio di me. Nessuno. È una vittoria enorme."]
      }
    ],
    ["GLOBAL TOWER:", "il piano terra è gratis, l'attico è in svendita a un miliardo."]
  ),

  market1: marketMap("market1", "mediopoli", 21, 11),
  market2: marketMap("market2", "eurotown", 21, 6),

  casino: {
    id: "casino",
    name: "CASINÒ DI PALAZZO",
    tiles: MARKET_TILES,
    outdoor: false,
    music: "interior",
    warps: [
      { x: 4, y: 5, toMap: "capitale", toX: 21, toY: 12, facing: "down" },
      { x: 5, y: 5, toMap: "capitale", toX: 21, toY: 12, facing: "down" }
    ],
    signs: [
      { x: 0, y: 1, lines: ["CASINÒ DI PALAZZO", "Si entra elettori, si esce contribuenti."] }
    ],
    pickups: [],
    npcs: [
      {
        id: "croupier", pal: "boss", x: 4, y: 2, facing: "down", casino: true,
        lines: ["Benvenuto al CASINÒ DI PALAZZO.", "Qui il consenso si gioca a soldi. Letteralmente."]
      },
      {
        id: "habitue", pal: "journalist", x: 7, y: 3, facing: "left",
        lines: ["Vengo qui da vent'anni.", "Ho perso una legislatura intera alla roulette. Rifarei tutto."]
      }
    ]
  },

  stretto: {
    id: "stretto",
    name: "STRETTO DI MESSINA",
    tiles: STRETTO_TILES,
    outdoor: true,
    music: "stretto",
    warps: [{ x: 10, y: 2, toMap: "chiosco", toX: 5, toY: 4, facing: "down" }],
    encounterRate: 0.11,
    encounters: [
      { speciesId: "salvinott", weight: 28, minLv: 19, maxLv: 21 },
      { speciesId: "vannaccix", weight: 18, minLv: 20, maxLv: 22 },
      { speciesId: "grillix", weight: 16, minLv: 19, maxLv: 22 },
      { speciesId: "contemorfo", weight: 12, minLv: 20, maxLv: 22 },
      { speciesId: "salvinator", weight: 12, minLv: 21, maxLv: 23 },
      { speciesId: "bojoon", weight: 8, minLv: 20, maxLv: 22 },
      { speciesId: "muskrat", weight: 6, minLv: 21, maxLv: 23 }
    ],
    signs: [
      {
        x: 14, y: 2,
        lines: [
          "PONTE SULLO STRETTO - CANTIERE APERTO",
          "Fine lavori prevista: 1972. Poi 1985. Poi 2009. Poi 2024.",
          "Nuova stima: 'prima dei prossimi sondaggi'."
        ]
      },
      {
        x: 5, y: 5,
        lines: [
          "SPIAGGIA PAPEETE BEACH",
          "Vietato disturbare il Ministro durante la consolle.",
          "Mojito sì, mozioni no."
        ]
      }
    ],
    pickups: [
      { id: "pk-s1", x: 3, y: 6, itemId: "schedona", qty: 1 },
      { id: "pk-s2", x: 26, y: 7, itemId: "spritz", qty: 1 },
      { id: "pk-s3", x: 13, y: 15, itemId: "mojito", qty: 1 },
      { id: "pk-s4", x: 3, y: 7, itemId: "dirVaffa", qty: 1 }
    ],
    npcs: [
      {
        id: "bagnino-stretto", pal: "barista", x: 12, y: 4, facing: "down", healer: true,
        lines: [
          "CHIRINGUITO PAPEETE: il bar che ha visto cadere un governo.",
          "Un mojito alla squadra e si riparte. Cubista compresa nel prezzo."
        ]
      },
      {
        id: "elevato", pal: "professor", x: 20, y: 3, facing: "down",
        lines: [
          "Io sono L'ELEVATO. Parlo solo dal mio scoglio sacro.",
          "Un tempo da qui si gridava una parola sola. Il mare la grida ancora.",
          "Vedi quel ponte? Lo avevo previsto nel mio blog. Nessuno legge più i blog."
        ]
      },
      {
        id: "ingegnere", pal: "kid", x: 17, y: 5, facing: "left",
        gift: {
          itemId: "mojito", qty: 2, flag: "gift-ingegnere",
          lines: [
            "INGEGNERE CAPO: il progetto è pronto dal 1969. PRONTISSIMO.",
            "Manca solo il ponte. Dettagli. Tieni: 2 MOJITO, offre l'appalto."
          ]
        },
        lines: ["Il rendering è bellissimo. Vuoi vederlo? È l'unica cosa costruita."]
      },
      {
        id: "tr-djpapeete", pal: "influencer", x: 6, y: 7, facing: "right",
        trainerId: "djpapeete", sightRange: 3,
        lines: ["La cassa dritta è l'unica linea politica che non tradisce."]
      },
      {
        id: "tr-citofonista", pal: "aide", x: 22, y: 6, facing: "left",
        trainerId: "citofonista", sightRange: 3,
        lines: ["Citofonare prima di entrare. Sempre. È il mio format."]
      },
      {
        id: "tr-noponte", pal: "journalist", x: 10, y: 2, facing: "down",
        trainerId: "noponte", sightRange: 3,
        lines: ["Protesto contro il ponte da prima che non esistesse."]
      },
      {
        id: "tr-geometra", pal: "guard", x: 14, y: 10, facing: "up",
        trainerId: "geometra", sightRange: 3,
        lines: ["Il collaudo è ok: il ponte regge benissimo dove c'è."]
      },
      {
        id: "tr-ilcapitano", pal: "boss", x: 15, y: 15, facing: "up",
        trainerId: "ilcapitano", sightRange: 4, hideIfFlag: "ponte-beaten",
        lines: []
      },
      {
        id: "capitano-after", pal: "boss", x: 13, y: 15, facing: "right", showIfFlag: "ponte-beaten",
        lines: [
          "IL CAPITANO: lo senti? Il profumo della SICILIA. Praticamente fatta.",
          "Il ponte si farà. Intanto ho fatto il selfie dal pilone: 49 milioni di like.",
          "Anzi no, 49 e basta. Ma torneranno. Tornano sempre."
        ]
      }
    ]
  },

  palazzo: {
    id: "palazzo",
    name: "IL PALAZZO",
    tiles: PALAZZO_TILES,
    outdoor: false,
    music: "palazzo",
    warps: [
      { x: 5, y: 7, toMap: "capitale", toX: 14, toY: 6, facing: "down" },
      { x: 6, y: 7, toMap: "capitale", toX: 15, toY: 6, facing: "down" },
      {
        x: 5, y: 1, toMap: "colle", toX: 5, toY: 7, facing: "up",
        requiresFlag: "boss-beaten",
        lockedLines: ["Una PORTA DORATA sigillata.", "Si aprirà solo quando il PALAZZO avrà un vincitore."]
      },
      {
        x: 6, y: 1, toMap: "colle", toX: 5, toY: 7, facing: "up",
        requiresFlag: "boss-beaten",
        lockedLines: ["Una PORTA DORATA sigillata.", "Si aprirà solo quando il PALAZZO avrà un vincitore."]
      }
    ],
    signs: [
      { x: 0, y: 1, lines: ["Albo dei governi:", "68 in 80 anni. Nuovo record europeo."] },
      { x: 11, y: 1, lines: ["Registro visite:", "'Lobbista, lobbista, lobbista, idraulico, lobbista.'"] }
    ],
    pickups: [],
    npcs: [
      {
        id: "boss", pal: "boss", x: 5, y: 2, facing: "down",
        trainerId: "boss", hideIfFlag: "boss-beaten",
        lines: []
      },
      {
        id: "boss-after", pal: "boss", x: 2, y: 2, facing: "down", showIfFlag: "boss-beaten",
        lines: [
          "Hai vinto, per ora. Ma ricorda:",
          "i governi passano, io resto. Ci vediamo alla prossima crisi.",
          "La PORTA DORATA lassù? Porta al COLLE. Nessuno è mai tornato... promosso."
        ]
      }
    ]
  },

  colle: {
    id: "colle",
    name: "IL COLLE",
    tiles: COLLE_TILES,
    outdoor: false,
    music: "palazzo",
    warps: [
      { x: 5, y: 8, toMap: "palazzo", toX: 5, toY: 2, facing: "down" },
      { x: 6, y: 8, toMap: "palazzo", toX: 6, toY: 2, facing: "down" }
    ],
    signs: [
      {
        x: 0, y: 3,
        lines: ["ALBO DELLA CONSULTA:", "tre giudici, zero appelli, nessuna pausa caffè.", "Da qui in poi niente BAR SPORT: portati le scorte."]
      },
      {
        x: 11, y: 5,
        lines: ["AVVISO AI CANDIDATI:", "vietato l'ingresso ai sondaggisti.", "Le toghe non si misurano in percentuale."]
      }
    ],
    pickups: [],
    npcs: [
      {
        id: "tr-giudice1", pal: "granny", x: 2, y: 6, facing: "right",
        trainerId: "giudice1", sightRange: 4,
        lines: ["La forma è sostanza. E la tua è rivedibile."]
      },
      {
        id: "tr-giudice2", pal: "aide", x: 9, y: 4, facing: "left",
        trainerId: "giudice2", sightRange: 4,
        lines: ["Ho bocciato leggi più simpatiche di te."]
      },
      {
        id: "tr-giudice3", pal: "journalist", x: 2, y: 2, facing: "right",
        trainerId: "giudice3", sightRange: 4,
        lines: ["Tre gradi di giudizio. Sei al terzo."]
      },
      {
        id: "tr-garante", pal: "boss", x: 5, y: 1, facing: "down",
        trainerId: "garante", sightRange: 5, hideIfFlag: "garante-beaten",
        lines: []
      },
      {
        id: "garante-after", pal: "boss", x: 2, y: 1, facing: "down", showIfFlag: "garante-beaten",
        lines: [
          "GARANTE: la controfirma non si revoca. Purtroppo per te, ora tocca governare.",
          "Torna quando vuoi: il COLLE è sempre aperto. Le dimissioni, mai accettate."
        ]
      },
      {
        id: "draghimon-legend", pal: "guard", x: 9, y: 1, facing: "down",
        showIfFlag: "garante-beaten", hideIfFlag: "legend-draghimon-gone",
        legendary: {
          speciesId: "draghimon",
          level: 30,
          flag: "legend-draghimon-gone",
          lines: [
            "USCIERE DEL COLLE: da questa porta si evoca solo in caso di crisi.",
            "Tu hai appena risolto una crisi. Tecnicamente... ne serve un'altra.",
            "Lo spread sussulta. Un'ombra elegante esce dalla sala dei bilanci.",
            "DRAGHIMON ti osserva, in silenzio. Whatever."
          ],
          afterRunLines: [
            "DRAGHIMON torna ai suoi grafici senza voltarsi.",
            "L'usciere sospira: 'Riproveremo alla prossima manovra.'"
          ],
          afterGoneLines: [
            "La sala dei bilanci è vuota. Lo spread riposa.",
            "DRAGHIMON è registrato nel tuo POLITICDEX."
          ]
        },
        lines: ["La sala dei bilanci è sigillata. Si apre solo nelle crisi."]
      }
    ]
  },

  // ----------------------------------------------------- CASE VISITABILI -----

  // BORGO — casa tua.
  home: houseMap("home", "CASA TUA", "borgo", 23, 13, [
    {
      id: "home-mom", pal: "granny", x: 7, y: 2, facing: "down", setFlag: "talked-mom",
      lines: [
        "MAMMA: torni a casa solo quando ti serve qualcosa, come i partiti a gennaio.",
        "Ho rifatto il letto e stirato la fascia tricolore. Vai a prenderti quel PALAZZO!",
        "E mangia, che a digiuno non si vincono i ballottaggi."
      ]
    }
  ], {
    variant: 2,
    signs: [{ x: 9, y: 1, lines: ["Diploma di MAMMA POLITICA dell'anno.", "Conferito da: se stessa."] }],
    pickups: [{ id: "home-pk", x: 1, y: 1, itemId: "caffe", qty: 1 }]
  }),

  // BORGO — circolo del paese.
  circolo: houseMap("circolo", "CIRCOLO DEL BORGO", "borgo", 5, 19, [
    {
      id: "circolo-anziano", pal: "granny", x: 2, y: 2, facing: "right",
      lines: [
        "Al CIRCOLO si gioca a carte e si rifà il governo ogni sera.",
        "Nessuno ha mai vinto una partita, ma tutti hanno sempre ragione."
      ]
    },
    {
      id: "circolo-tesserato", pal: "aide", x: 6, y: 3, facing: "down",
      gift: {
        itemId: "dirGreen", qty: 1, flag: "gift-circolo",
        lines: [
          "Tu sei la giovane promessa, vero? Tieni, una vecchia DIRETTIVA che non uso più.",
          "GREENWASHING: fa sembrare ecologico anche un inceneritore. Falla tua."
        ]
      },
      lines: ["Ho la tessera n.1 dal 1974. Di quale partito? Cambia ogni martedì."]
    }
  ], { variant: 1 }),

  // MEDIOPOLI — appartamento influencer.
  attico: houseMap("attico", "ATTICO INFLUENCER", "mediopoli", 5, 19, [
    {
      id: "attico-influencer", pal: "influencer", x: 5, y: 2, facing: "down", setFlag: "talked-influencer",
      lines: [
        "Sto girando un reel: 'cinque promesse che non manterrò, la terza vi sorprenderà'.",
        "Il consenso? Si fa coi like, non con le idee. Idee è un account che non seguo."
      ]
    }
  ], {
    variant: 0,
    pickups: [{ id: "attico-pk", x: 8, y: 1, itemId: "schedona", qty: 1 }]
  }),

  // MEDIOPOLI — redazione del TG.
  redazione: houseMap("redazione", "REDAZIONE DEL TG", "mediopoli", 22, 17, [
    {
      id: "redaz-direttore", pal: "journalist", x: 2, y: 1, facing: "right",
      lines: [
        "Notizia in apertura: tu. Domani: ancora tu. La verità? In coda, dopo lo sport.",
        "Un consiglio: se vuoi i SONDAGGI alti, falli scrivere a noi."
      ]
    },
    {
      id: "redaz-stagista", pal: "kid", x: 6, y: 3, facing: "left",
      lines: ["Sono lo stagista. Scrivo i titoli, firmano gli altri. Il giornalismo!"]
    }
  ], { variant: 1 }),

  // EUROTOWN — ufficio del lobbista.
  lobbystudio: houseMap("lobbystudio", "STUDIO DI LOBBYING", "eurotown", 5, 10, [
    {
      id: "lobby-capo", pal: "boss", x: 6, y: 2, facing: "down",
      lines: [
        "Una lobby? Che parolaccia. Diciamo 'consulenza per il bene comune'.",
        "Il bene di chi? Dettaglio tecnico. Firma qui, qui e qui."
      ]
    }
  ], { variant: 0 }),

  // EUROTOWN — bistrot della burocrazia.
  bistrot: houseMap("bistrot", "BISTROT DELLE DIRETTIVE", "eurotown", 21, 10, [
    {
      id: "bistrot-funz", pal: "professor", x: 3, y: 2, facing: "right",
      lines: [
        "La DIRETTIVA 2024/banane stabilisce la curvatura massima del consenso.",
        "Allegato B, comma 12: ogni promessa va tradotta in 24 lingue prima di romperla."
      ]
    }
  ], {
    variant: 1,
    pickups: [{ id: "bistrot-pk", x: 1, y: 1, itemId: "maalox", qty: 1 }]
  }),

  // CAPUT MUNDI — salotto romano.
  salotto: houseMap("salotto", "SALOTTO ROMANO", "capitale", 4, 19, [
    {
      id: "salotto-vip", pal: "influencer", x: 7, y: 2, facing: "down",
      lines: [
        "Tesoro, al SALOTTO contano due cose: con chi ti siedi e da chi ti fai vedere.",
        "Il programma elettorale? Lo serviamo come antipasto, tanto nessuno lo finisce."
      ]
    },
    {
      id: "salotto-trombato", pal: "aide", x: 2, y: 4, facing: "right",
      lines: ["Sono un ex-ministro. Di cosa? Bella domanda. Anche io me lo chiedo."]
    }
  ], { variant: 2 }),

  // CAPUT MUNDI — covo dei retroscenisti.
  retroscena: houseMap("retroscena", "COVO DEI RETROSCENISTI", "capitale", 24, 19, [
    {
      id: "retro-cronista", pal: "journalist", x: 5, y: 2, facing: "down",
      lines: [
        "Fonti vicine al PALAZZO dicono che fonti vicine a te smentiscono le fonti.",
        "Scrivo retroscena da vent'anni. Non è ancora successo nessuno scena, solo retro."
      ]
    }
  ], {
    variant: 0,
    pickups: [{ id: "retro-pk", x: 8, y: 4, itemId: "scheda", qty: 3 }]
  }),

  // STRETTO — chiosco del ponte.
  chiosco: houseMap("chiosco", "CHIOSCO DEL PONTE", "stretto", 10, 3, [
    {
      id: "chiosco-oste", pal: "barista", x: 3, y: 2, facing: "right",
      lines: [
        "Vendo granite e plastici del PONTE da trent'anni. Il ponte non c'è, le granite sì.",
        "Tutti chiedono: 'quando lo finite?'. Io rispondo: 'quale, il ponte o la granita?'."
      ]
    }
  ], {
    variant: 1,
    pickups: [{ id: "chiosco-pk", x: 1, y: 1, itemId: "mojito", qty: 1 }]
  })
};

// Posizioni delle tre schede starter sul tavolo del laboratorio.
export const STARTER_SPOTS: Array<{ x: number; y: number; speciesId: string }> = [
  { x: 3, y: 3, speciesId: "giorgetta" },
  { x: 5, y: 3, speciesId: "ellyna" },
  { x: 7, y: 3, speciesId: "renzino" }
];
