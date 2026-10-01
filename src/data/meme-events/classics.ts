import type { MemeEventDef } from "./types";

// Fonti per il meccanismo comico; le situazioni e le battute sono finzione.
// Nessuna accusa del video del citofono è attribuita al nostro residente.
export const CLASSIC_MEME_EVENTS: readonly MemeEventDef[] = [
  {
    id: "ritornello_identitario", title: "IL NOME BATTE IL PROGRAMMA",
    lines: ["LA REGIA HA REMIXATO IL TUO NOME.", "IL PROGRAMMA NON VA A TEMPO."], conditions: [],
    choices: [
      { label: "FANNE IL COMIZIO", lines: ["IL PUBBLICO SA COME TI CHIAMI.", "LA SEGRETERIA NON SA COSA FARE."], effects: [{ kind: "sondaggi", delta: 6 }, { kind: "trust", delta: -5 }, { kind: "cohesion", delta: -3 }] },
      { label: "PAGA E METTI I CREDITI", lines: ["ANCHE IL FONICO HA UN NOME.", "FINISCE NEI TITOLI, NON IN FATTURA SOSPESA."], effects: [{ kind: "money", delta: -160 }, { kind: "sondaggi", delta: 3 }, { kind: "cohesion", delta: 8 }, { kind: "trust", delta: 4 }] }
    ], tags: ["remix", "identità", "lavoro"],
    source: { label: "Sky TG24 — video del remix Io sono Giorgia, 12/11/2019", url: "https://tg24.sky.it/politica/2019/11/12/meloni-canta-io-sono-giorgia" },
    editorial: { verifiedOn: "2026-10-01", risk: "low", fact: "Il remix di Mem & J riutilizza il discorso di Meloni del 19 ottobre 2019; il servizio documenta anche la sua diffusione sui social della politica.", fallback: "Un ritornello rende riconoscibile un candidato più del suo programma." }
  },
  {
    id: "first_reaction_pratica", title: "FIRST REACTION: PROTOCOLLO",
    lines: ["IL CANDIDATO SCOPRE I VIDEO CORTI.", "LA PRATICA RESTA LUNGA."], conditions: [],
    choices: [
      { label: "SEGUI IL TREND", lines: ["LA CLIP DURA QUINDICI SECONDI.", "I TECNICI NE RIFANNO TRENTA TAKE."], effects: [{ kind: "sondaggi", delta: 5 }, { kind: "cohesion", delta: -7 }] },
      { label: "MOSTRA LA PROCEDURA", lines: ["IL TUTORIAL PERDE SPETTATORI.", "QUALCUNO FINISCE IL MODULO."], effects: [{ kind: "sondaggi", delta: -2 }, { kind: "trust", delta: 8 }, { kind: "cohesion", delta: 3 }] }
    ], tags: ["tiktok", "comunicazione", "servizi"],
    source: { label: "La7 — clip originali degli esordi politici su TikTok, 01/09/2022", url: "https://www.la7.it/intanto/video/ciao-ragazzi-eccomi-qua-first-reaction-shock-berlusconi-renzi-e-il-pd-sbarcano-su-tiktok-01-09-2022-449903" },
    editorial: { verifiedOn: "2026-10-01", risk: "low", fact: "Il montaggio La7 mostra i video di esordio su TikTok di Berlusconi e Renzi; Renzi richiama il meme first reaction shock.", fallback: "Un candidato imita un trend mentre i servizi restano poco comprensibili." }
  },
  {
    id: "citofono_senza_consenso", title: "UNA PORTA NON È UN SET",
    lines: ["LA REGIA VUOLE SUONARE IN DIRETTA.", "IL RESIDENTE NON HA DATO CONSENSO."], conditions: [],
    choices: [
      { label: "VAI IN DIRETTA", lines: ["IL TITOLO PRECEDE LA RISPOSTA.", "IL RESIDENTE DEVE ANCORA DORMIRE."], effects: [{ kind: "sondaggi", delta: 7 }, { kind: "trust", delta: -10 }, { kind: "cohesion", delta: -4 }] },
      { label: "SPEGNI LA CAMERA", lines: ["TI PARLANO DELL'ASCENSORE.", "NESSUNO AVEVA PREPARATO QUEL TITOLO."], effects: [{ kind: "sondaggi", delta: -3 }, { kind: "trust", delta: 9 }, { kind: "cohesion", delta: 3 }] }
    ], tags: ["citofono", "privacy", "quartiere"],
    source: { label: "Sky TG24 — video del citofono a Bologna, 22/01/2020", url: "https://tg24.sky.it/politica/2020/01/21/salvini-bologna-citofono" },
    editorial: { verifiedOn: "2026-10-01", risk: "low", fact: "Il servizio contiene il video di Salvini al citofono di un'abitazione a Bologna. Le accuse pronunciate nel video non sono assunte come fatti sui residenti.", fallback: "La ricerca di una scena virale invade la vita di un residente interamente fittizio." }
  },
  {
    id: "papeete_verbale", title: "IL VERBALE SOTTO L'OMBRELLONE",
    lines: ["LA CRISI È STATA LANCIATA AL BAR.", "IL RAGIONIERE PORTA IL VERBALE."], conditions: [],
    choices: [
      { label: "CONFERENZA AL DJ SET", lines: ["LA BASE COPRE I DISSENSI.", "LI RITROVI TUTTI NELLA CHAT."], effects: [{ kind: "sondaggi", delta: 6 }, { kind: "cohesion", delta: -9 }, { kind: "trust", delta: -3 }] },
      { label: "CONVOCA GLI ALLEATI", lines: ["LE CAMERE VANNO A CERCARE IL DJ.", "TU SCOPRI CHE MANCAVA UN VOTO."], effects: [{ kind: "sondaggi", delta: -2 }, { kind: "cohesion", delta: 9 }, { kind: "trust", delta: 3 }] }
    ], tags: ["papeete", "crisi", "coalizione"],
    source: { label: "La7 — intervento di Renzi al Senato sulla crisi, 20/08/2019", url: "https://www.la7.it/speciali-mentana/video/matteo-renzi-un-nuovo-governo-non-e-un-colpo-di-stato-aprire-la-crisi-un-colpo-di-sole-20-08-2019-279456" },
    editorial: { verifiedOn: "2026-10-01", risk: "low", fact: "Il video documenta l'intervento di Renzi al Senato durante la crisi dell'agosto 2019 e il suo riferimento polemico al Papeete.", fallback: "Una crisi annunciata in un luogo spettacolare lascia agli alleati il lavoro noioso dei numeri." }
  }
];
