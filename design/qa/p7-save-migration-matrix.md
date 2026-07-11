# P7-T03 — Save migration matrix

Gate autoritativo: `npm run test:integration`.

| Caso richiesto | Fixture/evidenza | Invariante |
|---|---|---|
| Save vuoto | storage vuoto | `loadGame() === null`, nessuno slot fantasma |
| Save v13 pre-Atto3 | `v13-post-medaglie.json` | mappa, tre badge, party e fondi conservati |
| Post-Garante | `v13-post-garante.json` | `garante-beaten`, mappa Colle e checkpoint validi |
| Post-Bruxelles | `v13-post-ue.json` | `ue-beaten`, mappa Bruxelles e round-trip valido |
| Multi-slot | `v13-multislot.json` | tre slot indipendenti, indice attivo conservato |
| Backup corrotto | `v13-backup-recovery.json` | primario ripristinato dal backup senza distruggerlo |
| v17 → v18 | slot sintetico v17 | party conservato e registry forme inizializzato |
| Dati v18 | forma `salvinator_spiaggia` | forma per esemplare e unlock sopravvivono al round-trip |

Le migrazioni v3–v12 restano coperte separatamente nello stesso gate.
