export interface TrainerDef {
  id: string;
  name: string;
  pal: string;
  team: Array<[string, number] | [string, number, string[]]>; // [speciesId, livello, mosse opzionali]
  intro: string[];
  defeat: string[];
  money: number;
  reward?: { itemId: string; qty: number };
  badge?: string; // id medaglia assegnata alla vittoria
}

export const TRAINERS: Record<string, TrainerDef> = {
  aide: {
    id: "aide", name: "PORTABORSE PIERO", pal: "aide",
    team: [["salvinott", 4], ["salvinott", 5]],
    intro: ["Porto tre borse, due telefoni e zero idee!", "Ma i miei SALVINOTT fanno comizi pure nel sonno!"],
    defeat: ["Le borse... sono pesanti... mi arrendo."],
    money: 200, reward: { itemId: "caffe", qty: 1 }
  },
  journalist: {
    id: "journalist", name: "GIORNALISTA RITA", pal: "journalist",
    team: [["tajanide", 7]],
    intro: ["Una domanda secca: favorevole o contrario?", "Risposta sbagliata! Intervista a colpi di TAJANIDE!"],
    defeat: ["Domani titolo: 'CLAMOROSA SCONFITTA'. Comunque bravo."],
    money: 280, reward: { itemId: "scheda", qty: 2 }
  },
  influencer: {
    id: "influencer", name: "INFLUENCER CHIARA", pal: "influencer",
    team: [["vannaccix", 9], ["bojoon", 9]],
    intro: ["Sto facendo una storia, fermo lì!", "I miei fanno numeri PAZZESCHI. Al contrario, ma li fanno."],
    defeat: ["Questa sconfitta... la posto lo stesso. ENGAGEMENT!"],
    money: 360, reward: { itemId: "spritz", qty: 1 }
  },
  lobbista: {
    id: "lobbista", name: "LOBBISTA EUGENIO", pal: "aide",
    team: [["tajanide", 11], ["contemorfo", 12]],
    intro: ["Rappresento interessi molto, molto importanti.", "I tuoi, se il prezzo è giusto. Intanto ti sfido!"],
    defeat: ["Interessante... posso rappresentare anche te?"],
    money: 560
  },
  stagista: {
    id: "stagista", name: "STAGISTA TV MARA", pal: "journalist",
    team: [["tajanide", 11], ["contemorfo", 11]],
    intro: ["Stage non pagato, undicesimo anno!", "Ma so reggere un gobbo e un dibattito!"],
    defeat: ["Ok, torno a reggere il gobbo..."],
    money: 440
  },
  // ---- PERCORSO 2 (Mediopoli-Eurotown) ----
  opinionista: {
    id: "opinionista", name: "OPINIONISTA PERENNE", pal: "journalist",
    team: [["mediocrate", 12], ["tajanide", 13]],
    intro: ["Sono ospite fisso di sette salotti.", "Il mio parere? Contrario. A cosa? Vedremo in onda."],
    defeat: ["Ne parlerò malissimo in prima serata."],
    money: 520, reward: { itemId: "scheda", qty: 2 }
  },
  claqueur: {
    id: "claqueur", name: "CAPO CLAQUE", pal: "influencer",
    team: [["vannaccix", 12], ["bojoon", 13]],
    intro: ["APPLAUSI! No, non per te.", "La mia claque applaude a cachet. Ora fischia te."],
    defeat: ["Cala il sipario... e pure il gettone."],
    money: 540, reward: { itemId: "spritz", qty: 1 }
  },
  telelobbista: {
    id: "telelobbista", name: "LOBBISTA CATODICO", pal: "aide",
    team: [["mediocrate", 13], ["calendauro", 14]],
    intro: ["Piazzo emendamenti tra una pubblicità e l'altra.", "Il tuo consenso mi serve: lo compro o lo prendo."],
    defeat: ["Segno la sconfitta a bilancio. Voce: investimenti."],
    money: 560
  },
  emittenza: {
    id: "emittenza", name: "SUA EMITTENZA", pal: "boss",
    team: [["tajanide", 12], ["berlusconix", 14]],
    intro: [
      "Benvenuto nel mio studio, giovane!",
      "Quarant'anni di share, zero sconfitte conteggiate.",
      "Lo dico con affetto: ora ti distruggo in prima serata."
    ],
    defeat: ["Incredibile! Ripeteremo lo scontro... dopo la pubblicità."],
    money: 1400, badge: "auditel", reward: { itemId: "dirBunga", qty: 1 }
  },
  funzionario: {
    id: "funzionario", name: "FUNZIONARIO HANS", pal: "aide",
    team: [["tajanide", 15], ["calendauro", 15]],
    intro: ["Halt! Per sfidare la palestra serve il modulo B-7.", "Non ce l'hai? Allora si combatte. È la procedura."],
    defeat: ["Protocollo la sconfitta in triplice copia."],
    money: 600
  },
  ladydirettiva: {
    id: "ladydirettiva", name: "LADY DIRETTIVA", pal: "granny",
    team: [["macronfox", 16], ["ursulax", 18]],
    intro: [
      "Benvenuto. Questa sfida è conforme al regolamento UE 2026/1.",
      "Articolo 1: vinco io. Articolo 2: vedi articolo 1."
    ],
    defeat: ["Inaudito... dovrò emendare l'articolo 1."],
    money: 1800, badge: "spread", reward: { itemId: "schedona", qty: 2 }
  },
  diplomatico: {
    id: "diplomatico", name: "DIPLOMATICO SERGIO", pal: "guard",
    team: [["zelenskir", 18]],
    intro: ["La diplomazia ha fallito.", "Si passa alle maniere forti, con eleganza."],
    defeat: ["Propongo un cessate il fuoco. Subito."],
    money: 720
  },
  oligarca: {
    id: "oligarca", name: "OLIGARCA DIMITRI", pal: "aide",
    team: [["putingrad", 19]],
    intro: ["Il mio capo non perde mai. Io nemmeno.", "Lo yacht l'ho vinto così."],
    defeat: ["Niente panico. Ho altri tre yacht."],
    money: 900
  },
  // ---- PERCORSO 3 (Eurotown-Capitale) + GROTTA2 ----
  usciere: {
    id: "usciere", name: "USCIERE DEL POTERE", pal: "guard",
    team: [["tajanide", 16], ["contemorfo", 16]],
    intro: ["Alt. Lei ha l'appuntamento?", "No? Allora l'anticamera la fa qui. Con me."],
    defeat: ["Si accomodi... ma non si abitui."],
    money: 720
  },
  protocollista: {
    id: "protocollista", name: "ISPETTRICE DEL PROTOCOLLO", pal: "granny",
    team: [["ursulax", 17], ["macronfox", 16]],
    intro: ["Il suo passaggio non risulta protocollato.", "Regolarizziamo: uno scontro, in triplice copia."],
    defeat: ["Annoto: respinta. Con timbro storto."],
    money: 780, reward: { itemId: "caffe", qty: 1 }
  },
  eminenza: {
    id: "eminenza", name: "EMINENZA GRIGIA", pal: "aide",
    team: [["zelenskir", 17], ["muskrat", 17], ["calendauro", 18]],
    intro: ["Non mi hai mai visto. Non sono mai stato qui.", "Decido io chi passa verso CAPUT MUNDI. Da sempre."],
    defeat: ["Interessante... ti terrò d'occhio. Da nessun luogo."],
    money: 920, reward: { itemId: "schedona", qty: 1 }
  },
  archivista: {
    id: "archivista", name: "ARCHIVISTA CAPO", pal: "aide",
    team: [["muskrat", 16], ["contemorfo", 17]],
    intro: ["Zitto! Qui i segreti di Stato dormono.", "E tu li stai calpestando. Multa e duello."],
    defeat: ["Archivio la sconfitta sotto X. Di 'X file'."],
    money: 800, reward: { itemId: "maalox", qty: 1 }
  },
  bunkerista: {
    id: "bunkerista", name: "MEMELOGO DEL BUNKER", pal: "aide",
    team: [["bunkerput", 9], ["putingrad", 10]],
    intro: [
      "Benvenuto nel corridoio dove i meme diventano geopolitica.",
      "Ho studiato ogni frame del tavolo lungo. Ora ti interrogo."
    ],
    defeat: ["Il meme mi ha voltato le spalle. O forse era solo troppo lontano."],
    money: 620, reward: { itemId: "caffe", qty: 1 }
  },
  tycoon: {
    id: "tycoon", name: "MR. TYCOON", pal: "boss",
    team: [["bojoon", 20], ["muskrat", 21], ["trumpon", 23]],
    intro: [
      "Questa palestra è la più bella mai costruita. Lo dicono tutti.",
      "Ho dazi bellissimi, enormi, e ora li provo su di te.",
      "Sarà una vittoria tremendous. Per me, ovviamente."
    ],
    defeat: ["FAKE BATTLE! Esigo il riconteggio dei PV!"],
    money: 2600, badge: "dazio", reward: { itemId: "schedona", qty: 3 }
  },
  // ---- Stretto di Messina ----
  djpapeete: {
    id: "djpapeete", name: "DJ DEL PAPEETE", pal: "influencer",
    team: [["salvinott", 19], ["salvinott", 20]],
    intro: ["Questa spiaggia è una pista da ballo elettorale!", "L'inno nazionale? Lo metto dopo, in versione remix."],
    defeat: ["Ok, abbasso il volume... ma solo fino al ballottaggio."],
    money: 700, reward: { itemId: "spritz", qty: 1 }
  },
  citofonista: {
    id: "citofonista", name: "CITOFONISTA SERIALE", pal: "aide",
    team: [["vannaccix", 20], ["contemorfo", 20]],
    intro: ["DRIIIN. Scusi, lei spaccia consensi?", "Lo chiedo a tutti, citofonando. Le telecamere sono già accese."],
    defeat: ["Nessuno mi apre più... nemmeno la sconfitta."],
    money: 760
  },
  noponte: {
    id: "noponte", name: "ATTIVISTA NO-PONTE", pal: "journalist",
    team: [["grillix", 20], ["calendauro", 21]],
    intro: ["Fermo! Questo ponte è un ecomostro!", "Il fatto che non esista non lo rende meno mostruoso!"],
    defeat: ["Va bene... protesterò contro la prossima opera. In anticipo."],
    money: 800
  },
  geometra: {
    id: "geometra", name: "GEOMETRA DEL CANTIERE", pal: "guard",
    team: [["tajanide", 21], ["muskrat", 21]],
    intro: ["Alt! Zona cantiere: servono casco e maggioranza qualificata.", "Il progetto è PRONTO dal 1969. Manca solo il ponte."],
    defeat: ["Segno la sconfitta sul libretto di cantiere. Pagina 4500."],
    money: 850, reward: { itemId: "caffe", qty: 1 }
  },
  ilcapitano: {
    id: "ilcapitano", name: "IL CAPITANO", pal: "boss",
    team: [["salvinator", 22], ["vannaccix", 22], ["capitanone", 24]],
    intro: [
      "Benvenuto nel cantiere più fotografato d'Italia.",
      "Da qui si vede la SICILIA. Avvicinarla è il mio mandato.",
      "Ho giurato sul mojito: prima gli italiani, poi il collaudo.",
      "Difendo questo ponte con tutto quello che ho. Cioè un molo."
    ],
    defeat: ["Ok, ok... rinviamo l'inaugurazione. DI NUOVO."],
    money: 3000, reward: { itemId: "tessera", qty: 1 }
  },
  giudice1: {
    id: "giudice1", name: "GIUDICE ONORARIA", pal: "granny",
    team: [["ursulax", 24], ["calendauro", 25]],
    intro: ["Primo grado di giudizio: ammissibilità.", "Spoiler: il tuo ricorso è inammissibile."],
    defeat: ["Ammissibile. Con riserva. E con stupore."],
    money: 1200
  },
  giudice2: {
    id: "giudice2", name: "GIUDICE EMERITO", pal: "aide",
    team: [["tajanide", 25], ["draghimon", 26]],
    intro: ["Sono emerito: giudico anche in pensione.", "La mia giurisprudenza ti seppellirà di rinvii."],
    defeat: ["Mi rimetto... alla Corte. E al divano."],
    money: 1300
  },
  giudice3: {
    id: "giudice3", name: "GIUDICE SUPREMA", pal: "journalist",
    team: [["xipanda", 27], ["putingrad", 27]],
    intro: ["Ultimo grado: legittimità costituzionale.", "Ho cassato riforme intere. Tu sei un comma."],
    defeat: ["Sentenza ribaltata... depositerò le motivazioni tra nove anni."],
    money: 1500
  },
  garante: {
    id: "garante", name: "IL GARANTE SUPREMO", pal: "boss",
    team: [["zelenskir", 28], ["ursulax", 29], ["draghimon", 30], ["mattarellux", 32]],
    intro: [
      "Benvenuto al COLLE. Qui non si vince: si viene controfirmati.",
      "Ho rispedito indietro leggi, governi e persino un paio di inni.",
      "Volevo andare in pensione. Invece eccoci qui. Di nuovo.",
      "Dimostrami che il tuo mandato vale l'inchiostro della mia penna."
    ],
    defeat: ["Notevole. Prendo atto. La Repubblica, pure."],
    money: 8000, reward: { itemId: "schedona", qty: 3 }
  },
  boss: {
    id: "boss", name: "PRESIDENTE OMBRA", pal: "boss",
    team: [["contemorfo", 20], ["xipanda", 22], ["draghimon", 24], ["mattarellux", 26]],
    intro: [
      "Benvenuto al Palazzo. Io non esisto, ufficialmente.",
      "Governo da trent'anni senza essere mai stato eletto.",
      "Tre medaglie? Carine. Io colleziono governi.",
      "Vediamo se la tua campagna elettorale vale qualcosa."
    ],
    defeat: ["Impossibile... convocherò un tavolo tecnico su questa sconfitta."],
    money: 5000, reward: { itemId: "schedona", qty: 3 }
  }
};

