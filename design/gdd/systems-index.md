# Politicmon — Systems Index

> **Status**: Approved for P1 design
> **Last Updated**: 2026-07-10
> **Scope**: Atto 3 e sistemi necessari al piano R1–R5
> **P1 Gate**: PASS — `reviews/p1-scope-gate.md`

## Systems

| # | Sistema | Categoria | Layer | Priorità | Dipende da | Stato | Design doc |
|---:|---|---|---|---|---|---|---|
| 1 | Feature Flags | Foundation | Foundation | MVP | — | Implemented | ADR-0001 |
| 2 | Save e Migrazioni | Persistence | Foundation | MVP | Feature Flags | Implemented | ADR-0002 |
| 3 | Content Validation | Data | Foundation | MVP | — | Implemented | `docs/content-validation.md` |
| 4 | Coalizione | Progression | Core | MVP | Feature Flags, Save, SONDAGGI, Governo Ombra | Implemented Foundation | `coalizione.md` |
| 5 | Territori ed Election Night | Progression | Feature | Vertical Slice | Coalizione, SONDAGGI, Quest, Battaglia | Implemented Foundation | `territori-elezioni.md` |
| 6 | Trattamento narrativo Atto 3 | Narrative | Feature | Vertical Slice | Coalizione, Territori, Mappe, Quest | Approved | `../narrative/atto3.md` |
| 7 | Eventi Meme | Content | Feature | Alpha | Content Validation, SONDAGGI, Coalizione | Registry Implemented | ADR-0005 |
| 8 | Roster Atto 3 | Character/Combat | Feature | Vertical Slice | Battaglia, Evoluzioni, Dex, Art Bible | Approved | `../content/atto3-roster.md` |
| 9 | Mappe Atto 3 | World | Feature | Vertical Slice | World seams, Narrativa, Coalizione | R1 Campo Implemented | `../levels/campo-largo.md` |
| 10 | UI Coalizione/Territori | UI | Presentation | Vertical Slice | Coalizione, Territori | Primitives Implemented | `../ux/coalition-territories.md` |
| 11 | Campagna Settimanale | Replayability | Feature | Full Vision | Territori, Eventi Meme, COPPA | Not Started | pending |
| 12 | Rivincite Vive e COPPA | Replayability | Feature | Full Vision | Battaglia, Governo Ombra | Existing base | pending |
| 13 | Telemetria Locale | QA/Progression | Polish | MVP | Save | Implemented | `src/game/runstats.ts` |
| 14 | Accessibilità e Localizzazione | UX | Polish | Release | tutte le UI/contenuti | Partial | pending |

## Dependency Layers

1. **Foundation**: feature flag, save/migrazioni, validator e seam esistenti.
2. **Core**: Coalizione possiede alleati, assetto, linee rosse e patch atomiche.
3. **Feature**: Territori, Election Night, narrativa, eventi, roster e mappe consumano
   il dominio Coalizione senza scriverlo direttamente.
4. **Presentation**: UI legge view-model e invia comandi; non contiene formule.
5. **Polish**: telemetria, accessibilità, localizzazione e gate di release.

Nessun ciclo ammesso: Territori può leggere Coalizione; Coalizione non conosce
Territori. Election Night riceve snapshot immutabile. La narrativa invia comandi
di dominio e consuma risultati, senza possedere stato.

## Recommended Design Order

1. Coalizione — collo di bottiglia per tutto l’Atto 3.
2. Territori ed Election Night — definisce progressione, formule e finali.
3. Trattamento narrativo Atto 3 — usa contratti già chiusi, evitando flag ad hoc.
4. Roster Atto 3 — ruoli tattici legati ai bisogni reali della vertical slice.
5. UI/UX Coalizione e Territori — dopo stabilizzazione dei view-model.
6. Eventi Meme — schema esistente, contenuto dopo i domini core.
7. Campagna settimanale e rivincite — solo dopo dati di playtest dell’Atto 3.
8. Accessibilità/localizzazione/release — gate finale, non rattoppo tardivo.

## Priority Rationale

- **MVP**: infrastruttura e Coalizione dimostrano che una scelta ha conseguenze
  senza rompere la campagna storica.
- **Vertical Slice**: un territorio, un boss, due esiti, una famiglia e UI minima
  provano il loop completo, non singoli sottosistemi isolati.
- **Alpha**: amplia contenuti solo dopo validazione del loop.
- **Full Vision**: replayability non deve ritardare la conclusione dell’Atto 3.

## High-risk Systems

| Sistema | Rischio | Controllo |
|---|---|---|
| Coalizione | combinazioni e linee rosse degeneri | quattro assetti supportati, comandi puri, test matrice |
| Election Night | formula opaca o facilmente dominabile | output 0–5 seggi, breakdown UI, boundary test |
| Eventi Meme | contenuto datato/diffamatorio | fonte, periodo, fallback e review editoriale |
| Roster | costo asset e power creep | massimo sei famiglie, role matrix prima di PixelLab |
| Campagna Settimanale | grind e save non deterministico | seed locale, stato separato, premi cosmetici |

## Progress Tracker

| Stato | Conteggio |
|---|---:|
| Implemented/Schema Ready/Scaffolded/Partial | 8 |
| Approved | 4 |
| Not Started | 2 |
| GDD P1 completati | 4/4 |

## Gate P1

- Coalizione e Territori hanno regole, formule, edge case e acceptance criteria.
- Narrativa separa evergreen e datato, con flag e conseguenze dichiarati.
- Roster P1 definisce dieci schede e relative specifiche; R1 non produce il nuovo
  roster, R2 produce una famiglia e FUTURORSO, R3 valuta gli asset restanti.
- Review cross-system non trova scritture dirette dalle scene né feature fuori slice.
