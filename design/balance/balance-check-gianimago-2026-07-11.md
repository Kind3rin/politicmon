# Balance Check: GIANIMAGO → QUASIMAGIANI

## Data Sources Analyzed

- `design/content/atto3-roster.md`
- `src/data/species.ts`
- `src/data/moves.ts`
- `src/data/abilities.ts`
- `src/game/battle/sim.ts`
- `src/game/battle/duelsim.ts`

## Health Summary: HEALTHY

GIANIMAGO (BST 304) entra come setup speciale fragile; QUASIMAGIANI (BST 395)
raggiunge SPC 112 e SPD 86 ma conserva DEF 68 e HP 74. La famiglia offre alto
payoff senza superare la fascia veloce legacy.

## Outliers Detected

| Voce | Atteso | Valore | Esito |
|---|---:|---:|---|
| BST base | 300-308 | 304 | OK |
| BST finale | 388-398 | 395 | OK |
| EXIT POLL | 60/100 a soglia 50% | 60/100 | OK |
| FORCHETTA | 0,85× / 1,15× | equiprobabile | OK |

## Degenerate Strategies Found

Nessuna. FORCHETTA SONDAGGI sostituisce il roll standard e non si cumula con
esso; si applica solo alle mosse speciali dannose. La media aritmetica è 1,00×,
quindi aumenta la varianza senza aumentare il danno atteso. EXIT POLL premia il
gioco ad alti PV ma precisione 90 e PP 10 ne limitano l'affidabilità.

## Progression Analysis

L'evoluzione a livello 32 coincide con l'accesso a EXIT POLL. ALGORITMO,
EDITORIALE e RAZZO X arrivano ai livelli 35/38/42, evitando un picco completo
in un solo livello.

## Recommendations

| Priorità | Tema | Azione | Impatto |
|---|---|---|---|
| P2 | Telemetria | Registrare STIMA BASSA/ALTA e KO | Verifica frustrazione percepita |
| P3 | PvP | Controllare combinazioni con boost SPC | Evita burst oltre ruolo |

## Values That Need Attention

Nessun valore richiede correzione preventiva. Rivalutare precisione di EXIT POLL
solo se i test automatici di match-up mostrano win rate fuori 45-55%.
