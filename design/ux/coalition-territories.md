# UX Spec — Coalizione e Territori

> **Status**: Ready for review
> **Last Updated**: 2026-07-10
> **Canvas**: 240×180, tastiera/d-pad/touch

## Scopo

Il giocatore deve capire una scelta politica prima di confermarla: vantaggio,
costo e LINEA ROSSA. R1 mostra solo tre candidati, due slot e un collegio sandbox;
la UI completa resta dietro i gate R2–R3.

## Gerarchia

1. scelta corrente e conseguenza immediata;
2. bonus, malus e LINEA ROSSA in testo e colore;
3. slot usati e consenso numerico;
4. dettagli avanzati su richiesta.

Stabilità numerica, CICATRICE, riconciliazione e sinergie ministeriali non sono
mostrati in R1. La preview finale è autoritativa; la UI non ricalcola formule.

## Layout R1

- Header 17 px: titolo e `SLOT 1/2`.
- Tre card candidato 224×42, scorrevoli; una sola card interamente visibile alla
  volta su touch se il dialogo preview è aperto.
- Card: nome/tag/stato, una riga bonus/malus, chip LINEA ROSSA.
- Footer 32 px: `A CONFERMA`, `B INDIETRO`; conferma persistente solo dopo preview.
- Territorio: cinque card 68×27 in griglia 3+2; ogni card comunica nome, valore e
  azioni `n/2` senza dipendere dal colore.

## Interazioni

| Azione | Tastiera/d-pad | Touch | Risultato |
|---|---|---|---|
| cambia candidato/collegio | frecce | tap card ≥32×24 | solo focus e preview |
| conferma | A/Invio | secondo tap o bottone | comando dominio atomico |
| annulla | B/Esc | bottone indietro | nessuna patch |
| dettagli | START | tap chip | testo esteso, nessuna scrittura |

Input disabilitato soltanto durante commit atomico. Un errore `stalePreview`
mantiene il focus, rilegge il view-model e mostra `DATI AGGIORNATI: RICONTROLLA`.

## Motion e accessibilità

- Informazioni sempre ridondanti: segno, numero, label e colore.
- Reduced-motion: valori saltano al risultato; nessun lerp, pulse o shake.
- Modalità normale: barra consenso interpola ≤300 ms senza overshoot.
- Focus: fondo avorio + bordo oro, non solo cambio tinta.
- Testo variabile clippato con ellissi; dettagli restano accessibili nel pannello.
- Ordine focus stabile; nessun drag obbligatorio.

## Localizzazione

Titoli card massimo 22 caratteri visibili; tag/stato massimo 11; label preview
massimo 18. Espansione oltre limite usa ellissi e pannello dettagli, mai riduzione
del font o sovrapposizione. Numeri, segni e `%` hanno spazio riservato.

## Acceptance criteria

- [ ] Tre card R1 e footer stanno a 240×180 senza collisioni.
- [ ] Ogni scelta mostra bonus, malus e LINEA ROSSA prima della conferma.
- [ ] Touch target interattivi sono almeno 32×24.
- [ ] Consenso 0, 50 e 100 mostra numero, barra, soglia e stato distinguibile.
- [ ] Reduced-motion elimina ogni interpolazione conservando feedback testuale.
- [ ] Stringhe al massimo dichiarato vengono clippate senza invadere valori.
- [ ] Duplicato, slot pieno, fondi insufficienti e stale preview non mutano stato.
- [ ] B/Esc da qualunque preview torna indietro senza salvataggio.

## Gap noto

Manca ancora una player-journey formale; prima del gate R1 il playtest deve
misurare comprensione ≥4/5 e motivazione del trade-off ≥3/5.
