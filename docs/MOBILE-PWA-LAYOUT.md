# Scocca e layout della PWA

La [rifinitura successiva](MOBILE-PWA-FINALE.md) sostituisce la piastra e il dimensionamento compatto in verticale con controlli aperti e console a tutta altezza. I risultati qui sotto descrivono il primo round.

Round del 2 ottobre 2026, dopo la segnalazione di scarsa leggibilità e comodità sul POCO F9 ULTRA con PWA installata. [Prove](mobile-pwa-layout-proof.json).

Lo schermo occupa una superficie con cornice sottile, separata dalla piastra dei comandi. A e B sono circolari, distanziati e sfalsati: A color menta da 76 px, B da 64 px; sui formati compatti 64/56 px. La croce mantiene bersagli 52 px, 48 px sui formati compatti, e MENU resta 44 px. Logo e strumenti hanno una riga dedicata. Il pulsante ✥ alterna immediatamente croce e levetta, conserva la scelta al riavvio e azzera gli input precedenti.

In verticale la console ha proporzioni compatte; in orizzontale schermo, movimento e azioni occupano tre colonne. Le colonne funzionano anche su tablet, senza il precedente limite di 500 px di altezza. Il manifest permette entrambe le orientazioni, al posto del blocco `portrait`.

Il CSS determina lo spazio disponibile usando altezza effettiva della finestra, margini sicuri e colonne dei comandi. Il canvas conserva il rapporto 4:3 e misura la propria superficie, senza sottrarre riserve numeriche fisse. Un ResizeObserver segue i cambiamenti della superficie; il visualViewport segue le variazioni dell'area visibile. Il buffer considera la densità effettiva del display, anche frazionaria, e mantiene una scala interna intera. La preferenza di movimento e i salvataggi conservano le stesse chiavi.

## Verifiche

Chromium e WebKit verificano dieci configurazioni ciascuno nella build compilata: 320×568, 412×915, 430×932, 480×1040, 412×700, 568×320, 915×412, 1040×480 e 1024×768. La configurazione 915×412 viene provata anche a DPR 2,4, oltre ai DPR 2/3 delle altre prove. I margini di sistema sono simulati, compreso un bordo laterale asimmetrico. Nessun bersaglio è inferiore a 44 px, nessun controllo si sovrappone al gioco e non c'è overflow orizzontale. Sei passaggi aggiuntivi controllano rotazione e riduzione dell'altezza senza riavviare la pagina. Il riconoscimento standalone è emulato: questa non è una certificazione su un POCO fisico.

Dieci ulteriori prove della build compilata controllano guida, focus, annullamento, trascinamento e input indipendenti. Le venti prove di sviluppo verificano anche mondo e battaglia fermi sotto la guida, menu e salvataggio reali, tastiera nativa e levetta. Il controllo degli input conserva arresto al centro, cattura del puntatore, rilascio indipendente delle dita, corsa nativa e risorse della campagna.

La versione destinata alla pubblicazione passa 303 test, validator dei contenuti e inventario PWA di 769 risorse esatte. Chromium verifica aggiornamento e riavvio offline; WebKit verifica cache e primo uso offline, mentre Playwright non supporta il suo reload offline. Entrambi verificano 737 asset grafici e 19 tracce AAC. Il limite del codice completo rimane 350 KiB gzip, includendo il chunk del mondo. Nessun credito Higgsfield viene speso per la scocca HTML/CSS.

**Nota (7 ottobre 2026):** `check:mobile-layout` è stato ritirato (misurava i vecchi comandi; vedi `scripts/retired/README.md`): oggi vale `npm run check:ui-layout` insieme a `check:world-controls`. Storico: ripetere con `npm run check:mobile-layout` sul server di sviluppo oppure `BASE_URL=<url> npm run check:mobile-layout` sulla versione pubblicata; `PREVIEW_URL=<url> npm run check:shell:release` verifica anche i percorsi della guida. La pubblicazione e la dimensione effettiva sono registrate nel proof. Le modifiche al Palazzo restano nel round successivo.

## Pubblicazione

Runtime `bec21d0`, [CI 37043962738](https://github.com/Kind3rin/politicmon/actions/runs/37043962738) e tre deploy Vercel riusciti. Sul [dominio pubblico](https://politicmon.vercel.app/) passano tutte le venti configurazioni, sei transizioni, dieci prove della guida e le due prove PWA. Codice pubblico completo: **358355/358400 byte gzip**, 45 byte di margine. La prova con CPU ×4 passa con p95 massimo 18,6 ms per mondo, lotta e Dex. Report e hash sono nel proof; screenshot pubblici in `artifacts/screens/mobile-layout`. Chiudere e riaprire la PWA online permette al sistema di aggiornamento esistente di caricare la versione nuova senza toccare il salvataggio.
