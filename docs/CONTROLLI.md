# I controlli: cosa girano, come, e cosa è stato ritirato

7 ottobre 2026. Giro di consolidamento: prima di aggiungere altro ho eseguito tutti i 76 script `scripts/check-*.mjs` contro il server di sviluppo e ho separato i difetti veri dai controlli rimasti indietro rispetto al gioco.

## Come si eseguono

```bash
npx vite --host 127.0.0.1 --port 5199        # da riavviare dopo ogni modifica a src/ o ai dati
BASE_URL=http://127.0.0.1:5199 node scripts/run-checks.mjs          # tutti quelli locali: npm run check:all
BASE_URL=http://127.0.0.1:5199 node scripts/run-checks.mjs --only coach,items   # alcuni
node scripts/run-checks.mjs --list
```

`NODE_ARGS` viene passato a node prima di ogni script (per usare Chrome installato al posto di quello di Playwright: `NODE_ARGS="--import /percorso/chrome-patch.mjs"`). Ogni controllo ha 300 secondi (600 per `check-pwa-device` e `check-text-scale`); il riepilogo dice quali falliscono e mostra le ultime righe di ciascuno. I test unitari e di contenuto sono a parte: `npm test`.

## Cosa è fuori dal giro locale

- **`bruxelles-release` e `future-release`**: giocano campagne salvate in Chromium **e WebKit**; passano entrambi (WebKit incluso). Gli altri dieci `*-release` e `check-terrace-return` erano legati al titolo su canvas, al salvataggio `v18` e a hash di pixel: ritirati il 7 ottobre 2026 (`scripts/retired/README.md`).
- **`check-pwa-device`** (23 profili, quelli del POCO F9 ULTRA e dei telefoni più comuni, × 39 schermate, margini sicuri veri; Chromium e WebKit): vedi `docs/MOBILE-PWA-LAYOUT.md`. Di serie il gruppo principale; `DEVICES=all`, `DEVICES=a,b` e `SCREENS=…` per cambiare.
- **`check-back-gesture`** (gesto «indietro» della PWA Android: mappa → menu, pannello → chiude, titolo → esce) e **`check-text-scale`** (testo al 130%, `SCALE=…`): vedi `docs/MOBILE-PWA-LAYOUT.md`.
- **La suite attuale sotto WebKit**: `NODE_ARGS="--import ./scripts/lib/webkit-patch.mjs" BASE_URL=http://127.0.0.1:5199 node scripts/run-checks.mjs`. WebKit è installato; **56/56 verdi** (7 ottobre 2026). WebKit non ha il protocollo DevTools, quindi il preload sostituisce `newCDPSession` con un finto che sa solo spedire tocchi come eventi puntatore: i controlli sul tocco (levetta, trascinamento delle righe) girano comunque. La CPU rallentata (`perf:check`) no. Il giro ha trovato una sola cosa: una corsa nel controllo del dialogo (`check-world-controls`), che toccava prima che la macchina da scrivere avesse finito; ora attende il punto finale. Nessun difetto del gioco.
- `scripts/measure-first-load.mjs` (misura, non controllo: `NET=slow4g|3g|fast`, `CPU=4`, `DIR=dist`): tempo al titolo e da «Nuova campagna» alla mappa per chi arriva la prima volta.
- `check-sw-update` (fa da sé tre build: un aggiornamento senza modifiche scarica 24 file invece di 1042, uno con uno sprite cambiato scarica solo quello).
- `check-precache-build` (serve `npm run build` prima: verifica l'inventario offline della build; passa, 1042 risorse), `check-mp-live`, `check-prod`, `check-err`, `check-world-navigation-release` (anteprima compilata su :4184).
- `scripts/retired/`: quindici controlli ritirati, con il perché e chi li sostituisce (`scripts/retired/README.md`).

## Cosa ho trovato

**Difetti veri del gioco**
- **Arrivo in traghetto.** Sbarcando allo Stretto dalla Capitale il giocatore veniva spostato di una casella sul molo e scendeva dalla barca: `unstick()` trattava l'acqua come «terreno solido». Ora, col traghetto, chi arriva in acqua resta in acqua e sale a bordo (`check-stretto`).
- **Coach in lotta.** Il mio suggerimento sopra il campo copriva i mostri e aggiungeva corpi di testo: `check-ui-runtime` e `check-ui-layout` lo avevano visto. Ora occupa la striscia della didascalia, in due righe, nei corpi esistenti.
- **Missioni giornaliere.** Il pool con le missioni del palinsesto era il default di `todaysDailyQuests`, ma una partita senza palinsesto non può completarle: ora il default è il pool base (`check-daily`).
- **`FlightScene`** disegnava testo bitmap nella scena (`check-ui-kit`): ora lo fa `drawFlightCaption`, come il cut-in dei poteri.

**Controlli rimasti indietro (il gioco funzionava)**
- Schede a pannello (briefing, scelte di campagna, ricevute, titolo, evoluzione) guidate coi tasti: oggi rispondono ai tocchi sulle loro azioni, non alla tastiera (`update(){}`). I cinque controlli dei capitoli (bruxelles, offshore, campo, diplomacy, future), `first-campaign`, `stretto`, `r41-lotto4` e `r42-lotto1` ora guidano i pannelli con `uiPanel`: A esegue l'azione evidenziata, B esegue «Indietro»; per scegliere una voce si chiama l'azione per indice.
- La scelta di campagna ora mostra l'errore «Scelta non disponibile» già nell'anteprima e disabilita «Conferma»: i controlli lo verificano così (fondi insufficienti).
- Chiavi di salvataggio: ora `politicmon-save-v18__s<slot>`; `check-slots` e `check-r41-lotto3` pulivano e leggevano le versioni vecchie.
- `check-world-layout`: la scena doveva essere in cima alla pila per rispondere ai comandi; il passo da fermo non «gira prima» e le due metà di una porta sono entrambe porte, quindi i due controlli su quel comportamento sono stati tolti (sostituiti da `check-door-entry`).
- `check-ui-ellipsis` segnalava l'operatore spread `...x.slice()`: ora cerca solo un `slice` accanto a un'ellissi disegnata.
- `check-interactables`: un cartello in acqua (darsena dello Stretto) si legge dal traghetto.
- `check-r42-lotto3`: il negozio e il monumento hanno nuove funzioni (`shopStock`, `buyMonumentLevel`), e l'IA «comune» si sceglie con `trainerAi`.
- `check-r39-gameplay` → `check-items` (a tocco: gilet dato a un compagno e danno ridotto, spray, tessera rimborso).
- Tastiera e testo nativo, prima mescolati ai vecchi pulsanti A/B in `check-mobile-controls`: `check-input-keys`.

## Un modello per i controlli di scene a pannello

```js
const tick = b => {                                   // dentro la pagina di prova
  const panel = b && stack.top !== world && stack.top?.uiPanel;
  if (panel) { const act = panel.actions?.[panel.primary ?? panel.selected ?? 0];
    if (b === 'a' && act && !act.disabled) act.run(); else if (b === 'b') panel.back?.run();
    stack.update(.1); input.endFrame(); return; }
  /* ...tasti reali per il mondo... */ };
```

## Costo e produzione (7 ottobre 2026)

- Frame del mondo con CPU rallentata 4×: 1,3 ms di giorno, 1,5 sera, 1,4 notte (luci e lucciole incluse). `perf:check` non può dare il verde in questo ambiente perché già il controllo senza gioco supera i 16,7 ms.
- Il sito pubblicato serve la build corrente (persone dell'ora e palinsesto presenti nel pacchetto).
