// ------------------------------------------------- COPPA DELLE POLTRONE
// Torneo post-garante a eliminazione diretta, 8 partecipanti:
//  - slot 0 = IL GIOCATORE (combatte ogni suo round come BattleScene normale);
//  - slot 1..7 = 7 "FANTASMI", versioni lv 50-55 di trainer già battuti.
// Il BRACKET (chi affronta chi) è deterministico dal GIORNO (hashDate): stesso
// tabellone per tutti nello stesso giorno, ma varia col passare dei giorni.
// Gli incontri FANTASMA-vs-FANTASMA sono risolti con la simulazione del duello
// (duelsim, in sola LETTURA: il save non è mai toccato), con un RNG SEEDATO dal
// giorno → l'intero tabellone è ripetibile e stabile.
//
// STATO: il torneo è una SESSIONE SINGOLA. Non viene salvato in-progress (se
// esci, perdi il progresso del giorno): l'unica cosa persistente è il numero di
// trionfi (state.coppaWins) e il flag "coppa-vinta", scritti SOLO alla vittoria
// finale. Questo evita di gonfiare il save con lo stato di un bracket.

import type { TrainerDef } from "../data/trainers";
import { hashDate, localDateKey } from "./daily";
import { createMonster, type Monster } from "./monster";
import { makeDuelSim, resolveTurn, aliveCount, type DuelSim, type Rng } from "./battle/duelsim";
import type { DuelCmd, DuelSide } from "../net/duelproto";
import { MOVES } from "../data/moves";

// Tassa d'iscrizione: money-SINK (paghi per entrare, mai un faucet).
export const COPPA_FEE = 1500;
// Ricompensa una-tantum al PRIMO trionfo (item + fondi simbolici).
export const COPPA_FIRST_PRIZE = { itemId: "tessera", qty: 1, money: 3000 };
export const COPPA_TITLE = "PORTAVOCE DEL POPOLO";

// I 7 fantasmi: id trainer già affrontati nel gioco + un nome "da torneo" e la
// squadra base (specie) che verrà scalata a lv 50-55. Sono avversari NOTI (li hai
// già battuti nel percorso), rimessi in forma da campioni.
interface GhostArchetype {
  id: string;
  name: string;
  pal: string;
  species: string[]; // 3 specie; livelli assegnati in buildGhostTeam
  intro: string[];
  defeat: string[];
}

const GHOSTS: GhostArchetype[] = [
  {
    id: "ghost-emittenza", name: "SUA EMITTENZA", pal: "boss",
    species: ["tajanide", "telecrate", "berlusconix"],
    intro: ["Ah, la COPPA! Il mio share qui è garantito."],
    defeat: ["Mandiamo la pubblicità. Anzi, i titoli di coda."]
  },
  {
    id: "ghost-tycoon", name: "MR. TYCOON", pal: "boss",
    species: ["bojoon", "generorso", "trumpon"],
    intro: ["Il torneo più grande di sempre. E io lo vinco. Enorme."],
    defeat: ["Truccato! Chiedo il riconteggio dei voti. E delle poltrone."]
  },
  {
    id: "ghost-ladydirettiva", name: "LADY DIRETTIVA", pal: "granny",
    species: ["macronfox", "calendrone", "ursulax"],
    intro: ["Regolamento alla mano: articolo uno, vinco io."],
    defeat: ["Faccio ricorso. In tre gradi. E in tre lingue."]
  },
  {
    id: "ghost-tesoriere", name: "IL TESORIERE", pal: "boss",
    species: ["telecrate", "conteblob", "muskrat"],
    intro: ["I conti del torneo? Li custodisco io. Non registrati, ovvio."],
    defeat: ["Metto la sconfitta in un conto offshore. Sparisce."]
  },
  {
    id: "ghost-capitano", name: "IL CAPITANO", pal: "boss",
    species: ["salvinator", "vannaccix", "capitanone"],
    intro: ["Prima le poltrone italiane. Poi il resto. Forse."],
    defeat: ["Rinvio l'inaugurazione del trofeo. DI NUOVO."]
  },
  {
    id: "ghost-giudice", name: "GIUDICE SUPREMA", pal: "journalist",
    species: ["xipanda", "putingrad", "draghimon"],
    intro: ["Ultimo grado di giudizio: la tua eliminazione."],
    defeat: ["Sentenza sospesa. Deposito le motivazioni tra nove anni."]
  },
  {
    id: "ghost-rivale", name: "GIANNI VETERANO", pal: "rival",
    species: ["grillix", "contemorfo", "renzilla"],
    intro: ["Anche alla COPPA ci sono io. Sei tu che mi insegui, ricordi?"],
    defeat: ["Zero a mille per te. Vengo a fare campagna PER te, va'."]
  }
];

