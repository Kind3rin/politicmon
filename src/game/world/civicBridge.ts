import type { NpcDef } from "../../data/maps/types";
import type { GameState } from "../state";

/** What a civic decision does to the world. Tiles and people are applied on the one map they belong to:
 * MAPS stays immutable, so importing another save never inherits them. A tile edit alters both collision
 * and rendering through WorldScene.tileAt; people are added when the map loads (and live, when you decide). */
export interface CivicTileEdit { x: readonly [number, number]; y: readonly [number, number]; from: string; to: string }
export interface CivicScene {
  /** `<event>:<choice>`. For the choices that fund a promise, a later repayment from the MORALE menu counts too. */
  decision: string;
  map: string;
  /** The banner shown while the change plays out. */
  title: string;
  tiles?: readonly CivicTileEdit[];
  npcs?: readonly NpcDef[];
}

const person = (id: string, pal: string, x: number, y: number, facing: NpcDef["facing"], nameplate: string, lines: string[]): NpcDef => ({ id: `civic-${id}`, pal, x, y, facing, nameplate, lines, wander: false });

export const CIVIC_SCENES: readonly CivicScene[] = [
  // Route 1 — the little lake.
  { decision: "cantiere:build", map: "route1", title: "PASSERELLA INAUGURATA", tiles: [{ x: [4, 7], y: [7, 7], from: "w", to: "q" }],
    npcs: [person("collaudo", "granny", 3, 6, "down", "COLLAUDATRICE", ["Ho collaudato la passerella: quattro assi, nessun nastro.", "Per l'isola ora basta una scarpa. Per il traghetto, tre medaglie."])] },
  { decision: "cantiere:ribbon", map: "route1", title: "IL NASTRO CHE NON REGGE", tiles: [{ x: [4, 7], y: [7, 7], from: "w", to: "f" }],
    npcs: [person("nastro", "boss", 8, 6, "left", "INAUGURATORE", ["Quarta inaugurazione: il nastro è teso sul lago.", "Non si cammina sul nastro. Si applaude, da riva."])] },
  { decision: "cantiere:report", map: "route1", title: "VERBALE AFFISSO",
    npcs: [person("verbale", "journalist", 8, 6, "left", "CRONISTA", ["Il verbale è affisso: ritardo, costo, responsabili.", "Nessuna passerella. Almeno adesso si sa chi non l'ha fatta."])] },

  // Route 3 — the quarry wall.
  { decision: "cava:open", map: "route3", title: "VARCO APERTO", tiles: [{ x: [13, 16], y: [10, 11], from: "R", to: "=" }],
    npcs: [person("varco", "guard", 16, 12, "up", "OPERAIO", ["Il varco è largo quattro metri. Nel progetto erano tre.", "Il camion passa. Il progetto, a occhio, lo seguirà."])] },
  { decision: "cava:gravel", map: "route3", title: "INAUGURAZIONE DELLA GHIAIA", tiles: [{ x: [13, 13], y: [12, 12], from: "z", to: "f" }, { x: [15, 15], y: [12, 12], from: "z", to: "f" }],
    npcs: [person("sacchetto", "boss", 14, 12, "up", "PRESENTATORE", ["Ecco il sacchetto di ghiaia! Applauso, prego.", "Il nastro è più lungo del sacchetto. Succede con le opere grandi."])] },
  { decision: "cava:estimate", map: "route3", title: "STIMA PUBBLICATA",
    npcs: [person("stima", "professor", 16, 12, "up", "TOPOGRAFO", ["La stima è su un cavalletto: un varco costa un anno di sabbia.", "Chi vuole il giro largo lo trova scritto. Chi lo vuole breve, anche."])] },

  // Route 3 — the pump.
  { decision: "pompa:bus", map: "route3", title: "FERMATA ATTIVA", tiles: [{ x: [3, 3], y: [19, 19], from: "z", to: "U" }],
    npcs: [person("pendolare", "kid", 3, 18, "down", "PENDOLARE", ["La corsa delle sei c'è. Io ci sono quasi.", "Il pieno costa meno di prima: non per il prezzo, per la distanza."])] },
  { decision: "pompa:sign", map: "route3", title: "CARTELLO INAUGURATO", tiles: [{ x: [3, 3], y: [19, 19], from: "z", to: "s" }],
    npcs: [person("cartello", "aide", 3, 18, "down", "TECNICO", ["Il cartello è alto tre metri: il prezzo si legge dal casello.", "Pagarlo, invece, ancora da vicino."])] },
  { decision: "pompa:speech", map: "route3", title: "IL TAGLIO IN VIDEO",
    npcs: [person("video", "influencer", 3, 18, "right", "VIDEOMAKER", ["Il taglio ha due milioni di visualizzazioni.", "La pompa ha zero clienti in più. È un buon rapporto, per un video."])] },

  // Borgo — the bus stop.
  { decision: "bus:pay", map: "borgo", title: "IL BUS PASSA DAVVERO", tiles: [{ x: [11, 11], y: [7, 7], from: ".", to: "U" }],
    npcs: [person("passeggera", "granny", 11, 6, "down", "PASSEGGERA", ["Aspetto il bus delle nove. Esiste, ho controllato.", "La panchina l'hanno messa per noi, non per la foto."])] },
  { decision: "bus:crop", map: "borgo", title: "FERMATA FUORI CAMPO",
    npcs: [person("fotografo", "journalist", 11, 7, "left", "FOTOGRAFO", ["Ho tolto la fermata dall'inquadratura. Vedi com'è pulita?", "Se ti sposti a sinistra, c'è la fila. Non chiedermi di spostarmi."])] },

  // Mediopoli — the studio on the hill.
  { decision: "remix:hook", map: "mediopoli", title: "MONUMENTO AL RITORNELLO", tiles: [{ x: [9, 9], y: [5, 5], from: ".", to: "Y" }],
    npcs: [person("ritornello", "kid", 8, 5, "right", "FAN", ["Il tuo nome lo canto in doccia, in coda e al lavoro.", "Il programma non lo so. La statua è bellissima."])] },
  { decision: "remix:credits", map: "mediopoli", title: "TITOLI DI CODA", tiles: [{ x: [9, 9], y: [5, 5], from: ".", to: "U" }],
    npcs: [person("fonico", "aide", 8, 5, "right", "FONICO", ["Oggi nei titoli ci sono anche io. In maiuscolo.", "La fattura è arrivata prima della replica. Un record."])] },
  { decision: "remix:answer", map: "mediopoli", title: "IL TECNICO IN AUTOBUS",
    npcs: [person("autobus", "guard", 8, 5, "right", "TECNICO", ["Ho preso l'autobus delle sei, come dicevi in diretta.", "Il pubblico è calato. Io sono arrivato."])] },

  // Eurotown — the counter.
  { decision: "sportello:pay", map: "eurotown", title: "SPORTELLO APERTO", tiles: [{ x: [19, 19], y: [11, 11], from: ".", to: "U" }],
    npcs: [person("utente", "granny", 20, 11, "right", "UTENTE", ["Sportello aperto, numero 14. Ho il 15.", "Il grafico sul balcone può aspettare: la fila, no."])] },
  { decision: "sportello:chart", map: "eurotown", title: "GRAFICO SENZA GIORNI CHIUSI",
    npcs: [person("grafico", "professor", 20, 11, "right", "ANALISTA", ["Nel grafico lo sportello è sempre aperto: 100%.", "Fuori dal grafico, bussare è una scelta di fede."])] },

  // Caput Mundi — the intercom.
  { decision: "citofono:camera", map: "capitale", title: "DIRETTA ACCESA",
    npcs: [person("operatore", "journalist", 22, 20, "up", "OPERATORE", ["Siamo in diretta davanti a una porta chiusa.", "La porta non commenta. Il titolo è pronto."])] },
  { decision: "citofono:consent", map: "capitale", title: "PORTA APERTA, CAMERA SPENTA", tiles: [{ x: [21, 21], y: [20, 20], from: ".", to: "U" }],
    npcs: [person("residente", "granny", 26, 20, "left", "RESIDENTE", ["Ascensore rotto, pratica numero 4412. Qualcuno l'ha letta.", "Questa è la prima volta che non mi riprendono dall'alto."])] },
  { decision: "citofono:rebuild", map: "capitale", title: "SCENA DICHIARATA",
    npcs: [person("attore", "influencer", 22, 20, "up", "ATTORE", ["Sono il residente. Dichiaro che sono un attore.", "La porta finta è più cortese di quella vera."])] },

  // Stretto — the ferry ramp.
  { decision: "traghetto:pay", map: "stretto", title: "RAMPA RIPARATA",
    npcs: [person("passeggino", "granny", 15, 7, "left", "MAMMA", ["La rampa scende! Il passeggino sale!", "Il plastico resta perfetto. Il traghetto, finalmente, sa fare il suo mestiere."])] },
  { decision: "traghetto:ribbon", map: "stretto", title: "INAUGURATO IL PLASTICO", tiles: [{ x: [16, 16], y: [7, 7], from: "z", to: "Y" }],
    npcs: [person("coda", "kid", 15, 7, "left", "IN CODA", ["Il plastico ha il nastro. Il molo no.", "Il passeggino lo solleviamo in due, come sempre."])] },

  // Campo largo — the folding chairs.
  { decision: "volunteers:work", map: "campo_largo", title: "PALCO MONTATO IN TRE",
    npcs: [person("palco-a", "aide", 6, 15, "right", "VOLONTARIA", ["Abbiamo montato il palco in tre. Sei dei nostri.", "Il social manager ci ha lasciato nella foto. Per ora."]), person("palco-b", "kid", 7, 16, "up", "VOLONTARIO", ["Il bullone lo avevi già.", "Il comizio è stato un successone. Soprattutto dopo."])] },
  { decision: "volunteers:pay", map: "campo_largo", title: "STRAORDINARI PAGATI",
    npcs: [person("turno", "aide", 6, 15, "right", "TURNISTA", ["Il bonifico è arrivato. Il turno è mio, e di nessun altro.", "Domani porto un amico. Con contratto."])] },
  { decision: "volunteers:post", map: "campo_largo", title: "SEDIE LASCIATE", tiles: [{ x: [5, 7], y: [16, 16], from: ".", to: "U" }],
    npcs: []}
];

