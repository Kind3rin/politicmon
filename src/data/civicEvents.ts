import type { PromiseId } from "../game/morale";

export interface CivicChoice {
  id: string; label: string; cost: number; polls: number; trust: number; cohesion: number;
  promise?: PromiseId; fulfill?: boolean; lines: readonly string[];
}
export interface CivicEvent {
  id: string; title: string; art: "sportello" | "studio" | "molo" | "verbale";
  lines: readonly string[]; choices: readonly CivicChoice[];
}

export const CIVIC_EVENTS: Readonly<Record<string, CivicEvent>> = {
  bus: {
    id: "bus", title: "IL BUS NELLA FOTO", art: "sportello",
    lines: ["Il bus passa solo sul manifesto.", "Il fotografo propone di togliere", "la fermata: almeno non si aspetta."],
    choices: [
      { id: "pay", label: "FINANZIA LA CORSA", cost: 180, polls: -2, trust: 0, cohesion: 0, promise: "bus", fulfill: true, lines: ["Il primo bus arriva senza nastro.", "Una signora sale. Non applaude.", "Aveva semplicemente una visita."] },
      { id: "pledge", label: "PROMETTI UNA DATA", cost: 0, polls: 5, trust: 2, cohesion: 0, promise: "bus", lines: ["La data entra nel verbale.", "Hai tre nuovi dibattiti di storia", "per versare 180€ dal menu MORALE."] },
      { id: "crop", label: "TAGLIA LA FERMATA", cost: 0, polls: 8, trust: -12, cohesion: -6, lines: ["Nella foto nessuno aspetta più.", "Fuori dalla foto, sì.", "Il fotografo chiama questo progresso."] }
    ]
  },
  remix: {
    id: "remix", title: "IO SONO IL RITORNELLO", art: "studio",
    lines: ["La regia ripete il tuo nome.", "Al terzo giro lo canta anche chi", "non sa cosa stai proponendo."],
    choices: [
      { id: "hook", label: "SOLO RITORNELLO", cost: 0, polls: 8, trust: -6, cohesion: -3, lines: ["Ti riconoscono al supermercato.", "Ti chiedono il prossimo singolo.", "Nessuno chiede del programma."] },
      { id: "credits", label: "PAGA CHI LO HA FATTO", cost: 160, polls: 4, trust: 5, cohesion: 8, lines: ["I tecnici ricevono il compenso.", "Nei titoli compare anche il fonico.", "Per una volta non è un capro espiatorio."] },
      { id: "answer", label: "RISPONDI ALLA DOMANDA", cost: 0, polls: -3, trust: 10, cohesion: 2, lines: ["Parli delle corse del mattino.", "La regia chiede un ospite più acceso.", "Il tecnico prende l'autobus delle sei."] }
    ]
  },
  sportello: {
    id: "sportello", title: "POVERTÀ FUORI CAMPO", art: "sportello",
    lines: ["Sul balcone hai vinto la povertà.", "Sotto, lo sportello apre un giorno.", "Il grafico ha perso i giorni chiusi."],
    choices: [
      { id: "pay", label: "APRI LO SPORTELLO", cost: 260, polls: -2, trust: 0, cohesion: 0, promise: "sportello", fulfill: true, lines: ["Il modulo diventa una domanda.", "Una domanda trova una persona.", "Il balcone resta vuoto."] },
      { id: "pledge", label: "PRENDI UN IMPEGNO", cost: 0, polls: 4, trust: 2, cohesion: 0, promise: "sportello", lines: ["Tre nuovi dibattiti. 260€.", "La scadenza resta nel menu MORALE.", "Il balcone non vale come ricevuta."] },
      { id: "chart", label: "TOGLI I GIORNI CHIUSI", cost: 0, polls: 7, trust: -10, cohesion: -5, lines: ["Il servizio risulta impeccabile.", "Per usarlo basta essere un dato.", "Allo sportello arriva ancora gente."] }
    ]
  },
  citofono: {
    id: "citofono", title: "IL CITOFONO IN DIRETTA", art: "verbale",
    lines: ["La regia vuole una porta chiusa.", "Per la tensione, dice. Chi abita", "lì non ha accettato la diretta."],
    choices: [
      { id: "camera", label: "ACCENDI LA DIRETTA", cost: 0, polls: 8, trust: -12, cohesion: -4, lines: ["La porta resta chiusa.", "Il titolo è già pronto.", "Domani devi vivere nello stesso quartiere."] },
      { id: "consent", label: "SPEGNI E ASCOLTA", cost: 0, polls: -3, trust: 10, cohesion: 4, lines: ["Dietro la porta c'è un turno di notte.", "Ti parlano dell'ascensore rotto.", "Manca una polemica. C'è una pratica."] },
      { id: "rebuild", label: "RICOSTRUZIONE DICHIARATA", cost: 140, polls: 4, trust: 2, cohesion: 1, lines: ["Un attore apre una porta finta.", "La scritta avverte che è una scena.", "Funziona meno. Ma nessuno viene usato."] }
    ]
  },
  traghetto: {
    id: "traghetto", title: "IL PLASTICO GALLEGGIA", art: "molo",
    lines: ["Il ponte sul tavolo non ha code.", "Il traghetto vero ha una rampa", "rotta. Nel rendering non compare."],
    choices: [
      { id: "pay", label: "RIPARA LA RAMPA", cost: 450, polls: -2, trust: 0, cohesion: 0, promise: "traghetto", fulfill: true, lines: ["La rampa scende. Sale un passeggino.", "Il plastico resta perfetto.", "Il traghetto, finalmente, è utile."] },
      { id: "pledge", label: "METTI UNA SCADENZA", cost: 0, polls: 5, trust: 2, cohesion: 0, promise: "traghetto", lines: ["Tre nuovi dibattiti. 450€.", "Il verbale non galleggia: resta.", "Puoi finanziare dal menu MORALE."] },
      { id: "ribbon", label: "INAUGURA IL PLASTICO", cost: 0, polls: 9, trust: -12, cohesion: -5, lines: ["Tagli il nastro del modello.", "La coda applaude per educazione.", "Poi perde un'altra coincidenza."] }
    ]
  },
  volunteers: {
    id: "volunteers", title: "A CAMERE SPENTE", art: "verbale",
    lines: ["Il comizio ha riempito la piazza.", "A piegare le sedie sono in due.", "Il social manager li taglia dalla foto."],
    choices: [
      { id: "work", label: "RESTA A SISTEMARE", cost: 0, polls: -2, trust: 5, cohesion: 12, lines: ["La diretta finisce. Tu rimani.", "Domani portano un'altra persona.", "Non è un follower. Sa montare il palco."] },
      { id: "pay", label: "PAGA GLI STRAORDINARI", cost: 220, polls: 0, trust: 3, cohesion: 10, lines: ["Nessuno chiama più famiglia un turno.", "Il bonifico arriva davvero.", "La famiglia, così, litiga meno."] },
      { id: "post", label: "POSTA UN RINGRAZIAMENTO", cost: 0, polls: 5, trust: -3, cohesion: -10, lines: ["Il post fa numeri.", "Le due sedie restano aperte.", "Anche due posti nella squadra."] }
    ]
  }
};

export const CIVIC_NPCS: Readonly<Record<string, string>> = {
  "egg-pensionato": "bus", "talkshow-fan": "remix", "pensionato-euro": "sportello",
  "influencer-cap": "citofono", ingegnere: "traghetto", "campo-capo-campagna": "volunteers"
};
