import { ABILITIES, type Ability } from "../data/abilities";
import { ITEMS, type Item } from "../data/items";
import { MOVES, type StatusId } from "../data/moves";
import { SPECIES, type Species } from "../data/species";

export interface MoveSlot {
  id: string;
  pp: number;
}

export interface Monster {
  uid: string;
  speciesId: string;
  level: number;
  exp: number;
  hp: number;
  status: StatusId | null;
  moves: MoveSlot[];
  heldItem?: string; // id item kind "hold" equipaggiato (save v11, opzionale)
}

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spc: number;
  spd: number;
}

let uidCounter = 0;

export function speciesOf(mon: Monster): Species {
  return SPECIES[mon.speciesId];
}

// Oggetto tenuto (kind "hold"), con parse difensivo: se l'id non esiste più
// in ITEMS o non è un hold (save vecchio/corrotto), viene ignorato E ripulito.
export function heldItemOf(mon: Monster): Item | null {
  if (!mon.heldItem) {
    return null;
  }
  const item = ITEMS[mon.heldItem];
  if (!item || item.kind !== "hold") {
    delete mon.heldItem;
    return null;
  }
  return item;
}

// Abilità passiva della specie (derivata, mai dal filo): null se assente o
// se l'id non esiste nel registry.
export function abilityOf(mon: Monster): Ability | null {
  const id = speciesOf(mon).ability;
  return id ? (ABILITIES[id] ?? null) : null;
}

export function statsOf(mon: Monster): Stats {
  const base = speciesOf(mon).base;
  const lv = mon.level;
  // HP gonfiati e difese che scalano col livello (non più +5 flat): così il
  // bersaglio regge più colpi e le battaglie durano ~5-8 turni invece di 2.
  // L'HP cresce più che linearmente (lv*2) per reggere le mosse evolute (power
  // 85-110) nel tardo gioco, dove prima gli scontri tornavano a 2 turni.
  return {
    hp: Math.floor((base.hp * 3 * lv) / 100) + lv + 14,
    // atk scala con +lv come def/spc: prima era +5 flat e l'offesa restava
    // indietro rispetto alle difese gonfiate, affamando il danno early-game.
    atk: Math.floor((base.atk * 2 * lv) / 100) + lv + 5,
    def: Math.floor((base.def * 2 * lv) / 100) + lv + 5,
    spc: Math.floor((base.spc * 2 * lv) / 100) + lv + 5,
    spd: Math.floor((base.spd * 2 * lv) / 100) + 5
  };
}

// Level cap del giocatore (Round 42: 50→55, coerente coi boss UE/Coppa lv52-55).
// Runtime, NON nel save: cappa solo la crescita in gainExp/expRatio.
export const LEVEL_CAP = 55;

// Curva "medio-veloce": più dolce della cubica pura (lv³) nella fascia 5-25,
// dove il giocatore prima si stancava di salire. Resta crescente e mai banale.
// Regge fino al cap 55 (0.8·55³+10·55²=163.075, ben dentro i Number sicuri).
export function expForLevel(level: number): number {
  return Math.floor((4 * level * level * level) / 5 + 10 * level * level);
}

// Le 4 mosse del moveset iniziale di un mon ottenuto a un dato livello.
// Prende le 4 più recenti del learnset MA garantisce almeno una mossa STAB da
// danno: prima lo `slice(-4)` posizionale scartava le STAB base (imparate a lv1)
// per una cattura ad alto livello, lasciando moveset amputati o solo-status.
export function movesAtLevel(speciesId: string, level: number): MoveSlot[] {
  const species = SPECIES[speciesId];
  const learnable = species.learnset
    .filter(([lv]) => lv <= level)
    .map(([, id]) => id);
  const unique = [...new Set(learnable)];
  const picked = unique.slice(-4);
  // Nessuna mossa da danno del tipo della specie tra le scelte? Innesta la STAB
  // da danno più recente disponibile al posto della mossa più vecchia.
  const isStabDamage = (id: string) => MOVES[id].power > 0 && species.types.includes(MOVES[id].type);
  if (unique.length > 0 && !picked.some(isStabDamage)) {
    const stab = [...unique].reverse().find(isStabDamage);
    if (stab && !picked.includes(stab)) {
      picked[0] = stab;
    }
  }
  return picked.map((id) => ({ id, pp: MOVES[id].pp }));
}

// Prima specie del dex: fallback di sicurezza per un save manomesso/cross-version
// con uno speciesId che non esiste più nel registry (rinominato o rimosso).
function firstSpeciesId(): string {
  return Object.keys(SPECIES)[0];
}

// Riporta in un range valido un mostro caricato dal salvataggio o importato via
// "CODICE SALVATAGGIO" (feature pensata per condividere save tra estranei → input
// non fidato). Chiude i crash da lookup non protetto:
//   - speciesId inesistente → speciesOf/statsOf tornerebbero undefined (crash ovunque)
//   - moves con id non più in MOVES → healMonster/move-menu crashano su MOVES[id].pp
// Idempotente: un mostro già valido non viene toccato. NON valida hp/exp (già fatto
// in parseState con statsOf, che richiede uno speciesId valido — perciò va chiamata PRIMA).
export function sanitizeMon(mon: Monster): void {
  if (typeof mon.speciesId !== "string" || !SPECIES[mon.speciesId]) {
    mon.speciesId = firstSpeciesId();
  }
  const level = typeof mon.level === "number" && mon.level > 0 ? Math.floor(mon.level) : 1;
  mon.level = level;
  // Tieni solo gli slot con id valido e pp numerico; scarta i duplicati.
  const seen = new Set<string>();
  mon.moves = Array.isArray(mon.moves)
    ? mon.moves.filter((slot): slot is MoveSlot => {
        if (!slot || typeof slot.id !== "string" || !MOVES[slot.id] || seen.has(slot.id)) {
          return false;
        }
        seen.add(slot.id);
        if (typeof slot.pp !== "number" || Number.isNaN(slot.pp)) {
          slot.pp = MOVES[slot.id].pp;
        } else {
          slot.pp = Math.max(0, Math.min(MOVES[slot.id].pp, Math.floor(slot.pp)));
        }
        return true;
      })
    : [];
  // Un mostro senza NESSUNA mossa valida bloccherebbe la lotta: ripopola dal learnset.
  if (mon.moves.length === 0) {
    mon.moves = movesAtLevel(mon.speciesId, level);
  }
}

