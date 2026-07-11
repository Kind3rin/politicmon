import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  exportSaveCode,
  importSaveCode,
  loadGame,
  parseGameState,
  saveGame,
  serializeGameState,
  setActiveSlot,
  slotSummary,
  type GameState
} from "../../src/game/state.ts";

const fixtureDir = resolve("tests/fixtures/saves");

type FixturePatch = { extends: string; patch: Record<string, unknown> };

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(resolve(fixtureDir, name), "utf8"));
}

function fixtureState(name: string): Record<string, unknown> {
  const raw = readJson(name) as Record<string, unknown>;
  if (typeof raw.extends !== "string" || !raw.patch || typeof raw.patch !== "object") {
    return structuredClone(raw);
  }
  const spec = raw as unknown as FixturePatch;
  return { ...fixtureState(spec.extends), ...structuredClone(spec.patch) };
}

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, String(value)); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true
});

beforeEach(() => {
  storage.clear();
  setActiveSlot(0);
});

test("fixture v13: checkpoint principali vengono normalizzati senza perdita", () => {
  const cases: Array<[string, string, string?]> = [
    ["v13-new.json", "borgo"],
    ["v13-post-medaglie.json", "capitale"],
    ["v13-post-garante.json", "colle", "garante-beaten"],
    ["v13-post-ue.json", "bruxelles", "ue-beaten"]
  ];
  for (const [file, mapId, flag] of cases) {
    const parsed = parseGameState(JSON.stringify(fixtureState(file)));
    assert.ok(parsed, `${file} deve essere valido`);
    assert.equal(parsed.pos.mapId, mapId);
    if (flag) assert.equal(parsed.flags[flag], true);
    assert.ok(parsed.browserSeed > 0);
  }
  const legacyEndgame = parseGameState(JSON.stringify(fixtureState("v13-post-ue.json")));
  assert.ok(legacyEndgame);
  assert.equal(legacyEndgame.runStats.checkpoints.bruxelles, null);
  assert.equal(legacyEndgame.runStats.checkpoints.garante, null);
});

test("parser puro: default reduce-motion è esplicito e deterministico", () => {
  const partial = { party: [], pos: { mapId: "borgo", x: 1, y: 1, facing: "down" } };
  assert.equal(parseGameState(JSON.stringify(partial))?.reduceEffects, false);
  assert.equal(
    parseGameState(JSON.stringify(partial), { reduceMotionDefault: true })?.reduceEffects,
    true
  );
});

test("serialize/parse: round-trip v13 conserva il checkpoint UE", () => {
  const original = parseGameState(JSON.stringify(fixtureState("v13-post-ue.json")));
  assert.ok(original);
  const roundTrip = parseGameState(serializeGameState(original));
  assert.deepEqual(roundTrip, original);
});

test("codice salvataggio: round-trip conserva testo Unicode", () => {
  const state = parseGameState(JSON.stringify(fixtureState("v13-post-medaglie.json")));
  assert.ok(state);
  state.flags["città-già-vista"] = true;
  assert.deepEqual(importSaveCode(exportSaveCode(state)), state);
});

test("multi-slot: ogni slot carica e riassume il proprio checkpoint", () => {
  const spec = readJson("v13-multislot.json") as {
    activeSlot: number;
    slots: Array<{ slot: number; fixture: string }>;
  };
  for (const entry of spec.slots) {
    storage.setItem(
      `politicmon-save-v18__s${entry.slot}`,
      JSON.stringify(fixtureState(entry.fixture))
    );
  }
  setActiveSlot(spec.activeSlot);
  assert.equal(loadGame()?.pos.mapId, "capitale");
  assert.equal(slotSummary(0).mapId, "borgo");
  assert.equal(slotSummary(1).badges, 3);
  assert.equal(slotSummary(2).mapId, "bruxelles");
});

test("backup: primario corrotto viene ripristinato senza distruggere il backup", () => {
  const spec = readJson("v13-backup-recovery.json") as {
    slot: number;
    primary: string;
    backupFixture: string;
    expected: { mapId: string; garanteBeaten: boolean; money: number };
  };
  const backupRaw = JSON.stringify(fixtureState(spec.backupFixture));
  storage.setItem(`politicmon-save-v18__s${spec.slot}`, spec.primary);
  storage.setItem(`politicmon-save-v18__s${spec.slot}.bak`, backupRaw);
  setActiveSlot(spec.slot);

  const loaded = loadGame();
  assert.ok(loaded);
  assert.equal(loaded.pos.mapId, spec.expected.mapId);
  assert.equal(loaded.flags["garante-beaten"], spec.expected.garanteBeaten);
  assert.equal(loaded.money, spec.expected.money);
  assert.ok(parseGameState(storage.getItem(`politicmon-save-v18__s${spec.slot}`)));
  assert.equal(storage.getItem(`politicmon-save-v18__s${spec.slot}.bak`), backupRaw);
});

