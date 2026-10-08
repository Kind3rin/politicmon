CONTROLLO UMANO RICHIESTO — esplorazione e lotta: design/ui-mock/migration-review.html

## Fase 0 — Tribuna: esplorazione, lotta, dialoghi e pausa migrati — 4 ottobre 2026
BOZZE PRONTE e UI APPROVATA: consenso esplicito registrato in M2-NOTE-LUCA.md.
Bozze: artifacts/m2/mock-{esplorazione,esplorazione-orizzontale,lotta,squadra,compagno}-{portrait,landscape}.png.
Bozze: artifacts/m2/mock-{borsa,mappa,impara,menu,dialogo}-{portrait,landscape}.png; 40 layout già verificati.
Confronto bozza/runtime e prova senza salvataggi: design/ui-mock/migration-review.html.
Esplorazione: scena intera, tre accessi rapidi, leva flottante, azione contestuale, obiettivo ripiegabile.
Luogo/avvisi temporanei, segnale di salvataggio, etichette DOM; rimossa la vecchia riserva HUD dalla camera.
Lotta: sprite ritagliati sui pixel visibili, barre, quattro mosse, dettagli su pressione lunga, azioni su una fila.
Dialoghi: riquadro ≤28%, targhetta e ritratto; scelte sopra la scena, testo progressivo e annuncio accessibile per pagina.
Prove: artifacts/m2/0-{esplorazione,lotta,lotta-finale,lotta-esaurita}-{360x740,412x915,844x390,360x640}.png.
Check UI: 28 layout runtime verdi; nuove prove 0-{dialogo,dialogo-scelte,menu,menu-altro}-<dimensioni>.png.
Pausa: foglio sulla mappa, griglia 3×2, Altro compatto; provati frecce, scelta, Esc e chiusura fuori. Banco senza scritture/rete.
Build e 414 test verdi; scelta e avanzamento provati nel browser. Perf: 60 fps medi, p95 17,5–17,6 ms, criterio M2 rosso.
Restano controllo POCO, prestazioni p95 e migrazione squadra → borsa → impara → mappa → resto.
Crediti: nessun consumo aggiuntivo. Commit iniziale UI: 0fc4d5e; dialoghi: 60ce687; terreno/cache: 483753d.

## Fase 1 — terreno — in corso, 4 ottobre 2026
Fondale in cache; materiali/vicini risolti una volta per ricostruzione, misurata in 8,5–13,4 ms con CPU ×4.
Cinque materiali × quattro varianti Higgsfield; asfalto a Mediopoli/Capitale, legno negli interni.
Bordi erba/acqua/sabbia e cordoli stradali con angoli; grotte e ponti conservano i materiali propri.
Ombre statiche/mobili; tronchi ordinati e chiome trasparenti sopra il giocatore.
Acqua a quattro frame, vento, particelle, luce oraria, finestre/lampioni e meteo; reduceEffects verificato.
Camera con inseguimento/anticipo, scossa e zoom; passi per materiale, corretta la grotta che suonava come legno.
Prima/dopo: 1-{borgo,route1}-{prima,dopo}.png; 1-chioma-dopo.png in artifacts/m2.
Prove: 1-water-frame-{1,2,3,4}.png, 1-notte-{pioggia,riduci-effetti}.png, 1-lampioni-{giorno,notte,riduci}.png.
Nuove prove: 1-mediopoli-asfalto.png, 1-laboratorio-pavimento.png, 1-grotta-materiali.png.
Input reali con Tribuna: 40 passi Borgo → Percorso 1 → Mediopoli → Borgo, senza blocchi. Prove 1-tribuna-percorso-*.png.
Higgsfield 338,47 → 337,97: 0,50 crediti; nessun consumo aggiuntivo per asfalto/pavimenti.
Cache atmosfera: disegno identico in 8.448 casi; 414 test/build verdi. Perf M2 rosso: p95 17,5–17,6 ms, idle 17,5 ms; media 60 fps.
Errore QA precedente: slot locale 4190 sovrascritto; banco ora senza scritture/rete.
Corretto il falso muro di alberi oltre l’uscita: 1-uscita-sud-aperta.png. Restano giro slice/ascolto telefono e 60 fps; UI approvata, migrazione avviata.

