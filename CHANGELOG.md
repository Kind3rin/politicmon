# Changelog

## Mandato 2 — Fase 0 riaperta — 2026-10-04

- Bozze statiche Tribuna elettorale: dieci pagine, venti schermate, confronti con riferimenti e verifica di 40 layout. UI di produzione non migrata: attesa della riga UI APPROVATA in M2-NOTE-LUCA.md.
- Fase 1 in corso: fondale esterno con cache invalidabile, quattro texture per erba/sterrato/sabbia, bordi e dettagli, ombre statiche e chiome separate. Nessuna migrazione UI. Acqua a quattro frame, vento, particelle, fasce orarie, meteo e passi differenziati; camera con anticipo e zoom dei dialoghi importanti, coordinate touch corrette durante lo zoom. Prove Borgo/Percorso 1, notte/pioggia/Riduci effetti e benchmark con cache pronta. Fase ancora aperta per gli altri materiali, lampioni e verifica giocata.

Retrobottega portato al kit con anteprima separata di benefici, costi e conseguenze reali, ricevuta prima/dopo e protezione dalle conferme ripetute; probabilità e importi invariati. Duello PvP con quattro mosse dirette, dettagli a pressione lunga e HUD nativo, senza modifica del simulatore. Pausa: riepilogo unico e sei destinazioni visibili a 412×915 senza scorrere. Il controllo automatico copre 49/49 scene; Duello completo provato con due peer in una stanza QA privata; prova hardware del controller e usabilità sul POCO restano aperte.

## Mandato 2 — Fase 0 in corso — 2026-10-03

- Dossier pre-sfida: stime strutturate per compagno, mossa/PP/danno/precisione separati, difesa avversaria con confronto prima → dopo e preparazioni in schede proprie. KO e PP esauriti con rimedio esplicito; compagni omonimi distinti. Eliminata la lettura di righe legacy. Corretto il kit per dati singoli a piena larghezza e intestazioni con ritratto in landscape, senza tagli o paragrafi sovrapposti. Prima/dopo e prova 844×390 in artifacts/m2/0-dossier-*.png.

- Audit dei contenuti: abilità in maiuscole/minuscole normali, stati e statistiche con nomi coerenti, recupero di Galleggiamento e probabilità di Forchetta sondaggi espliciti. Paragrafi separati per effetto e arrotondamento/probabilità. Frasi rapide raggruppate in Saluti/Organizzarsi/Congedarsi in chat e confronto; emote in Gesti e segnali/Risposte e reazioni. Bella partita e Va bene sostituiscono etichette oscure; simboli e protocollo invariati. Profili DRAGHIMON/VERDOLINO e gruppi verificati a 412×915 in fixture QA, paragrafi di Galleggiamento di due righe. Prova fisica sul POCO ancora pendente.

- Regressione dei comandi contestuali: dopo Avvicinati → Parla, il pulsante riusa lo stato corrente sia per il click sia per aria-disabled; prima poteva restare inattivo anche quando il testo indicava Parla. Prova a tocco tra due peer QA. Confronto privato con accenti, risposta, cronologia e chiusura; scambio con revoca delle conferme al cambio dell’offerta e squadre persistenti al riavvio. Tutte le 78 mosse hanno nomi in maiuscole/minuscole normali, con sigle e nomi propri conservati e Reddito di cittadinanza per esteso. Identità, statistiche, effetti e specie invariati; 402 test e perf verdi.

- Compagni omonimi distinguibili per posizione in squadra, cambio, borsa e apprendimento, anche nelle ricevute. Numerazione degli elenchi esplicita come «Scelta», distinta dalla posizione del compagno. Vecchi tasti A/B nascosti anche al boot. Sua Emittenza battuta nella campagna naturale in nove turni; crescita, medaglia, nuova missione e mosse conservate al riavvio. PWA Chromium offline: font e icone del kit, 798 asset e 19 tracce; migrazione e resume verificati. 402 test verdi e budget prestazioni rispettato. Prova fisica sul POCO ancora richiesta.

- Transizioni del mondo: layout nativo conservato durante ingressi, cure e preparazione della lotta, senza ricomparsa dei vecchi pulsanti A/B. Controlli nascosti durante la transizione e ripristinati al termine; dialoghi e pannelli continuano a funzionare. Nome del parlante separato dalle targhette grafiche: Sindacalista, Mara e Sua Emittenza riconoscibili. Divisa Equa spiegata senza abbreviazioni. Prova naturale: Divisa ricevuta e persistente, bar 16 → 43 PV, porte di bar e Studio 5 a tocco, briefing di Mara e transizione senza comandi legacy. Mara battuta in cinque turni; Giravolta appresa nelle due riserve in spazi liberi. La missione propone Sua Emittenza dopo la vittoria, senza invitare di nuovo alla prova conclusa.

- Avvisi temporanei del mondo separati dalla missione: questa riappare alla scadenza senza spostare la camera. Apprendimento coerente con la scheda: le mosse di stato mostrano potenza —. Dopo il trucco di Gianni il HUD dice Copione rotto. Prova naturale: secondo reclutamento, GIORGETTA → GIORGIAGON LV8, Gianni sconfitto in cinque turni, LV9 e Fiamma tricolore al posto di Comizio. Tre compagni, forma, nuova mossa e altri PP conservati alla riapertura; archivio e annullamento provati nella stessa campagna.

