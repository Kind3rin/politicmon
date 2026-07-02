// ABILITÀ PASSIVE (Round 39): un effetto fisso per specie (Species.ability).
// Derivano dalla SPECIE, quindi sono sicure sul filo del duello PvP: nessun
// dato extra da validare, host e guest le ricavano dallo stesso speciesId.
// Gli effetti sul danno vivono in sim.ts (calcDamage); quelli di turno in
// BattleScene E duelsim.ts (sentinella sync).

export interface Ability {
  id: string;
  name: string;
  desc: string;
}

export const ABILITIES: Record<string, Ability> = {
  poltrona: {
    id: "poltrona", name: "POLTRONA SALDA",
    desc: "Non si schioda: immune ai cali di statistica inflitti dal nemico."
  },
  teflon: {
    id: "teflon", name: "TEFLON",
    desc: "Le accuse scivolano via: immune agli status (INDAGATO, SCANDALO, GAFFE)."
  },
  maggioranza: {
    id: "maggioranza", name: "MAGGIORANZA",
    desc: "Con i numeri dalla sua (PV sopra il 50%) infligge +10% di danno."
  },
  opposizione: {
    id: "opposizione", name: "OPPOSIZIONE",
    desc: "Con le spalle al muro (PV sotto il 50%) infligge +15% di danno."
  },
  galleggiamento: {
    id: "galleggiamento", name: "GALLEGGIAMENTO",
    desc: "Resta a galla in ogni talk: recupera un po' di PV a fine turno."
  },
  voltagabbana: {
    id: "voltagabbana", name: "VOLTAGABBANA",
    desc: "Cambia casacca appena scende in campo: OPPORTUNISMO +1."
  },
  lodo: {
    id: "lodo", name: "LODO",
    desc: "Il primo colpo subito in battaglia fa danno dimezzato. Poi si vedrà."
  },
  caimano: {
    id: "caimano", name: "CAIMANO",
    desc: "Azzanna chi è già nei guai: +20% di danno se il nemico ha uno status."
  }
};