## Fase 0 — chiusa — 5 ottobre 2026
Prima/dopo: artifacts/m2/panel-*-412x915.png (squadra, compagno, borsa, impara, mappa, negozio, dex, circolo, titolo e altre).
Si nota subito: squadra e borsa a righe dense; titolo a tutto schermo; mappa disegnata; nessuno scorrimento in squadra, scheda, apprendimento e mappa.
Ancora non convince: schermate di campagna/diplomazia restano a schede; la ricevuta di crescita è una scheda sola in un foglio vuoto.
Prove: check:ui-panels 20×4, check:ui-flows, check-ui-runtime 28, 425 test.

## Fase 2 (avvio) e Fase 4/5 (primi elementi) — 5 ottobre 2026
Dislivelli: casella % (scarpata), salto verso sud, muro negli altri versi. Sui Percorsi 1-3. I livelli a più altezze (muri, scalinate, quote) sono arrivati a Borgo: vedi MAPPE-LIVELLI.md.
Selvatici visibili: roamers.ts con 4 umori, vantaggio sul primo turno, tiro invisibile solo tutorial/grotte. 7 test.
Posture: Attacca/Smentisci/Temporeggia, anteprime coerenti, 4 test. L'IA nemica non le usa ancora.
Crediti Higgsfield: nessun consumo in questo round.

## Secondo giro — 5 ottobre 2026
Prima/dopo: artifacts/m2/panel-starter-412x915.png, panel-titolo-412x915.png, battle-2.png (postura), r-bridge.png.
Si nota subito: scelta del compagno a tre tessere; ponte e terrazze sui percorsi; selvatici che si muovono; due righe di posture sotto le mosse; postura nemica accanto all'intenzione.
Ancora non convince: Borgo e Mediopoli restano piatti (Fase 3 non iniziata); mosse e animazioni di lotta invariate (Fase 6); l'IA sceglie posture con regole semplici, non legge il giocatore.
Crediti Higgsfield: nessun consumo, saldo 337,97.
Prove: 428 test, check-ui-runtime 28, check-ui-panels 20×4, check-ui-flows, check-roamers, map-consistency, map-exit, building-doors.
check:first-campaign e check:world-layout falliscono già a 81abfd4 (ultimo commit di Codex) per passi di input che l'interfaccia nativa non usa più: da riscrivere, non dipendono da questo giro.

## Comandi — 5 ottobre 2026
Prima/dopo: giocato su telefono emulato (375×812) dalla nuova campagna fino al dialogo con Luca. Prima: nessun comando visibile in esplorazione (solo tre icone), levetta invisibile finché non si tocca, «»» senza nome, suggerimento sul movimento calcolato ma mai mostrato, dialogo avanzabile solo dalla freccia in basso a destra, avviso di installazione sopra il pulsante principale.
Si nota subito: nomi sotto le icone, levetta e «Corri» sempre a vista, scheda gialla «Muoviti» che sparisce dopo i primi passi, mondo più grande, posture con la loro spiegazione.
Ancora non convince: la scheda di aiuto copre un po' di strada nei primi secondi; chi vuole la croce al posto della levetta la trova solo in Menu → Opzioni → Tasti; il percorso verso un personaggio che cammina può spostarsi mentre lo si raggiunge (8 prove su 8 riuscite, ma resta il caso limite).
Prove: check:world-controls (nuovo), check:ui-flows con la lotta, check-ui-runtime 28, check:ui-panels 22×4, 437 test.
Crediti Higgsfield: nessun consumo, saldo 337,97.

