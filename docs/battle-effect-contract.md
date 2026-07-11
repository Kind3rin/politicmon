# Contratto effetti battaglia

Fonte autoritativa: `src/game/battle/effectContract.ts`.

Ordine invariabile del turno:

1. `preMove` — INDAGATO, GAFFE;
2. `damage` — unica formula `calcDamage` in `sim.ts`;
3. `postMove` — drain, recoil, cura, cure status, stage, status e immunità;
4. `switch` — reset combattente e VOLTAGABBANA;
5. `ko` — prima bersaglio, poi attaccante in caso di recoil;
6. `endTurn` — SCANDALO, GALLEGGIAMENTO, quindi CAFFETTIERA in PvE.

## Parità PvE/PvP

| Effetto | Fase | Parità | Nota |
|---|---|---|---|
| INDAGATO / GAFFE | preMove | condiviso | Risolti da `resolvePreMove` |
| Formula danno, abilità offensive/difensive | damage | condiviso | `calcDamage`; PvE passa il contesto SONDAGGI |
| Drain, recoil, heal, cure, stat, status | postMove | condiviso | Stessa semantica; presentazione diversa |
| TEFLON / GARANZIA / POLTRONA | postMove | condiviso | Helper di blocco condivisi |
| TELECAMERA | postMove | solo PvE | Gli hold item non viaggiano nel protocollo PvP v1 |
| VOLTAGABBANA | switch | condiviso | Applicato da `makeCombatant` |
| KO | ko | condiviso | PvE aggiunge EXP, loot e progressione |
| SCANDALO / GALLEGGIAMENTO | endTurn | condiviso | `resolveEndTurn(..., false)` in PvP |
| CAFFETTIERA | endTurn | solo PvE | `resolveEndTurn(..., true)` |

## Regola di estensione

Ogni nuovo effetto deve:

- avere un ID univoco in `EFFECT_HANDLERS`;
- dichiarare fase, sorgente e parità;
- vivere in una regola pura se condiviso;
- avere test sull’ordine rispetto agli effetti della stessa fase;
- evitare formule replicate in `BattleScene` o `PvpBattleScene`.

Le scene restano adattatori: mutano lo stato seguendo il risultato puro e
aggiungono testo, animazioni, audio e avanzamento della coda.