export function createMonster(speciesId: string, level: number): Monster {
  const mon: Monster = {
    uid: `m${Date.now().toString(36)}${(uidCounter += 1)}`,
    speciesId,
    level,
    exp: expForLevel(level),
    hp: 0,
    status: null,
    moves: movesAtLevel(speciesId, level)
  };
  mon.hp = statsOf(mon).hp;
  return mon;
}

export function expYield(foe: Monster, isTrainer: boolean): number {
  const base = speciesOf(foe).expYield;
  // Divisore 5.5: l'EXP è più generosa per tenere il passo coi trainer
  // obbligatori (il giocatore reale arrivava sotto-livello alle palestre).
  const amount = Math.floor((base * foe.level) / 5.5);
  return Math.max(1, Math.floor(amount * (isTrainer ? 1.5 : 1)));
}

export interface LevelUpResult {
  newLevel: number;
  learnableMoves: string[]; // mosse del nuovo livello
  evolvesTo?: string;
}

// Prima evoluzione da level-up valida con i sondaggi attuali (l'ordine
// delle regole decide il ramo: governista prima dell'opposizione).
export function levelEvolution(mon: Monster, sondaggi: number): string | undefined {
  for (const rule of speciesOf(mon).evolutions ?? []) {
    if (rule.item || rule.level === undefined || mon.level < rule.level) {
      continue;
    }
    if (rule.minSondaggi !== undefined && sondaggi < rule.minSondaggi) {
      continue;
    }
    if (rule.maxSondaggi !== undefined && sondaggi > rule.maxSondaggi) {
      continue;
    }
    return rule.id;
  }
  return undefined;
}

// Evoluzione innescata da un oggetto (es. TESSERA DORATA).
export function itemEvolution(mon: Monster, itemId: string): string | undefined {
  return (speciesOf(mon).evolutions ?? []).find((rule) => rule.item === itemId)?.id;
}

// Evoluzione innescata da uno SCAMBIO online: il "cambio di casacca" evolve il
// mostro APPENA arrivato nella nuova squadra (TradeScene, dopo il commit).
export function tradeEvolution(mon: Monster): string | undefined {
  return (speciesOf(mon).evolutions ?? []).find((rule) => rule.trade)?.id;
}

// Prossima evoluzione per livello ancora da raggiungere (per anticiparla al
// giocatore: "EVOLVE a Lv16"). Restituisce il livello soglia, o undefined se
// non ci sono evoluzioni per livello in arrivo.
export function nextEvolutionLevel(mon: Monster): number | undefined {
  let best: number | undefined;
  for (const rule of speciesOf(mon).evolutions ?? []) {
    if (rule.item || rule.level === undefined || mon.level >= rule.level) {
      continue;
    }
    if (best === undefined || rule.level < best) {
      best = rule.level;
    }
  }
  return best;
}

// Applica exp; restituisce gli eventi di level-up uno per livello guadagnato.
export function gainExp(mon: Monster, amount: number, sondaggi = 50): LevelUpResult[] {
  const results: LevelUpResult[] = [];
  if (mon.level >= LEVEL_CAP) {
    return results;
  }
  mon.exp += amount;
  while (mon.level < LEVEL_CAP && mon.exp >= expForLevel(mon.level + 1)) {
    const prevMax = statsOf(mon).hp;
    mon.level += 1;
    const newMax = statsOf(mon).hp;
    mon.hp = Math.min(newMax, mon.hp + (newMax - prevMax));
    const species = speciesOf(mon);
    const learnable = species.learnset
      .filter(([lv]) => lv === mon.level)
      .map(([, id]) => id)
      .filter((id) => !mon.moves.some((slot) => slot.id === id));
    results.push({ newLevel: mon.level, learnableMoves: learnable, evolvesTo: levelEvolution(mon, sondaggi) });
  }
  return results;
}

// Una DIRETTIVA DI PARTITO è compatibile se il POLITICMON condivide il tipo
// della mossa, oppure se la mossa è già nel suo learnset naturale.
export function canLearnMove(mon: Monster, moveId: string): boolean {
  const move = MOVES[moveId];
  if (!move) {
    return false;
  }
  if (mon.moves.some((slot) => slot.id === moveId)) {
    return false; // già conosciuta
  }
  const species = speciesOf(mon);
  if (species.learnset.some(([, id]) => id === moveId)) {
    return true;
  }
  return species.types.includes(move.type);
}

export function evolve(mon: Monster, targetId: string): void {
  if (!SPECIES[targetId]) {
    return;
  }
  const hpRatio = mon.hp / statsOf(mon).hp;
  mon.speciesId = targetId;
  mon.hp = Math.max(1, Math.round(statsOf(mon).hp * hpRatio));
}

export function healMonster(mon: Monster): void {
  mon.hp = statsOf(mon).hp;
  mon.status = null;
  for (const slot of mon.moves) {
    slot.pp = MOVES[slot.id].pp;
  }
}
