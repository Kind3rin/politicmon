// HP0: evidenza visuale deterministica per le scene prima prive di screenshot.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { serializeTeam } = await import("/src/net/duelproto.ts");
  const { audio } = await import("/src/engine/audio.ts");
  const { DuelLobbyScene } = await import("/src/scenes/DuelLobbyScene.ts");
  const { MafiaScene } = await import("/src/scenes/MafiaScene.ts");
  const { NicknameScene } = await import("/src/scenes/NicknameScene.ts");
  const { PhotoChoiceScene } = await import("/src/scenes/PhotoChoiceScene.ts");
  const { SliceEndingScene } = await import("/src/scenes/SliceEndingScene.ts");
  const { TalkScene } = await import("/src/scenes/TalkScene.ts");
  const { PvpBattleScene } = await import("/src/game/battle/PvpBattleScene.ts");
  audio.enabled = false;

  const make = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    return { canvas, screen: new Screen(canvas), input: new Input(), stack: new SceneStack() };
  };
  const state = newGameState();
  state.flags["intro-done"] = true;
  state.flags["dex-received"] = true;
  state.money = 2400;
  state.party.push(createMonster("giorgiagon", 25), createMonster("renzilla", 24));
  const foe = [createMonster("salvinator", 25), createMonster("schleinix", 24)];

  const render = (scene, frames = 5) => {
    const env = make();
    env.stack.push(scene(env.stack, env.input));
    for (let i = 0; i < frames; i++) { env.stack.update(1 / 60); env.stack.draw(env.screen); env.input.endFrame(); }
    return env.canvas.toDataURL("image/png");
  };

  return {
    duelLobby: render((stack, input) => new DuelLobbyScene(stack, input, state)),
    mafia: render((stack, input) => new MafiaScene(stack, input, state)),
    nickname: render((stack, input) => new NicknameScene(stack, input, () => undefined)),
    photoChoice: render((stack, input) => new PhotoChoiceScene(stack, input, state)),
    sliceEnding: render((stack, input) => new SliceEndingScene(stack, input, state, () => undefined)),
    talk: render((stack, input) => new TalkScene(stack, input, { peerId: "qa-peer", peerNick: "COMPAGNO QA", talkId: "qa-talk", role: "host" })),
    pvpBattle: render((stack, input) => new PvpBattleScene(stack, input, {
      state, role: "host", peerId: "qa-peer", opponentNick: "COMPAGNO QA",
      hostWire: serializeTeam(state.party), guestWire: serializeTeam(foe), duelId: "qa-duel",
      onEnd: () => undefined
    }), 120)
  };
});

const out = "artifacts/screens/professional";
mkdirSync(out, { recursive: true });
for (const [name, dataUrl] of Object.entries(shots)) {
  writeFileSync(`${out}/${name}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  console.log(`salvato ${out}/${name}.png`);
}
await browser.close();
