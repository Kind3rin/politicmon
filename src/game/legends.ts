import type { GameState } from "./state";

/** The four legends are no longer standing in a room waiting: each has a rite (three steps in the world), a place
 * that opens when the rite is done, and a relic that stays with you once it joins your party. */
export interface RiteStep { id: string; label: string; hint: string; done: (state: GameState) => boolean }
export interface Rite {
  id: string;
  speciesId: string;
  title: string;
  /** Where the door appears once the rite is complete. */
  door: string;
  /** The map where the legend waits. */
  sacrario: string;
  /** The flag the door and the legend wait for. */
  openFlag: string;
  /** The legend's own flag, set when it is recruited (the one the encounter already used). */
  goneFlag: string;
  relic: string;
  /** The rule of the day when you fight it, borrowed from the area events. */
  field: "taglio" | "diretta" | "standard" | "cantiere";
  prerequisite: { label: string; met: (state: GameState) => boolean };
  steps: readonly RiteStep[];
}

const decided = (event: string) => (state: GameState) => state.morale.decisions.includes(event);
const talked = (flag: string) => (state: GameState) => Boolean(state.flags[flag]);

export const RITES: readonly Rite[] = [
  {
    id: "berlusconix", speciesId: "berlusconix", sacrario: "regia", title: "DISCESA IN CAMPO", door: "una porta della regia nello Studio 5, a Mediopoli",
    openFlag: "rito-berlusconix-open", goneFlag: "legend-berlusconix-gone", relic: "telecomando", field: "diretta",
    prerequisite: { label: "Batti Sua Emittenza nello Studio 5.", met: state => Boolean(state.flags["legend-berlusconix-ready"] || state.flags["legend-berlusconix-gone"]) },
    steps: [
      { id: "fan", label: "Ascolta la fan della TV", hint: "Una tifosa di Mediopoli ricorda ancora la prima volta in video.", done: talked("leg-berlusconix-fan") },
      { id: "ritornello", label: "Chiudi il caso del Ritornello", hint: "La tifosa del talk show, sulla collina di Mediopoli, ha un conto aperto con la regia.", done: decided("remix") },
      { id: "retroscena", label: "Fatti raccontare il retroscena", hint: "Il cronista del Covo dei retroscenisti, a Caput Mundi, sa chi tiene la chiave.", done: talked("leg-berlusconix-retro") }
    ]
  },
  {
    id: "draghimon", speciesId: "draghimon", sacrario: "archivio", title: "QUELLO CHE SERVE", door: "l'archivio in fondo all'aula del Colle",
    openFlag: "rito-draghimon-open", goneFlag: "legend-draghimon-gone", relic: "agendadoro", field: "standard",
    prerequisite: { label: "Supera il Garante.", met: state => Boolean(state.flags["garante-beaten"]) },
    steps: [
      { id: "sportello", label: "Chiudi il caso dello sportello", hint: "Il pensionato di Eurotown aspetta ancora che qualcuno apra davvero.", done: decided("sportello") },
      { id: "promessa", label: "Mantieni una promessa", hint: "Nel menu Morale, una data del verbale può essere onorata.", done: state => state.morale.promises.some(p => p.status === "kept" || p.status === "repaired") },
      { id: "sherpa", label: "Parla con lo Sherpa UE", hint: "Lo Sherpa lavora a Offshore, oltre il traghetto.", done: talked("hint-ue") }
    ]
  },
  {
    id: "mattarellux", speciesId: "mattarellux", sacrario: "studio", title: "IL SETTIMO ANNO", door: "lo studio presidenziale in fondo al Colle",
    openFlag: "rito-mattarellux-open", goneFlag: "legend-mattarellux-gone", relic: "penna", field: "taglio",
    prerequisite: { label: "Supera il Garante.", met: state => Boolean(state.flags["garante-beaten"]) },
    steps: [
      { id: "fiducia", label: "Guadagna la fiducia: 70 o più", hint: "La fiducia si legge nel menu Morale: sale con le scelte che costano.", done: state => state.morale.trust >= 70 },
      { id: "dossier", label: "Decidi cinque dossier civici", hint: "Gli abitanti dei Percorsi e delle città hanno questioni aperte: parlaci.", done: state => state.morale.decisions.filter(id => !id.includes(":")).length >= 5 },
      { id: "garante", label: "Ricevi la benedizione del Garante", hint: "Il Garante riceve, dopo la sua sconfitta, nell'aula del Colle.", done: talked("leg-mattarellux-garante") }
    ]
  },
  {
    id: "bunkerput", speciesId: "bunkerput", sacrario: "bunker", title: "IL BUNKER", door: "il portone di cemento nell'Oblast del Meme",
    openFlag: "rito-bunkerput-open", goneFlag: "legend-bunkerput-gone", relic: "bunkerkit", field: "cantiere",
    prerequisite: { label: "Raggiungi l'Oblast del Meme.", met: state => Boolean(state.flags["leg-bunkerput-medico"]) || state.pos.mapId === "oblast-meme" },
    steps: [
      { id: "medico", label: "Parla con il medico da campo", hint: "Il medico d'Oblast, nella neve, sa cosa c'è sotto il cemento.", done: talked("leg-bunkerput-medico") },
      { id: "bunkerista", label: "Batti il Bunkerista", hint: "Il Bunkerista sorveglia il Percorso 1: chi vuole il suo bunker deve prima batterlo.", done: state => state.defeatedTrainers.includes("bunkerista") },
      { id: "citofono", label: "Chiudi il caso del citofono", hint: "L'influencer di Caput Mundi ha una porta chiusa che interessa anche al bunker.", done: decided("citofono") }
    ]
  }
];

export const RELIC_IDS = RITES.map(rite => rite.relic);

export function riteById(id: string): Rite | undefined { return RITES.find(rite => rite.id === id); }
export function riteForSpecies(speciesId: string): Rite | undefined { return RITES.find(rite => rite.speciesId === speciesId); }

export interface RiteProgress { rite: Rite; unlocked: boolean; steps: { step: RiteStep; done: boolean }[]; doneCount: number; open: boolean; complete: boolean }
export function riteProgress(state: GameState, rite: Rite): RiteProgress {
  const steps = rite.steps.map(step => ({ step, done: step.done(state) }));
  const doneCount = steps.filter(entry => entry.done).length;
  return { rite, unlocked: rite.prerequisite.met(state), steps, doneCount, open: Boolean(state.flags[rite.openFlag]), complete: Boolean(state.flags[rite.goneFlag]) };
}

/** Opens the door of every rite whose steps are all done. Returns the rites that opened just now. */
export function syncRites(state: GameState): Rite[] {
  const opened: Rite[] = [];
  for (const rite of RITES) {
    if (state.flags[rite.openFlag] || state.flags[rite.goneFlag]) continue;
    const progress = riteProgress(state, rite);
    if (progress.unlocked && progress.doneCount === rite.steps.length) { state.flags[rite.openFlag] = true; opened.push(rite); }
  }
  return opened;
}

export const hasRelic = (state: GameState, relic: string): boolean => (state.bag[relic] ?? 0) > 0;

/** What the relics do. Each is small and constant: they reward the hunt without breaking the curve. */
export const RELIC_EFFECTS = {
  /** Telecomando d'Oro: prize money from fights. */
  money: 1.25,
  /** Agenda d'Oro: experience from fights. */
  exp: 1.15,
  /** Penna del Garante: recruitment chance multiplier (capped by the caller). */
  recruit: 1.12,
  /** Kit del Bunker: extra polls after a trainer duel. */
  polls: 2
} as const;
