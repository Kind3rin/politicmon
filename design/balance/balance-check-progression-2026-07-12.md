# Balance Check: EXP e cattura

## Fonti analizzate

- `src/data/species.ts`
- `src/data/items.ts`
- `src/game/monster.ts`
- `src/game/battle/sim.ts`
- `design/gdd/game-concept.md`

## Esito: HEALTHY

### Progressione EXP

La curva richiede circa 1 KO selvatico al livello 5 e cresce gradualmente fino a
4,3 KO al livello 50 usando il rendimento mediano. I trainer valgono 0,7–2,7 KO
equivalenti. Non emergono dead zone superiori a 5 KO/livello né salti oltre due
livelli con un singolo avversario rappresentativo.

### Cattura

Budget a 25% PV con status:

| Fascia | Strumento | Peggiore ammesso |
|---|---|---:|
| Comuni, catch rate almeno 60 | SCHEDA ELETTORALE | 2 tentativi medi |
| Rari, catch rate 15–59 | SCHEDA ELETTORALE | 3 tentativi medi |
| Ultra rari, catch rate sotto 15 | SCHEDA BLINDATA | 6 tentativi medi |

Il caso peggiore reale è MATTARELLUX: 5,7 SCHEDONE medie. È un leggendario e
resta sotto il budget; una scheda base a PV pieni conserva il floor del 2%.

### Gate

`npm run audit:progression` ricalcola tutte le specie e fallisce su dead zone,
power spike o catture oltre budget. Va eseguito con ogni modifica a EXP,
catch rate, strumenti o cap livello.
