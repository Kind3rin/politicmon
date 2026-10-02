export interface BattleBackdrop {
  spriteId: string;
  path: string;
  sky: string;
  ground: string;
  foePlatform: string;
  playerPlatform: string;
}

// Risorse native 240×136: il campo lascia liberi sprite, barre e menu.
// Anche il prato Higgsfield serve ai percorsi e al fallback degli altri ambienti.
export const BATTLE_BACKDROPS = {
  prato: { spriteId: "battle:bg", path: "ui/battle_bg.png", sky: "#d8e8c8", ground: "#e8e0c8", foePlatform: "#c0cc9c", playerPlatform: "#cabf96" },
  piazza: { spriteId: "battle:bg:piazza", path: "ui/battle/piazza.png", sky: "#a5d8e0", ground: "#f0dbb4", foePlatform: "#deca9f", playerPlatform: "#d3bd93" },
  studio: { spriteId: "battle:bg:studio", path: "ui/battle/studio.png", sky: "#427b94", ground: "#a3bdcc", foePlatform: "#85a9bd", playerPlatform: "#789bae" },
  palazzo: { spriteId: "battle:bg:palazzo", path: "ui/battle/palazzo.png", sky: "#e0c6a0", ground: "#f0dfbe", foePlatform: "#d8c299", playerPlatform: "#cbb58d" },
  costa: { spriteId: "battle:bg:costa", path: "ui/battle/costa.png", sky: "#9ad5df", ground: "#f0dcba", foePlatform: "#dcc89f", playerPlatform: "#d2bb8e" },
  neve: { spriteId: "battle:bg:neve", path: "ui/battle/neve.png", sky: "#9bcee0", ground: "#dceef5", foePlatform: "#b6d5e4", playerPlatform: "#aacadb" },
  rete: { spriteId: "battle:bg:rete", path: "ui/battle/rete.png", sky: "#a5b4d9", ground: "#bdc4e6", foePlatform: "#a4add4", playerPlatform: "#959ec6" },
  grotta: { spriteId: "battle:bg:grotta", path: "ui/battle/grotta.png", sky: "#79768c", ground: "#bfb4a3", foePlatform: "#a49b8c", playerPlatform: "#938a7d" }
} as const satisfies Record<string, BattleBackdrop>;

export type BattleBackdropId = keyof typeof BATTLE_BACKDROPS;

