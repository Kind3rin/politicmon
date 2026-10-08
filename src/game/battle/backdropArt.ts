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
  grotta: { spriteId: "battle:bg:grotta", path: "ui/battle/grotta.png", sky: "#79768c", ground: "#bfb4a3", foePlatform: "#a49b8c", playerPlatform: "#938a7d" },
  lago: { spriteId: "battle:bg:lago", path: "ui/battle/lago.png", sky: "#82d3ea", ground: "#f1ddb6", foePlatform: "#e0cda9", playerPlatform: "#d4c2a0" },
  cava: { spriteId: "battle:bg:cava", path: "ui/battle/cava.png", sky: "#8dd6e8", ground: "#f2dcb4", foePlatform: "#e1cca7", playerPlatform: "#d4c19e" },
  viale: { spriteId: "battle:bg:viale", path: "ui/battle/viale.png", sky: "#90c9df", ground: "#cecbc8", foePlatform: "#bfbcba", playerPlatform: "#b5b2b0" },
  foro: { spriteId: "battle:bg:foro", path: "ui/battle/foro.png", sky: "#82cee4", ground: "#efdcb6", foePlatform: "#decca9", playerPlatform: "#d2c1a0" },
  tv: { spriteId: "battle:bg:tv", path: "ui/battle/tv.png", sky: "#7ad1ea", ground: "#dacfbd", foePlatform: "#cac0af", playerPlatform: "#bfb6a6" },
  // Interni: un fondale proprio per ambiente, così un bar non combatte sotto un palazzo di marmo.
  bar: { spriteId: "battle:bg:bar", path: "ui/battle/bar.png", sky: "#87634d", ground: "#efd9ae", foePlatform: "#e1cca3", playerPlatform: "#d2bf99" },
  casa: { spriteId: "battle:bg:casa", path: "ui/battle/casa.png", sky: "#aa9885", ground: "#f2dcaf", foePlatform: "#e3cfa4", playerPlatform: "#d5c29a" },
  palestra: { spriteId: "battle:bg:palestra", path: "ui/battle/palestra.png", sky: "#614c52", ground: "#e6b87a", foePlatform: "#d8ad72", playerPlatform: "#caa26b" },
  mercato: { spriteId: "battle:bg:mercato", path: "ui/battle/mercato.png", sky: "#615f65", ground: "#eed6af", foePlatform: "#e0c9a4", playerPlatform: "#d2bc9a" },
  casino: { spriteId: "battle:bg:casino", path: "ui/battle/casino.png", sky: "#7a423a", ground: "#6e162e", foePlatform: "#67142b", playerPlatform: "#601329" },
  laboratorio: { spriteId: "battle:bg:laboratorio", path: "ui/battle/laboratorio.png", sky: "#485868", ground: "#efddb9", foePlatform: "#e1d0ae", playerPlatform: "#d2c2a3" },
  archivio: { spriteId: "battle:bg:archivio", path: "ui/battle/archivio.png", sky: "#705045", ground: "#efd9b0", foePlatform: "#e1cca6", playerPlatform: "#d2bf9b" },
  ufficio: { spriteId: "battle:bg:ufficio", path: "ui/battle/ufficio.png", sky: "#9a907d", ground: "#f1daaf", foePlatform: "#e2cda4", playerPlatform: "#d4c09a" },
  bunker: { spriteId: "battle:bg:bunker", path: "ui/battle/bunker.png", sky: "#313a4b", ground: "#dec59d", foePlatform: "#d1ba93", playerPlatform: "#c3ae8a" },
  // Esterni con un luogo proprio: l'isola fiscale, il viale di Bruxelles e il campo della coalizione.
  offshore: { spriteId: "battle:bg:offshore", path: "ui/battle/offshore.png", sky: "#81ccde", ground: "#f3dcb1", foePlatform: "#e4cfa7", playerPlatform: "#d6c29c" },
  bruxelles: { spriteId: "battle:bg:bruxelles", path: "ui/battle/bruxelles.png", sky: "#adb4b4", ground: "#a19d9a", foePlatform: "#979490", playerPlatform: "#8e8a87" },
  campo: { spriteId: "battle:bg:campo", path: "ui/battle/campo.png", sky: "#77bed8", ground: "#5e9256", foePlatform: "#598a51", playerPlatform: "#53814c" }
} as const satisfies Record<string, BattleBackdrop>;

export type BattleBackdropId = keyof typeof BATTLE_BACKDROPS;
