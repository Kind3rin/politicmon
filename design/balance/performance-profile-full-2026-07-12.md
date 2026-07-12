# Performance Profile: full

## Budget e misure

| Metrica | Budget | Corrente | Esito |
|---|---:|---:|---|
| Frame interval p95 | 33,4 ms | 16,7–16,8 ms | OK |
| Frame massimo | 100 ms | sotto 100 ms | OK |
| Bundle iniziale gzip | 250 KiB | 212,7 KiB | OK |
| Bundle totale gzip | 350 KiB | 325,4 KiB | OK |
| Parse/serialize save | 10 ms | sotto 10 ms | OK |

## Hotspot

| Priorità | Punto | Problema | Intervento |
|---|---|---|---|
| P0 | `TitleScene` → `WorldScene` | import eager dell'intera campagna | dynamic import completato |
| P1 | `WorldScene.ts` | 4.004 righe, responsabilità miste | estrarre spawn/render NPC/trasporti |
| P1 | `BattleScene.ts` | 2.239 righe, reward e messaggi accoppiati | estrarre post-battle pipeline |

Il primo intervento riduce il bootstrap del 34,5% senza diminuire contenuti. Il
confine asincrono è coperto da E2E multi-slot (11/11), smoke campagna (6/6), test
unitari e `perf:check`. I refactor P1 restano necessari per manutenibilità, non
per recuperare frame budget immediato.
