import { CIVIC_EVENTS, CIVIC_NPCS } from "../data/civicEvents";
import { changeMorale, keepPromise, pledgePromise } from "./morale";
import type { GameState } from "./state";

export function resolveCivicChoice(state: GameState, eventId: string, choiceIndex: number): { ok: boolean; lines: string[] } {
  if (!Object.hasOwn(CIVIC_EVENTS, eventId)) return { ok: false, lines: ["Dossier non disponibile."] };
  const event = CIVIC_EVENTS[eventId];
  if (state.morale.decisions.includes(eventId)) return { ok: false, lines: ["Questa scelta è già nel verbale."] };
  const choice = event.choices[choiceIndex];
  if (!choice) return { ok: false, lines: ["Scelta non disponibile."] };
  if (state.money < choice.cost) return { ok: false, lines: [`Servono ${choice.cost}€. Puoi tornare.`, "Uscire non registra una decisione."] };
  if (choice.promise && state.morale.promises.some((promise) => promise.id === choice.promise)) return { ok: false, lines: ["Questa promessa è già nel verbale."] };
  const before = { trust: state.morale.trust, cohesion: state.morale.cohesion };
  if (choice.promise) pledgePromise(state, choice.promise);
  if (choice.promise && choice.fulfill) keepPromise(state, choice.promise);
  else state.money -= choice.cost;
  state.sondaggi = Math.max(0, Math.min(100, state.sondaggi + choice.polls));
  if (choice.trust || choice.cohesion) changeMorale(state, event.title, choice.trust, choice.cohesion);
  state.morale = { ...state.morale, decisions: [...state.morale.decisions, eventId, `${eventId}:${choice.id}`] };
  return { ok: true, lines: [...choice.lines, `Fiducia ${state.morale.trust - before.trust >= 0 ? "+" : ""}${state.morale.trust - before.trust}; coesione ${state.morale.cohesion - before.cohesion >= 0 ? "+" : ""}${state.morale.cohesion - before.cohesion}.`] };
}