## Squadra — 5 ottobre 2026
Prima/dopo: artifacts/m2/party-before-375.png, party-order-{0..3}-375.png, party-drag-375.png, mid-squad-reorder.png.
Si nota subito: «Riordina» in fondo alla squadra, posti numerati, la riga in mano gialla e sollevata; trascinando una riga compare la barra rossa dove atterra.
Ripensamento: la funzione c'era (START prende, START scambia) ma la tastiera nativa consuma START come «indietro», quindi nessuno poteva raggiungerla. Ho cercato le altre funzioni rimaste dietro combinazioni di tasti: il Politicdex ha il filtro per tipo come scheda, la Tessera ha perso solo il carosello dei ricordi (nessuna immagine nella versione nativa, da decidere con l'arte).
Ancora non convince: «Metti in testa» resta nella scheda «Valori»; la Tessera non mostra i ricordi; il duello con Gianni non parte parlandogli prima della prima lotta (da rivedere con il flusso della storia).
Prove: partyOrder (6 test), check:ui-flows con tocco, trascinamento e tastiera, check:ui-panels 23×4, check-ui-runtime 28, check:first-minutes, 444 test.
Crediti Higgsfield: nessun consumo, saldo 337,97.
Reclutamento giocato a tocchi (jump al salvataggio dopo il tirocinio, candidato visibile, Recluta, ricevuta, scelta di carriera): leggibile e senza errori. Trovato giocando: un tocco sulla mappa sotto i pulsanti in alto a destra apre Squadra invece di camminare (limite del disegno, non corretto), il tasto virale spento non diceva cosa mancava (ora sì). check:recruit prima passava 9 volte su 10 (dopo un tentativo fallito il nemico risponde e il controllo non aspettava), ora 10 su 10.

## Volti e ricordi — 5 ottobre 2026
Prima/dopo: artifacts/m2/portraits/ (fogli originali e anteprima), dialog-bust-phone.png, dialog-bust-land.png, tessera-earned.png, public/og.png.
Si nota subito: i dialoghi hanno un volto che reagisce (Mara con il taccuino, Gianni sornione) invece dello sprite 32×32; la Tessera mostra i quattro ricordi.
Ancora non convince: molti aiutanti condividono lo stesso volto (uno per ruolo); alcuni personaggi di storia si presentano come «Abitante» perché non hanno un nome nel dato; le stanze piccole restano un diorama in un fondo scuro in verticale.
Crediti Higgsfield: 12 usati (337,97 → 325,97), nessun acquisto. Giocato: la lince del tour mostra la sua faccia, Quirino la sua.
Prove: 2 test sui ritratti (file, dimensioni, ordine di ripiego), check-first-minutes con il volto di Quirino, check:ui-panels 24×4 con la Tessera, check-precache-build.

## Campagna automatica — 5 ottobre 2026
`playtest:campaign:native` falliva subito («New game did not open actual slot selector»). Adattato all'avvio nuovo (slot libero preso da solo, nickname facoltativo, i due flag di onboarding, import lento del mondo, carte del laboratorio per il primo compagno, tasti delle schede native passati dal kit). Ora il giro arriva fino al primo boss in palestra (debutto, Mediopoli, cura) e si ferma lì: la parte di lotta e le scene di acquisto/coalizione/distretto pilotano ancora i menu a tavolo (`mainMenu`, `view.menu`) che nell'interfaccia nativa non esistono più. Da riscrivere pilotando le azioni dei pannelli (`uiPanel.actions[i].run()`), non i tasti.