// Nome pubblico del bracket per slot 0.
export const COPPA_PLAYER_NAME = "TU";

export interface BracketEntry {
  isPlayer: boolean;
  ghost?: GhostArchetype;
}

export interface TournamentState {
  dateKey: string;
  seed: number;
  round: number; // 0 = quarti, 1 = semifinale, 2 = finale
  // Partecipanti ancora in gara, come coppie (match) del round corrente.
  // Sempre potenze di 2 che si dimezzano: 8 → 4 → 2 → 1.
  alive: BracketEntry[];
}

// ---- RNG seedato (mulberry32): deterministico dal seed del giorno ----
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Livello scalato di un fantasma: lv 50-55 (spec), l'asso più alto.
function ghostLevel(index: number, seed: number): number {
  return 50 + ((seed + index) % 6); // 50..55
}

// Squadra (Monster[]) di un fantasma per il bracket del giorno.
export function buildGhostTeam(ghost: GhostArchetype, top: number): Monster[] {
  return ghost.species.map((sp, i) => createMonster(sp, Math.max(48, top - (ghost.species.length - 1 - i) * 2)));
}

// TrainerDef del fantasma per una BattleScene: team lv 50-55.
export function ghostTrainerDef(ghost: GhostArchetype, seed: number, ghostIndex: number): TrainerDef {
  const top = ghostLevel(ghostIndex, seed);
  return {
    id: `coppa:${ghost.id}`, // MAI in defeatedTrainers (id con ":", come daily/wander)
    name: ghost.name,
    pal: ghost.pal,
    team: ghost.species.map((sp, i) => [sp, Math.max(48, top - (ghost.species.length - 1 - i) * 2)] as [string, number]),
    intro: ghost.intro,
    defeat: ghost.defeat,
    money: 0 // il premio del torneo è a parte: il match non paga (niente farm)
  };
}

// Inizializza il tabellone del giorno: mescola i 7 fantasmi + il giocatore in 8
// slot con un ordine deterministico dal seed.
export function initTournament(dateKey = localDateKey()): TournamentState {
  const seed = hashDate(`coppa:${dateKey}`);
  const rng = seededRng(seed);
  // Ordina i fantasmi in modo deterministico (shuffle seedato).
  const ghosts = [...GHOSTS];
  for (let i = ghosts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [ghosts[i], ghosts[j]] = [ghosts[j], ghosts[i]];
  }
  const entries: BracketEntry[] = [{ isPlayer: true }, ...ghosts.map((g) => ({ isPlayer: false, ghost: g }))];
  // Il giocatore è sempre nello slot 0; il suo avversario del primo round è lo
  // slot 1. Gli altri (2..7) formano i match fantasma-vs-fantasma.
  return { dateKey, seed, round: 0, alive: entries };
}

// L'avversario FANTASMA del giocatore nel round corrente (slot 1 della coppia).
export function playerOpponent(t: TournamentState): GhostArchetype | null {
  const opp = t.alive[1];
  return opp && !opp.isPlayer ? opp.ghost ?? null : null;
}

// Round leggibile: QUARTI / SEMIFINALE / FINALE in base a quanti restano.
export function roundLabel(t: TournamentState): string {
  const n = t.alive.length;
  if (n >= 8) return "QUARTI DI FINALE";
  if (n === 4) return "SEMIFINALE";
  if (n === 2) return "FINALE";
  return "COPPA";
}

