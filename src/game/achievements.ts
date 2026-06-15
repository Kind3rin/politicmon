import type { GameState } from "./state";

// ---------------------------------------------------------------- TRAGUARDI
// Obiettivi satirici sbloccabili: danno "carote" continue (a breve e lungo
// termine) e fanno scoprire le feature del gioco (casinò, governo, rivale...).
// Lo stato sbloccato vive in state.flags con prefisso "ach:" — niente bump
// della chiave di salvataggio. Una piccola ricompensa in fondi rende dolce
// ogni sblocco.

export interface Achievement {
  id: string;
  name: string;
  desc: string; // come si sblocca, in chiave satirica
  reward: number; // fondi € in premio
  done: (s: GameState) => boolean;
}

function caughtCount(s: GameState): number {
  return Object.values(s.dex).filter((v) => v === "caught").length;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-blood", name: "PRIMA POLTRONA",
    desc: "Vinci la tua prima battaglia da allenatore.",
    reward: 200,
    done: (s) => s.defeatedTrainers.length >= 1
  },
  {
    id: "first-catch", name: "PRIMA TESSERA",
    desc: "Recluta il tuo primo POLITICMON selvatico.",
    reward: 200,
    done: (s) => caughtCount(s) >= 2 // lo starter + 1
  },
  {
    id: "collector", name: "LISTA CIVICA",
    desc: "Recluta almeno 6 POLITICMON diversi.",
    reward: 500,
    done: (s) => caughtCount(s) >= 6
  },
  {
    id: "first-badge", name: "ESORDIO IN TV",
    desc: "Conquista la tua prima medaglia.",
    reward: 400,
    done: (s) => s.badges.length >= 1
  },
  {
    id: "three-badges", name: "TRIS DI MEDAGLIE",
    desc: "Conquista tutte e tre le medaglie dell'Atto 1.",
    reward: 1000,
    done: (s) => s.badges.length >= 3
  },
  {
    id: "government", name: "GOVERNO IN CARICA",
    desc: "Assegna tutti e 6 i ministeri del Governo Ombra.",
    reward: 800,
    done: (s) => Object.keys(s.ministri).length >= 6
  },
  {
    id: "plebiscito", name: "BAGNO DI FOLLA",
    desc: "Porta i SONDAGGI almeno all'85% (PLEBISCITO).",
    reward: 700,
    done: (s) => s.sondaggi >= 85
  },
  {
    id: "rock-bottom", name: "FUORI DAL PARLAMENTO",
    desc: "Tocca il fondo: SONDAGGI sotto il 15%. Complimenti?",
    reward: 300,
    done: (s) => s.sondaggi <= 15
  },
  {
    id: "rival-rematch", name: "BESTIA NERA",
    desc: "Batti il RIVALE GIANNI almeno tre volte.",
    reward: 600,
    done: (s) => s.rivalWins >= 3
  },
  {
    id: "high-roller", name: "RE DEL PALAZZO",
    desc: "Accumula almeno 200 FICHE al CASINÒ.",
    reward: 400,
    done: (s) => s.chips >= 200
  },
  {
    id: "tycoon", name: "FONDI NERI",
    desc: "Metti da parte 10.000€. Coperture non pervenute.",
    reward: 1000,
    done: (s) => s.money >= 10000
  },
  {
    id: "treasure-hunter", name: "ARCHEOLOGO DEL CONSENSO",
    desc: "Scova un tesoro segreto nascosto nel mondo.",
    reward: 300,
    done: (s) => s.pickedItems.some((id) => id.includes("-hide"))
  },
  {
    id: "directive", name: "LINEA DI PARTITO",
    desc: "Insegna una DIRETTIVA a un POLITICMON.",
    reward: 300,
    done: (s) => Boolean(s.flags["used-directive"])
  },
  {
    id: "mechanic", name: "PARCO MACCHINE",
    desc: "Sblocca un veicolo (MONOPATTINO o RUSPA).",
    reward: 300,
    done: (s) => Boolean(s.flags["gift-mediopoli-vehicle"] || s.flags["gift-capitale-vehicle"])
  }
];

const FLAG_PREFIX = "ach:";

export function isUnlocked(state: GameState, id: string): boolean {
  return Boolean(state.flags[FLAG_PREFIX + id]);
}

export function unlockedCount(state: GameState): number {
  return ACHIEVEMENTS.filter((a) => isUnlocked(state, a.id)).length;
}

// Valuta tutti i traguardi: sblocca quelli appena raggiunti, accredita il
// premio e li restituisce (per la notifica a schermo). Da chiamare dopo gli
// eventi chiave (vittoria, cattura, sblocco, fine sessione casinò...).
export function checkAchievements(state: GameState): Achievement[] {
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (isUnlocked(state, a.id)) {
      continue;
    }
    if (a.done(state)) {
      state.flags[FLAG_PREFIX + a.id] = true;
      state.money += a.reward;
      fresh.push(a);
    }
  }
  return fresh;
}
