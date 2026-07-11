# ADR-0006: Ownership di Coalizione, Territori ed Elezioni

## Status
Accepted

## Date
2026-07-10

## Engine Compatibility

| Field | Value |
|---|---|
| Engine | TypeScript domain modules + Canvas UI |
| Domain | Gameplay / State |
| Knowledge Risk | Low |
| References Consulted | `src/game/governo.ts`, `src/game/state.ts`, `src/data/quests.ts`, `PIANO.md` |
| Post-Cutoff APIs Used | None |
| Verification Required | formule boundary, save, quest, UI, finale |

## ADR Dependencies

| Field | Value |
|---|---|
| Depends On | ADR-0001, ADR-0002, ADR-0003 |
| Enables | P2-T01..05, R1 vertical slice, R2 Election Night |
| Blocks | Implementazione Coalizione/Territori nelle scene |
| Ordering Note | Decisione ownership accettata; attivazione feature bloccata finché GDD Coalizione e Territori non superano review |

## Context

Coalizione, consenso territoriale e risultato elettorale interagiscono con
Sondaggi, Governo Ombra, quest e finali. Senza ownership unica, scene e NPC
scriverebbero direttamente flag e valori producendo combinazioni invalide.

## Decision

Separare due moduli dominio con stato persistito nel `GameState` ma mutato solo
tramite comandi:

```text
UI/World controller
   | commands                 | queries
   v                          v
coalition.ts <---------- GameState.coalition
election.ts  <---------- GameState.election
   |
DomainEvent[] -> controller -> dialoghi/audio/quest/save
```

`coalition.ts` possiede alleati, slot, assetto, linee rosse e rotture.
`election.ts` possiede collegi, consenso locale, risoluzione e seggi. Sondaggi
nazionale resta di `governo.ts`; i nuovi moduli lo leggono come input e producono
delta/eventi, senza scriverlo direttamente.

Comandi ritornano `Result<StatePatch, DomainError>` o equivalente e una lista di
eventi semantici. Query e formule sono pure. Clock/RNG sono parametri dove servono.
La UI non determina regole e non possiede copie autorevoli.

## Alternatives Considered

### Un unico modulo campagna
Meno file ma ownership confusa e crescita monolitica. Scartato.

### Stato solo in flag generici
Compatibile col sistema quest ma non tipizzato né validabile. Scartato.

### Classi mutabili con singleton
Comode per le scene ma difficili da migrare/testare e duplicano autorità. Scartato.

## Consequences

Positive: invarianti centralizzati, test puri, finali riproducibili. Negative:
adattatori per `GameState` e più tipi. Rischi: patch parziali e cicli con Governo;
mitigazioni: transazioni comando atomiche e dipendenza unidirezionale su input/query.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|---|---|---|
| `PIANO.md` Coalizione | slot, bonus, linee rosse, rotture | Ownership e comandi dedicati |
| `PIANO.md` Territori | 5 collegi, consenso e seggi leggibili | Modulo elezione puro |
| `PIANO.md` R1 | Slice con 1 collegio senza schema provvisorio | Schema estendibile definitivo |

## Performance Implications

Operazioni O(numero alleati/collegi), pool massimo piccolo. Nessuna rete. Stato
aggiuntivo contenuto. Le query UI possono essere calcolate on-demand; nessuna
elaborazione per-frame necessaria.

## Migration Plan

1. approvare GDD e questo ADR;
2. aggiungere tipi/default e migrazione secondo ADR-0002;
3. implementare funzioni pure con test boundary;
4. integrare controller dietro flag;
5. aggiungere UI e quest;
6. attivare solo dopo Gate R1/R2.

## Validation Criteria

- slot/duplicati/linee rosse coperti ai boundary;
- clamp territori e pareggi deterministici;
- nessuna scrittura diretta dalle scene;
- save vecchio carica con stato vuoto valido;
- comando fallito non applica patch parziale;
- finale riproducibile dallo stesso stato;
- feature flag off preserva la campagna esistente.

## Related Decisions

- ADR-0001 Feature flags
- ADR-0002 Save schema
- ADR-0003 Confini WorldScene
- ADR-0005 Schema eventi satirici

## Implementation Note

Decisione architetturale accettata per R1. L’implementazione del dominio resta
vincolata ai gate R1/R2 e ai feature flag; questo stato non dichiara la feature pronta.
