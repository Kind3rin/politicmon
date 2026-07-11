# ADR-0002: Schema salvataggi e migrazioni forward-only

## Status
Accepted

## Date
2026-07-10

## Engine Compatibility

| Field | Value |
|---|---|
| Engine | TypeScript 5.8 + Web Storage API |
| Domain | Persistence |
| Knowledge Risk | Low |
| References Consulted | `src/game/state.ts`, `docs/HANDOFF.md` |
| Post-Cutoff APIs Used | None |
| Verification Required | localStorage, backup, multi-slot, import/export, PWA update |

## ADR Dependencies

| Field | Value |
|---|---|
| Depends On | None |
| Enables | ADR-0006, R0-T04, P0-T01 |
| Blocks | Nuovi campi persistenti Atto 3 |
| Ordering Note | Accettare prima dello schema Coalizione/Territori |

## Context

Il save v13 usa tre slot, backup e migrazione di chiavi legacy. L’Atto 3 aggiunge
stato ramificato e contenuti stagionali. Una regressione del parser può perdere
progressi accumulati; i feature flag non devono decidere se un campo viene letto.

## Decision

Separare parsing/normalizzazione pura dall’I/O Web Storage. Ogni versione supportata
ha fixture immutabile. Le migrazioni sono forward-only, idempotenti e applicate in
ordine; campi ignoti vengono ignorati, campi mancanti ricevono default sicuri.

```text
raw JSON -> decode/validate -> migrate(vN..current) -> normalize -> GameState
GameState -> serialize -> backup previous -> write primary -> verify parse
```

La versione resta incorporata nella base key secondo la convenzione esistente.
Ogni cambio di forma richiede bump, legacy key e test. Nessun downgrade automatico.
I dati stagionali ottenuti non vengono cancellati alla scadenza del contenuto.

## Alternatives Considered

### Parser monolitico incrementale
È il modello corrente ma diventa difficile coprire ogni ramo. Scartato per i nuovi campi.

### Database IndexedDB
Più strutturato ma sproporzionato per il volume dati e aumenta la complessità async. Scartato.

### Reset dei save incompatibili
Inaccettabile per un gioco già distribuito. Scartato.

## Consequences

Positive: migrazioni riproducibili, fixture reali, ownership chiara. Negative:
più codice di compatibilità. Rischi: fixture con dati personali e migrazioni che
mutano input; mitigazioni: fixture sintetiche/anonime e deep clone nei test.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|---|---|---|
| `PIANO.md` R0-T04 | Fixture v13 e parser testabile | Pipeline pura e fixture immutabili |
| `PIANO.md` R1–R5 | Stato ramificato e stagionale compatibile | Migrazioni ordinate e retention dati ottenuti |

## Performance Implications

Parsing O(dimensione save), nessuna rete. Misurare tempo serialize/parse; evitare
scritture per-frame. Il backup raddoppia temporaneamente lo storage come già oggi.

## Migration Plan

Prima estrarre una funzione pura che riproduce esattamente `parseState`; congelare
fixture v13; solo dopo introdurre la pipeline versionata. Refactor e nuovi campi in
commit distinti.

## Validation Criteria

- fixture nuova/post-medaglie/post-Garante/post-UE caricate;
- primary corrotto recuperato dal backup;
- round-trip import/export stabile;
- migrazione eseguita due volte produce lo stesso stato;
- flag off non rende il save illeggibile.

## Related Decisions

- ADR-0001 Feature flags
- ADR-0006 Ownership Coalizione ed Elezioni

## Implementation Evidence

Parser/serializer puri, migrazione v13→v14, fixture storiche, round-trip,
idempotenza e recovery backup coperti dalla suite integration il 2026-07-10.
