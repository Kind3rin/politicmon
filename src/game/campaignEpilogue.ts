import type { GameState } from "./state";
import { ALLY_NAMES, type AllyId } from "./coalition";
import { moraleEpilogue, PROMISES } from "./morale";
import { ENDING_SOUVENIRS, type Atto3EndingDef } from "./atto3Ending";

export function campaignEpilogue(state: GameState, ending: Atto3EndingDef): { title: string; paragraphs: string[] }[] {
  const broken = (Object.keys(ALLY_NAMES) as AllyId[]).filter(id => state.flags[`coalition-broken:${id}`]);
  const members = state.coalition.members.map(m => `${ALLY_NAMES[m.allyId]}: ${m.status === "strained" ? "PATTO TESO, BONUS DIMEZZATO." : m.status === "reconciled" ? "PATTO RIPARATO, BONUS AL 75%. IL PRECEDENTE RESTA." : "PATTO ATTIVO, BONUS PIENO."}`);
  const choices = [
    ["atto3-photo-choice:stringetevi", "FOTO STRETTA: IL PROGRAMMA È RIMASTO FUORI CAMPO."],
    ["atto3-photo-choice:panoramica", "FOTO PANORAMICA: PIÙ SPAZIO, PIÙ CONDIZIONI DA RISPETTARE."],
    ["a3.future.ally", "GENERORSO AL TAVOLO: IL FUTURO AVEVA UNA QUOTA D'INGRESSO."],
    ["a3.future.distance", "DISTANZA DAL FUTURO: LA CAUTELA HA TROVATO UN FINANZIATORE."],
    ["a3.future.oppose", "OPPOSIZIONE AL FUTURO: IL COMUNICATO È ARRIVATO PRIMA DEL CALENDARIO."],
    ["a3.diplomacy.loyalty", "LEALTÀ AL VERTICE: IL PASS È ENTRATO, LE LINEE ROSSE ANCHE."],
    ["a3.diplomacy.autonomy", "AUTONOMIA: I PATTI RIPARATI RESTANO NEL REGISTRO, NON NEL CESTINO."],
    ["a3.diplomacy.home", "RITORNO A CASA: LA PIAZZA HA RISPOSTO. IL TAVOLO HA PRESO NOTA."]
  ].filter(([flag]) => state.flags[flag]).map(([, line]) => line);
  return [
    { title: ending.title, paragraphs: [ending.subtitle, ...ending.lines, `${state.election.result!.seats} SEGGI SU 5. LE SEDIE NON HANNO ANCORA IMPARATO AD APPLAUDIRE.`] },
    { title: "CHI RESTA AL TAVOLO", paragraphs: [...(members.length ? members : ["NESSUN ALLEATO AL TAVOLO. ALMENO IL VERBALE NON AVRÀ NOTE A MARGINE."]), ...broken.map(id => `${ALLY_NAMES[id]}: PATTO ROTTO. IL FOTOGRAFO PUÒ RITAGLIARE LA FOTO, NON IL REGISTRO.`)] },
    { title: "DOPO LE TELECAMERE", paragraphs: [`FIDUCIA ${state.morale.trust}/100. COESIONE ${state.morale.cohesion}/100.`, ...moraleEpilogue(state.morale), ...state.morale.promises.map(p => `${PROMISES[p.id].title}: ${{ pending: "ANCORA IN ATTESA", kept: "MANTENUTA", broken: "SCADUTA", repaired: "RIPARATA IN RITARDO" }[p.status]}.`)] },
    ...(choices.length ? [{ title: "IL REGISTRO DELLE SCELTE", paragraphs: choices }] : []),
    { title: "GOVERNO OMBRA", paragraphs: [`${Object.keys(state.ministri).length} MINISTERI ASSEGNATI. I LORO EFFETTI CONTINUANO NEL POSTGAME.`, "IL PORTAVOCE CHIEDE IL FILTRO PER LE FOTO. IL TESORIERE CHIEDE QUELLO PER LE SPESE. POTETE CONTINUARE QUEST, COPPA, DEX E ONLINE."] },
    { title: "IL TUO RICORDO", paragraphs: [state.flags.atto3Complete ? "PREMIO GIÀ RITIRATO: QUESTA È UNA RILETTURA." : "PREMIO DA RITIRARE: 2500€ E 2 SCHEDE BLINDATE.", `${ENDING_SOUVENIRS[ending.id].name}: VISIBILE NELLA TESSERA DAL MENU PAUSA. È UN RICORDO COSMETICO.`, "IDEA, CODICE E SATIRA: LUCA TIENGO + CODEX. NUOVE ILLUSTRAZIONI: HIGGSFIELD. GRAZIE PER AVER VOTATO. ORA RESTANO LE SEDIE."] }
  ];
}
