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
  box?: boolean; // COMPUTER DI PARTITO: apre il box (CIRCOLO DI PARTITO)
  mafia?: boolean;
  transport?: boolean;
  gift?: { itemId: string; qty: number; flag: string; lines: string[] };
  vehicleGift?: {
    vehicle: "monopattino" | "ruspa" | "auto" | "traghetto";
    flag: string;
    lines: string[];
    requiresBadges?: number; // gating opzionale (es. TRAGHETTO a 3 medaglie)
    lockedLines?: string[];
  };
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
  wander?: boolean; // se true, l'NPC cammina attorno alla sua posizione iniziale
  daily?: boolean; // SFIDA DEL GIORNO: apre la sfida quotidiana (e non vaga mai)
  coppa?: boolean; // BANDITORE della COPPA DELLE POLTRONE (torneo post-garante)
  monument?: boolean; // ARCHITETTO DI CORTE: money-sink MONUMENTO AL CANDIDATO (R42)
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

// Arredo urbano esaminabile (fontana W, statua Y, panchina U, ...): il char è già
// nei tile della mappa (solido), questo aggiunge SOLO il testo satirico mostrato
// premendo A davanti. Decorativo: nessun effetto di gioco, niente collisioni nuove.
export interface DecorativeDef {
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
  requiresBadges?: number; // medaglie minime per attraversare il confine
  lockedLines?: string[]; // messaggio se la strada è ancora chiusa
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
  decoratives?: DecorativeDef[]; // arredo urbano esaminabile (fontane/statue/...)
  edges?: { north?: EdgeDef; south?: EdgeDef };
  encounters?: EncounterEntry[];
  encounterRate?: number;
  music?: string; // traccia di audio.playMusic (default "borgo")
  // Override texture-tile per questa mappa (char -> file PNG in sprites/tiles/).
  // Permette di riusare gli stessi char con look diverso per ambiente (es. la
  // GROTTA: pavimento `p` -> roccia, muro `A` -> roccia scura). Non tocca la
  // logica di collisione (resta quella di TILES[ch]).
  tileOverrides?: Record<string, string>;
}

// ---------------------------------------------------------------- BORGO URNE

const BORGO_TILES = [
  "TTTTTTTTTTTTT====TTTTTTTTTTTTT",
  "TT...........====...........TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~.f..====..f.~~~~~..TT",
  "TT..~~~~~.f..====..f.~~~~~..TT",
  "TT........f..====..f........TT",
  "TT.......s...====...........TT",
  "TT...........====...........TT",
  "TT...........====...........TT",
  "TT...uuuu....====....rrrr...TT",
  "TT...uuuu....====....rrrr...TT",
  "TT...mddm....====....mddm...TT",
  "TT...=======================TT",
  "TT....=....U.====...W......=TT",
  "TT..========================TT",
  "TT.s..=.....=====..eQQe....=TT",
  "TT..!!!!....=====..mddm....=TT",
  "TT..mddm....=====..====....=TT",
  "TT..========================TT",
  "TT..wwww....=====....wwww...TT",
  "TT..wwww....=====....wwww...TT",
  "TT.........=====............TT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
];

// ----------------------------------------------- PERCORSO 1 (BORGO-MEDIOPOLI)
// Route pilota stile Pokémon: corridoio verticale tra le due città, con erba
// alta (~ incontri), un LAGHETTO (w) navigabile col TRAGHETTO che nasconde
// un'isoletta col tesoro, e l'ingresso di una GROTTA (bocca O → grotta1).
// 28 colonne come le città, strada ==== a idx13-16 per allinearsi agli edge.
const ROUTE1_TILES = [
  "TTTTTTTTTTTTT====TTTTTTTTTTTT",
  "TT..~~~~,...====...~~~~~...TT",
  "TT...~~~~...====..~~~ROR...TT",
  "TT..~~~~~...====...~~ROR...TT",
  "TT..wwww....====.======~...TT",
  "TT..wwww....====....~~~....TT",
  "TT..ww.w....====...........TT",
  "TT..wwww....====.s.,,,,....TT",
  "TT..wwww....=====..,,,,....TT",
  "TT..~~~~....====...,,,,....TT",
  "TT..~~~~....====...........TT",
  "TT..~~~~....====...~~~~~...TT",
  "TT..........====...~~~~~...TT",
  "TT..~~~~~...====...~~~~~...TT",
  "TT..~~~~~...====...........TT",
  "TT..~~~~~...====...~~~~~~..TT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTT"
];

// La GROTTA 1: tunnel opzionale con percorso a serpentina, incontri nelle
// ombre (~), boulders/stalagmiti solide e due uscite: sud verso PERCORSO 1,
// nord-est verso l'OBLAST DEL MEME.
const GROTTA1_TILES = [
  "AAAAAAAAAAAAAAAAAAAA",
  "AppppppppAAAAppppOpA",
  "ApSRRAp~pAAAASSRpppA",
  "Ap~pppp~ppppppsppppA",
  "ApppAAAASRRRRAAApppA",
  "AAp~AppppppppAAApppA",
  "ApppAppSRRRppA~ppppA",
  "ApAAAAppp~pppAAAAppA",
  "ApppppSSRAAAAppppppA",
  "AAAApApppppppp~pRRpA",
  "AppppAppRSSAAAAppppA",
  "Ap~ppApppppppppppppA",
  "ASRRAAApRSSRAAApSRpA",
  "AAAAAppccppppppppppA",
  "AAAAAAAAAAAAAAAAAAAA"
];

// Mini-zona satirica oltre la grotta: neve, taiga, cumuli-encounter e un varco
// di rientro. Non è una città nuova: è un avamposto-meme opzionale.
const OBLAST_MEME_TILES = [
  "NNNNNNNNNNNNNNNNNNNNNNNN",
  "NNNNNRO==iiiiiiiiisiNNNN",
  "NNNiiiii=iiiIIIiiiiiiNNN",
  "NNNiiiii===iiiiiiRRiiiNN",
  "NNRRiiiiii=iiiiiiRRiiiNN",
  "NNiiiiiiii=iiiiiiiiIIiNN",
  "NNiiiRRiiii==iiiRiiiiiNN",
  "NNiiiRRiiiii=iiiRiiiiiNN",
  "NNiIIIiiiiii=iiiiiiiiiNN",
  "NNiiiiiiiiiii==iiiiiiiNN",
  "NNiiiiiiiRRiii==iiiiiiNN",
  "NNiiiiiiiRRiiii=iRiiiiNN",
  "NNiiiiiiiiiiiii=iRIINNNN",
  "NNNNiiiiiiiIIiiiiiiNNNNN",
  "NNNNNNNNNNNNNNNNNNNNNNNN"
];

// -------------------------------------------- PERCORSO 2 (MEDIOPOLI-EUROTOWN)
// Route verticale a tema TALK SHOW/lobbying: il LAGHETTO DELL'AUDITEL a ovest
// nasconde un'isoletta-tesoro (solo col TRAGHETTO), erba alta su entrambi i
// lati e tre allenatori televisivi. Strada ==== a col 13-16 come le città.
const ROUTE2_TILES = [
  "TTTTTTTTTTTTT====TTTTTTTTTTTT",
  "TT...........====..........TT",
  "TT.,,,,......====.~~~~~~...TT",
  "TT.,,,,......====.~~~~~~...TT",
  "TT.wwwwww....====..........TT",
  "TT.wwwwww....====..........TT",
  "TT.ww.www....====..........TT",
  "TT.wwwwww....====..........TT",
  "TT.wwwwww....====.s........TT",
  "TT.~~~~~~~~..====..........TT",
  "TT.~~~~~~~~..====..~~~~~~..TT",
  "TT.~~~~~~~~..====..~~~~~~..TT",
  "TT.~~~~~~~~..====..........TT",
  "TT...........====..........TT",
  "TT..,,,,.....====s.........TT",
  "TT...........====..........TT",
  "TT...........====.~~~~~~~..TT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTT"
];

// -------------------------------------------- PERCORSO 3 (EUROTOWN-CAPITALE)
// Route verticale a tema POTERE/burocrazia: bocca della GROTTA2 "ARCHIVIO DI
// STATO" a nord-est (pattern route1), checkpoint di recinzioni a metà strada
// e campi d'erba alta con funzionari in agguato.
const ROUTE3_TILES = [
  "TTTTTTTTTTTTT====TTTTTTTTTTTT",
  "TT...........====..........TT",
  "TT...........====s...ROR...TT",
  "TT...........====....ROR...TT",
  "TT...........==========....TT",
  "TT.~~~~~~~~..====..........TT",
  "TT.~~~~~~~~..====..........TT",
  "TT.~~~~~~~~..====..........TT",
  "TT.~RR~~~~~..====..........TT",
  "TT...........====..........TT",
  "TT.........f.====f.........TT",
  "TT...........====..........TT",
  "TT...........====.,,,,~~~~.TT",
  "TT...........====.~~~~~~~~.TT",
  "TT...........====.~.~~~~~~.TT",
  "TT...........====.~~~~~~~~.TT",
  "TT...........====..........TT",
  "TT...........====..........TT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTT"
];

// GROTTA 2 "ARCHIVIO DI STATO": caverna opzionale sul PERCORSO 3, un'unica
// uscita a sud, scaffali-dossier (S/R) a serpentina e la DIRETTIVA: DECRETO
// in fondo all'archivio. Incontri nelle ombre (~) coerenti con la route.
const GROTTA2_TILES = [
  "AAAAAAAAAAAAAAAAAAAA",
  "Appp~ppppppppppppppA",
  "ApSSRp~ppppASRpppppA",
  "Appp~pppppppppsppppA",
  "AAASRRASRRAASRAppppA",
  "Apppp~pppp~ppppppppA",
  "AppSRRp~ppppppSRRppA",
  "Apppppppppp~pppppppA",
  "AppppASRRAASRRASRRAA",
  "App~pppppppppppppppA",
  "AppppSRRp~ppppSRpppA",
  "Ap~ppppppppppppppppA",
  "ApSRRppppppppppSRRpA",
  "AAAAAAAAccAAAAAAAAAA",
  "AAAAAAAAAAAAAAAAAAAA"
];

// ---------------------------------------------------------------- MEDIOPOLI

const MEDIOPOLI_TILES = [
  "TTTTTTTTTTTTT====TTTTTTTTTTTTT",
  "TT...........====...........TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT..~~~~~..f.====.f..~~~~~..TT",
  "TT.........f.====.f.........TT",
  "TT....s......====...........TT",
  "TT...........====...........TT",
  "TT..yyyyyy...====...HHHH....TT",
  "TT..yyyyyy...====...HHHH....TT",
  "TT..mmddmm...====...mddm....TT",
  "TT..========================TT",
  "TT....=..W...====...Y==.....TT",
  "TT....======================TT",
  "TT...eQQe....====....oooo...TT",
  "TT...mddm....====....oooo...TT",
  "TT...===========.....mddm...TT",
  "TT..????.....============...TT",
  "TT..mddm.....====.....==....TT",
  "TT..========================TT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTTT"
];

