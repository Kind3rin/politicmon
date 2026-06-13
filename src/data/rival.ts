import type { GameState } from "../game/state";
import { RIVAL_COUNTER, SPECIES } from "./species";

// RIVALE GIANNI ricorrente: ti reintercetta a tappe chiave con una squadra che
// cresce col tuo progresso e battute che ricordano gli scontri precedenti.
// Lo "stage" è dato da quante volte l'hai già battuto (state.rivalWins).

export interface RivalStage {
  id: string; // id trainer (per defeatedTrainers / sight)
  mapId: string;
  x: number;
  y: number;
  facing: "up" | "down" | "left" | "right";
  sightRange?: number;
  showAfterWins: number; // appare quando rivalWins === questo valore
  level: number; // livello del membro più forte
  size: number; // quanti Politicmon schiera
  intro: string[];
  defeat: string[];
  reward?: { itemId: string; qty: number };
}

// Le 5 tappe del rivale, in ordine di incontro. La 0 (lab) è gestita a parte
// nel flusso starter; qui partiamo dalla 1.
export const RIVAL_STAGES: RivalStage[] = [
  {
    id: "rival-mediopoli", mapId: "mediopoli", x: 22, y: 7, facing: "down",
    sightRange: 4, showAfterWins: 1, level: 12, size: 2,
    intro: [
      "GIANNI: di nuovo tu! Ho passato il weekend ad allenarmi. E a fare sondaggi su me stesso.",
      "Risultato: piaccio tantissimo. A me. Vediamo se reggi il secondo round!"
    ],
    defeat: ["GIANNI: due a zero per te?! Chiedo la VAR. Anzi, il riconteggio."],
    reward: { itemId: "spritz", qty: 1 }
  },
  {
    id: "rival-eurotown", mapId: "eurotown", x: 10, y: 11, facing: "right",
    sightRange: 4, showAfterWins: 2, level: 17, size: 3,
    intro: [
      "GIANNI: ci risiamo. Ammettilo, mi insegui tu, non io.",
      "A BRUXELLES dicono che sono 'una promessa'. Una promessa NON mantenuta, ma promessa!",
      "Stavolta ho tre titolari. Preparati al terzo dibattito!"
    ],
    defeat: ["GIANNI: tre sconfitte di fila... le impacchetto come 'percorso di crescita'."],
    reward: { itemId: "schedona", qty: 1 }
  },
  {
    id: "rival-capitale", mapId: "capitale", x: 15, y: 13, facing: "down",
    sightRange: 4, showAfterWins: 3, level: 22, size: 3,
    intro: [
      "GIANNI: il PALAZZO sarà mio. Ho già scelto le tende per lo studio ovale.",
      "Quattro scontri persi? No no, sono 'quattro esperienze formative'.",
      "Ma oggi è diverso. Oggi ho... beh, la stessa squadra, ma più convinta!"
    ],
    defeat: ["GIANNI: ok. OK. Forse il problema sono io. ...NO, è l'arbitro!"],
    reward: { itemId: "dirInciucio", qty: 1 }
  },
  {
    id: "rival-stretto", mapId: "stretto", x: 6, y: 5, facing: "down",
    sightRange: 4, showAfterWins: 4, level: 26, size: 4,
    intro: [
      "GIANNI: ti ho seguito fino allo STRETTO. Romantico, eh?",
      "Cinque a zero. A questo punto sei tu la mia nemesi, io la tua spalla comica.",
      "Però guarda: squadra al completo, quattro titolari. STAVOLTA TI FREGO!"
    ],
    defeat: [
      "GIANNI: ...sei a ZERO punti contro di me. Cioè io sono a zero.",
      "Sai che c'è? Vengo a fare campagna PER te. I traditori si chiamano 'responsabili'."
    ],
    reward: { itemId: "tessera", qty: 1 }
  }
];

// La prossima tappa del rivale disponibile col numero di vittorie attuale.
export function rivalStageFor(wins: number): RivalStage | null {
  return RIVAL_STAGES.find((s) => s.showAfterWins === wins) ?? null;
}

// Squadra del rivale per una tappa: starter-counter (eventualmente evoluto) +
// riempitivi tematici, livelli scalati attorno a `stage.level`.
export function buildRivalStageTeam(
  state: GameState,
  stage: RivalStage
): Array<[string, number]> {
  const counterBase = RIVAL_COUNTER[state.starterId] ?? "renzino";
  // Lo starter del rivale evolve quando il suo livello supera la soglia evolutiva.
  const evoRule = SPECIES[counterBase].evolutions?.find((r) => r.level !== undefined);
  const ace = evoRule && stage.level >= (evoRule.level ?? 99) ? evoRule.id : counterBase;

  // Riempitivi a tema "carrierista": grillix (trasformista) e contemorfo (blob).
  const fillers = ["grillix", "contemorfo", "bojoon"];
  const team: Array<[string, number]> = [];
  for (let i = 0; i < stage.size - 1; i += 1) {
    const sp = fillers[i % fillers.length];
    team.push([sp, Math.max(5, stage.level - 3 - i)]);
  }
  // L'asso (counter dello starter) è l'ultimo e il più forte.
  team.push([ace, stage.level]);
  return team;
}
