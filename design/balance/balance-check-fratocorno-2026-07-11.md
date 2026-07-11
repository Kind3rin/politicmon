# Balance Check: FRATOCORNO → CAMPOCORNO

## Data Sources Analyzed

- `design/content/atto3-roster.md`
- `src/data/species.ts`
- `src/data/moves.ts`
- `src/game/battle/effectContract.ts`
- `src/data/maps/atto3.ts`

## Health Summary: HEALTHY

FRATOCORNO (BST 304) è un support robusto; CAMPOCORNO (BST 390) raggiunge
HP 88/DEF 94/SPC 94 ma resta lento a SPD 50. GALLEGGIAMENTO cura soltanto 1/16
a fine turno e AUREOLA ha 5 PP: il sustain è forte ma limitato.

## Outliers Detected

| Voce | Atteso | Valore | Esito |
|---|---:|---:|---|
| BST base | 300-308 | 304 | OK |
| BST finale | 386-394 | 390 | OK |
| Cure forti naturali | escluse | nessuna FIDUCIA | OK |
| AUREOLA | limite sustain | 5 PP | OK |
| Encounter Campo Largo | secondario | 35% del pool | OK |

## Degenerate Strategies Found

Nessuna. Il learnset esclude FIDUCIA e TAVOLO LUNGO; GALLEGGIAMENTO non agisce
a PV pieni e non rimuove status. La velocità bassa lascia finestre di pressione.

## Progression Analysis

L'evoluzione a livello 32 sblocca PIAZZA; AUREOLA, TRANSIZIONE e GAZZETTA arrivano
ai livelli 35/38/42. Entrambi gli STAB finali restano disponibili.

## Recommendations

| Priorità | Tema | Azione | Impatto |
|---|---|---|---|
| P2 | TTK | Misurare duelli lunghi con GALLEGGIAMENTO | Evita stall |
| P3 | Habitat | Rivedere peso 35 dopo dati Campo Largo | Ritmo collezione |

## Values That Need Attention

Nessuna correzione preventiva. Non aggiungere FIDUCIA o TAVOLO LUNGO al learnset.