// ---------------------------------------------------------------- EUROTOWN

const EUROTOWN_TILES = [
  "TTTTTTTTTTTTT====TTTTTTTTTTTTT",
  "TT...........====...........TT",
  "TT..,,.......====.......,,..TT",
  "TT..BBBBBB...====...HHHH....TT",
  "TT..BBBBBB...====...HHHH....TT",
  "TT..mmddmm...====...mddm....TT",
  "TT..========================TT",
  "TT..========================TT",
  "TT..xxxx.....====...yyyy....TT",
  "TT..mddm.....====...mddm....TT",
  "TT..========================TT",
  "TT....eQQe...====....~~~~~..TT",
  "TT....mddm...====....~~~~~..TT",
  "TT..========================TT",
  "TT....W......====......Y....TT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTTT"
];

// ------------------------------------------------------------- CAPUT MUNDI

const CAPITALE_TILES = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT........MMMMMMMMMM........TT",
  "TT........MGMMMMMMGM........TT",
  "TT........MMMMMMMMMM........TT",
  "TT........CMMMDDMMMC........TT",
  "TT..,,....==========..eQQe..TT",
  "TT..,,......======....mddm..TT",
  "TT...=====================..TT",
  "TT..xxxxxx...====..$$$$$$...TT",
  "TT..xxxxxx...====..$$$$$$...TT",
  "TT..mmddmm...====..mmddmm...TT",
  "TT..========================TT",
  "TT....=..W..s====...Y==.....TT",
  "TT..========================TT",
  "TT..~~~~~....====....~~~~~..TT",
  "TT.HHHH~~....====....~~vvvv.TT",
  "TT.HHHH~~....====....~~vvvv.TT",
  "TT.mddm......====......mddm.TT",
  "TT.========================.TT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTTT"
];

// ------------------------------------------------------- BRACCIO DI MARE
// La "strada d'acqua" Calabria→Sicilia. Si attraversa SOLO con la MN TRAGHETTO
// (l'acqua 'w' è invalicabile senza). Sbarchi a NORD (sponda Calabria, sabbia
// 'z' col molo 'j'), attraversi il mare, approdi a SUD (edge → stretto/Sicilia).
// Larghezza 20, il bordo 'T' (montagne/costa) chiude i lati.
const MARE_TILES = [
  "TTTTTTTTTTTTTTTTTTTT",
  "TzzzzzzzzzzzzzzzzzzT",
  "TzzzzzzzzjjzzzzzzzzT",
  "TwwwwwwwwjjwwwwwwwwT",
  "TwwwwwwwwwwwwwwwwwwT",
  "TwwwwwwwwwwwwwwwwwwT",
  "TwwwwwwwwwwwwwwwwwwT",
  "TwwwwwwwwwwwwwwwwwwT",
  "TwwwwwwwwwwwwwwwwwwT",
  "TwwwwwwwwwwwwwwwwwwT",
  "TwwwwwwwwwwwwwwwwwwT",
  "TwwwwwwwwjjwwwwwwwwT",
  "TzzzzzzzzjjzzzzzzzzT",
  "TzzzzzzzzzzzzzzzzzzT",
  "TTTTTTTTTTTTTTTTTTTT"
];

// ---------------------------------------------------- STRETTO DI MESSINA
// Spiaggia stile Papeete + ponte eternamente incompiuto che finisce in mare.

// Lo STRETTO: spiaggia Papeete a nord con i suoi edifici, poi il MOLO da cui
// approda il traghetto si apre su un CANALE D'ACQUA CONTINUO (righe 6-7) che si
// raccorda all'acqua aperta in basso e al ponte. Prima qui c'era una fascia di
// sabbia che faceva da "isola di terra" e tagliava la traversata: ora dall'molo
// (col 13-14) l'acqua scende ininterrotta fino al cantiere del ponte.
const STRETTO_TILES = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.......@@@@......xxxx.....TT",
  "TT..~~~~.mddm.s....mdd^^^^^.TT",
  "TT..~~~~.====eQQe..===^...^.TT",
  "TT..~~~~...==mddm..===^...^.TT",
  "TT...s.zzzz===========^^l^^.TT",
  "TTzzzzzzzzzwwwwwwzzzzzzzzzzzTT",
  "TTzzzzzzzzzwwwwwwzzzzzzzzzzzTT",
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

// ---------------------------------------------------- PARADISO OFFSHORE
// Isola post-game (flag garante-beaten) a est dello STRETTO: ci si arriva col
// TRAGHETTO dalle boe. Molo a ovest (j), bar LIDO CAYMAN al centro-nord,
// due campi d'erba alta e un ALTOPIANO di scogli (^) a nord-est con un'unica
// scala (l): in cima custodisce i conti IL TESORIERE FANTASMA.
const OFFSHORE_TILES = [
  "wwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
  "wwwzzzzzzzzzzzzzzzzzzzzzzzzzww",
  "wwwz.........eQQe...^^^^^^^^ww",
  "wwwz.~~~~~...mddm...^......^ww",
  "wwwz.~~~~~...====...^......^ww",
  "wwwz.~~~~~....==....^......^ww",
  "wwwz.~~~~~....==....^^^l^^^^ww",
  "wwwz=====================..zww",
  "wwjjjzs....................zww",
  "wwjjjz.....................zww",
  "wwwz.....TT.......~~~~~....zww",
  "wwwz..............~~~~~....zww",
  "wwwz....TT........~~~~~....zww",
  "wwwzzzzzzzzzzzzzzzzzzzzzzzzzww",
  "wwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwwwwwwwwwwwwwwwww"
];

// ---------------------------------------------------- BRUXELLES (ELEZIONI UE)
// Capitale UE, contenuto end-game (post garante-beaten). Ci si arriva col
// TRAGHETTO dall'OFFSHORE (warp d'acqua a sud, come le boe Stretto->Offshore).
// Viale centrale che sale al PALAZZO DELLA COMMISSIONE (marmo M 10x4 con le
// porte DD verso l'interno: LA COMMISSIONE presidia in fondo alla scalinata).
// Cortili istituzionali (recinti f + aiuole ,), erba UE '~' col roster europeo,
// bar CAFFÈ SCHUMAN (eQQe + porta) per il respawn. 29 di larghezza, molo a sud.
const BRUXELLES_TILES = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT......MMMMMMMMMM.........TT",
  "TT......MGMMMMMMGM.........TT",
  "TT......MMMMMMMMMM.........TT",
  "TT......CMMMDDMMMC.........TT",
  "TT...,,.....====.....,,....TT",
  "TT...ff.....====.....ff....TT",
  "TT...ff.....====.....ff....TT",
  "TT.========================TT",
  "TT..~~~~....====....~~~~...TT",
  "TT..~~~~.eQQe==.....~~~~...TT",
  "TT..~~~~.mddm==...s.~~~~...TT",
  "TT.===========.===========.TT",
  "TT......zzzzzzzzzzzzz......TT",
  "TTTTTTTTTTzzzwwwwzzzTTTTTTTTT",
  "TTTTTTTTTTTTTwwwwTTTTTTTTTTTT"
];

// Interno del Palazzo della Commissione: scalinata cerimoniale (come il PALAZZO),
// LA COMMISSIONE in fondo. L'uscita (zerbino 'cc' in basso) riporta a BRUXELLES.
const COMMISSIONE_TILES = [
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
  "AAAAAggAAAAA"
];

