import type { SlotId } from "../../game/palinsesto";
import type { MapDef, NpcDef } from "./types";

/**
 * The people of each hour: in the main towns somebody is only about during one slot of the schedule (the baker at dawn,
 * the night shopper), so changing slot changes who is in the square. A few give something the first time, as a reason to look.
 * They only exist once the schedule is open (after the first duel with Gianni) and they never wander, so they cannot be in the way.
 */
const person = (id: string, dialogueName: string, pal: string, x: number, y: number, slots: SlotId[], lines: string[], gift?: NpcDef["gift"]): NpcDef =>
  ({ id: `slot-${id}`, dialogueName, pal, x, y, facing: "down", slots, wander: false, lines, ...(gift ? { gift } : {}) });

export const SLOT_NPCS: Readonly<Record<string, readonly NpcDef[]>> = {
  borgo: [
    person("borgo-fornaio", "Fornaio", "barista", 11, 11, ["mattina"],
      ["La Rassegna stampa comincia alle cinque: prima i giornali, poi il cornetto.", "A quest'ora girano soprattutto i VERDI e le ISTITUZIONI. Chi cerca loro, cerchi la mattina."],
      { itemId: "caffe", qty: 2, flag: "slot-gift-borgo-fornaio", lines: ["Cornetto e caffè, offerta del mattino.", "Anzi no: il cornetto l'ho finito. Il caffè è per te."] }),
    person("borgo-consigliere", "Consigliere", "guard", 19, 12, ["sera"],
      ["Il consiglio comunale è convocato. In piazza, perché in sala c'è l'eco.", "Stasera è Talk show: DESTRA e SINISTRA in onda, e nessuno che li moderi."]),
    person("borgo-nottambulo", "Nottambulo", "kid", 8, 14, ["notte"],
      ["Di notte il paese cambia: i populisti escono con le offerte.", "Se senti 'ultimi pezzi, chiama ora', non chiamare. Combatti."])
  ],
  mediopoli: [
    person("mediopoli-portiere", "Portiere", "guard", 12, 9, ["mattina"],
      ["Il Telegiornale è alle tredici. Alle sette ho già letto tutti i comunicati.", "Non è un lavoro. È una veglia con badge."]),
    person("mediopoli-comparsa", "Comparsa", "aide", 18, 10, ["giorno"],
      ["Faccio la folla. Oggi sono 'cittadino indignato', ieri 'elettore soddisfatto'.", "Pagano uguale: poco."]),
    person("mediopoli-scenografo", "Scenografo", "journalist", 11, 14, ["sera"],
      ["Prima serata: due poltrone, nessun moderatore, un solo vero ospite: l'audience.", "Tieni, ne avanzano. Le scalette si buttano, le schede no."],
      { itemId: "scheda", qty: 2, flag: "slot-gift-mediopoli-scenografo", lines: ["Aspetta, ho un omaggio dello studio."] }),
    person("mediopoli-televenditore", "Televenditore", "influencer", 19, 17, ["notte"],
      ["SOLO STASERA: tre promesse al prezzo di una! Chiamate ora, il programma non scade mai!", "Ecco, la prima è gratis. Le altre le paghi in sondaggi."],
      { itemId: "spritz", qty: 1, flag: "slot-gift-mediopoli-televenditore", lines: ["Ti vedo scettico. Ottimo, il cliente scettico è il più fedele."] })
  ],
  eurotown: [
    person("eurotown-funzionario", "Eurofunzionario", "aide", 12, 2, ["mattina"],
      ["Alle nove si apre la Rassegna stampa e si chiude il modulo A-38.", "Il modulo A-38 serve a chiedere il modulo A-39."]),
    person("eurotown-interprete", "Interprete", "journalist", 17, 11, ["sera"],
      ["Traduco le dichiarazioni di sera, quando tutti dicono il contrario di ciò che intendono.", "Per te: una scorta, dal rimborso spese."],
      { itemId: "caffe", qty: 3, flag: "slot-gift-eurotown-interprete", lines: ["Un attimo, devo trovare la parola giusta. Ah, 'caffè'."] }),
    person("eurotown-stagista", "Stagista", "kid", 11, 12, ["notte"],
      ["Sono qui da stamattina. Mi hanno detto 'sei un'opportunità'.", "Alla fine l'opportunità sono io: gratuita, e a notte fonda."])
  ],
  offshore: [
    person("offshore-bagnino", "Bagnino", "guard", 12, 7, ["mattina"],
      ["Alle sei apro il lido e chiudo un occhio. Anzi due: sono in regime di residenza fiscale.", "La Rassegna stampa qui arriva dal largo: sempre in ritardo e già smentita."]),
    person("offshore-cocco", "Venditore di cocco", "barista", 21, 10, ["giorno"],
      ["Cocco fresco! Il prezzo è quello di ieri, ma in un'altra valuta.", "Prendi, questo è omaggio: non l'ho dichiarato."],
      { itemId: "spritz", qty: 2, flag: "slot-gift-offshore-cocco", lines: ["Cocco o spritz? Per i clienti fedeli, spritz."] }),
    person("offshore-dj", "DJ", "influencer", 14, 12, ["sera"],
      ["L'aperitivo è il Talk show di chi non vuole parlare.", "Si balla, si firma, si dimentica."]),
    person("offshore-tesoriere", "Tesoriere insonne", "aide", 16, 10, ["notte"],
      ["Di notte i conti tornano da soli: basta non guardarli.", "Hai un'aria onesta. Tieni questo, e dimentica dove l'hai avuto."],
      { itemId: "schedona", qty: 1, flag: "slot-gift-offshore-tesoriere", lines: ["Non siamo mai stati qui. Né io, né il tesoro."] })
  ],
  bruxelles: [
    person("bruxelles-funzionario", "Funzionario CE", "aide", 11, 7, ["mattina"],
      ["Il caffè è alle nove, la riunione sul caffè è alle nove e un quarto.", "Alle dieci il comitato valuta se valga la pena di valutare."]),
    person("bruxelles-lobbista", "Lobbista", "guard", 17, 7, ["giorno"],
      ["Non faccio lobbying, faccio 'dialogo con gli stakeholder'.", "Il pranzo di lavoro è la sede più alta del diritto europeo."]),
    person("bruxelles-portavoce", "Portavoce", "journalist", 18, 9, ["sera"],
      ["Prima serata: faccio un comunicato per smentire il comunicato.", "Tieni un rinfresco: viene dal buffet dell'ultima smentita."],
      { itemId: "spritz", qty: 2, flag: "slot-gift-bruxelles-portavoce", lines: ["Un attimo, devo smentire. Ecco, fatto."] }),
    person("bruxelles-spazzino", "Spazzino notturno", "granny", 10, 6, ["notte"],
      ["La notte pulisco i corridoi. Si trovano sempre bozze di regolamento.", "Le bozze di notte sono più oneste: nessuno le guarda."])
  ],
  capitale: [
    person("capitale-cerimoniere", "Cerimoniere", "guard", 14, 10, ["mattina"],
      ["Il picchetto d'onore è alle otto. Alle otto e un quarto è già un ricordo.", "Il cambio della guardia somiglia al cambio di maggioranza: stessa coreografia."]),
    person("capitale-turista", "Turista", "kid", 9, 15, ["giorno"],
      ["Che bello il Foro! Ma perché ogni statua è senza un pezzo?", "Ah, hanno detto che i pezzi sono 'in manutenzione straordinaria'."]),
    person("capitale-senatore", "Senatore emerito", "granny", 18, 16, ["sera"],
      ["Ai miei tempi il Talk show era un duello. Adesso è un duetto.", "Quando urlavano in due era dibattito. Quando urlano in tre è un sondaggio."]),
    person("capitale-guardiano", "Guardiano notturno", "guard", 12, 18, ["notte"],
      ["La notte il palazzo respira: si sente il fruscio dei decreti.", "Tieni, un cimelio dell'ultimo turno. Non l'ho rubato: era in 'custodia'."],
      { itemId: "schedona", qty: 1, flag: "slot-gift-capitale-guardiano", lines: ["Chi lavora di notte merita qualcosa. Ecco."] })
  ]
};

export function applySlotNpcs(maps: Record<string, MapDef>): void {
  for (const [id, people] of Object.entries(SLOT_NPCS)) {
    const map = maps[id];
    if (!map) throw new Error(`Slot people for ${id}: no such map`);
    map.npcs = [...map.npcs, ...people];
  }
}
