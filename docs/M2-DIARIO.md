CONTROLLO UMANO RICHIESTO — esplorazione e lotta: design/ui-mock/migration-review.html

## Fase 0 — Tribuna: prime due scene migrate — 4 ottobre 2026
BOZZE PRONTE e UI APPROVATA: consenso esplicito registrato in M2-NOTE-LUCA.md.
Bozze: artifacts/m2/mock-{esplorazione,esplorazione-orizzontale,lotta,squadra,compagno}-{portrait,landscape}.png.
Bozze: artifacts/m2/mock-{borsa,mappa,impara,menu,dialogo}-{portrait,landscape}.png; 40 layout già verificati.
Confronto bozza/runtime e prova senza salvataggi: design/ui-mock/migration-review.html.
Esplorazione: scena intera, tre accessi rapidi, leva flottante, azione contestuale, obiettivo ripiegabile.
Luogo/avvisi temporanei, segnale di salvataggio, etichette DOM; rimossa la vecchia riserva HUD dalla camera.
Lotta: sprite ritagliati sui pixel visibili, barre, quattro mosse, dettagli su pressione lunga, azioni su una fila.
Intenzione consultabile; Polemica a pallini, finale nella cronaca; menù secondario per Dossier/Fuga.
Prove: artifacts/m2/0-{esplorazione,lotta,lotta-finale,lotta-esaurita}-{360x740,412x915,844x390,360x640}.png.
Check UI: 16 layout runtime; verifica anche pressione lunga senza consumo, leva e ripiegamento obiettivo.
Input reali: tastiera, foglietti, turno con PP 20→19 e nemico 86→43 PV; nessuna scrittura/rete nel banco.
Build e 414 test verdi. Perf dopo ottimizzazione canvas: circa 60 fps medi; p95 18,4–18,5 ms, criterio M2 ancora rosso.
Restano controllo POCO, prestazioni p95 e migrazione dialogo → menù → squadra → borsa → impara → mappa → resto.
Crediti: nessun consumo aggiuntivo. Commit: 0fc4d5e.

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
