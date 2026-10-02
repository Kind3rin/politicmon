# Politicmon: piano del redesign completo

Aggiornato il 2 ottobre 2026. Obiettivo attivo: rifare gameplay, scene, asset,
dialoghi satirici, lotte, evoluzioni e schede, usando il credito Higgsfield dove
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
| Boss e prove | Dieci illustrazioni, briefing e leader persistente; Mara facoltativa con livelli distinti per difficoltà | `shot:boss-briefing`, `check:first-campaign` |
| Morale | Fiducia, coesione, tre promesse con scadenza, otto scelte civiche e memorie nei dialoghi; passerella costruibile | unit test, `shot:morale-satire`, `check:civic-bridge` |
| Mondo | 294 nuovi PNG per personaggi, veicoli, edifici, terreni e arredi; matrice delle 66 mappe | `shot:world-redesign`, controlli di ingombri/porte e prova del ponte |
| Politicdex | Cinque pagine, filtri, habitat, condizioni e forme meme | `shot:gameplay-guide` |
| Schede squadra | Cinque pagine, descrizioni complete, oggetti e difese | `shot:evolution-dossier` |
| Evoluzioni | Confronto, rinvio, ripresa al cap, soglie aggiornate, tessera dopo conferma, presentazione accessibile | `shot:evolution-dossier`, unit test |
| Borsa/negozio | Filtri, tre pagine tattiche, preventivi, quantità e 30 nuove icone | `shot:supplies` |
| Quartier generale | Titolo, circolo, missioni e archivio rivisti; dossier completi delle 49 missioni | `shot:hq`: 103 viste e prove di trasferimento/tocco |
| Rete e tipi | Lobby scorrevole, chat completa, 52 offerte leggibili, otto nuovi emblemi; duello e scambio su rete reale | `shot:social-ui`, `check:duel`, `shot-trade` |
| Campagna politica | Cinque nuovi ambienti, tre scelte con dossier annullabile, effetti reali e riparazione; schede nette, collegi leggibili e scrutinio | `shot:campaign-ui`: 142 viste, unit test e prove di rete |
| Apprendimento | Stesso confronto da direttiva/livello, rinuncia prima della modifica, PP conservati | `shot:supplies` |
| Epiloghi e postgame | Quattro finali personali, ricordi nella tessera, monumenti illustrati, ritmo accessibile e favori annullabili | `shot:epilogue`: 214 viste, transazioni e salvataggi |
| Casinò e Coppa | Tre ambienti, venti PNG, probabilità esplicite, invito giornaliero, leader e save protetto durante i match | `shot:arena`: 843 viste, 272 test |
| Ingresso, pausa e scorta | Starter con quattro dossier, guida rileggibile, riprova dopo sconfitta, pausa scorrevole e viaggio con contratto | `shot:desk`: 514 Chromium/506 WebKit, sei lotte del tutorial via input |
| Cornice esterna | Pagina moderna, guida che ferma gli aggiornamenti, focus e controlli touch senza sovrapposizioni | `shot:shell`: 20 configurazioni, Chromium/WebKit, pause mondo/lotta, input e salvataggio reali |
| Primo atto | Reclutamento con EXP, crescita iniziale, mosse della panchina, sfide volontarie e accessi protetti | `playtest:campaign:native`: tre starter fino ad Auditel; `check:first-campaign` |
| PWA | Precache e primo utilizzo offline dei 530 asset Higgsfield; salvataggio conservato | `smoke:pwa:release` |

Credito osservato all'inizio dei round Higgsfield: 885,97. Saldo attuale
verificato: 617,72; spesa cumulativa 268,25 crediti. Non sono stati attivati acquisti
né abbonamenti. Il credito residuo è autorizzato per ulteriori risorse del gioco.

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
   Il primo atto normale è percorso tramite input con tutti e tre gli starter;
   restano difficoltà alta, atti successivi e combinazioni alternative.
3. **Interfaccia completa.** Titolo, box, missioni e archivio hanno ricevuto una
   revisione con dossier e prove delle azioni. Epiloghi, tessera, monumenti,
   Genova, retrobottega, casinò e Coppa sono ora rivisti. Onboarding, pausa e trasporto stradale hanno ricevuto una revisione con dossier e prove delle azioni.
   Anche la cornice esterna è rivista con guida modale e controlli nativi. Proseguire la revisione dei flussi integrati e dei box meno frequenti; il censimento delle 47 scene non prova che ogni loro stato sia moderno. Eliminare layout e asset residui vecchi;
   mantenere controlli leggibili su canvas 240×180 e mobile.
4. **Scrittura.** Revisione dei dialoghi e degli archi di ogni zona, incluse
   ricorrenze e risposte alle azioni. La ricerca web deve generare satira
   originale con bersagli e contraddizioni precisi, senza copiare i meme.
   Il round carburante aggiunge una scena, non esaurisce questa revisione.
5. **Audio e animazione.** Riesaminare feedback, musica, transizioni e momenti
   chiave; usare media generati dove servono al ritmo o alla comprensione.
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
