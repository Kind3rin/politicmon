// Screenshot R41 END-GAME: selettore DIFFICOLTÀ (title), tabellone COPPA DELLE
// POLTRONE (TournamentScene), borsa con i boost CAMPAGNA ELETTORALE. Pattern
// shot-r41-world.mjs. Salva in artifacts/screens/.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(1500);
const shot = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { TitleScene } = await import("/src/scenes/TitleScene.ts");
  const { TournamentScene } = await import("/src/scenes/TournamentScene.ts");
  const { BagScene } = await import("/src/scenes/BagScene.ts");
  const { initTournament } = await import("/src/game/tournament.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const render = (stack, frames = 6) => {
    for (let i = 0; i < frames; i++) { stack.update(1 / 30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  };

  // 1) Selettore DIFFICOLTÀ nel title: simula la scelta NUOVA CAMPAGNA aprendo
  //    il difficultyMenu (campo privato, accesso via cast in JS runtime).
  const titleStack = new SceneStack();
  const title = new TitleScene(titleStack, input);
  titleStack.push(title);
  // Apri il selettore difficoltà (Menu con NORMALE / MODALITÀ DIFFICILE).
  const { Menu } = await import("/src/ui/widgets.ts");
  title.difficultyMenu = new Menu([{ label: "NORMALE" }, { label: "MODALITÀ DIFFICILE" }]);
  title.difficultyMenu.index = 1; // evidenzia HARD per lo screenshot
  const difficulty = render(titleStack, 4);

  // 2) Tabellone COPPA DELLE POLTRONE.
  const state = newGameState();
  state.flags["garante-beaten"] = true;
  state.badges = ["auditel", "spread", "dazio"];
  state.party = [createMonster("draghimon", 52)];
  state.coppaWins = 1;
  const t = initTournament("2026-07-03");
  const tourStack = new SceneStack();
  tourStack.push(new TournamentScene(tourStack, input, state, t, () => {}));
  const bracket = render(tourStack, 6);

  // 3) Borsa con i boost campagna nell'inventario.
  const bagState = newGameState();
  bagState.flags["garante-beaten"] = true;
  bagState.bag = { manifesti: 2, spotprimetime: 1, comizio: 1, caffe: 3, scheda: 5 };
  const bagStack = new SceneStack();
  const bag = new BagScene(bagStack, input, bagState, { inBattle: false });
  bagStack.push(bag);
  render(bagStack, 2);
  // Porta il cursore sul boost MANIFESTI OVUNQUE per mostrarne la descrizione.
  const ids = bag.itemIds;
  const mi = ids.indexOf("manifesti");
  if (mi >= 0) bag.menu.index = mi;
  const bagShot = render(bagStack, 2);

  return { difficulty, bracket, bagShot };
});
function save(n, d) {
  writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length), "base64"));
  console.log(`salvato artifacts/screens/${n}.png`);
}
save("r41-difficulty", shot.difficulty);
save("r41-coppa-bracket", shot.bracket);
save("r41-campaign-boosts", shot.bagShot);
await browser.close();
