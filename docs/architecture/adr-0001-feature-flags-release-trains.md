# ADR-0001: Feature flags e release train

## Status
Accepted

## Date
2026-07-10

## Engine Compatibility

| Field | Value |
|---|---|
| Engine | TypeScript 5.8 + Vite 6 + Canvas 2D browser/PWA |
| Domain | Core / Release |
| Knowledge Risk | Low |
| References Consulted | `package.json`, `vite.config.ts`, `src/main.ts`, `public/sw.js` |
| Post-Cutoff APIs Used | None |
| Verification Required | DEV override, production defaults, PWA update/rollback |

## ADR Dependencies

| Field | Value |
|---|---|
| Depends On | None |
| Enables | ADR-0005, ADR-0006; R0-T02; release R1–R5 |
| Blocks | Merge di feature Atto 3 incomplete senza isolamento |
| Ordering Note | Implementare prima di qualunque entry point Atto 3 |

## Context

L’espansione verrà consegnata in più release. Il gioco è una PWA senza backend e
il service worker aggiorna automaticamente gli asset. Serve poter integrare codice
incompleto senza renderlo raggiungibile né rendere il save dipendente dal rollout.

Vincoli: zero servizio remoto di flag, comportamento offline, override solo DEV,
rollback senza downgrade distruttivo del salvataggio.

## Decision

Creare un registry tipizzato in `src/game/features.ts`. Ogni flag ha default di
produzione, dipendenze, release owner e stato. I consumer interrogano una funzione
unica; non leggono direttamente query string o localStorage.

```text
build defaults ─┐
DEV overrides ──┼─> feature registry ─> isFeatureEnabled(id)
dependencies ───┘
```

Flag iniziali: `atto3`, `coalition`, `territories`, `memeEvents`,
`weeklyCampaign`. Tutti false in produzione fino al gate della rispettiva release.
Gli override DEV sono namespaced e ignorati in PROD. Le dipendenze invalide
producono errore in DEV e flag disabilitato in PROD.

## Alternatives Considered

### Branch lunghi senza flag
Semplice inizialmente, ma aumenta divergenza e rischio d’integrazione. Scartato.

### Servizio remoto di feature management
Rollout dinamico, ma introduce backend, privacy, costo e dipendenza online. Scartato.

### Booleani sparsi nelle scene
Veloce ma non inventariabile né testabile. Scartato.

## Consequences

Positive: merge piccoli, rollback dell’accesso, test matrice on/off. Negative:
rami temporanei e debito di rimozione. Rischio principale: combinazioni di flag;
mitigazione tramite dipendenze dichiarate e test delle sole configurazioni supportate.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|---|---|---|
| `PIANO.md` R0/R1–R5 | Ogni treno deve essere rilasciabile indipendentemente | Registry centrale e default sicuri |
| `PIANO.md` Live Satire | Pack disattivabili senza rompere il gioco | Flag `memeEvents` separato |

## Performance Implications

Lookup O(1), memoria trascurabile, nessuna rete. I flag non vanno interrogati in
loop per-pixel; le scene possono leggere lo stato all’ingresso.

## Migration Plan

Introdurre registry con tutti i flag false, aggiungere test, poi collegare i nuovi
entry point. Nessuna modifica al `GameState`.

## Validation Criteria

- tutti off = comportamento pre-Atto 3;
- override DEV non attivo in build produzione;
- dipendenze validate;
- PWA aggiornata mantiene save e può nascondere un treno incompleto.

## Related Decisions

- ADR-0002 Save schema e migrazioni
- ADR-0005 Schema eventi contenuto
- ADR-0006 Ownership Coalizione ed Elezioni

## Implementation Evidence

Registry implementato in `src/game/features.ts`; default produzione fail-closed,
override namespaced solo DEV e dipendenze coperti da test unitari il 2026-07-10.
