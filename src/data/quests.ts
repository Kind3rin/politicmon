import type { GameState } from "../game/state";
import type { BranchingQuestDef } from "../game/questFlow";
import { firstEvolutionDone, OPENING_QUEST_ORDER } from "../game/firstCampaign";

export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  hint: string;
  step: string;
  isDone: (state: GameState) => boolean;
  side?: boolean; // missione secondaria: non guida l'HUD "prossimo passo"
  target?: { mapId: string; x: number; y: number }; // bersaglio per la modalità guidata
  flow?: BranchingQuestDef; // opzionale: le quest storiche restano lineari e compatibili
}

export const QUESTS: QuestDef[] = [
  {
    id: "civic-promises", side: true, title: "IL VERBALE NON SPARISCE",
    desc: "Finanzia la corsa a Borgo, lo sportello a Eurotown e la rampa allo Stretto.",
    hint: "Ascolta il pensionato di Borgo, quello di Eurotown e l'ingegnere allo Stretto. Le date sono nel menu MORALE.",
    step: "Mantieni o ripara le tre promesse.",
    isDone: (state) => ["bus", "sportello", "traghetto"].every((id) => state.morale.promises.some((promise) => promise.id === id && (promise.status === "kept" || promise.status === "repaired")))
  },
  {
    id: "starter",
    title: "UN CANDIDATO TUTTO TUO",
    desc: "Scegli il tuo primo POLITICMON nel Laboratorio del Consenso.",
    hint: "Il laboratorio è a NORD-OVEST: cerca il tetto blu a BORGO URNE.",
    step: "Laboratorio a nord-ovest: tetto blu.",
    isDone: (s) => Boolean(s.flags["starter-chosen"]),
    target: { mapId: "borgo", x: 7, y: 12 }
  },
  {
    id: "rival1",
    title: "PRIMO DIBATTITO",
    desc: "Vinci il confronto con il RIVALE GIANNI.",
    hint: "Gianni aspetta sulla strada del PERCORSO 1. Cura la squadra e studia il suo intento.",
    step: "Sfida Gianni nel Percorso 1.",
    isDone: (s) => Boolean(s.flags["rival1-beaten"]) || s.badges.includes("auditel"),
    target: { mapId: "route1", x: 15, y: 5 }
  },
  {
    id: "dex",
    title: "IL POLITICDEX",
    desc: "Ricevi il POLITICDEX dal Professor Quirino.",
    hint: "Quirino lo consegna insieme alle prime schede dopo la scelta dello starter.",
    step: "Parla col Professor Quirino nel laboratorio.",
    isDone: (s) => Boolean(s.flags["dex-received"])
  },
  {
    id: "recruit", title: "UNA SQUADRA, DUE VOCI",
    desc: "Recluta un secondo candidato. Costruire una squadra dà anche esperienza.",
    hint: "Erba di Borgo e PERCORSO 1; CATTURA > SCHEDA. Indebolisci senza KO. Il tipografo di Borgo ne regala cinque.",
    step: "Recluta nel Percorso 1.",
    isDone: (s) => s.party.length + s.boxed.length >= 2 || s.badges.includes("auditel"),
    target: { mapId: "route1", x: 19, y: 13 }
  },
  {
    id: "grow", title: "IL SIMBOLO NON BASTA",
    desc: "Fai evolvere lo starter: la prima nuova forma è disponibile al livello 8.",
    hint: "Nino offre una pratica breve a est del PERCORSO 1. Puoi riprendere l'evoluzione dalla SQUADRA.",
    step: "Allena lo starter fino al livello 8 ed evolvilo.",
    isDone: (s) => !s.flags["opening-v2"] || firstEvolutionDone(s) || Boolean(s.flags["rival1-beaten"]) || s.badges.includes("auditel"),
    target: { mapId: "route1", x: 20, y: 9 }
  },
  {
    id: "share", title: "IL FONDALE VUOLE CRESCERE",
    desc: "DIVISA EQUA: metà EXP alla panchina viva, senza toglierla al leader.",
    hint: "Il sindacalista è a nord della piazza di Mediopoli. La Divisa è passiva; i KO non crescono.",
    step: "Ritira la Divisa Equa a Mediopoli.",
    isDone: (s) => (s.bag.divisa ?? 0) > 0 || s.badges.includes("auditel"),
    target: { mapId: "mediopoli", x: 15, y: 7 }
  },
  {
    id: "gym1",
    title: "MEDAGLIA AUDITEL",
    desc: "Sconfiggi SUA EMITTENZA nello STUDIO 5 di MEDIOPOLI.",
    hint: "Studio 5, tetto giallo. Mara offre una prova facoltativa; il bar cura PV e PP. Il briefing annuncia i livelli.",
    step: "Prova la squadra con Mara, poi sfida Sua Emittenza.",
    isDone: (s) => s.badges.includes("auditel"),
    target: { mapId: "mediopoli", x: 6, y: 10 }
  },
  {
    id: "governo",
    // side: la formazione del GOVERNO OMBRA è opzionale e senza target; se guidasse
    // l'HUD, dopo la 1ª medaglia la freccia sparirebbe e il "prossimo passo" naggerebbe
    // su una feature secondaria invece di puntare a gym2/EUROTOWN.
    side: true,
    title: "TOTOMINISTRI",
    desc: "Forma il GOVERNO OMBRA: assegna almeno un ministero a un tuo POLITICMON.",
    hint: "Menu (START) -> GOVERNO. Ogni ministero dà un bonus passivo alla campagna.",
    step: "Assegna un ministero dal menu GOVERNO.",
    isDone: (s) => Object.keys(s.ministri).length > 0
  },
  {
    id: "gym2",
    title: "MEDAGLIA SPREAD",
    desc: "Sconfiggi LADY DIRETTIVA nella PALESTRA UE di EUROTOWN.",
    hint: "Oltre PERCORSO 2, tetto blu. Hans è facoltativo; esci e cura i PP al bar prima del boss.",
    step: "Prepara la squadra e sfida Lady Direttiva.",
    isDone: (s) => s.badges.includes("spread"),
    target: { mapId: "eurotown", x: 6, y: 5 }
  },
  {
    id: "gym3",
    title: "MEDAGLIA DAZIO",
    desc: "Sconfiggi MR. TYCOON nella GLOBAL TOWER di CAPUT MUNDI.",
    hint: "Oltre PERCORSO 3, palestra a ovest. Due prove facoltative; cura PV e PP prima di Tycoon.",
    step: "Prepara la squadra e sfida la Global Tower.",
    isDone: (s) => s.badges.includes("dazio"),
    target: { mapId: "capitale", x: 6, y: 11 }
  },
  {
    id: "ponte", side: true, // area OPZIONALE: non deve deviare l'HUD dal PALAZZO
    title: "IL RENDERING NON ATTRAVERSA",
    desc: "Deviazione facoltativa con tre medaglie: il marinaio al porto di Capitale consegna il TRAGHETTO. Il Capitano assegna una TESSERA DORATA.",
    hint: "Marinaio a sudovest, molo a sud. A apre il briefing del Capitano, B annulla. La darsena riporta a Capitale.",
    step: "Leggi il premio e prepara il collaudo dello Stretto.",
    isDone: (s) => Boolean(s.flags["ponte-beaten"]),
    target: { mapId: "capitale", x: 4, y: 19 }
  },
  {
    id: "boss",
    title: "L'UOMO DEL PALAZZO",
    desc: "Con 3 medaglie, entra nel PALAZZO e sconfiggi il PRESIDENTE OMBRA.",
    hint: "Quattro avversari. Il bar recupera PV e PP; l'ambulante di Capitale vende cure da usare in lotta.",
    step: "Con 3 medaglie, entra nel Palazzo.",
    isDone: (s) => Boolean(s.flags["boss-beaten"]),
    target: { mapId: "capitale", x: 14, y: 5 }
  },
  {
    id: "colle", side: true,
    title: "TRE SEDIE, TRE PROVE",
    desc: "Tre sfide facoltative al COLLE: regole, competenze e diritti. Preparano la squadra per il GARANTE.",
    hint: "A apre il briefing, B annulla. Puoi scendere al bar di Capitale fra le prove.",
    step: "Affronta i tre GIUDICI, nell'ordine che vuoi.",
    isDone: (s) =>
      ["giudice1", "giudice2", "giudice3"].every((id) => s.defeatedTrainers.includes(id)),
    target: { mapId: "palazzo", x: 5, y: 1 }
  },
  {
    id: "garante",
    title: "LA CONTROFIRMA",
    desc: "Sconfiggi IL GARANTE SUPREMO e fatti controfirmare il mandato.",
    hint: "Porta dorata. START cambia leader. Prima rifornisci le cure dall'ambulante e recupera i PP al bar.",
    step: "Sconfiggi IL GARANTE SUPREMO.",
    isDone: (s) => Boolean(s.flags["garante-beaten"])
  },
  // ---- Post-game: PARADISO OFFSHORE (dopo la CONTROFIRMA) ----
  {
    id: "offshore-rotta",
    title: "ACQUE INTERNAZIONALI",
    desc: "Si mormora di un'isola dove i FONDI vanno in vacanza. Salpa dalle boe a est dello STRETTO.",
    hint: "Serve la MN TRAGHETTO del MARINAIO di Caput Mundi. Segui ROTTA: PARADISO OFFSHORE sul bordo est dello Stretto.",
    step: "Raggiungi il PARADISO OFFSHORE.",
    isDone: (s) => Boolean(s.flags["hint-offshore"]),
    target: { mapId: "stretto", x: 28, y: 10 }
  },
  {
    id: "offshore-tesoriere",
    title: "IL TESORIERE FANTASMA",
    desc: "Sul lido le società abitano in conchiglie. Sull'altopiano il TESORIERE tiene un caveau dentro l'altro.",
    hint: "Scala a nord-est. A apre il dossier: tipi, mosse e leader. Il LIDO CAYMAN cura PV e PP; le due prove e i reclutamenti preparano la squadra.",
    step: "Sconfiggi IL TESORIERE FANTASMA.",
    isDone: (s) => Boolean(s.flags["offshore-beaten"]),
    target: { mapId: "offshore", x: 23, y: 7 }
  },
  // ---- Post-game: ELEZIONI UE (BRUXELLES), dopo la CONTROFIRMA ----
  {
    id: "ue-rotta",
    title: "ELEZIONI EUROPEE",
    desc: "Si vota per il PARLAMENTO UE. Salpa per BRUXELLES: la vera partita si gioca lì.",
    hint: "Lo SHERPA UE sull'OFFSHORE conosce la rotta. Segui ROTTA: BRUXELLES sul bordo est dell'isola.",
    step: "Raggiungi BRUXELLES.",
    // Completa quando SEI ARRIVATO a Bruxelles (hint-brux-arrivo, settato allo
    // sbarco) — non solo quando hai parlato allo SHERPA (hint-ue): chi salpa
    // senza sherpa avrebbe la guida bloccata su questa quest anche dopo la vittoria.
    isDone: (s) => Boolean(s.flags["hint-brux-arrivo"] || s.flags["hint-ue"] || s.flags["ue-beaten"]),
    target: { mapId: "offshore", x: 28, y: 9 }
  },
  {
    id: "ue-commissione",
    title: "IL VERBALE DI BRUXELLES",
    desc: "Supera LA COMMISSIONE. Una firma deve assegnare un lavoro, non soltanto un altro tavolo.",
    hint: "Palazzo a nord: quattro avversari LV 52-55. Le prove sul viale sono facoltative. Il CAFFÈ SCHUMAN cura PV e PP.",
    step: "Sconfiggi LA COMMISSIONE a BRUXELLES.",
    isDone: (s) => Boolean(s.flags["ue-beaten"]),
    target: { mapId: "bruxelles", x: 12, y: 5 }
  },
  {
    id: "atto3-campo-arrivo",
    title: "LA FOTO DEL CAMPO",
    desc: "Dopo Bruxelles, una coalizione impossibile ti aspetta per la foto ufficiale.",
    hint: "A sud-est di BRUXELLES trovi il passaggio per CAMPO LARGO.",
    step: "Raggiungi CAMPO LARGO.",
    isDone: (s) => Boolean(s.flags["atto3Started"]),
    target: { mapId: "bruxelles", x: 19, y: 12 }
  },
  {
    id: "atto3-foto-scelta",
    title: "TUTTI NEL FRAME",
    desc: "Conosci i tre candidati e scegli i due nomi della prima coalizione.",
    hint: "Parla con tutti e scegli due alleati nelle loro carte. Il RETROPALCO gestisce la squadra; il FOTOGRAFO a nord apre la scelta.",
    step: "Componi la coalizione e decidi la foto.",
    isDone: (s) => Boolean(s.flags["campo-photo-choice-complete"]),
    target: { mapId: "campo_largo", x: 10, y: 2 }
  },
  {
    id: "atto3-foto-finale",
    title: "LO SCATTO UFFICIALE",
    desc: "Supera il dibattito d'inquadratura e conquista la foto finale.",
    hint: "Affronta il MODERATORE nel campo, poi torna dal FOTOGRAFO sul palco a nord.",
    step: "Sconfiggi il FOTOGRAFO UFFICIALE.",
    isDone: (s) => Boolean(s.flags["campo-photo-complete"]),
    target: { mapId: "campo_largo", x: 10, y: 2 }
  },
  {
    id: "atto3-futuro-arrivo",
    title: "IL PARTITO CHE NON C'ERA",
    desc: "FUTURO ANTERIORE inaugura oggi il partito definitivo di domani.",
    hint: "Dal lato est di CAMPO LARGO raggiungi la nuova convention.",
    step: "Raggiungi FUTURO ANTERIORE.",
    isDone: (s) => Boolean(s.flags["future-badge-received"]),
    target: { mapId: "campo_largo", x: 20, y: 8 }
  },
  {
    id: "atto3-futuro-scelta",
    title: "DUE MANIFESTI E UNA LINEA",
    desc: "Leggi Scissione e Rebranding, ruota i manifesti e scegli una linea.",
    hint: "Parla con i due responsabili nelle sale laterali, poi con gli addetti alle leve. La Tesoreria legge i tuoi debiti; il tavolo centrale mostra tre scelte.",
    step: "Apri il corridoio e registra la scelta.",
    isDone: (s) => Boolean(s.flags["future-choice-complete"]),
    target: { mapId: "futuro_sede", x: 8, y: 3 }
  },
  {
    id: "atto3-futuro-boss",
    title: "IL SEGRETARIO DEL DOMANI",
    desc: "Affronta FUTURORSO e chiudi l'assemblea del partito che non c'era.",
    hint: "A apre il dossier del Segretario, B lo rinvia. Per recuperare PV e PP puoi tornare al medico nel Campo: scelta e leve restano salvate.",
    step: "Sconfiggi il SEGRETARIO DEL DOMANI.",
    isDone: (s) => Boolean(s.flags.futureResolved),
    target: { mapId: "futuro_sede", x: 8, y: 1 }
  },
  {
    id: "atto3-diplomacy-arrivo",
    title: "TEMPTATION DIPLOMACY",
    desc: "Un vertice internazionale è diventato un reality diplomatico.",
    hint: "Dalla piazza FUTURO ANTERIORE parte la navetta per l'HOTEL DIPLOMATICO.",
    step: "Fai il check-in al vertice.",
    isDone: (s) => Boolean(s.flags["diplomacy-checked-in"]),
    target: { mapId: "futuro_piazza", x: 2, y: 8 }
  },
  {
    id: "atto3-diplomacy-scelta",
    title: "TRE PASS, UNA SCELTA",
    desc: "Valuta FEDELTÀ, AUTONOMIA e CONSENSO prima della diretta.",
    hint: "Apri i tre dossier: AUTONOMIA ripara un patto teso per 500€. CONSENSO può strappare patti anche a SONDAGGI 100.",
    step: "Registra la scelta diplomatica.",
    isDone: (s) => Boolean(s.flags["diplomacy-choice-complete"]),
    target: { mapId: "diplomacy_lobby", x: 9, y: 3 }
  },
  {
    id: "atto3-diplomacy-boss",
    title: "IL PARTNER PERFETTO",
    desc: "La terrazza è in diretta. Chiudi il vertice senza farti ritagliare dal selfie.",
    hint: "Terrazza dall'ala destra: parla al Partner e apri il dossier. Per curarti torna a CAMPO LARGO via FUTURO ANTERIORE.",
    step: "Sconfiggi IL PARTNER PERFETTO.",
    isDone: (s) => Boolean(s.flags.diplomacyComplete),
    target: { mapId: "diplomacy_terrace", x: 10, y: 2 }
  },
  {
    id: "side-genova-techno", side: true,
    title: "GENOVA TECHNO",
    desc: "Segui sei battute sul maxischermo. Sbagliare cambia il premio, non blocca nulla.",
    hint: "Dall'ala est dell'hotel, parla al DJ. SIN/DES sceglie il timer; B mette in pausa. Puoi allenarti dopo il premio.",
    step: "Completa il set GENOVA TECHNO.",
    isDone: (s) => Boolean(s.flags["genova-techno-complete"]),
    target: { mapId: "diplomacy_lobby", x: 18, y: 10 }
  },
  {
    id: "atto3-tour-feed",
    title: "IL TOUR DEI CINQUE COLLEGI",
    desc: "Consegna cinque dossier completando due azioni in ogni collegio, nell'ordine che preferisci.",
    hint: "Dall'ala ovest dell'HOTEL DIPLOMATICO raggiungi l'hub TOUR DEL FEED.",
    step: "Completa NORD, CENTRO, SUD, ISOLE e FEED.",
    isDone: (s) => s.election.phase === "ready" || s.election.phase === "locked" || s.election.phase === "resolved",
    target: { mapId: "diplomacy_lobby", x: 1, y: 10 }
  },
  ...(["nord", "centro", "sud", "isole", "feed"] as const).map((id) => ({
    id: `side-collegio-${id}`,
    side: true as const,
    title: `DOSSIER ${id.toUpperCase()}`,
    desc: "Scegli due azioni: DIBATTITO, PROMESSA o SOSTEGNO. La terza resterà chiusa.",
    hint: "Nel TOUR DEL FEED, entra nel collegio e parla al coordinatore locale.",
    step: `Completa il collegio ${id.toUpperCase()}.`,
    isDone: (s: GameState) => Boolean(s.flags[`district-complete:${id}`])
  })),
  {
    id: "atto3-palazzo-feed",
    title: "PALAZZO DEI FEED",
    desc: "Archivia algoritmo, fact-check, talk show e silenzio stampa prima della diretta.",
    hint: "Dal TOUR DEL FEED entra nel Palazzo. Leggi i verbali e verifica i fatti nei quattro archivi.",
    step: "Completa i quattro archivi del Palazzo.",
    isDone: (s) => Boolean(s.flags.palaceRoomsComplete),
    target: { mapId: "tour_feed", x: 11, y: 1 }
  },
  {
    id: "atto3-election-night",
    title: "ELECTION NIGHT",
    desc: "Affronta L'ALGORITMO SOVRANO e segui lo scrutinio dei cinque collegi.",
    hint: "Con i quattro archivi completi, entra nello STUDIO ELETTORALE del Palazzo dei Feed.",
    step: "Avvia la diretta e completa lo scrutinio.",
    isDone: (s) => Boolean(s.flags["election-night-complete"]),
    target: { mapId: "palazzo_feed", x: 9, y: 1 }
  },
  {
    id: "atto3-epilogo",
    title: "IL GIORNO DOPO",
    desc: "Guarda l'epilogo della coalizione, i crediti e gli sblocchi post-game.",
    hint: "Dopo lo scrutinio resta nello STUDIO ELETTORALE e continua fino alla terrazza.",
    step: "Completa l'epilogo di Atto 3.",
    isDone: (s) => Boolean(s.flags.atto3Complete),
    target: { mapId: "palazzo_feed_studio", x: 7, y: 2 }
  },
  {
    id: "side-encore", side: true,
    title: "L'ULTIMO SHARE",
    desc: "BERLUSCONIX concede un ultimo giro di giostra al CASINÒ, se non l'hai mai eletto.",
    hint: "CASINÒ DI PALAZZO, dopo la CONTROFIRMA. Porta SCHEDE BLINDATE: va CATTURATO, non basta batterlo.",
    step: "Cattura BERLUSCONIX.",
    isDone: (s) => s.dex["berlusconix"] === "caught"
  },
  {
    // side: sono tutorial-obiettivi opzionali; dopo il climax UE non devono
    // diventare il "prossimo passo" dell'HUD (sarebbe anticlimatico).
    id: "direttiva", side: true,
    title: "LINEA DI PARTITO",
    desc: "Usa una DIRETTIVA DI PARTITO per insegnare una nuova mossa a un POLITICMON compatibile.",
    hint: "Le DIRETTIVE si comprano al Discount o si trovano in giro. Funzionano solo sul tipo giusto e si riusano all'infinito.",
    step: "Insegna una mossa con una DIRETTIVA.",
    isDone: (s) => Boolean(s.flags["used-directive"])
  },
  {
    id: "tessera", side: true,
    title: "CARRIERE DORATE",
    desc: "Usa una TESSERA DORATA per far cambiare carriera a un POLITICMON.",
    hint: "In vendita al Discount Elettorale. SALVINATOR e MUSKRAT ne vanno matti.",
    step: "Evolvi un POLITICMON con la TESSERA DORATA.",
    isDone: (s) => Boolean(s.dex["capitanone"] === "caught" || s.dex["marsrat"] === "caught")
  },
  {
    id: "dexfull",
    title: "PIGLIATUTTO",
    desc: "Eleggi 20 POLITICMON diversi nella tua carriera.",
    hint: "I pezzi grossi del mondo si aggirano nell'erba alta di Caput Mundi. E GRILLIX nasconde due futuri diversi...",
    step: "Cattura altri Politicmon e riempi il Dex.",
    isDone: (s) => Object.values(s.dex).filter((v) => v === "caught").length >= 20
  },
  // ---- Missioni secondarie (opzionali) ----
  {
    id: "side-plebiscito", side: true,
    title: "PLEBISCITO",
    desc: "Porta i SONDAGGI all'85% e raggiungi lo status di PLEBISCITO.",
    hint: "Vinci, cattura, fai selfie. Evita figuracce e MAZZETTE al casinò.",
    step: "Raggiungi l'85% di SONDAGGI.",
    isDone: (s) => s.sondaggi >= 85
  },
  {
    id: "side-paperone", side: true,
    title: "TESORIERE D'ORO",
    desc: "Accumula 5000€ nelle casse della campagna.",
    hint: "Batti allenatori, gioca al casinò con criterio, raccogli oggetti.",
    step: "Possiedi almeno 5000€.",
    isDone: (s) => s.money >= 5000
  },
  {
    id: "side-garage", side: true,
    title: "PARCO MACCHINE",
    desc: "Procurati sia il MONOPATTINO che la RUSPA.",
    hint: "Il MONOPATTINO è a Mediopoli, la RUSPA a Caput Mundi.",
    step: "Ottieni MONOPATTINO e RUSPA.",
    isDone: (s) => Boolean(s.flags["veh-monopattino"] && s.flags["veh-ruspa"])
  },
  {
    id: "side-azzardo", side: true,
    title: "RE DEL PALAZZO",
    desc: "Fai un colpo grosso: vinci un TRIS alle SLOT DEL CONSENSO.",
    hint: "CASINÒ DI PALAZZO a Caput Mundi. Tre simboli uguali = jackpot.",
    step: "Vinci un tris alle slot del casinò.",
    isDone: (s) => Boolean(s.flags["casino-jackpot"])
  },
  {
    id: "side-portineria", side: true,
    title: "GIRO DI PORTE",
    desc: "Curiosa nelle case del mondo: ogni porta nasconde un personaggio.",
    hint: "Le città hanno case visitabili: CASA TUA, il CIRCOLO, l'ATTICO, la REDAZIONE e altre.",
    step: "Entra e parla con la gente delle case.",
    isDone: (s) => Boolean(s.flags["talked-mom"] && s.flags["talked-influencer"])
  },
  {
    id: "side-fiches", side: true,
    title: "PORTAFOGLI DI FICHE",
    desc: "Metti da parte 200 FICHE del casinò: i premi grossi aspettano.",
    hint: "Cambia € in FICHE al CASINÒ e vinci alle slot. Coi gettoni compri direttive rare e la TESSERA DORATA.",
    step: "Accumula 200 FICHE.",
    isDone: (s) => s.chips >= 200
  },
  {
    id: "side-direttive", side: true,
    title: "SEGRETERIA DI PARTITO",
    desc: "Colleziona 4 DIRETTIVE DI PARTITO diverse nella tua BORSA.",
    hint: "Si comprano al Discount, ai PREMI del casinò, o si trovano in giro.",
    step: "Possiedi 4 direttive diverse.",
    isDone: (s) =>
      ["dirVaffa", "dirDecreto", "dirWhatever", "dirFiamma", "dirSciopero",
       "dirInciucio", "dirBunga", "dirGreen"].filter((d) => (s.bag[d] ?? 0) > 0).length >= 4
  },
  {
    id: "side-famiglia", side: true,
    title: "UN'OFFERTA RAGIONEVOLE",
    desc: "Fatti dare PROTEZIONE dal PADRINO nella RETROBOTTEGA allo STRETTO.",
    hint: "Il covo è allo STRETTO DI MESSINA. La protezione costa fondi e rispettabilità (sondaggi).",
    step: "Paga il pizzo e ottieni la PROTEZIONE.",
    isDone: (s) => Boolean(s.flags["mafia-protezione"])
  }
];

// L'obiettivo dell'HUD segue solo le missioni principali (non le secondarie).
export function currentQuest(state: GameState): QuestDef | null {
  if (state.flags["opening-v2"] && !state.flags["rival1-beaten"] && !state.badges.includes("auditel")) {
    const opening = OPENING_QUEST_ORDER.map(id => QUESTS.find(q => q.id === id)!).find(q => !q.isDone(state));
    if (opening?.id === "grow" && state.defeatedTrainers.includes("praticante")) return { ...opening, target: { mapId: "route1", x: 20, y: 12 }, hint: "Pratica vinta: vinci nell'erba a sud di Nino. Usa un caffè se i PV sono bassi; al livello 8 scegli EVOLVI." };
    if (opening) return opening;
  }
  if (!state.flags["opening-v2"] && state.flags["starter-chosen"] && !state.flags["rival1-beaten"] && !state.badges.includes("auditel")) {
    return { ...QUESTS.find(q => q.id === "rival1")!, hint: "Quirino nel laboratorio propone di riprovare Gianni.", step: "Parla con Quirino nel laboratorio.", target: { mapId: "lab", x: 5, y: 3 } };
  }
  return QUESTS.find((q) => !q.side && !q.isDone(state)) ?? null;
}
