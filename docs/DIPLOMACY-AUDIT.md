# Temptation Diplomacy: audit dopo Futuro

Il 2 ottobre 2026 cinque segmenti guadagnati superano il Segretario e arrivano all’Hotel Diplomatico. Questo accesso non certifica il redesign del vertice.

Il lobby 20×13, tre stanze 10×8 e terrazza 20×12 sono in `src/data/maps/atto3.ts`. Le tre stanze condividono la pianta precedente di Futuro, arredi comuni e ruoli generici. La terrazza usa il palco e oggetti condivisi. Serve un hotel riconoscibile, tre spazi con identità, cast, segnali e ritorni chiari. Il Partner Perfetto attacca con `sightRange: 5`: rendere consultabile il dossier prima di impegnare risorse.

Il controller apre tre scelte. Fedeltà incassa 800 base e applica linea rossa 12. Autonomia paga 500 quando ripara davvero un patto teso; se non ci sono tensioni, incassa 500 base. Consenso dà quattro punti di sondaggi e applica linea rossa 13. Il dossier deve leggere membri presenti, violazioni e bonus effettivi; non presentare un buono come una riparazione già eseguita. I salvataggi storici con token hanno un percorso di riconciliazione da preservare.

Futuro fornisce coalizioni diverse: Ellyna ha la Segretaria tesa e Generorso; Renzino ha perso il Centrista; Giorgetta arriva con promesse scadute o riparate, e nel secondo percorso con Futurorso realmente reclutato. Queste differenze devono produrre dialoghi e scelte sensate. Il nuovo nome non ha resettato i ritardi. Prima di modificare livelli o roster, giocare dai codici `future-diplomacy`, verificare PP, consumabili, annullamento e cure tornando al Campo.

Il premio del Partner apre Genova Techno e il Tour dei cinque collegi, azzera/inizializza l’elezione del nuovo atto tramite il resolver esistente. Occorre verificare questo passaggio e la persistenza del morale senza confondere la nuova elezione con una cancellazione dei patti. Il boss e il roster sono definiti nei trainer: leggere quelli effettivi prima del bilanciamento.

Direzione satirica: cordialità diplomatica con tre conti incompatibili, un hotel che separa ospiti per farli apparire uniti in diretta. Ricercare nuovi motivi comici sul web e realizzare scene originali, poi percorsi guadagnati fino al Tour. Il goal generale resta attivo.

## Stato effettivo prima del redesign

Roster letto in `src/data/trainers.ts`: Macronfox 52 (Diretta Social, Voto Disgiunto, Exit Poll, Smentita Flash), Ursulax 53 con Gilet (Decreto, Autonomia, Fiducia, Quorum), Trumpon 54 (Festival, Comizio, Piazza Aperta, Mondo al Contrario). Premio: 2600 fondi base e due Schedone. La vittoria applica `diplomacyRewardPatch` una sola volta e `newElectionState(true)` in WorldScene. Questo reset dei collegi va verificato separatamente dalla persistenza dei patti e dei servizi.

I tre codici `future-diplomacy` sono letti senza modifiche per le anteprime seguenti. Provenienza e impronte in [diplomacy-incoming-audit.json](diplomacy-incoming-audit.json); nessun combattimento Diplomatico è certificato da queste anteprime.

| Stato guadagnato | Fedeltà: fondi / coesione | Autonomia: fondi / coesione | Consenso: sondaggi / coesione |
|---|---|---|---|
| Ellyna | +832 / −16, Segretaria esclusa al secondo strappo | −500 / +6, Segretaria riconciliata al 75% | 0 / −16, Centrista e Generorso tesi |
| Renzino | +728 / −8, Segretaria tesa | +455 / 0, nessun patto riparato | 0 / 0, Centrista già assente |
| Giorgetta | +752 / −16, Segretaria e Sindaca tese | +470 / 0, nessun patto riparato | 0 / 0, nessuno di quei patti presente |

