# Balance Check: CROSETTANK

## Data Sources Analyzed

- `design/content/atto3-roster.md`
- `src/data/species.ts`
- `src/data/moves.ts`
- `src/game/battle/sim.ts`
- `src/game/battle/effectContract.ts`

## Health Summary: HEALTHY

CROSETTANK ha BST 388 e profilo da muro fisico puro: HP 104, DEF 108, SPD 42.
Non possiede cura naturale. La difesa speciale dichiarativa 58 rende finalmente
reale il counter previsto dalla specifica senza cambiare le specie legacy.

## Outliers Detected

| Voce | Atteso | Valore | Esito |
|---|---:|---:|---|
| BST | 384-392 | 388 | OK |
| DEF fisica | muro | 108 | OK |
| Difesa speciale | vulnerabile | 58 | OK |
| Velocità | lenta | 42 | OK |
| Cure naturali | nessuna | 0 | OK |

## Degenerate Strategies Found

Nessuna. POLTRONA impedisce i cali statistici nemici, ma non cura, non riduce il
danno e non protegge dagli status. Gli attaccanti speciali possono aggirare DEF 108.

## Progression Analysis

Il learnset alterna pressione e utilità tra i livelli 26 e 38. FIDUCIA non cura;
QUORUM e TAVOLO LUNGO arrivano tardi e non eliminano il counter speciale.

## Recommendations

| Priorità | Tema | Azione | Impatto |
|---|---|---|---|
| P2 | UI | Rendere leggibile nel Dex la vulnerabilità speciale | Migliora scelta tattica |
| P3 | Match-up | Misurare TTK fisico e speciale a livello 35 | Conferma ruolo 3-7 colpi |

## Values That Need Attention

Nessun valore richiede correzione preventiva. Non aggiungere mosse di cura o
riduzione danno al learnset naturale.
