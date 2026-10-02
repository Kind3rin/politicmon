import type { AiProfile } from "./sim";

export type AiStyle = "balanced" | "pressure" | "rush" | "control" | "fortress" | "setup";
export interface TrainerStyle { style: AiStyle; label: string; hints: readonly string[]; art?: string; }
const STYLES: Record<string, TrainerStyle> = {
  stagista: { style: "balanced", label: "PROVA MICROFONO", art: "stagista", hints: ["Prova facoltativa: A inizia, B torna in studio. Avversari diversi richiedono risposte diverse.", "Dopo il KO di un avversario il rimpasto è gratuito. Il bar recupera PV e PP prima della diretta."] },
  funzionario: { style: "balanced", label: "CONTROLLO PRELIMINARE", art: "funzionario", hints: ["Facoltativo: A inizia, B annulla. Prepara mosse, non firme.", "Il bar recupera PV e PP prima di Lady Direttiva."] },
  diplomatico: { style: "balanced", label: "POSTI AL TAVOLO", art: "diplomatico", hints: ["Prova facoltativa. A sfida, B torna. Leggi il tipo di apertura.", "Puoi uscire e recuperare i PP al bar prima di Tycoon."] },
  oligarca: { style: "balanced", label: "CHI PAGA IL CONTO", art: "oligarca", hints: ["Prova facoltativa. A sfida, B torna. Controlla le resistenze.", "Tycoon ha tre avversari: conserva mosse e cure."] },
  giudice1: { style: "balanced", label: "LA REGOLA COMUNE", art: "giudice1", hints: ["Prova facoltativa. A sfida, B torna. Due avversari, due tipi.", "Puoi scendere al bar di Capitale e recuperare i PP."] },
  giudice2: { style: "balanced", label: "DI CHI È LA CHIAVE", art: "giudice2", hints: ["Prova facoltativa. START sceglie il leader prima della lotta.", "Controlla tipi e abilità: una sola risposta non copre tutto."] },
  giudice3: { style: "balanced", label: "LA SEDIA DI CHI PERDE", art: "giudice3", hints: ["Prova facoltativa. Leggi le resistenze e conserva mosse efficaci.", "Il Garante ha quattro avversari. Il bar resta raggiungibile."] },
  ilcapitano: { style: "balanced", label: "COLLAUDO SENZA FILTRO", art: "ilcapitano", hints: ["Tre avversari. CAPITANONE tiene la CAFFETTIERA: recupera PV a fine turno.", "B annulla. Prima della vittoria torni al bar di Capitale dalla darsena. Premio: TESSERA DORATA.", "L'ambulante di Capitale vende oggetti da equipaggiare dalla BORSA. Un solo slot per candidato."] },
  djpapeete: { style: "balanced", label: "VOLUME DEL MANDATO", art: "djpapeete", hints: ["Prova facoltativa. Due avversari POPULISMO. A sfida, B torna.", "Dopo il Capitano il bar dello Stretto recupera PV e PP."] },
  citofonista: { style: "balanced", label: "RISPOSTA PREREGISTRATA", art: "citofonista", hints: ["Prova facoltativa. Controlla mosse e immunità nel dossier.", "START sceglie il leader; il bar dello Stretto resta aperto."] },
  noponte: { style: "balanced", label: "PRIMA DEL NASTRO", art: "noponte", hints: ["Prova facoltativa. Due avversari di tipi diversi.", "Puoi curarti al bar e riprendere le mosse dall'archivio."] },
  geometra: { style: "balanced", label: "IL LIVELLO DEL MARE", art: "geometra", hints: ["Prova facoltativa, anche dopo il Capitano. Misura il danno, non solo la potenza.", "B torna al cantiere. Nessun PP speso leggendo il dossier."] },
  emittenza: { style: "pressure", label: "PRIMA SERATA", art: "emittenza", hints: ["Punta su attacchi e status. Una difesa solida vale più del volume della voce.", "Gli status non passano attraverso TEFLON o GARANZIA."] },
  ladydirettiva: { style: "control", label: "PROTOCOLLO", art: "ladydirettiva", hints: ["Cerca di ridurre le statistiche. POLTRONA SALDA protegge dai cali.", "Alterna attacchi e controllo: preparati a cambiare il leader."] },
  tycoon: { style: "rush", label: "ACQUISIZIONE OSTILE", art: "tycoon", hints: ["Privilegia il danno immediato. Anche una mossa debole può chiudere un KO.", "Un attacco prioritario può ribaltare l'ordine. Controlla il dossier."] },
  boss: { style: "control", label: "MAGGIORANZA VARIABILE", art: "boss", hints: ["Cerca vantaggi di tipo e abbassa le difese. Un solo attaccante non copre tutto.", "Il rimpasto dopo un KO avversario è gratuito: sfruttalo."] },
  garante: { style: "fortress", label: "TEMPI ISTITUZIONALI", art: "garante", hints: ["Valuta cure e difesa. Conserva PP per la parte finale della squadra.", "L'ultimo avversario ha GARANZIA: status e cali non funzionano."] },
  "futuro-anteriore": { style: "setup", label: "RIFONDAZIONE", art: "futuro-anteriore", hints: ["Si potenzia quando ha tempo. Non regalargli turni di preparazione.", "Sotto metà PV cancella i suoi malus e guadagna velocità, una sola volta."] },
  "partner-perfetto": { style: "pressure", label: "CORDIALITÀ COMPETITIVA", art: "partner-perfetto", hints: ["Usa danni e status per tenerti sulla difensiva. Prepara una cura degli status.", "Il meteo dei sondaggi aiuta entrambi: guarda quali tipi potenzia."] },
  commissione: { style: "fortress", label: "ISTRUTTORIA", art: "commissione", hints: ["Una squadra lunga con resistenze diverse. Conserva cure e mosse efficaci.", "La sua difesa non cresce da sola: ogni potenziamento costa un turno."] },
  "algoritmo-sovrano": { style: "balanced", label: "CAMPIONE ADATTIVO", art: "algoritmo-sovrano", hints: ["Valuta il campo attuale. Cambiare tipo può rendere meno utile il suo piano.", "La dottrina della tua campagna modifica questa finale: leggi gli annunci."] }
};
export function trainerStyle(id: string): TrainerStyle {
  return STYLES[id] ?? { style: "balanced", label: "LINEA PRAGMATICA", hints: [] };
}
export const BOSS_ART_IDS = Object.values(STYLES).flatMap((s) => s.art ? [s.art] : []);
export function trainerAi(id: string, badge: boolean, hard: boolean, badges: number): AiProfile {
  // The first lesson teaches moves and types, before introducing enemy healing.
  if (id === "rival1") return { whiff: hard ? .15 : .33, canHeal: false, finisher: hard, style: "balanced" };
  if (id === "stagista") return { whiff: hard ? .22 : .4, canHeal: false, finisher: hard, style: "balanced" };
  const boss = (!badge && Boolean(STYLES[id]) && !["funzionario", "diplomatico", "oligarca", "giudice1", "giudice2", "giudice3", "djpapeete", "citofonista", "noponte", "geometra"].includes(id)) || ["ilcapitano", "tesoriere", "campo-photographer"].includes(id) || id.startsWith("rival");
  const profile: AiProfile = boss ? { whiff: hard ? .1 : .2, canHeal: true, finisher: true }
    : badge ? { whiff: hard ? .15 : .28, canHeal: true, finisher: true }
    : hard && id ? { whiff: Math.max(.22, .4 - badges * .05), canHeal: true, finisher: true }
    : { whiff: Math.max(.33, .48 - badges * .05), canHeal: false, finisher: false };
  return { ...profile, style: trainerStyle(id).style };
}
