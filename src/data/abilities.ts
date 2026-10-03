// ABILITÀ PASSIVE (Round 39): un effetto fisso per specie (Species.ability).
// Derivano dalla SPECIE, quindi sono sicure sul filo del duello PvP: nessun
// dato extra da validare, host e guest le ricavano dallo stesso speciesId.
// Gli effetti sul danno vivono in sim.ts (calcDamage); pre-mossa, immunità e
// fine turno condivisi vivono in battle/effectContract.ts.

export interface Ability {
  id: string;
  name: string;
  desc: string;
}

export const ABILITIES: Record<string, Ability> = {
  poltrona: {
    id: "poltrona", name: "Poltrona salda",
    desc: "Non si schioda: immune ai cali di statistica inflitti dal nemico."
  },
  teflon: {
    id: "teflon", name: "Teflon",
    desc: "Le accuse scivolano via: immune a indagato, scandalo e gaffe."
  },
  maggioranza: {
    id: "maggioranza", name: "Maggioranza",
    desc: "Con i numeri dalla sua (PV sopra il 50%) infligge +10% di danno."
  },
  opposizione: {
    id: "opposizione", name: "Opposizione",
    desc: "Con le spalle al muro (PV sotto il 50%) infligge +15% di danno."
  },
  galleggiamento: {
    id: "galleggiamento", name: "Galleggiamento",
    desc: "Resta a galla: a fine turno recupera 1/16 dei PV massimi.\n\nArrotonda per difetto, con un minimo di 1 PV."
  },
  voltagabbana: {
    id: "voltagabbana", name: "Voltagabbana",
    desc: "Cambia casacca appena scende in campo: Opportunismo aumenta di 1 grado."
  },
  lodo: {
    id: "lodo", name: "Lodo",
    desc: "Il primo colpo subito in battaglia fa danno dimezzato. Poi si vedrà."
  },
  caimano: {
    id: "caimano", name: "Caimano",
    desc: "Azzanna chi è già nei guai: +20% di danno se il nemico ha uno status."
  },
  // ---- LEGGENDARI (Round 41) — sicure sul filo: derivano dalla specie ----
  whatever: {
    id: "whatever", name: "Whatever it takes",
    desc: "Con lo spread alla gola (PV sotto un terzo) fa qualunque cosa: +25% di danno."
  },
  garanzia: {
    id: "garanzia", name: "Garanzia costituzionale",
    desc: "Sopra le parti: immune sia ai cali di statistica sia agli status del nemico."
  },
  tabularasa: {
    id: "tabularasa", name: "Tabula rasa",
    desc: "Quando entra azzera tutte le modifiche alle statistiche, proprie e avversarie."
  },
  forchettasondaggi: {
    id: "forchettasondaggi", name: "Forchetta sondaggi",
    desc: "Le mosse speciali dannose hanno una stima bassa (0,85×) o alta (1,15×).\n\nOgni stima ha il 50% di probabilità."
  },
  primapagina: {
    id: "primapagina", name: "Prima pagina",
    desc: "Il primo attacco dopo ogni ingresso infligge +20% di danno."
  },
  contraddittorio: {
    id: "contraddittorio", name: "Contraddittorio",
    desc: "Al primo colpo subito dopo ogni ingresso, Retorica aumenta di 1 grado. Una volta per ingresso, anche con colpi multipli."
  },
  staffetta: {
    id: "staffetta", name: "Staffetta",
    desc: "Quando manda KO un avversario, Opportunismo aumenta di 1 grado."
  }
};
