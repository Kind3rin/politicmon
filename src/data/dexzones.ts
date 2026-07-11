import type { GameState } from "../game/state";
import { speciesAvailable } from "../game/version";

// Collezione per ZONA: ogni zona ha un roster di specie "native" (catturabili
// proprio lì). Completare il roster di una zona dà una ricompensa una-tantum.
// I roster contengono SOLO specie wild-catturabili in quella mappa, così il
// 100% è davvero raggiungibile (niente leggendari/evo-only nel gate).
export interface DexZone {
  id: string; // chiave salvataggio (zoneRewardsClaimed)
  name: string; // etichetta breve ("BORGO")
  species: string[]; // specie native (home zone)
  reward: { itemId: string; qty: number; money: number };
}

export const DEX_ZONES: DexZone[] = [
  {
    id: "borgo", name: "BORGO",
    species: ["salvinott", "grillix", "tajanide", "contemorfo"],
    reward: { itemId: "schedona", qty: 2, money: 800 }
  },
  {
    id: "mediopoli", name: "MEDIOPOLI",
    species: ["vannaccix", "calendauro", "mediocrate"],
    reward: { itemId: "spritz", qty: 3, money: 1500 }
  },
  {
    id: "eurotown", name: "EUROTOWN",
    // verdolino/ecoverdon (LINEA VERDE) spuntano sui percorsi che circondano
    // EUROTOWN: entrambi catturabili sul campo, quindi entrano nel gate di zona.
    species: ["macronfox", "zelenskir", "bojoon", "ursulax", "verdolino", "ecoverdon"],
    reward: { itemId: "schedona", qty: 3, money: 2000 }
  },
  {
    id: "capitale", name: "CAPUT MUNDI",
    // mattarellux è 1% (leggendario di fatto): escluso dal gate così la zona
    // resta completabile. Resta comunque catturabile e conta nel Dex globale.
    species: ["muskrat", "putingrad", "xipanda", "trumpon"],
    reward: { itemId: "mojito", qty: 2, money: 2500 }
  },
  {
    id: "stretto", name: "STRETTO",
    species: ["salvinator", "pontigor", "capitanone"],
    reward: { itemId: "tessera", qty: 1, money: 1000 }
  },
  {
    id: "oblast", name: "OBLAST",
    species: ["bunkerput"],
    reward: { itemId: "caffe", qty: 3, money: 1200 }
  },
  {
    id: "offshore", name: "OFFSHORE",
    // Solo le 3 specie prima NON catturabili allo stato brado. mattarellux
    // (1% sull'isola) e berlusconix restano fuori dal gate, come da convenzione.
    species: ["telecrate", "pontimax", "conteblob"],
    reward: { itemId: "tessera", qty: 1, money: 3000 }
  },
  {
    id: "bruxelles", name: "BRUXELLES",
    // Roster UE (elezioni europee): tutte catturabili allo stato brado a BRUXELLES.
    // trumpon è 6% (raro ma nel pool wild), quindi la zona resta completabile.
    species: ["macronfox", "bojoon", "zelenskir", "ursulax", "xipanda", "putingrad", "trumpon"],
    reward: { itemId: "schedona", qty: 3, money: 4000 }
  },
  {
    id: "campo-largo", name: "CAMPO LARGO",
    species: ["salistrobo", "fratocorno"],
    reward: { itemId: "schedona", qty: 2, money: 1800 }
  }
];

export interface ZoneProgress {
  zone: DexZone;
  caught: number;
  total: number;
  done: boolean;
}

// `flags` (opzionale): le specie ottenute SOLO via scambio online portano il
// flag "dex-trade:<id>" e NON contano per i gate di zona (stesso spirito
// dell'esclusione di mattarellux qui sopra: il 100% di zona premia la cattura
// sul campo). Contano comunque nel Dex globale.
// `browserSeed` (opzionale): le specie ESCLUSIVE dell'altra versione
// (GOVERNO/OPPOSIZIONE, game/version.ts) non spawnano mai in questo save e
// sono escluse dal gate, così il 100% di zona resta raggiungibile sul campo.
export function zoneProgress(
  dex: GameState["dex"],
  flags?: GameState["flags"],
  browserSeed?: number
): ZoneProgress[] {
  return DEX_ZONES.map((z) => {
    const species =
      browserSeed !== undefined ? z.species.filter((id) => speciesAvailable(id, browserSeed)) : z.species;
    const caught = species.filter((id) => dex[id] === "caught" && !flags?.[`dex-trade:${id}`]).length;
    return { zone: z, caught, total: species.length, done: caught === species.length };
  });
}