export function civicNpcReply(state: GameState, npcId: string): string[] | undefined {
  const event = CIVIC_NPCS[npcId];
  if (event && state.morale.decisions.includes(event)) {
    const promise = state.morale.promises.find((entry) => entry.id === event);
    if (promise?.status === "pending") return ["La tua data è ancora sul foglio.", `Restano ${Math.max(0, promise.dueAt - state.morale.progress)} nuovi dibattiti. Puoi finanziare dal menu MORALE.`];
    if (promise?.status === "kept") return ["Il servizio funziona. Hai notato?", "Da tre giorni non serve un comunicato."];
    if (promise?.status === "repaired") return ["È arrivato. In ritardo, ma è arrivato.", "La vecchia data la teniamo: ci aiuta a ricordare."];
    if (promise?.status === "broken") return ["La data è passata. Noi siamo ancora qui.", "Dal menu MORALE puoi rimediare: il ritardo costa di più."];
    const decision = state.morale.decisions.find((id) => id.startsWith(`${event}:`));
    const replies: Record<string, string[]> = {
      "cantiere:build": ["La passerella porta all'isola. Nel PDF portava al 2030.", "Ho smesso di guardare i lavori. Ora guardo chi ci passa."],
      "cantiere:report": ["Il verbale è pubblico. Per passare serve ancora il traghetto.", "Almeno il ritardo non ha più il nome del predecessore."],
      "cantiere:ribbon": ["Quattro inaugurazioni, zero attraversamenti.", "Il nastro lo abbiamo recuperato. Per la quinta ci fanno lo sconto."],
      "cava:open": ["Il varco regge. Nel PDF reggeva anche il muro.", "Ho smesso di fare il giro largo. Il camion no."],
      "cava:estimate": ["La stima è pubblica. Il varco ancora no.", "Adesso so quanto costa il giro largo."],
      "cava:gravel": ["Il sacchetto è finito. Il nastro lo teniamo per la prossima.", "Il muro è dov'era: almeno è coerente."],
      "pompa:bus": ["La corsa delle sei ha dodici passeggeri. Dodici pieni in meno.", "Il grafico parla di mobilità. Qui la chiamiamo arrivare in orario."],
      "pompa:sign": ["Il cartello funziona: il prezzo si legge benissimo.", "A oscurarsi, per ora, è soltanto il conto del pendolare."],
      "pompa:speech": ["Il taglio gira ancora sui telefoni. La pompa non ha il telefono.", "Un cliente ha mostrato il video alla cassa. Ho chiesto il bancomat."],
      "bus:crop": ["La fermata è sparita dalla foto. Io continuo ad aspettare qui.", "Il fotografo almeno lo hai accompagnato in macchina."],
      "sportello:chart": ["Nel grafico siamo tutti serviti. L'ufficio però è ancora chiuso.", "Ho stampato il grafico. Non vale come documento."],
      "traghetto:ribbon": ["Il plastico è perfetto. Sul molo il passeggino lo solleviamo in due.", "Ci servirebbe una rampa in scala uno a uno."],
      "remix:hook": ["Il tuo nome lo cantano tutti. Il fonico aspetta il compenso.", "Gli hai detto che avrà molta visibilità. Lui paga un affitto."],
      "remix:credits": ["Il fonico torna anche stasera. La fattura non è più una speranza.", "Il remix gira ancora. Nei titoli ci sono più nomi."],
      "remix:answer": ["Il tecnico ha preso l'autobus delle sei. Il video ha fatto meno numeri.", "Sono due dati. Di solito ti mostrano solo il secondo."],
      "citofono:camera": ["Dopo quella diretta nessuno apre prima di guardare dallo spioncino.", "Non era questo il problema del quartiere."],
      "citofono:consent": ["L'ascensore è ancora rotto, ma la pratica ha un numero.", "La nostra porta non è diventata un titolo."],
      "citofono:rebuild": ["L'attore ti saluta. Il residente ha dormito.", "Nel video si legge ancora che è una ricostruzione."],
      "volunteers:work": ["Abbiamo montato il palco in tre. Tu conosci già i bulloni.", "Il social manager ci ha finalmente lasciato nella foto."],
      "volunteers:pay": ["Il bonifico è arrivato. Il prossimo turno ha già due nomi.", "Nessuno ha chiesto di essere pagato in gratitudine."],
      "volunteers:post": ["Il ringraziamento ha molte reazioni. Il prossimo turno è vuoto.", "Hai provato a chiedere ai like di piegare le sedie?"]
    };
    if (decision && replies[decision]) return replies[decision];
    return state.morale.trust >= 60
      ? ["Hai lasciato un numero a cui risponde qualcuno.", "È la cosa più rara di tutta la campagna."]
      : ["Ti ho visto in diretta. Io ero fuori campo.", "Quando torni, porta il verbale."];
  }
  if (npcId === "granny" && state.party.length) return ["Per catturare un candidato usa una SCHEDA ELETTORALE dopo averlo indebolito.", "Per tenerti il quartiere serve altro: una promessa ha una data, non un ritornello.", "Fiducia e coesione sono nel menu MORALE. I sondaggi contano chi ti guarda."];
  if (npcId === "professor" && state.party.length) return ["QUIRINO: il sondaggio misura chi alza la mano. La fiducia, chi ti lascia le chiavi.", "Non confondere vincere un dibattito con mantenere una promessa. Le scadenze sono nel menu MORALE."];
  if (npcId === "home-mom") return state.morale.cohesion < 30 ? ["MAMMA: hai sei nomi in squadra e nessuno che ti risponde.", "Prima di chiedere un altro favore, finisci un turno con loro."] : ["MAMMA: prima chiedevano se eri in televisione. Ora chiedono se torni lunedì.", "Il secondo è un complimento. Però lunedì devi tornarci."];
  return undefined;
}
