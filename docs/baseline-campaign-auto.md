# Baseline campagna automatizzata

Simulazioni deterministiche: **400 per checkpoint**. Seed schema: `0x51f15e + scenario*10000 + run`.

| Checkpoint | Avversario | Win | Turni avg (p90) | KO giocatore | Cure | Esito |
|---|---|---:|---:|---:|---:|---|
| badge-auditel | SUA EMITTENZA | 63.5% | 11.1 (12) | 2.1 | 1 | OK |
| badge-spread | LADY DIRETTIVA | 99.8% | 10 (11) | 0.3 | 1.9 | OK |
| badge-dazio | MR. TYCOON | 95% | 12.5 (15) | 1.4 | 2.3 | OK |
| palazzo | PRESIDENTE OMBRA | 100% | 20 (24) | 0.2 | 3.2 | OK |
| garante | IL GARANTE SUPREMO | 100% | 28.6 (32) | 4.3 | 4.7 | OK |
| offshore | IL TESORIERE FANTASMA | 100% | 29.9 (36) | 2.6 | 4.9 | OK |
| bruxelles | LA COMMISSIONE | 99% | 27.5 (31) | 4.1 | 5.4 | OK |

## Matrice di 10 campagne complete

Ogni profilo attraversa i 7 checkpoint in ordine e può riprovare un boss fino a 8 volte dopo il recupero della squadra.

| Profilo | Checkpoint | Tentativi | Sconfitte | Turni | Cure | Esito |
|---|---:|---:|---:|---:|---:|---|
| standard-a | 7/7 | 7 | 0 | 132 | 23 | COMPLETA |
| standard-b | 7/7 | 8 | 1 | 144 | 22 | COMPLETA |
| standard-c | 7/7 | 8 | 1 | 152 | 25 | COMPLETA |
| starter-sinistra | 7/7 | 7 | 0 | 186 | 23 | COMPLETA |
| starter-centro | 7/7 | 10 | 3 | 202 | 27 | COMPLETA |
| ordine-inverso | 7/7 | 9 | 2 | 161 | 24 | COMPLETA |
| sinistra-parsimonioso | 7/7 | 9 | 2 | 177 | 17 | COMPLETA |
| sopra-livello | 7/7 | 7 | 0 | 141 | 24 | COMPLETA |
| parsimonioso | 7/7 | 9 | 2 | 148 | 13 | COMPLETA |
| rifornito | 7/7 | 8 | 1 | 180 | 34 | COMPLETA |

## Limiti del modello

- Usa calcDamage e resolveTurn reali, ma non l'intera BattleScene.
- SONDAGGI e IA contestuale PVE non sono simulati.
- Gli hold item influenzano calcDamage; gli effetti hold di fine turno non sono simulati.
- Il giocatore usa fino al budget indicato di SPRITZ al 28% PV; ogni cura consuma il turno.
- Entrambi i lati scelgono per potenza, STAB, efficacia dei tipi e precisione; non pianificano switch o setup.
- I boss sono simulati isolati e a squadra integra: il modello non riproduce l'attrito di route e gauntlet.
- Le squadre checkpoint sono fixture plausibili, non telemetria di una partita umana.
- Le campagne fixture consentono fino a 8 tentativi per boss e ripartono a squadra integra dopo una sconfitta.
- Questo profilo misura la sicurezza anti-grind di un party preparato; balance:bosses copre separatamente il primo tentativo senza consumabili.

Le anomalie sono diagnostiche: lo script non modifica livelli, statistiche o mosse.
