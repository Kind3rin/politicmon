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
Dislivelli: casella % (scarpata), salto verso sud, muro negli altri versi. Sui Percorsi 1-3; non ancora i livelli a più altezze di DESIGN M2.
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