// Il giocatore ha appena VINTO il suo match del round: risolve gli altri match
// del round con duelsim (fantasma-vs-fantasma) e forma il round successivo.
// Ritorna true se il giocatore ha VINTO IL TORNEO (era la finale).
export function advanceAfterPlayerWin(t: TournamentState): { champion: boolean; results: string[] } {
  const results: string[] = [];
  const survivors: BracketEntry[] = [t.alive[0]]; // il giocatore prosegue
  // Match del round: (0,1) è il giocatore (già vinto), poi (2,3),(4,5),(6,7)...
  for (let i = 2; i < t.alive.length; i += 2) {
    const a = t.alive[i];
    const b = t.alive[i + 1];
    if (!b) {
      survivors.push(a);
      continue;
    }
    const winner = simulateGhostMatch(a, b, t.seed + i, ghostLevel(i, t.seed), ghostLevel(i + 1, t.seed));
    survivors.push(winner);
    const wName = winner.ghost?.name ?? "?";
    const lName = (winner === a ? b : a).ghost?.name ?? "?";
    results.push(`${wName} elimina ${lName}.`);
  }
  // Se il giocatore è l'unico rimasto → ha vinto il torneo.
  if (survivors.length === 1) {
    return { champion: true, results };
  }
  t.alive = survivors;
  t.round += 1;
  return { champion: false, results };
}

// Risolve un match FANTASMA-vs-FANTASMA con duelsim + RNG seedato. Sola lettura:
// costruisce team temporanei, non tocca il save. Ritorna il vincitore.
function simulateGhostMatch(
  a: BracketEntry,
  b: BracketEntry,
  seed: number,
  topA: number,
  topB: number
): BracketEntry {
  if (!a.ghost) return a;
  if (!b.ghost) return b;
  const rng = seededRng(seed >>> 0);
  const sim = makeDuelSim(buildGhostTeam(a.ghost, topA), buildGhostTeam(b.ghost, topB));
  // Fino a 200 turni (guardia anti-loop); poi vince chi ha più mostri vivi.
  for (let turn = 0; turn < 200; turn += 1) {
    if (aliveCount(sim.host) === 0 || aliveCount(sim.guest) === 0) {
      break;
    }
    const hostCmd = pickGhostCmd(sim, "host", rng);
    const guestCmd = pickGhostCmd(sim, "guest", rng);
    resolveTurn(sim, hostCmd, guestCmd, rng);
  }
  const hostAlive = aliveCount(sim.host);
  const guestAlive = aliveCount(sim.guest);
  if (hostAlive === guestAlive) {
    // Pareggio secco (rarissimo): spareggio col seed.
    return rng() < 0.5 ? a : b;
  }
  return hostAlive > guestAlive ? a : b;
}

// AI deterministica del fantasma nel sim: se l'attivo è KO, cambia al primo vivo;
// altrimenti sceglie la mossa da danno migliore (STAB/power) con RNG seedato per
// i pareggi. Nessun uso di Math.random (tutto passa dal seed).
function pickGhostCmd(sim: DuelSim, side: DuelSide, rng: Rng): DuelCmd {
  const st = sim[side];
  if (st.active.mon.hp <= 0) {
    const idx = st.party.findIndex((m) => m.hp > 0);
    if (idx >= 0 && idx !== st.activeIdx) {
      return { kind: "switch", index: idx };
    }
  }
  const usable = st.active.mon.moves.filter((slot) => slot.pp > 0);
  if (usable.length === 0) {
    return { kind: "move", moveId: "comizio" };
  }
  // Punteggio semplice: preferisci le mosse da danno (power più alto), tie con rng.
  let best = usable[0].id;
  let bestScore = -1;
  for (const slot of usable) {
    const move = MOVES[slot.id];
    const score = (move.power > 0 ? move.power : 1) + rng() * 5;
    if (score > bestScore) {
      bestScore = score;
      best = slot.id;
    }
  }
  return { kind: "move", moveId: best };
}
