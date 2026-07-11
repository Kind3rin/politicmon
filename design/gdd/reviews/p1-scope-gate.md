# P1 Cross-System Review e Scope Gate

> **Data**: 2026-07-10
> **Verdetto finale**: PASS con condizioni di implementazione
> **Documenti**: game concept, Coalizione, Territori, Atto 3, roster, Art Bible

## Esito critico

La prima passata ha restituito `MAJOR REVISION`: la vertical slice era cresciuta
fino a cinque collegi/Election Night, il percorso gratuito `40+8+4=52` dominava,
il catalogo alleati non era dati autoritativi e due moduli possedevano ledger di
conseguenze sovrapposti. Il gate è stato rieseguito dopo le correzioni sotto.

## Blocker risolti

| ID | Problema | Correzione autoritativa | Verifica |
|---|---|---|---|
| B-01 | tre scope R1 incompatibili | R1 = Campo/backstage, 3 candidati/2 slot, 1 collegio sandbox, boss Futuro con roster legacy, vignetta stabile/rottura; niente Election | concept, PIANO e narrativa allineati |
| B-02 | vittoria gratis dominante | consenso iniziale 38: DIBATTITO vinto + prudente = 50/RICONTO, non seggio | enumerazione base delle coppie |
| B-03 | catalogo alleati assente | 5 allyId con tag, bonus, malus, linea rossa, incompatibilità e sinergia; R1 ne espone 3 | schema data-driven, nessuna scene ownership |
| B-04 | token ally/species confuso | ally resta `generorso`; VANNACCIX/FUTURORSO sono species/evolution IDs | token `recruit:generorso` risolvibile |
| B-05 | doppio owner conseguenze | Coalizione possiede pending/timer/processed; narrativa possiede solo event ledger narrativo | namespace e save ownership distinti |
| B-06 | `tourComplete` persistito due volte | sola proiezione Quest da phase Territori | nessun campo dominio duplicato |
| B-07 | comando impossibile in `ready` | `ready` accetta solo `startElection` | state table chiusa |

## Scope mantenuto e tagli

### R1 — implementare

- feature flag e payload save definitivo;
- tre card candidato, due slot, preview di un bonus/un malus/linea rossa;
- Campo Largo + backstage e un collegio sandbox;
- boss di Futuro Anteriore con roster esistente;
- due vignette stabile/rottura; 30–45 minuti;
- UI senza stabilità numerica, terzo slot, CICATRICE o riconciliazione.

### Deferito

- C3 Diplomazia, quattro collegi, Palazzo ed Election Night completa → R2–R3;
- terzo slot, sinergie Governo, RIPARA/RICONCILIA → dopo test comprensione;
- SALIS + FUTURORSO → R2; restanti asset/specie e FORCHETTA SONDAGGI → R3 dopo simulazione;
- campagne settimanali, rivincite e COPPA → R4.

Le dieci asset spec restano documentazione `Needed`, non autorizzazione a produrre
dieci coppie di sprite nella slice.

## Coerenza cross-system

- SONDAGGI e stabilità non assegnano seggi; influenzano conseguenze narrative non-power.
- Territori legge snapshot Coalizione e non lo modifica direttamente.
- Election Night usa snapshot/checkpoint separati e commit one-shot.
- Le scene inviano comandi; formule e cataloghi restano nei domini.
- FUTURORSO è ramo item di VANNACCIX; l'ally narrativo `generorso` resta un ID NPC.
- Roster: nessun BST normale >395, nessuna stat >112, solo 3 mosse/2 abilità nuove.

## Condizioni non bloccanti prima di R2

1. Enumerare composizioni ordinate 0–3 e misurare utilità marginale del terzo slot.
2. Rigenerare fixture fondi low/median/high; costi rischiosi target 15–30% mediana.
3. Simulare 10.000 matchup per ruolo prima di abilitare le nuove specie.
4. TABULA RASA: primo ingresso della specie per battleId, anche dopo replay/save.
5. Verificare comprensione UI ≥4/5 prima di mostrare stabilità e riconciliazione.

Queste condizioni sono acceptance gate di R2/R3, non ragione per espandere R1.

## Decisione

**PASS**: P1 può consegnare a P2. Qualunque implementazione che introduca in R1
Election Night, cinque mappe, dieci sprite o la UI completa viola questo gate.
