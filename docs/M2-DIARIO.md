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
Fondale esterno in cache per mappa/revisione; asset tardivi invalidano senza ricostruzioni per frame.
Erba, sterrato e sabbia: quattro varianti Higgsfield, bordi cardinali/angoli e dettagli per mappa.
Ombre di edifici/arredi e ombre mobili; tronchi ordinati e chiome trasparenti sopra il giocatore.
Acqua: quattro frame, riflesso e schiuma; vento, tre particelle, quattro luci orarie e tre meteo.
Camera: inseguimento, anticipo, scossa urti/incontri e zoom dialoghi; inversione del tocco testata.
Passi: polvere, schizzi, impronte e timbri per superficie. Prova giocata/audio ancora da fare.
Prima/dopo: 1-{borgo,route1}-{prima,dopo}.png; 1-chioma-dopo.png in artifacts/m2.
Prove visive: 1-water-frame-{1,2,3,4}.png, 1-notte-pioggia.png, 1-notte-riduci-effetti.png.
Higgsfield 338,47 → 337,97: due lotti, 0,50 crediti; sorgenti e checksum nel manifest.
414 test, build e perf verdi. Draw p95 1,5–1,7 ms; intervallo 18,5 ms: 60 fps non dimostrati.
Errore QA precedente: slot locale 4190 sovrascritto. Banco ora senza scritture/rete; prove ripetute.
Restano pavimento/asfalto, bordo marciapiede, lampioni, cache arredi e prova giocata completa.
UI non migrata: manca UI APPROVATA. Fase 1 ancora aperta.
