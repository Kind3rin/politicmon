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

// Curva "medio-veloce": più dolce della cubica pura (lv³) nella fascia 5-25,
// dove il giocatore prima si stancava di salire. Resta crescente e mai banale.
export function expForLevel(level: number): number {
  return Math.floor((4 * level * level * level) / 5 + 10 * level * level);
}

// Le ultime 4 mosse del learnset fino al livello dato.
export function movesAtLevel(speciesId: string, level: number): MoveSlot[] {
  const learnable = SPECIES[speciesId].learnset
    .filter(([lv]) => lv <= level)
    .map(([, id]) => id);
  const unique = [...new Set(learnable)];
  return unique.slice(-4).map((id) => ({ id, pp: MOVES[id].pp }));
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
  if (mon.level >= 50) {
    return results;
  }
  mon.exp += amount;
  while (mon.level < 50 && mon.exp >= expForLevel(mon.level + 1)) {
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
