import type { MapDef } from "./types";

const CAMPO_LARGO_TILES = [
  "TTTTTTTTTTTTTTTTTTTTTTTT",
  "TT...ffffffffff.......TT",
  "TT...f========f.......TT",
  "TT...f==YY=1==f.......TT",
  "TT...ffff==ffff.......TT",
  "TT...s...==...s.......TT",
  "TT...2...==..3f.......TT",
  "TT...f...==..6f.......TT",
  "TT...f...==...f.......TT",
  "TT...f...==...f.......TT",
  "TT......====....vvvv..TT",
  "TT..U...====....vvvv..TT",
  "TT......====....mddm..TT",
  "TT..===============...TT",
  "TT..s...====..........TT",
  "TT......====.~~~~U....TT",
  "TT......====...~~~~...TT",
  "TTTTTTTT====TTTTTTTTTTTT"
];

const RETROPALCO_CAMPO_TILES = [
  "AAAAAAAAAAAAAAAA",
  "AbbbpppppppppbbA",
  "ApppppttttpppppA",
  "ApppppttttpppppA",
  "AppppppppppppppA",
  "AppPppppppppPppA",
  "ApppphhhhppppppA",
  "AppppppppppppppA",
  "AppppppppppppppA",
  "AppppppccppppppA",
  "AAAAAAAAAAAAAAAA"
];

const FUTURO_PLAZA_TILES = [
  "TTTTTTTTTTTTTTTTTTTT",
  "TT....ffffffffff..TT",
  "TT....f====1===f..TT",
  "TT....f========f..TT",
  "TT....ffff==ffff..TT",
  "TT........==......TT",
  "TT..3.....==....3.TT",
  "TT........==......TT",
  "TT....ffff==ffff..TT",
  "TT....f===8====f..TT",
  "TT....f===dd===f..TT",
  "TT....ffff==ffff..TT",
  "TT........==......TT",
  "TTTTTTTTTT==TTTTTTTT"
];

const FUTURO_HQ_TILES = [
  "AAAAAAAAAAAAAAAAAA",
  "AbbbpppppppppppbbA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "AppPpppppppppppPpA",
  "AppppppppppppppppA",
  "ApppphhhhhhhhppppA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "ApppppppccpppppppA",
  "AAAAAAAAAAAAAAAAAA"
];

const FUTURO_SIDE_ROOM_TILES = [
  "AAAAAAAAAA",
  "AbppppppbA",
  "AppppppppA",
  "AppPppPppA",
  "AppppppppA",
  "AppppppppA",
  "ApppccpppA",
  "AAAAAAAAAA"
];

const DIPLOMACY_LOBBY_TILES = [
  "AAAAAAAAAAAAAAAAAAAA",
  "AbbbpppppppppppppbbA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "ApppphhhhhhhhhhppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "ApppppppccccpppppppA",
  "AAAAAAAAAAAAAAAAAAAA"
];

const DIPLOMACY_TERRACE_TILES = [
  "TTTTTTTTTTTTTTTTTTTT",
  "TT....ffffffffff..TT",
  "TT....f====1===f..TT",
  "TT....ffff==ffff..TT",
  "TT........==......TT",
  "TT..6.....==....3.TT",
  "TT........==......TT",
  "TT....ffff==ffff..TT",
  "TT....f========f..TT",
  "TT....ffff==ffff..TT",
  "TT........==......TT",
  "TTTTTTTTTT==TTTTTTTT"
];

const GENOVA_TECHNO_TILES = [
  "TTTTTTTTTTTTTTTTTTTT",
  "TT....ffffffffff..TT",
  "TT....f===1====f..TT",
  "TT....ffff==ffff..TT",
  "TT........==......TT",
  "TT..7.....==....6.TT",
  "TT........==......TT",
  "TT....ffff==ffff..TT",
  "TT....f========f..TT",
  "TT....ffff==ffff..TT",
  "TT........==......TT",
  "TT........==......TT",
  "TT........==......TT",
  "TTTTTTTTTT==TTTTTTTT"
];

const TOUR_FEED_TILES = [
  "AAAAAAAAAAAAAAAAAAAAAAAA",
  "AbbbpppppppppppppppppbbA",
  "AppppppppppppppppppppppA",
  "AppppPppppPppppPppppPppA",
  "AppppppppppppppppppppppA",
  "ApphhhhhhhhhhhhhhhhhhhpA",
  "AppppppppppppppppppppppA",
  "AppppppppppppppppppppppA",
  "AppppPppppppppppppppPppA",
  "AppppppppppppppppppppppA",
  "ApphhhhhhhhhhhhhhhhhhhpA",
  "AppppppppppppppppppppppA",
  "AppppppppppppppppppppppA",
  "ApppppppppccccpppppppppA",
  "AAAAAAAAAAAAAAAAAAAAAAAA"
];

