import type { PolType } from "./poltypes";

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spc: number;
  spd: number;
}

// Regola di evoluzione: per livello, per oggetto, o ramificata sui SONDAGGI.
// La prima regola soddisfatta vince: l'ordine nell'array conta.
export interface EvolutionRule {
  id: string;
  level?: number; // si attiva al level-up una volta raggiunto questo livello
  item?: string; // si attiva usando l'oggetto indicato dalla borsa
  minSondaggi?: number; // richiede gradimento >= soglia (ramo "governista")
  maxSondaggi?: number; // richiede gradimento <= soglia (ramo "opposizione")
}

export interface Species {
  id: string;
  dexNum: number;
  name: string;
  category: string; // es. "POLITICMON FIAMMA"
  types: PolType[];
  base: BaseStats;
  catchRate: number; // 0-255, più alto = più facile
  expYield: number;
  learnset: Array<[number, string]>; // [livello, moveId]
  evolutions?: EvolutionRule[];
  dexLine: string;
}

const S = (s: Species) => s;

export const SPECIES: Record<string, Species> = {
  giorgetta: S({
    id: "giorgetta", dexNum: 1, name: "GIORGETTA", category: "FIAMMELLA",
    types: ["DESTRA"],
    base: { hp: 50, atk: 58, def: 55, spc: 56, spd: 50 },
    catchRate: 45, expYield: 62,
    learnset: [[1, "radici"], [1, "comizio"], [1, "slogan"], [5, "iosonogiorgia"], [11, "giravolta"], [13, "blocconavale"]],
    evolutions: [{ id: "giorgiagon", level: 16 }],
    dexLine: "URLA IL PROPRIO NOME OGNI MATTINA ALLO SPECCHIO. SE NESSUNO LA INTERROMPE, SI EVOLVE."
  }),
  giorgiagon: S({
    id: "giorgiagon", dexNum: 2, name: "GIORGIAGON", category: "DRAGO UNDERDOG",
    types: ["DESTRA"],
    base: { hp: 76, atk: 84, def: 76, spc: 95, spd: 75 },
    catchRate: 25, expYield: 180,
    learnset: [[1, "comizio"], [1, "radici"], [16, "fiammatricolore"], [19, "pacchiafinita"], [22, "blocconavale"], [28, "decreto"]],
    dexLine: "DRAGO UNDERDOG. PIÙ LO CRITICANO A BRUXELLES, PIÙ LA SUA FIAMMA TRICOLORE DIVAMPA."
  }),
  ellyna: S({
    id: "ellyna", dexNum: 3, name: "ELLYNA", category: "GATTINA ROSSA",
    types: ["SINISTRA"],
    base: { hp: 49, atk: 54, def: 57, spc: 58, spd: 52 },
    catchRate: 45, expYield: 62,
    learnset: [[1, "corteo"], [1, "comizio"], [1, "ztl"], [5, "greenwashing"], [11, "sciopero"], [13, "scissione"]],
    evolutions: [{ id: "schleinix", level: 16 }],
    dexLine: "GATTINA GENTILE. PASSA PIÙ TEMPO A DISCUTERE CON LE ALTRE ELLYNA CHE COL NEMICO."
  }),
  schleinix: S({
    id: "schleinix", dexNum: 4, name: "SCHLEINIX", category: "VOLPE ARMOCROMICA",
    types: ["SINISTRA", "VERDE"],
    base: { hp: 74, atk: 74, def: 78, spc: 98, spd: 74 },
    catchRate: 25, expYield: 180,
    learnset: [[1, "corteo"], [1, "ztl"], [16, "greenwashing"], [20, "sciopero"], [26, "scissione"]],
    dexLine: "SCEGLIE I COLORI CON L'ARMOCROMISTA. LA SUA MOSSA PIÙ FORTE COLPISCE ANCHE IL SUO PARTITO."
  }),
  renzino: S({
    id: "renzino", dexNum: 5, name: "RENZINO", category: "LUCERTOLA SVELTA",
    types: ["CENTRO"],
    base: { hp: 49, atk: 57, def: 52, spc: 50, spd: 62 },
    catchRate: 45, expYield: 62,
    learnset: [[1, "giravolta"], [1, "comizio"], [1, "promessa"], [5, "terzopolo"], [11, "inciucio"], [13, "staisereno"]],
    evolutions: [{ id: "renzilla", level: 16 }],
    dexLine: "SORRIDE SEMPRE. SE GLI STRINGI LA ZAMPA, CONTA LE DITA E POI FONDA UN PARTITO NUOVO."
  }),
  renzilla: S({
    id: "renzilla", dexNum: 6, name: "RENZILLA", category: "KAIJU ROTTAMA",
    types: ["CENTRO"],
    base: { hp: 71, atk: 88, def: 72, spc: 80, spd: 90 },
    catchRate: 25, expYield: 180,
    learnset: [[1, "giravolta"], [1, "terzopolo"], [16, "staisereno"], [20, "rottamazione"], [22, "inciucio"], [28, "editoriale"]],
    dexLine: "DISTRUGGE GOVERNI CHE HA COSTRUITO LUI STESSO. DICE CHE LO FA PER IL BENE DEL PAESE."
  }),
  salvinott: S({
    id: "salvinott", dexNum: 7, name: "SALVINOTT", category: "CASTORINO LIVE",
    types: ["POPULISMO"],
    base: { hp: 50, atk: 56, def: 42, spc: 40, spd: 46 },
    catchRate: 190, expYield: 55,
    learnset: [[1, "comizio"], [3, "slogan"], [7, "citofonata"], [12, "ruspa"]],
    evolutions: [{ id: "salvinator", level: 18 }],
    dexLine: "CUCCIOLO DA COMIZIO. FA UNA DIRETTA SOCIAL ANCHE QUANDO DORME."
  }),
  salvinator: S({
    id: "salvinator", dexNum: 8, name: "SALVINATOR", category: "CASTORONE BALNEARE",
    types: ["POPULISMO", "DESTRA"],
    base: { hp: 75, atk: 88, def: 62, spc: 58, spd: 68 },
    catchRate: 60, expYield: 160,
    learnset: [[1, "ruspa"], [1, "citofonata"], [15, "noncene"], [18, "mojito"], [23, "blocconavale"], [28, "vaffa"]],
    evolutions: [{ id: "capitanone", item: "tessera" }],
    dexLine: "SI INDEBOLISCE SE RESTA TROPPO AL MINISTERO. RECUPERA TUTTI I PV CON UN MOJITO IN SPIAGGIA."
  }),
  grillix: S({
    id: "grillix", dexNum: 9, name: "GRILLIX", category: "GRILLO URLANTE",
    types: ["POPULISMO", "VERDE"],
    base: { hp: 55, atk: 62, def: 50, spc: 72, spd: 82 },
    catchRate: 90, expYield: 120,
    learnset: [[1, "comizio"], [5, "monopattino"], [9, "slogan"], [14, "greenwashing"], [19, "vaffa"]],
    // Ramo nei SONDAGGI: popolare -> governo, impopolare -> opposizione urlante.
    evolutions: [
      { id: "movimenton", level: 22, minSondaggi: 50 },
      { id: "vaffenix", level: 22 }
    ],
    dexLine: "GRILLO PARLANTE MOLTO ARRABBIATO. UNA VOLTA GRIDAVA UNA PAROLA SOLA: ORA GRIDA E BASTA."
  }),
  contemorfo: S({
    id: "contemorfo", dexNum: 10, name: "CONTEMORFO", category: "BLOB ELEGANTE",
    types: ["SINISTRA", "POPULISMO"],
    base: { hp: 62, atk: 50, def: 72, spc: 76, spd: 45 },
    catchRate: 100, expYield: 130,
    learnset: [[1, "comizio"], [6, "pochette"], [10, "inciucio"], [15, "telepromessa"], [21, "conferenza"]],
    evolutions: [{ id: "conteblob", level: 18 }],
    dexLine: "BLOB ELEGANTISSIMO. CAMBIA FORMA, ALLEATI E CONVINZIONI SENZA PERDERE MAI LA POCHETTE."
  }),
  calendauro: S({
    id: "calendauro", dexNum: 11, name: "CALENDAURO", category: "SAURO SLIDE",
    types: ["TECNO", "CENTRO"],
    base: { hp: 58, atk: 55, def: 76, spc: 78, spd: 42 },
    catchRate: 100, expYield: 130,
    learnset: [[1, "grafico"], [6, "giravolta"], [11, "dossier"], [16, "spread"], [22, "terzopolo"]],
    evolutions: [{ id: "calendrone", level: 18 }],
    dexLine: "SAURO TECNICO. TI MOSTRA UN GRAFICO A TORTA ANCHE SE GLI HAI CHIESTO SOLO CHE ORE SONO."
  }),
  vannaccix: S({
    id: "vannaccix", dexNum: 12, name: "VANNACCIX", category: "ORSO CAPOVOLTO",
    types: ["DESTRA"],
    base: { hp: 66, atk: 86, def: 60, spc: 40, spd: 56 },
    catchRate: 75, expYield: 140,
    learnset: [[1, "comizio"], [7, "radici"], [12, "mondocontrario"], [18, "blocconavale"]],
    evolutions: [{ id: "generorso", level: 20 }],
    dexLine: "VIVE A TESTA IN GIÙ E SOSTIENE CHE SONO TUTTI GLI ALTRI A STARE AL CONTRARIO."
  }),
  tajanide: S({
    id: "tajanide", dexNum: 13, name: "TAJANIDE", category: "COLOMBA PLACIDA",
    types: ["CENTRO", "DESTRA"],
    base: { hp: 56, atk: 45, def: 66, spc: 66, spd: 58 },
    catchRate: 120, expYield: 110,
    learnset: [[1, "comizio"], [5, "promessa"], [10, "conferenza"], [16, "moralsuasion"], [22, "inciucio"]],
    evolutions: [{ id: "tajacolomba", level: 18 }],
    dexLine: "COLOMBA MITISSIMA. NESSUNO L'HA MAI VISTA ARRABBIATA. QUALCUNO DUBITA L'ABBIA MAI VISTA SVEGLIA."
  }),
  berlusconix: S({
    id: "berlusconix", dexNum: 14, name: "BERLUSCONIX", category: "BISCIONE LEGGENDARIO",
    types: ["MEDIA", "DESTRA"],
    base: { hp: 80, atk: 70, def: 65, spc: 105, spd: 85 },
    catchRate: 8, expYield: 240,
    learnset: [[1, "tweet"], [1, "telepromessa"], [12, "conferenza"], [18, "editoriale"], [25, "bunga"]],
    dexLine: "BISCIONE LEGGENDARIO. NON APPARE NELL'ERBA: ENTRA IN SCENA SOLO QUANDO LO SHARE È ABBASTANZA ALTO."
  }),
  draghimon: S({
    id: "draghimon", dexNum: 15, name: "DRAGHIMON", category: "DRAGO DEI MERCATI",
    types: ["TECNO", "ISTITUZIONE"],
    base: { hp: 85, atk: 75, def: 90, spc: 115, spd: 80 },
    catchRate: 10, expYield: 250,
    learnset: [[1, "spread"], [1, "moralsuasion"], [15, "dossier"], [20, "fiducia"], [26, "whatever"]],
    dexLine: "VIENE EVOCATO SOLO NELLE CRISI. SUSSURRA 'WHATEVER IT TAKES' E LO SPREAD SCAPPA TERRORIZZATO."
  }),
  mattarellux: S({
    id: "mattarellux", dexNum: 16, name: "MATTARELLUX", category: "GARANTE SUPREMO",
    types: ["ISTITUZIONE"],
    base: { hp: 90, atk: 70, def: 95, spc: 100, spd: 70 },
    catchRate: 3, expYield: 255,
    learnset: [[1, "moralsuasion"], [1, "fiducia"], [18, "aureola"], [24, "decreto"], [30, "scioglimento"]],
    dexLine: "GARANTE SUPREMO. VOLEVA SOLO ANDARE IN PENSIONE: LO HANNO RIELETTO ALL'UNANIMITÀ."
  }),
  trumpon: S({
    id: "trumpon", dexNum: 17, name: "TRUMPON", category: "TYCOON URLANTE",
    types: ["POPULISMO", "MEDIA"],
    base: { hp: 85, atk: 95, def: 70, spc: 90, spd: 75 },
    catchRate: 8, expYield: 240,
    learnset: [[1, "comizio"], [1, "covfefe"], [16, "tweet"], [22, "dazilampo"], [28, "editoriale"]],
    dexLine: "COSTRUISCE MURI E LI FA PAGARE AGLI ALTRI. IL SUO CIUFFO RESISTE AL VENTO E ALLE SMENTITE."
  }),
  putingrad: S({
    id: "putingrad", dexNum: 18, name: "PUTINGRAD", category: "ZAR D'INVERNO",
    types: ["DESTRA", "ISTITUZIONE"],
    base: { hp: 90, atk: 90, def: 88, spc: 70, spd: 58 },
    catchRate: 5, expYield: 245,
    learnset: [[1, "comizio"], [1, "tavololungo"], [16, "gasdotto"], [24, "dossier"], [30, "blocconavale"]],
    dexLine: "TIENE IL DITO SUL RUBINETTO DEL GAS. D'INVERNO L'EUROPA RICEVE LA BOLLETTA E TREMA."
  }),
  xipanda: S({
    id: "xipanda", dexNum: 19, name: "XIPANDA", category: "PANDA PIANIFICATORE",
    types: ["ISTITUZIONE", "TECNO"],
    base: { hp: 88, atk: 75, def: 95, spc: 82, spd: 55 },
    catchRate: 5, expYield: 245,
    learnset: [[1, "comizio"], [1, "oscuramento"], [16, "viadellaseta"], [24, "spread"], [30, "fiducia"]],
    dexLine: "SORRIDE PLACIDO COME UN PANDA. HA UN PIANO QUINQUENNALE PERSINO PER LE FERIE."
  }),
  macronfox: S({
    id: "macronfox", dexNum: 20, name: "MACRONFOX", category: "GALLETTO ELISEO",
    types: ["CENTRO", "TECNO"],
    base: { hp: 70, atk: 62, def: 70, spc: 88, spd: 86 },
    catchRate: 30, expYield: 175,
    learnset: [[1, "giravolta"], [1, "enmarche"], [14, "inciucio"], [20, "jupiter"], [26, "multaue"]],
    dexLine: "NÉ DESTRA NÉ SINISTRA, SOPRATTUTTO SE STESSO. È CONVINTO CHE LA FRANCIA SIA L'EUROPA."
  }),
  ursulax: S({
    id: "ursulax", dexNum: 21, name: "URSULAX", category: "REGOLATRICE SUPREMA",
    types: ["TECNO", "ISTITUZIONE"],
    base: { hp: 75, atk: 60, def: 82, spc: 96, spd: 70 },
    catchRate: 15, expYield: 220,
    learnset: [[1, "grafico"], [1, "direttiva"], [16, "multaue"], [22, "moralsuasion"], [28, "scioglimento"]],
    dexLine: "NORMATIVA AMBULANTE. SE LA SFIDI, RICEVI UNA DIRETTIVA TRADOTTA IN 24 LINGUE."
  }),
  bojoon: S({
    id: "bojoon", dexNum: 22, name: "BOJOON", category: "CAOS BIONDO",
    types: ["POPULISMO", "MEDIA"],
    base: { hp: 75, atk: 82, def: 60, spc: 72, spd: 66 },
    catchRate: 40, expYield: 165,
    learnset: [[1, "comizio"], [1, "slogan"], [12, "citofonata"], [18, "conferenza"], [24, "brexit"]],
    dexLine: "SI È DIMESSO PIÙ VOLTE DI QUANTE SI SIA PETTINATO. LA CHIOMA È UNA POSIZIONE POLITICA."
  }),
  zelenskir: S({
    id: "zelenskir", dexNum: 23, name: "ZELENSKIR", category: "COMICO CORAZZATO",
    types: ["ISTITUZIONE", "MEDIA"],
    base: { hp: 72, atk: 76, def: 68, spc: 80, spd: 80 },
    catchRate: 25, expYield: 185,
    learnset: [[1, "comizio"], [1, "resilienza"], [14, "appelloalleati"], [20, "corteo"], [26, "editoriale"]],
    dexLine: "FACEVA RIDERE DI MESTIERE, ORA FA CORAGGIO. NON SI TOGLIE LA FELPA NEMMENO AI VERTICI NATO."
  }),
  muskrat: S({
    id: "muskrat", dexNum: 24, name: "MUSKRAT", category: "TOPO RAZZO",
    types: ["TECNO", "DESTRA"],
    base: { hp: 65, atk: 70, def: 56, spc: 100, spd: 96 },
    catchRate: 20, expYield: 200,
    learnset: [[1, "tweet"], [1, "memedoge"], [14, "grafico"], [20, "razzox"], [26, "spread"]],
    evolutions: [{ id: "marsrat", item: "tessera" }],
    dexLine: "ADDESTRA UNA IA A RISPONDERE AL POSTO SUO. POI LITIGA COL SUO STESSO ALGORITMO ALLE 3 DI NOTTE."
  }),
  // ---- Evoluzioni avanzate (rami e tessere) ----
  vaffenix: S({
    id: "vaffenix", dexNum: 25, name: "VAFFENIX", category: "FENICE URLANTE",
    types: ["POPULISMO", "VERDE"],
    base: { hp: 72, atk: 92, def: 62, spc: 88, spd: 100 },
    catchRate: 15, expYield: 200,
    learnset: [[1, "vaffa"], [1, "monopattino"], [22, "tsunamitour"], [27, "sciopero"], [32, "brexit"]],
    dexLine: "FENICE DELL'OPPOSIZIONE. RINASCE DALLE CENERI DI OGNI SONDAGGIO SOTTO IL 50 PER CENTO."
  }),
  movimenton: S({
    id: "movimenton", dexNum: 26, name: "MOVIMENTON", category: "PILASTRO DI GOVERNO",
    types: ["POPULISMO", "SINISTRA"],
    base: { hp: 82, atk: 68, def: 88, spc: 92, spd: 58 },
    catchRate: 15, expYield: 200,
    learnset: [[1, "comizio"], [1, "greenwashing"], [22, "redditone"], [26, "fiducia"], [31, "decreto"]],
    dexLine: "DA URLATORE DI PIAZZA A PILASTRO ISTITUZIONALE. GIURA CHE NON È CAMBIATO NIENTE."
  }),
  capitanone: S({
    id: "capitanone", dexNum: 27, name: "CAPITANONE", category: "CAPITANO BALNEARE",
    types: ["POPULISMO", "DESTRA"],
    base: { hp: 88, atk: 102, def: 74, spc: 62, spd: 72 },
    catchRate: 10, expYield: 210,
    learnset: [[1, "ruspa"], [1, "mojito"], [1, "pienipoteri"], [30, "blocconavale"], [34, "dazilampo"]],
    dexLine: "GIURA DI AVER CHIESTO I PIENI POTERI SOLO PER ORDINARE MOJITO PIÙ IN FRETTA."
  }),
  marsrat: S({
    id: "marsrat", dexNum: 28, name: "MARSRAT", category: "RATTO MARZIANO",
    types: ["TECNO", "DESTRA"],
    base: { hp: 72, atk: 74, def: 62, spc: 112, spd: 104 },
    catchRate: 10, expYield: 210,
    learnset: [[1, "tweet"], [1, "algoritmo"], [30, "razzox"], [34, "coloniamarte"]],
    dexLine: "HA COMPRATO UN PIANETA PER POSTARE MEME SENZA CONNESSIONE TERRESTRE."
  }),
  // FIRMA di MEDIOPOLI: l'opinionista onnipresente da talk show.
  mediocrate: S({
    id: "mediocrate", dexNum: 29, name: "MEDIOCRATE", category: "MEZZOBUSTO ONNIPRESENTE",
    types: ["MEDIA", "CENTRO"],
    base: { hp: 68, atk: 52, def: 64, spc: 84, spd: 70 },
    catchRate: 70, expYield: 145,
    learnset: [[1, "tweet"], [1, "giravolta"], [8, "conferenza"], [13, "telepromessa"], [18, "editoriale"], [24, "inciucio"]],
    evolutions: [{ id: "telecrate", level: 20 }],
    dexLine: "OSPITE FISSO DI OGNI TALK SHOW. HA UN'OPINIONE FORTISSIMA SU TUTTO E NESSUNA SU NIENTE. SE CAMBI CANALE, È GIÀ LÌ."
  }),
  // FIRMA dello STRETTO: il mostro-cantiere del ponte mai finito.
  pontigor: S({
    id: "pontigor", dexNum: 30, name: "PONTIGÒR", category: "KAIJU DA CANTIERE",
    types: ["POPULISMO", "TECNO"],
    base: { hp: 90, atk: 88, def: 92, spc: 56, spd: 38 },
    catchRate: 35, expYield: 200,
    learnset: [[1, "ruspa"], [1, "grafico"], [10, "comizio"], [16, "spread"], [22, "slogan"], [28, "vaffa"]],
    evolutions: [{ id: "pontimax", level: 28 }],
    dexLine: "ENORME E INCOMPIUTO DA CINQUANT'ANNI. OGNI GOVERNO LO ANNUNCIA, NESSUNO LO FINISCE. CRESCE SOLO IN CAMPAGNA ELETTORALE."
  }),
  conteblob: S({
    id: "conteblob", dexNum: 31, name: "CONTEBLOB", category: "AVVOCATO MUTEVOLE",
    types: ["SINISTRA", "POPULISMO"],
    base: { hp: 82, atk: 58, def: 92, spc: 100, spd: 52 },
    catchRate: 35, expYield: 205,
    learnset: [[1, "pochette"], [1, "telepromessa"], [18, "conferenza"], [24, "fiducia"], [30, "decreto"]],
    dexLine: "SI ADATTA A QUALSIASI MAGGIORANZA. PRIMA DI ATTACCARE CHIEDE UN PARERE PRO VERITATE A SE STESSO."
  }),
  calendrone: S({
    id: "calendrone", dexNum: 32, name: "CALENDRONE", category: "SAURO DEI DOSSIER",
    types: ["TECNO", "CENTRO"],
    base: { hp: 76, atk: 68, def: 94, spc: 102, spd: 48 },
    catchRate: 35, expYield: 205,
    learnset: [[1, "grafico"], [1, "dossier"], [18, "spread"], [24, "terzopolo"], [30, "editoriale"]],
    dexLine: "QUANDO SI ARRABBIA, PROIETTA SLIDE SUI NEMICI. ALCUNI SI ARRENDONO ALLA QUARTA APPENDICE."
  }),
  generorso: S({
    id: "generorso", dexNum: 33, name: "GENERORSO", category: "ORSO DA CASERMA",
    types: ["DESTRA"],
    base: { hp: 88, atk: 108, def: 82, spc: 48, spd: 62 },
    catchRate: 30, expYield: 210,
    learnset: [[1, "mondocontrario"], [1, "blocconavale"], [20, "radici"], [25, "dazilampo"], [31, "decreto"]],
    dexLine: "HA UNA MAPPA AL CONTRARIO E LA DIFENDE CON FERMEZZA. SE GLIELA GIRI, DICE CHE È PROPAGANDA."
  }),
  tajacolomba: S({
    id: "tajacolomba", dexNum: 34, name: "TAJACOLOMBA", category: "DIPLOMATICO ALATO",
    types: ["CENTRO", "DESTRA"],
    base: { hp: 78, atk: 56, def: 84, spc: 86, spd: 74 },
    catchRate: 40, expYield: 195,
    learnset: [[1, "moralsuasion"], [1, "conferenza"], [18, "inciucio"], [24, "fiducia"], [30, "multaue"]],
    dexLine: "PARLA PIANISSIMO MA FIRMA COMUNICATI DURISSIMI. SI POSA DOVE CONVIENE E RIPARTE CON GARBO."
  }),
  telecrate: S({
    id: "telecrate", dexNum: 35, name: "TELECRATE", category: "VAMPIRO DA STUDIO",
    types: ["MEDIA", "CENTRO"],
    base: { hp: 82, atk: 60, def: 76, spc: 104, spd: 82 },
    catchRate: 30, expYield: 210,
    learnset: [[1, "tweet"], [1, "editoriale"], [20, "telepromessa"], [26, "bunga"], [32, "conferenza"]],
    dexLine: "NON DORME: ASPETTA IL PROSSIMO TALK. SI NUTRE DI LUCI ROSSE, SONDAGGI E MICROFONI ACCESI."
  }),
  pontimax: S({
    id: "pontimax", dexNum: 36, name: "PONTIMAX", category: "CANTIERE DEFINITIVO",
    types: ["POPULISMO", "TECNO"],
    base: { hp: 112, atk: 106, def: 110, spc: 64, spd: 42 },
    catchRate: 15, expYield: 230,
    learnset: [[1, "ruspa"], [1, "grafico"], [28, "spread"], [32, "pienipoteri"], [36, "vaffa"]],
    dexLine: "EVOLVE SOLO QUANDO IL CANTIERE SEMBRA FINITO. POI ARRIVA UNA NUOVA PERIZIA E RICOMINCIA A CRESCERE."
  })
};

export const DEX_ORDER: string[] = Object.values(SPECIES)
  .sort((a, b) => a.dexNum - b.dexNum)
  .map((s) => s.id);

export const STARTERS = ["giorgetta", "ellyna", "renzino"] as const;

// Lo starter del rivale è quello forte contro la tua scelta.
export const RIVAL_COUNTER: Record<string, string> = {
  giorgetta: "renzino", // CENTRO batte DESTRA
  ellyna: "giorgetta", // DESTRA batte SINISTRA
  renzino: "ellyna" // SINISTRA batte CENTRO
};