test("migrazione mono-slot v13: copia in slot 0 e rimuove la chiave storica", () => {
  const state = fixtureState("v13-post-medaglie.json") as unknown as GameState;
  storage.setItem("politicmon-save-v13", JSON.stringify(state));
  setActiveSlot(0);
  assert.equal(loadGame()?.pos.mapId, "capitale");
  assert.ok(storage.getItem("politicmon-save-v18__s0"));
  assert.equal(storage.getItem("politicmon-save-v13"), null);
});

test("migrazioni legacy v3-v12: ogni chiave supportata confluisce nello slot 0", () => {
  const legacyKeys = [
    "politicmon-save-v12", "politicmon-save-v11", "politicmon-save-v10",
    "politicmon-save-v9", "politicmon-save-v8", "politicmon-save-v7",
    "politicmon-save-v6", "politicmon-save-v5", "politicmon-save-v4",
    "politicmon-save-v3"
  ];
  const raw = JSON.stringify(readJson("legacy-minimal.json"));
  for (const key of legacyKeys) {
    storage.clear();
    setActiveSlot(0);
    storage.setItem(key, raw);
    const loaded = loadGame();
    assert.ok(loaded, `${key} deve migrare`);
    assert.equal(loaded.money, 321);
    assert.equal(loaded.flags["legacy-fixture"], true);
    assert.equal(storage.getItem(key), null, `${key} deve essere rimossa`);
    assert.ok(storage.getItem("politicmon-save-v18__s0"));
  }
});

test("save normale: il primario precedente viene ruotato nel backup", () => {
  const previous = parseGameState(JSON.stringify(fixtureState("v13-post-medaglie.json")));
  const next = parseGameState(JSON.stringify(fixtureState("v13-post-ue.json")));
  assert.ok(previous && next);
  storage.setItem("politicmon-save-v18__s0", serializeGameState(previous));
  setActiveSlot(0);
  assert.equal(saveGame(next), true);
  assert.deepEqual(parseGameState(storage.getItem("politicmon-save-v18__s0")), next);
  assert.deepEqual(parseGameState(storage.getItem("politicmon-save-v18__s0.bak")), previous);
});

test("migrazione multi-slot v13: conserva indice e backup nello slot v18 omologo", () => {
  const primary = JSON.stringify(fixtureState("v13-post-ue.json"));
  const backup = JSON.stringify(fixtureState("v13-post-garante.json"));
  storage.setItem("politicmon-save-v13__s2", primary);
  storage.setItem("politicmon-save-v13__s2.bak", backup);
  setActiveSlot(2);

  assert.equal(loadGame()?.pos.mapId, "bruxelles");
  assert.ok(storage.getItem("politicmon-save-v18__s2"));
  assert.ok(storage.getItem("politicmon-save-v18__s2.bak"));
  assert.equal(storage.getItem("politicmon-save-v13__s2"), null);
  assert.equal(storage.getItem("politicmon-save-v13__s2.bak"), null);
});

test("migrazione v17: aggiunge il registry forme v18 senza perdere il party", () => {
  const previous = fixtureState("v13-post-medaglie.json");
  storage.setItem("politicmon-save-v17__s1", JSON.stringify(previous));
  setActiveSlot(1);
  const loaded = loadGame();
  assert.ok(loaded);
  assert.deepEqual(loaded.unlockedMemeForms, []);
  assert.equal(loaded.party.length, previous.party.length);
  assert.ok(storage.getItem("politicmon-save-v18__s1"));
  assert.equal(storage.getItem("politicmon-save-v17__s1"), null);
});

test("parser difensivo: input corrotto o strutturalmente invalido viene rifiutato", () => {
  assert.equal(parseGameState(null), null);
  assert.equal(parseGameState("{rotto"), null);
  assert.equal(parseGameState("null"), null);
  assert.equal(parseGameState(JSON.stringify({ party: "no", pos: null })), null);
});

test("matrice P7-T03: save vuoto resta vuoto e non crea slot fantasma", () => {
  assert.equal(loadGame(), null);
  assert.equal(slotSummary(0).exists, false);
  assert.equal(storage.length, 1); // resta soltanto politicmon-active-slot
});

test("matrice P7-T03: forma meme v18 sopravvive a round-trip e backup", () => {
  const state = parseGameState(JSON.stringify(fixtureState("v13-post-medaglie.json")));
  assert.ok(state && state.party[0]);
  state.party[0].speciesId = "salvinator";
  state.party[0].memeFormId = "salvinator_spiaggia";
  state.unlockedMemeForms = ["salvinator_spiaggia"];
  state.party[0].hp = 1;
  assert.equal(saveGame(state), true);
  const loaded = loadGame();
  assert.ok(loaded);
  assert.equal(loaded.party[0].memeFormId, "salvinator_spiaggia");
  assert.deepEqual(loaded.unlockedMemeForms, ["salvinator_spiaggia"]);
});
