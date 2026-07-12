## Technical Debt Register

Last updated: 2026-07-12
Open items: 5 | Resolved items: 1 | Estimated open effort: 2×L + 1×M + 2×S

Scan note: codebase molto pulito sul piano dei marker — zero TODO/FIXME/HACK/@deprecated,
zero `as any`/`@ts-ignore`/`eslint-disable` in `src/`. Il debito reale è strutturale
(god objects), di copertura (nessun test) e di dipendenze (major arretrati).

| ID | Category | Description | Files | Effort | Impact | Priority | Added | Sprint |
|----|----------|-------------|-------|--------|--------|----------|-------|--------|
| TD-001 | Code Quality | God object: WorldScene resta a 3868 righe. Spawn/interruzioni, rendering NPC e trasporti sono ora moduli separati; restano lifecycle, multiplayer, guida e veicoli. | `src/game/world/WorldScene.ts`, `src/game/world/*` | L | High | 8 | 2026-06-30 | In progress |
| TD-002 | Code Quality | BattleScene resta grande, ma formule/effetti condivisi, coordinamento e piano post-battaglia (payout, messaggi, teaser, loot) sono moduli separati. Restano coda Step e presentazione. | `src/game/battle/BattleScene.ts`, `src/game/battle/postBattle.ts` | L | High | 7 | 2026-06-30 | In progress |
| TD-004 | Dependency | Vite 6.4.3 → 8.1.0 (due major). Rischio breaking su build/PWA/sw.js. Upgrade da fare isolato con verifica build + PWA install. | `package.json` | M | Med | 4 | 2026-06-30 | Backlog |
| TD-005 | Dependency | TypeScript 5.9.3 → 6.0.3 (un major). Possibili nuovi errori strict. Upgrade + `npm run typecheck`. | `package.json` | S | Med | 5 | 2026-06-30 | Backlog |
| TD-006 | Code Quality | File dati/art vicini alla soglia (monsters.ts 497, characters.ts 473, audio.ts 466). Accettabile per ora (contenuto, non logica) ma monitorare la crescita. | `src/art/monsters.ts`, `src/art/characters.ts`, `src/engine/audio.ts` | S | Low | 2 | 2026-06-30 | Accepted |

### Accepted debt (conscious)
- `maps.ts` (1722) e `tiles.ts` (972): superano la soglia ma sono **dati** (mappe ASCII, pixel-map),
  non logica. Split non porterebbe valore. Accettato.
- TD-006: file art near-soglia accettati finché restano dati statici.

### Resolved

- **TD-003 (2026-07-12):** 197 test complessivi coprono formule battaglia,
  cattura, tipi, SONDAGGI, governo, save, progressione ed economie; aggiunti gate
  dedicati `audit:progression`, `balance:bosses` e `audit:economy`.

### Rules
- Tech debt è uno strumento, non un male in sé. Il register traccia decisioni consapevoli.
- Ogni voce spiega il PERCHÉ è accettata o rimandata.
- Rilanciare `/tech-debt scan` a ogni milestone per intercettare debito nuovo.
- Voci ferme da >3 milestone: fixare o accettare con motivo documentato.
