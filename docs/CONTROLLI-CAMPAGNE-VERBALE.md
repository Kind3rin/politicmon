# Comandi e campagne nuove

Round del 2 ottobre 2026, dopo [l'apertura](OPENING-VERBALE.md). [Prove e codici guadagnati](controls-campaign-proof.json). Il redesign completo resta attivo. Il dispositivo indicato dall'utente è una PWA installata sul POCO; la verifica fisica non è disponibile.

Un tasto tenuto premuto per saltare il filmato poteva aprire anche il selettore difficoltà: dopo la chiusura dell'overlay, l'autorepeat diventava un nuovo comando. Riprodotto su Chromium e WebKit. Input ignora ora i keydown ripetuti; un movimento già tenuto continua, mentre un comando cancellato da reset deve essere rilasciato e premuto di nuovo. La tastiera HTML del nickname continua a ricevere testo ripetuto senza muovere il personaggio. Le chiavi dei salvataggi e delle preferenze non cambiano.

Passano 46 casi dell'apertura compilata nei due motori, compresi Invio, Spazio, Z e K tenuti premuti: nessuna scelta involontaria e conferma successiva dopo rilascio funzionante. Passano anche proprietà indipendenti degli input, trascinamento catturato, centro della croce, annullamento, levetta e testo nativo. Il layout compilato verifica 20 configurazioni e sei rotazioni, con modalità standalone emulata, DPR anche frazionario e margini Android asimmetrici. Il riavvio conserva la scelta croce/levetta. Non è una prova sul POCO fisico.

## Gameplay verificato

Il controller ora avvia davvero Titolo, difficoltà, slot vuoto, nickname e briefing iniziale. Stato iniziale verificato: 500 euro, squadra vuota, nessuna medaglia o flag. Ogni cattura, acquisto, evoluzione, mossa ricordata e ricompensa passa dai comandi del gioco. I vecchi nomi di milestone `earned-resume` non interrompono queste nuove partite: nessun codice viene reimportato lungo il percorso. Il tempo è virtuale, con passo 0,1 secondi; i risultati non misurano durata umana o FPS su telefono.

Correzioni del controller: copertura progressiva dei capitoli per l'endpoint elezione; nuovo approccio quando un NPC mobile occupa la casella scelta; sostegno affidato a un alleato realmente reclutato, con errore esplicito se manca; rifiuto dei nomi di piano archivio/equipaggiamento sconosciuti. La prima versione del percorso presupponeva Generorso nella coalizione e girava indefinitamente fra alleati diversi. La coalizione del gioco funzionava; il controller ora usa un membro disponibile. Non vengono alterati NPC, statistiche, prezzi o premi per far passare le prove.

| Campagna nuova | Risultato | Lotte / sconfitte | Conseguenze |
| --- | --- | --- | --- |
| Giorgetta normale, seed 20261003 | Finale e ritorno al mondo | 62 / 5 | 4 seggi, governo; Algoritmo Sovrano perso; fiducia 52, coesione 54 |
| Renzino difficile, seed 20261004 | Finale e ritorno al mondo | 109 / 4 | 4 seggi, governo; Algoritmo Sovrano vinto; fiducia 42, coesione 48 |

Entrambe guadagnano i cinque dossier territoriali e verificano le quattro sale del Palazzo. La campagna normale perde due volte il Tesoriere facoltativo e conclude comunque il percorso obbligatorio. Il risultato elettorale normale conserva quattro seggi dopo la sconfitta finale: quella lotta non sostituisce il consenso locale. Le promesse del bus e del traghetto lasciate scadere e i patti tesi abbassano davvero fiducia e coesione; vincere non ripara questi debiti.

La difficoltà alta richiede preparazione. Il primo tentativo con lead a livello 10 perde Auditel; livello 13 guadagnato nei selvatici lo supera con due KO. Le prime campagne complete falliscono prima al Dazio e poi al Garante con quattro membri. Rifornimenti acquistati, archivio e gilet non bastano da soli. Il percorso riuscito aggiunge 40 incontri selvatici allo Stretto, raggiunge una squadra di cinque prima del Garante e usa il bar gratuito: passa il Garante al primo confronto, completa anche il Tesoriere e arriva al finale con tre membri KO. I tentativi falliti sono conservati nel proof. Non è dimostrato che tutte le composizioni o strategie siano bilanciate; il costo di questa preparazione merita ancora una valutazione umana.

## Release locale

320 test, validator dei contenuti e contratti input passano. Build e codice completo, incluso il chunk del mondo: 358270/358400 byte gzip, 130 byte di margine; limite invariato. Chromium sulla release locale 4184 verifica installazione, aggiornamento, reload offline e ripresa dal background, con 797 asset Higgsfield e 19 tracce AAC. La prima invocazione dello smoke usa per errore la variabile BASE_URL anziché PREVIEW_URL, quindi verifica il server 4180: non è usata come prova della release 4184; la seconda invocazione esplicita passa sul server corretto.

Nessun credito Higgsfield speso in questo round; ultimo saldo verificato 353,22. La scocca mobile è già pubblicata sul dominio principale. Questa correzione aggiuntiva dei comandi viene registrata come pubblicata solo dopo conferma del deploy; le precedenti quote Vercel sono descritte nel verbale dell'apertura. Restano prova fisica della PWA, comfort audio e una valutazione umana del ritmo della difficoltà alta.