I sondaggi sono già a 100 in questi salvataggi: il bonus nominale +4 non produce aumento. La sala deve rendere leggibile questa saturazione prima della firma. Per Ellyna, Autonomia porta la coesione da 66 a 72 e recupera la soglia EXP +8%; non restituisce il bonus completo del patto e non consente una seconda riparazione. Per Giorgetta, le due promesse scadute non sono patti diplomatici: restano debiti civici da pagare nel menu Morale. Il controller storico descrive un token, ma il resolver attuale ripara subito e registra token già usato; riscrivere la voce coerentemente senza rompere i token storici.

## Direzione da realizzare e collaudare

Ricerca del 2 ottobre: [Two Buttons](https://knowyourmeme.com/memes/daily-struggle-two-buttons) usa alternative contraddittorie; [Epic Handshake](https://knowyourmeme.com/memes/epic-handshake) rende visibile il punto d'accordo tra parti diverse. Interpretazione per questo gioco: tre delegazioni firmano fogli incompatibili sotto una sola lampada da selfie. Le scene saranno originali; non occorre riprodurre i personaggi o i fotogrammi dei meme.

La lobby deve avere reception, tre accessi distinguibili, terrazza e ritorno al Campo leggibili. Fedeltà: un timbro che attraversa due fogli e lascia il conto fuori dall'inquadratura. Autonomia: due tavoli separati collegati da un solo conto; il responsabile chiama per nome l'alleato effettivamente riparabile. Consenso: un teleprompter rivolto verso il pubblico, un contatore già pieno e sedie che spariscono dalla coalizione. La terrazza mette in scena la stretta di mano e il conto, con il Partner in quattro direzioni coerenti con il panorama. Personaggi fermi, briefing manuale, entrambe le uscite di ogni stanza e progressi conservati nel ritorno alle cure.

Prima di spendere o modificare livelli, percorrere i salvataggi guadagnati fino alla sfida. Dopo il redesign verificare almeno la riparazione reale di Ellyna, il secondo strappo, i servizi scaduti di Giorgetta, le scelte annullate, fondi insufficienti, trasferimenti e nuove elezioni dopo la vittoria. La build attuale pesa 357954 byte gzip su 358400 consentiti: restano 446 byte. Le nuove funzioni richiedono rimozione di ridondanze o caricamento modulare; non alzare il limite.

## Baseline percorsa fino al Tour

Il runner nativo ora accetta `END_AT=diplomacy` e `DIPLOMACY_PLAN=loyalty|autonomy|home`, ripartendo da `future-diplomacy`. Tre segmenti normali, seed 20261002, visitano le tre stanze, tornano realmente dal medico al Campo, scelgono e vincono il Partner al primo tentativo. Squadre, strumenti, fondi e flag di vittoria non vengono assegnati dal runner. Il primo snapshot coincide col codice padre salvo 0,4 secondi del normale assestamento. Il redesign delle sale, del cast e del dossier manuale resta aperto.

| Segmento | Fondi finali | Fiducia / coesione | Conseguenza conservata dopo la vittoria |
|---|---:|---:|---|
| Ellyna, Autonomia | 59726 | 68 / 72 | Segretaria riconciliata, violazione ancora registrata, riparazione consumata |
| Renzino, Fedeltà | 58606 | 80 / 48 | Segretaria tesa al primo strappo; Centrista non ricompare |
| Giorgetta, Consenso | 50866 | 36 / 56 | Bus e molo ancora scaduti; sondaggi già saturi |

Tutti arrivano al Tour tramite warp nativi. I cinque collegi hanno maschere e revisioni azzerate dalla vittoria; fiducia, scadenze e stato dei patti restano distinti dal nuovo scrutinio. Nessun livello o roster è stato ridotto. Prove, combattenti realmente schierati, codici e hash sono in [diplomacy-baseline-proof.json](diplomacy-baseline-proof.json). Non sono prove di difficoltà alta, campagne ininterrotte o del futuro redesign.

Il prototipo aveva vinto le tre lotte ma cercava la cella sotto l'uscita della terrazza, fuori mappa. Il helper ora si avvicina dal basso soltanto alle vere porte `d`; attraversa normalmente gli altri warp. I report falliti restano identificati nel proof. WorldScene e mappe di produzione sono invariati. Questa preparazione non spende crediti.
