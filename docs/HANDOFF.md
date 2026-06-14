# HANDOFF — Politicmon

> **Leggimi per primo a ogni nuova sessione.** Questo file ti mette al corrente
> dello stato del progetto in 2 minuti, così puoi riprendere senza rileggere
> tutto il codice. Aggiornalo alla fine di ogni sessione che cambia qualcosa di
> sostanziale.

Ultimo aggiornamento: sessione "rivale ricorrente" (vedi § Storico in fondo).

## Cos'è Politicmon

Clone di Pokémon (stile Game Boy Color) a tema satira politica italiana.
TypeScript + Vite, canvas 2D puro, **zero dipendenze runtime** tranne `trystero`
(multiplayer P2P). Risoluzione interna 240×180 scalata pixel-perfect. Mobile-first
(touch + levetta), installabile come PWA, multiplayer peer-to-peer gratuito.

- **In produzione:** https://politicmon.vercel.app (deploy statico su Vercel, piano Hobby gratuito).
- **Tono:** satira bonaria sulla politica italiana, niente diffamazione, niente contenuti espliciti.

## Come si lavora (workflow obbligatorio)

1. `npm run dev:local -- --port 5179` per il dev server (o usa il preview tool del harness).
2. **`npm run typecheck` è obbligatorio prima di consegnare** (`tsc --noEmit`, deve essere pulito).
3. `npm run build` = typecheck + bundle Vite in `dist/`.
4. Deploy: `npx vercel --prod --yes` (il frontend è statico; **non c'è server** da deployare, il multiplayer è P2P).
5. Verifica: vedi § Verifica visiva.

## Stato attuale (cosa c'è già — NON rifarlo)

Tutte queste feature sono **complete, verificate e in produzione**:

| Area | Cosa | File chiave |
|------|------|-------------|
| Core RPG | Scene stack, mondo, battaglia gen-1, cattura, party, borsa, dex | `engine/scene.ts`, `game/world/WorldScene.ts`, `game/battle/` |
| SONDAGGI | Gradimento 0-100 che influenza prezzi, exp (onda del consenso), rami evolutivi | `game/governo.ts` |
| GOVERNO OMBRA | 6 ministeri assegnabili con bonus passivi | `game/governo.ts`, `scenes/GovScene.ts` |
| Evoluzioni | Per livello / oggetto / ramo-sondaggi | `game/monster.ts`, `data/species.ts` |
| DIRETTIVE (MT) | Insegnano mosse per tipo, riutilizzabili | `data/items.ts`, `scenes/TeachScene.ts` |
| Storia Atto 1+2 | 3 medaglie → PALAZZO → COLLE/Garante → leggendario DRAGHIMON | `data/maps.ts`, `data/quests.ts`, `data/trainers.ts` |
| Area Stretto | Ponte di Messina, satira meme, boss IL CAPITANO | `data/maps.ts` (`stretto`) |
| Casinò | Slot del consenso + Bunga Bunga Club (satira) | `scenes/CasinoScene.ts` |
| Veicoli | MONOPATTINO (veloce), RUSPA (abbatte alberi) | `game/vehicles.ts` |
| Incontri PG casuali | Allenatori vaganti scalati | `data/encounters.ts` |
| Eventi morale | Siparietti di strada che muovono sondaggi/fondi | `data/streetevents.ts` |
| Rivale ricorrente | GIANNI a 5 tappe, squadra che cresce, battute con memoria | `data/rival.ts` |
| Retention | Teaser post-medaglia, BREAKING NEWS sondaggi, loot a sorpresa | `data/trainers.ts` (`BADGE_TEASER`), `game/governo.ts` (`bumpSondaggi`), `game/battle/BattleScene.ts` (`LOOT_TABLE`) |
| Audio dinamico | Tracce per zona e tipo di battaglia | `engine/audio.ts` |
| Animazioni | Idle/affondo procedurali + frame d'azione su boss; preview starter | `game/battle/BattleScene.ts`, `scenes/StarterPreviewScene.ts` |
| Mobile | Levetta analogica + d-pad, toggle controlli, modalità guidata | `engine/controls.ts`, `engine/input.ts` |
| PWA | Manifest, service worker, prompt installazione (iOS incluso) | `engine/pwa.ts`, `public/sw.js` |
| Multiplayer P2P | Presence (vedi gli altri sulla tua mappa), chat di zona, emote, nickname | `net/mp.ts`, `net/profile.ts`, `scenes/ChatScene.ts` |

Numeri attuali: **28 specie, 57 mosse, 21 allenatori fissi (+ rivale dinamico), 18 quest, 9 mappe**.

## Decisioni di prodotto già prese (rispettale)

- **Multiplayer = P2P puro (Trystero/Nostr), MAI un server a pagamento.** Vincolo dell'utente: "gratis garantito, nessun addebito nemmeno oltre i limiti". Non introdurre PartyKit/Supabase/backend con account fatturabili.
- **Casinò/escort = satira bonaria** (Bunga Bunga Club parodia), niente contenuti espliciti.
- **Niente asset binari scolpiti a mano:** tutta la grafica è generata da codice (pixel-map testuali); le icone PNG escono da `scripts/gen-icons.mjs`.
- **Tutti i testi di gioco in italiano**, solo MAIUSCOLE + accenti (limite del bitmap font).

## Salvataggio (importante per le migrazioni)

`src/game/state.ts`, chiave **`politicmon-save-v6`**. Se cambi la forma di
`GameState`: bumpa la chiave (`-v7`), aggiungi la vecchia a `LEGACY_KEYS`, e
gestisci il default del nuovo campo in `parseState`. Mai rompere i salvataggi esistenti.

## Verifica visiva (la tab di preview è "nascosta")

Il requestAnimationFrame si ferma quando la tab di anteprima non è visibile,
quindi gli screenshot diretti escono neri. **Pattern collaudato:** usa Playwright
(`scripts/shot-*.mjs`) che istanzia Screen/Input/SceneStack manualmente, chiama
`update`/`draw` in un loop, e salva `canvas.toDataURL` → PNG. Poi upscale 4x
nearest-neighbor con System.Drawing in PowerShell. Esempi pronti: `scripts/shot-rival.mjs`,
`scripts/shot-casino.mjs`. Per il multiplayer servono 2 context Playwright isolati.
`scripts/check-err.mjs` controlla gli errori console in produzione.

## ⚠️ Git: NON ci sono commit

Il repo **non ha ancora commit** (`git log` vuoto). Tutto il lavoro è solo sul
filesystem + deploy Vercel. Se l'utente vuole versionare, proponi un primo commit
(la `.gitignore` è già pronta: esclude `node_modules`, `dist`, `.env`, `artifacts`, ecc.).
Non committare senza che l'utente lo chieda.

## Trappole note (imparate sul campo)

- **Canvas 240px:** ogni `screen.text` non wrappato che supera ~38 char si taglia. Calcolo: `x + len*6 ≤ 240`. Il box messaggi usa `wrapText(testo, 36)`.
- **`screen.text(undefined)`** ora è difeso (no-op), ma evita di passare valori che possono essere `undefined`.
- **`Math.random()`/`Date.now()`** sono vietati DENTRO gli script Workflow (rompono il resume), NON nel codice di gioco (lì vanno benissimo).
- **Bilanciamento incontri:** tarato per interrompere ~ogni 10-12 passi. Se ritocchi `encounterRate` (maps.ts) o le probabilità in `WorldScene` (`checkWanderingChallenger`/`checkStreetEvent`), rifai i conti — tre sistemi si sommano.
- **Trystero**: API `room.makeAction(ns)` → oggetto `{send, onMessage}`; `room.onPeerJoin = fn` (assegnazione). Il rendezvous P2P richiede qualche secondo.

## Idee non ancora fatte (backlog, dall'audit di retention)

- Traguardi/achievement satirici sbloccabili (con schermata dedicata).
- Sfida del giorno (daily) con bonus.
- Ministero speciale / epilogo aperto / leaderboard P2P.

Vedi `docs/ROADMAP` nel README se serve più dettaglio.

## Storico sessioni (append in cima)

- **UX & leggibilità (sessione corrente):**
  - **Overflow menu risolto alla radice:** nuovo `clipToWidth(text, px)` in
    `ui/widgets.ts` + glifo `…` nel font; `Menu.draw` ora tronca ogni voce alla
    larghezza del box (tenendo conto di cursore e rightLabel) invece di sforare.
  - **Menu pausa auto-largo:** `PauseScene.draw` usa `measureWidth()` clampato a
    schermo (fix "VEICOLO: MONOPATTINO" che usciva di ~22px). Mosse lunghe in
    battaglia troncate con ellissi (clipToWidth a 98px) invece di taglio secco.
  - **Onboarding primi minuti:** intro WorldScene ora spiega i comandi base
    (FRECCE/A/B) e dice di seguire la freccia gialla; il prof nel LAB spiega
    "premi A per esaminare, ne scegli una sola"; la freccia GUIDA non punta più
    all'uscita quando sei già dentro un interno (LAB) col target sulla porta.
- **Feel & touch (sessione precedente):**
  - **Veicoli visibili:** sotto il player ora si disegna lo sprite del mezzo
    (`vehicleSprite` in `art/characters.ts`); il personaggio è rialzato "in sella"
    (lift 4px monopattino / 6px ruspa, jitter motore sulla ruspa). Disegno in
    `WorldScene.draw`.
  - **Titolo prima del nome:** la `TitleScene` non apre più la `NicknameScene`
    all'avvio. Il nome si imposta dal menu; se manca, lo si chiede solo al click
    su NUOVA CAMPAGNA.
  - **Touch diretto sullo schermo:** `Input` traccia i tap sul canvas in coord.
    interne 240x180 (`consumeTap`/`tapInRect`/`clearTap`, soglia anti-swipe).
    `Menu` evidenzia/conferma le voci al tocco; `MessageBox` avanza al tocco. Il
    marchio "Politicoy Colore" del guscio è un `<button data-key="start">` che
    apre il menu (index.html + styles.css).
  - **Vibrazioni semantiche:** nuovo `engine/haptics.ts`, agganciato agli SFX in
    `audio.ts` (tap/confirm/cancel/hit/hitSuper/faint/catch/levelUp/alert) — non
    più casuali, seguono gli eventi reali. Toggle VIBRA nel menu pausa (solo se
    `navigator.vibrate` esiste), preferenza in localStorage.
  - **Feeling battaglia:** in `BattleScene` aggiunti particelle d'impatto
    (`spawnImpact`, colore/quantità per efficacia), banner animato SUPER
    EFFICACE/POCO EFFICACE/CRITICO (`drawEffFx`), hit-stop, knockback del colpito
    e shake scalato col peso del colpo.
  - **Telegrafia mossa nemica:** prima che il nemico agisca, anelli pulsanti
    colorati per categoria (`telegraph`/`drawTelegraph`: rosso fisico, blu
    speciale, viola status) — il giocatore "legge" la mossa in arrivo.
  - **Status visivi:** lo sprite del mostro ora racconta la condizione in
    `drawMonster` — INDAGATO dondola lento, SCANDALO trema + velo rosso pulsante,
    GAFFE (gaffeTurns) scossoni erratici; simbolo fluttuante !/$/? sopra la testa.
    NB: `gaffe` vive in `gaffeTurns`, non in `mon.status`.
  - **Debug:** in DEV `window.stack` espone lo SceneStack (main.ts).
  - **Intro video (Higgsfield):** splash `public/intro.mp4` (Ponte sullo Stretto
    epico-satirico + marcetta da comizio), generato con l'MCP Higgsfield (immagine
    nano_banana → Veo 3.1 Lite 4s → jingle Sonilo → montati con ffmpeg). Overlay
    HTML `#intro-overlay` in index.html, logica in `engine/intro.ts`: parte sopra
    la TitleScene, si chiude a fine video / al tap / su SALTA, una volta per
    sessione (sessionStorage `politicmon-intro-seen`). La TitleScene è pushata
    SUBITO (il game loop non dipende dalla Promise dell'intro → niente schermo
    nero). Il SW cache-first lo cacha al primo caricamento (non in PRECACHE).
    Sorgenti grezze in `artifacts/` (non committate: bridge-frame.png,
    intro-bridge.mp4, intro-jingle.m4a).
    NB: la grafica DI GIOCO resta 100% pixel-map da codice; l'AI è solo lo splash.
- **Rivale ricorrente:** GIANNI a 5 tappe con team scalato e memoria (`data/rival.ts`, `rivalWins` in save v6).
- **Audit + fix:** overflow UI mobile corretti, incontri ribilanciati, 3 hook retention (teaser/milestone/loot).
- **Migliorie gameplay:** animazioni battaglia, preview starter, condivisione EXP (DIVISA EQUA), modalità guidata, polish.
- **Multiplayer:** prima PartyKit, poi convertito a **P2P Trystero** per vincolo "gratis garantito".
- **Mobile/PWA:** levetta analogica, prompt installazione.
- **Contenuti:** Stretto di Messina, casinò, direttive, side quest, veicoli, musica dinamica.
- **Base:** Atto 1+2, sondaggi, governo ombra, evoluzioni ramificate, 4 specie nuove.
