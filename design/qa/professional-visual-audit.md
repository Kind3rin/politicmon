# Audit visuale professionale

Generato: 2026-10-02T21:24:45.191Z

## Sintesi

- Scene: 50
- Scene con evidenza screenshot: 50/50
- Chiamate di clipping residue: 0
- Ellissi esplicite nelle scene: 115
- Politicmon PNG: 52
- PNG action di fallback: 10/52. Questo conteggio non misura le animazioni principali: i 52 fogli a quattro pose hanno priorità nel renderer e sono verificati da rosterSprites.test.ts e check:roster-animations.

## Scene senza screenshot associato

Nessuna.

## Scene con rischio testo

- `src/scenes/BackupScene.ts`: clip 0, ellissi 2
- `src/scenes/BagScene.ts`: clip 0, ellissi 1
- `src/scenes/BattleIntelScene.ts`: clip 0, ellissi 2
- `src/scenes/BossBriefingScene.ts`: clip 0, ellissi 3
- `src/scenes/CasinoScene.ts`: clip 0, ellissi 3
- `src/scenes/CoalitionScene.ts`: clip 0, ellissi 3
- `src/scenes/DexScene.ts`: clip 0, ellissi 2
- `src/scenes/DistrictScene.ts`: clip 0, ellissi 1
- `src/scenes/MafiaScene.ts`: clip 0, ellissi 2
- `src/scenes/MonumentScene.ts`: clip 0, ellissi 4
- `src/scenes/NicknameScene.ts`: clip 0, ellissi 1
- `src/scenes/PalaceArchiveScene.ts`: clip 0, ellissi 1
- `src/scenes/PartyScene.ts`: clip 0, ellissi 3
- `src/scenes/PauseScene.ts`: clip 0, ellissi 4
- `src/scenes/QuestScene.ts`: clip 0, ellissi 3
- `src/scenes/TeachScene.ts`: clip 0, ellissi 4
- `src/scenes/TitleScene.ts`: clip 0, ellissi 3
- `src/scenes/TournamentScene.ts`: clip 0, ellissi 2
- `src/scenes/TradeScene.ts`: clip 0, ellissi 5
- `src/scenes/WeeklyCampaignScene.ts`: clip 0, ellissi 1
- `src/game/battle/BattleScene.ts`: clip 0, ellissi 34
- `src/game/battle/PvpBattleScene.ts`: clip 0, ellissi 3
- `src/game/world/WorldScene.ts`: clip 0, ellissi 28

## Gate

Il gate strict passa solo con screenshot per ogni scena e zero clipping automatico.
