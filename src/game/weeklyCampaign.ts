import { hashDate } from "./daily";
import { activeMemeEvents } from "../data/meme-events";
import type { MemeEffect, MemeEventDef } from "../data/meme-events/types";

export type WeeklyPhase = "idle" | "active" | "final" | "complete";
export type WeeklyStageKind = "event" | "debate" | "final";

export interface WeeklyOutcome { readonly stageId: string; readonly result: string; readonly scoreDelta: number; }
export interface WeeklyCampaignState {
  readonly weekKey: string;
  readonly seed: number;
  readonly phase: WeeklyPhase;
  readonly cursor: number;
  readonly score: number;
  readonly outcomes: readonly WeeklyOutcome[];
  readonly rewardClaimed: boolean;
}

export interface WeeklyEventDef {
  readonly id: string; readonly title: string; readonly text: string;
  readonly choices: readonly [WeeklyEventChoice, WeeklyEventChoice];
}
export interface WeeklyEventChoice {
  readonly label: string;
  readonly delta: number;
  readonly effects?: readonly MemeEffect[];
  readonly effectLabel?: string;
}
export interface WeeklyStage { readonly id: string; readonly kind: WeeklyStageKind; readonly event?: WeeklyEventDef; readonly debateIndex?: number; }

const EVENTS: readonly WeeklyEventDef[] = [
  { id: "microfono", title: "MICROFONO APERTO", text: "UNA FRASE FUORI ONDA È GIÀ IN TENDENZA.", choices: [{ label: "RETTIFICA", delta: 2 }, { label: "RILANCIA", delta: -2 }] },
  { id: "gazebo", title: "GAZEBO VUOTO", text: "SONO ARRIVATE LE SEDIE. GLI ELETTORI MENO.", choices: [{ label: "PORTA CAFFÈ", delta: 3 }, { label: "STRINGI L'INQUADRATURA", delta: 1 }] },
  { id: "sondaggio", title: "SONDAGGIO LAMPO", text: "IL CAMPIONE È PICCOLO MA MOLTO SICURO DI SÉ.", choices: [{ label: "PUBBLICA", delta: -1 }, { label: "ASPETTA", delta: 2 }] },
  { id: "manifesto", title: "MANIFESTO SBAGLIATO", text: "IL VOLTO È TUO. LO SLOGAN APPARTIENE A UN ALTRO.", choices: [{ label: "COLLABORAZIONE", delta: 2 }, { label: "COPRI COL TUO LOGO", delta: 0 }] },
  { id: "diretta", title: "DIRETTA VERTICALE", text: "IL DISCORSO È ORIZZONTALE, IL TELEFONO NO.", choices: [{ label: "ADATTA", delta: 2 }, { label: "RUOTA IL PAESE", delta: -1 }] },
  { id: "treno", title: "TRENO ELETTORALE", text: "IL TRENO È IN ORARIO. LA DELEGAZIONE È SUL BINARIO OPPOSTO.", choices: [{ label: "CORRI", delta: 1 }, { label: "INAUGURA QUI", delta: -2 }] },
  { id: "hashtag", title: "HASHTAG CONTESO", text: "LO STESSO HASHTAG SOSTIENE TRE COALIZIONI OPPOSTE.", choices: [{ label: "LASCIALO LIBERO", delta: 2 }, { label: "SPONSORIZZA", delta: 0 }] },
  { id: "volantino", title: "VOLANTINO VIRALE", text: "È STATO CONDIVISO MOLTO. LETTO MOLTO MENO.", choices: [{ label: "RIASSUMI", delta: 3 }, { label: "AGGIUNGI PAGINE", delta: -2 }] }
];

