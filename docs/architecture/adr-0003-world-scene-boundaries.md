# ADR-0003: Confini di WorldScene seam-first

## Status
Accepted

## Date
2026-07-10

## Engine Compatibility

| Field | Value |
|---|---|
| Engine | Canvas 2D + scene stack TypeScript |
| Domain | World / Core |
| Knowledge Risk | Low |
| References Consulted | `src/game/world/WorldScene.ts`, `src/engine/scene.ts` |
| Post-Cutoff APIs Used | None |
| Verification Required | lifecycle, input, battaglie, NPC, multiplayer fallback |

## ADR Dependencies

| Field | Value |
|---|---|
| Depends On | ADR-0002 per servizi che persistono stato |
| Enables | `atto3Controller`, routing NPC, R1 vertical slice |
| Blocks | Inserimento diretto della logica Atto 3 in `WorldScene` |
| Ordering Note | Refactor solo seam necessari, prima della feature |

## Context

`WorldScene.ts` supera 150 KB e orchestra movimento, rendering, NPC, battaglie,
trasporti, torneo e multiplayer. Una riscrittura completa sarebbe rischiosa; altra
logica inline renderebbe però impossibile testare Coalizione ed Elezioni.

## Decision

Applicare estrazione seam-first. `WorldScene` mantiene lifecycle, input, posizione,
camera, collisioni e rendering. Moduli esterni ricevono interfacce minime e non
importano la classe scena né il canvas.

```text
WorldScene
  ├─ worldContext (porte tipizzate verso stack/audio/message/state)
  ├─ npcInteraction (routing e risultato dichiarativo)
  ├─ battleCoordinator (start/end orchestration)
  └─ atto3Controller (comandi/query del nuovo flusso)
domain modules <- nessuna dipendenza da scene/UI
```

I risultati sono dati (`say`, `choice`, `startBattle`, `setFlag`, `openScene`),
tradotti dalla scena in effetti. Nessun event bus globale o service locator.

## Alternatives Considered

### Continuare con metodi privati inline
Minimo churn ma alta crescita e test fragili. Scartato.

### Riscrittura completa/ECS
Architettura teoricamente pulita, rischio enorme e nessun valore diretto per Atto 3. Scartato.

### Sottoclassi di WorldScene
Condividono stato implicito e creano override fragili. Scartato.

## Consequences

Positive: seam testabili e feature isolate. Negative: adattatori temporanei e
qualche passaggio esplicito in più. Rischio over-abstraction mitigato estraendo
solo routing NPC, coordinamento battaglia e comandi Atto 3.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|---|---|---|
| `PIANO.md` R0-T06 | Nessun blocco Atto 3 >100 righe nella scena | Controller e risultati dichiarativi |
| `PIANO.md` R1 | Vertical slice isolabile e testabile | Porte minime verso scena esistente |

## Performance Implications

Chiamate sincrone e oggetti piccoli solo su interazione/evento, non per tile o
pixel. Nessuna rete aggiuntiva. Vietate allocazioni nuove nel draw loop.

## Migration Plan

1. definire `WorldContext` senza cambiare comportamento;
2. estrarre routing NPC con regression test;
3. estrarre coordinamento start/end battaglia;
4. aggiungere controller Atto 3 dietro flag.

Ogni estrazione è un commit separato e deve mantenere smoke test campagna.

## Validation Criteria

- comportamento pre-refactor invariato;
- moduli estratti non importano `WorldScene`/`Screen`;
- controller testabile con fake context;
- multiplayer indisponibile resta singleplayer senza crash;
- nessuna regressione misurabile del frame time.

## Implementation Evidence

- `worldContext.ts`: comandi dichiarativi e porta minima;
- `npcInteraction.ts`: priorità di routing NPC pura e coperta da test;
- `battleCoordinator.ts`: costruzione team e persistenza vittorie fuori scena;
- `atto3Controller.ts`: seam iniettato nel routing NPC, inattivo fino a R1;
- smoke browser mondo e suite completa eseguiti il 2026-07-10.

## Related Decisions

- ADR-0001 Feature flags
- ADR-0002 Save schema
- ADR-0006 Ownership Coalizione ed Elezioni
