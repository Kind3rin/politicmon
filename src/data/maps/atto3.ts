import type { MapDef } from "./types";
import { CAMPO_VOICES } from "../campo";

const CAMPO_LARGO_TILES = [
  "TTTTTTTTTTTTTTTTTTTTTTTT",
  "TT...ffffffffff.......TT",
  "TT...f========f.......TT",
  "TT...f=====1==f.......TT",
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
  "ApppptpppptppppA",
  "AppppppppppppppA",
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
  "TT....ffff==ffff~~TT",
  "TT........==......TT",
  "TT..3.....==....3.TT",
  "TT........==......TT",
  "TT....fvvvvvvvvf..TT",
  "TT.7..fvvvvvvvvf..TT",
  "TT....fmmmddmmmf..TT",
  "TT....ffff==ffff~~TT",
  "TT........==....~~TT",
  "TTTTTTTTTT==TTTTTTTT"
];

const FUTURO_HQ_TILES = [
  "AAAAAAAAAAAAAAAAAA",
  "AbbbpppppppppppbbA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "App4ppppppppp5pppA",
  "AppPpppppppppppPpA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "AppppppppppppppppA",
  "ApppppppccpppppppA",
  "AAAAAAAAAAAAAAAAAA"
];

const PALACE_ARCHIVE_TILES = [
  "AAAAAAAAAA",
  "AbppppppbA",
  "AppppppppA",
  "AppPppPppA",
  "AppppppppA",
  "AppppppppA",
  "ApppccpppA",
  "AAAAAAAAAA",
];

const FUTURO_SPLIT_TILES = [
  "AAAAAAAAAA",
  "AbbbpppppA",
  "AppppppppA",
  "Apppppp6pA",
  "AppppppppA",
  "AbppppppbA",
  "ApppccpppA",
  "AAAAAAAAAA",
];

const FUTURO_BRAND_TILES = [
  "AAAAAAAAAA",
  "AppppppppA",
  "AppPpppppA",
  "Apppppp6pA",
  "AppppppppA",
  "AppppPpppA",
  "ApppccpppA",
  "AAAAAAAAAA",
];

const FUTURO_MONEY_TILES = [
  "AAAAAAAAAA",
  "AbbppppbbA",
  "AppppppppA",
  "Apppppp6pA",
  "AppppppppA",
  "AppPpppppA",
  "ApppccpppA",
  "AAAAAAAAAA",
];

const DIPLOMACY_LOBBY_TILES = [
  "AAAAAAAAAAAAAAAAAAAA",
  "AbbppppppppppppppbbA",
  "AppppppppppppppppppA",
  "AppcppppppppppppcppA",
  "Apppppppp4pppppppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "AppppppppppppppppppA",
  "AppcppppppppppppcppA",
  "Ap7pppppppppppppp7pA",
  "AppppppppppppppppppA",
  "ApppppppccpppppppppA",
  "AAAAAAAAAAAAAAAAAAAA"
];

const DIPLOMACY_LOYALTY_TILES = [
  "AAAAAAAAAA",
  "AbbppppppA",
  "AppppppppA",
  "Apppppp6pA",
  "AppppppppA",
  "AbpppppppA",
  "ApppccpppA",
  "AAAAAAAAAA"
];

const DIPLOMACY_AUTONOMY_TILES = [
  "AAAAAAAAAA",
  "AppppppppA",
  "ApPppppppA",
  "Apppppp6pA",
  "AppppppppA",
  "AppppppPpA",
  "ApppccpppA",
  "AAAAAAAAAA"
];

const DIPLOMACY_HOME_TILES = [
  "AAAAAAAAAA",
  "AbpppppppA",
  "AppppppppA",
  "Apppppp6pA",
  "AppppppppA",
  "ApPppppppA",
  "ApppccpppA",
  "AAAAAAAAAA"
];

const DIPLOMACY_TERRACE_TILES = [
  "TTTTTTTTTTTTTTTTTTTT",
  "TT........==......TT",
  "TT........==......TT",
  "TT........1=......TT",
  "TT........==......TT",
  "TT..6.....==......TT",
  "TT........==......TT",
  "TTvvvvvvvv==......TT",
  "TTvvvvvvvv==......TT",
  "TTmmmddmmm==......TT",
  "TT...=======......TT",
  "TTTTTTTTTT==TTTTTTTT"
];

