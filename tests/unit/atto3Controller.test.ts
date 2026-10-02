import { test } from "node:test";
import assert from "node:assert/strict";
import { createAtto3Controller } from "../../src/game/world/atto3Controller.ts";
import { newGameState } from "../../src/game/state.ts";
import type { WorldCommand } from "../../src/game/world/worldContext.ts";
import { CAMPO_VOICES } from "../../src/data/campo.ts";

test('Tour kiosks keep closed dossiers accessible without dispatching rewards or changing state',()=>{
  for(const district of ['nord','centro','sud','isole','feed'] as const)for(const closed of [false,true]){
    const state=newGameState();state.flags[`district-complete:${district}`]=closed;
    const before=JSON.stringify(state),commands:WorldCommand[]=[];
    assert.equal(createAtto3Controller().interactNpc(`district-kiosk-${district}`,{state,dispatch:c=>commands.push(c)}),true);
    assert.deepEqual(commands,[{kind:'openDistrict',districtId:district}]);
    assert.equal(JSON.stringify(state),before);
  }
});

test("Genova DJ opens both the first set and practice without altering earned state", () => {
  for (const complete of [false, true]) {
    const state = newGameState();
    state.flags["genova-techno-complete"] = complete;
    const before = JSON.stringify(state), commands: WorldCommand[] = [];
    assert.equal(createAtto3Controller().interactNpc("genova-dj", { state, dispatch: c => commands.push(c) }), true);
    assert.deepEqual(commands, [{ kind: "openGenovaTechno" }]);
    assert.equal(JSON.stringify(state), before);
  }
});

test("atto3 controller: candidato emette flag visto e apertura card", () => {
  const state = newGameState();
  const commands: WorldCommand[] = [];
  const handled = createAtto3Controller().interactNpc("campo-secretary", { state, dispatch: (command) => commands.push(command) });
  assert.equal(handled, true);
  assert.deepEqual(commands, [
    { kind: "setFlag", flag: "coalition-candidate-seen:campo_secretary" },
    { kind: "openCoalition", focus: "campo_secretary", intro: CAMPO_VOICES.campo_secretary }
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

test("atto3 controller: leggere i verbali autorizza le leve senza riparare debiti", () => {
  const state = newGameState();
  const commands: WorldCommand[] = [];
  const controller = createAtto3Controller();
  const before = JSON.stringify({ morale: state.morale, coalition: state.coalition, money: state.money });
  const context = { state, dispatch: (command: WorldCommand) => {
    commands.push(command);
    if (command.kind === "setFlag") state.flags[command.flag] = true;
  } };
  controller.interactNpc("future-lever-a", context);
  assert.equal(state.flags["future-lever-a-on"], undefined);
  assert.equal(state.flags["future-shortcut-open"], undefined);
  controller.interactNpc("future-split-clerk", context);
  controller.interactNpc("future-lever-a", context);
  assert.equal(state.flags["future-lever-a-on"], true);
  commands.length = 0;
  controller.interactNpc("future-lever-b", context);
  assert.equal(state.flags["future-shortcut-open"], undefined);
  controller.interactNpc("future-brand-clerk", context);
  controller.interactNpc("future-lever-b", context);
  assert.equal(state.flags["future-shortcut-open"], true);
  assert.equal(JSON.stringify({ morale: state.morale, coalition: state.coalition, money: state.money }), before);
  commands.length = 0;
  controller.interactNpc("future-choice-desk", { state, dispatch: (command) => commands.push(command) });
  assert.deepEqual(commands, [{ kind: "openFutureChoice" }]);
});

test("atto3 controller: vecchie leve già approvate restano valide", () => {
  const state = newGameState();
  state.flags["future-lever-a-on"] = true;
  state.flags["future-lever-b-on"] = true;
  const commands: WorldCommand[] = [];
  createAtto3Controller().interactNpc("future-lever-a", { state, dispatch: c => commands.push(c) });
  assert.ok(commands.some(c => c.kind === "setFlag" && c.flag === "future-shortcut-open"));
});

test("P5-T06: parlare ai terminali apre dossier senza assegnare completamenti", () => {
 const state=newGameState(),before=structuredClone(state),commands:WorldCommand[]=[];
 const controller=createAtto3Controller();
 for(const [npc,module]of [["algorithm","algoritmo"],["factcheck","factcheck"],["talkshow","talkshow"],["silence","silenzio"]] as const){
  for(const terminal of ["a","b"] as const){
   assert.equal(controller.interactNpc(`palace-${npc}-${terminal}`,{state,dispatch:c=>commands.push(c)}),true);
   assert.deepEqual(commands.at(-1),{kind:"openPalaceArchive",module,terminal});
  }
 }
 assert.deepEqual(state,before);
});

test("P5-T06: reception mostra progresso senza modificare la campagna", () => {
  const state = newGameState();
  state.flags["palace-module:algoritmo"] = true;
  state.flags["palace-module:factcheck"] = true;
  const commands: WorldCommand[] = [];
  createAtto3Controller().interactNpc("palace-reception", { state, dispatch: (command) => commands.push(command) });
  assert.deepEqual(commands, [{ kind: "say", lines: ["RECEPTION: IL PALAZZO NON CAMBIA I NUMERI.", "ARCHIVI COMPLETI: 2/4. POI SI APRE LO STUDIO."] }]);
});
