import { EVERGREEN_MEME_EVENTS } from "./evergreen";
import { SEASON_2026_MEME_EVENTS } from "./season-2026";
import type { MemeEventDef } from "./types";

export const MEME_EVENTS: readonly MemeEventDef[] = Object.freeze([
  ...EVERGREEN_MEME_EVENTS,
  ...SEASON_2026_MEME_EVENTS
]);

export function activeMemeEvents(at: Date = new Date()): readonly MemeEventDef[] {
  const timestamp = at.getTime();
  return MEME_EVENTS.filter((event) => {
    if (!event.active) return true;
    const from = Date.parse(`${event.active.from}T00:00:00Z`);
    const until = Date.parse(`${event.active.until}T23:59:59.999Z`);
    return Number.isFinite(from) && Number.isFinite(until) && timestamp >= from && timestamp <= until;
  });
}

export type { MemeCondition, MemeEffect, MemeEventChoice, MemeEventDef } from "./types";