function shuffle<T>(values: readonly T[], initialSeed: number): T[] {
  const pool = [...values];
  let seed = initialSeed >>> 0;
  for (let i = pool.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function weekAnchorDate(weekKey: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return new Date();
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(Date.UTC(year, 0, 4 - jan4Day + 1 + (week - 1) * 7));
  monday.setUTCDate(monday.getUTCDate() + 3);
  return monday;
}

function effectSummary(effects: readonly MemeEffect[]): string {
  return effects.map((effect) => {
    if (effect.kind === "sondaggi") return `SOND ${effect.delta >= 0 ? "+" : ""}${effect.delta}`;
    if (effect.kind === "money") return `${effect.delta >= 0 ? "+" : ""}${effect.delta}€`;
    if (effect.kind === "item") return `${effect.id.toUpperCase()} x${effect.qty}`;
    if (effect.kind === "territory") return `${effect.id.toUpperCase()} ${effect.delta >= 0 ? "+" : ""}${effect.delta}`;
    return "EFFETTO STORIA";
  }).join("  ");
}

function memeScoreDelta(effects: readonly MemeEffect[]): number {
  const polls = effects.filter((effect) => effect.kind === "sondaggi").reduce((sum, effect) => sum + effect.delta, 0);
  if (polls !== 0) return polls;
  const money = effects.filter((effect) => effect.kind === "money").reduce((sum, effect) => sum + effect.delta, 0);
  return money > 0 ? 1 : 0;
}

export function weeklyMemeEvent(event: MemeEventDef): WeeklyEventDef {
  const convert = (choice: MemeEventDef["choices"][number]): WeeklyEventChoice => ({
    label: choice.label,
    delta: memeScoreDelta(choice.effects),
    effects: choice.effects,
    effectLabel: effectSummary(choice.effects)
  });
  return {
    id: `meme:${event.id}`,
    title: event.title,
    text: event.lines.join(" "),
    choices: [convert(event.choices[0]), convert(event.choices[1])]
  };
}

export function isoWeekKey(now = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function newWeeklyCampaignState(): WeeklyCampaignState {
  return { weekKey: "", seed: 0, phase: "idle", cursor: 0, score: 0, outcomes: [], rewardClaimed: false };
}

export function normalizeWeeklyCampaign(value: unknown): WeeklyCampaignState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return newWeeklyCampaignState();
  const raw = value as Partial<WeeklyCampaignState>;
  const phase: WeeklyPhase = ["idle", "active", "final", "complete"].includes(raw.phase as string) ? raw.phase as WeeklyPhase : "idle";
  return {
    weekKey: typeof raw.weekKey === "string" ? raw.weekKey.slice(0, 10) : "",
    seed: typeof raw.seed === "number" && Number.isFinite(raw.seed) ? Math.max(0, Math.floor(raw.seed)) : 0,
    phase, cursor: typeof raw.cursor === "number" ? Math.max(0, Math.min(9, Math.floor(raw.cursor))) : 0,
    score: typeof raw.score === "number" ? Math.max(-30, Math.min(30, Math.round(raw.score))) : 0,
    outcomes: Array.isArray(raw.outcomes) ? raw.outcomes.filter((item): item is WeeklyOutcome => Boolean(item && typeof item.stageId === "string" && typeof item.result === "string" && typeof item.scoreDelta === "number")).slice(0, 9) : [],
    rewardClaimed: raw.rewardClaimed === true
  };
}

export function startWeeklyCampaign(previous: WeeklyCampaignState, now = new Date()): WeeklyCampaignState {
  const weekKey = isoWeekKey(now);
  if (previous.weekKey === weekKey && previous.phase !== "idle") return previous;
  return { weekKey, seed: hashDate(`weekly:${weekKey}`), phase: "active", cursor: 0, score: 0, outcomes: [], rewardClaimed: false };
}

export function weeklySchedule(state: WeeklyCampaignState): readonly WeeklyStage[] {
  const regular = shuffle(EVENTS, state.seed);
  const live = shuffle(activeMemeEvents(weekAnchorDate(state.weekKey)).map(weeklyMemeEvent), state.seed ^ 0x9e3779b9);
  // Due slot Live Ops garantiti quando il pack editoriale è disponibile; gli
  // altri tre restano evergreen. Nessun interrupt mentre si esplora.
  const events = live.length >= 2
    ? [live[0], regular[0], live[1], regular[1], regular[2]]
    : shuffle([...live, ...regular], state.seed).slice(0, 5);
  return [
    { id: `event:${events[0].id}`, kind: "event", event: events[0] }, { id: "debate:1", kind: "debate", debateIndex: 1 },
    { id: `event:${events[1].id}`, kind: "event", event: events[1] }, { id: "debate:2", kind: "debate", debateIndex: 2 },
    { id: `event:${events[2].id}`, kind: "event", event: events[2] }, { id: "debate:3", kind: "debate", debateIndex: 3 },
    { id: `event:${events[3].id}`, kind: "event", event: events[3] }, { id: `event:${events[4].id}`, kind: "event", event: events[4] },
    { id: "finale", kind: "final" }
  ];
}

export function resolveWeeklyStage(state: WeeklyCampaignState, result: string, delta: number): WeeklyCampaignState {
  if (state.phase !== "active" && state.phase !== "final") return state;
  const stage = weeklySchedule(state)[state.cursor]; if (!stage) return state;
  const cursor = state.cursor + 1;
  return { ...state, cursor, score: Math.max(-30, Math.min(30, state.score + Math.round(delta))),
    outcomes: [...state.outcomes, { stageId: stage.id, result: result.slice(0, 32), scoreDelta: Math.round(delta) }],
    phase: cursor >= 9 ? "complete" : cursor === 8 ? "final" : "active" };
}

export function weeklyReward(state: WeeklyCampaignState): { money: number; ballots: number } {
  if (state.score >= 8) return { money: 1800, ballots: 3 };
  if (state.score >= 3) return { money: 1200, ballots: 2 };
  return { money: 800, ballots: 1 };
}

export function claimWeeklyReward(state: WeeklyCampaignState): WeeklyCampaignState {
  return state.phase === "complete" && !state.rewardClaimed ? { ...state, rewardClaimed: true } : state;
}