## Posture — l'allenatore legge il tuo Attacca — 8 ottobre 2026
Prima/dopo: prima l'allenatore sceglieva la postura solo dal suo stile e dai PV, e la scheda dell'intenzione diceva «Attacca» senza altro. Ora risponde Smentisci a un tuo Attacca e lo scrive («Ha visto il tuo Attacca»); la scheda ha l'icona della postura su una piastrina crema. Prova: artifacts/m2/posture-intent-375.png.
Si nota subito: a 375×812 la scheda con l'icona si legge; le carte restano a 79 px.
Ancora non convince: l'effetto sulla difficoltà non si conosce (la simulazione non modella le posture); il nemico guarda solo l'ultimo turno; in gioco ho visto solo l'icona di Attacca, quelle di Smentisci e Temporeggia le ho controllate solo come file e come misura.
Regressione trovata e corretta: l'icona messa sui pulsanti delle posture ha fatto andare a capo la riga (44 → 100 px) e restringere le carte (79 → 51 px). Tolta, riportata a 44 px e 79 px a 360×640; poi `check-ui-layout`, `check-ui-runtime`, `check-pwa-device` e `check-text-scale` verdi (suite4).
Crediti Higgsfield: tre icone a 1,5 crediti con qualità alta (l'anteprima senza qualità diceva 0,25: il costo reale è 1,5, già nel documento degli asset). Saldo 286,72 → 282,22.
Prove: `npm test` 598/598; `tsc --noEmit` pulito; `tests/unit/posture.test.ts` 10/10; suite4 quattro controlli verdi; dopo la piastrina `check-ui-runtime` e `check-text-scale` di nuovo verdi (suite5).

## Primi minuti — Gianni e il cartello — 8 ottobre 2026
Prima/dopo: prima Gianni apriva il duello senza spiegare nulla, e il cartello «Parla con qualcuno» restava per trenta passi anche in strade vuote. Ora Gianni spiega il copione in due pagine e poi parte il duello; il cartello compare solo con un personaggio vicino. Prova: artifacts/m2/first-rival-copione-375.png.
Si nota subito: la spiegazione sta nella scatola a 375 px con il ritratto; il cartello non compare più nelle strade vuote.
Ancora non convince: «Metti in testa» resta nella scheda Valori. Provata la scheda Mosse: a 844×390 in orizzontale la pagina non entra e `check-ui-panels` lo segnala. La copertura della strada dal cartello non è misurata in pixel, solo verificata a occhio nello screenshot.
Prove: `check-first-rival` (nuovo), `check-world-controls`, `check-hud-clear`, `check-coach`, `check-first-minutes`, `check-ui-runtime`, `check-ui-flows`, `check-ui-panels` (28 schermate × 4); 599 test unitari; `tsc --noEmit` pulito.
Crediti Higgsfield: nessun consumo, saldo 282,22.

## Spettacolo di lotta — 8 ottobre 2026
Prima/dopo: prima l'efficacia era solo nella didascalia e i numeri uscivano scuri (regola del titolo del kit). Ora «POCO EFFICACE» sta sopra un numero grigio, in una piastrina scura (artifacts/m2/spectacle-weak-375.png); i numeri tornano crema.
Si nota subito: la piastrina si legge sopra lo sprite a 375 px; l'etichetta compare e sparisce in circa 0,7 s.
Ancora non convince: la caduta inclinata del KO e il rallentatore sull'ultimo allenatore li ho verificati nel codice e nei test, non a tocchi in gioco. Il colpo non anticipa ancora l'attacco: la forma del colpo arriva dopo il lampo e il numero. La parte d'arte della Fase 6 (fondali a strati, pubblico) non è iniziata.
Prove: `battleAnimationContract` (quattro test nuovi), 603 test unitari, `tsc --noEmit`, `check-ui-runtime`, `check-ui-layout`, `check-text-scale`, `check-first-rival`, `check-ui-panels`; lotta di prova a 375×812 senza errori in pagina.
Crediti Higgsfield: nessun consumo, saldo 282,22.

## Borgo e Mediopoli, edifici — 8 ottobre 2026
Prima/dopo: prima Mediopoli aveva lo studio con la corona d'alloro della palestra, condivisa con Eurotown; ora ha lo studio TV con antenna (artifacts/m2/town-medio-studio-before-375.png e -after2-375.png). Il laboratorio di Borgo passa da un edificio scuro e generico a una facciata a due piani con due manometri (artifacts/m2/town-borgo-lab-before-375.png e -after2-375.png). Casa tua, redazione, circolo e attico hanno un disegno nuovo nelle stesse impronte.
Si nota subito: a 375×812 le facciate si leggono a distanza, le porte restano al centro sulla strada e le etichette («Studio 5», «Laboratorio», «Circolo», «Attico») non si spostano.
Ancora non convince: il primo foglio aveva un laboratorio a torre troppo stretta per l'impronta, scartato e rigenerato (job 0fd5ead9…); le finestre illuminate di notte non sono state guardate sui disegni nuovi. Il documento della fase dice «piatti» per Borgo e Mediopoli, ma livelli e terrazze sono già fatti: da chiarire con Luca che cosa intendeva con «piatto» prima di spendere altri crediti.
Prove: `check-building-door-alignment`, `check-sprite-bounds`, `check-map-consistency`, `check-door-warps`, `check-placement`; 603 test; `tsc --noEmit`; `npm run build`; `check-precache-build` (1046 risorse).
Crediti Higgsfield: due fogli a 1,5 crediti, saldo 282,22 → 279,22 (un tentativo scartato e rigenerato compreso). Fase 3 aveva 54,44 di quota: restano circa 51.
CONTROLLO UMANO RICHIESTO: Luca gioca dieci minuti a tocchi in piazza di Borgo e Mediopoli, di giorno e di notte, e dice se le facciate reggono.

## Arte della Fase 6 — pubblico, fondali, gag — 8 ottobre 2026
Prima/dopo: prima la lotta aveva lo sfondo e i due sprite; ora dietro i contendenti ci sono il profilo lontano (colline o skyline, mare, grotta) e una fila di spettatori che reagisce (artifacts/m2/audience-start-375.png; in orizzontale artifacts/m2/audience-landscape-844.png).
Si nota subito: la folla si legge sopra il campo a 375×812 e a 844×390; il bordo del profilo lontano non lascia una riga sul prato, perché sta dietro gli spettatori.
Ancora non convince: in gioco ho visto solo la reazione «fischi» (la lotta di prova è in svantaggio); applausi e telefoni li ho controllati sui fogli e nei test, non in una lotta vinta. Il volo dei gag è verificato su una pagina di prova: nella lotta di prova nessuna mossa è satirica, quindi il gag non è mai partito in gioco, e il primo uso di una sessione può partire con un ritardo di qualche decimo di secondo mentre l'icona si carica. Il fondale è ancora un'immagine unica per lotta: la parallasse è un leggero scorrimento del profilo lontano, non una vera parallasse di telecamera.
Prove: 607 test unitari (quattro nuovi su reazioni, gag, avvio ed effetti ridotti), `tsc --noEmit`, `npm run build`, `check-precache-build` (1057 risorse), `check-ui-runtime`, `check-ui-layout`, `check-text-scale`, `check-first-rival`, `check-ui-panels`.
Crediti Higgsfield: tre fogli a 1,5 crediti, saldo 279,22 → 274,72. La quota della Fase 6 era circa 100: ne restano circa 95.

## KO, vittoria, reclutamento, evoluzione (6.5) — 8 ottobre 2026
Prima/dopo: prima un KO o una vittoria erano un flash e una riga di testo; ora il nemico K.O. porta sopra di sé una scheda annullata con la battuta, la vittoria una medaglia d'alloro (artifacts/m2/moments-ko-victoria-375.png: a sinistra il KO, a destra la vittoria). L'evoluzione mostra una freccia dorata nel sole sulla fase della nuova carta intestata.
Si nota subito: il KO si legge subito, la battuta sta in una scatola scura sotto l'emblema; la vittoria, con la pausa, resta abbastanza per essere vista prima che la lotta si chiuda.
Ancora non convince: il reclutamento e la fase finale dell'evoluzione non li ho visti in gioco (la cattura non è nelle lotte di prova; la pagina di revisione non apre la fase finale della scena di evoluzione, il controllo esistente `shot-evolution` si ferma prima). La battuta della vittoria copre parte del sprite del giocatore per un secondo: da guardare a tocchi. Nessun suono nuovo: il KO usa il suono di KO, la vittoria la fanfara, la cattura il jingle, l'evoluzione il suo jingle.
Prove: 609 test unitari (quattro nuovi su file, battute, avvio e effetti ridotti), `tsc --noEmit`, `npm run build`, `check-precache-build` (1061 risorse), `check-ui-runtime`, `check-ui-layout`, `check-text-scale`, `check-first-rival`, `check-ui-panels`; KO e vittoria in una lotta selvatica di revisione a 375×812.
Crediti Higgsfield: un foglio 2×2 a 1,5 crediti, saldo 274,72 → 273,22.
