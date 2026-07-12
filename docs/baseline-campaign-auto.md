# Baseline campagna automatizzata

Simulazioni deterministiche: **400 per checkpoint**. Seed schema: `0x51f15e + scenario*10000 + run`.

| Checkpoint | Avversario | Win | Turni avg (p90) | KO giocatore | Cure | Esito |
|---|---|---:|---:|---:|---:|---|
| badge-auditel | SUA EMITTENZA | 63.5% | 11.1 (12) | 2.1 | 1 | OK |
| badge-spread | LADY DIRETTIVA | 99.8% | 10.9 (12) | 1.3 | 2 | OK |
| badge-dazio | MR. TYCOON | 95% | 12.5 (15) | 1.4 | 2.3 | OK |
| palazzo | PRESIDENTE OMBRA | 100% | 25.8 (29) | 0.9 | 4 | OK |
| garante | IL GARANTE SUPREMO | 100% | 28.6 (32) | 4.3 | 4.7 | OK |
| offshore | IL TESORIERE FANTASMA | 100% | 29.9 (36) | 2.6 | 4.9 | OK |
| bruxelles | LA COMMISSIONE | 99% | 27.5 (31) | 4.1 | 5.4 | OK |

## Limiti del modello

- Usa calcDamage e resolveTurn reali, ma non l'intera BattleScene.
- SONDAGGI e IA contestuale PVE non sono simulati.
- Gli hold item influenzano calcDamage; gli effetti hold di fine turno non sono simulati.
- Il giocatore usa fino al budget indicato di SPRITZ al 28% PV; ogni cura consuma il turno.
- Entrambi i lati scelgono per potenza, STAB, efficacia dei tipi e precisione; non pianificano switch o setup.
- I boss sono simulati isolati e a squadra integra: il modello non riproduce l'attrito di route e gauntlet.
- Le squadre checkpoint sono fixture plausibili, non telemetria di una partita umana.
- Questo profilo misura la sicurezza anti-grind di un party preparato; balance:bosses copre separatamente il primo tentativo senza consumabili.

Le anomalie sono diagnostiche: lo script non modifica livelli, statistiche o mosse.
