## Technical Debt Register

Last updated: 2026-06-30
Total items: 6 | Estimated total effort: 2×L + 2×M + 2×S

Scan note: codebase molto pulito sul piano dei marker — zero TODO/FIXME/HACK/@deprecated,
zero `as any`/`@ts-ignore`/`eslint-disable` in `src/`. Il debito reale è strutturale
(god objects), di copertura (nessun test) e di dipendenze (major arretrati).

| ID | Category | Description | Files | Effort | Impact | Priority | Added | Sprint |
|----|----------|-------------|-------|--------|--------|----------|-------|--------|
| TD-001 | Code Quality | God object: WorldScene fa load mappa + encounter + eventi morale + PG vaganti + rivale + MP + guida + veicoli (2393 righe, 4.8× soglia 500). Estrarre sotto-sistemi (es. EncounterController, StreetEventController, RemotePlayersRenderer). | `src/game/world/WorldScene.ts` | L | High | 8 | 2026-06-30 | Backlog |
| TD-002 | Code Quality | God object: BattleScene = coda Step + animazioni + loot + EXP + teaser (2049 righe, 4× soglia). Separare presentazione da orchestrazione coda. | `src/game/battle/BattleScene.ts` | L | High | 7 | 2026-06-30 | Backlog |
| TD-003 | Test | Zero test su 16.780 LOC. `sim.ts` (danno gen-1, tipi, cattura) e `governo.ts` (sondaggi/ministeri) sono logica pura: una regressione di bilanciamento non viene catturata. Aggiungere unit test mirati su questi due moduli. | `src/game/battle/sim.ts`, `src/game/governo.ts` | M | Critical | 12 | 2026-06-30 | Backlog |
| TD-004 | Dependency | Vite 6.4.3 → 8.1.0 (due major). Rischio breaking su build/PWA/sw.js. Upgrade da fare isolato con verifica build + PWA install. | `package.json` | M | Med | 4 | 2026-06-30 | Backlog |
| TD-005 | Dependency | TypeScript 5.9.3 → 6.0.3 (un major). Possibili nuovi errori strict. Upgrade + `npm run typecheck`. | `package.json` | S | Med | 5 | 2026-06-30 | Backlog |
| TD-006 | Code Quality | File dati/art vicini alla soglia (monsters.ts 497, characters.ts 473, audio.ts 466). Accettabile per ora (contenuto, non logica) ma monitorare la crescita. | `src/art/monsters.ts`, `src/art/characters.ts`, `src/engine/audio.ts` | S | Low | 2 | 2026-06-30 | Accepted |

### Accepted debt (conscious)
- `maps.ts` (1722) e `tiles.ts` (972): superano la soglia ma sono **dati** (mappe ASCII, pixel-map),
  non logica. Split non porterebbe valore. Accettato.
- TD-006: file art near-soglia accettati finché restano dati statici.

### Rules
- Tech debt è uno strumento, non un male in sé. Il register traccia decisioni consapevoli.
- Ogni voce spiega il PERCHÉ è accettata o rimandata.
- Rilanciare `/tech-debt scan` a ogni milestone per intercettare debito nuovo.
- Voci ferme da >3 milestone: fixare o accettare con motivo documentato.
