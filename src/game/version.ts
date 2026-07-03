import type { GameState } from "./state";

// ------------------------------------------------------- VERSIONE ESCLUSIVA
// Il browserSeed (save v11, generato una volta e persistito) divide i giocatori
// in due "versioni" stile rosso/blu: pari = GOVERNO, dispari = OPPOSIZIONE.
// Quattro specie wild sono esclusive di una versione (weight 0 nell'altra):
// il Dex globale si completa SOLO scambiando online. I gate di zona (dexzones)
// escludono le specie dell'altra versione, così il 100% di zona resta
// raggiungibile sul campo.

export type GameVersion = "GOVERNO" | "OPPOSIZIONE";

export function gameVersion(browserSeed: number): GameVersion {
  return browserSeed % 2 === 0 ? "GOVERNO" : "OPPOSIZIONE";
}

// Specie esclusive: moderati/istituzionali circolano nella versione GOVERNO,
// oppositori/contestatori nella versione OPPOSIZIONE. Nessuna è necessaria
// alla storia (niente starter/leggendari/target di quest).
export const VERSION_EXCLUSIVES: Record<string, GameVersion> = {
  tajanide: "GOVERNO",
  calendauro: "GOVERNO",
  contemorfo: "OPPOSIZIONE",
  vannaccix: "OPPOSIZIONE"
};

// La specie è avvistabile allo stato brado in QUESTA versione?
export function speciesAvailable(speciesId: string, browserSeed: number): boolean {
  const lock = VERSION_EXCLUSIVES[speciesId];
  return !lock || lock === gameVersion(browserSeed);
}

export function versionLabel(state: GameState): string {
  return `VERSIONE ${gameVersion(state.browserSeed)}`;
}
