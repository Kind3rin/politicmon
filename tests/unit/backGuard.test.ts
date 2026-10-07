import assert from "node:assert/strict";
import test from "node:test";
import { backAction, screenKind } from "../../src/engine/backGuard";

const body = (...names: string[]) => ({ classList: { contains: (name: string) => names.includes(name) } });
const doc = (title: boolean) => ({ querySelector: (selector: string) => (selector === ".ui-splash" && title ? {} : null) });

test("back leaves the app only from the title screen", () => {
  assert.equal(backAction(screenKind(body(), doc(true))), "leave");
  assert.equal(backAction(screenKind(body("ui-panel-open"), doc(true))), "leave", "the title is a panel: it is the one that may leave");
});

test("back opens the menu from the bare map and closes whatever covers it", () => {
  assert.equal(backAction(screenKind(body("ui-world-open"), doc(false))), "menu");
  for (const cover of ["ui-panel-open", "ui-dialog-open", "ui-conversation-open", "ui-arena-open"]) assert.equal(backAction(screenKind(body("ui-world-open", cover), doc(false))), "close", cover);
  assert.equal(backAction(screenKind(body("ui-arena-open"), doc(false))), "close");
});

test("a world with a title card still behind it is not the title", () => {
  assert.equal(backAction(screenKind(body("ui-world-open"), doc(true))), "menu");
});