export const BADGES: Record<string, { name: string; desc: string }> = {
  auditel: { name: "MEDAGLIA AUDITEL", desc: "Vinta in prima serata contro SUA EMITTENZA." },
  spread: { name: "MEDAGLIA SPREAD", desc: "Strappata a LADY DIRETTIVA, in conformità alle norme." },
  dazio: { name: "MEDAGLIA DAZIO", desc: "Sottratta a MR. TYCOON. Dazi doganali esclusi." }
};

// Cliffhanger mostrato dopo aver conquistato una medaglia: anticipa la prossima
// tappa per spingere il giocatore a continuare ("e adesso cosa mi aspetta?").
export const BADGE_TEASER: Record<string, string[]> = {
  auditel: [
    "Un dispaccio da BRUXELLES lampeggia sul tuo telefono.",
    "LADY DIRETTIVA ti ha già intestato un fascicolo a EUROTOWN, a nord.",
    "Pare regoli persino il vento. La MEDAGLIA SPREAD non si conquista: si recepisce."
  ],
  spread: [
    "Una telefonata intercontinentale: voce nasale, autostima alle stelle.",
    "MR. TYCOON ti sfida dalla GLOBAL TOWER di CAPUT MUNDI, ancora più su.",
    "Dice che sarà 'la sconfitta più bella della tua vita'. La MEDAGLIA DAZIO è lassù."
  ],
  dazio: [
    "Tre medaglie. Il PALAZZO, finora sbarrato, scricchiola.",
    "Una sagoma senza nome ti osserva dalle telecamere: il PRESIDENTE OMBRA.",
    "'Governo da trent'anni senza essere eletto', sussurra il vento. È ora di salire."
  ]
};
