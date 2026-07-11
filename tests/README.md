# Test infrastructure

**Engine:** TypeScript 5.8, Vite 6, Canvas 2D browser/PWA
**Framework:** `node:test` eseguito tramite `tsx`
**CI:** `.github/workflows/ci.yml`

## Struttura

```text
tests/
  unit/          logica pura, formule e state machine
  integration/   contratti tra sistemi e round-trip save
  content/       validazione registry, mappe, specie e quest
  fixtures/      input versionati e immutabili dei test
  smoke/         checklist critica manuale
  evidence/      screenshot e verbali di verifica
```

## Comandi

- `npm test` — tutte le suite ricorsivamente.
- `npm run test:unit` — unit test.
- `npm run test:integration` — integration test.
- `npm run test:content` — contract test dei dati.

Il runner `scripts/run-tests.mjs` enumera esplicitamente i file `.test.ts`, così
la discovery è identica su PowerShell, Linux CI e shell senza `globstar`.

## Convenzioni

- File: `[sistema].[feature].test.ts` oppure `[sistema].test.ts`.
- Scenario: descrizione italiana `azione: condizione → risultato`.
- RNG, clock e storage devono essere deterministici/iniettati.
- Testare il comportamento pubblico; evitare assertion su dettagli interni.
- Ogni bug corretto aggiunge un regression test quando il comportamento è isolabile.

## Evidenza richiesta

| Tipo modifica | Evidenza minima |
|---|---|
| Formula/regola | Unit test |
| Save o integrazione | Integration test con fixture |
| Registry dati | Content/contract test |
| UI/feel | Screenshot + walkthrough mirato |
| Mappa | Validator statici + smoke in-game |

## CI

Push e pull request su `master` eseguono installazione pulita, typecheck, tutte
le suite, validator statici e build. Una failure blocca il job.