const PALAZZO_TILES = [
  "AAAAAggAAAAA",
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
    // Cartelli sul muro di fondo, sopra una cella di pavimento: prima erano a
    // (0,1)/(9,1), fiancheggiati dalle macchine `k` e dai muri `A` su tutti i
    // lati ortogonali → illeggibili. (3,0)/(6,0) hanno pavimento sotto: si
    // leggono stando a (3,1)/(6,1) rivolti in alto.
    signs: [{ x: 3, y: 0, lines: signLines }, { x: 6, y: 0, lines: signLines }],
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

function insideEntry(tiles: string[]): { x: number; y: number } {
  const exitY = tiles.length - 2;
  const row = tiles[exitY];
  const cx = Math.max(0, row.indexOf("c"));
  return { x: cx, y: Math.max(1, exitY - 1) };
}

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

// Interno del BAR SPORT: il "centro cura" del gioco (come il Pokémon Center).
// Bancone `h` in fondo dietro cui sta il barista, tavolini `t`, scaffale di
// bottiglie `b`, una pianta `P`. Le due celle `cc` in basso sono l'uscita.
// Interno del BAR SPORT. Riga 1: scaffali `b` di bottiglie. Riga 2: bancone `h`.
// Il barista sta a riga 3, davanti al bancone, su pavimento. Tavolini `t`, una
// pianta `P`. La porta di uscita `cc` è in basso; il giocatore entra a (5,5),
// pavimento, ben dentro la stanza.
const BAR_TILES = [
  "AAAAAAAAAAAA",
  "AbbbbbbbbbbA",
  "AhhhhhhhhhhA",
  "AppppppppppA",
  "AptpppppptpA",
  "AppppppppPpA",
  "AppppccppppA",
  "AAAAAAAAAAAA"
];

const LAB_ENTRY = insideEntry(LAB_TILES);
const GROTTA1_ENTRY = insideEntry(GROTTA1_TILES);
const GROTTA2_ENTRY = insideEntry(GROTTA2_TILES);
const GYM_ENTRY = insideEntry(GYM_TILES);
const MARKET_ENTRY = insideEntry(MARKET_TILES);
const HOUSE_ENTRY_A = insideEntry(HOUSE_TILES_A);
const HOUSE_ENTRY_B = insideEntry(HOUSE_TILES_B);
const HOUSE_ENTRY_C = insideEntry(HOUSE_TILES_C);
const BAR_ENTRY = insideEntry(BAR_TILES);

// Genera l'interno di un BAR SPORT con il barista che cura al bancone.
function barMap(id: string, name: string, city: string, doorX: number, doorY: number): MapDef {
  const exitY = BAR_TILES.length - 2;
  const cx = Math.max(0, BAR_TILES[exitY].indexOf("c"));
  return {
    id,
    name,
    tiles: BAR_TILES,
    outdoor: false,
    music: "interior",
    warps: [
      { x: cx, y: exitY, toMap: city, toX: doorX, toY: doorY, facing: "down" },
      { x: cx + 1, y: exitY, toMap: city, toX: doorX, toY: doorY, facing: "down" }
    ],
    signs: [{ x: 1, y: 3, lines: [`${name}`, "Una vetrina di bottiglie e promesse. Qui la squadra si rimette in sesto."] }],
    pickups: [],
    npcs: [
      {
        id: `${id}-barista`, pal: "barista", x: 5, y: 3, facing: "down", healer: true,
        lines: [
          `${name}: benvenuto. Il banco offre, la squadra si riprende.`,
          // Scopribilità RIVINCITE (audit C12): il barista spiega il "!" dorato.
          "Voci dal bancone: gli sfidanti battuti si allenano per la RIVINCITA.",
          "Quando vedi il '!' dorato sopra la testa di uno di loro, riparlaci."
        ]
      },
      {
        id: `${id}-pc`, pal: "aide", x: 9, y: 3, facing: "down", box: true,
        lines: ["COMPUTER DI PARTITO: qui gestisci chi sta in squadra e chi al CIRCOLO."]
      }
    ]
  };
}

export const MAPS: Record<string, MapDef> = {
  borgo: {
    id: "borgo",
    name: "BORGO URNE",
    tiles: BORGO_TILES,
    outdoor: true,
    music: "borgo",
    edges: { north: { toMap: "route1", offsetX: 0 } },
    warps: [
      { x: 6, y: 12, toMap: "lab", toX: LAB_ENTRY.x, toY: LAB_ENTRY.y, facing: "up" },
      { x: 7, y: 12, toMap: "lab", toX: LAB_ENTRY.x, toY: LAB_ENTRY.y, facing: "up" },
      { x: 22, y: 12, toMap: "home", toX: HOUSE_ENTRY_C.x, toY: HOUSE_ENTRY_C.y, facing: "up" },
      { x: 23, y: 12, toMap: "home", toX: HOUSE_ENTRY_C.x, toY: HOUSE_ENTRY_C.y, facing: "up" },
      { x: 5, y: 18, toMap: "circolo", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 6, y: 18, toMap: "circolo", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 20, y: 17, toMap: "bar-borgo", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 21, y: 17, toMap: "bar-borgo", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.10,
    // BORGO = politica italiana di base. Zona-casa di salvinott e grillix.
    // Rate basso: è la città-tutorial, deve restare calma (più bassa della route).
    encounters: [
      { speciesId: "salvinott", weight: 38, minLv: 2, maxLv: 4 },
      { speciesId: "grillix", weight: 26, minLv: 3, maxLv: 5 },
      { speciesId: "tajanide", weight: 22, minLv: 3, maxLv: 5 },
      { speciesId: "contemorfo", weight: 14, minLv: 4, maxLv: 5 }
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
        x: 24, y: 12,
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
    decoratives: [
      {
        x: 20, y: 14,
        lines: [
          "FONTANA DEL CONSENSO.",
          "L'acqua sgorga solo in campagna elettorale.",
          "Negli altri mesi: \"guasto tecnico, fondi in arrivo\"."
        ]
      },
      {
        x: 11, y: 14,
        lines: ["PANCHINA DEI SAGGI.", "Qui si decideva tutto. Ora c'è solo il wifi del bar."]
      }
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
      },
      {
        // VERSIONE ESCLUSIVA: testo dinamico gestito in WorldScene.interactNpc
        // (dipende dal browserSeed: GOVERNO/OPPOSIZIONE).
        id: "sondaggista-versioni", pal: "aide", x: 13, y: 17, facing: "down",
        lines: ["SONDAGGISTA: campiono l'erba alta, un comizio alla volta."]
      }
    ]
  },

  // PERCORSO 1: route tra BORGO (sud) e MEDIOPOLI (nord). Erba alta con incontri,
  // un LAGHETTO con isoletta-tesoro (solo col TRAGHETTO) e una GROTTA opzionale.
  route1: {
    id: "route1",
    name: "PERCORSO 1",
    tiles: ROUTE1_TILES,
    outdoor: true,
    music: "borgo",
    edges: {
      north: { toMap: "mediopoli", offsetX: 0 },
      south: { toMap: "borgo", offsetX: 0 }
    },
    warps: [
      { x: 22, y: 3, toMap: "grotta1", toX: GROTTA1_ENTRY.x, toY: GROTTA1_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.14,
    // Mix delle due città a livello intermedio: chi attraversa allena la squadra.
    encounters: [
      { speciesId: "salvinott", weight: 24, minLv: 4, maxLv: 6 },
      { speciesId: "grillix", weight: 22, minLv: 4, maxLv: 6 },
      { speciesId: "contemorfo", weight: 20, minLv: 5, maxLv: 7 },
      { speciesId: "vannaccix", weight: 18, minLv: 5, maxLv: 7 },
      { speciesId: "calendauro", weight: 16, minLv: 6, maxLv: 7 }
    ],
    signs: [
      { x: 17, y: 7, lines: ["PERCORSO 1", "Nord: MEDIOPOLI. Sud: BORGO URNE.", "L'erba alta pullula di candidati. La GROTTA a est nasconde qualcosa."] }
    ],
    pickups: [
      // Tesoro sull'isoletta in mezzo al LAGHETTO: ci arrivi solo col TRAGHETTO.
      { id: "pk-r1-isola", x: 6, y: 6, itemId: "schedona", qty: 2 },
      { id: "pk-r1", x: 24, y: 9, itemId: "caffe", qty: 2 }
    ],
    npcs: [
      {
        id: "tr-route1", pal: "kid", x: 20, y: 9, facing: "left",
        trainerId: "aide", sightRange: 3,
        lines: ["Mi alleno tra le due città. Tu dove credi di andare?"]
      },
      {
        id: "viandante-r1", pal: "granny", x: 9, y: 12, facing: "right",
        lines: ["Una volta tra BORGO e MEDIOPOLI c'era solo erba.", "Ora c'è ancora solo erba. Ma con più sondaggi."]
      }
    ]
  },

  // GROTTA 1: caverna opzionale sul PERCORSO 1, con percorso vero e uscita
  // secondaria verso l'OBLAST DEL MEME.
  grotta1: {
    id: "grotta1",
    name: "GROTTA DEL CONSENSO",
    tiles: GROTTA1_TILES,
    outdoor: false,
    music: "interior",
    // Look da caverna: pavimento/uscita e muri diventano roccia (texture
    // PixelLab). L'uscita `c` (era tappeto rosso) diventa roccia: il varco è già
    // segnato dal warp, niente quadrato rosso fuori contesto nella grotta.
    tileOverrides: {
      p: "tiles/cave_floor.png", A: "tiles/cave_rock.png", c: "tiles/cave_floor.png"
    },
    warps: [
      { x: 7, y: 13, toMap: "route1", toX: 22, toY: 4, facing: "down" },
      { x: 8, y: 13, toMap: "route1", toX: 22, toY: 4, facing: "down" },
      { x: 17, y: 1, toMap: "oblast-meme", toX: 7, toY: 1, facing: "right" }
    ],
    encounterRate: 0.16,
    encounters: [
      { speciesId: "muskrat", weight: 28, minLv: 5, maxLv: 7 },
      { speciesId: "grillix", weight: 22, minLv: 5, maxLv: 7 },
      { speciesId: "contemorfo", weight: 18, minLv: 6, maxLv: 8 },
      { speciesId: "bunkerput", weight: 10, minLv: 7, maxLv: 9 }
    ],
    signs: [
      { x: 14, y: 3, lines: ["BUNKER DEL CONSENSO", "Il corridoio gira, rigira e poi sbuca in un posto freddissimo.", "Se senti un tavolo troppo lungo, non è eco."] }
    ],
    pickups: [
      { id: "pk-grotta1", x: 18, y: 2, itemId: "tessera", qty: 1 },
      { id: "pk-grotta1b", x: 2, y: 11, itemId: "spritz", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-bunkerista", pal: "aide", x: 12, y: 6, facing: "down",
        trainerId: "bunkerista", sightRange: 3,
        lines: ["Hai trovato il corridoio riservato ai meme geopolitici.", "Qui il consenso si misura in metri di tavolo."]
      }
    ]
  },

  "oblast-meme": {
    id: "oblast-meme",
    name: "OBLAST DEL MEME",
    tiles: OBLAST_MEME_TILES,
    outdoor: true,
    music: "interior",
    tileOverrides: {
      "=": "tiles/snow_path.png"
    },
    warps: [
      { x: 6, y: 1, toMap: "grotta1", toX: 16, toY: 1, facing: "left" }
    ],
    encounterRate: 0.14,
    encounters: [
      { speciesId: "putingrad", weight: 26, minLv: 9, maxLv: 11 },
      { speciesId: "bunkerput", weight: 22, minLv: 8, maxLv: 11 },
      { speciesId: "bojoon", weight: 16, minLv: 8, maxLv: 10 },
      { speciesId: "muskrat", weight: 14, minLv: 8, maxLv: 10 }
    ],
    signs: [
      { x: 18, y: 1, lines: ["OBLAST DEL MEME", "Gemellato con ogni chat dove qualcuno scrive 'fonte: fidati'."] }
    ],
    pickups: [
      { id: "pk-oblast-1", x: 4, y: 13, itemId: "schedona", qty: 1 },
      { id: "pk-oblast-hide", x: 20, y: 5, itemId: "caffe", qty: 2, hidden: true }
    ],
    npcs: [
      {
        // MEDICO DA CAMPO: l'OBLAST era un vicolo cieco senza cura né respawn
        // (rischio soft-lock: KO contro il leggendario lv10 e risveglio a Borgo).
        // Una crocerossina meme cura la squadra prima/dopo BUNKERPUT.
        id: "medico-oblast", pal: "granny", x: 5, y: 13, facing: "down", healer: true,
        lines: [
          "MEDICO DA CAMPO: questa è zona di guerre social, candidato.",
          "Siediti: ti rimetto in sesto la squadra prima del BUNKER."
        ]
      },
      {
        id: "legend-bunkerput", pal: "boss", x: 18, y: 10, facing: "left",
        legendary: {
          speciesId: "bunkerput",
          level: 10,
          flag: "legend-bunkerput-gone",
          lines: [
            "Dal fondo della taiga arriva un tavolo lunghissimo.",
            "BUNKERPUT emerge dal meme e pretende distanza di sicurezza."
          ],
          afterRunLines: ["BUNKERPUT si richiude nel bunker. Il tavolo resta apparecchiato."],
          afterGoneLines: ["Il bunker si svuota. Resta solo un eco: 'riunione da remoto'."]
        },
        lines: ["Il bunker è chiuso. Dentro qualcuno misura la stanza col righello."]
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
      north: {
        toMap: "route2", offsetX: 0, requiresBadges: 1,
        lockedLines: [
          "La strada per EUROTOWN è presidiata dai gazebo.",
          "\"Senza la MEDAGLIA AUDITEL non si passa: prima conquista la palestra di MEDIOPOLI.\""
        ]
      },
      south: { toMap: "route1", offsetX: 0 }
    },
    warps: [
      { x: 7, y: 10, toMap: "gymtv", toX: GYM_ENTRY.x, toY: GYM_ENTRY.y, facing: "up" },
      { x: 6, y: 10, toMap: "gymtv", toX: GYM_ENTRY.x, toY: GYM_ENTRY.y, facing: "up" },
      { x: 21, y: 10, toMap: "market1", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 22, y: 10, toMap: "market1", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 5, y: 18, toMap: "attico", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 6, y: 18, toMap: "attico", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 22, y: 16, toMap: "redazione", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 23, y: 16, toMap: "redazione", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 6, y: 15, toMap: "bar-medio", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 7, y: 15, toMap: "bar-medio", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.18,
    // MEDIOPOLI = media/talk-show + destra italiana. Zona-casa di vannaccix e
    // calendauro. contemorfo qui è la versione più alta di livello (come in
    // Pokémon la stessa specie ricompare più forte nella zona avanzata).
    encounters: [
      { speciesId: "vannaccix", weight: 30, minLv: 8, maxLv: 11 },
      { speciesId: "calendauro", weight: 24, minLv: 9, maxLv: 12 },
      { speciesId: "mediocrate", weight: 22, minLv: 9, maxLv: 12 },
      { speciesId: "contemorfo", weight: 14, minLv: 9, maxLv: 12 },
      { speciesId: "macronfox", weight: 10, minLv: 10, maxLv: 12 }
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
    decoratives: [
      {
        x: 9, y: 12,
        lines: ["FONTANA DELLO SHARE.", "Più ascolti fai, più zampilla. Stasera: replica."]
      },
      {
        x: 20, y: 12,
        lines: ["STATUA DEL GRANDE COMUNICATORE.", "Dito puntato verso il futuro. O verso la telecamera."]
      }
    ],
    npcs: [
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

  // PERCORSO 2: route tra MEDIOPOLI (sud) e EUROTOWN (nord). Tema talk show:
  // il LAGHETTO DELL'AUDITEL con isoletta-tesoro (solo TRAGHETTO), erba alta
  // e tre professionisti del salotto televisivo. Il gate a 1 medaglia resta
  // sull'edge nord di MEDIOPOLI (mai lato route: niente trappole).
  route2: {
    id: "route2",
    name: "PERCORSO 2",
    tiles: ROUTE2_TILES,
    outdoor: true,
    music: "mediopoli",
    edges: {
      north: { toMap: "eurotown", offsetX: 0 },
      south: { toMap: "mediopoli", offsetX: 0 }
    },
    warps: [],
    encounterRate: 0.14,
    // Ponte tra MEDIOPOLI (8-12) ed EUROTOWN (12-15): media italiani in uscita,
    // primi leader europei in anteprima.
    encounters: [
      { speciesId: "mediocrate", weight: 26, minLv: 12, maxLv: 14 },
      { speciesId: "vannaccix", weight: 22, minLv: 12, maxLv: 14 },
      { speciesId: "calendauro", weight: 18, minLv: 12, maxLv: 15 },
      { speciesId: "macronfox", weight: 18, minLv: 13, maxLv: 15 },
      { speciesId: "bojoon", weight: 16, minLv: 13, maxLv: 15 },
      // LINEA VERDE (Round 40): il germoglio attivista spunta raro tra i cortei.
      { speciesId: "verdolino", weight: 8, minLv: 11, maxLv: 13 }
    ],
    signs: [
      {
        x: 18, y: 8,
        lines: ["LAGHETTO DELL'AUDITEL", "Le carpe applaudono a comando.", "L'isoletta al centro? Diritti TV in esclusiva."]
      },
      {
        x: 17, y: 14,
        lines: ["PERCORSO 2", "Nord: EUROTOWN. Sud: MEDIOPOLI.", "Area di sosta opinionisti: massimo tre ospitate al giorno."]
      }
    ],
    pickups: [
      // Tesoro sull'isoletta del LAGHETTO: ci si arriva solo col TRAGHETTO.
      { id: "pk-r2-isola", x: 5, y: 6, itemId: "schedona", qty: 2 },
      { id: "pk-r2", x: 24, y: 10, itemId: "maalox", qty: 1 },
      { id: "pk-r2-hide", x: 4, y: 15, itemId: "spritz", qty: 2, hidden: true },
      // Pickup raro Round 39: un hold item gratis per far scoprire la meccanica.
      { id: "pk-r2-santino", x: 23, y: 10, itemId: "santino", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-claqueur", pal: "influencer", x: 19, y: 5, facing: "left",
        trainerId: "claqueur", sightRange: 3,
        lines: ["La claque non dorme mai. Applaude a turni."]
      },
      {
        id: "tr-telelobbista", pal: "aide", x: 10, y: 11, facing: "right",
        trainerId: "telelobbista", sightRange: 3,
        lines: ["Tra una pubblicità e l'altra passa di tutto. Anche tu."]
      },
      {
        id: "tr-opinionista", pal: "journalist", x: 18, y: 12, facing: "left",
        trainerId: "opinionista", sightRange: 3,
        lines: ["Ho un parere su tutto. Soprattutto sul contrario."]
      },
      {
        id: "spettatore-r2", pal: "granny", x: 20, y: 15, facing: "down",
        lines: ["Faccio la spola tra due talk show.", "Stesso ospite, stessa lite, stesso stupore. Che tempi."]
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
      north: {
        toMap: "route3", offsetX: 0, requiresBadges: 2,
        lockedLines: [
          "Il confine di CAPUT MUNDI è blindato da transenne istituzionali.",
          "\"Per accedere serve la MEDAGLIA SPREAD: torna quando avrai vinto a EUROTOWN.\""
        ]
      },
      south: { toMap: "route2", offsetX: 0 }
    },
    warps: [
      { x: 7, y: 5, toMap: "gymue", toX: GYM_ENTRY.x, toY: GYM_ENTRY.y, facing: "up" },
      { x: 6, y: 5, toMap: "gymue", toX: GYM_ENTRY.x, toY: GYM_ENTRY.y, facing: "up" },
      { x: 21, y: 5, toMap: "market2", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 22, y: 5, toMap: "market2", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 5, y: 9, toMap: "lobbystudio", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 6, y: 9, toMap: "lobbystudio", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 21, y: 9, toMap: "bistrot", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 22, y: 9, toMap: "bistrot", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 7, y: 12, toMap: "bar-euro", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 8, y: 12, toMap: "bar-euro", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.18,
    // EUROTOWN = leader europei/esteri. Zona-casa di macronfox, zelenskir,
    // bojoon (UK), ursulax. draghimon tolto dal wild: resta SOLO il leggendario
    // gift al COLLE, così l'evento riacquista valore.
    encounters: [
      { speciesId: "macronfox", weight: 28, minLv: 12, maxLv: 15 },
      { speciesId: "zelenskir", weight: 24, minLv: 13, maxLv: 15 },
      { speciesId: "bojoon", weight: 20, minLv: 12, maxLv: 15 },
      { speciesId: "ursulax", weight: 16, minLv: 14, maxLv: 15 },
      { speciesId: "calendauro", weight: 12, minLv: 13, maxLv: 15 }
    ],
    signs: [
      {
        // Spostato da (21,11): lì coincideva con l'NPC pensionato-euro, che lo
        // shadowava (interact() controlla gli NPC prima dei cartelli) → cartello
        // illeggibile. (22,11) è erba libera, accessibile da (23,11)/(22,12).
        x: 22, y: 11,
        lines: ["EUROTOWN", "Gemellata con se stessa in 27 lingue diverse.", "PALESTRA UE: medaglia SPREAD in palio."]
      }
    ],
    pickups: [
      { id: "pk-e1", x: 26, y: 2, itemId: "spritz", qty: 1 },
      { id: "pk-e2", x: 2, y: 2, itemId: "dirGreen", qty: 1 },
      { id: "pk-e-hide1", x: 26, y: 14, itemId: "dirBunga", qty: 1, hidden: true },
      { id: "pk-e-hide2", x: 2, y: 14, itemId: "mojito", qty: 1, hidden: true }
    ],
    decoratives: [
      {
        x: 6, y: 14,
        lines: ["FONTANA DELL'EURO.", "Getta una monetina: viene subito ridistribuita a Bruxelles."]
      },
      {
        x: 23, y: 14,
        lines: ["STATUA DEL PADRE FONDATORE.", "Nessuno ricorda di cosa. Ma la targa è in tre lingue."]
      }
    ],
    npcs: [
      {
        id: "scorta-euro", pal: "guard", x: 24, y: 14, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "Abbiamo una corsia preferenziale approvata in 27 lingue."]
      },
      {
        id: "tr-lobbista", pal: "aide", x: 9, y: 13, facing: "up",
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

  // PERCORSO 3: route tra EUROTOWN (sud) e CAPUT MUNDI (nord). Tema potere e
  // burocrazia: checkpoint di recinzioni a metà strada, funzionari in agguato
  // e la bocca della GROTTA2 "ARCHIVIO DI STATO" a nord-est (pattern route1).
  // Il gate a 2 medaglie resta sull'edge nord di EUROTOWN.
  route3: {
    id: "route3",
    name: "PERCORSO 3",
    tiles: ROUTE3_TILES,
    outdoor: true,
    music: "eurotown",
    edges: {
      north: { toMap: "capitale", offsetX: 0 },
      south: { toMap: "eurotown", offsetX: 0 }
    },
    warps: [
      { x: 22, y: 3, toMap: "grotta2", toX: GROTTA2_ENTRY.x, toY: GROTTA2_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.14,
    // Ponte tra EUROTOWN (12-15) e CAPUT MUNDI (15-18): istituzioni europee in
    // uscita, potenze mondiali in anteprima.
    encounters: [
      { speciesId: "ursulax", weight: 24, minLv: 16, maxLv: 18 },
      { speciesId: "muskrat", weight: 20, minLv: 17, maxLv: 19 },
      { speciesId: "zelenskir", weight: 20, minLv: 16, maxLv: 18 },
      { speciesId: "macronfox", weight: 18, minLv: 16, maxLv: 18 },
      { speciesId: "mediocrate", weight: 18, minLv: 17, maxLv: 19 },
      // LINEA VERDE (Round 40): il germoglio già cresciuto pattuglia il Percorso 3.
      { speciesId: "verdolino", weight: 8, minLv: 16, maxLv: 17 },
      { speciesId: "ecoverdon", weight: 4, minLv: 18, maxLv: 19 }
    ],
    signs: [
      {
        x: 17, y: 2,
        lines: ["PERCORSO 3", "Nord: CAPUT MUNDI. Sud: EUROTOWN.", "Coda stimata per il potere: 47 anni. Munirsi di numeretto."]
      }
    ],
    pickups: [
      { id: "pk-r3", x: 4, y: 14, itemId: "schedona", qty: 2 },
      { id: "pk-r3-hide", x: 25, y: 13, itemId: "caffe", qty: 2, hidden: true },
      // Pickup raro Round 39: hold item speciale nascosto sul percorso.
      { id: "pk-r3-agenda", x: 5, y: 14, itemId: "agendarossa", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-usciere", pal: "guard", x: 11, y: 6, facing: "right",
        trainerId: "usciere", sightRange: 3,
        lines: ["Senza appuntamento non si passa. Nemmeno col numeretto."]
      },
      {
        id: "tr-protocollista", pal: "granny", x: 12, y: 10, facing: "right",
        trainerId: "protocollista", sightRange: 3,
        lines: ["Il checkpoint è qui per il suo bene. Firmi qui, qui e qui."]
      },
      {
        id: "tr-eminenza", pal: "aide", x: 19, y: 14, facing: "left",
        trainerId: "eminenza", sightRange: 3,
        lines: ["Questa conversazione non è mai avvenuta."]
      },
      {
        id: "questuante-r3", pal: "aide", x: 9, y: 16, facing: "right",
        lines: ["Aspetto una firma dal 1987.", "Il timbro c'è. Manca il funzionario. E il ministero. E la firma."]
      }
    ]
  },

  // GROTTA 2 "ARCHIVIO DI STATO": caverna opzionale sul PERCORSO 3, un'unica
  // uscita a sud. Scaffali-dossier, un archivista permaloso e la DIRETTIVA:
  // DECRETO sepolta in fondo all'archivio.
  grotta2: {
    id: "grotta2",
    name: "ARCHIVIO DI STATO",
    tiles: GROTTA2_TILES,
    outdoor: false,
    music: "interior",
    // Look da caverna come grotta1: pavimento/uscita e muri diventano roccia.
    tileOverrides: {
      p: "tiles/cave_floor.png", A: "tiles/cave_rock.png", c: "tiles/cave_floor.png"
    },
    warps: [
      { x: 8, y: 13, toMap: "route3", toX: 22, toY: 4, facing: "down" },
      { x: 9, y: 13, toMap: "route3", toX: 22, toY: 4, facing: "down" }
    ],
    encounterRate: 0.16,
    encounters: [
      { speciesId: "muskrat", weight: 28, minLv: 16, maxLv: 18 },
      { speciesId: "contemorfo", weight: 22, minLv: 16, maxLv: 18 },
      { speciesId: "calendauro", weight: 18, minLv: 17, maxLv: 19 },
      { speciesId: "putingrad", weight: 12, minLv: 18, maxLv: 19 }
    ],
    signs: [
      { x: 14, y: 3, lines: ["ARCHIVIO DI STATO", "Dossier su tutti. Anche su di te.", "Consultazione libera. Uscirne, meno."] }
    ],
    pickups: [
      { id: "pk-g2", x: 17, y: 2, itemId: "dirDecreto", qty: 1 },
      { id: "pk-g2-hide", x: 2, y: 11, itemId: "mojito", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-archivista", pal: "aide", x: 10, y: 6, facing: "down",
        trainerId: "archivista", sightRange: 3,
        lines: ["Shhh. I faldoni dormono.", "Ogni scaffale è un governo caduto. Non toccare niente."]
      }
    ]
  },

  capitale: {
    id: "capitale",
    name: "CAPUT MUNDI",
    tiles: CAPITALE_TILES,
    outdoor: true,
    music: "capitale",
    edges: { south: { toMap: "route3", offsetX: 0 } },
    warps: [
      { x: 7, y: 11, toMap: "gymglobal", toX: GYM_ENTRY.x, toY: GYM_ENTRY.y, facing: "up" },
      { x: 6, y: 11, toMap: "gymglobal", toX: GYM_ENTRY.x, toY: GYM_ENTRY.y, facing: "up" },
      { x: 22, y: 11, toMap: "casino", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 21, y: 11, toMap: "casino", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 23, y: 7, toMap: "bar-cap", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 24, y: 7, toMap: "bar-cap", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 4, y: 18, toMap: "salotto", toX: HOUSE_ENTRY_C.x, toY: HOUSE_ENTRY_C.y, facing: "up" },
      { x: 5, y: 18, toMap: "salotto", toX: HOUSE_ENTRY_C.x, toY: HOUSE_ENTRY_C.y, facing: "up" },
      { x: 24, y: 18, toMap: "retroscena", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 25, y: 18, toMap: "retroscena", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      {
        // IMBARCO per la SICILIA: traversata via MN TRAGHETTO. Senza la MN il
        // molo è sbarrato (vedi NPC marinaio accanto, che la regala a 3 medaglie).
        x: 12, y: 19, toMap: "mare", toX: 8, toY: 2, facing: "down",
        requiresFlag: "veh-traghetto",
        lockedLines: ["Il MOLO è chiuso.", "Il MARINAIO non ti fa salire senza il TRAGHETTO."]
      },
      {
        x: 14, y: 5, toMap: "palazzo", toX: 5, toY: 6, facing: "up",
        requiresBadges: 3,
        lockedLines: ["Il portone è sbarrato.", "Un cartello: 'SI RICEVE SOLO CON 3 MEDAGLIE.'"]
      },
      {
        x: 15, y: 5, toMap: "palazzo", toX: 6, toY: 6, facing: "up",
        requiresBadges: 3,
        lockedLines: ["Il portone è sbarrato.", "Un cartello: 'SI RICEVE SOLO CON 3 MEDAGLIE.'"]
      }
    ],
    encounterRate: 0.20,
    // CAPUT MUNDI = potenze mondiali. La "vetrina": 4 esclusive (putingrad,
    // xipanda, trumpon e il rarissimo mattarellux) + muskrat zona-casa.
    encounters: [
      { speciesId: "muskrat", weight: 24, minLv: 15, maxLv: 18 },
      { speciesId: "putingrad", weight: 16, minLv: 18, maxLv: 18 },
      { speciesId: "xipanda", weight: 16, minLv: 18, maxLv: 18 },
      { speciesId: "trumpon", weight: 14, minLv: 18, maxLv: 18 },
      { speciesId: "zelenskir", weight: 14, minLv: 16, maxLv: 18 },
      { speciesId: "mattarellux", weight: 1, minLv: 20, maxLv: 20 }
    ],
    signs: [
      {
        x: 7, y: 19,
        lines: ["CAPUT MUNDI", "Qui i potenti del mondo vengono a farsi fotografare."]
      },
      {
        // Accanto alla porta PALESTRA (6,11), non più scambiata col casinò.
        x: 7, y: 12,
        lines: ["PALESTRA GLOBAL TOWER", "Capopalestra: MR. TYCOON.", "Medaglia DAZIO. Ingresso gratuito, uscita tassata."]
      },
      {
        // Accanto alla porta del CASINÒ (21,11). Il tetto bordeaux-oro con "$"
        // ora lo distingue dalle case; il cartello conferma l'ingresso.
        x: 22, y: 12,
        lines: ["CASINÒ DI PALAZZO", "Cerca il TETTO ROSSO E ORO col simbolo $.", "Dentro: SLOT DEL CONSENSO e BUNGA BUNGA CLUB."]
      },
      {
        // Cartello dell'IMBARCO (molo a 12,19): la via per la Sicilia/STRETTO.
        x: 10, y: 19,
        lines: ["IMBARCO PER LA SICILIA", "Col MOLO attraversi il mare fino allo STRETTO.", "Serve la MN TRAGHETTO: chiedi al MARINAIO."]
      },
      {
        // Cartello della SFIDA DEL GIORNO, accanto all'OPINIONISTA in piazza.
        x: 12, y: 13,
        lines: ["SFIDA DEL GIORNO", "Un panel nuovo ogni 24 ore. Vince chi resta in onda.", "Premio quotidiano: fondi e rifornimenti. Una sola diretta al giorno."]
      }
    ],
    pickups: [
      { id: "pk-c1", x: 25, y: 8, itemId: "schedona", qty: 2 },
      // Spostato da (4,18): era sulla stessa cella del warp SALOTTO (porta) → conflitto.
      { id: "pk-c2", x: 3, y: 19, itemId: "spritz", qty: 1 },
      { id: "pk-c3", x: 4, y: 2, itemId: "dirWhatever", qty: 1 },
      // Tesoro grosso nella capitale: la TESSERA DORATA per evolvere.
      { id: "pk-c-hide1", x: 2, y: 8, itemId: "tessera", qty: 1, hidden: true },
      { id: "pk-c-hide2", x: 26, y: 14, itemId: "mojito", qty: 1, hidden: true },
      // Hold item nascosto in città late: la CAFFETTIERA (cura a ogni turno).
      { id: "pk-c-hide3", x: 26, y: 10, itemId: "caffettiera", qty: 1, hidden: true }
    ],
    decoratives: [
      {
        x: 9, y: 13,
        lines: ["FONTANA MONUMENTALE.", "Acqua benedetta dai sondaggi. Bevi a tuo rischio dal 1994."]
      },
      {
        x: 20, y: 13,
        lines: ["STATUA EQUESTRE DEL LEADER.", "Il cavallo guarda a sinistra. Il leader, dipende dal giorno."]
      }
    ],
    npcs: [
      {
        id: "scorta-cap", pal: "guard", x: 20, y: 18, facing: "right", transport: true,
        lines: [
          "SCORTA AUTO BLU:",
          "Ti porto tra le città che hai già visitato. Per lo STRETTO cerca l'IMBARCO a est: si va in TRAGHETTO.",
          "Davanti al Palazzo non si cammina: si arriva con lampeggiante istituzionale."
        ]
      },
      {
        id: "corazziere", pal: "guard", x: 12, y: 6, facing: "right",
        lines: [
          "Il PALAZZO riceve solo candidati con 3 MEDAGLIE.",
          "AUDITEL, SPREAD e DAZIO. Poi possiamo parlare."
        ]
      },
      {
        // MARINAIO dell'IMBARCO: regala il VEICOLO TRAGHETTO a 3 medaglie. Da qui
        // (molo a 12,19) si naviga il BRACCIO DI MARE fino alla SICILIA (STRETTO).
        id: "marinaio-cap", pal: "guard", x: 11, y: 19, facing: "right",
        vehicleGift: {
          vehicle: "traghetto", flag: "veh-traghetto", requiresBadges: 3,
          lines: [
            "MARINAIO: vuoi raggiungere la SICILIA? Di là si va solo per mare.",
            "Hai le 3 MEDAGLIE: ti affido il TRAGHETTO. Al timone c'è il CAPITANO SCHETTINO.",
            "Attivalo dal menu (START) alla voce VEICOLO e l'acqua diventa la tua strada.",
            "Mi raccomando: prima si naviga, l'inchino dopo."
          ],
          lockedLines: [
            "MARINAIO: il mare è mosso e il molo è chiuso ai dilettanti.",
            "Torna con 3 MEDAGLIE e ti consegno il TRAGHETTO."
          ]
        },
        lines: ["MARINAIO: il MOLO è dietro di me. Attiva il TRAGHETTO dal menu e vai verso la Sicilia."]
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
        id: "autista-cap", pal: "guard", x: 17, y: 18, facing: "down",
        vehicleGift: {
          vehicle: "auto", flag: "gift-auto",
          lines: [
            "Ehi, candidato! Il PARTITO ti assegna un'AUTO BLU tutta tua.",
            "Tienila: attivala dal menu (START) alla voce VEICOLO.",
            "All'aperto sfreccia. In città fai scena. Il pieno lo paga lo Stato."
          ]
        },
        lines: ["L'AUTO BLU è tua. Lampeggiante a discrezione, multe mai."]
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
        // Banchetto del venditore ambulante: Caput Mundi era l'unica città
        // grande SENZA negozio (niente rifornimento prima di palazzo/colle).
        // Un ambulante con shop:true vende le stesse cose del DISCOUNT.
        id: "ambulante-cap", pal: "barista", x: 14, y: 14, facing: "down", shop: true,
        lines: [
          "BANCHETTO DELL'AMBULANTE:",
          "Schede, caffè e DIRETTIVE prima del PALAZZO. Niente scontrino, niente domande."
        ]
      },
      {
        id: "influencer-cap", pal: "influencer", x: 22, y: 19, facing: "left",
        lines: [
          "Story, reel, dirette: il consenso oggi si fa col telefono.",
          "Tu invece giri a piedi nell'erba alta come nel 2005. Tenero."
        ]
      },
      {
        // SFIDA DEL GIORNO: 1 dibattito al giorno reale, team deterministico
        // dalla data. daily:true la esclude dall'ambient movement (non vaga).
        id: "opinionista-daily", pal: "journalist", x: 11, y: 13, facing: "down", daily: true,
        lines: ["OPINIONISTA PERPETUA: il dibattito è il mio habitat naturale."]
      },
      {
        // ARCHITETTO DI CORTE (R42): money-sink terminale MONUMENTO AL CANDIDATO,
        // accanto alla STATUA EQUESTRE (20,13). Cella (19,13) = prato calpestabile.
        id: "architetto-cap", pal: "aide", x: 19, y: 13, facing: "left", monument: true,
        lines: [
          "ARCHITETTO DI CORTE: un grande statista merita un grande MONUMENTO.",
          "Coi TUOI soldi, s'intende. È tutto legale: te lo dedichi da solo."
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
      { x: 5, y: 7, toMap: "borgo", toX: 7, toY: 13, facing: "down" },
      { x: 6, y: 7, toMap: "borgo", toX: 7, toY: 13, facing: "down" }
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

  market1: marketMap("market1", "mediopoli", 22, 11),
  market2: marketMap("market2", "eurotown", 22, 6),

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
      // Spostato da (0,1): lì era circondato dagli scaffali `b` (illeggibile).
      // (0,2) è muro laterale con pavimento accanto → leggibile da (1,2).
      { x: 0, y: 2, lines: ["CASINÒ DI PALAZZO", "Si entra elettori, si esce contribuenti."] }
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
      },
      {
        // ENCORE di BERLUSCONIX: seconda chance post-game se non è mai stato
        // eletto. Il flag berlu-encore-ready è RICALCOLATO a ogni ingresso al
        // casinò (WorldScene.loadMap): garante-beaten E dex senza berlusconix.
        id: "magnate-encore", pal: "boss", x: 2, y: 3, facing: "right",
        showIfFlag: "berlu-encore-ready",
        hideIfFlag: "legend-berlusconix-encore-gone",
        legendary: {
          speciesId: "berlusconix",
          level: 50,
          flag: "legend-berlusconix-encore-gone",
          lines: [
            "Nel privé, dietro il velluto rosso, una risata inconfondibile.",
            "'Ah, il nuovo CAMPIONE! Le racconto una barzelletta... anzi no: gliela DIMOSTRO.'",
            "BERLUSCONIX sale sul tavolo verde: ultimo giro, posta massima."
          ],
          afterRunLines: ["'Torni pure, il banco non chiude mai per gli amici.'"],
          afterGoneLines: ["Il privé è vuoto. Resta solo un profumo di sigaro e share."]
        },
        lines: ["Il tavolo VIP è riservato. Torna quando conti qualcosa."]
      }
    ]
  },

  // BRACCIO DI MARE: la traversata Calabria→Sicilia. Si entra dall'IMBARCO di
  // Caput Mundi (sbarco a NORD), si attraversa l'acqua con la MN TRAGHETTO e si
  // approda a SUD nello STRETTO. Senza MN l'acqua è invalicabile.
  mare: {
    id: "mare",
    name: "BRACCIO DI MARE",
    tiles: MARE_TILES,
    outdoor: true,
    music: "stretto",
    warps: [
      // Ritorno alla terraferma: dal molo nord si rientra a Caput Mundi.
      { x: 8, y: 1, toMap: "capitale", toX: 13, toY: 19, facing: "down" },
      { x: 9, y: 1, toMap: "capitale", toX: 13, toY: 19, facing: "down" },
      // Approdo a SUD: dal molo sud si entra nello STRETTO (Sicilia).
      { x: 8, y: 13, toMap: "stretto", toX: 13, toY: 6, facing: "up" },
      { x: 9, y: 13, toMap: "stretto", toX: 14, toY: 6, facing: "up" }
    ],
    encounterRate: 0,
    encounters: [],
    signs: [
      { x: 10, y: 2, lines: ["IMBARCADERO", "A nord la CALABRIA, a sud la SICILIA.", "Usa la MN TRAGHETTO per attraversare l'acqua."] }
    ],
    pickups: [],
    npcs: []
  },

  stretto: {
    id: "stretto",
    name: "STRETTO DI MESSINA",
    tiles: STRETTO_TILES,
    outdoor: true,
    music: "stretto",
    warps: [
      // Ritorno via mare verso la Calabria: l'imbarco è sulle celle d'acqua del
      // molo sud (13-14,6), le STESSE su cui si approda dal BRACCIO DI MARE. Così
      // NON coincidono più con il fronte della porta del bar (13,5): prima il bar
      // CHIRINGUITO PAPEETE era irraggiungibile (si veniva spediti in mare invece
      // di entrare). Si salpa col TRAGHETTO/AUTO BLU che si possiede già qui.
      { x: 13, y: 6, toMap: "mare", toX: 8, toY: 12, facing: "up" },
      { x: 14, y: 6, toMap: "mare", toX: 9, toY: 12, facing: "up" },
      // BOE del PARADISO OFFSHORE: acque aperte a est, solo post-game. Warp
      // d'acqua (pattern del molo 13-14,6): ci si arriva SOLO col TRAGHETTO.
      {
        x: 28, y: 10, toMap: "offshore", toX: 3, toY: 9, facing: "right",
        requiresFlag: "garante-beaten",
        lockedLines: ["Acque internazionali. Una motovedetta ti rimbalza.", "'Prima la CONTROFIRMA del COLLE, poi i paradisi.'"]
      },
      {
        x: 28, y: 11, toMap: "offshore", toX: 3, toY: 10, facing: "right",
        requiresFlag: "garante-beaten",
        lockedLines: ["Acque internazionali. Una motovedetta ti rimbalza.", "'Prima la CONTROFIRMA del COLLE, poi i paradisi.'"]
      },
      { x: 10, y: 2, toMap: "chiosco", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 11, y: 2, toMap: "chiosco", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 20, y: 2, toMap: "covo", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 21, y: 2, toMap: "covo", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 14, y: 4, toMap: "bar-stretto", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 15, y: 4, toMap: "bar-stretto", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.20,
    // STRETTO = endgame meme italiano. L'UNICO posto dove pescare salvinator
    // selvatico e — novità — capitanone allo stato brado (prima solo evo-tessera).
    // Un vero motivo per venire qui: roba che non trovi altrove.
    encounters: [
      { speciesId: "salvinator", weight: 30, minLv: 19, maxLv: 22 },
      { speciesId: "pontigor", weight: 18, minLv: 21, maxLv: 24 },
      { speciesId: "capitanone", weight: 12, minLv: 22, maxLv: 24 },
      { speciesId: "vannaccix", weight: 18, minLv: 20, maxLv: 22 },
      { speciesId: "muskrat", weight: 14, minLv: 21, maxLv: 23 },
      { speciesId: "contemorfo", weight: 8, minLv: 20, maxLv: 22 }
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
      // Spostato da (13,15): coincideva con l'NPC capitano-after (post ponte-beaten).
      { id: "pk-s3", x: 14, y: 9, itemId: "mojito", qty: 1 },
      { id: "pk-s4", x: 3, y: 7, itemId: "dirVaffa", qty: 1 }
    ],
    npcs: [
      {
        id: "scorta-stretto", pal: "guard", x: 8, y: 5, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "L'AUTO BLU è qui pronta: ti riporto sulla terraferma quando vuoi."]
      },
      {
        id: "elevato", pal: "professor", x: 24, y: 3, facing: "down",
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
        id: "tr-noponte", pal: "journalist", x: 8, y: 2, facing: "left",
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
      },
      {
        // CONTABILE PENTITO: post-game, svela la rotta per il PARADISO OFFSHORE.
        id: "contabile-pentito", pal: "aide", x: 25, y: 7, facing: "left",
        showIfFlag: "garante-beaten",
        lines: [
          "Shhh. Ero il CONTABILE di... tutti, in pratica.",
          "A est, oltre le boe, c'è un'isola che non esiste su nessun catasto: il PARADISO OFFSHORE.",
          "Col TRAGHETTO ci arrivi. Io non ti ho detto niente. Anzi, non ci siamo mai visti."
        ]
      }
    ]
  },

  // PARADISO OFFSHORE: isola post-game a est dello STRETTO (boe con
  // requiresFlag garante-beaten). Wild lv 38-45 con le prime catture selvatiche
  // di telecrate/pontimax/conteblob, bar-healer LIDO CAYMAN e il mini-boss
  // IL TESORIERE FANTASMA sull'altopiano (flag offshore-beaten).
  offshore: {
    id: "offshore",
    name: "PARADISO OFFSHORE",
    tiles: OFFSHORE_TILES,
    outdoor: true,
    music: "offshore",
    warps: [
      // Punta del molo: ritorno in TRAGHETTO allo STRETTO (approdo sul pilone
      // del ponte, MAI su acqua).
      { x: 2, y: 9, toMap: "stretto", toX: 14, toY: 8, facing: "up" },
      { x: 2, y: 10, toMap: "stretto", toX: 14, toY: 8, facing: "up" },
      // BAR "LIDO CAYMAN": porte sui 2 tile centrali dell'edificio.
      { x: 14, y: 4, toMap: "bar-offshore", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 15, y: 4, toMap: "bar-offshore", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      // ROTTA PER BRUXELLES: dalle boe a est (acqua) parte il traghetto per la
      // capitale UE. Contenuto end-game come l'offshore: stesso gate garante-beaten
      // (chi è qui l'ha già), ma serve anche aver appreso la rotta (flag hint-ue).
      {
        x: 28, y: 9, toMap: "bruxelles", toX: 14, toY: 13, facing: "up",
        requiresFlag: "garante-beaten",
        lockedLines: ["Un motoscafo diplomatico attende oltre le boe.", "'Rotta per BRUXELLES: solo per chi ha già la CONTROFIRMA del COLLE.'"]
      },
      {
        x: 28, y: 10, toMap: "bruxelles", toX: 15, toY: 13, facing: "up",
        requiresFlag: "garante-beaten",
        lockedLines: ["Un motoscafo diplomatico attende oltre le boe.", "'Rotta per BRUXELLES: solo per chi ha già la CONTROFIRMA del COLLE.'"]
      }
    ],
    encounterRate: 0.18,
    // Post-game lv 38-45 (mai oltre il level cap 55 del giocatore, audit C2/R42).
    // Prime catture selvatiche: telecrate, pontimax, conteblob (zona Dex).
    encounters: [
      { speciesId: "telecrate", weight: 26, minLv: 38, maxLv: 42 },
      { speciesId: "trumpon", weight: 18, minLv: 39, maxLv: 44 },
      { speciesId: "putingrad", weight: 14, minLv: 39, maxLv: 44 },
      { speciesId: "xipanda", weight: 14, minLv: 39, maxLv: 44 },
      { speciesId: "muskrat", weight: 12, minLv: 38, maxLv: 41 },
      { speciesId: "pontimax", weight: 10, minLv: 42, maxLv: 45 },
      { speciesId: "conteblob", weight: 5, minLv: 40, maxLv: 44 },
      { speciesId: "mattarellux", weight: 1, minLv: 45, maxLv: 45 }
    ],
    signs: [
      {
        x: 6, y: 9,
        lines: [
          "PARADISO OFFSHORE",
          "Capitali? Mai visti. Chiedere al mare.",
          "Pressione fiscale: 0%. Pressione dei SONDAGGI: altissima."
        ]
      }
    ],
    pickups: [
      { id: "pk-off-mojito", x: 10, y: 2, itemId: "mojito", qty: 1 },
      { id: "pk-off-schedona", x: 21, y: 4, itemId: "schedona", qty: 2 },
      { id: "pk-off-tessera", x: 26, y: 6, itemId: "tessera", qty: 1, hidden: true },
      { id: "pk-off-dir", x: 7, y: 5, itemId: "dirWhatever", qty: 1, hidden: true },
      // Hold item nascosto: GILET ANTIPROIETTILE, "collaudato in piazza".
      { id: "pk-off-gilet", x: 5, y: 12, itemId: "gilet", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-commercialista", pal: "aide", x: 8, y: 10, facing: "left",
        trainerId: "commercialista", sightRange: 3,
        lines: ["Qui ogni scontrino diventa una nota spese. Anche il tuo."]
      },
      {
        id: "tr-prestanome", pal: "influencer", x: 24, y: 12, facing: "left",
        trainerId: "prestanome", sightRange: 3,
        lines: ["Firmo tutto io. Capire, invece, non è compito mio."]
      },
      {
        // Il MINI-BOSS in cima all'altopiano: si dissolve dopo la sconfitta
        // (flag offshore-beaten, coerente con l'epilogo in WorldScene).
        id: "tr-tesoriere", pal: "boss", x: 24, y: 5, facing: "left",
        trainerId: "tesoriere", sightRange: 3, hideIfFlag: "offshore-beaten",
        lines: []
      },
      {
        id: "evasore-offshore", pal: "influencer", x: 12, y: 12, facing: "down",
        lines: [
          "Io? In vacanza. Da undici anni fiscali consecutivi.",
          "Il mio commercialista dice che tecnicamente non esisto. Che pace."
        ]
      },
      {
        // BANDITORE della COPPA DELLE POLTRONE: compare solo post-garante.
        id: "banditore-coppa", pal: "boss", x: 18, y: 10, facing: "down",
        coppa: true, showIfFlag: "garante-beaten",
        lines: []
      },
      {
        // SHERPA UE: svela la rotta per BRUXELLES (elezioni europee). Solo
        // post-garante; parlare imposta hint-ue (isDone della quest UE).
        id: "sherpa-ue", pal: "journalist", x: 25, y: 10, facing: "left",
        showIfFlag: "garante-beaten", setFlag: "hint-ue",
        lines: [
          "SHERPA UE: la vera partita non è a Roma. È a BRUXELLES.",
          "Oltre quelle boe c'è un motoscafo diplomatico: rotta per la capitale UE.",
          "Si vota per il PARLAMENTO. E LA COMMISSIONE non cede la poltrona a nessuno.",
          "Prendi il traghetto a est. Porta una squadra da lv 50+: LA COMMISSIONE non perdona."
        ]
      }
    ]
  },

  // BRUXELLES: capitale UE, gauntlet delle ELEZIONI EUROPEE (Round 41 narrativo).
  // End-game post garante-beaten, raggiungibile in traghetto dall'OFFSHORE. Wild
  // = roster UE (trumpon/putingrad/xipanda/macronfox/ursulax/zelenskir/bojoon) lv
  // 42-50. 4 allenatori eu-* + boss LA COMMISSIONE (in BOSS_TRAINER_IDS). Vittoria
  // sul boss = flag ue-beaten + TESSERA DORATA una-tantum.
  bruxelles: {
    id: "bruxelles",
    name: "BRUXELLES",
    tiles: BRUXELLES_TILES,
    outdoor: true,
    music: "bruxelles",
    warps: [
      // PALAZZO DELLA COMMISSIONE: porte DD centrali (12-13,4) -> interno.
      { x: 12, y: 4, toMap: "commissione", toX: 5, toY: 6, facing: "up" },
      { x: 13, y: 4, toMap: "commissione", toX: 6, toY: 6, facing: "up" },
      // Bar CAFFÈ SCHUMAN (centro cura): porte sui 2 tile centrali.
      { x: 10, y: 11, toMap: "bar-bruxelles", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 11, y: 11, toMap: "bar-bruxelles", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      // Traghetto di ritorno al PARADISO OFFSHORE: boe d'acqua a sud (approdo
      // sull'attracco offshore, mai su acqua). Serve la MN TRAGHETTO (già posseduta).
      { x: 14, y: 14, toMap: "offshore", toX: 27, toY: 9, facing: "left" },
      { x: 15, y: 14, toMap: "offshore", toX: 27, toY: 10, facing: "left" }
    ],
    encounterRate: 0.16,
    // Roster UE lv 42-50 (coerente con offshore 38-45 e col level cap 55). Qui le
    // specie europee trovano finalmente casa allo stato brado.
    encounters: [
      { speciesId: "macronfox", weight: 22, minLv: 42, maxLv: 46 },
      { speciesId: "bojoon", weight: 20, minLv: 42, maxLv: 45 },
      { speciesId: "zelenskir", weight: 16, minLv: 43, maxLv: 47 },
      { speciesId: "ursulax", weight: 14, minLv: 44, maxLv: 48 },
      { speciesId: "xipanda", weight: 12, minLv: 45, maxLv: 49 },
      { speciesId: "putingrad", weight: 10, minLv: 45, maxLv: 49 },
      { speciesId: "trumpon", weight: 6, minLv: 46, maxLv: 50 }
    ],
    signs: [
      {
        x: 18, y: 11,
        lines: [
          "PARLAMENTO EUROPEO - AULA PLENARIA",
          "Sessione a Bruxelles. Poi a Strasburgo. Poi di nuovo a Bruxelles.",
          "Il trasloco mensile è previsto dai Trattati. Le poltrone viaggiano in camion."
        ]
      }
    ],
    pickups: [
      { id: "pk-brux-schedona", x: 3, y: 9, itemId: "schedona", qty: 2 },
      // Tesoro nascosto nell'erba UE: DIRETTIVA rara (MULTA UE, ramo istituzione).
      { id: "pk-brux-dir", x: 24, y: 9, itemId: "dirMulta", qty: 1, hidden: true }
    ],
    npcs: [
      // ---- GAUNTLET UE (4 allenatori sul viale) ----
      {
        id: "tr-eucommissario", pal: "guard", x: 7, y: 7, facing: "right",
        trainerId: "eu-commissario", sightRange: 3,
        lines: ["Ho un portafoglio: la CONCORRENZA. E tu mi fai concorrenza sleale."]
      },
      {
        id: "tr-eulobby", pal: "influencer", x: 23, y: 7, facing: "left",
        trainerId: "eu-lobby", sightRange: 3,
        lines: ["Rue de la Loi è la mia seconda casa. La prima è il corridoio."]
      },
      {
        id: "tr-eurelatore", pal: "aide", x: 7, y: 9, facing: "right",
        trainerId: "eu-relatore", sightRange: 3,
        lines: ["Il mio emendamento ha 400 pagine di allegati. Buona lettura."]
      },
      {
        id: "tr-eurodeputato", pal: "journalist", x: 21, y: 9, facing: "left",
        trainerId: "eu-eurodeputato", sightRange: 3,
        lines: ["Presente in aula il 12% delle volte. Ma alle foto, sempre."]
      },
      // ---- NPC ambientale d'ingresso: bussola narrativa sull'attracco ----
      {
        id: "hostess-ue", pal: "granny", x: 16, y: 13, facing: "left",
        lines: [
          "HOSTESS DI PARTITO: benvenuto a BRUXELLES!",
          "Il PARLAMENTO è a sinistra, la COMMISSIONE lassù in fondo al viale.",
          "Vinci il gauntlet e prenditi la poltrona europea. In bocca al lupo."
        ]
      }
    ]
  },

  // Interno del Palazzo della Commissione: LA COMMISSIONE presidia in fondo alla
  // scalinata; l'uscita (zerbino) riporta a BRUXELLES davanti alle porte DD.
  commissione: {
    id: "commissione",
    name: "PALAZZO DELLA COMMISSIONE",
    tiles: COMMISSIONE_TILES,
    outdoor: false,
    music: "palazzo",
    warps: [
      { x: 5, y: 7, toMap: "bruxelles", toX: 12, toY: 5, facing: "down" },
      { x: 6, y: 7, toMap: "bruxelles", toX: 13, toY: 5, facing: "down" }
    ],
    signs: [
      { x: 3, y: 0, lines: ["Motto sopra la porta:", "'IN VARIETATE CONCORDIA.' Cioè: litighiamo, ma in 24 lingue."] }
    ],
    pickups: [],
    npcs: [
      {
        id: "commissione", pal: "boss", x: 5, y: 1, facing: "down",
        trainerId: "commissione", sightRange: 5, hideIfFlag: "ue-beaten",
        lines: []
      },
      {
        id: "commissione-after", pal: "boss", x: 2, y: 1, facing: "down", showIfFlag: "ue-beaten",
        lines: [
          "LA COMMISSIONE: complimenti, hai vinto le elezioni. Ora inizia il difficile.",
          "Riunioni, trilogo, comitatologia. Rimpiangerai i comizi.",
          "La poltrona è tua. Il REGOLAMENTO, però, resta mio. Come sempre."
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
      // Spostati da (0,1)/(11,1): erano fiancheggiati da macchine `k` e muri `A`
      // (illeggibili). (3,0)/(8,0) hanno pavimento sotto → leggibili da (3,1)/(8,1).
      { x: 3, y: 0, lines: ["Albo dei governi:", "68 in 80 anni. Nuovo record europeo."] },
      { x: 8, y: 0, lines: ["Registro visite:", "'Lobbista, lobbista, lobbista, idraulico, lobbista.'"] }
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
      },
      {
        // MATTARELLUX (Round 40): il GARANTE SUPREMO in persona, catturabile solo
        // dopo aver superato il garante. Prima era nel dex ma di fatto irraggiungibile.
        id: "mattarellux-legend", pal: "boss", x: 2, y: 4, facing: "down",
        showIfFlag: "garante-beaten", hideIfFlag: "legend-mattarellux-gone",
        legendary: {
          speciesId: "mattarellux",
          level: 49,
          flag: "legend-mattarellux-gone",
          lines: [
            "USCIERE DEL COLLE: c'è ancora qualcuno che vuole conoscerti.",
            "Le porte del Quirinale si socchiudono. Nessun clamore, solo garbo.",
            "Un'aura istituzionale riempie la sala: MATTARELLUX ti osserva, paziente.",
            "\"Volevo andare in pensione. Ma prima, mettiamoci alla prova.\""
          ],
          afterRunLines: [
            "MATTARELLUX annuisce e torna ai suoi doveri, senza rancore.",
            "L'usciere sorride: 'Il GARANTE SUPREMO sa aspettare. Torna quando vuoi.'"
          ],
          afterGoneLines: [
            "La sala presidenziale è di nuovo silenziosa e ordinata.",
            "MATTARELLUX è registrato nel tuo POLITICDEX. Con tutti gli onori."
          ]
        },
        lines: ["Questa sala si apre solo per chi ha già garantito la Costituzione."]
      }
    ]
  },

  // ----------------------------------------------------- CASE VISITABILI -----

  // BORGO — casa tua.
  home: houseMap("home", "CASA TUA", "borgo", 23, 13, [
    {
      id: "home-mom", pal: "granny", x: 7, y: 2, facing: "down", setFlag: "talked-mom",
      gift: {
        itemId: "divisa", qty: 1, flag: "gift-divisa",
        lines: [
          "MAMMA: torni a casa solo quando ti serve qualcosa, come i partiti a gennaio.",
          "Tieni la DIVISA EQUA: spartisce i PUNTI CONSENSO con TUTTA la squadra.",
          "Anche chi resta in panchina cresce. Equità, almeno tra i tuoi POLITICMON!",
          "Ora vai a prenderti quel PALAZZO. E mangia, che a digiuno non si vincono i ballottaggi."
        ]
      },
      lines: [
        "MAMMA: la DIVISA EQUA ce l'hai. Nessuno resta indietro... in teoria.",
        "Ho rifatto il letto e stirato la fascia tricolore. Vai a prenderti quel PALAZZO!"
      ]
    }
  ], {
    variant: 2,
    // Spostato da (9,1): lì era sepolto nel blocco scaffali `b` (illeggibile).
    // (5,0) è muro di fondo con pavimento sotto → leggibile da (5,1) in alto.
    signs: [{ x: 5, y: 0, lines: ["Diploma di MAMMA POLITICA dell'anno.", "Conferito da: se stessa."] }],
    pickups: [{ id: "home-pk", x: 4, y: 1, itemId: "caffe", qty: 1 }]
  }),

  // BORGO — circolo del paese.
  circolo: houseMap("circolo", "CIRCOLO DEL BORGO", "borgo", 6, 19, [
    {
      id: "circolo-anziano", pal: "granny", x: 1, y: 3, facing: "right",
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
  attico: houseMap("attico", "ATTICO INFLUENCER", "mediopoli", 6, 19, [
    {
      id: "attico-influencer", pal: "influencer", x: 5, y: 2, facing: "down", setFlag: "talked-influencer",
      lines: [
        "Sto girando un reel: 'cinque promesse che non manterrò, la terza vi sorprenderà'.",
        "Il consenso? Si fa coi like, non con le idee. Idee è un account che non seguo."
      ]
    }
  ], {
    variant: 0,
    pickups: [{ id: "attico-pk", x: 4, y: 1, itemId: "schedona", qty: 1 }]
  }),

  // MEDIOPOLI — redazione del TG.
  redazione: houseMap("redazione", "REDAZIONE DEL TG", "mediopoli", 23, 17, [
    {
      id: "redaz-direttore", pal: "journalist", x: 1, y: 2, facing: "right",
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
  lobbystudio: houseMap("lobbystudio", "STUDIO DI LOBBYING", "eurotown", 6, 10, [
    {
      id: "lobby-capo", pal: "boss", x: 6, y: 2, facing: "down",
      lines: [
        "Una lobby? Che parolaccia. Diciamo 'consulenza per il bene comune'.",
        "Il bene di chi? Dettaglio tecnico. Firma qui, qui e qui."
      ]
    }
  ], { variant: 0 }),

  // EUROTOWN — bistrot della burocrazia.
  bistrot: houseMap("bistrot", "BISTROT DELLE DIRETTIVE", "eurotown", 22, 10, [
    {
      id: "bistrot-funz", pal: "professor", x: 4, y: 2, facing: "left",
      lines: [
        "La DIRETTIVA 2024/banane stabilisce la curvatura massima del consenso.",
        "Allegato B, comma 12: ogni promessa va tradotta in 24 lingue prima di romperla."
      ]
    }
  ], {
    variant: 1,
    pickups: [{ id: "bistrot-pk", x: 4, y: 1, itemId: "maalox", qty: 1 }]
  }),

  // CAPUT MUNDI — salotto romano.
  salotto: houseMap("salotto", "SALOTTO ROMANO", "capitale", 5, 19, [
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
  retroscena: houseMap("retroscena", "COVO DEI RETROSCENISTI", "capitale", 25, 19, [
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

  // STRETTO — covo della "famiglia": fazione satirica del clientelismo.
  covo: houseMap("covo", "RETROBOTTEGA DEL PADRINO", "stretto", 21, 3, [
    {
      id: "covo-padrino", pal: "boss", x: 5, y: 3, facing: "down", mafia: true,
      lines: [
        "IL PADRINO: ti aspettavo, candidato. Una cosa la dico sempre:",
        "il consenso è come l'acqua, va incanalato. Noi sappiamo dove.",
        "Favori, scorciatoie, qualche... cortesia. Ma certe cose si pagano due volte."
      ]
    },
    {
      id: "covo-picciotto", pal: "aide", x: 2, y: 4, facing: "right",
      lines: ["Il PADRINO riceve tutti. Anche chi poi se ne pente. Specialmente quelli."]
    }
  ], {
    variant: 1,
    signs: [{ x: 8, y: 1, lines: ["'Una mano lava l'altra.'", "Qui ce ne sono parecchie, di mani."] }]
  }),

  // STRETTO — chiosco del ponte.
  chiosco: houseMap("chiosco", "CHIOSCO DEL PONTE", "stretto", 11, 3, [
    {
      id: "chiosco-oste", pal: "barista", x: 4, y: 2, facing: "left",
      lines: [
        "Vendo granite e plastici del PONTE da trent'anni. Il ponte non c'è, le granite sì.",
        "Tutti chiedono: 'quando lo finite?'. Io rispondo: 'quale, il ponte o la granita?'."
      ]
    }
  ], {
    variant: 1,
    pickups: [{ id: "chiosco-pk", x: 4, y: 1, itemId: "mojito", qty: 1 }]
  }),

  // ------------------------------------------------ BAR SPORT (centri cura) ---
  // Un "Pokémon Center" tematico per città: entri, il barista dietro al bancone
  // ti rimette in sesto la squadra. Sostituiscono i vecchi barista-in-piazza.
  "bar-borgo": barMap("bar-borgo", "BAR SPORT BORGO", "borgo", 21, 18),
  "bar-medio": barMap("bar-medio", "BAR SPORT MEDIOPOLI", "mediopoli", 7, 16),
  "bar-euro": barMap("bar-euro", "CAFFÈ EUROPA", "eurotown", 8, 13),
  "bar-cap": barMap("bar-cap", "GRAN CAFFÈ ROMANO", "capitale", 24, 8),
  "bar-stretto": barMap("bar-stretto", "CHIRINGUITO PAPEETE", "stretto", 15, 5),
  "bar-offshore": barMap("bar-offshore", "LIDO CAYMAN", "offshore", 15, 5),
  "bar-bruxelles": barMap("bar-bruxelles", "CAFFÈ SCHUMAN", "bruxelles", 10, 12)
};

// Punto di risveglio dopo un KO totale: la cella calpestabile davanti al BAR
// SPORT di ogni città (coincide col warp d'uscita del bar). Si respawna al bar
// dell'ultima città visitata (state.lastBar), non sempre a BORGO.
export const BAR_RESPAWN: Record<string, { x: number; y: number }> = {
  borgo: { x: 21, y: 18 },
  mediopoli: { x: 7, y: 16 },
  eurotown: { x: 8, y: 13 },
  capitale: { x: 24, y: 8 },
  stretto: { x: 14, y: 5 },
  offshore: { x: 15, y: 5 },
  bruxelles: { x: 10, y: 12 }
};

// Posizioni delle tre schede starter sul tavolo del laboratorio.
export const STARTER_SPOTS: Array<{ x: number; y: number; speciesId: string }> = [
  { x: 3, y: 3, speciesId: "giorgetta" },
  { x: 5, y: 3, speciesId: "ellyna" },
  { x: 7, y: 3, speciesId: "renzino" }
];
