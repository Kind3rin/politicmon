import assert from "node:assert/strict";
import test from "node:test";
import { AUDIO_PREF_KEY, DEFAULT_AUDIO, audioLevel, loadAudioPreferences, parseAudioPreferences, storeAudioPreferences } from "../../src/engine/audioPreferences";

test("audio mix accepts explicit mute and independent zero-volume buses", () => {
  assert.deepEqual(parseAudioPreferences({ enabled: false, music: 0, effects: 100 }), { enabled: false, music: 0, effects: 100 });
  assert.deepEqual(parseAudioPreferences({ enabled: "false", music: NaN, effects: "90" }), DEFAULT_AUDIO);
  for (const value of [null, undefined, "corrupt", [], 3]) assert.deepEqual(parseAudioPreferences(value), DEFAULT_AUDIO);
});
test("audio levels are bounded, discrete and finite", () => {
  assert.equal(audioLevel(-50, 50), 0); assert.equal(audioLevel(150, 50), 100);
  assert.equal(audioLevel(54, 50), 50); assert.equal(audioLevel(55, 50), 60);
  assert.equal(audioLevel(Infinity, 70), 70);
});
test("audio preferences use their own key and tolerate unavailable storage", () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage"), values = new Map<string, string>();
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
    assert.deepEqual(loadAudioPreferences(), DEFAULT_AUDIO);
    storeAudioPreferences({ enabled: false, music: 30, effects: 80 });
    assert.deepEqual([...values.keys()], [AUDIO_PREF_KEY]);
    assert.deepEqual(loadAudioPreferences(), { enabled: false, music: 30, effects: 80 });
    values.set(AUDIO_PREF_KEY, "not JSON"); assert.deepEqual(loadAudioPreferences(), DEFAULT_AUDIO);
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw Error("Storage blocked"); } });
    assert.deepEqual(loadAudioPreferences(), DEFAULT_AUDIO); assert.doesNotThrow(() => storeAudioPreferences(DEFAULT_AUDIO));
  } finally {
    if (old) Object.defineProperty(globalThis, "localStorage", old); else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
