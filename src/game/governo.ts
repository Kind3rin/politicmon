import type { Item } from "../data/items";
import { statsOf, type Monster } from "./monster";
import type { GameState } from "./state";

// ---------------------------------------------------------------- SONDAGGI
// Gradimento 0-100: ogni scelta del giocatore sposta l'ago. Sblocca sconti,
// dialoghi e persino rami evolutivi diversi (governista vs opposizione).

export function addSondaggi(state: GameState, delta: number): number {
  state.sondaggi = Math.max(0, Math.min(100, Math.round(state.sondaggi + delta)));
  return state.sondaggi;
}

// Soglie di gradimento: attraversarle in salita è un "evento" gamificato.
const SONDAGGI_MILESTONES = [25, 40, 55, 70, 85] as const;

// Applica il delta e segnala se una soglia è stata superata (in salita),
// restituendo un titolo da "telegiornale" per la notifica. `null` se niente.
export function bumpSondaggi(
  state: GameState,
  delta: number
): { value: number; milestone: string | null } {
  const prev = state.sondaggi;
  const value = addSondaggi(state, delta);
  let milestone: string | null = null;
  if (delta > 0) {
    // Se in un colpo si attraversano più soglie (es. 20%→80% dopo una palestra),
    // si annuncia la PIÙ ALTA raggiunta: una sola notifica, ma quella giusta.
    // SONDAGGI_MILESTONES è crescente, quindi l'ultima soddisfatta è la massima.
    let topSoglia: number | null = null;
    for (const soglia of SONDAGGI_MILESTONES) {
      if (prev < soglia && value >= soglia) {
        topSoglia = soglia;
      }
    }
    if (topSoglia !== null) {
      milestone = `BREAKING NEWS! SONDAGGI AL ${topSoglia}%: ${sondaggiLabel(topSoglia)}!`;
    }
  }
  return { value, milestone };
}

export function sondaggiColor(value: number): string {
  return value >= 70 ? "#7ad858" : value >= 40 ? "#e8c84a" : "#d04848";
}

export function sondaggiLabel(value: number): string {
  if (value >= 85) {
    return "PLEBISCITO";
  }
  if (value >= 70) {
    return "LUNA DI MIELE";
  }
  if (value >= 55) {
    return "MAGGIORANZA";
  }
  if (value >= 40) {
    return "PAREGGIO TECNICO";
  }
  if (value >= 25) {
    return "OPPOSIZIONE";
  }
  return "FUORI DAL PARLAMENTO";
}

// Versione corta per l'HUD (max 12 caratteri, vedi clip in WorldScene): la barra
// in alto a destra non ha spazio per "FUORI DAL PARLAMENTO".
export function sondaggiLabelShort(value: number): string {
  if (value >= 85) {
    return "PLEBISCITO";
  }
  if (value >= 70) {
    return "TRIONFO";
  }
  if (value >= 55) {
    return "MAGGIORANZA";
  }
  if (value >= 40) {
    return "IN BILICO";
  }
  if (value >= 25) {
    return "OPPOSIZIONE";
  }
  return "A PICCO";
}

// ---------------------------------------------------------------- MINISTERI
// Il Governo Ombra: ogni Politicmon della squadra può ricoprire un ministero
// e fornire un bonus passivo. Se il ministro è KO, l'effetto è sospeso
// (sfiduciato sul campo).

export type MinisteroId =
  | "economia"
  | "interno"
  | "esteri"
  | "istruzione"
  | "salute"
  | "propaganda";

export interface MinisteroDef {
  id: MinisteroId;
  name: string;
  desc: string;
}

export const MINISTERI: Record<MinisteroId, MinisteroDef> = {
  economia: {
    id: "economia", name: "MIN. ECONOMIA",
    desc: "Rimborsi elettorali +25%. Trova sempre la copertura, nessuno sa dove."
  },
  interno: {
    id: "interno", name: "MIN. INTERNO",
    desc: "Meno candidati selvatici tra i piedi: incontri nell'erba -35%."
  },
  esteri: {
    id: "esteri", name: "MIN. ESTERI",
    desc: "Accordi commerciali: -20% sui prezzi del Discount Elettorale."
  },
  istruzione: {
    id: "istruzione", name: "MIN. ISTRUZIONE",
    desc: "Squadra più preparata: Punti Consenso guadagnati +15%."
  },
  salute: {
    id: "salute", name: "MIN. SALUTE",
    desc: "Sanità di prossimità: la squadra recupera 1 PV ogni 6 passi."
  },
  propaganda: {
    id: "propaganda", name: "MIN. PROPAGANDA",
    desc: "Manifesti ovunque: probabilità di reclutamento +25%."
  }
};

export const MINISTERO_ORDER: MinisteroId[] = [
  "economia", "interno", "esteri", "istruzione", "salute", "propaganda"
];

export function ministroDi(state: GameState, id: MinisteroId): Monster | null {
  const uid = state.ministri[id];
  if (!uid) {
    return null;
  }
  return state.party.find((mon) => mon.uid === uid) ?? null;
}

// Il bonus è attivo solo se il ministro è in squadra e non è KO.
export function hasMinistro(state: GameState, id: MinisteroId): boolean {
  const mon = ministroDi(state, id);
  return mon !== null && mon.hp > 0;
}

export function assegnaMinistro(state: GameState, id: MinisteroId, mon: Monster): void {
  // Un Politicmon può tenere un solo ministero: niente doppi incarichi.
  for (const key of Object.keys(state.ministri)) {
    if (state.ministri[key] === mon.uid) {
      delete state.ministri[key];
    }
  }
  state.ministri[id] = mon.uid;
}

export function rimuoviMinistro(state: GameState, id: MinisteroId): void {
  delete state.ministri[id];
}

// Ritorna true se ha effettivamente curato almeno 1 PV (per dare un feedback
// visivo solo quando serve, non a vuoto a squadra già piena).
export function curaPassiva(state: GameState): boolean {
  let healed = false;
  for (const mon of state.party) {
    const max = statsOf(mon).hp;
    if (mon.hp > 0 && mon.hp < max) {
      // Cura proporzionale (~3% del max, min 1): a 1 PV flat il ministero era
      // morto nel tardo gioco (HP 80-120). Così resta utile a ogni livello.
      const tick = Math.max(1, Math.round(max * 0.03));
      mon.hp = Math.min(max, mon.hp + tick);
      healed = true;
    }
  }
  return healed;
}

// ---------------------------------------------------------------- PREZZI
// Il Discount segue i sondaggi: chi è popolare paga meno, chi crolla paga
// il sovrapprezzo "rischio insolvenza". Il Min. Esteri sconta sempre.

export function shopPrice(state: GameState, item: Item): number {
  const base = item.price ?? 0;
  let mult = 1;
  if (state.sondaggi >= 70) {
    mult -= 0.1;
  } else if (state.sondaggi < 30) {
    mult += 0.15;
  }
  if (hasMinistro(state, "esteri")) {
    mult -= 0.2;
  }
  return Math.max(10, Math.round((base * mult) / 10) * 10);
}
