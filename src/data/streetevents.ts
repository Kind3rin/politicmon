// Eventi di strada casuali: piccoli siparietti satirici mentre cammini in città.
// Muovono morale (SONDAGGI) e/o fondi. Non sono battaglie: solo testo + effetto.
// Tono: satira bonaria.

export interface StreetEvent {
  id: string;
  sondaggi?: number; // delta consenso
  money?: number; // delta fondi (può essere negativo)
  lines: string[]; // mostrate al volo
}

export const STREET_EVENTS: StreetEvent[] = [
  {
    id: "selfie",
    sondaggi: 4,
    lines: ["Un passante ti chiede un selfie!", "La foto diventa virale: +4 sondaggi."]
  },
  {
    id: "comizio-improvvisato",
    sondaggi: 3, money: 50,
    lines: ["Sali su una panchina e improvvisi un comizio.", "La folla applaude e fa una colletta: +3 sondaggi, +50€."]
  },
  {
    id: "buca",
    sondaggi: -3,
    lines: ["Inciampi in una buca mai asfaltata.", "Qualcuno ti riprende: il video fa il giro. -3 sondaggi."]
  },
  {
    id: "multa",
    money: -120,
    lines: ["Auto blu in doppia fila: multa.", "Paghi 120€ e fingi indignazione."]
  },
  {
    id: "trombato",
    sondaggi: -2,
    lines: ["Un ex elettore ti riconosce e ti 'ringrazia'.", "Mugugni social in arrivo: -2 sondaggi."]
  },
  {
    id: "mancia-lobby",
    money: 200, sondaggi: -2,
    lines: ["Un signore distinto ti infila una busta.", "'È solo un contributo', dice. +200€, ma -2 sondaggi se si scopre."]
  },
  {
    id: "bambino",
    sondaggi: 5,
    lines: ["Baci un neonato per la stampa.", "Tenerissimo: +5 sondaggi. Il bambino piange, ma vendiamo l'immagine."]
  },
  {
    id: "talk-show",
    sondaggi: 2, money: 80,
    lines: ["Ospitata last-minute in un talk show locale.", "Te la cavi: +2 sondaggi, +80€ di gettone."]
  }
];
