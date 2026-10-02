# Politicmon: piano del redesign completo

Aggiornato il 2 ottobre 2026. Obiettivo attivo: rifare gameplay, scene, asset,
dialoghi satirici, lotte, evoluzioni e schede; rivedere anche ambienti, edifici e PG, usando il credito Higgsfield dove
migliora il gioco. I round pubblicati sono tappe; il progetto non è dichiarato
completamente ridisegnato. Le vecchie rinunce per «basso ROI» del piano PixelLab
sono superate dalla richiesta attuale.

## Baseline verificata

52 specie, 78 mosse, 49 allenatori, 66 mappe, 49 quest, 8 eventi meme classici.
Salvataggi v18 con migrazione v13 verificata. Il deploy esistente è
[politicmon.vercel.app](https://politicmon.vercel.app/); master attiva CI e Vercel.
Ogni round termina con documentazione, verifiche pertinenti, schermate e pubblicazione.

| Area | Stato attuale | Prova |
|---|---|---|
| Roster | 52 fogli Higgsfield, quattro pose per specie e 62 PNG statici coerenti; caricature testuali rimosse | `shot:monster-frames`, `check:evolutions` |
| Battaglie | Sfondi per ambiente, effetti per tipo, dossier e cambio consultabile; IA con statistiche e sei stili | `shot:gameplay-guide`, `shot:switch-guide`, simulazioni boss |
| Boss e prove | Ventotto illustrazioni, dossier e leader persistente; prove facoltative fino alla Consulta, allo Stretto a Offshore e a Bruxelles con livelli distinti per difficoltà | `shot:boss-briefing`, `check:first-campaign` |
| Morale | Fiducia, coesione, tre promesse con scadenza, otto scelte civiche e memorie nei dialoghi; passerella costruibile | unit test, `shot:morale-satire`, `check:civic-bridge` |
| Mondo | 294 nuovi PNG per personaggi, veicoli, edifici, terreni e arredi; matrice delle 66 mappe | `shot:world-redesign`, controlli di ingombri/porte e prova del ponte |
| Politicdex | Cinque pagine, filtri, habitat, condizioni e forme meme | `shot:gameplay-guide` |
| Schede squadra | Sei pagine, archivio recuperabile, descrizioni complete, oggetti e difese | `shot:evolution-dossier` |
| Evoluzioni | Confronto, rinvio, ripresa al cap, soglie aggiornate, tessera dopo conferma, presentazione accessibile | `shot:evolution-dossier`, unit test |
| Borsa/negozio | Filtri, tre pagine tattiche, preventivi, quantità e 30 nuove icone | `shot:supplies` |
| Quartier generale | Titolo, circolo, missioni e archivio rivisti; dossier completi delle 49 missioni | `shot:hq`: 105 viste e prove di trasferimento/tocco |
| Rete e tipi | Lobby scorrevole, chat completa, 52 offerte leggibili, otto nuovi emblemi; duello e scambio su rete reale | `shot:social-ui`, `check:duel`, `shot-trade` |
| Campagna politica | Cinque nuovi ambienti, tre scelte con dossier annullabile, effetti reali e riparazione; schede nette, collegi leggibili e scrutinio | `shot:campaign-ui`: 142 viste, unit test e prove di rete |
| Apprendimento | Stesso confronto da direttiva/livello, rinuncia prima della modifica, PP conservati | `shot:supplies` |
| Epiloghi e postgame | Quattro finali personali, ricordi nella tessera, monumenti illustrati, ritmo accessibile e favori annullabili | `shot:epilogue`: 214 viste, transazioni e salvataggi |
| Casinò e Coppa | Tre ambienti, venti PNG, probabilità esplicite, invito giornaliero, leader e save protetto durante i match | `shot:arena`: 843 viste, 272 test |
| Ingresso, pausa e scorta | Starter con quattro dossier, guida rileggibile, riprova dopo sconfitta, pausa scorrevole e viaggio con contratto | `shot:desk`: 514 Chromium/506 WebKit, sei lotte del tutorial via input |
| Cornice esterna | Pagina moderna, guida che ferma gli aggiornamenti, focus e controlli touch senza sovrapposizioni | `shot:shell`: 20 configurazioni, Chromium/WebKit, pause mondo/lotta, input e salvataggio reali |
| Primo atto | Reclutamento con EXP, crescita iniziale, mosse della panchina, sfide volontarie e accessi protetti | `playtest:campaign:native`: tre starter fino ad Auditel; `check:first-campaign` |
| Eurotown | Ospiti e Hans volontari, cura rapida e veritiera, satira della scelta precompilata, guida al leader | Tre partite tattiche nuove fino a Spread; `check:first-campaign` |
| Capitale | Percorso 3 e prove della Tower volontari, satira di foto/conto/agenda, guida ai rifornimenti e veicoli | Tre partite nuove fino a Dazio; briefing nativi nei due motori |
| Preparazione e archivio | Recupero gratuito delle mosse al livello, dossier reale della squadra avversaria, comparsa sicura degli sfidanti | Tre starter fino al Garante con preparazione diversa; limiti e confronti in STRETTO-COLLAUDO |
| Palazzo e Colle | Tre prove illustrate e volontarie, rifornimenti accessibili, verbale del morale letto al finale | Partita nuova di Ellyna fino al Garante; altri percorsi e limiti in COLLE-VERBALE |
| Stretto | Cinque nuovi briefing, satira rendering/collaudo, ritorno prima della sfida e Tessera evolutiva; prove manuali anche dopo il Capitano | Tre partite nuove con preparazione diversa fino al Garante; confronto Giorgetta senza kit e accessi in due motori |
| Offshore | Lido a conchiglia, palme, Tesoriere direzionale, tre dossier e negozio; satire originali e morale conservato | Tre campagne riprese da salvataggi giocati, porte/ritorno/Bruxelles in due motori; OFFSHORE-REGISTRO |
| Bruxelles | Palazzo e caffè propri, materiali, cast direzionale, cinque dossier e verbale del morale | Tre campagne normali, percorsi nativi e accesso al Campo Largo nei due motori; BRUXELLES-VERBALE |
| Audio | 19 nuove composizioni stereo, mixer da titolo/pausa, feedback e preferenze indipendenti dai save | `shot:audio`, `check:audio-runtime`, `check:audio-release`; CPU ×4 con musica attiva |
| Avvio | Nomi degli slot separati dalle mappe, catalogo fondali separato dalla selezione, worker compilato | 188.237 byte gzip iniziali, checksum e prova PWA |
| PWA | Precache e primo utilizzo offline dei 566 asset Higgsfield e 19 tracce AAC; salvataggio conservato | `smoke:pwa:release` |

Credito osservato all'inizio dei round Higgsfield: 885,97. Saldo attuale
verificato: 586,72; spesa cumulativa 299,25 crediti. Non sono stati attivati acquisti
né abbonamenti. Il credito residuo è autorizzato per ulteriori risorse del gioco.

## Ultimo round: Bruxelles

[BRUXELLES-VERBALE.md](BRUXELLES-VERBALE.md): dodici job, quindici PNG, 18 crediti. Cinque sfide volontarie, preparazione sul posto e finale che conserva le promesse reali. Tre segmenti da salvataggi guadagnati vincono in normale; 286 test e 11.222 layout per motore. Porte, cure, ritorni e accesso guadagnato al Campo Largo verificati in Chromium/WebKit. Bundle 357.883 byte gzip, 458 checksum PNG, 566 risorse PWA. La pubblicazione è in verifica; il goal generale resta attivo.

## Lavoro ancora necessario

1. **Esplorazione e mondo.** Audit visivo delle 66 mappe e dei percorsi reali,
   identità di quartieri e interni, scene e oggetti coerenti con la satira,
   segnaletica leggibile, incontri e deviazioni che producano decisioni.
   I PNG di player, NPC, terreni, edifici e veicoli sono sostituiti e revisionati
   su 252 viste campione. Restano percorsi, incontri e identità delle singole
   zone: la matrice non prova una campagna interamente percorsa.
2. **Lotte e crescita.** Rivedere ritmo delle lotte selvatiche, curva delle mosse
   dopo il nuovo confronto, strumenti tattici, ricompense e identità delle evoluzioni ramificate.
   Verificare campagne preparate e improvvisate, consumabili e combinazioni,
   senza affidare il bilanciamento al solo tasso di vittoria di una fixture.
   La campagna normale fino al Garante è percorsa tramite input con tutti e tre gli starter, con diverse preparazioni;
   restano difficoltà alta, atti successivi e combinazioni alternative.
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
   Restano chat reale, dispositivi e reti diverse: due browser testati non
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

## Ultimo round

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
