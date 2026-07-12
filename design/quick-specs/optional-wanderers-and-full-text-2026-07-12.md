# Quick Design Spec: Sfide vaganti facoltative e testi completi

**Type**: Tweak
**System**: Esplorazione e UI
**Date**: 2026-07-12

## Change Summary

Gli sfidanti casuali compaiono come NPC visibili e non interrompono più il
movimento. Le etichette variabili condivise mostrano tutto il testo mediante
compressione orizzontale controllata, senza aggiungere ellissi.

## Motivation

Il playtest mobile segnala interruzioni troppo frequenti dell'esplorazione e
testi troncati che impediscono decisioni informate.

## New Rules

1. Può comparire un solo sfidante vagante per mappa.
2. Lo sfidante non apre dialoghi né avvia la battaglia automaticamente.
3. La targhetta `SFIDA A` comunica l'interazione facoltativa.
4. Premendo A adiacenti si riceve una conferma SÌ/NO.
5. Le etichette UI variabili condivise devono mostrare l'intero contenuto.

## Acceptance Criteria

- [ ] Camminare non apre una sfida vagante.
- [ ] Interagire con lo sfidante propone conferma e SÌ avvia la battaglia.
- [ ] Ignorarlo consente di continuare l'esplorazione.
- [ ] Menu e card condivise non aggiungono `…` ai testi variabili.
- [ ] Nessuna regressione sulle sfide fisse a vista e sugli incontri selvatici.

## GDD Update Required?

No. È una correzione UX della modalità di attivazione, senza modificare roster,
ricompense o regole di battaglia.