- Esplorazione: uscita nord/sud a tocco sul bordo della mappa, con percorso normale e condizioni di accesso conservate. Il percorso si interrompe quando parte una lotta; il timer del flash torna a zero, evitando comandi nascosti al rientro. In orizzontale corto la griglia funziona anche senza puntatore touch; HUD dimensionato al contenuto e spazio riservato nella camera per vedere il personaggio. Missione iniziale con istruzioni esplicite per Recluta, Borsa ed Evolvi; turno in risoluzione nominato correttamente. Prova naturale: CALENDAURO LV5 reclutato, Nino battuto, GIORGETTA LV6 → 7 e ritorno ai comandi senza ricaricare.

- Cure e avvisi del mondo nel kit: PV prima → dopo, ripristino PP/stati, testo completo senza taglio a 38 caratteri; segnali animati disattivati con Riduci effetti. Scadenza degli avvisi gestita nell’aggiornamento del gioco. Rimossi dal renderer della lotta HUD, numeri, banner e simboli bitmap: forme meme nominate nel HUD nativo, controllo automatico esteso al renderer condiviso. Cura e avviso provati al bar di Mediopoli nella campagna reale.
- Borsa: anche equipaggiamento, direttive ed evoluzioni mostrano oggetto e destinatario insieme. Effetto comune al gruppo, compatibilità e consumo espliciti; equipaggiamento in due tocchi anche sostituendo, con restituzione del precedente. Apprendimento: confronto dei PP/effetti nella lista, scelta nativa applicata una volta senza conferma ridondante; nome della nuova mossa sempre visibile. Prima/dopo identico ELLYNA/PIAZZA GREMITA salvato in artifacts/m2. Direttive ed evoluzioni in due tocchi dalla mappa: sostituzioni e confronto della forma direttamente nella borsa, senza conferma ridondante. Consumo singolo e rifiuto dei comandi obsoleti; altre mosse, PP, stato e oggetto conservati. Tastiera: Z e dettaglio seguono il pulsante a fuoco, anche dopo Tab; frecce ripartono dalla stessa scelta. Dialogo prima/dopo nello stesso punto con widget HEAD in fixture isolato.
- Accessi diretti a Borsa e Salva nell’esplorazione. Cure per oggetto e destinatario sulla stessa schermata, con PV/stato prima e dopo e consumo esplicito: cura in due tocchi, salvataggio in uno; cura provata PV 20 → 26, caffè 7 → 6, blocco a PV pieni e ritorno diretto al mondo. Controller standard e suggerimenti per dispositivo; guida navigabile e primi gesti imparati nel mondo, persistenti tra riaperture. Duello con due peer: invito, turno simultaneo, resa, ritorno e stato campagna invariato verificati nella stanza QA privata.
- Kit nativo condiviso: testo nitido con Nunito Sans/Space Grotesk incorporati, quattro livelli tipografici e pannelli separati. Titolo, pausa, campagne, candidati, squadra, borsa, apprendimento, missioni, guide, audio, tipi, mappa, Politicdex, negozio, morale, scelte civiche, salvataggi, archivio mosse, fonti, contenuti, traguardi, trasporti, Circolo, nome online, preparazione delle sfide, dossier tattico, monumento e archivio del Palazzo usano il kit; dialoghi condivisi con speaker, Mostra tutto/Continua e pagine fino a tre righe.
- Navigazione comune da tastiera, Indietro di un livello, dati etichetta/valore, stemmi dei tipi e icone degli oggetti. Pausa: Squadra, Borsa, Missioni, Mappa, Politicdex, Altro; impostazioni/rete/archivi in sezioni dirette. Anteprima delle cure e compatibilità dei destinatari; velocità testo normale/rapida/istantanea. Guida tipi con moltiplicatori reali. Mappa con collegamenti e condizioni di accesso del mondo; Politicdex con filtri diretti, 52 specie e habitat/difese/crescita in blocchi leggibili. Esplorazione con accessi diretti a squadra/mappa, corsa a tocco, azione contestuale e percorso automatico su caselle/personaggi; leva libera nella metà sinistra e croce opzionale. HUD e scelte del mondo nativi; guida ai comandi aggiornata. La migrazione copre 49/49 scene; la prova touch fisica resta aperta; la Fase 0 non è conclusa.
- Scelte civiche e promesse mostrano costo e conseguenze prima della decisione, poi variazioni effettive; il finanziamento e la ricevuta non si ripetono con tocchi obsoleti. Importazione con confronto e annullamento; stato importato attivato prima del ricaricamento per evitare che il salvataggio di lifecycle lo sovrascriva. Interazioni dirette con NPC agganciate allo sprite e al suo movimento.
- Contenuti divisi tra storia, attività e forme; traguardi con condizioni e premio già accreditato separati. Guide e schede di sola lettura scorrono con le frecce. Titoli conservati anche sui display bassi; informazioni del mondo raccolte in alto per liberare i personaggi sotto. Azione primaria ancorata al bordo inferiore accanto a Indietro; negozio aperto direttamente, senza pagine preliminari obbligatorie. Dialoghi legacy presentati in maiuscole/minuscole.
- Circolo: squadra e riserve separate, limiti espliciti e confronto prima dello spostamento. Nome online: campo nativo con limite di caratteri, Invio per salvare e annullamento; focus, cursore e composizione conservati quando cambia la validità. Preparazione delle sfide: piano, compagno iniziale e dossier con mosse e stime leggibili, effetti di preparazione scritti per esteso; la consultazione non consuma PP o turni.
- Dossier tattico: schede Mossa/Campo/Reclutamento, dati separati e stime pure senza consumare turni. Monumento: storia leggibile, preventivo, blocco per fondi insufficienti e addebito singolo con ricevuta prima/dopo. Archivio del Palazzo: fatti, lettura esplicita e verifica in tre risposte, feedback senza penalità o voti aggiunti.
- Lotta locale nel kit: quattro schede sempre visibili senza sottomenù, tipo/potenza/PP/efficacia e ordine del turno; pressione lunga per il dossier senza consumo. Arena grafica a piena superficie, barre PV e numeri di danno nativi; attore e destinatario espliciti, blocchi delle abilità mostrati prima della scelta. Borsa, campagna, reclutamento e ricevute nello stesso sistema; costi e conseguenze prima dell’uso. Il controllo prestazioni misura ora anche i pannelli nativi. Controller standard collegati con soglie analogiche e protezione dai tasti tenuti tra scene; hardware reale ancora da provare.
- Scelte narrative e collegi: storia, conseguenze previste e ricevute separate; sostegno degli alleati esplicito, costi ricalcolati alla conferma e dibattito senza premio garantito. Epiloghi leggibili senza pagine bitmap, scrutinio per collegio con confronto prima/dopo. Coalizione con bonus/malus e rimozione esplicita; evoluzione con confronto di valori, tipi, abilità e mosse prima della scelta. Le pagine con una sola conferma fissa si scorrono anche con le frecce senza cambiare azione, anche nelle schede a tab.
- Torneo e casinò nel kit: tabellone/dossier/capofila, condizioni del match, costi e probabilità leggibili, ricevute effettive e conferme protette dai comandi obsoleti. Genova Techno con indicatore nativo aggiornato senza ricostruire i controlli a ogni frame, tasti diretti e modalità senza timer. Governo ombra con beneficio/costo/stato, nomina e sfiducia esplicite. Settimanale con esiti e premio visibile; chat con testo completo, campo nativo e bozza conservata se offline. Lo scorrimento resta stabile quando cambia il contenuto della stessa scheda.
- Confronto privato, lobby del duello e scambio nel kit: attesa/rifiuto/disconnessione leggibili, cronologia completa e campo nativo; offerte e conferme separate nello scambio. Le conferme obsolete non applicano offerte cambiate; ricevuta e avvio dell’evoluzione si eseguono una volta sola. Protocollo di rete e salvataggio immediato dello scambio conservati; ritirata la tastiera bitmap Composer ormai senza utilizzatori. Duello integrato con due peer verificato; confronto privato e scambio ancora da giocare.
- Come richiesto dal mandato 2, aumento unico del budget totale di codice gzip da 356 a 476 KiB (+120 KiB): finanzia il kit ad alta risoluzione e i nuovi motori di mondo/lotta. Budget iniziale e limiti di frame/salvataggi conservati; PNG/font esterni precache offline.

