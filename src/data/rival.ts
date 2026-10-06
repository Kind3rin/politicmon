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
    id: "rival-mediopoli", mapId: "mediopoli", x: 19, y: 9, facing: "right",
    sightRange: 4, showAfterWins: 1, level: 12, size: 2,
    intro: [
      "GIANNI: ho chiesto ai miei follower chi ha vinto il nostro dibattito. Cento per cento per me.",
      "Poi uno ha chiesto perché non avevo pubblicato il tuo nome. L'ho nominato moderatore. Ora non scrive più.",
      "In studio mi danno per favorito. Verifichiamo fuori dal sondaggio."
    ],
    defeat: ["GIANNI: il moderatore vuole pubblicare anche questo risultato.", "Forse dovevo pagarlo in euro, non in responsabilità."],
    reward: { itemId: "spritz", qty: 1 }
  },
  {
    id: "rival-eurotown", mapId: "eurotown", x: 10, y: 11, facing: "right",
    sightRange: 4, showAfterWins: 2, level: 17, size: 3,
    intro: [
      "GIANNI: a EUROTOWN mi hanno chiesto una tabella con le date. Ho portato quella degli ospiti TV.",
      "Non ridevano. Ho pensato fosse un problema di traduzione.",
      "Ho tre titolari. Almeno su quelli la tabella è corretta."
    ],
    defeat: ["GIANNI: perdo ancora. Ma stavolta so indicare il turno in cui ho sbagliato.", "Sul modulo non c'è una casella per dirlo. Lo scrivo a margine."],
    reward: { itemId: "schedona", qty: 1 }
  },
  {
    id: "rival-capitale", mapId: "capitale", x: 15, y: 13, facing: "down",
    sightRange: 4, showAfterWins: 3, level: 22, size: 3,
    intro: [
      "GIANNI: i volontari hanno smesso di rispondere. Il consulente dice di cambiare il logo.",
      "Ho cambiato il logo. Sempre nessuna risposta. Ho scoperto che serviva rimborsare il treno.",
      "Oggi sono tornati in tre. Vorrei dargli una ragione per restare."
    ],
    defeat: ["GIANNI: niente conferenza. Devo restituire le sedie prima che chiuda il circolo.", "Se vuoi parlare della sfida, vieni ad aiutarmi. Ho due mani."],
    reward: { itemId: "dirInciucio", qty: 1 }
  },
  {
    id: "rival-stretto", mapId: "stretto", x: 6, y: 5, facing: "down",
    sightRange: 4, showAfterWins: 4, level: 26, size: 4,
    intro: [
      "GIANNI: stavolta non ti ho seguito. Sto aspettando il traghetto. Come gli altri.",
      "Mi hanno offerto un posto sul palco dell'inaugurazione. Avevo già promesso di portare un passeggino.",
      "Ho quattro titolari e una coincidenza da non perdere. Facciamolo bene."
    ],
    defeat: [
      "GIANNI: vincevi anche quando io dicevo il contrario. Adesso almeno il verbale torna.",
      "Se facciamo campagna insieme voglio le date scritte. Ho imparato a leggerle."
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

  // Riempitivi a tema "carrierista trasformista": pool ampio scorrevole per
  // stage, così i 4 rematch non mostrano sempre la stessa squadra.
  const fillerPool = ["grillix", "contemorfo", "bojoon", "calendauro", "macronfox", "tajanide"];
  const offset = Math.max(0, stage.showAfterWins - 1);
  const fillers = [...fillerPool.slice(offset), ...fillerPool.slice(0, offset)];
  const team: Array<[string, number]> = [];
  for (let i = 0; i < stage.size - 1; i += 1) {
    const sp = fillers[i % fillers.length];
    team.push([sp, Math.max(5, stage.level - 3 - i)]);
  }
  // L'asso (counter dello starter) è l'ultimo e il più forte.
  team.push([ace, stage.level]);
  return team;
}
