import type { PolType } from "./poltypes";

export type StatusId = "indagato" | "scandalo" | "gaffe";
export type StatKey = "atk" | "def" | "spc" | "spd";

export interface MoveEffect {
  status?: { id: StatusId; chance: number; target: "foe" };
  stat?: { key: StatKey; stages: number; target: "self" | "foe"; chance?: number };
  healRatio?: number; // frazione dei PV massimi recuperata
  drainRatio?: number; // frazione del danno recuperata
  recoilRatio?: number; // frazione del danno subita come rinculo
  cureStatus?: boolean;
  highCrit?: boolean;
  priority?: number;
}

export interface Move {
  id: string;
  name: string;
  type: PolType;
  category: "fisico" | "speciale" | "status";
  power: number;
  accuracy: number; // 0-100; le mosse su se stessi non falliscono
  pp: number;
  effect?: MoveEffect;
  flavor: string;
}

const M = (m: Move) => m;

export const MOVES: Record<string, Move> = {
  comizio: M({
    id: "comizio", name: "COMIZIO", type: "POPULISMO", category: "fisico",
    power: 40, accuracy: 100, pp: 35,
    flavor: "Un classico intramontabile: parole forti, contenuti vaghi."
  }),
  slogan: M({
    id: "slogan", name: "SLOGAN", type: "POPULISMO", category: "status",
    power: 0, accuracy: 100, pp: 30,
    effect: { stat: { key: "def", stages: -1, target: "foe" } },
    flavor: "Tre parole urlate abbassano la DIFESA del nemico."
  }),
  promessa: M({
    id: "promessa", name: "PROMESSA ELETTORALE", type: "POPULISMO", category: "status",
    power: 0, accuracy: 100, pp: 25,
    effect: { stat: { key: "atk", stages: -1, target: "foe" } },
    flavor: "Promette tutto a tutti: il nemico si rilassa e cala l'ATTACCO."
  }),
  ruspa: M({
    id: "ruspa", name: "RUSPA", type: "POPULISMO", category: "fisico",
    power: 75, accuracy: 90, pp: 15,
    flavor: "Arriva facendo un gran rumore. Sottile come una ruspa."
  }),
  mojito: M({
    id: "mojito", name: "MOJITO", type: "POPULISMO", category: "status",
    power: 0, accuracy: 100, pp: 10,
    effect: { healRatio: 0.5 },
    flavor: "Pausa al Papeete: recupera metà dei PV."
  }),
  citofonata: M({
    id: "citofonata", name: "CITOFONATA", type: "POPULISMO", category: "fisico",
    power: 50, accuracy: 95, pp: 20,
    effect: { status: { id: "gaffe", chance: 30, target: "foe" } },
    flavor: "Suona al citofono del nemico. Può causare GAFFE."
  }),
  vaffa: M({
    id: "vaffa", name: "VAFFA SONORO", type: "POPULISMO", category: "speciale",
    power: 90, accuracy: 85, pp: 10,
    flavor: "Urlo primordiale nato in piazza. Devastante ma impreciso."
  }),
  tweet: M({
    id: "tweet", name: "TWEET AL VETRIOLO", type: "MEDIA", category: "speciale",
    power: 45, accuracy: 100, pp: 30,
    effect: { status: { id: "scandalo", chance: 20, target: "foe" } },
    flavor: "280 caratteri di puro livore. Può innescare uno SCANDALO."
  }),
  conferenza: M({
    id: "conferenza", name: "CONFERENZA STAMPA", type: "MEDIA", category: "speciale",
    power: 60, accuracy: 100, pp: 20,
    flavor: "Annuncia, smentisce e riannuncia nella stessa frase."
  }),
  telepromessa: M({
    id: "telepromessa", name: "TELEPROMESSA", type: "MEDIA", category: "status",
    power: 0, accuracy: 90, pp: 15,
    effect: { status: { id: "gaffe", chance: 100, target: "foe" } },
    flavor: "Ipnosi catodica: il nemico va in GAFFE."
  }),
  editoriale: M({
    id: "editoriale", name: "EDITORIALE", type: "MEDIA", category: "speciale",
    power: 80, accuracy: 95, pp: 10,
    flavor: "Mille parole in prima pagina che fanno malissimo."
  }),
  bunga: M({
    id: "bunga", name: "BUNGA PARTY", type: "MEDIA", category: "speciale",
    power: 95, accuracy: 90, pp: 5,
    effect: { status: { id: "gaffe", chance: 30, target: "foe" } },
    flavor: "Festa leggendaria. Chi la subisce non si riprende più."
  }),
  decreto: M({
    id: "decreto", name: "DECRETO LEGGE", type: "ISTITUZIONE", category: "fisico",
    power: 65, accuracy: 100, pp: 20,
    flavor: "Colpisce d'urgenza. La conversione in legge è un problema di domani."
  }),
  fiducia: M({
    id: "fiducia", name: "VOTO DI FIDUCIA", type: "ISTITUZIONE", category: "status",
    power: 0, accuracy: 100, pp: 20,
    effect: { stat: { key: "def", stages: 2, target: "self" } },
    flavor: "Blinda il provvedimento: DIFESA alle stelle."
  }),
  moralsuasion: M({
    id: "moralsuasion", name: "MORAL SUASION", type: "ISTITUZIONE", category: "speciale",
    power: 55, accuracy: 100, pp: 20,
    flavor: "Una telefonata gentile dal Colle. Gentile ma ferma."
  }),
  scioglimento: M({
    id: "scioglimento", name: "SCIOGLIMENTO CAMERE", type: "ISTITUZIONE", category: "speciale",
    power: 100, accuracy: 70, pp: 5,
    flavor: "L'arma finale del Garante. Tutti a casa."
  }),
  aureola: M({
    id: "aureola", name: "AUREOLA DORATA", type: "ISTITUZIONE", category: "status",
    power: 0, accuracy: 100, pp: 5,
    effect: { healRatio: 0.5, cureStatus: true },
    flavor: "La pazienza istituzionale cura PV e status."
  }),
  dossier: M({
    id: "dossier", name: "DOSSIERAGGIO", type: "TECNO", category: "speciale",
    power: 55, accuracy: 95, pp: 15,
    effect: { status: { id: "indagato", chance: 30, target: "foe" } },
    flavor: "Fascicoli che spuntano dal nulla. Può rendere INDAGATO."
  }),
  spread: M({
    id: "spread", name: "SPREAD LETALE", type: "TECNO", category: "speciale",
    power: 70, accuracy: 100, pp: 15,
    flavor: "Sale lo spread, calano i sorrisi."
  }),
  whatever: M({
    id: "whatever", name: "WHATEVER IT TAKES", type: "TECNO", category: "speciale",
    power: 110, accuracy: 85, pp: 5,
    flavor: "Tre parole. I mercati si inginocchiano."
  }),
  grafico: M({
    id: "grafico", name: "GRAFICO A TORTA", type: "TECNO", category: "speciale",
    power: 40, accuracy: 100, pp: 25,
    effect: { stat: { key: "spc", stages: -1, target: "foe", chance: 100 } },
    flavor: "Slide su slide: la RETORICA del nemico crolla per noia."
  }),
  giravolta: M({
    id: "giravolta", name: "GIRAVOLTA", type: "CENTRO", category: "fisico",
    power: 55, accuracy: 100, pp: 25,
    flavor: "Cambio di posizione fulmineo. Il nemico non sa più chi ha davanti."
  }),
  inciucio: M({
    id: "inciucio", name: "INCIUCIO", type: "CENTRO", category: "speciale",
    power: 40, accuracy: 100, pp: 15,
    effect: { drainRatio: 0.5 },
    flavor: "Accordo sottobanco: ruba energia al nemico."
  }),
  staisereno: M({
    id: "staisereno", name: "STAI SERENO", type: "CENTRO", category: "fisico",
    power: 70, accuracy: 100, pp: 10,
    effect: { highCrit: true },
    flavor: "Rassicura la vittima. Poi colpisce. Critico facile."
  }),
  terzopolo: M({
    id: "terzopolo", name: "TERZO POLO", type: "CENTRO", category: "status",
    power: 0, accuracy: 100, pp: 20,
    effect: { stat: { key: "spd", stages: 1, target: "self" } },
    flavor: "Si smarca da tutti e guadagna VELOCITÀ."
  }),
  pochette: M({
    id: "pochette", name: "POCHETTE POWER", type: "CENTRO", category: "status",
    power: 0, accuracy: 100, pp: 15,
    effect: { stat: { key: "spc", stages: 1, target: "self" } },
    flavor: "Eleganza ipnotica: la RETORICA sale di livello."
  }),
  blocconavale: M({
    id: "blocconavale", name: "BLOCCO NAVALE", type: "DESTRA", category: "fisico",
    power: 75, accuracy: 80, pp: 10,
    flavor: "Annunciato mille volte. Quando parte, fa male."
  }),
  radici: M({
    id: "radici", name: "RADICI CRISTIANE", type: "DESTRA", category: "fisico",
    power: 55, accuracy: 100, pp: 25,
    flavor: "Colpo identitario al grido di Dio, patria e famiglia."
  }),
  iosonogiorgia: M({
    id: "iosonogiorgia", name: "IO SONO GIORGIA", type: "DESTRA", category: "status",
    power: 0, accuracy: 100, pp: 10,
    effect: { stat: { key: "atk", stages: 1, target: "self" } },
    flavor: "Dichiarazione d'identità: l'ATTACCO sale al ritmo del remix."
  }),
  fiammatricolore: M({
    id: "fiammatricolore", name: "FIAMMA TRICOLORE", type: "DESTRA", category: "speciale",
    power: 85, accuracy: 95, pp: 10,
    flavor: "Eredità ardente che non si spegne mai del tutto."
  }),
  mondocontrario: M({
    id: "mondocontrario", name: "MONDO AL CONTRARIO", type: "DESTRA", category: "fisico",
    power: 80, accuracy: 75, pp: 10,
    flavor: "Attacco capovolto: nessuno capisce da dove arrivi."
  }),
  corteo: M({
    id: "corteo", name: "CORTEO", type: "SINISTRA", category: "fisico",
    power: 60, accuracy: 100, pp: 20,
    flavor: "Fiume di bandiere e megafoni in piazza."
  }),
  sciopero: M({
    id: "sciopero", name: "SCIOPERO GENERALE", type: "SINISTRA", category: "fisico",
    power: 70, accuracy: 95, pp: 15,
    flavor: "Blocca tutto, di venerdì."
  }),
  scissione: M({
    id: "scissione", name: "SCISSIONE", type: "SINISTRA", category: "speciale",
    power: 90, accuracy: 95, pp: 10,
    effect: { recoilRatio: 0.25 },
    flavor: "Potentissima, ma una parte del danno la fa a se stessa."
  }),
  ztl: M({
    id: "ztl", name: "ZTL", type: "SINISTRA", category: "status",
    power: 0, accuracy: 100, pp: 25,
    effect: { stat: { key: "spd", stages: -1, target: "foe" } },
    flavor: "Il nemico resta fuori dal centro: VELOCITÀ giù."
  }),
  greenwashing: M({
    id: "greenwashing", name: "GREENWASHING", type: "VERDE", category: "speciale",
    power: 50, accuracy: 100, pp: 20,
    effect: { status: { id: "gaffe", chance: 20, target: "foe" } },
    flavor: "Vernice verde su qualsiasi cosa. Confonde."
  }),
  monopattino: M({
    id: "monopattino", name: "MONOPATTINO", type: "VERDE", category: "fisico",
    power: 40, accuracy: 100, pp: 30,
    effect: { priority: 1 },
    flavor: "Sfreccia sul marciapiede: colpisce sempre per primo."
  }),
  dazilampo: M({
    id: "dazilampo", name: "DAZI LAMPO", type: "POPULISMO", category: "fisico",
    power: 85, accuracy: 90, pp: 10,
    flavor: "Tariffe doganali su tutto, alleati compresi."
  }),
  covfefe: M({
    id: "covfefe", name: "COVFEFE", type: "MEDIA", category: "status",
    power: 0, accuracy: 90, pp: 10,
    effect: { status: { id: "gaffe", chance: 100, target: "foe" } },
    flavor: "Tweet delle 3 di notte. Il nemico impazzisce a decifrarlo."
  }),
  gasdotto: M({
    id: "gasdotto", name: "GASDOTTO", type: "TECNO", category: "speciale",
    power: 75, accuracy: 95, pp: 10,
    flavor: "Chiude il rubinetto del gas: i termosifoni d'Europa tremano."
  }),
  tavololungo: M({
    id: "tavololungo", name: "TAVOLO LUNGO", type: "ISTITUZIONE", category: "status",
    power: 0, accuracy: 100, pp: 10,
    effect: { stat: { key: "def", stages: 2, target: "self" } },
    flavor: "Si siede a sei metri da tutti: quasi impossibile colpirlo."
  }),
  viadellaseta: M({
    id: "viadellaseta", name: "VIA DELLA SETA", type: "TECNO", category: "speciale",
    power: 60, accuracy: 100, pp: 10,
    effect: { drainRatio: 0.5 },
    flavor: "Presta consenso a interesse composto. Il conto arriva dopo."
  }),
  oscuramento: M({
    id: "oscuramento", name: "OSCURAMENTO", type: "ISTITUZIONE", category: "status",
    power: 0, accuracy: 90, pp: 10,
    effect: { stat: { key: "spc", stages: -2, target: "foe" } },
    flavor: "Il nemico sparisce dai motori di ricerca."
  }),
  enmarche: M({
    id: "enmarche", name: "EN MARCHE", type: "CENTRO", category: "status",
    power: 0, accuracy: 100, pp: 15,
    effect: { stat: { key: "spd", stages: 2, target: "self" } },
    flavor: "Né destra né sinistra: avanti, velocissimo."
  }),
  jupiter: M({
    id: "jupiter", name: "COMPLESSO DI GIOVE", type: "CENTRO", category: "speciale",
    power: 75, accuracy: 95, pp: 10,
    flavor: "Fulmini dall'Eliseo, con sommo sdegno presidenziale."
  }),
  multaue: M({
    id: "multaue", name: "MULTA UE", type: "TECNO", category: "speciale",
    power: 70, accuracy: 95, pp: 10,
    effect: { stat: { key: "spc", stages: -1, target: "foe", chance: 50 } },
    flavor: "Sanzione miliardaria, more e interessi inclusi."
  }),
  direttiva: M({
    id: "direttiva", name: "DIRETTIVA", type: "ISTITUZIONE", category: "status",
    power: 0, accuracy: 100, pp: 20,
    effect: { stat: { key: "atk", stages: -1, target: "foe" } },
    flavor: "Recepita in 24 lingue con effetto immediato."
  }),
  brexit: M({
    id: "brexit", name: "BREXIT HARD", type: "POPULISMO", category: "speciale",
    power: 100, accuracy: 90, pp: 5,
    effect: { recoilRatio: 0.33 },
    flavor: "Liberatoria e devastante. Soprattutto per chi la lancia."
  }),
  resilienza: M({
    id: "resilienza", name: "RESILIENZA", type: "ISTITUZIONE", category: "status",
    power: 0, accuracy: 100, pp: 10,
    effect: { healRatio: 0.5, stat: { key: "def", stages: 1, target: "self" } },
    flavor: "Resiste a tutto e ne esce più solido di prima."
  }),
  appelloalleati: M({
    id: "appelloalleati", name: "APPELLO AGLI ALLEATI", type: "MEDIA", category: "speciale",
    power: 70, accuracy: 100, pp: 15,
    flavor: "Collegamento in diretta con tutti i parlamenti del mondo."
  }),
  razzox: M({
    id: "razzox", name: "RAZZO RIUSABILE", type: "TECNO", category: "speciale",
    power: 95, accuracy: 85, pp: 5,
    flavor: "Decolla, esplode, atterra. Non sempre in quest'ordine."
  }),
  tsunamitour: M({
    id: "tsunamitour", name: "TSUNAMI TOUR", type: "POPULISMO", category: "speciale",
    power: 95, accuracy: 90, pp: 10,
    flavor: "Onda di comizi porta a porta: travolge interi collegi."
  }),
  redditone: M({
    id: "redditone", name: "REDDITO DI CITTAD.", type: "ISTITUZIONE", category: "status",
    power: 0, accuracy: 100, pp: 10,
    effect: { healRatio: 0.5 },
    flavor: "Sussidio miracoloso: recupera metà dei PV a fine mese."
  }),
  pienipoteri: M({
    id: "pienipoteri", name: "PIENI POTERI", type: "DESTRA", category: "status",
    power: 0, accuracy: 100, pp: 10,
    effect: { stat: { key: "atk", stages: 2, target: "self" } },
    flavor: "Li chiede dal Papeete: la GRINTA sale di brutto."
  }),
  algoritmo: M({
    id: "algoritmo", name: "ALGORITMO", type: "TECNO", category: "status",
    power: 0, accuracy: 100, pp: 15,
    effect: { stat: { key: "spc", stages: 2, target: "self" } },
    flavor: "Ottimizza l'engagement: RETORICA alle stelle."
  }),
  coloniamarte: M({
    id: "coloniamarte", name: "COLONIA SU MARTE", type: "TECNO", category: "speciale",
    power: 110, accuracy: 80, pp: 5,
    flavor: "Promette un pianeta nuovo. Il lancio non è rimborsabile."
  }),
  memedoge: M({
    id: "memedoge", name: "MEME DOGE", type: "MEDIA", category: "status",
    power: 0, accuracy: 90, pp: 10,
    effect: { status: { id: "gaffe", chance: 100, target: "foe" } },
    flavor: "Un cane sorridente che muove i mercati. Molto wow."
  })
};