## Redesign in corso — 2026-10-03

- Progressione PWA verticale: evoluzione, reclutamento e crescita occupano lo schermo con un palco comune; confronto, salto e ritorno mantengono i comandi al pollice. Atlante Higgsfield: 1,5 crediti.
- Squadra e apprendimento: quattro fatti distinti, mosse con PP reali direttamente toccabili, confronto nuova/sostituita a tutta altezza e dettagli senza perdere i pulsanti. Schleinix LV9/Articolo 1 riaperti offline con gli altri PP conservati.

- Prime lotte del Percorso 1 in PWA verticale: arena a tutta altezza, personaggi/colpi/PV ancorati e controlli stabili tra scelta e azione; menu duplicati sostituiti dalla regola di campo o dall’intento nemico, con bersaglio e potenza corretti. Fondale Higgsfield verticale: 1,5 crediti.
- Eventi di campo: tolti annuncio iniziale e schermata separata; avviso breve nell’arena, recupero PV effettivo e pausa di 0,25 s. Click Day, Par Condicio e sondaggio conservano effetti e applicazione unica.

- Crescita dopo KO: consenso effettivo, livello, bonus e Divisa in un riepilogo automatico di 1,6 s; apprendimento/evoluzione seguono direttamente. Nessun riepilogo vuoto al livello massimo; atlante Higgsfield 1,5 crediti.
- Prima evoluzione: reclutare con un alleato conserva lo slancio dello starter vivo in panchina; crescita salvata prima di Continua, KO esclusi e Divisa applicata una volta.

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