const PALACE_FEED_LOBBY_TILES = [
  "AAAAAAAAAAAAAAAAAAAA",
  "AbbbpppppppppppppbbA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "ApppphhhhhhhhhhppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "ApppppppccccpppppppA",
  "AAAAAAAAAAAAAAAAAAAA"
];

const PALACE_FEED_STUDIO_TILES = [
  "AAAAAAAAAAAAAAAAAA",
  "AbbbppppppppppbbbA",
  "ApppppppPpPppppppA",
  "AppppppppppppppppA",
  "ApphhhhhhhhhhhhppA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "ApppppppccpppppppA",
  "AAAAAAAAAAAAAAAAAA"
];

function districtArenaTiles(prop: string): string[] {
  return [
    "TTTTTTTTTTTTTTTTTT",
    "TT...ffffffff...TT",
    `TT...f===${prop}====f...TT`.slice(0, 18),
    "TT...ffff==ffff.TT",
    "TT.......==.....TT",
    "TT.......==.....TT",
    "TT...ffff==ffff.TT",
    "TT...f========f.TT",
    "TT...ffff==ffff.TT",
    "TT.......==.....TT",
    "TT.......==.....TT",
    "TTTTTTTTT==TTTTTTT"
  ];
}

export const ATTO3_MAPS: Record<string, MapDef> = {
  campo_largo: {
    id: "campo_largo",
    name: "CAMPO LARGO",
    tiles: CAMPO_LARGO_TILES,
    outdoor: true,
    allowWanderers: false,
    encounterRate: 0.10,
    encounters: [
      { speciesId: "salistrobo", weight: 65, minLv: 28, maxLv: 31 },
      { speciesId: "fratocorno", weight: 35, minLv: 28, maxLv: 31 }
    ],
    music: "campo_largo",
    warps: [
      { x: 17, y: 12, toMap: "retropalco_campo", toX: 7, toY: 8, facing: "up" },
      { x: 18, y: 12, toMap: "retropalco_campo", toX: 8, toY: 8, facing: "up" },
      {
        x: 10, y: 17, toMap: "capitale", toX: 14, toY: 8, facing: "down",
        confirm: "VUOI LASCIARE IL CAMPO LARGO? LA COALIZIONE RESTA SALVATA."
      },
      {
        x: 11, y: 17, toMap: "capitale", toX: 14, toY: 8, facing: "down",
        confirm: "VUOI LASCIARE IL CAMPO LARGO? LA COALIZIONE RESTA SALVATA."
      },
      {
        x: 20, y: 8, toMap: "futuro_piazza", toX: 9, toY: 12, facing: "up",
        requiresFlag: "future-chapter-unlocked",
        confirm: "VUOI RAGGIUNGERE FUTURO ANTERIORE?"
      }
    ],
    signs: [
      { x: 5, y: 5, lines: ["CAMPO LARGO.", "TRE GAZEBO, DUE POSTI E UN SOLO FOTOGRAFO."] },
      { x: 13, y: 5, lines: ["PALCO UNITARIO.", "LE OPINIONI RESTANO RIGOROSAMENTE SEPARATE."] },
      { x: 4, y: 14, lines: ["USCITA SICURA A SUD.", "NESSUNA SCELTA VIENE PERSA ABBANDONANDO L'AREA."] }
    ],
    pickups: [
      { id: "pk-campo-dossier", x: 20, y: 7, itemId: "schedona", qty: 1, hidden: true }
    ],
    decoratives: [
      { x: 8, y: 3, lines: ["PRIMO SEGNO PER LA FOTO.", "QUALCUNO HA GIÀ PRENOTATO IL CENTRO."] },
      { x: 9, y: 3, lines: ["SECONDO SEGNO PER LA FOTO.", "IL TERZO È IN COMMISSIONE."] },
      { x: 5, y: 11, lines: ["SEDIA DEL TAVOLO LARGO.", "IL TAVOLO, PER ORA, NON C'È."] }
    ],
    npcs: [
      {
        id: "campo-capo-campagna", pal: "aide", x: 10, y: 15, facing: "up",
        lines: ["TRE CANDIDATI. DUE POSTI IN FOTO.", "PARLA CON TUTTI, POI DECIDI IL PERIMETRO NEL RETROPALCO."]
      },
      {
        id: "campo-secretary", pal: "boss", x: 4, y: 7, facing: "right",
        lines: ["PORTO TERRITORIO.", "MA SE IL CAMPO CAMBIA DIREZIONE, IO RESTO FERMA."]
      },
      {
        id: "quantum-centrist", pal: "aide", x: 16, y: 7, facing: "left",
        lines: ["SONO AL CENTRO DI OGNI IPOTESI.", "SOPRATTUTTO DI QUELLE OPPOSTE."]
      },
      {
        id: "civic-mayor", pal: "granny", x: 4, y: 9, facing: "right",
        lines: ["NEL MIO COMUNE FUNZIONA TUTTO.", "IL COMUNE È QUESTO GAZEBO, MA È UN INIZIO."]
      },
      {
        id: "campo-fotografo", pal: "journalist", x: 10, y: 2, facing: "down",
        lines: ["FERMI TUTTI!", "PRIMA DELLA FOTO SERVE UN'IDEA ABBASTANZA LARGA DA ENTRARE NEL FRAME."]
      },
      {
        id: "campo-medico", pal: "professor", x: 19, y: 14, facing: "left", healer: true,
        lines: ["AMBULATORIO VOLONTARIO.", "CURO I POLITICMON. LE FRATTURE POLITICHE LE MANDA IL RETROPALCO."]
      },
      {
        id: "campo-tr-debate", pal: "journalist", x: 8, y: 7, facing: "right",
        trainerId: "campo-debate", sightRange: 2, showIfFlag: "campo-photo-choice-complete",
        lines: ["IL DIBATTITO È CHIUSO. LE REPLICHE, PURTROPPO, NO."]
      },
      {
        id: "campo-tr-claque", pal: "influencer", x: 12, y: 9, facing: "up",
        trainerId: "campo-claque", sightRange: 2, showIfFlag: "campo-photo-choice-complete",
        lines: ["LA CLAQUE HA FINITO I GETTONI."]
      }
    ]
  },
  retropalco_campo: {
    id: "retropalco_campo",
    name: "RETROPALCO DEL CAMPO",
    tiles: RETROPALCO_CAMPO_TILES,
    outdoor: false,
    music: "interior",
    warps: [
      { x: 7, y: 9, toMap: "campo_largo", toX: 17, toY: 13, facing: "down" },
      { x: 8, y: 9, toMap: "campo_largo", toX: 18, toY: 13, facing: "down" }
    ],
    signs: [
      { x: 2, y: 1, lines: ["ORDINE DEL GIORNO:", "1. STARE INSIEME. 2. DEFINIRE COSA SIGNIFICA."] },
      { x: 13, y: 1, lines: ["CARTELLINA RISERVATA.", "CONTENUTO: LA PREVIEW CHE TUTTI AVEVANO GIÀ LETTO."] }
    ],
    pickups: [],
    npcs: []
  },
  futuro_piazza: {
    id: "futuro_piazza",
    name: "FUTURO ANTERIORE",
    tiles: FUTURO_PLAZA_TILES,
    outdoor: true,
    allowWanderers: false,
    encounterRate: 0,
    encounters: [],
    music: "social_tension",
    warps: [
      { x: 10, y: 10, toMap: "futuro_sede", toX: 8, toY: 10, facing: "up" },
      { x: 11, y: 10, toMap: "futuro_sede", toX: 9, toY: 10, facing: "up" },
      { x: 10, y: 13, toMap: "campo_largo", toX: 20, toY: 9, facing: "down" },
      { x: 11, y: 13, toMap: "campo_largo", toX: 20, toY: 9, facing: "down" }
      ,{
        x: 2, y: 8, toMap: "diplomacy_lobby", toX: 9, toY: 10, facing: "up",
        requiresFlag: "futureResolved", confirm: "PARTI PER IL VERTICE TEMPTATION DIPLOMACY?"
      }
    ],
    signs: [
      { x: 5, y: 5, lines: ["FUTURO ANTERIORE.", "IL NOME DEFINITIVO SARÀ ANNUNCIATO DOMANI."] },
      { x: 15, y: 5, lines: ["CONVENTION APERTA.", "L'USCITA DAL VECCHIO PARTITO È RISERVATA AGLI ISCRITTI."] }
    ],
    pickups: [],
    npcs: [
      {
        id: "future-reception", pal: "aide", x: 9, y: 6, facing: "down",
        lines: ["RECEPTION: ecco il BADGE PROVVISORIO DEFINITIVO.", "ENTRA NELLA SEDE. IL FUTURO HA GIÀ CAMBIATO SALA."]
      },
      {
        id: "future-reporter", pal: "journalist", x: 4, y: 8, facing: "right",
        lines: ["È UNA SCISSIONE?", "NO: È UN AVANZAMENTO SEPARATO, MA IL TITOLO È PIÙ LUNGO."]
      },
      {
        id: "future-treasurer", pal: "aide", x: 16, y: 8, facing: "left",
        lines: ["TESORERIA DEL DOMANI.", "IL SALDO ARRIVA DOPODOMANI."]
      }
    ]
  },
  futuro_sede: {
    id: "futuro_sede",
    name: "SEDE DEL DOMANI",
    tiles: FUTURO_HQ_TILES,
    outdoor: false,
    music: "social_tension",
    warps: [
      { x: 8, y: 11, toMap: "futuro_piazza", toX: 10, toY: 11, facing: "down" },
      { x: 9, y: 11, toMap: "futuro_piazza", toX: 11, toY: 11, facing: "down" },
      { x: 3, y: 4, toMap: "futuro_scissione", toX: 4, toY: 5, facing: "up" },
      { x: 13, y: 4, toMap: "futuro_rebrand", toX: 4, toY: 5, facing: "up" },
      { x: 15, y: 4, toMap: "futuro_tesoreria", toX: 4, toY: 5, facing: "up" }
    ],
    signs: [
      { x: 2, y: 1, lines: ["MANIFESTO A:", "TRADIZIONE DEL FUTURO, EDIZIONE RIVEDUTA."] },
      { x: 15, y: 1, lines: ["MANIFESTO B:", "NOVITÀ DEL PASSATO, VERSIONE DEFINITIVA."] }
    ],
    pickups: [],
    npcs: [
      { id: "future-lever-a", pal: "aide", x: 4, y: 6, facing: "right", lines: [] },
      { id: "future-lever-b", pal: "aide", x: 14, y: 6, facing: "left", lines: [] },
      {
        id: "future-barrier", pal: "guard", x: 8, y: 5, facing: "down", hideIfFlag: "future-shortcut-open",
        lines: ["DUE MANIFESTI, DUE LEVE.", "FINCHÉ NON COINCIDONO, IL CENTRO RESTA CHIUSO."]
      },
      {
        id: "future-choice-desk", pal: "boss", x: 8, y: 3, facing: "down", showIfFlag: "future-shortcut-open",
        lines: []
      },
      {
        id: "future-boss", pal: "boss", x: 8, y: 1, facing: "down", trainerId: "futuro-anteriore",
        sightRange: 2, showIfFlag: "future-choice-complete",
        lines: ["DOMANI PRESENTEREMO IL NOME DEFINITIVO DI DOMANI."]
      }
    ]
  },
  futuro_scissione: {
    id: "futuro_scissione", name: "SALA SCISSIONE", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "futuro_sede", toX: 3, toY: 5, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["VERBALE DI SEPARAZIONE.", "MOTIVO: TROPPA UNITÀ NELLA STESSA DIREZIONE."] }], pickups: [],
    npcs: [{ id: "future-split-clerk", pal: "aide", x: 4, y: 3, facing: "down", lines: ["NON È UNA SCISSIONE.", "ABBIAMO SOLO SMESSO DI ESSERE INSIEME CONTEMPORANEAMENTE."] }]
  },
  futuro_rebrand: {
    id: "futuro_rebrand", name: "SALA REBRANDING", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "futuro_sede", toX: 13, toY: 5, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["BOZZA LOGO 47-B.", "COME IL PRECEDENTE, MA RIVOLTO VERSO DOMANI."] }], pickups: [],
    npcs: [{ id: "future-brand-clerk", pal: "influencer", x: 4, y: 3, facing: "down", lines: ["IL NOME È PROVVISORIO.", "IL FONT, INVECE, È GIÀ STATO RIELETTO ALL'UNANIMITÀ."] }]
  },
  futuro_tesoreria: {
    id: "futuro_tesoreria", name: "TESORERIA FUTURA", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "futuro_sede", toX: 15, toY: 5, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["BILANCIO PREVISIONALE.", "ENTRATE: DOMANI. USCITE: GIÀ OGGI."] }], pickups: [],
    npcs: [{ id: "future-money-clerk", pal: "aide", x: 4, y: 3, facing: "down", lines: ["LA CASSA È VUOTA, MA MOLTO MODERNA.", "ACCETTIAMO FINANZIAMENTI IN TEMPO FUTURO."] }]
  },
  diplomacy_lobby: {
    id: "diplomacy_lobby", name: "HOTEL DIPLOMATICO", tiles: DIPLOMACY_LOBBY_TILES,
    outdoor: false, music: "social_tension",
    warps: [
      { x: 8, y: 11, toMap: "futuro_piazza", toX: 3, toY: 8, facing: "right" },
      { x: 9, y: 11, toMap: "futuro_piazza", toX: 3, toY: 8, facing: "right" },
      { x: 3, y: 3, toMap: "diplomacy_loyalty", toX: 4, toY: 5, facing: "up" },
      { x: 16, y: 3, toMap: "diplomacy_autonomy", toX: 4, toY: 5, facing: "up" },
      { x: 3, y: 8, toMap: "diplomacy_home", toX: 4, toY: 5, facing: "up" },
      { x: 16, y: 8, toMap: "diplomacy_terrace", toX: 10, toY: 10, facing: "up", requiresFlag: "diplomacy-choice-complete" }
      ,{ x: 18, y: 10, toMap: "genova_techno", toX: 10, toY: 12, facing: "up", requiresFlag: "diplomacyComplete", confirm: "VAI AL SET GENOVA TECHNO?" }
      ,{ x: 1, y: 10, toMap: "tour_feed", toX: 11, toY: 12, facing: "up", requiresFlag: "diplomacyComplete", confirm: "INIZI IL TOUR DEI CINQUE COLLEGI?" }
    ],
    signs: [
      { x: 2, y: 1, lines: ["CHECK-IN DEL VERTICE.", "TRE PASS, UNA SOLA USCITA DIPLOMATICA."] },
      { x: 17, y: 1, lines: ["TERRAZZA-STUDIO.", "APRE DOPO UNA SCELTA DEFINITIVA."] }
    ], pickups: [],
    npcs: [{ id: "diplomacy-host", pal: "influencer", x: 9, y: 3, facing: "down", lines: ["UN SELFIE, TRE SOVRANITÀ.", "FEDELTÀ, AUTONOMIA O SHARE: SALVATENE UNA."] }]
  },
  diplomacy_loyalty: {
    id: "diplomacy_loyalty", name: "STANZA FEDELTÀ", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "diplomacy_lobby", toX: 3, toY: 4, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["PREVIEW FEDELTÀ:", "+800 FONDI BASE. RISCHIO LINEA ROSSA 12."] }], pickups: [],
    npcs: [{ id: "diplomacy-choice-loyalty", pal: "boss", x: 4, y: 3, facing: "down", lines: [] }]
  },
  diplomacy_autonomy: {
    id: "diplomacy_autonomy", name: "STANZA AUTONOMIA", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "diplomacy_lobby", toX: 16, toY: 4, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["PREVIEW AUTONOMIA:", "SE C'È UN TESO: -500 E TOKEN RIPARA. ALTRIMENTI +500 BASE."] }], pickups: [],
    npcs: [{ id: "diplomacy-choice-autonomy", pal: "aide", x: 4, y: 3, facing: "down", lines: [] }]
  },
  diplomacy_home: {
    id: "diplomacy_home", name: "STANZA CONSENSO", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "diplomacy_lobby", toX: 3, toY: 9, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["PREVIEW CONSENSO:", "+4 SONDAGGI. RISCHIO LINEA ROSSA 13."] }], pickups: [],
    npcs: [{ id: "diplomacy-choice-home", pal: "journalist", x: 4, y: 3, facing: "down", lines: [] }]
  },
  diplomacy_terrace: {
    id: "diplomacy_terrace", name: "TERRAZZA-STUDIO", tiles: DIPLOMACY_TERRACE_TILES,
    outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "election_night",
    warps: [{ x: 10, y: 11, toMap: "diplomacy_lobby", toX: 16, toY: 9, facing: "left" }, { x: 11, y: 11, toMap: "diplomacy_lobby", toX: 16, toY: 9, facing: "left" }],
    signs: [{ x: 4, y: 5, lines: ["LIVE INTERNAZIONALE.", "IL FILTRO È SOBRIO. LA DIPLOMAZIA MENO."] }], pickups: [],
    npcs: [
      { id: "partner-perfetto", pal: "boss", x: 10, y: 2, facing: "down", trainerId: "partner-perfetto", sightRange: 5, hideIfFlag: "diplomacyComplete", lines: [] },
      { id: "partner-after", pal: "boss", x: 10, y: 4, facing: "down", showIfFlag: "diplomacyComplete", lines: ["LA DIPLOMAZIA RESISTE.", "LA CLIP È GIÀ VIRALE. IL TOUR DEL FEED È APERTO."] }
    ]
  },
  genova_techno: {
    id: "genova_techno", name: "GENOVA TECHNO", tiles: GENOVA_TECHNO_TILES,
    outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "social_tension",
    warps: [
      { x: 10, y: 13, toMap: "diplomacy_lobby", toX: 17, toY: 10, facing: "left" },
      { x: 11, y: 13, toMap: "diplomacy_lobby", toX: 17, toY: 10, facing: "left" }
    ],
    signs: [
      { x: 4, y: 5, lines: ["VAN STAMPA MOBILE.", "IL COMUNICATO ARRIVA PRIMA DEL RITORNELLO."] },
      { x: 16, y: 5, lines: ["MAXISCHERMO DEL BEAT.", "SE RIDUCI GLI EFFETTI, IL TEMPO ASPETTA."] }
    ], pickups: [],
    npcs: [
      { id: "genova-dj", pal: "influencer", x: 10, y: 4, facing: "down", lines: [] },
      { id: "genova-stagehand", pal: "aide", x: 5, y: 8, facing: "right", lines: ["SE SBAGLI, LO CHIAMIAMO REMIX.", "LA STORIA CONTINUA COMUNQUE."] }
    ]
  },
  tour_feed: {
    id: "tour_feed", name: "TOUR DEL FEED", tiles: TOUR_FEED_TILES,
    outdoor: false, music: "election_night",
    warps: [
      { x: 10, y: 13, toMap: "diplomacy_lobby", toX: 2, toY: 10, facing: "right" },
      { x: 11, y: 13, toMap: "diplomacy_lobby", toX: 2, toY: 10, facing: "right" },
      { x: 4, y: 3, toMap: "district_nord", toX: 9, toY: 10, facing: "up" },
      { x: 9, y: 3, toMap: "district_centro", toX: 9, toY: 10, facing: "up" },
      { x: 14, y: 3, toMap: "district_sud", toX: 9, toY: 10, facing: "up" },
      { x: 19, y: 3, toMap: "district_isole", toX: 9, toY: 10, facing: "up" },
      { x: 19, y: 8, toMap: "district_feed", toX: 9, toY: 10, facing: "up" },
      { x: 11, y: 1, toMap: "palazzo_feed", toX: 9, toY: 8, facing: "up", requiresFlag: "tourComplete", lockedLines: ["PALAZZO DEI FEED CHIUSO.", "SERVONO I CINQUE DOSSIER COMPLETI."] }
    ],
    signs: [
      { x: 2, y: 1, lines: ["TOUR DEL FEED.", "CINQUE COLLEGI, DUE AZIONI CIASCUNO, UNA SOLA MEMORIA."] },
      { x: 21, y: 1, lines: ["DOSSIER ELETTORALI.", "VERDI QUANDO IL COLLEGIO HA DUE AZIONI COMPLETE."] },
      { x: 4, y: 2, lines: ["NORD PRODUTTIVO", "INGRESSO AL COLLEGIO INDUSTRIALE."] },
      { x: 9, y: 2, lines: ["CENTRO DEI SALOTTI", "INGRESSO AL COLLEGIO TELEVISIVO."] },
      { x: 14, y: 2, lines: ["SUD DELLE PROMESSE", "INGRESSO AL CANTIERE ELETTORALE."] },
      { x: 19, y: 2, lines: ["ISOLE DEL PONTE", "INGRESSO AL PLASTICO DEFINITIVO."] },
      { x: 19, y: 7, lines: ["CAPITALE DEI FEED", "INGRESSO AL COLLEGIO ALGORITMICO."] }
    ], pickups: [],
    npcs: [{ id: "tour-coordinator", pal: "aide", x: 11, y: 7, facing: "down", lines: ["SCEGLI L'ORDINE.", "OGNI COLLEGIO CHIUDE DOPO DUE AZIONI SU TRE."] }]
  },
  district_nord: {
    id: "district_nord", name: "NORD PRODUTTIVO", tiles: districtArenaTiles("2"), outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "campo_largo",
    warps: [{ x: 9, y: 11, toMap: "tour_feed", toX: 4, toY: 4, facing: "down" }, { x: 10, y: 11, toMap: "tour_feed", toX: 4, toY: 4, facing: "down" }],
    signs: [{ x: 4, y: 5, lines: ["CAPANNONE DEL TAVOLO.", "PRODUCE RIUNIONI A CICLO CONTINUO."] }], pickups: [{ id: "secret-nord", x: 15, y: 8, itemId: "caffe", qty: 2, hidden: true }],
    npcs: [{ id: "district-kiosk-nord", pal: "aide", x: 10, y: 2, facing: "down", lines: [] }]
  },
  district_centro: {
    id: "district_centro", name: "CENTRO DEI SALOTTI", tiles: districtArenaTiles("6"), outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "mediopoli",
    warps: [{ x: 9, y: 11, toMap: "tour_feed", toX: 9, toY: 4, facing: "down" }, { x: 10, y: 11, toMap: "tour_feed", toX: 9, toY: 4, facing: "down" }],
    signs: [{ x: 4, y: 5, lines: ["SALOTTO A FERRO DI CAVALLO.", "LE OPINIONI GIRANO, IL TAVOLO RESTA."] }], pickups: [{ id: "secret-centro", x: 15, y: 8, itemId: "maalox", qty: 2, hidden: true }],
    npcs: [{ id: "district-kiosk-centro", pal: "journalist", x: 10, y: 2, facing: "down", lines: [] }]
  },
  district_sud: {
    id: "district_sud", name: "SUD DELLE PROMESSE", tiles: districtArenaTiles("5"), outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "stretto",
    warps: [{ x: 9, y: 11, toMap: "tour_feed", toX: 14, toY: 4, facing: "down" }, { x: 10, y: 11, toMap: "tour_feed", toX: 14, toY: 4, facing: "down" }],
    signs: [{ x: 4, y: 5, lines: ["CANTIERE DELLA PRIMA PIETRA.", "IL NASTRO È FINITO PRIMA DELL'OPERA."] }], pickups: [{ id: "secret-sud", x: 15, y: 8, itemId: "schedona", qty: 1, hidden: true }],
    npcs: [{ id: "district-kiosk-sud", pal: "boss", x: 10, y: 2, facing: "down", lines: [] }]
  },
  district_isole: {
    id: "district_isole", name: "ISOLE DEL PONTE", tiles: districtArenaTiles("8"), outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "stretto",
    warps: [{ x: 9, y: 11, toMap: "tour_feed", toX: 19, toY: 4, facing: "down" }, { x: 10, y: 11, toMap: "tour_feed", toX: 19, toY: 4, facing: "down" }],
    signs: [{ x: 4, y: 5, lines: ["PLASTICO DEL PONTE.", "ATTRAVERSAMENTO PERFETTO, IN SCALA UNO A CENTO."] }], pickups: [{ id: "secret-isole", x: 15, y: 8, itemId: "spritz", qty: 2, hidden: true }],
    npcs: [{ id: "district-kiosk-isole", pal: "aide", x: 10, y: 2, facing: "down", lines: [] }]
  },
  district_feed: {
    id: "district_feed", name: "CAPITALE DEI FEED", tiles: districtArenaTiles("6"), outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "social_tension",
    warps: [{ x: 9, y: 11, toMap: "tour_feed", toX: 19, toY: 9, facing: "down" }, { x: 10, y: 11, toMap: "tour_feed", toX: 19, toY: 9, facing: "down" }],
    signs: [{ x: 4, y: 5, lines: ["PALAZZO DEL TREND.", "IL FACT-CHECK ARRIVA DOPO LA SPONSORIZZAZIONE."] }], pickups: [{ id: "secret-feed", x: 15, y: 8, itemId: "dirWhatever", qty: 1, hidden: true }],
    npcs: [{ id: "district-kiosk-feed", pal: "influencer", x: 10, y: 2, facing: "down", lines: [] }]
  },
  palazzo_feed: {
    id: "palazzo_feed", name: "PALAZZO DEI FEED", tiles: PALACE_FEED_LOBBY_TILES,
    outdoor: false, music: "election_night",
    warps: [
      { x: 8, y: 9, toMap: "tour_feed", toX: 11, toY: 12, facing: "up" },
      { x: 9, y: 9, toMap: "tour_feed", toX: 11, toY: 12, facing: "up" },
      { x: 5, y: 2, toMap: "palazzo_algoritmo", toX: 4, toY: 5, facing: "up" },
      { x: 14, y: 2, toMap: "palazzo_factcheck", toX: 4, toY: 5, facing: "up" },
      { x: 5, y: 6, toMap: "palazzo_talkshow", toX: 4, toY: 5, facing: "up" },
      { x: 14, y: 6, toMap: "palazzo_silenzio", toX: 4, toY: 5, facing: "up" },
      { x: 9, y: 1, toMap: "palazzo_feed_studio", toX: 8, toY: 6, facing: "up", requiresFlag: "palaceRoomsComplete", lockedLines: ["LO STUDIO È CHIUSO.", "ARCHIVIA ALGORITMO, FACT-CHECK, TALK SHOW E SILENZIO STAMPA."] }
    ],
    signs: [
      { x: 2, y: 1, lines: ["PALAZZO DEI FEED.", "QUATTRO ARCHIVI. NESSUN NUOVO REGOLAMENTO."] },
      { x: 17, y: 1, lines: ["STUDIO ELETTORALE.", "APRE QUANDO I QUATTRO MODULI SONO COMPLETI."] }
    ], pickups: [],
    npcs: [{ id: "palace-reception", pal: "journalist", x: 9, y: 5, facing: "down", lines: [] }]
  },
  palazzo_algoritmo: {
    id: "palazzo_algoritmo", name: "ARCHIVIO ALGORITMO", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "social_tension", warps: [{ x: 4, y: 6, toMap: "palazzo_feed", toX: 5, toY: 3, facing: "down" }], signs: [], pickups: [],
    npcs: [
      { id: "palace-algorithm-a", pal: "influencer", x: 2, y: 3, facing: "down", lines: [] },
      { id: "palace-algorithm-b", pal: "journalist", x: 7, y: 3, facing: "down", lines: [] }
    ]
  },
  palazzo_factcheck: {
    id: "palazzo_factcheck", name: "ARCHIVIO FACT-CHECK", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "mediopoli", warps: [{ x: 4, y: 6, toMap: "palazzo_feed", toX: 14, toY: 3, facing: "down" }], signs: [], pickups: [],
    npcs: [
      { id: "palace-factcheck-a", pal: "aide", x: 2, y: 3, facing: "down", lines: [] },
      { id: "palace-factcheck-b", pal: "journalist", x: 7, y: 3, facing: "down", lines: [] }
    ]
  },
  palazzo_talkshow: {
    id: "palazzo_talkshow", name: "ARCHIVIO TALK SHOW", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "battle_trainer", warps: [{ x: 4, y: 6, toMap: "palazzo_feed", toX: 5, toY: 7, facing: "down" }], signs: [], pickups: [],
    npcs: [
      { id: "palace-talkshow-a", pal: "journalist", x: 2, y: 3, facing: "down", lines: [] },
      { id: "palace-talkshow-b", pal: "boss", x: 7, y: 3, facing: "down", lines: [] }
    ]
  },
  palazzo_silenzio: {
    id: "palazzo_silenzio", name: "SILENZIO STAMPA", tiles: FUTURO_SIDE_ROOM_TILES,
    outdoor: false, music: "futuro_anteriore", warps: [{ x: 4, y: 6, toMap: "palazzo_feed", toX: 14, toY: 7, facing: "down" }], signs: [], pickups: [],
    npcs: [
      { id: "palace-silence-a", pal: "aide", x: 2, y: 3, facing: "down", lines: [] },
      { id: "palace-silence-b", pal: "aide", x: 7, y: 3, facing: "down", lines: [] }
    ]
  },
  palazzo_feed_studio: {
    id: "palazzo_feed_studio", name: "STUDIO ELETTORALE", tiles: PALACE_FEED_STUDIO_TILES,
    outdoor: false, music: "election_night", warps: [{ x: 8, y: 7, toMap: "palazzo_feed", toX: 9, toY: 2, facing: "down" }],
    signs: [{ x: 2, y: 1, lines: ["STUDIO ELETTORALE.", "IL SALVATAGGIO PRIMA DEL DIRETTO È OBBLIGATORIO."] }], pickups: [],
    npcs: [{ id: "palace-election-desk", pal: "boss", x: 7, y: 2, facing: "down", lines: [] }]
  },
  palazzo_feed_terrazza: {
    id: "palazzo_feed_terrazza", name: "TERRAZZA DEL DOPO", tiles: DIPLOMACY_TERRACE_TILES,
    outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "election_night",
    warps: [
      { x: 10, y: 11, toMap: "palazzo_feed", toX: 9, toY: 2, facing: "down" },
      { x: 11, y: 11, toMap: "palazzo_feed", toX: 9, toY: 2, facing: "down" }
    ],
    signs: [{ x: 4, y: 5, lines: ["TERRAZZA DEL DOPO.", "IL RISULTATO È DEFINITIVO. IL MONDO, FORTUNATAMENTE, RESTA VISITABILE."] }],
    pickups: [],
    npcs: [
      { id: "atto3-postgame-host", pal: "journalist", x: 10, y: 2, facing: "down", lines: ["LA DIRETTA È FINITA.", "IL POST-GAME NO: TORNEI, DEX, QUEST E ONLINE RESTANO APERTI."] },
      { id: "weekly-campaign-host", pal: "influencer", x: 6, y: 5, facing: "right", lines: [] }
    ]
  }
};
