import { test } from "node:test";
import assert from "node:assert/strict";
import { coalitionChannelLabel, drawAllyCard, drawChoicePreview, drawConsensusBar, drawDistrictMap } from "../../src/ui/widgets.ts";
import { newElectionState } from "../../src/game/election.ts";

class FakeScreen {
  calls: Array<{ op: string; args: unknown[] }> = [];
  rect(...args: unknown[]): void { this.calls.push({ op: "rect", args }); }
  frame(...args: unknown[]): void { this.calls.push({ op: "frame", args }); }
  panel(...args: unknown[]): void { this.calls.push({ op: "panel", args }); }
  text(...args: unknown[]): void { this.calls.push({ op: "text", args }); }
  textRight(...args: unknown[]): void { this.calls.push({ op: "textRight", args }); }
}

test("coalition widgets: card e preview clippano testi senza eccezioni", () => {
  const screen = new FakeScreen();
  drawAllyCard(screen as never, 8, 20, 224, { name: "CANDIDATO CON UN NOME IMPOSSIBILMENTE LUNGO", tag: "CAMPO", bonusLabel: "TERRITORIO MOLTO LUNGO", malusLabel: "FONDI", lineRedLabel: "DIPLOMAZIA INTERNAZIONALE", status: "candidate" });
  drawChoicePreview(screen as never, 8, 70, 224, "PROMESSA RISCHIOSA CON TESTO LUNGO", [{ label: "CONSENSO LOCALE", value: "+12", tone: "good" }, { label: "COSTO", value: "1200€", tone: "bad" }], true);
  assert.ok(screen.calls.length > 10);
  for (const call of screen.calls.filter((item) => item.op === "text" || item.op === "textRight")) assert.ok(String(call.args[0]).length <= 37);
});

test("coalition widgets: barra clampa e mappa disegna cinque card", () => {
  const screen = new FakeScreen();
  drawConsensusBar(screen as never, 8, 20, 224, 999);
  drawDistrictMap(screen as never, 8, 50, newElectionState(true).districts, "nord");
  assert.ok(screen.calls.some((call) => call.op === "textRight" && call.args[0] === "100%"));
  assert.equal(screen.calls.filter((call) => call.op === "panel").length, 5);
  assert.equal(coalitionChannelLabel("shopPrice"), "PREZZI");
});