// Etichette brevi delle statistiche, per le righe di riepilogo mossa.
const STAT_SHORT: Record<StatKey, string> = {
  atk: "GRINTA",
  def: "FACCIA",
  spc: "RETORICA",
  spd: "VELOCITÀ"
};

const STATUS_SHORT: Record<StatusId, string> = {
  indagato: "INDAGATO",
  scandalo: "SCANDALO",
  gaffe: "GAFFE"
};

// Categoria della mossa come parola chiara: COLPO / SPECIALE / EFFETTO.
export function moveKindLabel(move: Move): string {
  if (move.category === "status") {
    return "EFFETTO";
  }
  return move.category === "fisico" ? "COLPO" : "SPECIALE";
}

// Spiega a colpo d'occhio cosa fa una mossa: danno e/o effetti, buff/debuff,
// cure, status. Restituisce una riga compatta per il menu di lotta.
// Le frecce "▲"/"▼" esistono nel bitmap font (src/engine/font.ts).
export function moveSummary(move: Move): string {
  const parts: string[] = [];
  if (move.power > 0) {
    parts.push(`DANNO ${move.power}`);
  }
  const fx = move.effect;
  if (fx) {
    if (fx.healRatio) {
      parts.push(`CURA ${Math.round(fx.healRatio * 100)}% PV`);
    }
    if (fx.drainRatio) {
      parts.push("RUBA PV");
    }
    if (fx.recoilRatio) {
      parts.push("CONTRACCOLPO");
    }
    if (fx.cureStatus) {
      parts.push("TOGLIE STATUS");
    }
    if (fx.stat) {
      const arrow = fx.stat.stages > 0 ? "▲" : "▼";
      const who = fx.stat.target === "self" ? "TUO" : "NEMICO";
      const arrows = arrow.repeat(Math.min(2, Math.abs(fx.stat.stages)));
      parts.push(`${STAT_SHORT[fx.stat.key]} ${who} ${arrows}`);
    }
    if (fx.status) {
      const chance = fx.status.chance >= 100 ? "" : `${fx.status.chance}% `;
      parts.push(`${chance}${STATUS_SHORT[fx.status.id]}`);
    }
    if (fx.highCrit) {
      parts.push("CRITICO FACILE");
    }
    if (fx.priority && fx.priority > 0) {
      parts.push("COLPISCE PRIMA");
    }
  }
  if (parts.length === 0) {
    parts.push("DANNO BASE");
  }
  return parts.join("  ");
}

export const STATUS_LABELS: Record<StatusId, string> = {
  indagato: "IND",
  scandalo: "SCA",
  gaffe: "GAF"
};

export const STATUS_NAMES: Record<StatusId, string> = {
  indagato: "INDAGATO",
  scandalo: "NELLO SCANDALO",
  gaffe: "IN GAFFE"
};
