import type { AiProfile } from "./sim";

export type AiStyle = "balanced" | "pressure" | "rush" | "control" | "fortress" | "setup";
export interface TrainerStyle { style: AiStyle; label: string; hints: readonly string[]; art?: string; }
const STYLES: Record<string, Omit<TrainerStyle, "art">> = {
  "campo-debate": { style: "balanced", label: "DUE TASTI, UNA VOCE", hints: ["Prova di capitolo. Anche una sconfitta registra il dibattito e apre il Fotografo.", "A sfida, B torna. L’ambulatorio recupera PV e PP; il risultato cambia il consenso del Centro."] },
  "campo-claque": { style: "balanced", label: "APPLAUSI A CIRCUITO CHIUSO", hints: ["Prova facoltativa. Tre avversari; non serve vincere per fare la foto.", "Premio: 3 CAFFÈ. Il medico resta aperto; START sceglie il leader."] },
  "campo-photographer": { style: "balanced", label: "IL PROGRAMMA FUORI CAMPO", hints: ["Tre avversari LV 50-52. Il Fotografo può curarsi: conserva PP e risposte di tipi diversi.", "B torna al set. Vincere apre Futuro Anteriore; i patti tesi restano tesi."] },
  "eu-relatore": { style: "balanced", label: "LA RISPOSTA ALLEGATA", hints: ["Prova facoltativa. Due avversari, LV 44-45; B torna al viale.", "Il CAFFÈ SCHUMAN recupera PV e PP. Una mail non cura."] },
  "eu-eurodeputato": { style: "balanced", label: "PRESENZA IN CARTONE", hints: ["Prova facoltativa. Due avversari, LV 45-46; scegli il leader.", "Leggi abilità e mosse. Il rimpasto dopo un KO avversario è gratuito."] },
  "eu-commissario": { style: "balanced", label: "IL TAVOLO DELLA BILANCIA", hints: ["Prova facoltativa. Due avversari, LV 47-48; conserva PP efficaci.", "B torna. Puoi curarti e cambiare equipaggiamento prima di riprovare."] },
  "eu-lobby": { style: "balanced", label: "LA MANIGLIA IN PRESTITO", hints: ["Prova facoltativa. Tre avversari, LV 48-50; una sola risposta non copre tutto.", "START sceglie il leader. Il bar e l’ambulante restano raggiungibili."] },
  commercialista: { style: "balanced", label: "LA SEDE NELLA CONCHIGLIA", hints: ["Prova facoltativa. Due avversari; B torna al lido.", "Il LIDO CAYMAN a nord recupera PV e PP. La firma non cura."] },
  prestanome: { style: "balanced", label: "LE CHIAVI SENZA LA CASA", hints: ["Prova facoltativa. Tre avversari di tipi diversi; scegli il leader.", "Il rimpasto dopo un KO avversario è gratuito. Nessun obbligo di sfida per salpare."] },
  tesoriere: { style: "balanced", label: "LA RICEVUTA NEL CAVEAU", hints: ["Tre avversari, ultima forma leggendaria. Leggi mosse e abilità.", "B annulla. Il bar resta raggiungibile; puoi reclutare sull'isola. Premio: TESSERA DORATA."] },
  stagista: { style: "balanced", label: "PROVA MICROFONO", hints: ["Prova facoltativa: A inizia, B torna in studio. Avversari diversi richiedono risposte diverse.", "Dopo il KO di un avversario il rimpasto è gratuito. Il bar recupera PV e PP prima della diretta."] },
  funzionario: { style: "balanced", label: "CONTROLLO PRELIMINARE", hints: ["Facoltativo: A inizia, B annulla. Prepara mosse, non firme.", "Il bar recupera PV e PP prima di Lady Direttiva."] },
  diplomatico: { style: "balanced", label: "POSTI AL TAVOLO", hints: ["Prova facoltativa. A sfida, B torna. Leggi il tipo di apertura.", "Puoi uscire e recuperare i PP al bar prima di Tycoon."] },
  oligarca: { style: "balanced", label: "CHI PAGA IL CONTO", hints: ["Prova facoltativa. A sfida, B torna. Controlla le resistenze.", "Tycoon ha tre avversari: conserva mosse e cure."] },
  giudice1: { style: "balanced", label: "LA REGOLA COMUNE", hints: ["Prova facoltativa. A sfida, B torna. Due avversari, due tipi.", "Puoi scendere al bar di Capitale e recuperare i PP."] },
  giudice2: { style: "balanced", label: "DI CHI È LA CHIAVE", hints: ["Prova facoltativa. START sceglie il leader prima della lotta.", "Controlla tipi e abilità: una sola risposta non copre tutto."] },
  giudice3: { style: "balanced", label: "LA SEDIA DI CHI PERDE", hints: ["Prova facoltativa. Leggi le resistenze e conserva mosse efficaci.", "Il Garante ha quattro avversari. Il bar resta raggiungibile."] },
  ilcapitano: { style: "balanced", label: "COLLAUDO SENZA FILTRO", hints: ["Tre avversari. CAPITANONE tiene la CAFFETTIERA: recupera PV a fine turno.", "B annulla. Prima della vittoria torni al bar di Capitale dalla darsena. Premio: TESSERA DORATA.", "L'ambulante di Capitale vende oggetti da equipaggiare dalla BORSA. Un solo slot per candidato."] },
  djpapeete: { style: "balanced", label: "VOLUME DEL MANDATO", hints: ["Prova facoltativa. Due avversari POPULISMO. A sfida, B torna.", "Dopo il Capitano il bar dello Stretto recupera PV e PP."] },
  citofonista: { style: "balanced", label: "RISPOSTA PREREGISTRATA", hints: ["Prova facoltativa. Controlla mosse e immunità nel dossier.", "START sceglie il leader; il bar dello Stretto resta aperto."] },
  noponte: { style: "balanced", label: "PRIMA DEL NASTRO", hints: ["Prova facoltativa. Due avversari di tipi diversi.", "Puoi curarti al bar e riprendere le mosse dall'archivio."] },
  geometra: { style: "balanced", label: "IL LIVELLO DEL MARE", hints: ["Prova facoltativa, anche dopo il Capitano. Misura il danno, non solo la potenza.", "B torna al cantiere. Nessun PP speso leggendo il dossier."] },
  emittenza: { style: "pressure", label: "PRIMA SERATA", hints: ["Punta su attacchi e status. Una difesa solida vale più del volume della voce.", "Gli status non passano attraverso TEFLON o GARANZIA."] },
  ladydirettiva: { style: "control", label: "PROTOCOLLO", hints: ["Cerca di ridurre le statistiche. POLTRONA SALDA protegge dai cali.", "Alterna attacchi e controllo: preparati a cambiare il leader."] },
  tycoon: { style: "rush", label: "ACQUISIZIONE OSTILE", hints: ["Privilegia il danno immediato. Anche una mossa debole può chiudere un KO.", "Un attacco prioritario può ribaltare l'ordine. Controlla il dossier."] },
  boss: { style: "control", label: "MAGGIORANZA VARIABILE", hints: ["Cerca vantaggi di tipo e abbassa le difese. Un solo attaccante non copre tutto.", "Il rimpasto dopo un KO avversario è gratuito: sfruttalo."] },
  garante: { style: "fortress", label: "TEMPI ISTITUZIONALI", hints: ["Valuta cure e difesa. Conserva PP per la parte finale della squadra.", "L'ultimo avversario ha GARANZIA: status e cali non funzionano."] },
  "futuro-anteriore": { style: "setup", label: "RIFONDAZIONE", hints: ["Si potenzia quando ha tempo. Non regalargli turni di preparazione.", "Sotto metà PV cancella i suoi malus e guadagna velocità, una sola volta."] },
  "partner-perfetto": { style: "pressure", label: "CORDIALITÀ COMPETITIVA", hints: ["Usa danni e status per tenerti sulla difensiva. Prepara una cura degli status.", "Il meteo dei sondaggi aiuta entrambi: guarda quali tipi potenzia."] },
  commissione: { style: "fortress", label: "CHI CAMBIA LA LAMPADINA", hints: ["Una squadra lunga con resistenze diverse. Conserva cure e mosse efficaci.", "La sua difesa non cresce da sola: ogni potenziamento costa un turno."] },
  "algoritmo-sovrano": { style: "balanced", label: "CAMPIONE ADATTIVO", hints: ["Valuta il campo attuale. Cambiare tipo può rendere meno utile il suo piano.", "La dottrina della tua campagna modifica questa finale: leggi gli annunci."] }
};
export function trainerStyle(id: string): TrainerStyle {
  return STYLES[id] ? { ...STYLES[id], art: id } : { style: "balanced", label: "LINEA PRAGMATICA", hints: [] };
}
export const BOSS_ART_IDS = Object.keys(STYLES);
export function trainerAi(id: string, badge: boolean, hard: boolean, badges: number): AiProfile {
  // The first lesson teaches moves and types, before introducing enemy healing.
  if (id === "rival1") return { whiff: hard ? .15 : .33, canHeal: false, finisher: hard, style: "balanced" };
  if (id === "stagista") return { whiff: hard ? .22 : .4, canHeal: false, finisher: hard, style: "balanced" };
  // Art alone must not grant boss healing/accuracy to an optional trial.
  const boss = (!badge && ["emittenza", "ladydirettiva", "tycoon", "boss", "garante", "futuro-anteriore", "partner-perfetto", "commissione", "algoritmo-sovrano"].includes(id)) || ["ilcapitano", "tesoriere", "campo-photographer"].includes(id) || id.startsWith("rival");
  const profile: AiProfile = boss ? { whiff: hard ? .1 : .2, canHeal: true, finisher: true }
    : badge ? { whiff: hard ? .15 : .28, canHeal: true, finisher: true }
    : hard && id ? { whiff: Math.max(.22, .4 - badges * .05), canHeal: true, finisher: true }
    : { whiff: Math.max(.33, .48 - badges * .05), canHeal: false, finisher: false };
  return { ...profile, style: trainerStyle(id).style };
}
