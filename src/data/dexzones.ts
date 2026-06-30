import type { GameState } from "../game/state";

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
    species: ["macronfox", "zelenskir", "bojoon", "ursulax"],
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
  }
];

export interface ZoneProgress {
  zone: DexZone;
  caught: number;
  total: number;
  done: boolean;
}

export function zoneProgress(dex: GameState["dex"]): ZoneProgress[] {
  return DEX_ZONES.map((z) => {
    const caught = z.species.filter((id) => dex[id] === "caught").length;
    return { zone: z, caught, total: z.species.length, done: caught === z.species.length };
  });
}
