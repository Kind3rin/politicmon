import { ABILITIES } from "../data/abilities";
import { MOVES } from "../data/moves";
import { SPECIES } from "../data/species";
import { evolutionCondition } from "./dexGuide";
import { evolve, levelEvolution, speciesOf, statsOf, type Monster } from "./monster";

export function evolutionPreview(mon: Monster, targetId: string): Monster {
  const copy = { ...mon, moves: mon.moves.map((slot) => ({ ...slot })) };
  evolve(copy, targetId);
  return copy;
}

export function evolutionComparison(mon: Monster, targetId: string, page: number): string[] {
  const from = speciesOf(mon), to = SPECIES[targetId];
  const preview = evolutionPreview(mon, targetId);
  if (page === 0) {
    const before = statsOf(mon), after = statsOf(preview);
    const keys = ["hp", "atk", "def", "spc", "spd"] as const;
    const labels = ["PV MASSIMI", "GRINTA", "FACCIA TOSTA", "RETORICA", "VELOCITÀ"];
    return ["STESSO LIVELLO, CAMBIA LA SPECIE.", ...keys.map((key, i) => `${labels[i]}: ${before[key]} > ${after[key]} (${after[key] - before[key] >= 0 ? "+" : ""}${after[key] - before[key]}).`), `PV ATTUALI: ${mon.hp} > ${preview.hp}.`, "STATUS, OGGETTO E PP RESTANO.", "LA FORMA MEME STAGIONALE SI AZZERA."];
  }
  if (page === 1) {
    const old = from.ability ? ABILITIES[from.ability] : undefined;
    const next = to.ability ? ABILITIES[to.ability] : undefined;
    return [`TIPI: ${from.types.join("/")} > ${to.types.join("/")}.`, `PRIMA: ${old?.name ?? "NESSUNA ABILITÀ"}. ${old?.desc ?? ""}`, `DOPO: ${next?.name ?? "NESSUNA ABILITÀ"}. ${next?.desc ?? ""}`, "LA PASSIVA CAMBIA. GLI EFFETTI D'INGRESSO RICHIEDONO UN NUOVO INGRESSO."];
  }
  return ["MOSSE E PP RESTANO.", ...mon.moves.map((slot) => `${MOVES[slot.id].name}: ${slot.pp}/${MOVES[slot.id].pp} PP.`), "NON IMPARA AUTOMATICAMENTE MOSSE PASSATE.", "PROSSIME MOSSE:", ...to.learnset.filter(([level]) => level > mon.level).map(([level, id]) => `LV ${level}: ${MOVES[id].name}.`)];
}

export function evolutionSummary(mon: Monster, targetId: string): string[] {
  const before = statsOf(mon), after = statsOf(evolutionPreview(mon, targetId)), to = SPECIES[targetId];
  const next = to.learnset.find(([level]) => level > mon.level);
  return [
    `PV ${before.hp} > ${after.hp} / GRINTA ${before.atk} > ${after.atk}`,
    `TIPO: ${to.types.join("/")}`,
    `ABILITÀ: ${to.ability ? ABILITIES[to.ability].name : "NESSUNA"}`,
    next ? `LV ${next[0]}: ${MOVES[next[1]].name}` : "MOSSE E PP RESTANO CON TE"
  ];
}

export function careerNotes(mon: Monster, polls: number): string[] {
  const rules = speciesOf(mon).evolutions ?? [];
  const ready = levelEvolution(mon, polls);
  if (!rules.length) return ["FORMA FINALE: NESSUNA EVOLUZIONE."];
  return [`SONDAGGI ATTUALI: ${polls}.`, ...(ready ? [`PRONTA: ${SPECIES[ready].name}. A APRE IL CONFRONTO; NON EVOLVE SUBITO.`] : []), ...rules.map((rule, i) => `${SPECIES[rule.id].name}: ${evolutionCondition(rule, rules.slice(0, i))}.`), "PUOI RINVIARE E TORNARE QUI. LE SOGLIE DI SONDAGGIO SONO RIVALUTATE QUANDO SCEGLI."];
}
