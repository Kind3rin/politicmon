import { ALLY_NAMES, reconcileAlly, type AllyId, type CoalitionState } from "./coalition";
import { resolvePhotoEvent } from "./photoEvent";
import { futureAccountLines, resolveFutureChoice } from "./futureChapter";
import { resolveDiplomacyChoice } from "./diplomacyChapter";
import { changeMorale } from "./morale";
import type { ElectionState } from "./election";
import type { GameState } from "./state";

export const CAMPAIGN_CHOICES = {
  photo: {
    title: "FOTO DI COALIZIONE", keys: ["stringetevi", "panoramica"], labels: ["STRINGETEVI", "PANORAMICA"],
    stories: ["Il fotografo trova un accordo sull'inquadratura. Il programma resta fuori campo.", "Il grandangolo include tutti. Alcuni avevano firmato per restare fuori."],
    closing: "La foto va in archivio. Gli impegni restano a carico tuo."
  },
  future: {
    title: "FUTURO ANTERIORE", keys: ["alliance", "distance", "opposition"], labels: ["ALLEANZA", "DISTANZA", "CONTRASTO"],
    stories: ["GENERORSO chiede una sedia. Gli offri il programma; preferisce un posto con rimborso.", "Ti pagano per non salire sul palco. Sei l'unico consulente il cui lavoro si vede quando manca.", "Denunci la copia del vecchio partito. Il pubblico applaude; un alleato controlla di non essere nella fotocopia."],
    closing: "La delibera cambia la coalizione. Le promesse civiche hanno ancora il tuo nome."
  },
  diplomacy: {
    title: "TEMPTATION DIPLOMACY", keys: ["loyalty", "autonomy", "home"], labels: ["FEDELTÀ", "AUTONOMIA", "CONSENSO"],
    stories: ["Il timbro copre due accordi incompatibili. Da lontano sembra una firma sola; da vicino serve una spiegazione.", "Chiedi tavoli separati. Arriva un conto unico: almeno il cameriere sa chi deve parlarsi.", "Dichiari di aver ascoltato tutti. Il fonico conferma: ha lasciato accesi solo i microfoni che applaudono."],
    closing: "La foto ha cancellato le distanze. Il verbale conserva gli strappi."
  }
} as const;
export type CampaignKind = keyof typeof CAMPAIGN_CHOICES;
interface DecisionPatch {
  coalition: CoalitionState; election: ElectionState; money: number; sondaggi: number;
  flags: Readonly<Record<string, true>>; strained: readonly AllyId[]; broken: readonly AllyId[];
}
export type DecisionPreview = { ok: false; error: string } | {
  ok: true; patch: DecisionPatch; moneyDelta: number; pollsDelta: number; localDelta: number;
  cohesionDelta: number; repairTarget: AllyId | null; lines: string[];
};
export const signed = (value: number): string => value > 0 ? `+${value}` : String(value);
export function diplomacyAccountLines(state: Readonly<GameState>): string[] {
  const status = { allied: "ATTIVO", strained: "TESO", reconciled: "RIPARATO" };
  return [
    ...futureAccountLines(state).slice(0, -2),
    ...state.coalition.members.map(m => `${ALLY_NAMES[m.allyId]}: ${status[m.status]}, STRAPPI ${m.violationCount}.`),
    "I PATTI E I SERVIZI HANNO CONTI DISTINTI. MORALE RIPARA I SERVIZI."
  ];
}
const ERRORS: Record<string, string> = {
  already_resolved: "SCELTA GIÀ REGISTRATA", insufficient_funds: "FONDI INSUFFICIENTI",
  coalition_full: "COALIZIONE PIENA", candidates_unseen: "INCONTRA I TRE CANDIDATI",
  coalition_incomplete: "SERVONO DUE ALLEATI", territory_conflict: "AZIONE TERRITORIO GIÀ USATA"
};

