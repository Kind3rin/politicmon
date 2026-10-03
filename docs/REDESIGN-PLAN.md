# Politicmon: piano del redesign completo

Aggiornato il 3 ottobre 2026. Obiettivo attivo: rifare gameplay, scene, asset,
dialoghi satirici, lotte, evoluzioni e schede; rivedere anche ambienti, edifici e PG, usando il credito Higgsfield dove
migliora il gioco. I round pubblicati sono tappe; il progetto non è dichiarato
completamente ridisegnato. Le vecchie rinunce per «basso ROI» del piano PixelLab
sono superate dalla richiesta attuale.

## Baseline verificata

52 specie, 78 mosse, 49 allenatori, 66 mappe, 50 quest, 8 eventi meme classici.
Salvataggi v18 con migrazione v13 verificata. Il deploy esistente è
[politicmon.vercel.app](https://politicmon.vercel.app/); master attiva CI e Vercel.
Ogni round termina con documentazione, verifiche pertinenti, schermate e pubblicazione.

| Area | Stato attuale | Prova |
|---|---|---|
| Roster | 52 fogli Higgsfield, quattro pose per specie e 62 PNG statici coerenti; caricature testuali rimosse | `shot:monster-frames`, `check:evolutions` |
| Battaglie | Polemica, Fuorionda/cattura virale, intento onesto, tre eventi iniziali al turno 2 e PV numerici | Prova touch reale: prima vittoria e cattura; unit test |
| Boss e prove | Trentuno illustrazioni, dossier e leader persistente; prove facoltative fino alla Consulta, allo Stretto a Offshore e a Bruxelles con livelli distinti per difficoltà | `shot:boss-briefing`, `check:first-campaign` |
| Morale | Fiducia, coesione, tre promesse con scadenza, otto scelte civiche e memorie nei dialoghi; passerella costruibile | unit test, `shot:morale-satire`, `check:civic-bridge` |
| Governo Ombra | Sala propria, sei dossier completi, firma per nomina/sfiducia/trasferimento; costi e benefici sospesi per KO o riserva | `shot:government`, `check:government:release`; GOVERNO-VERBALE |
| Mondo | 294 nuovi PNG per personaggi, veicoli, edifici, terreni e arredi; matrice delle 66 mappe | `shot:world-redesign`, controlli di ingombri/porte e prova del ponte |
| Politicdex | Quattro fatti, volti avvistati, filtri diretti e dettagli habitat/evoluzioni su richiesta | Schede note/ignote, filtri e due rami evolutivi giocati via touch |
| Schede squadra | Quattro fatti iniziali; evoluzione diretta, mosse/dati/difese/archivio su richiesta | Partita touch su squadra guadagnata e unit test |
| Evoluzioni | Prima forma al LV8, prossima mossa LV9; quattro fatti, confronto facoltativo, animazione Higgsfield e ritorno automatico | Ellyna → Schleinix giocata, unit test; saldo 352,47 |
| Borsa/negozio | Cura in due scelte, PV effettivi e ritorno automatico; filtri e dettagli facoltativi | Caffè giocato: 17 → 27 PV, quantità 6 → 5 |
| Quartier generale | Titolo, circolo, missioni e archivio rivisti; dossier completi delle 49 missioni | `shot:hq`: 105 viste e prove di trasferimento/tocco |
| Rete e tipi | Lobby scorrevole, chat completa, 52 offerte leggibili, otto nuovi emblemi; duello e scambio su rete reale | `shot:social-ui`, `check:duel`, `shot-trade` |
| Campagna politica | Cinque nuovi ambienti, tre scelte con dossier annullabile, effetti reali e riparazione; schede nette, collegi leggibili e scrutinio | `shot:campaign-ui`: 153 viste, unit test e prove di rete |
| Apprendimento | Stesso confronto da direttiva/livello, rinuncia prima della modifica, PP conservati | `shot:supplies` |
| Epiloghi e postgame | Quattro finali personali, ricordi nella tessera, monumenti illustrati, ritmo accessibile e favori annullabili | `shot:epilogue`: 214 viste, transazioni e salvataggi |
| Casinò e Coppa | Tre ambienti, venti PNG, probabilità esplicite, invito giornaliero, leader e save protetto durante i match | `shot:arena`: 843 viste, 272 test |
| Ingresso, pausa e scorta | Titolo/slot/starter diretti, scheda starter con quattro fatti, pausa con sei azioni, cure con oggetto/scorta/PV anticipati e ritorno automatico | Prova touch: cura 13→21 PV, caffè 6→5; slot protetti; 360 test |
| Riserve e direzione iniziale | Borsa di lotta touch, PV/status/scorte e contrattacco visibili; blocco sprechi/Coppa; obiettivi concreti dopo Nino | Cura giocata 20→30/31, caffè 6→5; 363 test; Renzilla/Gianni giocati, cura 34→39 PV e caffè 5→4; sei formati |
| Cambio in lotta | Tutte le riserve direttamente toccabili, costo anticipato, cambio gratuito senza sì/no; lista con palette coerente | Salvinott schierato in due tocchi, annullamento e vittoria giocati; 366 test, mirror/KO/contrattacco; sei formati senza overflow |
| Cornice esterna | Blocco verticale compatto; pulsanti contestuali grandi nelle lotte, con danni/PP/costi e due tocchi per mossa | Prova touch reale e sette viewport senza overflow; POCO fisico non disponibile |
| Primo atto | Reclutamento con EXP, crescita iniziale, mosse della panchina, sfide volontarie e accessi protetti | `playtest:campaign:native`: tre starter fino ad Auditel; `check:first-campaign` |
| Eurotown | Ospiti e Hans volontari, cura rapida e veritiera, satira della scelta precompilata, guida al leader | Tre partite tattiche nuove fino a Spread; `check:first-campaign` |
| Capitale | Percorso 3 e prove della Tower volontari, satira di foto/conto/agenda, guida ai rifornimenti e veicoli | Tre partite nuove fino a Dazio; briefing nativi nei due motori |
| Preparazione e archivio | Recupero gratuito delle mosse al livello, dossier reale della squadra avversaria, comparsa sicura degli sfidanti | Tre starter fino al Garante con preparazione diversa; limiti e confronti in STRETTO-COLLAUDO |
| Palazzo e Colle | Tre prove illustrate e volontarie, rifornimenti accessibili, verbale del morale letto al finale | Partita nuova di Ellyna fino al Garante; altri percorsi e limiti in COLLE-VERBALE |
| Stretto | Cinque nuovi briefing, satira rendering/collaudo, ritorno prima della sfida e Tessera evolutiva; prove manuali anche dopo il Capitano | Tre partite nuove con preparazione diversa fino al Garante; confronto Giorgetta senza kit e accessi in due motori |
| Offshore | Lido a conchiglia, palme, Tesoriere direzionale, tre dossier e negozio; satire originali e morale conservato | Tre campagne riprese da salvataggi giocati, porte/ritorno/Bruxelles in due motori; OFFSHORE-REGISTRO |
| Bruxelles | Palazzo e caffè propri, materiali, cast direzionale, cinque dossier e verbale del morale | Tre campagne normali, percorsi nativi e accesso al Campo Largo nei due motori; BRUXELLES-VERBALE |
| Campo Largo | Set e retropalco propri, quattro cast, foto con conseguenze, Circolo e reclutamento LV 43–46 | Quattro segmenti guadagnati, foto alternative e 16 direzioni nei due motori; CAMPO-CORNICE |
| Futuro Anteriore | Sede e tre sale proprie, sette cast, verbali prima delle leve, dossier manuale e vivaio guadagnato | Cinque segmenti normali fino al vertice, riparazioni ed evoluzione reali; FUTURO-VERBALE |
| Hotel Diplomatico | Cinque mappe, cinque cast, tre suite, patti/debiti reali e Partner manuale | Cinque segmenti normali guadagnati fino al Tour; DIPLOMACY-VERBALE |
| Tour e Palazzo dei Feed | Cinque collegi, quattro archivi e studio con cast/materiali propri, quiz e sigillo esplicito | TOUR-VERBALE, PALAZZO-VERBALE; due campagne nuove complete in CONTROLLI-CAMPAGNE-VERBALE |
| Audio | 19 nuove composizioni stereo, mixer da titolo/pausa, feedback e preferenze indipendenti dai save | `shot:audio`, `check:audio-runtime`, `check:audio-release`; CPU ×4 con musica attiva |
| Avvio | Nuovo filmato illustrato silenzioso, salto con focus/input protetti, fallback e movimento ridotto; inventario JSON versionato | OPENING-VERBALE e CONTROLLI-CAMPAGNE-VERBALE: 46 casi nei due motori |
| PWA | Scocca Android rivista, 20 layout/sei rotazioni; release locale con 798 asset Higgsfield e 19 tracce AAC offline | MOBILE-PWA-LAYOUT, GOVERNO-VERBALE; `smoke:pwa:release` |

Credito osservato all'inizio dei round Higgsfield: 885,97. Saldo attuale
verificato: 352,22; spesa cumulativa 533,75 crediti. Non sono stati attivati acquisti
né abbonamenti. Il credito residuo è autorizzato per ulteriori risorse del gioco.

## Ultimo round: collezione ed eventi

Politicdex giocato con quattro fatti e dettagli diretti; tre eventi di campo provati negli incontri del Percorso 1, cattura di Grillix e Articolo 1 al LV9 e crescita fino al LV10.
354 test, build, sei formati senza overflow e salvataggio riaperto offline (quattro membri); 833 risorse precache; atlante Higgsfield 0,25 crediti, saldo 352,22. Budget totale 356 KiB, iniziale 250 KiB invariato.
Il titolo e i menu del mondo rallentano ancora il ritmo; valutazione umana della slice e verifica sul POCO fisico restano aperte.

## Round precedente: prima crescita

Campagna nuova giocata con input touch: cattura → pratica → due selvatici → Ellyna LV8/Schleinix → Gianni LV9 vinto in quattro turni.
Quattro fatti nella squadra, confronto di evoluzione facoltativo e cure senza conferma finale; salvataggio riaperto offline con 1560€ e sondaggi 69%.
346 test, build e sette formati senza overflow; Higgsfield 0,25 crediti, saldo 352,47. Verifica sul POCO fisico ancora necessaria.

## Round precedente: lotte e ritmo della prima zona

Avvio e starter abbreviati, Polemica/cattura rapida e pulsanti mobili giocati nel browser.
Ellyna ha vinto il rivale e reclutato Vannaccix; la prima evoluzione e l'ordine della slice
restano da ripensare. 340 test; animazione Fuorionda: 0,25 crediti, saldo 352,72.
Pratica ridotta vinta in quattro turni reali; PWA locale riaperta offline con i progressi guadagnati.
La pubblicazione di questa tappa non conclude il mandato in `CODEX-GOAL.md`.

## Round precedente: PWA installata

[MOBILE-PWA-FINALE.md](MOBILE-PWA-FINALE.md): strumenti in alto, controller al bordo inferiore sicuro, superficie aperta senza piastra e pulsanti piatti. 20 layout e sei rotazioni nei due motori, dieci prove compilate della guida, 325 test e 41 contratti input. La misura locale include ora anche la configurazione TURN di produzione: 358352/358400 byte gzip. Nessuna generazione in questa rifinitura. Pubblicazione registrata nel proof.

## Round precedente: Governo Ombra

[GOVERNO-VERBALE.md](GOVERNO-VERBALE.md): sala dedicata Higgsfield, incarichi leggibili, benefici e costi completi, firma prima di cambiare la squadra di governo, effetti della Salute descritti correttamente. Catalogo dei capitoli coerente con i dossier. 0,25 crediti; saldo 352,97. 92 viste nei due motori e percorsi touch della produzione locale dal finale guadagnato di Giorgetta; dettagli e stato del deploy nel proof del round.

Il round precedente [Comandi e campagne nuove](CONTROLLI-CAMPAGNE-VERBALE.md) corregge l'autorepeat e completa due nuove campagne ininterrotte: Giorgetta normale e Renzino difficile, con cinque dossier, quattro archivi, finale e ritorno al mondo. La prova usa classi reali e input, con tempo virtuale, senza assegnare risorse o vittorie. Il nuovo filmato e gli interni sono documentati in [OPENING-VERBALE.md](OPENING-VERBALE.md) e [WORLD-INTERIORS-VERBALE.md](WORLD-INTERIORS-VERBALE.md). Il runtime Governo `dc4db98`, che comprende filmato e interni, è pubblicato anche sulla PWA principale; risultati e limiti nel proof del round.

## Round storico: Genova

[GENOVA-VERBALE.md](GENOVA-VERBALE.md): porto e tre cast propri, sequenza visibile, feedback distinto, allenamento riaperto dal DJ e contabile con debiti reali. Dodici job, 21 PNG, 18 crediti; 296 test, otto percorsi pubblici nativi a tempo/senza timer dai salvataggi guadagnati e 214 viste per motore. Offline e budget mantenuti; prove dettagliate e pubblicazione nel [proof](genova-proof.json). Tour e Palazzo restano da ridisegnare; goal attivo.

## Round precedente: controller mobile

[MOBILE-CONTROLS.md](MOBILE-CONTROLS.md): cornice più aperta e comandi adatti ai pollici, croce trascinabile e input indipendenti, notch/rotazione, corsa nativa destra+B da salvataggio guadagnato. 292 test; 20 viewport e dieci percorsi di produzione nei due motori. Cataloghi deduplicati con tutti i dati verificati: bundle 358163 byte gzip, 237 di margine. Pubblicato `df71efb`, CI 37010182278 e tre Vercel riusciti; dieci prove della cornice, sei percorsi Hotel, checksum e PWA pubblici passano. Nessuna generazione a pagamento in questo round. Genova/Tour è il prossimo tratto e il goal integrale resta attivo.

## Round precedente: Hotel Diplomatico

[DIPLOMACY-VERBALE.md](DIPLOMACY-VERBALE.md): 35 PNG, cinque cast, suite distinte, padiglione a vetri e Partner manuale. Cinque segmenti guadagnati verificano riparazione, secondo strappo, sondaggi saturi e Futurorso realmente reclutato nel tratto precedente. Il premio inizializza nuovi collegi e mantiene i conti civici. 37,5 crediti, saldo 484,72; 291 test, 20 direzioni del cast nei due motori, 153 viste delle scelte, 563 checksum grafici, 669 asset offline e 19 AAC. Font lossless con digest dei 66 glifi; bundle 358245 byte su 358400, p95 massimo 17,6 ms. Verifiche di pubblicazione registrate in [diplomacy-proof.json](diplomacy-proof.json) dopo il deploy. Prossimo tratto in [GENOVA-TOUR-AUDIT.md](GENOVA-TOUR-AUDIT.md); il goal generale resta attivo.

## Round precedente: Futuro Anteriore

[FUTURO-VERBALE.md](FUTURO-VERBALE.md): nuova sede, tre uffici distinti, sette cast, due verbali prima delle leve e tre scelte con memoria dei debiti. Il Segretario apre un dossier manuale e conserva il morale al premio; il vivaio dopo la vittoria offre Vannaccix 43–46 nelle due versioni. Cinque segmenti guadagnati vincono: una prova paga le promesse scadute, recluta Vannaccix e consuma la Tessera ottenuta per Futurorso. 44 PNG, 39 crediti, saldo 522,22; 288 test, 28 viste del cast nei due motori, 146 viste delle scelte, 12.551 layout dossier per motore, 529 checksum PNG, 636 asset offline e 668 risorse esatte di build. Pubblicato `a7ef2b2`: CI 36999201936 e tre deploy riusciti; checksum, offline e sei percorsi nativi pubblici verificati in Chromium/WebKit. Prove e limiti del tempo di installazione in [future-proof.json](future-proof.json). Il prossimo audit è [DIPLOMACY-AUDIT.md](DIPLOMACY-AUDIT.md): tre segmenti normali hanno già verificato le scelte, il Partner e l’arrivo al Tour con morale conservato; baseline storica conservata; il nuovo Hotel è documentato nel round successivo. Il goal generale resta attivo.

## Round precedente: Campo Largo

[CAMPO-CORNICE.md](CAMPO-CORNICE.md): 17 job, 29 PNG, 25,5 crediti. Tre dossier manuali, quattro attori, patti/cohesione con conseguenze osservate, Circolo e crescita di un reclutamento realmente schierato. Quattro segmenti guadagnati vincono in normale; 286 test, 12.551 layout dei dossier per motore, 486 checksum PNG e 594 risorse offline. L’inventario PWA è un dato JSON versionato: 626 risorse di build verificate senza esclusioni. I percorsi nativi della produzione locale verificano retropalco, varco bloccato e accesso guadagnato a Futuro nei due motori. Saldo 561,22. Il commit `044516d` ha CI 36992112395 e tre deploy Vercel riusciti; checksum, PWA e sei percorsi nativi pubblici passano nei due motori. Provenienza nel verbale; il prossimo tratto è [FUTURO-ANTERIORE-AUDIT.md](FUTURO-ANTERIORE-AUDIT.md). Il goal generale resta attivo.

## Round precedente: Bruxelles

[BRUXELLES-VERBALE.md](BRUXELLES-VERBALE.md): dodici job, quindici PNG, 18 crediti. Cinque sfide volontarie, preparazione sul posto e finale che conserva le promesse reali. Tre segmenti da salvataggi guadagnati vincono in normale; 286 test e 11.222 layout per motore. Porte, cure, ritorni e accesso guadagnato al Campo Largo verificati in Chromium/WebKit. Bundle 357.884 byte gzip, 458 checksum PNG, 566 risorse PWA. Il deploy `6d58cb0` ha CI 36984334435 e tre Vercel riusciti; checksum pubblici e PWA nei due motori verificati. La hostess è ora ferma al molo dopo un ostacolo incontrato nella prova pubblica. Il follow-up `9a5a78a` ha CI 36985613752 e tre Vercel riusciti; i percorsi pubblici al caffè e al Campo Largo passano nei due motori. Il goal generale resta attivo; [CAMPO-LARGO-AUDIT.md](CAMPO-LARGO-AUDIT.md) documenta il prossimo capitolo.

## Lavoro ancora necessario

1. **Esplorazione e mondo.** Audit visivo delle 66 mappe e dei percorsi reali,
   identità di quartieri e interni, scene e oggetti coerenti con la satira,
   segnaletica leggibile, incontri e deviazioni che producano decisioni.
   I PNG di player, NPC, terreni, edifici e veicoli sono sostituiti e revisionati
   su 253 viste campione. Restano percorsi, incontri e identità delle singole
   zone: la matrice non prova una campagna interamente percorsa.
2. **Lotte e crescita.** Rivedere ritmo delle lotte selvatiche, curva delle mosse
   dopo il nuovo confronto, strumenti tattici, ricompense e identità delle evoluzioni ramificate.
   Verificare campagne preparate e improvvisate, consumabili e combinazioni,
   senza affidare il bilanciamento al solo tasso di vittoria di una fixture.
   La campagna normale fino al Garante è percorsa tramite input con tutti e tre gli starter, con diverse preparazioni;
   due ulteriori campagne nuove arrivano ora al finale in normale e difficile. Restano ritmo umano della preparazione e combinazioni alternative; la vittoria di due percorsi non prova ogni strategia.
3. **Interfaccia completa.** Titolo, box, missioni e archivio hanno ricevuto una
   revisione con dossier e prove delle azioni. Epiloghi, tessera, monumenti,
   Genova, retrobottega, casinò e Coppa sono ora rivisti. Onboarding, pausa e trasporto stradale hanno ricevuto una revisione con dossier e prove delle azioni.
   Anche la cornice esterna è rivista con guida modale e controlli nativi. Proseguire la revisione dei flussi integrati e dei box meno frequenti; il censimento delle 49 scene non prova che ogni loro stato sia moderno. Eliminare layout e asset residui vecchi;
   mantenere controlli leggibili su canvas 240×180 e mobile.
4. **Scrittura.** Revisione dei dialoghi e degli archi di ogni zona, incluse
   ricorrenze e risposte alle azioni. La ricerca web deve generare satira
   originale con bersagli e contraddizioni precisi, senza copiare i meme.
   Il round carburante aggiunge una scena, non esaurisce questa revisione.
5. **Audio e animazione.** Riesaminare feedback, musica, transizioni e momenti
   chiave; usare media generati dove servono al ritmo o alla comprensione.
   Diciannove temi e regia sono ora sostituiti e verificati offline nei due motori;
   restano ascolto su dispositivi fisici, sessioni lunghe e prove integrate con tutti gli effetti.
   Ogni effetto deve rispettare RIDUCI EFFETTI e RITMO RAPIDO.
6. **Verifica integrale.** Campagna reale dall'inizio al finale, postgame,
   evoluzioni e percorsi alternativi, import/export dei save, offline e
   dispositivi. Duello e scambio su relay raggiungibili sono riusciti nel round rete.
   Le due campagne nuove complete sono documentate nel round comandi. Restano chat reale, dispositivi e reti diverse: due browser testati non
   certificano ogni condizione di NAT o rete mobile.

## Regole di produzione

- Generare risorse destinate a scene o sistemi concreti; registrare prompt, job,
  saldo e file finali. Controllare l'immagine prima dell'integrazione.
- Per player, NPC e veicoli che cambiano direzione, produrre viste N/S/E/O;
  tenere ancoraggi, trasparenza, dimensioni e ingombri coerenti con le mappe.
- Migrare le scene al nuovo renderer; un fallback neutro protegge il caricamento,
  ma un vecchio asset presente non deve essere considerato un redesign finito.
- Conservare salvataggi e stato durante la consultazione; pagamenti, PP e
  ricompense avvengono nelle azioni che li dichiarano.
- Rispettare i budget misurati: iniziale ≤250 KiB gzip, totale ≤350 KiB, p95 ≤33,4 ms
  sotto CPU Chromium ×4. Le nuove funzioni richiedono rimozione di codice morto
  o caricamento modulare, non l'aumento silenzioso dei limiti.
- Aggiornare le guide alla fine di ogni round, distinguendo prove eseguite e
  lavoro aperto. Il completamento richiede evidenza su tutte le aree sopra.

## Round precedente: Offshore

[OFFSHORE-REGISTRO.md](OFFSHORE-REGISTRO.md): nuova identità dell’isola, edificio, palme e Tesoriere; tre dossier volontari, negozio e morale letto al finale. Sei job Higgsfield, nove PNG, 9 crediti; saldo 604,72. Tre salvataggi realmente giocati superano le prove e il boss in normale, con reclutamenti diversi. 286 test, 9.724 briefing per motore, ritorno e viaggio a Bruxelles verificati senza Tesoriere o Sherpa. Build 357.916 byte gzip, margine 484; 443 checksum PNG, 20 audio/catalogo e 552 risorse PWA. Difficoltà alta, altri seed e atti successivi restano aperti. Pubblicazione `817fbb2`: CI 36979312017 e tre deploy Vercel riusciti; checksum e PWA pubblica verificati nei due motori. [BRUXELLES-AUDIT.md](BRUXELLES-AUDIT.md) registra ambienti, sfide e scrittura ancora da rivedere.

### Round precedente: archivio

[ARCHIVIO-PREPARAZIONE.md](ARCHIVIO-PREPARAZIONE.md): recupero delle linee
dimenticate, dossier di tutti i rivali prima della sfida e controllo dei
passaggi quando compare uno sfidante. Tre partite nuove: Ellyna e Giorgetta
vincono il Garante, Renzino perde due volte. 283 test, 633 viste archivio
per motore e 6.605 briefing. 0,25 crediti; saldo 615,22. Build totale
355.695 byte gzip, margine 2.705. Restano Renzino, atti successivi, audio,
scrittura e verifica integrale. Pubblicazione `91a217e`: CI e tre deploy
Vercel riusciti, 428 checksum pubblici, 537 asset PWA nei due motori e sei
configurazioni della cornice esterna. Reload offline verificato in Chromium.

### Round precedente: Palazzo e Colle

[COLLE-VERBALE.md](COLLE-VERBALE.md): tre giudici illustrati e volontari,
Garante su interazione A, ritorno al bar e guida alle cure. Nuova satira
su regole comuni, competenze e diritti. Palazzo e Garante leggono il morale
reale. Ellyna preparata raggiunge il finale da NUOVA PARTITA; i percorsi
tattici con Giorgetta/Renzino perdono due volte contro il Garante, quindi
la loro progressione resta aperta. 1,50 crediti, saldo 615,47. 281 test,
3.690 briefing, 105 viste HQ, 427 checksum locali e 536 asset PWA. Totale
358.361 byte gzip: 39 byte di margine. Restano progressione delle diverse
squadre al Colle, atti successivi, audio, scrittura delle altre zone e
verifica integrale. Il redesign non è dichiarato completo.

Pubblicazione `258b8bc`: CI 36964930805 e tre deploy Vercel riusciti.
Verificati sul dominio pubblico 427 checksum PNG, 536 asset PWA e sei
configurazioni della cornice in Chromium/WebKit. Il corridoio del bar
di Capitale è protetto anche dalle sfide opzionali adiacenti alla porta;
la partita che si bloccava ora arriva al Garante. I limiti di equilibrio
sono conservati anche in `colle-playtests.json`.

[CAPITALE-PREPARAZIONE.md](CAPITALE-PREPARAZIONE.md): sei sfide volontarie,
due briefing illustrati, nuova satira e guide veritiere di porto/veicoli.
Tre partite preparate conquistano Dazio al primo tentativo; Giorgetta
diretta perde e poi vince. Livelli e IA conservati. 0,50 crediti, saldo
616,97. 281 test, 3.030 briefing, 103 viste HQ, 424 checksum locali e 533
asset PWA. Avvio 212.218 → 189.284 byte gzip; totale 358.042, con 358 byte
di margine. Il worker è ora compilato; restano Palazzo, Colle, atti
successivi, audio, scrittura delle altre zone e verifica integrale.

Pubblicazione `40c7c9d`: CI e tre deploy Vercel riusciti; 424 checksum
pubblici, 533 asset PWA e sei configurazioni della cornice esterna
verificati in Chromium/WebKit. Reload offline verificato in Chromium.

[EUROTOWN-SCELTE.md](EUROTOWN-SCELTE.md): sfide volontarie dal Percorso 2,
Hans illustrato, bar che recupera PV/PP/status/KO con lezione una volta,
satira originale del consenso precompilato e della consulenza sulla
semplificazione. 0,25 crediti; saldo 617,47. Tre nuove partite preparate
conquistano Spread al primo tentativo; la prova diretta di Giorgetta perde
due volte. Livelli e IA avversari conservati. 280 test, 2.622 briefing,
103 viste HQ, regressioni native in Chromium/WebKit, 422 checksum locali
e 531 asset PWA. Bundle 212.218/358.369 byte gzip: restano appena 31 byte
nel budget totale. Prossime funzioni richiedono recupero di spazio; la
campagna integrale, l'audio e le altre zone restano aperti.

Pubblicato in `2bdc24e`: CI e tre deploy Vercel riusciti, 422 checksum sul
dominio pubblico, 531 asset PWA e sei configurazioni della cornice esterna
verificati in Chromium/WebKit. Reload offline verificato in Chromium.

[PATTI-CONSEGUENZE.md](PATTI-CONSEGUENZE.md): cinque ambienti, 261 test, 142 viste,
anteprime annullabili, coesione e riparazione effettiva; bonus dichiarati collegati
a prezzi e ricompense. Spesa: 10 crediti, saldo 657,97. PWA: 491 risorse;
verificatore del deploy: 382 checksum. Bundle 206,6/340,5 KiB, budget invariati.

[RETE-EMBLEMI.md](RETE-EMBLEMI.md): undici PNG, 83 viste sociali, storico completo,
otto emblemi, duello e scambio reali; rimossi quattro PNG e il vecchio renderer
delle cornici. Spesa: 12 crediti. PWA: 486 risorse, deploy: 377 checksum.


[COERENZA-GRAFICA.md](COERENZA-GRAFICA.md): 62 PNG di riserva nativi, pannelli
uniformi e guida ai tipi; 52 ritratti e 62 pose in lotta con animazioni bloccate.
Zero nuovi crediti. La PWA verifica 475 risorse, il deploy 366 checksum.


[QUARTIER-GENERALE.md](QUARTIER-GENERALE.md): nove PNG, 254 test, 99 viste,
47 dossier completi, circolo consultabile e archivio con caricamento tramite
tocchi. Spesa del round: 10 crediti. La PWA verifica 413 asset.
Il round precedente [MONDO-CANTIERI.md](MONDO-CANTIERI.md) pubblica 295 PNG,
252 viste su 66 mappe e la passerella persistente. I controlli di campagna
rimangono simulazioni di checkpoint, non una partita completa nell'interfaccia.
[Asset e provenienza](HIGGSFIELD-ASSETS.md). Il mandato resta attivo finché tutte
le superfici del gioco avranno un aspetto nuovo e coerente.

### Epiloghi e postgame — 2 ottobre 2026

[EPILOGHI-POSTGAME.md](EPILOGHI-POSTGAME.md): sette ambienti, quattro ricordi
e quattro statue, 265 test e 214 viste native. Finali con promesse e alleati
nominati, premi visibili, monumenti annullabili, finestre ritmiche e pausa,
favori con dossier e conferma. 18 crediti, saldo 639,97. Verifica PWA su 506
risorse e 397 checksum nella build. Obiettivo generale ancora attivo.

Il round epiloghi è pubblicato in `4340c40`, con CI riuscita e verifica sul
dominio pubblico: 397 checksum, codice aggiornato e 506 risorse offline.

### Casinò e Coppa — 2 ottobre 2026

[CASINO-COPPA.md](CASINO-COPPA.md): venti PNG e rimozione del cabinet inutilizzato,
probabilità e costi consultabili, invito giornaliero con effetti sulla morale,
squadra della campagna protetta durante i salvataggi del torneo, livelli esatti,
leader e nuove battute dei sette fantasmi. 14 crediti; saldo 625,97.
272 test, 843 viste native, budget di performance invariati.

Pubblicazione del round casinò/Coppa verificata: `63f88cc` e correzione
comandi tessera `5efbb84`, CI riuscita, tre deploy Vercel riusciti, 416
checksum sul dominio pubblico e 525 asset offline in Chromium e WebKit.
Il reload offline è verificato soltanto in Chromium. La prova dei match
forza gli esiti e non chiude il lavoro sul bilanciamento della campagna.
La priorità emersa in quel round, onboarding con descrizioni complete,
pausa e viaggi, è affrontata nel round seguente.

### Ingresso, pausa e viaggi — 2 ottobre 2026

[INGRESSO-PAUSA-VIAGGI.md](INGRESSO-PAUSA-VIAGGI.md): quattro ambienti,
dossier degli starter interi, guida legata alla missione, pause e opzioni
scorrevoli, scorta con conferma e tutorial che consente la riprova dopo
sconfitta senza falsa vittoria. 8 crediti; saldo 617,97. 276 test e 514/506
viste Chromium/WebKit. Pubblicazione `162520d` con CI e Vercel riusciti, 420
checksum pubblici e 529 risorse PWA su entrambi i motori (reload offline solo
Chromium). Sei lotte del tutorial tramite input, in aggiunta
ai callback forzati. La campagna completa non è ancora verificata.

### Cornice e controlli — 2 ottobre 2026

[INTERFACCIA-ESTERNA.md](INTERFACCIA-ESTERNA.md): rimozione della scocca vecchia,
guida modale, focus e input nativi, pulsanti da 44px, salvataggio reale e
controlli senza sovrapposizioni anche in orizzontale. 20 configurazioni fra
Chromium/WebKit, rotazione e pausa nel mondo e in lotta. 0 nuovi crediti,
saldo riletto 617,97. 276 test e budget 207,3/349,3KiB, p95 18,5ms.
Restano scrittura delle zone, ritmo dei percorsi, audio e campagna integrale.

### Primo atto e crescita — 2 ottobre 2026

[PRIMO-ATTO-GAMEPLAY.md](PRIMO-ATTO-GAMEPLAY.md): EXP iniziale graduata senza
modificare soglie dei save, catture con crescita, mosse della panchina,
due missioni di orientamento, sfidanti volontari, Nino con ID proprio e Mara
facoltativa. Corretta la comparsa di sfidanti sulle porte. Un PNG Higgsfield,
0,25 crediti, saldo 617,72. 280 test, 2.400 briefing, 103 viste HQ, 511 viste
ingresso/pausa/viaggi e regressioni native in Chromium/WebKit.

Le partite normali dei tre starter conquistano Auditel: due al primo
tentativo, Renzino al secondo. Con la stessa politica Ellyna passa da
15 selvatici di preparazione nella precedente build a 3; il boss conserva
livelli e cure. Una prova diretta al livello 5 perde, una prova separata
di Nino prosegue fino alla medaglia. Risultati naturali tramite input,
tempo virtuale accelerato, nessuna certificazione della campagna integrale.
Build locale: 421 checksum, 530 risorse PWA, bundle 207,3/349,9 KiB e p95
massimo 17,6 ms con CPU ×4. Il margine del bundle richiede interventi sulla
modularità prima di ulteriori funzioni; i limiti restano invariati.

Round pubblicato in `89addbb`: CI e tre deploy Vercel riusciti, 421 checksum
sul sito pubblico, PWA con 530 asset in Chromium/WebKit e sei configurazioni
della cornice esterna riuscite. Reload offline verificato in Chromium.

### Stretto e collaudo — 2 ottobre 2026

[STRETTO-COLLAUDO.md](STRETTO-COLLAUDO.md): cinque nuove illustrazioni,
sfide avviate con A, Geometra disponibile dopo il Capitano e missione
che indica il traghetto reale, anziché una rotta Auto Blu inesistente.
Tre partite nuove arrivano al Garante: Renzino usa una Tessera su Salvinator,
Giorgetta acquista due Gilet; il confronto senza kit perde due volte al
Capitano e al Garante. La morale ricorda le promesse scadute anche dopo
la vittoria. 1,25 crediti, saldo 613,97; 283 test, 8.449 briefing per motore,
105 viste HQ, 433 checksum locali e 542 risorse PWA. Obiettivo attivo:
restano audio, scrittura e ritmo delle zone successive, altri seed e
campagna completa in difficoltà elevata.

Round Stretto pubblicato in `83badd5`: CI e tre deploy Vercel riusciti,
433 checksum sul dominio pubblico, 542 risorse PWA nei due motori e sei
configurazioni della cornice esterna. Reload offline solo Chromium.

### Regia audio — 2 ottobre 2026

[AUDIO-REGIA.md](AUDIO-REGIA.md): diciannove nuove composizioni stereo,
feedback rivisto, mixer dal titolo e dalla pausa, preferenze separate dai
salvataggi, sospensione in background e cache di due tracce decodificate.
Un PNG Higgsfield, 0,25 crediti; saldo 613,72. 286 test, 30 layout per
motore, runtime e build di produzione tramite input nei due motori.
CPU ×4 con musica attiva: p95 17,6 ms, bundle 183,4/348,9 KiB entro i
limiti invariati. 434 checksum PNG e 20 audio/catalogo locali; 543 asset
Higgsfield e 19 AAC decodificati offline in Chromium/WebKit. Reload
offline solo Chromium. Ascolto e FPS su dispositivi fisici restano aperti.

Round audio pubblicato in `1c2f092`: CI e tre deploy Vercel riusciti;
434 checksum PNG e 20 audio/catalogo sul dominio pubblico, mixer
percorso con input reali nei due motori, 543 risorse Higgsfield e 19 AAC
decodificati offline. Sei configurazioni della cornice esterna riuscite.
Reload offline solo Chromium. Il redesign integrale resta attivo.

Priorità aggiornata dall’utente: cornice e controller mobile precedono Genova. Hotel pubblicato `8259273`, CI 37007307216 e tre Vercel riusciti; checksum, PWA e sei percorsi pubblici nativi verificati nei due motori.

[Controller mobile](MOBILE-CONTROLS.md): cornice aperta e controlli in basso/laterali, croce trascinabile, fonti indipendenti per dito/tasto, notch e rotazione. 292 test, 20 viewport dei due motori, dieci percorsi di produzione locale e corsa nativa da codice guadagnato. Cataloghi deduplicati con tutte le proprietà verificate; 358163 byte gzip, 237 di margine. Pubblicazione e verifiche pubbliche registrate nel proof; [Genova/Tour](GENOVA-TOUR-AUDIT.md) rimane la fase successiva.

Genova completata come round locale: [verbale](GENOVA-VERBALE.md). Il seguito prioritario è Tour/Palazzo, comprese le otto segnalazioni strutturali preesistenti nel controllo mappe. Il redesign integrale non è completato.

Genova pubblicata `16ae1b1`: CI 37024130490 e tre Vercel riusciti, otto percorsi pubblici con tastiera/tap, checksum e PWA pubblici passano. Correzione aggiuntiva delle due porte visibili della terrazza finale, mantenendo le uscite precedenti; pubblicazione e routing nel proof.

Follow-up `31a198d`: porte visibili della terrazza finale collegate, uscite precedenti conservate. 296 test; CI 37026260106 e tre Vercel riusciti. Otto fixture native pubbliche di routing passano; checksum e offline pubblico verificati di nuovo. Non è una vittoria finale guadagnata e non completa il redesign di Tour/Palazzo.

[Tour: cinque dossier, una sola memoria](TOUR-VERBALE.md): centrale e cinque collegi distinti, 48 PNG da 25 generazioni, dossier con conferma finale e verbale riapribile. Cinque dibattiti vinti tramite input nel motore reale; le promesse lasciano un patto rotto, due tesi e coesione 72→40. 37,5 crediti, saldo 429,22; 303 test, due percorsi di produzione touch, 631 checksum PNG, 769 risorse in precache. Minificazione dei soli simboli privati verificata; 358265 byte gzip, budget invariato. Pubblicazione nel proof. Prossima fase: Palazzo e finale, animazioni e campagne ulteriori; comfort fisico ancora da valutare.

Tour pubblicato `503ce4e`: CI 37037523961 e tre Vercel riusciti. Due percorsi pubblici Tour con tap, dieci configurazioni della cornice, checksum, offline e quattro regressioni Genova passano. Bundle pubblico completo 358383/358400 byte gzip; la prossima espansione richiede più margine. Il redesign integrale resta attivo.
