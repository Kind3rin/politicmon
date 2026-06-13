export interface Item {
  id: string;
  name: string;
  kind: "ball" | "heal" | "cure" | "evo" | "tm" | "key";
  amount?: number;
  ballBonus?: number; // moltiplicatore di cattura
  price?: number; // prezzo al Discount Elettorale
  moveId?: string; // mossa insegnata dalle DIRETTIVE DI PARTITO (kind "tm")
  reusable?: boolean; // le direttive non si consumano (come le MT moderne)
  desc: string;
}

export const ITEMS: Record<string, Item> = {
  scheda: {
    id: "scheda", name: "SCHEDA ELETTORALE", kind: "ball", ballBonus: 1, price: 100,
    desc: "Lanciala su un politico indebolito per reclutarlo. Matita copiativa inclusa."
  },
  schedona: {
    id: "schedona", name: "SCHEDA BLINDATA", kind: "ball", ballBonus: 1.8, price: 350,
    desc: "Scheda di lista bloccata: il candidato entra, che lo voglia o no."
  },
  caffe: {
    id: "caffe", name: "CAFFÈ DEL BAR SPORT", kind: "heal", amount: 20, price: 80,
    desc: "Ristretto, bollente, con dibattito incluso. Recupera 20 PV."
  },
  spritz: {
    id: "spritz", name: "SPRITZ APERITIVO", kind: "heal", amount: 50, price: 220,
    desc: "L'arancione che unisce il paese. Recupera 50 PV."
  },
  mojito: {
    id: "mojito", name: "MOJITO DEL PAPEETE", kind: "heal", amount: 60, price: 600,
    desc: "Ghiaccio, menta e pieni poteri. Recupera 60 PV e tutta l'autostima."
  },
  maalox: {
    id: "maalox", name: "MAALOX DI STATO", kind: "cure", price: 160,
    desc: "Cura INDAGATO, SCANDALO e GAFFE. Scorta finita da anni, ne è rimasto qualcuno."
  },
  tessera: {
    id: "tessera", name: "TESSERA DORATA", kind: "evo", price: 3000,
    desc: "Tessera di partito placcata oro. Certi POLITICMON cambiano carriera all'istante."
  },
  divisa: {
    id: "divisa", name: "DIVISA EQUA", kind: "key",
    desc: "Spartisce i PUNTI CONSENSO con tutta la squadra. Anche chi è in panchina porta a casa la pagnotta."
  },

  // ---- DIRETTIVE DI PARTITO (le "MT" di Politicmon) ----
  // Insegnano una mossa a chi ne condivide il tipo. Riutilizzabili.
  dirVaffa: {
    id: "dirVaffa", name: "DIRETTIVA: VAFFA", kind: "tm", moveId: "vaffa", reusable: true, price: 2200,
    desc: "Manuale del comizio in piazza. Insegna VAFFA SONORO ai tipi POPULISMO."
  },
  dirDecreto: {
    id: "dirDecreto", name: "DIRETTIVA: DECRETO", kind: "tm", moveId: "decreto", reusable: true, price: 2000,
    desc: "Modello di decreto d'urgenza. Insegna DECRETO LEGGE ai tipi ISTITUZIONE."
  },
  dirWhatever: {
    id: "dirWhatever", name: "DIRETTIVA: WHATEVER", kind: "tm", moveId: "whatever", reusable: true, price: 3200,
    desc: "Tre parole che salvano l'euro. Insegna WHATEVER IT TAKES ai tipi TECNO."
  },
  dirFiamma: {
    id: "dirFiamma", name: "DIRETTIVA: FIAMMA", kind: "tm", moveId: "fiammatricolore", reusable: true, price: 2400,
    desc: "Eredità ardente. Insegna FIAMMA TRICOLORE ai tipi DESTRA."
  },
  dirSciopero: {
    id: "dirSciopero", name: "DIRETTIVA: SCIOPERO", kind: "tm", moveId: "sciopero", reusable: true, price: 1800,
    desc: "Volantino del venerdì. Insegna SCIOPERO GENERALE ai tipi SINISTRA."
  },
  dirInciucio: {
    id: "dirInciucio", name: "DIRETTIVA: INCIUCIO", kind: "tm", moveId: "inciucio", reusable: true, price: 1900,
    desc: "Accordo sottobanco in carta intestata. Insegna INCIUCIO ai tipi CENTRO."
  },
  dirBunga: {
    id: "dirBunga", name: "DIRETTIVA: BUNGA", kind: "tm", moveId: "bunga", reusable: true, price: 3000,
    desc: "Invito a una festa leggendaria. Insegna BUNGA PARTY ai tipi MEDIA."
  },
  dirGreen: {
    id: "dirGreen", name: "DIRETTIVA: GREEN", kind: "tm", moveId: "greenwashing", reusable: true, price: 1600,
    desc: "Barattolo di vernice verde. Insegna GREENWASHING ai tipi VERDE."
  }
};

export const BAG_ORDER = [
  "scheda", "schedona", "caffe", "spritz", "mojito", "maalox", "tessera", "divisa",
  "dirVaffa", "dirDecreto", "dirWhatever", "dirFiamma", "dirSciopero",
  "dirInciucio", "dirBunga", "dirGreen"
];

// Le DIRETTIVE in vendita al Discount (le altre si trovano/sono ricompense).
export const SHOP_DIRECTIVES = ["dirDecreto", "dirFiamma", "dirSciopero", "dirInciucio"];
