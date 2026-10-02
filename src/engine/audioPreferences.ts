export interface AudioPreferences { enabled: boolean; music: number; effects: number; }
export const AUDIO_PREF_KEY = "politicmon.audio.v1";
export const DEFAULT_AUDIO: AudioPreferences = { enabled: true, music: 50, effects: 70 };
export function audioLevel(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value / 10) * 10)) : fallback;
}
export function parseAudioPreferences(raw: unknown): AudioPreferences {
  const p = raw && typeof raw === "object" ? raw as Partial<AudioPreferences> : {};
  return { enabled: typeof p.enabled === "boolean" ? p.enabled : DEFAULT_AUDIO.enabled,
    music: audioLevel(p.music, DEFAULT_AUDIO.music), effects: audioLevel(p.effects, DEFAULT_AUDIO.effects) };
}
export function loadAudioPreferences(): AudioPreferences {
  try { return parseAudioPreferences(JSON.parse(localStorage.getItem(AUDIO_PREF_KEY) ?? "null")); }
  catch { return { ...DEFAULT_AUDIO }; }
}
export function storeAudioPreferences(p: AudioPreferences): void {
  try { localStorage.setItem(AUDIO_PREF_KEY, JSON.stringify(p)); } catch { /* Private/storage-full mode retains the live mix. */ }
}
