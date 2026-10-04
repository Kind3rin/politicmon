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
Fondale esterno in terrainRenderer.ts: cache per mappa/revisione; asset tardivi invalidano senza ricostruire ogni frame.
Erba, sterrato e sabbia: quattro varianti Higgsfield, bordi cardinali e angoli interni; dettagli per mappa.
Ombre statiche di edifici/arredi; tronchi ordinati per Y e chiome trasparenti quando coprono il giocatore.
Prima/dopo: artifacts/m2/1-{borgo,route1}-{prima,dopo}.png; occlusione: 1-chioma-dopo.png.
Higgsfield 338,47 → 338,22: job 65bc2fa0…; venti texture 16px, pavimento/asfalto ancora da integrare.
408 test e build verdi. perf:check verde: draw p95 Borgo/Percorso 1 1,5 ms, intervallo 17,6 ms (CPU ×4).
Cache pronta: Borgo/Percorso 1 una costruzione, Capitale due; 60 fps su dispositivo reale non ancora provati.
Errore QA: primo banco sovrascriveva lo slot locale 4190. Ora scritture e multiplayer bloccati; prove ripetute.
Restano pavimenti/asfalto, acqua/vento, luce/meteo, camera/passi, ombre mobili e verifica completa. Fase aperta.
UI non migrata: manca ancora UI APPROVATA.
