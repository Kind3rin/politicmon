# Changelog

## Redesign in corso — 2026-10-03

- Esplorazione PWA verticale: la mappa riempie lo spazio disponibile mostrando più mondo, con personaggi alla stessa scala; dialoghi, obiettivi e tocchi seguono il bordo inferiore. Lotte e menu conservano il formato attuale.
- Morale: scelte civiche direttamente toccabili sul canvas e nei pulsanti del telefono; costi/conseguenze prima della scelta, opzioni senza fondi disabilitate e risultato salvato una sola volta.

- Lotte: nome, danno effettivo, critico ed efficacia nello stesso colpo; tolte le pagine duplicate e la carica nemica separata. Colpi super efficaci da 1,7 riconosciuti anche con effetti ridotti; annuncio mancato senza una nuova schermata.

- Reclutamento: candidato visibile, Dex/destinazione/crescita in un riepilogo automatico di 1,8 s; dati e conteggi salvati insieme, Continua a tutta larghezza in verticale, mosse/evoluzione dirette. Atlante Higgsfield: 1,5 crediti.
- Borgo: sondaggista fuori dal tragitto iniziale; nuova campagna giocata da Ellyna a Schleinix e alla vittoria su Gianni, senza saltare catture o crescita.

- Lotte: ordine previsto su ogni mossa touch, con priorità/status/parità e cambio di campo anticipati; pulsanti più alti durante la scelta, anteprima danni dichiarata come stima.
- Incontri: varianti casuali direttamente nella lotta, senza conferma nel mondo; scoperta nel Dex compatta, senza coprire candidato e PV. Slice giocata anche con Giorgetta fino a Giorgiagon e al primo rivale.

- PWA verticale: console a tutta altezza, barra in alto e controlli vicini al bordo sicuro inferiore; nessun taglio nei formati touch provati, schermo 4:3 conservato.
- Bar Sport: cura gratuita con un tocco, salvataggio immediato e ricevuta automatica; IA evita rallentamenti e potenziamenti di velocità quando è già prima, senza perdere effetti dannosi delle mosse.

- Gianni: copione con scudo al 50% per due turni; preparazione riuscita rompe scudo e Grinta, intento e danni onesti. Nuovo atlante Higgsfield (1,5 crediti), sei turni giocati con Renzilla.
- Apertura: incontri introduttivi fino al LV5 prima dell’evoluzione; secondo reclutamento dopo Nino dà slancio allo starter fino al LV8, salvataggi precedenti invariati.
- Movimento: cambio direzione e passo nello stesso tocco; pareti, NPC e porte mantengono i blocchi.

- Cattura virale: 3 Polemica, zero schede; disponibile anche senza carta, probabilità e costi visibili, atlante Higgsfield dedicato (1,5 crediti).
- Vittorie: fondi, sondaggi e oggetti in un riepilogo; bonus conservati, premi dello stesso tipo sommati e jackpot celebrato separatamente.

- Apprendimento: quattro mosse toccabili, confronto nuova/sostituita nella stessa vista e conferma in due tocchi; dettagli completi facoltativi, PP delle altre mosse conservati.
- Archivio: mosse guadagnate selezionabili direttamente, recupero gratuito e pagine touch; pulsante disabilitato nella squadra quando non ci sono mosse da recuperare.

- Rimpasto: scelta touch diretta di tutte le cinque riserve, PV e costo del turno anticipati; KO e candidato attivo esclusi, annullamento gratuito. Anche i mirror PvP conservano la squadra originale.
- Tra due avversari la scelta gratuita si apre senza un secondo sì/no; tolta la spiegazione ripetuta dopo il cambio. Elenco squadra allineato alla palette delle schede.

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

- Riserve in lotta: comandi touch con recupero effettivo, rischio di contrattacco e scorta; cure senza effetto, schede contro allenatori e limiti Coppa bloccati prima della spesa. RISERVE diretto nei selvatici, campagna accessibile dalla borsa.
- Primo percorso: HUD indica l’uscita nord del Borgo, l’erba a sud di Nino e l’evoluzione al livello 8.

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
