import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

/** Runs the real worker's install against fake caches and a fake network. */
type Group = [string, string, string, string?];
const source = readFileSync("public/sw.js", "utf8");
const origin = "https://fixture.test/";
const url = (path: string) => new URL(path, origin).href;
const response = (body: string, ok = true) => ({ ok, body, clone() { return response(body, ok); }, async json() { return JSON.parse(body); }, async text() { return body; } });

function world(build: string, inventory: Group[], previous: Record<string, Map<string, ReturnType<typeof response>>> = {}, options: { noKeys?: boolean } = {}) {
  const stores: Record<string, Map<string, ReturnType<typeof response>>> = { ...previous };
  const fetched: string[] = [];
  const open = async (name: string) => {
    const store = stores[name] ??= new Map();
    return {
      async match(request: string | { url: string }) { return store.get(url(typeof request === "string" ? request : request.url)); },
      async keys() { return [...store.keys()].map(key => ({ url: key })); },
      async put(request: string, value: ReturnType<typeof response>) { store.set(url(request), value); },
      async addAll(paths: string[]) { for (const path of paths) { fetched.push(path); store.set(url(path), response(`net:${path}`)); } }
    };
  };
  const handlers: Record<string, (event: { waitUntil(p: Promise<unknown>): void }) => void> = {};
  let pending: Promise<unknown> = Promise.resolve();
  vm.runInNewContext(source.replaceAll("__APP_BUILD_ID__", build), {
    URL,
    self: { addEventListener: (name: string, fn: never) => { handlers[name] = fn; }, skipWaiting() {}, location: { origin: origin.slice(0, -1), href: `${origin}sw.js` } },
    caches: options.noKeys ? { open } : { open, keys: async () => Object.keys(stores) },
    fetch: async (path: string) => { fetched.push(path); return response(JSON.stringify(inventory)); }
  });
  handlers.install({ waitUntil: p => { pending = p; } });
  return { done: () => pending, fetched, stores };
}

const oldInventory: Group[] = [["./sprites/", ".png", "a|b|c", "11111111" + "22222222" + "33333333"], ["./audio/", ".m4a", "theme", "aaaaaaaa"]];
const oldCache = () => new Map<string, ReturnType<typeof response>>([
  [url("./precache-runtime-A.json"), response(JSON.stringify(oldInventory))],
  [url("./sprites/a.png"), response("old:a")], [url("./sprites/b.png"), response("old:b")], [url("./sprites/c.png"), response("old:c")],
  [url("./audio/theme.m4a"), response("old:theme")]
]);
const core = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./politicmon-icon.svg"];

test("an update downloads only what changed and copies the rest from the previous release", async () => {
  // b changed, d is new; a, c and the music are the same bytes.
  const next: Group[] = [["./sprites/", ".png", "a|b|c|d", "11111111" + "99999999" + "33333333" + "44444444"], ["./audio/", ".m4a", "theme", "aaaaaaaa"]];
  const run = world("B", next, { "politicmon-A": oldCache() });
  await run.done();
  assert.deepEqual(run.fetched, ["./precache-runtime-B.json", ...core, "./sprites/b.png", "./sprites/d.png"]);
  const fresh = run.stores["politicmon-B"];
  assert.equal(fresh.get(url("./sprites/a.png"))?.body, "old:a");
  assert.equal(fresh.get(url("./sprites/b.png"))?.body, "net:./sprites/b.png");
  assert.equal(fresh.get(url("./audio/theme.m4a"))?.body, "old:theme");
  assert.equal(fresh.size, core.length + 5 + 1, "every file of the release and its inventory are in the new cache");
});

test("a first install, an inventory without hashes or a browser that cannot list caches download everything", async () => {
  const next: Group[] = [["./sprites/", ".png", "a|b", "11111111" + "22222222"]];
  for (const run of [
    world("B", next),
    world("B", [["./sprites/", ".png", "a|b"]], { "politicmon-A": oldCache() }),
    world("B", next, { "politicmon-A": oldCache() }, { noKeys: true })
  ]) {
    await run.done();
    assert.deepEqual(run.fetched, ["./precache-runtime-B.json", ...core, "./sprites/a.png", "./sprites/b.png"]);
  }
});

test("a file the previous cache lost, or kept as a failed response, is downloaded", async () => {
  const lost = oldCache(); lost.delete(url("./sprites/a.png")); lost.set(url("./sprites/c.png"), response("broken", false));
  const run = world("B", oldInventory, { "politicmon-A": lost });
  await run.done();
  assert.deepEqual(run.fetched, ["./precache-runtime-B.json", ...core, "./sprites/a.png", "./sprites/c.png"]);
});

test("a previous release without hashes in its inventory is not trusted", async () => {
  const plain = oldCache(); plain.set(url("./precache-runtime-A.json"), response(JSON.stringify([["./sprites/", ".png", "a|b|c"], ["./audio/", ".m4a", "theme"]])));
  const run = world("B", oldInventory, { "politicmon-A": plain });
  await run.done();
  assert.equal(run.fetched.length, 1 + core.length + 4);
});