/** A choice counts when it was taken, or - for the ones that pledge a date - when the pledge was later paid. */
export function civicDecisionHolds(state: GameState, decision: string): boolean {
  if (state.morale.decisions.includes(decision)) return true;
  const [event, choice] = decision.split(":");
  if (choice !== "pay") return false;
  const promise = state.morale.promises.find(entry => entry.id === event);
  return Boolean(promise && (promise.status === "kept" || promise.status === "repaired") && state.morale.decisions.includes(`${event}:pledge`));
}

export function civicScenesFor(state: GameState, mapId: string): CivicScene[] {
  return CIVIC_SCENES.filter(scene => scene.map === mapId && civicDecisionHolds(state, scene.decision));
}

/** `hold` keeps a tile as it was while its change is still playing (the reveal animation). */
export function civicBridgeTile(state: GameState, mapId: string, x: number, y: number, raw: string, hold?: (x: number, y: number) => boolean): string {
  for (const scene of CIVIC_SCENES) {
    if (scene.map !== mapId || !scene.tiles || !civicDecisionHolds(state, scene.decision)) continue;
    for (const edit of scene.tiles) {
      if (raw === edit.from && x >= edit.x[0] && x <= edit.x[1] && y >= edit.y[0] && y <= edit.y[1]) return hold?.(x, y) ? raw : edit.to;
    }
  }
  return raw;
}

export function civicSceneNpcs(state: GameState, mapId: string): NpcDef[] {
  return civicScenesFor(state, mapId).flatMap(scene => [...(scene.npcs ?? [])]);
}
