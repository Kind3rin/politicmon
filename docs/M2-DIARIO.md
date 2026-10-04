## Fase 0 — riaperta dopo prova POCO — 4 ottobre 2026
BOZZE PRONTE: Tribuna elettorale; build precedente respinta, nessuna scena migrata.
artifacts/m2/mock-esplorazione-{portrait,landscape}.png
artifacts/m2/mock-esplorazione-orizzontale-{portrait,landscape}.png
artifacts/m2/mock-lotta-{portrait,landscape}.png
artifacts/m2/mock-squadra-{portrait,landscape}.png
artifacts/m2/mock-compagno-{portrait,landscape}.png
artifacts/m2/mock-borsa-{portrait,landscape}.png
artifacts/m2/mock-mappa-{portrait,landscape}.png
artifacts/m2/mock-impara-{portrait,landscape}.png
artifacts/m2/mock-menu-{portrait,landscape}.png
artifacts/m2/mock-dialogo-{portrait,landscape}.png
Galleria: design/ui-mock/index.html; dieci confronti con riferimenti e autocritica.
Verifica: check-ui-layout.mjs --mock, 40 layout verdi; non certifica la UI runtime.
Gate: attesa UI APPROVATA in M2-NOTE-LUCA.md. Nessun credito speso nelle bozze.

## Fase 1 — terreno — in corso, 4 ottobre 2026
Fondale esterno/interno in cache; asset tardivi invalidano senza ricostruzioni per frame.
Cinque materiali × quattro varianti Higgsfield; asfalto a Mediopoli/Capitale, legno negli interni.
Bordi erba/acqua/sabbia e cordoli stradali con angoli; grotte e ponti conservano i materiali propri.
Ombre statiche/mobili; tronchi ordinati e chiome trasparenti sopra il giocatore.
Acqua a quattro frame, vento, particelle, luce oraria, finestre e meteo; reduceEffects verificato.
Camera con inseguimento/anticipo, scossa e zoom; passi con polvere, schizzi, impronte e suoni.
Prima/dopo: 1-{borgo,route1}-{prima,dopo}.png; 1-chioma-dopo.png in artifacts/m2.
Prove: 1-water-frame-{1,2,3,4}.png, 1-notte-{pioggia,riduci-effetti}.png.
Nuove prove: 1-mediopoli-asfalto.png, 1-laboratorio-pavimento.png, 1-grotta-materiali.png.
Frecce reali: attraversato bordo erba/strada, cache stabile; giro completo e ascolto ancora da fare.
Higgsfield 338,47 → 337,97: 0,50 crediti; nessun consumo aggiuntivo per asfalto/pavimenti.
414 test, build e perf verdi; intervallo p95 18,5 ms: 60 fps non dimostrati.
Errore QA precedente: slot locale 4190 sovrascritto; banco ora senza scritture/rete.
Restano lampioni, cache arredi, giro completo e 60 fps. UI ferma senza UI APPROVATA.
