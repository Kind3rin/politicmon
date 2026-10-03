# Changelog

## Redesign in corso — 2026-10-03

- Lotte: Polemica premia mosse diverse e riuscite; Fuorionda o cattura virale, intento avversario visibile e telefono del primo rivale che perde il copione.
- Mobile: pulsanti di lotta grandi con danni, PP e costi; due tocchi per scegliere una mossa, blocco verticale compatto e comandi laterali in orizzontale, fermi durante i colpi.
- Avvio: nome/briefing facoltativi, slot vuoto automatico, scelta starter compatta; notifiche di lotta automatiche, traguardi senza interruzioni e apprendimento immediato con slot libero.
- Primo allenamento: un avversario, squadra curata e nuova prova senza perdere fondi; prima cattura più equilibrata; animazione Fuorionda Higgsfield (0,25 crediti). Budget codice totale 352 KiB (+2 KiB per i comandi accessibili); salvataggi conservati.

- Prima crescita: starter evolvibili al livello 8, prossima mossa della nuova forma al 9; nuove campagne con Dex/schede prima della cattura e Gianni dopo la crescita. Salvataggi precedenti conservano l’ordine storico.
- Squadra: quattro fatti e accesso diretto all’evoluzione; confronto facoltativo, sequenza breve con ritorno automatico, nuovo atlante Higgsfield (0,25 crediti). Cure con PV effettivi e messaggio automatico.

- Politicdex: quattro fatti iniziali, elenco dei volti avvistati, filtri e pagine toccabili; habitat ed evoluzioni alternative accessibili direttamente.
- Lotte iniziali: Click Day premia la prima azione, Par condicio elimina i bonus e Sondaggio lampo cura chi ha meno PV%; evento annunciato al secondo turno e PV avversari numerici. Atlante Higgsfield: 0,25 crediti.
- Budget codice totale 356 KiB (+4 KiB per Dex ed eventi); limite iniziale invariato a 250 KiB.

- Titolo e slot: comandi diretti, nuova piazza Higgsfield (0,25 crediti), caricamento in due tocchi; cancellazione e sostituzione con conferma.
- Pausa: squadra, cure, Dex e morale diretti; borsa/salva/mappa/opzioni nella prima pagina secondaria. Cura rapida mostra oggetto, scorta e PV effettivi e ritorna automaticamente.
- Apertura: laboratorio indicato a nord-ovest, starter diretti e scheda con quattro fatti; Dex/schede e avviso del praticante senza conferme aggiuntive. Salvataggi conservati.

## 1.0.0-rc.2 — 2026-07-12

- Attivati in produzione tutti i moduli: Atto 3, Coalizione, Territori, Eventi Meme e Campagna Settimanale.
- Eventi meme integrati nella campagna settimanale con effetti reali, costi verificati e almeno due eventi attuali per run.
- Nuova schermata `EXTRA → CONTENUTI` con stato e requisito di sblocco per dieci sistemi, compatibile con i save esistenti.
- Eliminati fallback e placeholder grafici in battaglia; contratto animazioni completo per tutte le specie.
- Migliorate leggibilità, scelte, mappa, tessera candidato e ritmo esplorativo su mobile.
- Sfide vaganti trasformate in proposte rifiutabili con 50 passi iniziali liberi.
- Politicmon tardivi ridisegnati come caricature politiche coerenti con il roster PixelLab.
- Telemetria locale e gate automatici per progressione, economia, boss, cattura ed EXP.
- Campagna caricata dinamicamente: bundle iniziale ridotto del 34,5% e budget prestazioni automatici.
- PWA corretta: campagna e sprite sono precacheati senza duplicati; upgrade v13→v18, offline Android e cache WebKit verificati.
- Portable Windows riparato: include l'intera build e un launcher locale senza dipendenze Node.js.

## 1.0.0-rc.1 — 2026-07-11

- Atto 3 completo: Campo Largo, Futuro Anteriore, Genova Techno, cinque collegi, Palazzo dei Feed, Election Night e quattro finali.
- Longevità: campagna settimanale, COPPA con regole rotanti, rivincite adattive e Forme Meme persistenti.
- Satira aggiornabile: pack con fonti, validator editoriale, review e schermata FONTI SATIRA.
- PixelLab reboot: 192/192 asset richiesti presenti; caricature politiche riconoscibili mantenute.
- UX: schermate di scelta leggibili senza ellissi, focus esplicito, layout mobile portrait/landscape e controlli touch corretti.
- Save v18 con migrazione v3–v17, tre slot e recupero backup corrotto.
- QA: 186 test, 9.000 simulazioni boss, audit economia/accessibilità/visuale/satira e gate contenuti completi.
