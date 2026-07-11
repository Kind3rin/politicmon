# ADR-0004: Registry mappe modulare con facade compatibile

## Status
Accepted

## Date
2026-07-10

## Engine Compatibility

| Field | Value |
|---|---|
| Engine | TypeScript data modules + Vite |
| Domain | World Data |
| Knowledge Risk | Low |
| References Consulted | `src/data/maps.ts`, check script mappe |
| Post-Cutoff APIs Used | None |
| Verification Required | identità registry, warp, factory, bundle |

## ADR Dependencies

| Field | Value |
|---|---|
| Depends On | None |
| Enables | Mappe Atto 3 senza crescita del monolite |
| Blocks | Nuove mappe nello stesso commit dello split |
| Ordering Note | Split meccanico prima dei contenuti R1 |

## Context

`src/data/maps.ts` supera 100 KB e contiene tipi, factory, regioni e costanti.
L’Atto 3 aggiungerà più aree. Serve modularizzare senza cambiare gli oltre cento
import/call site che consumano `MAPS`, `BAR_RESPAWN` e `STARTER_SPOTS`.

## Decision

Dividere per responsabilità e regione, preservando una facade con la stessa API.

```text
maps/types.ts
maps/factories.ts
maps/base.ts
maps/interiors.ts
maps/postgame.ts
maps/atto3.ts
maps/index.ts -> MAPS, BAR_RESPAWN, STARTER_SPOTS
maps.ts       -> re-export temporaneo
```

Ogni modulo esporta un record parziale. `index.ts` verifica collisioni ID in DEV
prima della composizione. Le factory non leggono stato globale. Atto 3 vive solo
nel proprio modulo.

## Alternatives Considered

### Un file per singola mappa
Granularità eccessiva e molti import. Scartato.

### JSON esterno
Perde typing/funzioni NPC attuali e richiede migrazione ampia. Scartato ora.

### Lasciare il monolite
Nessun costo immediato ma conflitti e navigazione peggiorano. Scartato.

## Consequences

Positive: ownership regionale, diff piccoli, facade stabile. Negative: rischio di
cicli tra factory e regioni; mitigazione con dipendenza unidirezionale
`types <- factories <- regions <- index`.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|---|---|---|
| `PIANO.md` R0-T05 | Split senza redesign | Re-export e record parziali |
| `PIANO.md` R1–R3 | Nuove aree isolate | Modulo `atto3.ts` |

## Performance Implications

Composizione una volta al caricamento modulo, memoria equivalente. Il bundler può
comunque includere tutte le mappe; il code splitting non è obiettivo di questo ADR.

## Migration Plan

Spostare tipi, factory e una regione per commit. Dopo ogni passaggio confrontare
chiavi registry e avviare check mappe/porte/uscite. Rimuovere la facade legacy solo
quando tutti gli import sono migrati e il churn è giustificato.

## Validation Criteria

- stesso insieme di ID e stessa serializzazione essenziale prima/dopo;
- zero ID duplicati;
- tutti i check mappe passano;
- nessuna nuova mappa nei commit di refactor;
- build e screenshot mondo invariati.

## Related Decisions

- ADR-0003 Confini WorldScene

## Implementation Evidence

Facade compatibile e registry suddiviso in `src/data/maps/`; contract test su 40
mappe e validator statici completi eseguiti il 2026-07-10.
