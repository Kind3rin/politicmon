import type { AiProfile } from "./sim";

export type AiStyle = "balanced" | "pressure" | "rush" | "control" | "fortress" | "setup";
export interface TrainerStyle { style: AiStyle; label: string; hints: readonly string[]; art?: string; }
const STYLES: Record<string, TrainerStyle> = {
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
  const boss = (!badge && Boolean(STYLES[id])) || ["ilcapitano", "tesoriere", "campo-photographer"].includes(id) || id.startsWith("rival");
  const profile: AiProfile = boss ? { whiff: hard ? .1 : .2, canHeal: true, finisher: true }
    : badge ? { whiff: hard ? .15 : .28, canHeal: true, finisher: true }
    : hard && id ? { whiff: Math.max(.22, .4 - badges * .05), canHeal: true, finisher: true }
    : { whiff: Math.max(.33, .48 - badges * .05), canHeal: false, finisher: false };
  return { ...profile, style: trainerStyle(id).style };
}
