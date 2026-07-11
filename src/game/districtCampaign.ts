import { ALLY_CATALOG, applyLineRedEvent, coalitionBonuses, type AllyId, type CoalitionState } from "./coalition";
import { DISTRICT_CATALOG, endorsementDelta, resolveAction, type DistrictId, type ElectionState } from "./election";

export interface DistrictContent {
  readonly name: string;
  readonly problem: string;
  readonly trainerId: string;
  readonly prudent: string;
  readonly risky: string;
  readonly riskyLineEvent: number | null;
  readonly secret: string;
}

export const DISTRICT_CONTENT: Readonly<Record<DistrictId, DistrictContent>> = Object.freeze({
  nord: { name: "NORD PRODUTTIVO", problem: "TAVOLI PERMANENTI", trainerId: "district-nord", prudent: "TAVOLO PERMANENTE", risky: "SUPERBONUS", riskyLineEvent: null, secret: "VERBALE DEL VERBALE" },
  centro: { name: "CENTRO DEI SALOTTI", problem: "OSPITI INTERCAMBIABILI", trainerId: "district-centro", prudent: "SILENZIO STAMPA", risky: "OSPITATA TOTALE", riskyLineEvent: 12, secret: "SCALETTA GIÀ COMMENTATA" },
  sud: { name: "SUD DELLE PROMESSE", problem: "CANTIERE INAUGURATO", trainerId: "district-sud", prudent: "CABINA DI REGIA", risky: "PRIMA PIETRA", riskyLineEvent: 13, secret: "NASTRO DI RISERVA" },
  isole: { name: "ISOLE DEL PONTE", problem: "PLASTICO PUNTUALE", trainerId: "district-isole", prudent: "TRAGHETTO SUBITO", risky: "IL PLASTICO", riskyLineEvent: 10, secret: "BIGLIETTO SOLA ANDATA" },
  feed: { name: "CAPITALE DEI FEED", problem: "TREND A PAGAMENTO", trainerId: "district-feed", prudent: "FACT-CHECK", risky: "TREND SPONSORIZZATO", riskyLineEvent: null, secret: "SCREENSHOT CANCELLATO" }
});

export type DistrictCommandError = "insufficient_funds" | "missing_ally" | "election_error";
export type DistrictCommandResult =
  | { readonly ok: true; readonly election: ElectionState; readonly coalition: CoalitionState; readonly money: number; readonly strained: readonly AllyId[]; readonly broken: readonly AllyId[] }
  | { readonly ok: false; readonly error: DistrictCommandError };

function modifier(coalition: CoalitionState) {
  const values = coalitionBonuses(coalition);
  return { bonusPercent: values.bonus.territoryGain, malusPercent: values.malus.territoryGain };
}

export function resolveDistrictPromise(election: ElectionState, coalition: CoalitionState, money: number, districtId: DistrictId, risky: boolean): DistrictCommandResult {
  const rule = DISTRICT_CATALOG[districtId];
  if (risky && money < rule.riskyCost) return { ok: false, error: "insufficient_funds" };
  const content = DISTRICT_CONTENT[districtId];
  const line = risky && content.riskyLineEvent !== null
    ? applyLineRedEvent(coalition, content.riskyLineEvent)
    : { state: coalition, strained: [] as AllyId[], broken: [] as AllyId[] };
  const action = resolveAction(election, {
    districtId, action: "promise", variant: risky ? "risky" : "prudent",
    baseDelta: risky ? rule.riskyDelta : rule.prudentDelta, modifier: modifier(line.state)
  });
  if (!action.ok) return { ok: false, error: "election_error" };
  return { ok: true, election: action.state, coalition: line.state, money: money - (risky ? rule.riskyCost : 0), strained: line.strained, broken: line.broken };
}

export function resolveDistrictEndorsement(election: ElectionState, coalition: CoalitionState, districtId: DistrictId, allyId: AllyId): DistrictCommandResult {
  const member = coalition.members.find((candidate) => candidate.allyId === allyId);
  if (!member) return { ok: false, error: "missing_ally" };
  const delta = endorsementDelta(districtId, ALLY_CATALOG[allyId].tag);
  const action = resolveAction(election, {
    districtId, action: "endorsement", variant: ALLY_CATALOG[allyId].tag,
    baseDelta: delta, modifier: modifier(coalition), allyId
  });
  if (!action.ok) return { ok: false, error: "election_error" };
  return { ok: true, election: action.state, coalition, money: 0, strained: [], broken: [] };
}

export function districtActionCount(election: ElectionState, districtId: DistrictId): number {
  return election.districts.find((district) => district.id === districtId)?.outcomes.length ?? 0;
}
