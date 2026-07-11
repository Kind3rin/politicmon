import { test } from "node:test";
import assert from "node:assert/strict";
import { createAtto3Controller } from "../../src/game/world/atto3Controller.ts";
import { newGameState } from "../../src/game/state.ts";
import type { WorldCommand } from "../../src/game/world/worldContext.ts";

test("atto3 controller: candidato emette flag visto e apertura card", () => {
  const state = newGameState();
  const commands: WorldCommand[] = [];
  const handled = createAtto3Controller().interactNpc("campo-secretary", { state, dispatch: (command) => commands.push(command) });
  assert.equal(handled, true);
  assert.deepEqual(commands, [
    { kind: "setFlag", flag: "coalition-candidate-seen:campo_secretary" },
    { kind: "openCoalition", focus: "campo_secretary" }
  ]);
});

test("atto3 controller: non duplica il flag visto e ignora NPC estranei", () => {
  const state = newGameState();
  state.flags["coalition-candidate-seen:quantum_centrist"] = true;
  const commands: WorldCommand[] = [];
  const controller = createAtto3Controller();
  assert.equal(controller.interactNpc("quantum-centrist", { state, dispatch: (command) => commands.push(command) }), true);
  assert.deepEqual(commands, [{ kind: "openCoalition", focus: "quantum_centrist" }]);
  assert.equal(controller.interactNpc("campo-medico", { state, dispatch: () => undefined }), false);
});

test("atto3 controller: fotografo apre la scelta una volta, poi mostra conseguenza", () => {
  const state = newGameState();
  const commands: WorldCommand[] = [];
  const controller = createAtto3Controller();
  assert.equal(controller.interactNpc("campo-fotografo", { state, dispatch: (command) => commands.push(command) }), true);
  assert.deepEqual(commands, [{ kind: "openPhotoChoice" }]);
  state.flags["campo-photo-choice-complete"] = true;
  commands.length = 0;
  controller.interactNpc("campo-fotografo", { state, dispatch: (command) => commands.push(command) });
  assert.equal(commands[0]?.kind, "say");

  state.flags["campo-debate-resolved"] = true;
  commands.length = 0;
  controller.interactNpc("campo-fotografo", { state, dispatch: (command) => commands.push(command) });
  assert.deepEqual(commands, [{ kind: "startTrainer", trainerId: "campo-photographer", rematch: false }]);

  state.flags["campo-photo-complete"] = true;
  commands.length = 0;
  controller.interactNpc("campo-fotografo", { state, dispatch: (command) => commands.push(command) });
  assert.equal(commands[0]?.kind, "say");
  assert.match(commands[0]?.kind === "say" ? commands[0].lines.join(" ") : "", /FUTURO ANTERIORE/);
});

test("atto3 controller: le due leve aprono il corridoio e il tavolo apre la scelta", () => {
  const state = newGameState();
  const commands: WorldCommand[] = [];
  const controller = createAtto3Controller();
  controller.interactNpc("future-lever-a", { state, dispatch: (command) => {
    commands.push(command);
    if (command.kind === "setFlag") state.flags[command.flag] = true;
  } });
  assert.equal(state.flags["future-lever-a-on"], true);
  commands.length = 0;
  controller.interactNpc("future-lever-b", { state, dispatch: (command) => {
    commands.push(command);
    if (command.kind === "setFlag") state.flags[command.flag] = true;
  } });
  assert.equal(state.flags["future-shortcut-open"], true);
  commands.length = 0;
  controller.interactNpc("future-choice-desk", { state, dispatch: (command) => commands.push(command) });
  assert.deepEqual(commands, [{ kind: "openFutureChoice" }]);
});

test("P5-T06: ogni archivio richiede due terminali e il quarto apre lo studio", () => {
  const state = newGameState();
  const commands: WorldCommand[] = [];
  const dispatch = (command: WorldCommand) => {
    commands.push(command);
    if (command.kind === "setFlag") state.flags[command.flag] = true;
  };
  const controller = createAtto3Controller();
  for (const module of ["algorithm", "factcheck", "talkshow", "silence"] as const) {
    controller.interactNpc(`palace-${module}-a`, { state, dispatch });
    const domainId = module === "algorithm" ? "algoritmo" : module === "silence" ? "silenzio" : module;
    assert.equal(Boolean(state.flags[`palace-module:${domainId}`]), false);
    controller.interactNpc(`palace-${module}-b`, { state, dispatch });
    assert.equal(state.flags[`palace-module:${domainId}`], true);
  }
  assert.equal(state.flags.palaceRoomsComplete, true);
  const lastSay = [...commands].reverse().find((command) => command.kind === "say");
  assert.match(lastSay?.kind === "say" ? lastSay.lines.join(" ") : "", /STUDIO ELETTORALE È APERTO/);
});

test("P5-T06: reception mostra progresso senza modificare la campagna", () => {
  const state = newGameState();
  state.flags["palace-module:algoritmo"] = true;
  state.flags["palace-module:factcheck"] = true;
  const commands: WorldCommand[] = [];
  createAtto3Controller().interactNpc("palace-reception", { state, dispatch: (command) => commands.push(command) });
  assert.deepEqual(commands, [{ kind: "say", lines: ["RECEPTION: IL PALAZZO NON CAMBIA I NUMERI.", "ARCHIVI COMPLETI: 2/4. POI SI APRE LO STUDIO."] }]);
});