const GENOVA_TECHNO_TILES = [
  "~~~~~~~~~~~~~~~~~~~~",
  "~....fffffffffff...~",
  "~.........1=.......~",
  "~.....3...==..3....~",
  "~.........==.......~",
  "~.........==.......~",
  "~.........==....6..~",
  "~...ffff=====ffff..~",
  "~..7......==.......~",
  "~.........==.......~",
  "~.........==.......~",
  "~.........==.......~",
  "~.........==.......~",
  "~~~~~~~~~~==~~~~~~~~"
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
    tileOverrides: { "=": "tiles/campo_path.png" },
    buildingOverrides: { v: "tiles/campo_backstage.png" },
    objectOverrides: { "1": "tiles/campo_stage.png", "2": "tiles/campo_gazebo.png", "3": "tiles/campo_poster.png", "6": "tiles/campo_camera.png" },
    outdoor: true,
    allowWanderers: false,
    encounterRate: 0.10,
    encounters: [
      { speciesId: "salistrobo", weight: 65, minLv: 43, maxLv: 46 },
      { speciesId: "fratocorno", weight: 35, minLv: 43, maxLv: 46 }
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
      { x: 5, y: 5, lines: ["CAMPO LARGO.", "TRE CANDIDATI, DUE POSTI. IL PROGRAMMA NON HA IL PASS."] },
      { x: 13, y: 5, lines: ["PALCO UNITARIO.", "LE OPINIONI RESTANO RIGOROSAMENTE SEPARATE."] },
      { x: 4, y: 14, lines: ["USCITA SICURA A SUD.", "NESSUNA SCELTA VIENE PERSA ABBANDONANDO L'AREA."] },
      { x: 16, y: 15, lines: ["RECLUTAMENTO TRA LE QUINTE: LV 43-46.", "IL CIRCOLO NEL RETROPALCO LIBERA UN POSTO. IL MEDICO RECUPERA PV E PP."] }
    ],
    pickups: [
      { id: "pk-campo-dossier", x: 20, y: 7, itemId: "schedona", qty: 1, hidden: true }
    ],
    decoratives: [
      { x: 8, y: 3, lines: ["PRIMO SEGNO PER LA FOTO.", "QUALCUNO HA GIÀ PRENOTATO IL CENTRO."] },
      { x: 9, y: 3, lines: ["SECONDO SEGNO PER LA FOTO.", "IL TERZO POSTO È RISERVATO AL DISACCORDO."] },
      { x: 5, y: 11, lines: ["SEDIA DEL TAVOLO LARGO.", "IL TAVOLO, PER ORA, NON C'È."] }
    ],
    npcs: [
      {
        id: "campo-capo-campagna", pal: "aide", wander: false, x: 10, y: 15, facing: "up",
        lines: ["TRE CANDIDATI. DUE POSTI IN FOTO.", "LE CARTE DEI CANDIDATI COMPONGONO IL PATTO. IL RETROPALCO GESTISCE LA SQUADRA; IL FOTOGRAFO MOSTRA IL COSTO DELLA CORNICE."]
      },
      {
        id: "campo-secretary", pal: "boss", spriteSet: "campo-secretary", wander: false, x: 4, y: 7, facing: "right",
        lines: CAMPO_VOICES.campo_secretary
      },
      {
        id: "quantum-centrist", pal: "aide", spriteSet: "quantum-centrist", wander: false, x: 16, y: 7, facing: "left",
        lines: CAMPO_VOICES.quantum_centrist
      },
      {
        id: "civic-mayor", pal: "granny", spriteSet: "civic-mayor", wander: false, x: 4, y: 9, facing: "right",
        lines: CAMPO_VOICES.civic_mayor
      },
      {
        id: "campo-fotografo", pal: "journalist", spriteSet: "campo-photographer", wander: false, x: 10, y: 2, facing: "down",
        lines: ["FERMI TUTTI!", "PRIMA DELLA FOTO SERVE UN'IDEA ABBASTANZA LARGA DA ENTRARE NEL FRAME."]
      },
      {
        id: "campo-medico", pal: "professor", x: 19, y: 14, facing: "left", healer: true,
        lines: ["AMBULATORIO VOLONTARIO.", "CURO I POLITICMON. LE FRATTURE POLITICHE LE MANDA IL RETROPALCO."]
      },
      {
        id: "campo-tr-debate", pal: "journalist", x: 8, y: 7, facing: "right",
        trainerId: "campo-debate", showIfFlag: "campo-photo-choice-complete",
        lines: ["IL DIBATTITO È CHIUSO. LE REPLICHE, PURTROPPO, NO."]
      },
      {
        id: "campo-tr-claque", pal: "influencer", x: 12, y: 9, facing: "up",
        trainerId: "campo-claque", showIfFlag: "campo-photo-choice-complete",
        lines: ["LA CLAQUE HA FINITO I GETTONI."]
      }
    ]
  },
  retropalco_campo: {
    id: "retropalco_campo",
    name: "RETROPALCO DEL CAMPO",
    tiles: RETROPALCO_CAMPO_TILES,
    tileOverrides: { p: "tiles/campo_floor.png", A: "tiles/campo_wall.png" },
    objectOverrides: { t: "tiles/campo_table.png" },
    outdoor: false,
    music: "interior",
    warps: [
      { x: 7, y: 9, toMap: "campo_largo", toX: 17, toY: 13, facing: "down" },
      { x: 8, y: 9, toMap: "campo_largo", toX: 18, toY: 13, facing: "down" }
    ],
    signs: [
      { x: 2, y: 1, lines: ["ORDINE DEL GIORNO:", "IL METRO MISURA LA CORNICE. PER LE DISTANZE POLITICHE SERVE IL DOSSIER."] },
      { x: 13, y: 1, lines: ["CARTELLINA RISERVATA.", "IL PROGRAMMA È QUI. NELLA FOTO OCCUPAVA IL POSTO DI UN LOGO."] }
    ],
    pickups: [],
    npcs: [{ id: "campo-circolo", pal: "professor", x: 8, y: 5, facing: "up", wander: false, box: true }]
  },
  futuro_piazza: {
    id: "futuro_piazza",
    name: "FUTURO ANTERIORE",
    tiles: FUTURO_PLAZA_TILES,
    tileOverrides: { "=": "tiles/future_path.png" },
    buildingOverrides: { v: "tiles/future_hq.png" },
    objectOverrides: { "1": "tiles/future_stage.png", "7": "tiles/future_navetta.png" },
    outdoor: true,
    allowWanderers: false,
    encounterRate: 0.14,
    encounters: [{ speciesId: "vannaccix", weight: 100, minLv: 43, maxLv: 46, requiresFlag: "futureResolved", anyVersion: true }],
    music: "social_tension",
    warps: [
      { x: 10, y: 10, toMap: "futuro_sede", toX: 8, toY: 10, facing: "up" },
      { x: 11, y: 10, toMap: "futuro_sede", toX: 9, toY: 10, facing: "up" },
      { x: 10, y: 13, toMap: "campo_largo", toX: 20, toY: 9, facing: "down" },
      { x: 11, y: 13, toMap: "campo_largo", toX: 20, toY: 9, facing: "down" }
      ,{
        x: 2, y: 8, toMap: "diplomacy_lobby", toX: 9, toY: 10, facing: "up",
        requiresFlag: "futureResolved", markerLabel: "VERTICE", lockedLines: ["NAVETTA SOSPESA.", "LEGGI LE DUE SALE, AZIONA LE LEVE E REGISTRA UNA SCELTA. POI SFIDA IL SEGRETARIO DAL SUO DOSSIER."], confirm: "PARTI PER IL VERTICE TEMPTATION DIPLOMACY?"
      }
    ],
    signs: [
      { x: 5, y: 5, lines: ["FUTURO ANTERIORE.", "IL NOME DEFINITIVO SARÀ ANNUNCIATO DOMANI."] },
      { x: 15, y: 12, lines: ["VIVAIO DELLE CORRENTI: APRE DOPO IL SEGRETARIO.", "RECLUTA VANNACCIX, USA SUBITO TESSERA FUTURO. IL CIRCOLO AL CAMPO LIBERA UN POSTO."] },
      { x: 15, y: 5, lines: ["CONVENTION APERTA.", "L'USCITA DAL VECCHIO PARTITO È RISERVATA AGLI ISCRITTI."] }
    ],
    pickups: [],
    npcs: [
      {
        id: "future-reception", spriteSet: "future-reception", wander: false, pal: "aide", x: 9, y: 6, facing: "down",
        lines: []
      },
      {
        id: "future-reporter", spriteSet: "future-reporter", wander: false, pal: "journalist", x: 4, y: 8, facing: "right",
        lines: ["HO CHIESTO COSA CAMBIA. MI HANNO MANDATO DUE LOGHI E UN PREVENTIVO.", "DALLA PIAZZA PUOI TORNARE AL MEDICO DEL CAMPO. I PP NON SI RIGENERANO CAMBIANDO CORRENTE."]
      },
      {
        id: "future-treasurer", spriteSet: "future-treasurer", wander: false, pal: "aide", x: 16, y: 8, facing: "left",
        lines: []
      }
    ]
  },
  futuro_sede: {
    id: "futuro_sede",
    name: "SEDE DEL DOMANI",
    tiles: FUTURO_HQ_TILES,
    tileOverrides: { p: "tiles/future_floor.png", A: "tiles/future_wall.png" },
    objectOverrides: { "4": "tiles/future_lever_a.png", "5": "tiles/future_lever_b.png" },
    objectSizes: { "5": 32 },
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
      { x: 2, y: 1, lines: ["PORTA SCISSIONE A SINISTRA.", "IL VERBALE PRECEDE LA LEVA DI SINISTRA."] },
      { x: 15, y: 1, lines: ["REBRANDING A DESTRA, TESORERIA IN FONDO.", "LEGGI IL PROGETTO, POI LA LEVA DI DESTRA. I CONTI NON CAMBIANO FONT."] }
    ],
    pickups: [],
    npcs: [
      { id: "future-lever-a", spriteSet: "future-split", wander: false, pal: "aide", x: 4, y: 6, facing: "right", lines: [] },
      { id: "future-lever-b", spriteSet: "future-brand", wander: false, pal: "aide", x: 14, y: 6, facing: "left", lines: [] },
      {
        id: "future-barrier", spriteSet: "future-guard", wander: false, pal: "guard", x: 8, y: 5, facing: "down", hideIfFlag: "future-shortcut-open",
        lines: ["DUE MANIFESTI, DUE LEVE.", "LEGGI SCISSIONE E REBRANDING, POI AZIONA LE LEVE. IL TAVOLO CENTRALE APRIRÀ."]
      },
      {
        id: "future-choice-desk", spriteSet: "future-secretary", wander: false, pal: "boss", x: 8, y: 3, facing: "down", showIfFlag: "future-shortcut-open",
        lines: []
      },
      {
        id: "future-boss", spriteSet: "future-secretary", wander: false, pal: "boss", x: 8, y: 1, facing: "down", trainerId: "futuro-anteriore",
        showIfFlag: "future-choice-complete",
        lines: ["IL FUTURO HA VINTO. IL RIMBORSO CHIEDE ANCORA LA RICEVUTA."]
      }
    ]
  },
  futuro_scissione: {
    id: "futuro_scissione", name: "SALA SCISSIONE", tiles: FUTURO_SPLIT_TILES,
    tileOverrides: { p: "tiles/future_split_floor.png", A: "tiles/future_wall.png" },
    objectOverrides: { "6": "tiles/future_split_desk.png" },
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "futuro_sede", toX: 3, toY: 5, facing: "down" }, { x: 5, y: 6, toMap: "futuro_sede", toX: 3, toY: 5, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["VERBALE DI SEPARAZIONE.", "MOTIVO: TROPPA UNITÀ NELLA STESSA DIREZIONE."] }], pickups: [],
    npcs: [{ id: "future-split-clerk", spriteSet: "future-split", wander: false, pal: "aide", x: 4, y: 3, facing: "down", lines: [] }]
  },
  futuro_rebrand: {
    id: "futuro_rebrand", name: "SALA REBRANDING", tiles: FUTURO_BRAND_TILES,
    tileOverrides: { p: "tiles/future_brand_floor.png", A: "tiles/future_wall.png" },
    objectOverrides: { "6": "tiles/future_brand_desk.png" },
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "futuro_sede", toX: 13, toY: 5, facing: "down" }, { x: 5, y: 6, toMap: "futuro_sede", toX: 13, toY: 5, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["BOZZA LOGO 47-B.", "COME IL PRECEDENTE, MA RIVOLTO VERSO DOMANI."] }], pickups: [],
    npcs: [{ id: "future-brand-clerk", spriteSet: "future-brand", wander: false, pal: "influencer", x: 4, y: 3, facing: "down", lines: [] }]
  },
  futuro_tesoreria: {
    id: "futuro_tesoreria", name: "TESORERIA FUTURA", tiles: FUTURO_MONEY_TILES,
    tileOverrides: { p: "tiles/future_money_floor.png", A: "tiles/future_wall.png" },
    objectOverrides: { "6": "tiles/future_money_desk.png" },
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "futuro_sede", toX: 15, toY: 5, facing: "down" }, { x: 5, y: 6, toMap: "futuro_sede", toX: 15, toY: 5, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["BILANCIO PREVISIONALE.", "ENTRATE: DOMANI. USCITE: GIÀ OGGI."] }], pickups: [],
    npcs: [{ id: "future-money-clerk", spriteSet: "future-treasurer", wander: false, pal: "aide", x: 4, y: 3, facing: "down", lines: [] }]
  },
  diplomacy_lobby: {
    id: "diplomacy_lobby", name: "HOTEL DIPLOMATICO", tiles: DIPLOMACY_LOBBY_TILES,
    tileOverrides: { p: "tiles/diplomacy_floor.png", A: "tiles/diplomacy_wall.png" },
    objectOverrides: { "4": "tiles/diplomacy_reception.png", "7": "tiles/diplomacy_navetta.png" }, objectSizes: { "4": 48 },
    outdoor: false, music: "social_tension",
    warps: [
      { x: 8, y: 11, toMap: "futuro_piazza", toX: 3, toY: 8, facing: "right" },
      { x: 9, y: 11, toMap: "futuro_piazza", toX: 3, toY: 8, facing: "right" },
      { x: 3, y: 3, toMap: "diplomacy_loyalty", toX: 4, toY: 5, facing: "up" },
      { x: 16, y: 3, toMap: "diplomacy_autonomy", toX: 4, toY: 5, facing: "up" },
      { x: 3, y: 8, toMap: "diplomacy_home", toX: 4, toY: 5, facing: "up" },
      { x: 16, y: 8, toMap: "diplomacy_terrace", toX: 5, toY: 10, facing: "right", requiresFlag: "diplomacy-choice-complete", markerLabel: "PARTNER", lockedLines: ["PRIMA FIRMA UNA SCELTA NELLE SUITE. B RINVIA."] }
      ,{ x: 18, y: 10, toMap: "genova_techno", toX: 10, toY: 12, facing: "up", requiresFlag: "diplomacyComplete", markerLabel: "GENOVA", lockedLines: ["GENOVA APRE DOPO IL PARTNER."], confirm: "VAI AL SET GENOVA TECHNO?" }
      ,{ x: 1, y: 10, toMap: "tour_feed", toX: 11, toY: 12, facing: "up", requiresFlag: "diplomacyComplete", markerLabel: "TOUR", lockedLines: ["IL TOUR APRE DOPO IL PARTNER."], confirm: "INIZI IL TOUR DEI CINQUE COLLEGI?" }
    ],
    signs: [
      { x: 2, y: 1, lines: ["CHECK-IN DEL VERTICE.", "TRE PASS, UNA SOLA USCITA DIPLOMATICA."] },
      { x: 17, y: 1, lines: ["TERRAZZA-STUDIO.", "APRE DOPO UNA SCELTA DEFINITIVA."] }
    ], pickups: [],
    npcs: [{ id: "diplomacy-host", spriteSet: "diplomacy-host", wander: false, pal: "influencer", x: 9, y: 3, facing: "down", lines: [] }]
  },
  diplomacy_loyalty: {
    id: "diplomacy_loyalty", name: "STANZA FEDELTÀ", tiles: DIPLOMACY_LOYALTY_TILES,
    tileOverrides: { p: "tiles/diplomacy_loyalty_floor.png", A: "tiles/diplomacy_wall.png" },
    objectOverrides: { "6": "tiles/diplomacy_loyalty.png" },
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "diplomacy_lobby", toX: 3, toY: 4, facing: "down" }, { x: 5, y: 6, toMap: "diplomacy_lobby", toX: 3, toY: 4, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["FEDELTÀ:", "+800€ BASE. RISCHIO PER SEGRETARIO E SINDACO."] }], pickups: [],
    npcs: [{ id: "diplomacy-choice-loyalty", spriteSet: "diplomacy-loyalist", wander: false, pal: "boss", x: 4, y: 3, facing: "down", lines: [] }]
  },
  diplomacy_autonomy: {
    id: "diplomacy_autonomy", name: "STANZA AUTONOMIA", tiles: DIPLOMACY_AUTONOMY_TILES,
    tileOverrides: { p: "tiles/diplomacy_autonomy_floor.png", A: "tiles/diplomacy_wall.png" },
    objectOverrides: { "6": "tiles/diplomacy_autonomy.png" },
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "diplomacy_lobby", toX: 16, toY: 4, facing: "down" }, { x: 5, y: 6, toMap: "diplomacy_lobby", toX: 16, toY: 4, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["AUTONOMIA:", "-500€ RIPARA UN PATTO TESO. ALTRIMENTI +500€ BASE. IL DOSSIER CALCOLA I BONUS."] }], pickups: [],
    npcs: [{ id: "diplomacy-choice-autonomy", spriteSet: "diplomacy-mediator", wander: false, pal: "aide", x: 4, y: 3, facing: "down", lines: [] }]
  },
  diplomacy_home: {
    id: "diplomacy_home", name: "STANZA CONSENSO", tiles: DIPLOMACY_HOME_TILES,
    tileOverrides: { p: "tiles/diplomacy_home_floor.png", A: "tiles/diplomacy_wall.png" },
    objectOverrides: { "6": "tiles/diplomacy_home.png" },
    outdoor: false, music: "social_tension",
    warps: [{ x: 4, y: 6, toMap: "diplomacy_lobby", toX: 3, toY: 9, facing: "down" }, { x: 5, y: 6, toMap: "diplomacy_lobby", toX: 3, toY: 9, facing: "down" }],
    signs: [{ x: 1, y: 1, lines: ["CONSENSO:", "FINO A +4 SONDAGGI, LIMITE 100. I PATTI RISCHIANO ANCHE AL LIMITE."] }], pickups: [],
    npcs: [{ id: "diplomacy-choice-home", spriteSet: "diplomacy-producer", wander: false, pal: "journalist", x: 4, y: 3, facing: "down", lines: [] }]
  },
  diplomacy_terrace: {
    id: "diplomacy_terrace", name: "TERRAZZA-STUDIO", tiles: DIPLOMACY_TERRACE_TILES,
    tileOverrides: { "=": "tiles/diplomacy_terrace_path.png" }, buildingOverrides: { v: "tiles/diplomacy_hotel.png" },
    objectOverrides: { "1": "tiles/diplomacy_stage.png", "6": "tiles/diplomacy_home.png" }, objectSizes: { "1": 80 },
    outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "election_night",
    warps: [{ x: 5, y: 9, toMap: "diplomacy_lobby", toX: 16, toY: 9, facing: "left" }, { x: 6, y: 9, toMap: "diplomacy_lobby", toX: 16, toY: 9, facing: "left" }],
    signs: [{ x: 4, y: 5, lines: ["LIVE INTERNAZIONALE.", "IL FILTRO È SOBRIO. LA DIPLOMAZIA MENO."] }], pickups: [],
    npcs: [
      { id: "partner-perfetto", spriteSet: "diplomacy-partner", wander: false, pal: "boss", x: 10, y: 2, facing: "down", trainerId: "partner-perfetto", hideIfFlag: "diplomacyComplete", lines: [] },
      { id: "partner-after", spriteSet: "diplomacy-partner", wander: false, pal: "boss", x: 10, y: 4, facing: "down", showIfFlag: "diplomacyComplete", lines: [] }
    ]
  },
  genova_techno: {
    id: "genova_techno", name: "GENOVA TECHNO", tiles: GENOVA_TECHNO_TILES,
    tileOverrides: { ".": "tiles/genova_quay.png", "=": "tiles/genova_path.png", "~": "tiles/genova_water.png" },
    objectOverrides: { f: "tiles/genova_fence.png", "1": "tiles/genova_stage.png", "7": "tiles/genova_van.png", "3": "tiles/genova_speaker.png", "6": "tiles/genova_screen.png" },
    objectSizes: { "1": 96, "7": 48, "3": 32, "6": 64 },
    outdoor: true, allowWanderers: false, encounterRate: 0, encounters: [], music: "social_tension",
    warps: [
      { x: 10, y: 13, toMap: "diplomacy_lobby", toX: 17, toY: 10, facing: "left", markerLabel: "HOTEL" },
      { x: 11, y: 13, toMap: "diplomacy_lobby", toX: 17, toY: 10, facing: "left" }
    ],
    signs: [
      { x: 3, y: 8, lines: ["VAN STAMPA: DIRETTA DAL PORTO.", "FURGONE ARANCIONE. IL BILANCIO ASPETTA IL SUO COLORE."] },
      { x: 16, y: 6, lines: ["SEI BATTUTE, DA SINISTRA A DESTRA.", "GIALLO: ADESSO. VERDE: HIT. ROSSO: GAFFE."] }
    ], pickups: [],
    npcs: [
      { id: "genova-dj", spriteSet: "genova-dj", wander: false, pal: "influencer", x: 10, y: 4, facing: "down", lines: [] },
      { id: "genova-stagehand", spriteSet: "genova-stagehand", wander: false, pal: "aide", x: 5, y: 9, facing: "right", lines: ["SETTE BRACCIA AL PALCO. UNA ALLA LIBERATORIA.", "TASTO GIUSTO IN RITARDO? ERRORE. TASTO SBAGLIATO IN TEMPO? GAFFE.", "SIN/DES SCEGLIE IL MODO. B PAUSA; ANCORA B ESCE SENZA PREMIO."] },
      { id: "genova-accountant", spriteSet: "genova-accountant", wander: false, pal: "journalist", x: 16, y: 9, facing: "left", lines: [] }
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
    id: "palazzo_algoritmo", name: "ARCHIVIO ALGORITMO", tiles: PALACE_ARCHIVE_TILES,
    outdoor: false, music: "social_tension", warps: [{ x: 4, y: 6, toMap: "palazzo_feed", toX: 5, toY: 3, facing: "down" }], signs: [], pickups: [],
    npcs: [
      { id: "palace-algorithm-a", pal: "influencer", x: 2, y: 3, facing: "down", lines: [] },
      { id: "palace-algorithm-b", pal: "journalist", x: 7, y: 3, facing: "down", lines: [] }
    ]
  },
  palazzo_factcheck: {
    id: "palazzo_factcheck", name: "ARCHIVIO FACT-CHECK", tiles: PALACE_ARCHIVE_TILES,
    outdoor: false, music: "mediopoli", warps: [{ x: 4, y: 6, toMap: "palazzo_feed", toX: 14, toY: 3, facing: "down" }], signs: [], pickups: [],
    npcs: [
      { id: "palace-factcheck-a", pal: "aide", x: 2, y: 3, facing: "down", lines: [] },
      { id: "palace-factcheck-b", pal: "journalist", x: 7, y: 3, facing: "down", lines: [] }
    ]
  },
  palazzo_talkshow: {
    id: "palazzo_talkshow", name: "ARCHIVIO TALK SHOW", tiles: PALACE_ARCHIVE_TILES,
    outdoor: false, music: "battle-trainer", warps: [{ x: 4, y: 6, toMap: "palazzo_feed", toX: 5, toY: 7, facing: "down" }], signs: [], pickups: [],
    npcs: [
      { id: "palace-talkshow-a", pal: "journalist", x: 2, y: 3, facing: "down", lines: [] },
      { id: "palace-talkshow-b", pal: "boss", x: 7, y: 3, facing: "down", lines: [] }
    ]
  },
  palazzo_silenzio: {
    id: "palazzo_silenzio", name: "SILENZIO STAMPA", tiles: PALACE_ARCHIVE_TILES,
    outdoor: false, music: "election_night", warps: [{ x: 4, y: 6, toMap: "palazzo_feed", toX: 14, toY: 7, facing: "down" }], signs: [], pickups: [],
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
      { x: 5, y: 9, toMap: "palazzo_feed", toX: 9, toY: 2, facing: "down" },
      { x: 6, y: 9, toMap: "palazzo_feed", toX: 9, toY: 2, facing: "down" },
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
