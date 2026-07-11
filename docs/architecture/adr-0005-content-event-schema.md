# ADR-0005: Schema dichiarativo degli eventi satirici

## Status
Accepted

## Date
2026-07-10

## Engine Compatibility

| Field | Value |
|---|---|
| Engine | TypeScript/Vite PWA offline |
| Domain | Content / Narrative |
| Knowledge Risk | Low |
| References Consulted | `src/data/streetevents.ts`, `src/game/dailyquests.ts`, `PIANO.md` |
| Post-Cutoff APIs Used | None |
| Verification Required | date locale, fonti HTTPS, scadenza, save |

## ADR Dependencies

| Field | Value |
|---|---|
| Depends On | ADR-0001 |
| Enables | R2 eventi evergreen, R5 pack stagionali |
| Blocks | Logica gameplay codificata per un singolo meme |
| Ordering Note | Registry minimo prima del primo pack |

## Context

La satira deve poter seguire eventi pubblici senza aggiungere codice usa-e-getta,
backend o download remoto. I meme fragili devono scadere senza cancellare premi o
rompere save. Le fonti devono essere tracciabili e gli effetti limitati.

## Decision

Usare pack TypeScript dichiarativi validati a build/CI. Schema concettuale:

```ts
interface MemeEventDef {
  id: string;
  title: string;
  lines: string[];
  active?: { from: string; until: string };
  conditions: Condition[];
  choices: [EventChoice, EventChoice];
  tags: string[];
  source: { label: string; url: `https://${string}` };
}
```

Gli effetti sono una discriminated union con whitelist (`sondaggi`, `money`,
`territory`, `flag`, `item`); nessuna callback arbitraria. Selezione pura con RNG
e clock iniettati. Pack `evergreen` e stagionali separati. Gli eventi non vengono
scaricati a runtime: arrivano con release PWA firmata dal normale deploy.

## Alternatives Considered

### Callback TypeScript per evento
Flessibile ma non validabile e favorisce logica unica. Scartato.

### JSON remoto/CMS
Aggiornabile senza deploy ma introduce sicurezza, moderazione e dipendenza rete. Scartato.

### Dialoghi hardcoded in WorldScene
Modello già costoso e non scalabile. Scartato.

## Consequences

Positive: validazione, fonti, disattivazione e riuso. Negative: effetti limitati;
nuove categorie richiedono evoluzione schema. Rischi: data locale manipolata e link
malevoli; mitigazioni: contenuto non competitivo, URL HTTPS validati, apertura solo
su gesto utente.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|---|---|---|
| `PIANO.md` Fase 5/R5 | Eventi aggiornabili senza server | Pack build-time dichiarativi |
| `PIANO.md` Satire review | Fonti e scadenze obbligatorie | Campi schema e validator CI |

## Performance Implications

Filtro su pool piccolo durante trigger, non per frame. Memoria lineare nel numero
eventi. Nessuna rete. Pack stagionali possono essere lazy-loaded solo se il bundle
supera il budget, decisione rinviata a misurazione.

## Migration Plan

Non migrare subito `STREET_EVENTS`. Implementare registry nuovo dietro flag,
aggiungere sei evergreen, validare; valutare conversione del pool legacy in un task
separato dopo R2.

## Validation Criteria

- ID/fonti/date/effetti validati;
- evento scaduto non selezionato;
- clock/RNG deterministici nei test;
- flag off = nessun trigger;
- premio ottenuto resta dopo scadenza;
- nessun HTML o URL non HTTPS renderizzato.

## Implementation Evidence

- schema discriminato in `src/data/memeevents.ts`;
- registry build-time `MEME_EVENTS`, vuoto fino al pack R2 approvato;
- fonte HTTPS, due scelte, finestra ed effetti validati da
  `scripts/validate-content.mjs` in CI;
- nessun download runtime o callback arbitrario.

## Related Decisions

- ADR-0001 Feature flags
- ADR-0006 Ownership Coalizione ed Elezioni
