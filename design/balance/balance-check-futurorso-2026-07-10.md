# Balance Check: FUTURORSO

## Data Sources Analyzed

- `design/content/atto3-roster.md`
- `src/data/species.ts`
- `src/data/abilities.ts`
- `src/data/items.ts`
- `src/game/battle/effectContract.ts`
- `src/game/battle/duelsim.ts`

## Health Summary: HEALTHY

FUTURORSO ha BST 390, entro 2 punti da GENERORSO come richiesto. Il profilo
94/101/89/48/58 produce un bruiser fisico lento: più resiliente e offensivo,
ma privo di velocità e pressione speciale. Non domina il ramo esistente perché
richiede un oggetto unico e TABULA RASA cancella anche i propri potenziamenti.

## Outliers Detected

| Voce | Atteso | Valore | Esito |
|---|---:|---:|---|
| BST FUTURORSO | 388-392 | 390 | OK |
| Scarto da GENERORSO | <=2 | 2 | OK |
| Attacco | bruiser fisico | 101 | OK |
| Velocità | lenta | 58 | OK |
| Catch rate | evoluzione rara | 30 | OK |

## Degenerate Strategies Found

Nessuna. TABULA RASA si attiva a ogni ingresso ma azzera simmetricamente entrambi
i lati; lo switch ripetuto costa turni e non crea accumulo. Non tocca PV, status,
PP o flag one-shot. La TESSERA FUTURO è premio unico del boss e non è vendibile.

## Progression Analysis

Il ramo oggetto è esplicito e non interferisce col ramo GENERORSO a livello 20:
`itemEvolution` considera solo la tessera, `levelEvolution` solo le regole livello.
Il learnset porta il kit completo tra i livelli 32 e 40, coerente con l'Atto 3.

## Recommendations

| Priorità | Tema | Azione | Impatto |
|---|---|---|---|
| P2 | Telemetria | Misurare frequenza degli switch TABULA RASA | Conferma costo opportunità |
| P3 | PvP | Sorvegliare stall basato su switch | Nessun intervento preventivo |

## Values That Need Attention

Nessun valore richiede correzione prima dell'integrazione. Rivalutare soltanto
dopo dati reali di Atto 3 o almeno 30 duelli automatizzati.
