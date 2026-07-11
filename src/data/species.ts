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
  trade?: boolean; // si attiva ricevendo il mostro in uno SCAMBIO online ("cambio di casacca")
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
  // Override raro per ruoli con counter speciale esplicito. Le specie legacy
  // continuano a usare DEF contro entrambe le categorie.
  specialDefense?: number;
  catchRate: number; // 0-255, più alto = più facile
  expYield: number;
  learnset: Array<[number, string]>; // [livello, moveId]
  evolutions?: EvolutionRule[];
  ability?: string; // id in ABILITIES (abilities.ts): effetto passivo fisso della specie
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
    learnset: [[1, "comizio"], [1, "radici"], [1, "iosonogiorgia"], [16, "fiammatricolore"], [19, "pacchiafinita"], [22, "blocconavale"], [26, "mondocontrario"], [30, "decreto"]],
    ability: "maggioranza",
    dexLine: "DRAGO UNDERDOG. PIÙ LO CRITICANO A BRUXELLES, PIÙ LA SUA FIAMMA TRICOLORE DIVAMPA."
  }),
  ellyna: S({
    id: "ellyna", dexNum: 3, name: "ELLYNA", category: "GATTINA ROSSA",
    types: ["SINISTRA"],
    base: { hp: 49, atk: 54, def: 57, spc: 58, spd: 52 },
    catchRate: 45, expYield: 62,
    learnset: [[1, "corteo"], [1, "comizio"], [1, "ztl"], [5, "greenwashing"], [9, "piazza"], [11, "sciopero"], [13, "articolouno"], [15, "scissione"]],
    evolutions: [{ id: "schleinix", level: 16 }],
    dexLine: "GATTINA GENTILE. PASSA PIÙ TEMPO A DISCUTERE CON LE ALTRE ELLYNA CHE COL NEMICO."
  }),
  schleinix: S({
    id: "schleinix", dexNum: 4, name: "SCHLEINIX", category: "VOLPE ARMOCROMICA",
    types: ["SINISTRA", "VERDE"],
    base: { hp: 74, atk: 74, def: 78, spc: 98, spd: 74 },
    catchRate: 25, expYield: 180,
    learnset: [[1, "corteo"], [1, "piazza"], [1, "ztl"], [16, "articolouno"], [20, "pistaciclabile"], [24, "sciopero"], [28, "transizione"], [32, "scissione"]],
    ability: "opposizione",
    dexLine: "PIÙ BRAVA A SCEGLIERE LA PALETTE CHE LA CORRENTE. LA SUA MOSSA MIGLIORE FA MALE SOLO AI SUOI."
  }),
  renzino: S({
    id: "renzino", dexNum: 5, name: "RENZINO", category: "LUCERTOLA SVELTA",
    types: ["CENTRO"],
    base: { hp: 49, atk: 57, def: 52, spc: 50, spd: 62 },
    catchRate: 45, expYield: 62,
    learnset: [[1, "giravolta"], [1, "comizio"], [1, "promessa"], [5, "terzopolo"], [11, "inciucio"], [13, "staisereno"]],
    evolutions: [{ id: "renzilla", level: 16 }],
    ability: "voltagabbana",
    dexLine: "SORRIDE SEMPRE. SE GLI STRINGI LA ZAMPA, CONTA LE DITA E POI FONDA UN PARTITO NUOVO."
  }),
  renzilla: S({
    id: "renzilla", dexNum: 6, name: "RENZILLA", category: "KAIJU ROTTAMA",
    types: ["CENTRO"],
    base: { hp: 71, atk: 88, def: 72, spc: 80, spd: 90 },
    catchRate: 25, expYield: 180,
    learnset: [[1, "giravolta"], [1, "terzopolo"], [1, "promessa"], [16, "staisereno"], [20, "rottamazione"], [22, "inciucio"], [26, "enmarche"], [28, "editoriale"]],
    ability: "voltagabbana",
    dexLine: "ROTTAMA I GOVERNI CHE HA FONDATO LUI, POI SI STUPISCE CHE NESSUNO SI FIDI PIÙ."
  }),
  salvinott: S({
    id: "salvinott", dexNum: 7, name: "SALVINOTT", category: "CASTORINO LIVE",
    types: ["POPULISMO"],
    base: { hp: 50, atk: 56, def: 42, spc: 40, spd: 46 },
    catchRate: 190, expYield: 55,
    learnset: [[1, "comizio"], [3, "slogan"], [7, "citofonata"], [12, "ruspa"]],
    // Ramo sui SONDAGGI: al governo -> CASTORONE balneare (salvinator), all'opposizione
    // -> CASTORO che urla (salvinurlo). salvinator (alto) va prima di salvinurlo.
    evolutions: [
      { id: "salvinator", level: 18, minSondaggi: 50 },
      { id: "salvinurlo", level: 18 }
    ],
    dexLine: "CUCCIOLO DA COMIZIO. FA UNA DIRETTA SOCIAL ANCHE QUANDO DORME."
  }),
  salvinator: S({
    id: "salvinator", dexNum: 8, name: "SALVINATOR", category: "CASTORONE BALNEARE",
    types: ["POPULISMO", "DESTRA"],
    base: { hp: 75, atk: 88, def: 62, spc: 58, spd: 68 },
    catchRate: 60, expYield: 160,
    learnset: [[1, "ruspa"], [1, "citofonata"], [15, "noncene"], [18, "mojito"], [23, "blocconavale"], [28, "vaffa"]],
    evolutions: [{ id: "capitanone", item: "tessera" }],
    dexLine: "SI INDEBOLISCE SE DEVE GOVERNARE DAVVERO. RECUPERA TUTTI I PV APPENA TORNA ALL'OPPOSIZIONE."
  }),
  grillix: S({
    id: "grillix", dexNum: 11, name: "GRILLIX", category: "GRILLO URLANTE",
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
    id: "contemorfo", dexNum: 14, name: "CONTEMORFO", category: "BLOB ELEGANTE",
    types: ["SINISTRA", "POPULISMO"],
    base: { hp: 62, atk: 50, def: 72, spc: 76, spd: 45 },
    catchRate: 100, expYield: 130,
    learnset: [[1, "comizio"], [6, "pochette"], [10, "inciucio"], [15, "telepromessa"], [21, "conferenza"]],
    // Ramo sui SONDAGGI: popolare -> avvocato di governo (conteblob), impopolare ->
    // avvocato di piazza (contepop). Lo scambio evolve sempre alla forma di governo.
    // La prima regola soddisfatta vince: conteblob (governo) va PRIMA di contepop.
    evolutions: [
      { id: "conteblob", level: 18, minSondaggi: 50 },
      { id: "contepop", level: 18 },
      { id: "conteblob", trade: true }
    ],
    ability: "teflon",
    dexLine: "BLOB ELEGANTISSIMO. HA GOVERNATO CON TUTTI, CONTRO TUTTI E ANCHE CON SE STESSO CONTRARIO."
  }),
  calendauro: S({
    id: "calendauro", dexNum: 17, name: "CALENDAURO", category: "SAURO SLIDE",
    types: ["TECNO", "CENTRO"],
    base: { hp: 58, atk: 55, def: 76, spc: 78, spd: 42 },
    catchRate: 100, expYield: 130,
    learnset: [[1, "grafico"], [6, "giravolta"], [11, "dossier"], [16, "spread"], [22, "terzopolo"]],
    // Consegnato a un nuovo staff, apre subito i dossier: evolve da scambio.
    evolutions: [{ id: "calendrone", level: 18 }, { id: "calendrone", trade: true }],
    dexLine: "SAURO TECNICO. TI MOSTRA UN GRAFICO A TORTA ANCHE SE GLI HAI CHIESTO SOLO CHE ORE SONO."
  }),
  vannaccix: S({
    id: "vannaccix", dexNum: 19, name: "VANNACCIX", category: "ORSO CAPOVOLTO",
    types: ["DESTRA"],
    base: { hp: 66, atk: 86, def: 60, spc: 40, spd: 56 },
    catchRate: 75, expYield: 140,
    learnset: [[1, "comizio"], [7, "radici"], [12, "mondocontrario"], [18, "blocconavale"]],
    evolutions: [
      { id: "futurorso", item: "tessera_futuro" },
      { id: "generorso", level: 20 }
    ],
    dexLine: "VIVE A TESTA IN GIÙ. HA SCRITTO UN LIBRO SUL MONDO GIUSTO E L'HA VENDUTO PIÙ DI OGNI LEGGE."
  }),
  tajanide: S({
    id: "tajanide", dexNum: 21, name: "TAJANIDE", category: "COLOMBA PLACIDA",
    types: ["CENTRO", "DESTRA"],
    base: { hp: 56, atk: 45, def: 66, spc: 66, spd: 58 },
    catchRate: 120, expYield: 110,
    learnset: [[1, "comizio"], [5, "promessa"], [10, "conferenza"], [16, "moralsuasion"], [22, "inciucio"]],
    // La colomba si posa dove conviene: cambiare squadra la fa evolvere subito.
    evolutions: [{ id: "tajacolomba", level: 18 }, { id: "tajacolomba", trade: true }],
    ability: "poltrona",
    dexLine: "COLOMBA MITISSIMA. NON HA MAI PERSO UNA POLTRONA, NÉ VINTO UN'IDEA DA RICORDARE."
  }),
  berlusconix: S({
    id: "berlusconix", dexNum: 23, name: "BERLUSCONIX", category: "BISCIONE LEGGENDARIO",
    types: ["MEDIA", "DESTRA"],
    base: { hp: 80, atk: 70, def: 65, spc: 105, spd: 85 },
    catchRate: 8, expYield: 240,
    learnset: [[1, "tweet"], [1, "telepromessa"], [1, "conferenza"], [12, "editoriale"], [18, "bunga"], [22, "appelloalleati"], [28, "covfefe"], [34, "memedoge"]],
    ability: "lodo",
    dexLine: "BISCIONE LEGGENDARIO. NON COMPRA I VOTI: COMPRA IL CANALE CHE TI SPIEGA PER CHI VOTARE."
  }),
  draghimon: S({
    id: "draghimon", dexNum: 24, name: "DRAGHIMON", category: "DRAGO DEI MERCATI",
    types: ["TECNO", "ISTITUZIONE"],
    base: { hp: 85, atk: 75, def: 90, spc: 115, spd: 80 },
    catchRate: 10, expYield: 250,
    learnset: [[1, "spread"], [1, "moralsuasion"], [1, "gazzetta"], [15, "dossier"], [20, "fiducia"], [24, "quorum"], [26, "whatever"], [30, "scioglimento"]],
    ability: "whatever",
    dexLine: "VIENE EVOCATO SOLO NELLE CRISI. NON LO ELEGGE NESSUNO, MA COMANDA A CHI LO HA ELETTO."
  }),
  mattarellux: S({
    id: "mattarellux", dexNum: 25, name: "MATTARELLUX", category: "GARANTE SUPREMO",
    types: ["ISTITUZIONE"],
    base: { hp: 90, atk: 70, def: 95, spc: 100, spd: 70 },
    catchRate: 3, expYield: 255,
    learnset: [[1, "moralsuasion"], [1, "fiducia"], [1, "gazzetta"], [14, "decreto"], [18, "aureola"], [22, "quorum"], [26, "oscuramento"], [30, "scioglimento"]],
    ability: "garanzia",
    dexLine: "GARANTE SUPREMO. L'UNICO CHE NON HA MAI FATTO UNA PROMESSA ELETTORALE: PER QUESTO L'HANNO RIELETTO."
  }),
  trumpon: S({
    id: "trumpon", dexNum: 26, name: "TRUMPON", category: "TYCOON URLANTE",
    types: ["POPULISMO", "MEDIA"],
    base: { hp: 85, atk: 95, def: 70, spc: 90, spd: 75 },
    catchRate: 8, expYield: 240,
    learnset: [[1, "comizio"], [1, "covfefe"], [16, "tweet"], [22, "dazilampo"], [28, "editoriale"]],
    ability: "maggioranza",
    dexLine: "COSTRUISCE MURI E LI FA PAGARE AGLI ALTRI. IL SUO CIUFFO RESISTE AL VENTO E ALLE SMENTITE."
  }),
  putingrad: S({
    id: "putingrad", dexNum: 27, name: "PUTINGRAD", category: "ZAR D'INVERNO",
    types: ["DESTRA", "ISTITUZIONE"],
    base: { hp: 90, atk: 90, def: 88, spc: 70, spd: 58 },
    catchRate: 5, expYield: 245,
    learnset: [[1, "comizio"], [1, "tavololungo"], [16, "gasdotto"], [24, "dossier"], [30, "blocconavale"]],
    ability: "caimano",
    dexLine: "TIENE IL DITO SUL RUBINETTO DEL GAS. D'INVERNO L'EUROPA RICEVE LA BOLLETTA E TREMA."
  }),
  bunkerput: S({
    id: "bunkerput", dexNum: 39, name: "BUNKERPUT", category: "MEME DA BUNKER",
    types: ["ISTITUZIONE", "MEDIA"],
    base: { hp: 78, atk: 76, def: 100, spc: 82, spd: 38 },
    catchRate: 35, expYield: 190,
    learnset: [[1, "comizio"], [1, "tavololungo"], [10, "oscuramento"], [16, "gasdotto"], [22, "dossier"], [28, "fiducia"]],
    ability: "lodo",
    dexLine: "VIVE IN UN BUNKER E ATTACCA DA UN TAVOLO LUNGHISSIMO. PIÙ LO AVVICINI, PIÙ ALLUNGA LA RIUNIONE."
  }),
  xipanda: S({
    id: "xipanda", dexNum: 28, name: "XIPANDA", category: "PANDA PIANIFICATORE",
    types: ["ISTITUZIONE", "TECNO"],
    base: { hp: 88, atk: 75, def: 95, spc: 82, spd: 55 },
    catchRate: 5, expYield: 245,
    learnset: [[1, "comizio"], [1, "oscuramento"], [16, "viadellaseta"], [24, "spread"], [30, "fiducia"]],
    ability: "poltrona",
    dexLine: "SORRIDE PLACIDO COME UN PANDA. È STATO ELETTO ALL'UNANIMITÀ: ERA L'UNICO CANDIDATO AMMESSO."
  }),
  macronfox: S({
    id: "macronfox", dexNum: 29, name: "MACRONFOX", category: "GALLETTO ELISEO",
    types: ["CENTRO", "TECNO"],
    base: { hp: 70, atk: 62, def: 70, spc: 88, spd: 86 },
    catchRate: 30, expYield: 175,
    learnset: [[1, "giravolta"], [1, "enmarche"], [14, "inciucio"], [20, "jupiter"], [26, "multaue"]],
    dexLine: "NÉ DESTRA NÉ SINISTRA, SOPRATTUTTO SE STESSO. È CONVINTO CHE LA FRANCIA SIA L'EUROPA."
  }),
  ursulax: S({
    id: "ursulax", dexNum: 30, name: "URSULAX", category: "REGOLATRICE SUPREMA",
    types: ["TECNO", "ISTITUZIONE"],
    base: { hp: 75, atk: 60, def: 82, spc: 96, spd: 70 },
    catchRate: 15, expYield: 220,
    learnset: [[1, "grafico"], [1, "direttiva"], [16, "multaue"], [22, "moralsuasion"], [28, "scioglimento"]],
    dexLine: "NORMATIVA AMBULANTE. SE LA SFIDI, RICEVI UNA DIRETTIVA TRADOTTA IN 24 LINGUE."
  }),
  bojoon: S({
    id: "bojoon", dexNum: 31, name: "BOJOON", category: "CAOS BIONDO",
    types: ["POPULISMO", "MEDIA"],
    base: { hp: 75, atk: 82, def: 60, spc: 72, spd: 66 },
    catchRate: 40, expYield: 165,
    learnset: [[1, "comizio"], [1, "slogan"], [12, "citofonata"], [18, "conferenza"], [24, "brexit"]],
    dexLine: "SI È DIMESSO PIÙ VOLTE DI QUANTE SI SIA PETTINATO. LA CHIOMA È UNA POSIZIONE POLITICA."
  }),
  zelenskir: S({
    id: "zelenskir", dexNum: 32, name: "ZELENSKIR", category: "COMICO CORAZZATO",
    types: ["ISTITUZIONE", "MEDIA"],
    base: { hp: 72, atk: 76, def: 68, spc: 80, spd: 80 },
    catchRate: 25, expYield: 185,
    learnset: [[1, "comizio"], [1, "resilienza"], [14, "appelloalleati"], [20, "corteo"], [26, "editoriale"]],
    dexLine: "FACEVA RIDERE DI MESTIERE, ORA FA CORAGGIO. NON SI TOGLIE LA FELPA NEMMENO AI VERTICI NATO."
  }),
  muskrat: S({
    id: "muskrat", dexNum: 33, name: "MUSKRAT", category: "TOPO RAZZO",
    types: ["TECNO", "DESTRA"],
    base: { hp: 65, atk: 70, def: 56, spc: 100, spd: 96 },
    catchRate: 20, expYield: 200,
    learnset: [[1, "tweet"], [1, "memedoge"], [14, "grafico"], [20, "razzox"], [26, "spread"]],
    evolutions: [{ id: "marsrat", item: "tessera" }],
    dexLine: "ADDESTRA UNA IA A RISPONDERE AL POSTO SUO. POI LITIGA COL SUO STESSO ALGORITMO ALLE 3 DI NOTTE."
  }),
  // ---- Evoluzioni avanzate (rami e tessere) ----
  vaffenix: S({
    id: "vaffenix", dexNum: 12, name: "VAFFENIX", category: "FENICE URLANTE",
    types: ["POPULISMO", "VERDE"],
    base: { hp: 72, atk: 92, def: 62, spc: 88, spd: 100 },
    catchRate: 15, expYield: 200,
    learnset: [[1, "vaffa"], [1, "monopattino"], [22, "tsunamitour"], [27, "sciopero"], [32, "brexit"]],
    ability: "opposizione",
    dexLine: "FENICE DELL'OPPOSIZIONE. SA URLARE CONTRO TUTTO, MA NON HA MAI DETTO A FAVORE DI COSA."
  }),
  movimenton: S({
    id: "movimenton", dexNum: 13, name: "MOVIMENTON", category: "PILASTRO DI GOVERNO",
    types: ["POPULISMO", "SINISTRA"],
    base: { hp: 82, atk: 68, def: 88, spc: 92, spd: 58 },
    catchRate: 15, expYield: 200,
    learnset: [[1, "comizio"], [1, "greenwashing"], [1, "piazza"], [22, "redditone"], [26, "fiducia"], [29, "articolouno"], [31, "decreto"], [35, "gazzetta"]],
    ability: "maggioranza",
    dexLine: "URLAVA 'TUTTI A CASA', ORA HA UN UFFICIO A PALAZZO CON VISTA. GIURA CHE NON È CAMBIATO NIENTE."
  }),
  capitanone: S({
    id: "capitanone", dexNum: 9, name: "CAPITANONE", category: "CAPITANO BALNEARE",
    types: ["POPULISMO", "DESTRA"],
    base: { hp: 88, atk: 102, def: 74, spc: 62, spd: 72 },
    catchRate: 10, expYield: 210,
    learnset: [[1, "ruspa"], [1, "mojito"], [1, "pienipoteri"], [1, "citofonata"], [30, "blocconavale"], [34, "dazilampo"], [38, "vaffa"]],
    ability: "caimano",
    dexLine: "HA CHIESTO I PIENI POTERI IN SPIAGGIA E LI HA PERSI IN SPIAGGIA. IL MOJITO È RIMASTO."
  }),
  marsrat: S({
    id: "marsrat", dexNum: 34, name: "MARSRAT", category: "RATTO MARZIANO",
    types: ["TECNO", "DESTRA"],
    base: { hp: 72, atk: 74, def: 62, spc: 112, spd: 104 },
    catchRate: 10, expYield: 210,
    learnset: [[1, "tweet"], [1, "algoritmo"], [30, "razzox"], [34, "coloniamarte"]],
    ability: "opposizione",
    dexLine: "HA COMPRATO UN PIANETA PER POSTARE MEME SENZA CONNESSIONE TERRESTRE."
  }),
  // FIRMA di MEDIOPOLI: l'opinionista onnipresente da talk show.
  mediocrate: S({
    id: "mediocrate", dexNum: 35, name: "MEDIOCRATE", category: "MEZZOBUSTO ONNIPRESENTE",
    types: ["MEDIA", "CENTRO"],
    base: { hp: 68, atk: 52, def: 64, spc: 84, spd: 70 },
    catchRate: 70, expYield: 145,
    learnset: [[1, "tweet"], [1, "giravolta"], [8, "conferenza"], [13, "telepromessa"], [18, "editoriale"], [24, "inciucio"]],
    evolutions: [{ id: "telecrate", level: 20 }],
    ability: "galleggiamento",
    dexLine: "OSPITE FISSO DI OGNI TALK SHOW. HA UN'OPINIONE FORTISSIMA SU TUTTO E NESSUNA SU NIENTE. SE CAMBI CANALE, È GIÀ LÌ."
  }),
  // FIRMA dello STRETTO: il mostro-cantiere del ponte mai finito.
  pontigor: S({
    id: "pontigor", dexNum: 37, name: "PONTIGÒR", category: "KAIJU DA CANTIERE",
    types: ["POPULISMO", "TECNO"],
    base: { hp: 90, atk: 88, def: 92, spc: 56, spd: 38 },
    catchRate: 35, expYield: 200,
    learnset: [[1, "ruspa"], [1, "grafico"], [10, "comizio"], [16, "spread"], [22, "slogan"], [28, "vaffa"]],
    evolutions: [{ id: "pontimax", level: 28 }],
    dexLine: "ENORME E INCOMPIUTO DA CINQUANT'ANNI. OGNI GOVERNO LO ANNUNCIA, NESSUNO LO FINISCE. CRESCE SOLO IN CAMPAGNA ELETTORALE."
  }),
  conteblob: S({
    id: "conteblob", dexNum: 15, name: "CONTEBLOB", category: "AVVOCATO MUTEVOLE",
    types: ["SINISTRA", "POPULISMO"],
    base: { hp: 82, atk: 58, def: 92, spc: 100, spd: 52 },
    catchRate: 35, expYield: 205,
    learnset: [[1, "pochette"], [1, "telepromessa"], [1, "piazza"], [18, "conferenza"], [24, "fiducia"], [28, "concertone"], [30, "decreto"], [34, "gazzetta"]],
    ability: "teflon",
    dexLine: "HA GOVERNATO CON I SUOI PEGGIORI NEMICI, POI DI NUOVO, POI CON QUELLI DI PRIMA. NON RICORDA PIÙ CHI ODIA."
  }),
  calendrone: S({
    id: "calendrone", dexNum: 18, name: "CALENDRONE", category: "SAURO DEI DOSSIER",
    types: ["TECNO", "CENTRO"],
    base: { hp: 76, atk: 68, def: 94, spc: 102, spd: 48 },
    catchRate: 35, expYield: 205,
    learnset: [[1, "grafico"], [1, "dossier"], [18, "spread"], [24, "terzopolo"], [30, "editoriale"]],
    dexLine: "QUANDO SI ARRABBIA, PROIETTA SLIDE SUI NEMICI. ALCUNI SI ARRENDONO ALLA QUARTA APPENDICE."
  }),
  generorso: S({
    id: "generorso", dexNum: 20, name: "GENERORSO", category: "ORSO DA CASERMA",
    types: ["DESTRA"],
    base: { hp: 88, atk: 108, def: 82, spc: 48, spd: 62 },
    catchRate: 30, expYield: 210,
    learnset: [[1, "mondocontrario"], [1, "blocconavale"], [1, "iosonogiorgia"], [20, "radici"], [25, "dazilampo"], [28, "pienipoteri"], [31, "decreto"], [35, "fiammatricolore"]],
    dexLine: "HA UNA MAPPA AL CONTRARIO E LA DIFENDE CON FERMEZZA. SE GLIELA GIRI, DICE CHE È PROPAGANDA."
  }),
  futurorso: S({
    id: "futurorso", dexNum: 45, name: "FUTURORSO", category: "MOSTRO CORRENTE",
    types: ["DESTRA", "CENTRO"],
    base: { hp: 94, atk: 101, def: 89, spc: 48, spd: 58 },
    catchRate: 30, expYield: 210,
    learnset: [[1, "radici"], [1, "mondocontrario"], [1, "giravolta"], [32, "staisereno"], [36, "fiducia"], [40, "quorum"]],
    ability: "tabularasa",
    dexLine: "STRAPPA IL VECCHIO MANTELLO E RIPARTE DA ZERO. IL FUTURO È SEMPRE PRONTO, SPECIE DOPO UN RIMPASTO."
  }),
  gianimago: S({
    id: "gianimago", dexNum: 46, name: "GIANIMAGO", category: "MOSTRO TELEMAGO",
    types: ["MEDIA", "TECNO"],
    base: { hp: 57, atk: 43, def: 55, spc: 88, spd: 61 },
    catchRate: 90, expYield: 138,
    learnset: [[1, "grafico"], [1, "tweet"], [24, "pochette"], [28, "conferenza"], [31, "exit_poll"]],
    evolutions: [{ id: "quasimagiani", level: 32 }],
    ability: "contraddittorio",
    dexLine: "TRASFORMA OGNI SONDAGGIO IN UN NUMERO DI MAGIA. IL PUBBLICO APPLAUDE PRIMA DI CAPIRE LA DOMANDA."
  }),
  quasimagiani: S({
    id: "quasimagiani", dexNum: 47, name: "QUASIMAGIANI", category: "MOSTRO QUASI MAGICO",
    types: ["MEDIA", "TECNO"],
    base: { hp: 74, atk: 55, def: 68, spc: 112, spd: 86 },
    catchRate: 25, expYield: 205,
    learnset: [[1, "grafico"], [1, "tweet"], [1, "pochette"], [1, "conferenza"], [32, "exit_poll"], [34, "smentita_flash"], [35, "algoritmo"], [38, "editoriale"], [42, "razzox"]],
    ability: "forchettasondaggi",
    dexLine: "APRE IL MANTELLO E MOSTRA TRE RISULTATI DIVERSI. SONO TUTTI ESATTI, ENTRO LA FORCHETTA."
  }),
  crosettank: S({
    id: "crosettank", dexNum: 48, name: "CROSETTANK", category: "MOSTRO DICASTERO",
    types: ["ISTITUZIONE", "DESTRA"],
    base: { hp: 104, atk: 76, def: 108, spc: 58, spd: 42 },
    specialDefense: 58,
    catchRate: 35, expYield: 205,
    learnset: [[1, "decreto"], [1, "direttiva"], [26, "blocconavale"], [30, "fiducia"], [34, "quorum"], [36, "voto_disgiunto"], [38, "tavololungo"]],
    ability: "poltrona",
    dexLine: "PESA OGNI PAROLA E ANCHE IL LEGGIO. I COLPI FISICI RIMBALZANO, MA LA RETORICA SPECIALE TROVA LE FESSURE."
  }),
  fratocorno: S({
    id: "fratocorno", dexNum: 49, name: "FRATOCORNO", category: "MOSTRO ASSEMBLEA",
    types: ["SINISTRA", "ISTITUZIONE"],
    base: { hp: 66, atk: 52, def: 72, spc: 66, spd: 48 },
    catchRate: 95, expYield: 135,
    learnset: [[1, "corteo"], [1, "direttiva"], [24, "raccoltadifferenziata"], [28, "articolouno"], [31, "concertone"]],
    evolutions: [{ id: "campocorno", level: 32 }],
    ability: "poltrona",
    dexLine: "ALLARGA IL CAMPO CON UN MEGAFONO IN FIORE. LE SUE CORNA TENGONO INSIEME ANCHE LE PARENTESI."
  }),
  campocorno: S({
    id: "campocorno", dexNum: 50, name: "CAMPOCORNO", category: "MOSTRO CAMPO LARGO",
    types: ["SINISTRA", "VERDE"],
    base: { hp: 88, atk: 64, def: 94, spc: 94, spd: 50 },
    catchRate: 30, expYield: 198,
    learnset: [[1, "corteo"], [1, "direttiva"], [1, "raccoltadifferenziata"], [1, "articolouno"], [32, "piazza"], [34, "piazza_aperta"], [35, "aureola"], [38, "transizione"], [40, "patto_verde"], [42, "gazzetta"]],
    ability: "galleggiamento",
    dexLine: "LE CORNA FANNO DA TETTO ALLA COALIZIONE. RESTA A GALLA FINCHÉ NESSUNO CHIEDE CHI DEBBA STARE AL CENTRO."
  }),
  nordiodo: S({
    id: "nordiodo", dexNum: 51, name: "NORDIODO", category: "MOSTRO CONSULTIVO",
    types: ["POPULISMO", "VERDE"],
    base: { hp: 61, atk: 54, def: 63, spc: 72, spd: 54 },
    catchRate: 95, expYield: 135,
    learnset: [[1, "slogan"], [1, "greenwashing"], [24, "ztl"], [28, "citofonata"], [31, "autonomia"]],
    evolutions: [{ id: "referendodo", level: 32 }],
    ability: "staffetta",
    dexLine: "RISCRIVE IL QUESITO FINCHÉ ENTRA NELLA CASELLA. POI CHIEDE UN PARERE SULLA DIMENSIONE DELLA CASELLA."
  }),
  referendodo: S({
    id: "referendodo", dexNum: 52, name: "REFERENDODO", category: "MOSTRO QUESITO",
    types: ["POPULISMO", "ISTITUZIONE"],
    base: { hp: 82, atk: 62, def: 84, spc: 94, spd: 68 },
    catchRate: 30, expYield: 200,
    learnset: [[1, "slogan"], [1, "greenwashing"], [1, "ztl"], [1, "citofonata"], [32, "autonomia"], [35, "dossier"], [36, "voto_disgiunto"], [38, "quorum"], [42, "tsunamitour"]],
    ability: "caimano",
    dexLine: "HA DUE PENNINI E TRE VERSIONI DELLA DOMANDA. QUALUNQUE RISPOSTA APRE UN NUOVO TAVOLO CONSULTIVO."
  }),
  tajacolomba: S({
    id: "tajacolomba", dexNum: 22, name: "TAJACOLOMBA", category: "DIPLOMATICO ALATO",
    types: ["CENTRO", "DESTRA"],
    base: { hp: 78, atk: 56, def: 84, spc: 86, spd: 74 },
    catchRate: 40, expYield: 195,
    learnset: [[1, "moralsuasion"], [1, "conferenza"], [18, "inciucio"], [24, "fiducia"], [30, "multaue"]],
    ability: "poltrona",
    dexLine: "PARLA PIANISSIMO MA FIRMA COMUNICATI DURISSIMI. SI POSA DOVE CONVIENE E RIPARTE CON GARBO."
  }),
  telecrate: S({
    id: "telecrate", dexNum: 36, name: "TELECRATE", category: "VAMPIRO DA STUDIO",
    types: ["MEDIA", "CENTRO"],
    base: { hp: 82, atk: 60, def: 76, spc: 104, spd: 82 },
    catchRate: 30, expYield: 210,
    learnset: [[1, "tweet"], [1, "editoriale"], [20, "telepromessa"], [26, "bunga"], [32, "conferenza"]],
    ability: "galleggiamento",
    dexLine: "NON DORME: ASPETTA IL PROSSIMO TALK. SI NUTRE DI LUCI ROSSE, SONDAGGI E MICROFONI ACCESI."
  }),
  pontimax: S({
    id: "pontimax", dexNum: 38, name: "PONTIMAX", category: "CANTIERE DEFINITIVO",
    types: ["POPULISMO", "TECNO"],
    base: { hp: 112, atk: 106, def: 110, spc: 64, spd: 42 },
    catchRate: 15, expYield: 230,
    learnset: [[1, "ruspa"], [1, "grafico"], [28, "spread"], [32, "pienipoteri"], [36, "vaffa"]],
    dexLine: "EVOLVE SOLO QUANDO IL CANTIERE SEMBRA FINITO. POI ARRIVA UNA NUOVA PERIZIA E RICOMINCIA A CRESCERE."
  }),
  // ------------------------------------------------- LINEA VERDE (Round 40)
  // Satira bonaria dell'attivismo climatico (mai persone reali): un germoglio
  // idealista che cresce fino a diventare guardiano verde da corteo.
  verdolino: S({
    id: "verdolino", dexNum: 40, name: "VERDOLINO", category: "GERMOGLIO ATTIVISTA",
    types: ["VERDE"],
    base: { hp: 48, atk: 50, def: 55, spc: 58, spd: 54 },
    catchRate: 120, expYield: 66,
    learnset: [[1, "greenwashing"], [1, "raccoltadifferenziata"], [8, "monopattino"], [11, "pistaciclabile"], [14, "incollamano"], [16, "sciopreverde"]],
    // Ramo sui SONDAGGI: consenso alto -> guardiano istituzionale (ecoverdon),
    // consenso basso -> attivista radicale (verdoribelle). ecoverdon (alto) prima.
    evolutions: [
      { id: "ecoverdon", level: 18, minSondaggi: 50 },
      { id: "verdoribelle", level: 18 }
    ],
    ability: "galleggiamento",
    dexLine: "FIRMA PETIZIONI ANCORA PRIMA DI SBOCCIARE. SI INNAFFIA DA SOLO PER RIDURRE L'IMPRONTA IDRICA."
  }),
  ecoverdon: S({
    id: "ecoverdon", dexNum: 41, name: "ECOVERDON", category: "GUARDIANO DEL CLIMA",
    types: ["VERDE"],
    base: { hp: 78, atk: 72, def: 84, spc: 92, spd: 70 },
    catchRate: 45, expYield: 175,
    learnset: [[1, "greenwashing"], [1, "raccoltadifferenziata"], [1, "pistaciclabile"], [18, "incollamano"], [22, "sciopreverde"], [26, "corteo"], [30, "transizione"]],
    ability: "opposizione",
    dexLine: "PIANTA UN ALBERO PER OGNI COMIZIO AVVERSARIO. IL SUO PANNELLO SOLARE FUNZIONA ANCHE DI NOTTE, DICE LUI."
  }),
  // ---- Rami evolutivi sui SONDAGGI (la feature-firma: il gradimento decide chi
  // diventi). Ogni genitore biforca: sondaggi ALTI -> forma "di governo" (già
  // esistente), sondaggi BASSI -> forma "di opposizione" (queste 3 nuove). ----
  contepop: S({
    id: "contepop", dexNum: 16, name: "CONTEPOP", category: "AVVOCATO DI PIAZZA",
    types: ["SINISTRA", "POPULISMO"],
    base: { hp: 80, atk: 84, def: 74, spc: 88, spd: 70 },
    catchRate: 35, expYield: 205,
    learnset: [[1, "piazza"], [1, "telepromessa"], [1, "vaffa"], [18, "concertone"], [24, "tsunamitour"], [30, "brexit"]],
    ability: "opposizione",
    dexLine: "STESSO AVVOCATO, ALTRO COPIONE: SCESO SOTTO IL 50% HA SCOPERTO LA PIAZZA E IL MEGAFONO."
  }),
  salvinurlo: S({
    id: "salvinurlo", dexNum: 10, name: "SALVINURLO", category: "CASTORO D'OPPOSIZIONE",
    types: ["POPULISMO"],
    base: { hp: 78, atk: 92, def: 58, spc: 54, spd: 82 },
    catchRate: 60, expYield: 160,
    learnset: [[1, "vaffa"], [1, "citofonata"], [1, "ruspa"], [18, "dazilampo"], [23, "blocconavale"], [28, "tsunamitour"]],
    ability: "opposizione",
    dexLine: "SENZA POLTRONA URLA IL DOPPIO. LIVE SOCIAL DALLA SPIAGGIA, RIGOROSAMENTE ALL'OPPOSIZIONE DI TUTTO."
  }),
  verdoribelle: S({
    id: "verdoribelle", dexNum: 42, name: "VERDORIBELLE", category: "ATTIVISTA RADICALE",
    types: ["VERDE"],
    base: { hp: 74, atk: 84, def: 70, spc: 90, spd: 82 },
    catchRate: 45, expYield: 175,
    learnset: [[1, "incollamano"], [1, "pistaciclabile"], [1, "sciopreverde"], [18, "transizione"], [24, "corteo"], [30, "scissione"]],
    ability: "opposizione",
    dexLine: "SI INCOLLA A OGNI QUADRO E OGNI DIBATTITO. NON CHIEDE IL PERMESSO: BLOCCA IL TRAFFICO E POI SPIEGA."
  }),
  salistrobo: S({
    id: "salistrobo", dexNum: 43, name: "SALISTROBO", category: "MOSTRO PALCO",
    types: ["SINISTRA", "MEDIA"],
    base: { hp: 58, atk: 80, def: 50, spc: 44, spd: 72 },
    catchRate: 90, expYield: 138,
    learnset: [[1, "corteo"], [1, "comizio"], [24, "monopattino"], [28, "festival"], [31, "articolouno"]],
    evolutions: [{ id: "salisound", level: 32, minSondaggi: 55 }],
    ability: "primapagina",
    dexLine: "CORRE DA UN PALCO ALL'ALTRO. IL CAVO-MICROFONO È PIÙ LUNGO DEL PROGRAMMA ELETTORALE."
  }),
  salisound: S({
    id: "salisound", dexNum: 44, name: "SALISOUND", category: "MOSTRO AMPLIFICATORE",
    types: ["SINISTRA", "MEDIA"],
    base: { hp: 72, atk: 105, def: 62, spc: 55, spd: 98 },
    catchRate: 30, expYield: 198,
    learnset: [[1, "corteo"], [1, "comizio"], [24, "monopattino"], [31, "articolouno"], [32, "festival"], [35, "sciopero"], [38, "diretta_social"], [40, "editoriale"], [42, "scissione"]],
    ability: "opposizione",
    dexLine: "TRASFORMA OGNI COMIZIO IN UN CONCERTO. QUANDO ALZA IL VOLUME, ANCHE I SONDAGGI BALLANO."
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
