import type { GameState } from "../game/state";

export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  hint: string;
  step: string;
  isDone: (state: GameState) => boolean;
  side?: boolean; // missione secondaria: non guida l'HUD "prossimo passo"
  target?: { mapId: string; x: number; y: number }; // bersaglio per la modalità guidata
}

export const QUESTS: QuestDef[] = [
  {
    id: "starter",
    title: "UN CANDIDATO TUTTO TUO",
    desc: "Scegli il tuo primo POLITICMON nel Laboratorio del Consenso.",
    hint: "Il laboratorio è l'edificio col tetto blu a BORGO URNE.",
    step: "Entra nel laboratorio col tetto blu.",
    isDone: (s) => Boolean(s.flags["starter-chosen"]),
    target: { mapId: "borgo", x: 7, y: 12 }
  },
  {
    id: "rival1",
    title: "PRIMO DIBATTITO",
    desc: "Vinci il confronto con il RIVALE GIANNI.",
    hint: "Ti aspetta nel laboratorio, con un ingresso a effetto.",
    step: "Scegli uno starter e batti Gianni.",
    isDone: (s) => Boolean(s.flags["rival1-beaten"])
  },
  {
    id: "dex",
    title: "IL POLITICDEX",
    desc: "Ricevi il POLITICDEX dal Professor Quirino.",
    hint: "Lo consegna dopo il tuo primo dibattito vinto.",
    step: "Parla col Professor Quirino nel laboratorio.",
    isDone: (s) => Boolean(s.flags["dex-received"])
  },
  {
    id: "gym1",
    title: "MEDAGLIA AUDITEL",
    desc: "Sconfiggi SUA EMITTENZA nello STUDIO 5 di MEDIOPOLI.",
    hint: "Mediopoli è a nord di Borgo Urne. La palestra ha il tetto giallo.",
    step: "Vai a nord fino a Mediopoli e cerca Studio 5.",
    isDone: (s) => s.badges.includes("auditel"),
    target: { mapId: "mediopoli", x: 6, y: 10 }
  },
  {
    id: "governo",
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
    hint: "Eurotown è a nord di Mediopoli, oltre il PERCORSO 2. Tetto blu con le stelle.",
    step: "Raggiungi Eurotown e sfida la Palestra UE.",
    isDone: (s) => s.badges.includes("spread"),
    target: { mapId: "eurotown", x: 6, y: 5 }
  },
  {
    id: "gym3",
    title: "MEDAGLIA DAZIO",
    desc: "Sconfiggi MR. TYCOON nella GLOBAL TOWER di CAPUT MUNDI.",
    hint: "Caput Mundi è in cima al mondo, oltre il PERCORSO 3. Come piace a lui.",
    step: "Sali a Caput Mundi e trova la Global Tower.",
    isDone: (s) => s.badges.includes("dazio"),
    target: { mapId: "capitale", x: 6, y: 11 }
  },
  {
    id: "ponte", side: true, // area OPZIONALE: non deve deviare l'HUD dal PALAZZO
    title: "MEME SULLO STRETTO",
    desc: "L'AUTO BLU ora arriva allo STRETTO DI MESSINA. Sconfiggi IL CAPITANO in fondo al ponte incompiuto.",
    hint: "Parla con la scorta con 3 medaglie in tasca. Il ponte finisce a metà: lui è lì.",
    step: "Auto blu per lo STRETTO: batti IL CAPITANO.",
    isDone: (s) => Boolean(s.flags["ponte-beaten"])
  },
  {
    id: "boss",
    title: "L'UOMO DEL PALAZZO",
    desc: "Con 3 medaglie, entra nel PALAZZO e sconfiggi il PRESIDENTE OMBRA.",
    hint: "Il portone del Palazzo si apre solo ai candidati decorati.",
    step: "Con 3 medaglie, entra nel Palazzo.",
    isDone: (s) => Boolean(s.flags["boss-beaten"]),
    target: { mapId: "capitale", x: 14, y: 5 }
  },
  {
    id: "colle",
    title: "LA CRISI DEL COLLE",
    desc: "La vittoria al PALAZZO non basta: serve la controfirma. Supera i 3 GIUDICI della CONSULTA.",
    hint: "La PORTA DORATA in fondo al PALAZZO ora è aperta. Lassù niente BAR SPORT: preparati.",
    step: "Sali al COLLE e batti i 3 GIUDICI.",
    isDone: (s) =>
      ["giudice1", "giudice2", "giudice3"].every((id) => s.defeatedTrainers.includes(id)),
    target: { mapId: "palazzo", x: 5, y: 1 }
  },
  {
    id: "garante",
    title: "LA CONTROFIRMA",
    desc: "Sconfiggi IL GARANTE SUPREMO e fatti controfirmare il mandato.",
    hint: "Ti aspetta in cima al COLLE, con la penna già in mano.",
    step: "Sconfiggi IL GARANTE SUPREMO.",
    isDone: (s) => Boolean(s.flags["garante-beaten"])
  },
  // ---- Post-game: PARADISO OFFSHORE (dopo la CONTROFIRMA) ----
  {
    id: "offshore-rotta",
    title: "ACQUE INTERNAZIONALI",
    desc: "Si mormora di un'isola dove i FONDI vanno in vacanza. Salpa dalle boe a est dello STRETTO.",
    hint: "Serve la MN TRAGHETTO del MARINAIO di Caput Mundi. Il CONTABILE PENTITO sulla spiaggia dello Stretto sa la rotta.",
    step: "Raggiungi il PARADISO OFFSHORE.",
    isDone: (s) => Boolean(s.flags["hint-offshore"]),
    target: { mapId: "stretto", x: 28, y: 10 }
  },
  {
    id: "offshore-tesoriere",
    title: "IL TESORIERE FANTASMA",
    desc: "Qualcuno custodisce i conti di TUTTI i partiti sull'isola. Stanalo sull'altopiano.",
    hint: "In cima agli scogli a nord-est dell'isola: l'unica via è la scala. Porta una squadra da lv 45+.",
    step: "Sconfiggi IL TESORIERE FANTASMA.",
    isDone: (s) => Boolean(s.flags["offshore-beaten"]),
    target: { mapId: "offshore", x: 23, y: 7 }
  },
  // ---- Post-game: ELEZIONI UE (BRUXELLES), dopo la CONTROFIRMA ----
  {
    id: "ue-rotta",
    title: "ELEZIONI EUROPEE",
    desc: "Si vota per il PARLAMENTO UE. Salpa per BRUXELLES: la vera partita si gioca lì.",
    hint: "Lo SHERPA UE sull'OFFSHORE conosce la rotta. Il motoscafo diplomatico parte dalle boe a est dell'isola.",
    step: "Raggiungi BRUXELLES.",
    // Completa quando SEI ARRIVATO a Bruxelles (hint-brux-arrivo, settato allo
    // sbarco) — non solo quando hai parlato allo SHERPA (hint-ue): chi salpa
    // senza sherpa avrebbe la guida bloccata su questa quest anche dopo la vittoria.
    isDone: (s) => Boolean(s.flags["hint-brux-arrivo"] || s.flags["hint-ue"] || s.flags["ue-beaten"]),
    target: { mapId: "offshore", x: 28, y: 9 }
  },
  {
    id: "ue-commissione",
    title: "LA POLTRONA DI BRUXELLES",
    desc: "Vinci il gauntlet UE e strappa la poltrona europea a LA COMMISSIONE.",
    hint: "In cima al viale di BRUXELLES, davanti al Palazzo della Commissione. Porta una squadra da lv 50+.",
    step: "Sconfiggi LA COMMISSIONE a BRUXELLES.",
    isDone: (s) => Boolean(s.flags["ue-beaten"]),
    target: { mapId: "bruxelles", x: 12, y: 5 }
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
    id: "direttiva",
    title: "LINEA DI PARTITO",
    desc: "Usa una DIRETTIVA DI PARTITO per insegnare una nuova mossa a un POLITICMON compatibile.",
    hint: "Le DIRETTIVE si comprano al Discount o si trovano in giro. Funzionano solo sul tipo giusto e si riusano all'infinito.",
    step: "Insegna una mossa con una DIRETTIVA.",
    isDone: (s) => Boolean(s.flags["used-directive"])
  },
  {
    id: "tessera",
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
  return QUESTS.find((q) => !q.side && !q.isDone(state)) ?? null;
}
