import type { MapDef, NpcDef, PickupDef, SignDef } from "./types";

// ---------------------------------------------------------------- BORGO URNE

export const BORGO_TILES = [
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
export const ROUTE1_TILES = [
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
// NB: la metà sinistra era irraggiungibile dall'ingresso (muro continuo di
// A/R/S che tagliava la grotta in due). Aperti 3 varchi — (4,4), (5,4) e (9,5)
// da A→p — così TUTTE le celle calpestabili sono connesse (verificato con un
// flood-fill dall'entry). Cambiando i tile qui, ri-verificare la connettività.
export const GROTTA1_TILES = [
  "AAAAAAAAAAAAAAAAAAAA",
  "AppppppppAAAAppppOpA",
  "ApSRRAp~pAAAASSRpppA",
  "Ap~pppp~ppppppsppppA",
  "AppppAAASRRRRAAApppA",
  "AAp~pppppppppAAApppA",
  "ApppAppSRRRppA~ppppA",
  "ApAAAAppp~pppAAAAppA",
  "ApppppSSRAAAAppppppA",
  "AAAApppppppppp~pRRpA",
  "AppppAppRSSAAAAppppA",
  "Ap~ppApppppppppppppA",
  "ASRRAAApRSSRAAApSRpA",
  "AAAAAppccppppppppppA",
  "AAAAAAAAAAAAAAAAAAAA"
];

// Mini-zona satirica oltre la grotta: neve, taiga, cumuli-encounter e un varco
// di rientro. Non è una città nuova: è un avamposto-meme opzionale.
export const OBLAST_MEME_TILES = [
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
export const ROUTE2_TILES = [
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
export const ROUTE3_TILES = [
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
export const GROTTA2_TILES = [
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

export const MEDIOPOLI_TILES = [
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

export const EUROTOWN_TILES = [
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

// Caput Mundi cresce in basso (r19-r24) per ospitare il PORTO come una vera BAIA:
// banchina di sabbia larga (`z`), una fascia di MOLO di legno orizzontale (`q`) su
// tutto il fronte, un BACINO d'acqua ampio (22 celle `w`, non più un rigagnolo),
// un pontile che sporge fino alla punta d'imbarco e una BARCA ormeggiata (`X`).
// Così si legge a colpo d'occhio come porto/banchina. Righe 0-18 IDENTICHE
// all'originale → zero regressioni. Varco route3 (col 13-16) unica apertura sud (r24).
export const CAPITALE_TILES = [
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
  "TT..=========.============..TT",
  "TT.zqqqqqqqz.====...........TT",
  "TT.wwXqwwwwz.====TTTTTTTTTTTTT",
  "TT.wwwwwwwwz.====TTTTTTTTTTTTT",
  "TT.wwwwwwwwz.====TTTTTTTTTTTTT",
  "TTTTTTTTTTTTT====TTTTTTTTTTTTT"
];

// ---------------------------------------------------- STRETTO DI MESSINA
// Spiaggia stile Papeete + ponte eternamente incompiuto che finisce in mare.

// Lo STRETTO: spiaggia Papeete a nord col bar, poi un CANALE d'acqua (righe 6-7)
// attraversato da un MOLO DI LEGNO (`q`, col 13-14) che collega la spiaggia al
// PONTE: arrivando dalla capitale SBARCHI SUL MOLO (13,6), a piedi, non in mezzo
// all'acqua. Per RIPARTIRE entri nell'acqua ai lati del molo (12,6 / 15,6) col
// TRAGHETTO. Da lì il ponte scende fino al cantiere e al Capitano.
// APPRODO NAVALE + CAPITANO CANCELLO OBBLIGATORIO (layout pulito).
// Lettura a colonna unica, tutto in verticale sulla col 14:
// - ARRIVO in mare aperto in basso (14,16), traghetto auto-attivo.
// - PONTE single-file 'j' su col 14, fiancheggiato da tralicci 'J' (col 13 e 15) e
//   chiuso a nord dal muro di scogli '^' su tutta la riga 8 tranne la bocca (col 13-14).
// - IL CAPITANO a (14,12) facing "down" chiude il varco: sbarcando dal mare entri
//   subito nel suo cono di vista → fight inevitabile, non aggirabile.
// - PORTO = pontile 'qqq' (col 12-14, righe 6-7) oltre il ponte, poi spiaggia/bar/edifici.
// - RITORNO: UNA sola darsena con marker persistente sull'acqua a (11,14).
//   Niente più warp di ritorno sparsi: UN solo mare, UN solo imbarco.
export const STRETTO_TILES = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.......@@@@......xxxx.....TT",
  "TT..~~~~.mddm.s....mdd^^^^^.TT",
  "TT..~~~~.====eQQe..===^...^.TT",
  "TT..~~~~...==mddm..===^...^.TT",
  "TT...s.zzzz===========^^l^^.TT",
  "TTzzzzzzzzzzzzqzzzzzzzzzzzzzTT",
  "TTzzzzzzzzzzzzqzzzzzzzzzzzzzTT",
  "^^^^^^^^^^^^^JjJ^^^^^^^^^^^^^^",
  "wwwwwwwwwwwwwJjJwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjJwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjJwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjJwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjJwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwJjJwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwjwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwwwwwwwwwwwwwwwww"
];

// ---------------------------------------------------- PARADISO OFFSHORE
// Isola post-game (flag garante-beaten) a est dello STRETTO: ci si arriva col
// TRAGHETTO dalle boe. Molo a ovest (j), bar LIDO CAYMAN al centro-nord,
// due campi d'erba alta e un ALTOPIANO di scogli (^) a nord-est con un'unica
// scala (l): in cima custodisce i conti IL TESORIERE FANTASMA.
export const OFFSHORE_TILES = [
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
export const BRUXELLES_TILES = [
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
export const COMMISSIONE_TILES = [
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

export const LAB_TILES = [
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

export const GYM_TILES = [
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

export const MARKET_TILES = [
  "AAAAAAAAAA",
  "AbbbbbbbbA",
  "AppppppppA",
  "AppppppppA",
  "AppppppppA",
  "AppppccppA",
  "AAAAAAAAAA"
];

// Scalinata della Consulta: corridoio cerimoniale, tre giudici e il Garante.
export const COLLE_TILES = [
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

export const PALAZZO_TILES = [
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

export function gymMap(
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
      // Allineati ai tappeti `cc` della riga 7 ("AppppccppA" → x 5 e 6): prima
      // erano a 4/5 e il tappeto destro non faceva uscire.
      { x: 5, y: 7, toMap: city, toX: doorX, toY: doorY, facing: "down" },
      { x: 6, y: 7, toMap: city, toX: doorX, toY: doorY, facing: "down" }
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

export function marketMap(id: string, city: string, doorX: number, doorY: number): MapDef {
  return {
    id,
    name: "DISCOUNT ELETTORALE",
    tiles: MARKET_TILES,
    outdoor: false,
    music: "interior",
    warps: [
      // Allineati ai tappeti `cc` ("AppppccppA" → x 5 e 6): prima erano a 4/5
      // e il tappeto destro non faceva uscire.
      { x: 5, y: 5, toMap: city, toX: doorX, toY: doorY, facing: "down" },
      { x: 6, y: 5, toMap: city, toX: doorX, toY: doorY, facing: "down" }
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
export const HOUSE_TILES_A = [
  "AAAAAAAAAA",
  "ALLApppbbA",
  "ALLAppptpA",
  "ApppppptpA",
  "AppPpppppA",
  "AppppccppA",
  "AAAAAAAAAA"
];

export const HOUSE_TILES_B = [
  "AAAAAAAAAA",
  "AbbbppLLpA",
  "ApttpLLppA",
  "AptttppppA",
  "AppppppPpA",
  "AppppccppA",
  "AAAAAAAAAA"
];

export const HOUSE_TILES_C = [
  "AAAAAAAAAAAA",
  "ALLAppppbbbA",
  "ALLApttpbbbA",
  "AppppttppppA",
  "AppppppppPpA",
  "AppPpppppppA",
  "AppppccppppA",
  "AAAAAAAAAAAA"
];

export const HOUSE_LAYOUTS = [HOUSE_TILES_A, HOUSE_TILES_B, HOUSE_TILES_C];

export function insideEntry(tiles: string[]): { x: number; y: number } {
  const exitY = tiles.length - 2;
  const row = tiles[exitY];
  const cx = Math.max(0, row.indexOf("c"));
  return { x: cx, y: Math.max(1, exitY - 1) };
}

// Genera l'interno di una casa. `variant` sceglie la piantina; `door` è la
// cella della città su cui si riemerge uscendo.
export function houseMap(
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
export const BAR_TILES = [
  "AAAAAAAAAAAA",
  "AbbbbbbbbbbA",
  "AhhhhhhhhhhA",
  "AppppppppppA",
  "AptpppppptpA",
  "AppppppppPpA",
  "AppppccppppA",
  "AAAAAAAAAAAA"
];

export const LAB_ENTRY = insideEntry(LAB_TILES);
export const GROTTA1_ENTRY = insideEntry(GROTTA1_TILES);
export const GROTTA2_ENTRY = insideEntry(GROTTA2_TILES);
export const GYM_ENTRY = insideEntry(GYM_TILES);
export const MARKET_ENTRY = insideEntry(MARKET_TILES);
export const HOUSE_ENTRY_A = insideEntry(HOUSE_TILES_A);
export const HOUSE_ENTRY_B = insideEntry(HOUSE_TILES_B);
export const HOUSE_ENTRY_C = insideEntry(HOUSE_TILES_C);
export const BAR_ENTRY = insideEntry(BAR_TILES);

// Genera l'interno di un BAR SPORT con il barista che cura al bancone.
export function barMap(id: string, name: string, city: string, doorX: number, doorY: number): MapDef {
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

// LUCA — la GUIDA ricorrente. Un Luca per città, al centro, con menù di domande
// contestuali. `cityLines` = risposta specifica sulla città; gli altri topic
// (come si gioca, online) sono condivisi. Riusa nameplate+guide (vedi NpcDef).
export function lucaGuide(
  cityName: string,
  x: number,
  y: number,
  cityLines: string[],
  hint: string[]
): NpcDef {
  return {
    id: "luca-guida",
    pal: "professor",
    x,
    y,
    facing: "down",
    nameplate: "LUCA - GUIDA",
    guide: {
      intro: [
        `Ciao, sono LUCA! Ci becchiamo di nuovo, stavolta a ${cityName}.`,
        "Sono la guida ufficiale: chiedimi pure quello che ti serve."
      ],
      prompt: "SU COSA TI SERVE UNA MANO?",
      topics: [
        { label: `INFO SU ${cityName}`, lines: cityLines },
        { label: "COSA FACCIO QUI", lines: hint },
        {
          label: "COME SI GIOCA",
          lines: [
            "Indebolisci i CANDIDATI in lotta, poi lancia una SCHEDA ELETTORALE per catturarli.",
            "Tieni d'occhio i SONDAGGI (barra in alto): salgono con le vittorie e sbloccano evoluzioni.",
            "Attiva la GUIDA nel menu (freccia gialla) se non sai dove andare."
          ]
        },
        {
          label: "GIOCARE ONLINE",
          lines: [
            "Menu PAUSA -> ONLINE: vedi gli altri giocatori nella tua zona.",
            "Chat di zona, scambi e sfide con chi ti è accanto. Tutto peer-to-peer."
          ]
        }
      ]
    }
  };
}
