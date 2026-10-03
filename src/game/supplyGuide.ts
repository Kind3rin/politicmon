import { BAG_ORDER, ITEMS, SHOP_DIRECTIVES, type Item } from "../data/items";
import { MOVES, STATUS_LABELS, moveKindLabel, moveSummary } from "../data/moves";
import { canLearnMove, itemEvolution, speciesOf, statsOf, type Monster } from "./monster";
import { shopAdjustments, shopPrice } from "./governo";
import type { GameState } from "./state";

export const SUPPLY_FILTERS = ["TUTTI", "CURE", "RECLUTA", "DIRETTIVE", "KIT"] as const;
export function supplyMatches(item: Item, filter: number): boolean {
  return filter === 0 || (filter === 1 ? ["heal", "cure"].includes(item.kind) : filter === 2 ? item.kind === "ball" : filter === 3 ? item.kind === "tm" : !["heal", "cure", "ball", "tm"].includes(item.kind));
}
export function shopStock(state: GameState): string[] {
  return BAG_ORDER.filter((id) => {
    const item = ITEMS[id];
    return item.price !== undefined && (item.kind !== "tm" || SHOP_DIRECTIVES.includes(id)) &&
      (item.kind !== "boost" || !!state.flags["garante-beaten"] || (id === "manifesti" && state.badges.length >= 2));
  });
}
export function purchaseLimit(state: GameState, item: Item): number {
  if (item.price === undefined || (item.reusable && (state.bag[item.id] ?? 0) > 0)) return 0;
  return Math.min(item.reusable ? 1 : 99, Math.floor(state.money / shopPrice(state, item)));
}
// Price and stock are rechecked at commit, never when merely browsing a quote.
export function buySupplies(state: GameState, id: string, quantity: number): boolean {
  const item = ITEMS[id];
  if (!item || !shopStock(state).includes(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > purchaseLimit(state, item)) return false;
  state.money -= shopPrice(state, item) * quantity;
  state.bag[id] = (state.bag[id] ?? 0) + quantity;
  return true;
}
export function moveNotes(mon: Monster | undefined, id: string, pp = MOVES[id].pp): string[] {
  const move = MOVES[id];
  return [move.name, `${move.type} / ${moveKindLabel(move)}. PP ${pp}/${move.pp}.`,
    `POTENZA ${move.power}. PRECISIONE ${move.accuracy}%.`, moveSummary(move),
    `PRIORITÀ ${move.effect?.priority ?? 0}. ${mon && move.power > 0 && speciesOf(mon).types.includes(move.type) ? "STAB x1.5." : ""}`,
    move.flavor];
}
export function supplyNotes(state: GameState, item: Item, page: number, inBattle: boolean): string[] {
  if (page === 1) {
    if (!["heal", "cure", "tm", "evo", "hold"].includes(item.kind)) return ["PREPARAZIONE SUL TERRITORIO:",
      `SPRAY: ${state.repellentSteps} PASSI RESIDUI.`, `MANIFESTI: ${state.boostExpBattles} VITTORIE.`,
      `SPOT: ${state.boostMoneyBattles} RIVALI.`, `COMIZIO: ${state.boostSondBattles} RIVALI.`, "I BOOST NON SI BRUCIANO PER FUGA O SCONFITTA."];
    return [inBattle ? "IN LOTTA AGISCE SUL CANDIDATO ATTIVO; LE REGOLE COPPA POSSONO LIMITARE LE CURE." : "CHI NE BENEFICIA?", ...state.party.map((mon) => {
      const name = speciesOf(mon).name, max = statsOf(mon).hp;
      if (item.kind === "heal") return mon.hp <= 0 ? `${name}: KO, NON RIANIMA.` : `${name}: +${Math.min(max - mon.hp, item.percent != null ? Math.ceil(max * item.percent) : item.amount ?? 20)} PV (${mon.hp}/${max}).`;
      if (item.kind === "cure") return `${name}: ${mon.status ? STATUS_LABELS[mon.status] : "NESSUNO STATUS"}.`;
      if (item.kind === "tm") return `${name}: ${mon.moves.some((slot) => slot.id === item.moveId) ? "GIÀ APPRESA" : item.moveId && canLearnMove(mon, item.moveId) ? "COMPATIBILE" : "TIPO INCOMPATIBILE"}.`;
      if (item.kind === "evo") { const target = itemEvolution(mon, item.id); return `${name}: ${target ? `DIVENTA ${target.toUpperCase()}` : "NESSUN RAMO"}.`; }
      return `${name}: ${ITEMS[mon.heldItem ?? ""]?.name ?? "SLOT LIBERO"}.`;
    }), ...(item.kind === "hold" ? ["UN SOLO OGGETTO: LO SWAP RESTITUISCE IL PRECEDENTE ALLA BORSA."] : [])];
  }
  if (page === 2) return [`PREZZO BASE: ${item.price === undefined ? "NON IN VENDITA" : `${item.price} EURO`}.`,
    ...shopAdjustments(state).map((entry) => `${entry.label}: ${entry.percent > 0 ? "+" : ""}${entry.percent}%.`),
    "LE PERCENTUALI SI SOMMANO ALLA BASE; PREZZO ARROTONDATO A 10 EURO.",
    ...(item.price === undefined ? [] : [`PREZZO UNITARIO: ${shopPrice(state, item)} EURO.`, `FONDI: ${state.money} EURO.`, `ACQUISTABILI: ${purchaseLimit(state, item)}.`, ...(item.reusable ? ["UNA COPIA BASTA: LA DIRETTIVA È RIUTILIZZABILE."] : [])])];
  const notes = [item.desc];
  if (item.kind === "heal") notes.push("RECUPERA PV, NON PP. NON RIANIMA I KO.");
  if (item.kind === "cure") notes.push("TOGLIE GLI STATUS; NON RECUPERA PV O PP.");
  if (item.kind === "ball") notes.push(`BONUS RECLUTAMENTO x${item.ballBonus}. NON È LA PROBABILITÀ FINALE.`, "SOLO SELVATICI: INDEBOLISCI SENZA METTERE KO. IL DOSSIER MOSTRA LA CHANCE. RECLUTARE DÀ ESPERIENZA.");
  if (["heal", "cure", "ball"].includes(item.kind)) notes.push("IN LOTTA CONSUMA UN OGGETTO E UN TURNO; IL RIVALE PUÒ RISPONDERE.");
  else notes.push("USO FUORI LOTTA.");
  if (item.kind === "hold") notes.push("RESTA EQUIPAGGIATO; NON SI CONSUMA. NEL DUELLO GLI OGGETTI NON SONO ATTIVI.");
  if (item.id === "caffettiera") notes.push("A FINE TURNO: +1/16 DEI PV MAX, MINIMO 1, SOLO SE ANCORA IN PIEDI.");
  if (item.kind === "evo") notes.push("PRIMA CONFRONTI LA CARRIERA. SI CONSUMA SOLO SE ACCETTI.");
  if (item.kind === "key") notes.push("PASSIVO: BASTA POSSEDERLO.");
  if (item.kind === "boost") notes.push(item.id === "manifesti" ? "SCALA SU KO O RECLUTAMENTO RIUSCITO." : item.id === "spotprimetime" ? "SCALA SOLO SUI RIVALI: ESCLUDE I REMATCH." : "SCALA SUI RIVALI, ANCHE NEI REMATCH.", `GIÀ ATTIVO: ${state[item.boost!.field]}. USARLO AGGIUNGE ${item.boost!.battles} CARICHE.`);
  if (item.moveId) notes.push("RIUTILIZZABILE: NON SI CONSUMA.", ...moveNotes(undefined, item.moveId));
  return notes;
}

export interface HealingQuote { id: string; before: number; after: number; max: number; quantity: number }
export function healingQuote(state: GameState, mon: Monster, itemId?: string): HealingQuote | null {
  const max = statsOf(mon).hp;
  if (!state.party.includes(mon) || mon.hp <= 0 || mon.hp >= max) return null;
  const id = itemId ?? BAG_ORDER.find((id) => ITEMS[id].kind === "heal" && (state.bag[id] ?? 0) > 0);
  const item = ITEMS[id ?? ""], quantity = state.bag[id ?? ""] ?? 0;
  if (!id || !item || item.kind !== "heal" || quantity < 1) return null;
  const amount = item.percent != null ? Math.ceil(max * item.percent) : item.amount ?? 20;
  return { id, before: mon.hp, after: Math.min(max, mon.hp + amount), max, quantity };
}
// A stale quote must never consume a different item or heal a different target.
export function useHealingSupply(state: GameState, mon: Monster, quote: HealingQuote): boolean {
  const live = healingQuote(state, mon, quote.id);
  if (!live || live.before !== quote.before || live.after !== quote.after || live.max !== quote.max || live.quantity !== quote.quantity) return false;
  mon.hp = live.after;
  state.bag[live.id] = live.quantity - 1;
  return true;
}
