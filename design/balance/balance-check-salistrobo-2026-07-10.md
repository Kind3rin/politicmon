# Balance Check — SALISTROBO → SALISOUND

## Data Sources Analyzed

- `design/content/atto3-roster.md`
- `src/data/species.ts`
- `src/data/moves.ts`
- `src/game/battle/sim.ts`
- `tests/unit/salistroboFamily.test.ts`

## Health Summary: HEALTHY

| Controllo | Target | Risultato |
|---|---:|---:|
| BST base | 304 | 304 |
| BST finale | 388–395 | 392 |
| ATK finale | cleaner fisico | 105 |
| SPD finale | sotto fast legacy | 98 |
| STAB affidabile | potenza ≤85 | FESTIVAL 75/100/15 |
| Sustain/immunità | assenti | assenti |

SALISOUND esercita pressione fisica ma non combina muro, cura o immunità.
OPPOSIZIONE richiede PV sotto il 50% e non rende il profilo dominante. FESTIVAL
usa il fallback P4-T01 approvato; il proc condizionale resta assegnato a P4-T07.

## Degenerate Strategies

Nessuna rilevata. SCISSIONE paga il picco con recoil; EDITORIALE usa la statistica
speciale più bassa e non compete col percorso fisico.

## Verdict

Approvato per integrazione. Rieseguire il check quando P4-T07 aggiungerà il proc
SCANDALO di FESTIVAL.