// Resolver senza mutazioni: stessa operazione per anteprima e conferma, anche
// se fondi o alleanze sono cambiati mentre il dossier era aperto.
export function previewCampaignDecision(state: Readonly<GameState>, kind: CampaignKind, index: number): DecisionPreview {
  if (!Number.isInteger(index) || index < 0 || index >= CAMPAIGN_CHOICES[kind].keys.length) return { ok: false, error: "SCELTA NON VALIDA" };
  const common = { coalition: state.coalition, money: state.money, sondaggi: state.sondaggi, flags: state.flags };
  const result = kind === "photo"
    ? resolvePhotoEvent({ ...common, election: state.election, choice: CAMPAIGN_CHOICES.photo.keys[index] })
    : kind === "future" ? resolveFutureChoice({ ...common, choice: CAMPAIGN_CHOICES.future.keys[index] })
    : resolveDiplomacyChoice({ ...common, choice: CAMPAIGN_CHOICES.diplomacy.keys[index] });
  if (!result.ok) return { ok: false, error: result.error === "insufficient_funds" ? `SERVONO ${kind === "diplomacy" ? 500 : 800}€` : ERRORS[result.error] };
  const patch: DecisionPatch = { election: state.election, sondaggi: state.sondaggi, ...result.patch };
  const repairTarget: AllyId | null = "repairTarget" in result.patch ? result.patch.repairTarget as AllyId | null : null;
  const moneyDelta = patch.money - state.money, pollsDelta = patch.sondaggi - state.sondaggi;
  const localDelta = "localDelta" in result.patch ? result.patch.localDelta : 0;
  const cost = patch.strained.length * 8 + patch.broken.length * 16;
  const cohesionDelta = Math.max(0, Math.min(100, state.morale.cohesion - cost + (repairTarget ? 6 : 0))) - state.morale.cohesion;
  const lines = [CAMPAIGN_CHOICES[kind].stories[index], `FONDI ${signed(moneyDelta)}€ · SONDAGGI ${signed(pollsDelta)}`];
  if (kind === "photo") lines.push(`CONSENSO CENTRO ${signed(localDelta)}`);
  lines.push(`COESIONE ${signed(cohesionDelta)} → ${state.morale.cohesion + cohesionDelta}/100`);
  for (const id of patch.strained) lines.push(`${ALLY_NAMES[id]}: PATTO TESO. BONUS DIMEZZATO.`);
  for (const id of patch.broken) lines.push(`${ALLY_NAMES[id]}: PATTO ROTTO. ESCE DALLA COALIZIONE.`);
  if (repairTarget) lines.push(`${ALLY_NAMES[repairTarget]}: RIPARATO ORA. BONUS AL 75%. UN ALTRO STRAPPO LO ESCLUDE.`);
  if (!cost && !repairTarget) lines.push("NESSUN PATTO VIOLATO.");
  if (kind === "future" && index === 0) lines.push(state.coalition.members.some(m => m.allyId === "generorso")
    ? "PATTO CON GENERORSO CONFERMATO." : "GENERORSO ENTRA NELLA COALIZIONE.");
  if (kind === "future") lines.push(...futureAccountLines(state));
  if (kind === "diplomacy" && index === 0) lines.push("PASS PER IL VERTICE OTTENUTO.");
  if (kind === "diplomacy") {
    if (index === 1 && !repairTarget) lines.push("NESSUN PATTO RIPARATO: INCASSO CON I MODIFICATORI DEGLI ALLEATI.");
    if (index === 2 && pollsDelta < 4) lines.push(`LIMITE SONDAGGI 100: AUMENTO EFFETTIVO ${signed(pollsDelta)}. I PATTI POSSONO COMUNQUE STRAPPARSI.`);
    lines.push(...diplomacyAccountLines({ ...state, coalition: patch.coalition, morale: { ...state.morale, cohesion: state.morale.cohesion + cohesionDelta } }));
  }
  if (cohesionDelta) lines.push("DA 70 COE: EXP +8%. SOTTO 30: EXP -8%. SOLO CAMPAGNA.");
  return { ok: true, patch, moneyDelta, pollsDelta, localDelta, cohesionDelta, repairTarget, lines };
}

export function commitCampaignDecision(state: GameState, kind: CampaignKind, index: number): DecisionPreview {
  const preview = previewCampaignDecision(state, kind, index);
  if (!preview.ok) return preview;
  const { patch } = preview;
  state.coalition = patch.coalition; state.election = patch.election;
  state.money = patch.money; state.sondaggi = patch.sondaggi;
  Object.assign(state.flags, patch.flags);
  for (const id of patch.broken) state.flags[`coalition-broken:${id}`] = true;
  if (preview.cohesionDelta) changeMorale(state, `${CAMPAIGN_CHOICES[kind].labels[index]}: PATTI`, 0, preview.cohesionDelta);
  return preview;
}

// Rende utilizzabili anche i buoni già pagati nei salvataggi precedenti.
export function redeemCoalitionRepair(state: GameState, id: AllyId): boolean {
  const member = state.coalition.members.find(m => m.allyId === id);
  if (!member) return false;
  const key = `${id}:v${member.violationCount}`;
  if (!state.flags[`reconcile-token:${key}`] || state.flags[`reconcile-used:${key}`]) return false;
  const coalition = reconcileAlly(state.coalition, id);
  if (!coalition) return false;
  state.coalition = coalition; state.flags[`reconcile-used:${key}`] = true;
  changeMorale(state, "PATTO RIPARATO", 0, 6);
  return true;
}
