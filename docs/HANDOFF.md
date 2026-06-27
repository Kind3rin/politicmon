# HANDOFF — Politicmon

> **Leggimi per primo a ogni nuova sessione.** Questo file ti mette al corrente
> dello stato del progetto in 2 minuti, così puoi riprendere senza rileggere
> tutto il codice. Aggiornalo alla fine di ogni sessione che cambia qualcosa di
> sostanziale.

Ultimo aggiornamento: **Round 11 — fix accessi (porta dorata/casinò/casa/stretto)**, 2026-06-27 (vedi § Storico in fondo).

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
| Veicoli | MONOPATTINO (veloce), RUSPA (abbatte alberi), AUTO BLU | `game/vehicles.ts` |
| MN TRAGHETTO | Abilità sul campo stile SURF: attraversa l'acqua (`canFerry`/`isOnWater` in WorldScene, flag `hm-traghetto`, `NpcDef.hmGift`). Sblocca la traversata Calabria→Sicilia via mappa `mare` | `game/world/WorldScene.ts`, `data/maps.ts` (`mare`) |
| Incontri PG casuali | Allenatori vaganti scalati | `data/encounters.ts` |
| Eventi morale | Siparietti di strada che muovono sondaggi/fondi | `data/streetevents.ts` |
| Rivale ricorrente | GIANNI a 5 tappe, squadra che cresce, battute con memoria | `data/rival.ts` |
| Retention | Teaser post-medaglia, BREAKING NEWS sondaggi, loot a sorpresa | `data/trainers.ts` (`BADGE_TEASER`), `game/governo.ts` (`bumpSondaggi`), `game/battle/BattleScene.ts` (`LOOT_TABLE`) |
| Audio dinamico | Tracce per zona e tipo di battaglia | `engine/audio.ts` |
| Animazioni | Idle/affondo procedurali + frame d'azione su boss; preview starter | `game/battle/BattleScene.ts`, `scenes/StarterPreviewScene.ts` |
| Mobile | Levetta analogica + d-pad, toggle controlli, modalità guidata | `engine/controls.ts`, `engine/input.ts` |
| PWA | Manifest, service worker, prompt installazione (iOS incluso) | `engine/pwa.ts`, `public/sw.js` |
| Multiplayer P2P | Presence (vedi gli altri sulla tua mappa), chat di zona, emote, nickname | `net/mp.ts`, `net/profile.ts`, `scenes/ChatScene.ts` |

Numeri attuali: **30 specie, ~70 mosse, 21 allenatori fissi (+ rivale dinamico), 18 quest, ~30 mappe (5 outdoor + mare + interni)**.

**STRETTO: come ci si arriva (round 13).** NON più con la SCORTA AUTO BLU (rimossa
dal menu transport). Ora: a Caput Mundi il MARINAIO (11,19) regala la MN TRAGHETTO
a 3 medaglie → l'IMBARCO (warp 12,19, gated `hm-traghetto`) porta alla mappa `mare`
(BRACCIO DI MARE) → si attraversa l'acqua con la MN → si approda nello STRETTO.
La SCORTA resta solo per il fast-travel tra città già visitate.

Aggiunte recenti alla tabella sopra (round 8-11):

| Area | Cosa | File chiave |
|------|------|-------------|
| Dex per zona | Roster nativo per mappa + ricompensa una-tantum al 100% di zona | `data/dexzones.ts` (`zoneProgress`), hook in `BattleScene` post-`markCaught` |
| Gating città | Le città oltre il borgo richiedono medaglie (edge `requiresBadges` + `lockedLines`) → progressione percepita | `game/world/WorldScene.ts`, `data/maps.ts` (edges) |
| Mosse CAMPAGNA | Comando CAMPAGNA in lotta (azioni `CAMPAIGN_ACTIONS`, griglia 2-col + descrizioni) | `game/battle/BattleScene.ts` |
| Menu pausa v2 | Ridisegnato: azioni principali + sotto-menu OPZIONI (Salva/Guida/Audio/Vibra/Tasti) | `scenes/PauseScene.ts` |
| PC BOX | Scambio party↔box (mancava il deposito mostri) | `scenes/BoxScene.ts` |
| GUIDA TIPI | Schermata che spiega le 8 ideologie e le forze/debolezze | `scenes/TypesScene.ts` |

## Decisioni di prodotto già prese (rispettale)

- **Multiplayer = P2P puro (Trystero/Nostr), MAI un server a pagamento.** Vincolo dell'utente: "gratis garantito, nessun addebito nemmeno oltre i limiti". Non introdurre PartyKit/Supabase/backend con account fatturabili.
- **Casinò/escort = satira bonaria** (Bunga Bunga Club parodia), niente contenuti espliciti.
- **Niente asset binari scolpiti a mano:** tutta la grafica è generata da codice (pixel-map testuali); le icone PNG escono da `scripts/gen-icons.mjs`.
- **Tutti i testi di gioco in italiano**, solo MAIUSCOLE + accenti (limite del bitmap font).

## Salvataggio (importante per le migrazioni)

`src/game/state.ts`, chiave **`politicmon-save-v9`** (`LEGACY_KEYS` = v8…v3 per
migrazione automatica). Se cambi la forma di `GameState`: bumpa la chiave (`-v10`),
aggiungi la vecchia in cima a `LEGACY_KEYS`, e gestisci il default del nuovo campo
in `parseState`. **Mai rompere i salvataggi esistenti.** `parseState` difende OGNI
campo con un default + rete di sicurezza sugli HP (mai 0/NaN allo spawn).

⚠️ **Save ≠ cache SW.** Il salvataggio è in `localStorage`, la cache del service
worker è separata: aggiornare il gioco (nuovo bundle) NON cancella il save. L'auto-
update del SW è save-safe.

## Verifica visiva (la tab di preview è "nascosta")

Il requestAnimationFrame si ferma quando la tab di anteprima non è visibile,
quindi gli screenshot diretti escono neri. **Pattern collaudato:** usa Playwright
(`scripts/shot-*.mjs`) che istanzia Screen/Input/SceneStack manualmente, chiama
`update`/`draw` in un loop, e salva `canvas.toDataURL` → PNG. Poi upscale 4x
nearest-neighbor con System.Drawing in PowerShell. Esempi pronti: `scripts/shot-rival.mjs`,
`scripts/shot-casino.mjs`. Per il multiplayer servono 2 context Playwright isolati.
`scripts/check-err.mjs` controlla gli errori console in produzione.

## Git & deploy (workflow stabilito)

- **Branch:** si lavora su `master`. Convenzione di sessione: ogni round si fa su
  un branch `roundN-*`, poi `git merge --no-ff` in `master`.
- **Deploy = Vercel Git integration su `master`** (NON GitHub Pages). Ogni push su
  `master` fa partire il deploy automatico. URL: https://politicmon.vercel.app.
  Progetto `prj_7E1cxq0mRjUjlfnpCZl6AQ9zva0p`, team `team_WDtxJ0CdxHeUGGHVqYD8u0XT`.
  `.vercel/project.json` è **gitignored**.
- **L'utente vuole commit + push + deploy AUTONOMI** ("Vai e pusha sempre") — non
  chiedere conferma, fai tutto fino al deploy e poi riepiloga.
- ⚠️ **Webhook Vercel a volte non scatta** sul push. Se il deploy non parte, forza
  con un commit vuoto: `git commit --allow-empty -m "chore: re-trigger deploy" && git push`.
- Verifica live: `node scripts/check-err.mjs` (errori console in prod) e cerca i
  marker nel bundle servito (es. `curl -s https://politicmon.vercel.app/assets/index-*.js | grep "CASINÒ DI PALAZZO"`).

## Trappole note (imparate sul campo)

- **Canvas 240px:** ogni `screen.text` non wrappato che supera ~38 char si taglia. Calcolo: `x + len*6 ≤ 240`. Il box messaggi usa `wrapText(testo, 36)`.
- **`screen.text(undefined)`** ora è difeso (no-op), ma evita di passare valori che possono essere `undefined`.
- **`Math.random()`/`Date.now()`** sono vietati DENTRO gli script Workflow (rompono il resume), NON nel codice di gioco (lì vanno benissimo).
- **Bilanciamento incontri:** tarato per interrompere ~ogni 10-12 passi. Se ritocchi `encounterRate` (maps.ts) o le probabilità in `WorldScene` (`checkWanderingChallenger`/`checkStreetEvent`), rifai i conti — tre sistemi si sommano.
- **Trystero**: API `room.makeAction(ns)` → oggetto `{send, onMessage}`; `room.onPeerJoin = fn` (assegnazione). Il rendezvous P2P richiede qualche secondo.
- **Multiplayer remoto (NAT) serve TURN:** in LAN funziona senza, ma da rete a rete
  i peer dietro NAT simmetrico non si connettono senza un server TURN. Default
  `openrelay` (gratuito), override via env `VITE_TURN_*`. Vincolo: niente backend
  fatturabile — il TURN deve restare gratuito.
- **Input sintetico inaffidabile per i test:** il movimento legge lo stato dei tasti
  TENUTI frame-per-frame (`input.ts`, `KEY_MAP` su `event.code`: KeyZ=a, KeyX=b,
  KeyP=start). Un keydown+keyup istantaneo via `preview_eval` NON fa camminare il
  player → non riesci a entrare in battaglia "guidando". **Workaround collaudato:**
  chiama i metodi direttamente via `window.stack` in DEV, es.
  `w.startWildBattle('mediocrate', 12)`, `b.openCampaignMenu()`.
- **Accesso ai contenuti = bug silenzioso ricorrente.** Più volte feature corrette
  erano *irraggiungibili*: warp su tile solido (finestra/muro), spawn dentro un
  muro, mappa senza uscita (con autosave che intrappola), tile non disegnato (porta
  dorata invisibile), contenuto senza segnaletica. Quando aggiungi/sposti un warp o
  uno spawn: verifica che la cella di arrivo sia **calpestabile** e che esista un
  ritorno. Lo script di check warp è il guardrail.

## Idee non ancora fatte (backlog, dall'audit di retention)

- ~~Traguardi/achievement satirici sbloccabili~~ ✓ FATTO.
- ~~Feedback veicoli / onboarding feature~~ ✓ FATTO.
- ~~Dex completabile (roster per zona) + PC BOX + scambio party~~ ✓ FATTO (round 9-10).
- ~~Progressione percepita (gating città, anticipazione)~~ ✓ FATTO (round 8).
- Sfida del giorno (daily) con bonus.
- Ministero speciale / epilogo aperto / leaderboard P2P.
- **Multiplayer da remoto** ancora dipendente dalla qualità del TURN gratuito
  (vedi trappola NAT): funziona ma fragile dietro NAT simmetrico.
- Mappe ancora migliorabili: aggiunti NPC ambientali e tesori, ma la densità
  resta sotto un Pokémon classico. Bonus ministri ancora poco "tattili" in HUD.
- NB falso positivo noto (preesistente): a `capitale` il pickup `pk-c2` (spritz)
  è sulla stessa cella del warp `salotto` @(4,18). Funziona nel gioco, non toccato.

Vedi `docs/ROADMAP` nel README se serve più dettaglio.

## Storico sessioni (append in cima)

- **Round 13 — MN TRAGHETTO + fix placement (2026-06-27):** lo STRETTO ora si
  raggiunge *via mappa* invece che con l'NPC-taxi. Nuova abilità sul campo stile
  SURF: `NpcDef.hmGift` (one-shot, gated medaglie) sblocca il flag `hm-traghetto`;
  in `WorldScene.isBlocked` i tile `water` diventano valicabili con `canFerry()`
  (flag + un mostro vivo); sprite scafo `FERRY_PIX` sotto il player su acqua
  (`isOnWater`). Nuova mappa `mare` (BRACCIO DI MARE): imbarco a Caput Mundi
  (MARINAIO regala la MN a 3 medaglie; warp 12,19 gated `requiresFlag`) →
  attraversi l'acqua → approdi allo STRETTO. STRETTO tolto dal menu SCORTA.
  Inoltre fix di **8 placement** (NPC/pickup su tetti/mobili/porte-warp), trovati
  con audit cella-per-cella: `tr-lobbista` (sul tetto bar eurotown), `tr-noponte`
  e `scorta-cap` (su porte-warp), 5 pickup dentro letti/scaffali + `pk-s3` su un
  NPC. Nuovo guardrail `scripts/check-placement.mjs` (0 placement su solido/warp).
- **Round 12 — discoverability (2026-06-27):** le "feature mancanti" segnalate
  esistevano già: il problema era scopribilità/grafica. CASINÒ ora ha un tetto-
  insegna dedicato (tile `$` bordeaux/oro) per distinguerlo dalle case; nuovo
  `src/art/items.ts` con 16 icone oggetto 12x12, disegnate per-voce in BORSA/SHOP
  + il `Menu` ora scorre (`maxVisible`+▲▼) così le liste lunghe non sforano;
  DIVISA EQUA (condivisore EXP) regalata dalla MAMMA a inizio partita + badge
  "EXP+" in lotta; STRETTO segnalato; fix conflitto pickup/warp `pk-c2`. Poi
  (stessa sessione) fix menu SCORTA che troncava "STRETTO DI MESSINA" → pannello
  auto-largo. Vedi memoria `politicmon-discoverability-trap`.
- **Round 11 — fix accessi ai contenuti (2026-06-27):** workflow di bug-hunt (8
  agenti, verifica avversariale) ha stanato 6 bug di *accesso* — feature corrette
  ma irraggiungibili. Tutti fixati e live:
  - **PORTA DORATA (Atto 2) non disegnata:** il warp c'era ma solo tappeto rosso
    contro un muro, nessun tile dorato. Aggiunto tile `g` (porta dorata) in
    `art/tiles.ts` + righe `…ggA…` in cima a `PALAZZO_TILES` e in fondo a
    `COLLE_TILES` (`data/maps.ts`). Ora sempre visibile. Verificato a schermo.
  - **CASINÒ senza segnaletica:** raggiungibile ma nessun cartello, e il cartello
    PALESTRA era per sbaglio davanti alla porta del casinò. Spostato PALESTRA su
    (7,12), aggiunto cartello CASINÒ DI PALAZZO su (22,12).
  - **CASA TUA (BORGO) irraggiungibile:** il warp `home` era su una finestra (tile
    solido `n`) → MAMMA/caffè/quest bloccati. Spostato sulla porta (x:23→22).
  - **STRETTO vicolo cieco:** nessuna uscita → chi entrava restava intrappolato
    (con la posizione salvata!). Aggiunto NPC `scorta-stretto` (SCORTA AUTO BLU) che
    riporta indietro.
  - **AUTO BLU → Caput Mundi** spawnava dentro un muro (`TRANSPORT_DESTINATIONS`
    capitale y:18→19, cella libera).
  - **Zona Dex Caput Mundi** richiedeva `mattarellux` (leggendario 1%) → non
    completabile. Tolto dal gate in `data/dexzones.ts` (resta nel Dex globale).
  - Lezione: la maggior parte erano problemi di *discoverability/grafica mancante*,
    non warp rotti. Vedi nuova trappola "Accesso ai contenuti" sopra.
- **Round 10 — zone-dex + 2 specie + fix overflow:** `data/dexzones.ts`
  (`zoneProgress`), ricompensa una-tantum al 100% di zona (hook in `BattleScene`
  dopo `markCaught`, flag `zoneRewardsClaimed` in save). +2 specie (`mediocrate`
  #29, `pontigor` #30 → 30 totali). Fix overflow descrizioni CAMPAGNA (griglia
  2-col + desc su 2 righe). Save bumpata a v9.
- **Round 9 — incontri esclusivi + Dex completabile + menu pausa v2:** roster wild
  per-zona (specie esclusive, niente doppioni cross-mappa) così il 100% è davvero
  raggiungibile; PC BOX (`scenes/BoxScene.ts`) per depositare/scambiare mostri;
  menu pausa ridisegnato (azioni principali + sotto-menu OPZIONI). GUIDA TIPI
  (`scenes/TypesScene.ts`).
- **Round 8 — cattura soddisfacente + progressione percepita:** formula di cattura
  rivista in `sim.ts` (comune indebolito+status 49%→95%, leggendari restano 22-27%);
  animazione di cattura leggibile (niente "salto fuori" confuso); **gating città**
  (le città oltre il borgo richiedono medaglie, edge `requiresBadges`+`lockedLines`)
  per dare senso di avanzamento; teaser/anticipazione post-medaglia.
- **Bilanciamento reale + leggendario epico (sessione precedente):**
  - **Lotte per il giocatore REALE** (non quello ottimale della sim): starter
    buffati (HP/ATK/DEF +, e una mossa STAB forte a lv13 prima dell'evoluzione,
    risolve il "danno troppo basso" che trascinava le lotte); cure più accessibili
    (6 caffè iniziali, caffè 80→50€ e cura 20→25, spritz 220→150€); EXP +
    (divisore 6→5.5, per non arrivare sotto-livello); IA un filo più clemente
    (whiff 0.45→0.48, floor 0.33); sconfitta meno punitiva (perdi 25% max 250€,
    -5 sondaggi invece di -8); LOBBISTA (outlier) team ammorbidito. Misurato:
    primi allenatori 77-98%, LOBBISTA 33→44%. La sim resta pessimistica (1 mostro,
    no cure/cambi) quindi il win-rate reale è più alto. `scripts/sim-balance.mjs`
    aggiornato — rieseguilo se ritocchi stat/mosse.
  - **Incontro leggendario EPICO:** nuovo flag `BattleOptions.legendary`. Messa
    in scena in `BattleScene`: flash dorato d'apertura, banner "POLITICMON
    LEGGENDARIO!", **aura dorata pulsante con raggi** attorno al mostro per tutta
    la lotta (`drawLegendaryAura`), scintille dorate continue, sting sonoro e
    dialogo enfatico. `WorldScene.startWildBattle` accetta `legendary` (passato
    da `interactLegendary`).
- **Audit & polish (sessione precedente):** workflow di audit (case/testi/incontri)
  poi fix verificati:
  - **Case allineate:** i tetti-insegna bar (`eQQe`, 4 col) erano più stretti
    delle facciate (`mmdnm`, 5 col) → muro che "galleggia" + porta non centrata.
    Allineate a `mdnm` (4 col) come Capitale, aggiornando warp+barMap insieme
    (atomico, la porta si sposta di 1). Più nubi `=` riallineate sotto le porte e
    porta asimmetrica del borgo (`mndm`→`mdnm`).
  - **Glifo € nel font:** mancava → buco vuoto ovunque ci fosse il denaro
    (~33 punti). Aggiunto a `font.ts`. Sostituiti altri char fuori-font (em-dash
    nel titolo, bullet negli achievement) con `-`.
  - **Incontri diradati:** erano ~1 ogni 7.5 passi (troppo). Cooldown GLOBALE
    condiviso (`interruptCooldown`, 6 passi dopo ogni interruzione) in
    `WorldScene.onStepComplete` + encounterRate 0.10/0.11→0.07/0.08 + vaganti
    (0.045→0.03, cd 45-75) ed eventi morale (0.035→0.025, cd 90-140) diradati.
    Misurato: ~1 ogni 17 passi (range Pokémon 10-20). Le sfide a vista NON
    passano dal cooldown (sono deterministiche).
- **Centri cura BAR SPORT (sessione precedente):** i guaritori erano NPC `barista`
  piazzati all'aperto in mezzo alla città (brutto). Ora sono 5 EDIFICI interni
  visitabili (`barMap()` + tileset `BAR_TILES`: scaffali, bancone `h`, tavolini),
  uno per area (BAR SPORT BORGO/MEDIOPOLI, CAFFÈ EUROPA, GRAN CAFFÈ ROMANO,
  CHIRINGUITO PAPEETE). Porte aggiunte nelle facciate cittadine, barista healer
  dentro al bancone. TUTTI i barista-in-piazza rimossi.
  ⚠️ Trappola tile imparata: nei tileset città ogni riga DEVE essere lunga quanto
  le altre (le mappe sono 28 o 30 colonne); un carattere in meno sfasa l'intera
  mappa. La porta `d` di un edificio va nella riga del MURO BASE, con cella
  calpestabile SOTTO (è lì che si riemerge). Validare sempre i warp in entrambe
  le direzioni via lo script di check (vedi sessioni precedenti).
- **Bilanciamento lotte + Mafia + AUTO (sessione precedente):**
  - **Lotte più accessibili** (diagnosi via simulazione Monte Carlo in
    `scripts/sim-balance.mjs`): l'IA era CIECA al contesto (un wild giocava come
    il boss finale). Ora `chooseFoeMove(foe, target, ai)` accetta un `AiProfile`
    {whiff, canHeal, finisher}; `BattleScene.computeAiProfile()` lo scala sul
    contesto (wild/comuni clementi con whiff 0.45→0.30 sulle medaglie, niente
    cura/finisher perfetti; palestre whiff 0.28; boss/rival 0.2 invariati).
    Super-efficace compresso 2x→1.7x in `poltypes.ts` (i contro-tipo early non
    one-shottano più). expYield 7→6 (+17%). Bag iniziale +scheda+maalox. Barista
    spiega la cura gratis al 1° accesso. LOBBISTA (outlier) -1 livello.
    Win-rate alla pari misurato 54%→58%, primi allenatori 66-94%.
    NB: scartati di proposito (su critica adversariale) divisore 60, HP starter,
    targetLow — sommavano troppe leve e banalizzavano. Lo script sim replica le
    formule reali: aggiornalo se cambi sim.ts/poltypes.ts.
  - **AUTO BLU guidabile**: 3° veicolo, sprite a 3 viste (front/back/side),
    veloce all'aperto (AUTO_FACTOR 3.0), player in abitacolo. Dono NPC a Caput
    Mundi. `vehicleSprite` ora gestisce front/back/side per l'auto.
  - **Fazione MAFIA (satira bonaria, no violenza/apologia):** covo "RETROBOTTEGA
    DEL PADRINO" allo STRETTO (warp da 20,2), `MafiaScene` con 4 attività che
    AIUTANO ma COMPROMETTONO (costano SONDAGGI): mercato nero direttive a metà
    prezzo, raccomandazione (cura+regalo), protezione/pizzo (dirada gli incontri,
    flag `mafia-protezione`), scommessa clandestina. Nuovo campo `NpcDef.mafia`.
    Side-quest "UN'OFFERTA RAGIONEVOLE".
- **Nuova schermata titolo (splash AI):** la TitleScene aveva sfondo procedurale
  "piatto" (Partenone + fasce di colore). Ora usa uno **splash AI a tutto schermo**
  (`public/title-bg.png`, 240×180) generato con Higgsfield (modello `z_image`,
  4:3, prompt pixel-art GBA satirico — Palazzo italiano + mostri-politici buffi +
  tricolore). Logo "POLITICMON", slogan rotante e menu restano pixel-art da codice
  SOPRA l'immagine, con un velo scuro semitrasparente per la leggibilità.
  - Nuovo metodo `Screen.image(img, x, y, w, h)` per disegnare bitmap sul canvas.
  - `TitleScene` carica lo splash async (modulo-level `loadTitleBg`); se manca o
    non carica, **fallback automatico** allo sfondo procedurale (`drawSky/Palace/
    Podium`) — niente schermo nero, niente crash.
  - Il SW lo cacha cache-first al primo caricamento (come `intro.mp4`, NON in
    PRECACHE: è 106KB, non rallentiamo il primo avvio).
  - Coerente col vincolo del progetto: l'AI è solo lo SPLASH; la grafica DI GIOCO
    resta 100% pixel-map da codice. L'utente ha scelto la candidata #2 (Palazzo
    imponente centrato + 3 mostri sui podi che richiamano i 3 starter); le sorgenti
    sono in `artifacts/title-cand1.png` e `title-cand2.png` (quella in uso è la 2).
  - Screenshot di verifica: `scripts/shot-title.mjs` → `artifacts/screens/title_v3_a.png`.

- **Onboarding, veicoli, mappe più vive (sessione corrente, 2ª parte):**
  - **Onboarding feature** (erano invisibili a chi segue solo la storia):
    intro del borgo estesa (ricorda di entrare negli edifici per storie/tesori);
    hint one-shot delle DIRETTIVE al primo accesso a un negozio (flag `tm-hint`);
    annuncio del CASINÒ all'arrivo a Caput Mundi (`MAP_ENTRY_HINTS` in WorldScene,
    metodo `showMapEntryHint`, flag `hint-casino`, valutato in update a controllo
    libero come gli achievement). Il messaggio del GOVERNO OMBRA alla 1ª medaglia
    era già completo (dice "dal menu START").
  - **Veicoli ora si sentono:** il MONOPATTINO usa `SCOOTER_FACTOR=2.5` (prima
    riusava `RUN_FACTOR=1.85` = identico alla corsa B → impercettibile). La RUSPA
    che abbatte un albero fa `audio.hitSuper()` + scossone camera (`this.shake`,
    applicato a camX/camY dopo il clamp nel draw, decadimento in update).
  - **Mappe più vive:** +5 NPC ambientali satirici (solo battute, niente lotte)
    nelle mappe più spoglie — Mediopoli (talkshow-fan), Eurotown (euroburocrate,
    pensionato-euro), Capitale (turista-cap, influencer-cap). Validati con
    `scripts/check-npcs.mjs` (tile calpestabili + niente sovrapposizioni).
  - Tutto verificato: typecheck+build puliti, screenshot in `artifacts/screens/`.

- **Analisi gameplay & ribilanciamento (sessione corrente, 1ª parte):** audit dei 4 pilastri
  (battaglie/progresso/esplorazione/feature invisibili) e fix a maggior impatto.
  - **Battaglie ribilanciate (il fix più importante):** prima duravano 2 turni
    (one/two-shot), zero tensione. Ora ~5-8 turni (early/mid) e ~4 (evoluti),
    verificato con `scripts/shot-battle-balance.mjs` (simula scontri e conta i
    turni medi). Cosa è cambiato: HP più alti e difese che scalano col livello
    (`statsOf` in `monster.ts`, non più `+5` flat su def/spc); divisore danno
    50→70 (`sim.ts`); moltiplicatori di tipo estremi compressi (4x→2.5x, 0.25x→0.4x
    in `typeMultiplier`, `poltypes.ts`) perché col doppio-tipo erano one-shot.
    NB: bilanciamento globale e coerente — vale per player e nemici, il rapporto
    di forze resta; i boss non diventano ingiocabili.
  - **IA di battaglia riscritta** (`chooseFoeMove` in `sim.ts`): da "50% a caso,
    50% mossa più forte" a un'euristica vera (cura se ferita, si potenzia se sana,
    debuff/status quando conviene, finisce il bersaglio basso). Random sceso al 25%.
    Effetto collaterale positivo: status (scandalo logora 1/8 HP/turno, indagato,
    gaffe) ora "contano" perché le battaglie durano abbastanza.
  - **Curva EXP addolcita** (`expForLevel`): da cubica pura `lv³` (rallentava
    brutalmente già a lv6-9) a `0.8·lv³ + 10·lv²` — sali più spesso nella fascia
    5-25 dove il giocatore mollava.
  - **HUD SONDAGGI potenziato** (`WorldScene.draw`): la barra c'era ma era solo
    testo `SOND xx%`; ora barra colorata + etichetta breve del momento politico
    (`sondaggiLabelShort` in `governo.ts`, max ~13 char per stare nel pannello).
  - **Direttive (MT) più leggibili:** il PartyScene in modalità use-item mostra
    un badge OK/NO di compatibilità accanto a ogni mostro (`directiveMoveId` in
    PartyOptions, usa `canLearnMove`), e il titolo dice il tipo richiesto. Niente
    più "provo e fallisce in silenzio".
  - **Tesori nascosti** (`PickupDef.hidden`): 8 tesori segreti negli angoli morti
    delle 4 mappe outdoor, non disegnati, raccolti CALPESTANDOLI (in
    `onStepComplete`, con jingle + messaggio "TESORO SEGRETO"). NON bloccano il
    movimento (niente muri invisibili — fix in `isBlocked`). Hint satirico nel
    cartello "CAMPAGNA ELETTORALE NORD" del borgo. Validati da
    `scripts/check-pickups.mjs` (controlla che i nascosti siano calpestabili).
  - **Sistema TRAGUARDI** (`game/achievements.ts` + `scenes/AchievementsScene.ts`):
    14 achievement satirici valutati in `WorldScene.update` quando il giocatore ha
    il controllo libero (copre vittorie/catture/sblocchi senza agganci sparsi).
    Notifica "TRAGUARDO SBLOCCATO" + premio in €. Persistiti in `state.flags` con
    prefisso `ach:` — NIENTE bump della save key. Voce TRAGUARDI nel menu pausa.
    Doppia funzione: carote continue + rendono scopribili le feature (un traguardo
    "vinci al casinò" segnala che il casinò esiste).
  - **Diagnosi non implementata (vedi backlog):** mappe ancora sparse oltre ai
    tesori; onboarding delle feature; feedback veicoli. Sono i prossimi candidati.

- **Contenuti & ricchezza del mondo (sessione precedente):**
  - **9 case visitabili:** il mondo era vuoto (9 interni, zero case). Aggiunto
    `houseMap()` riutilizzabile (3 piantine + tile arredo `L` letto, `P` pianta)
    e una/due case per città con NPC satirici e pickup nascosti. Porte aggiunte
    nelle facciate cittadine; 56 warp validati in entrambe le direzioni.
    NB: quando aggiungi case, verifica che il warp di ritorno cada su una cella
    calpestabile (non `T`/parete) — usa lo script di validazione warp.
  - **Casinò profondo:** valuta FICHE separata dai fondi (`chips` in GameState,
    migrato a 0 sui save v6 senza bump chiave). CAMBIO FICHE con commissione,
    PREMI DI PALAZZO (shop oggetti rari coi gettoni: direttive, TESSERA),
    slot in fiche con rigioco rapido + stats sessione, BUNGA CLUB ibrido €+sondaggi.
  - **Più cose da fare:** 3 nuove side-quest (GIRO DI PORTE, PORTAFOGLI DI FICHE,
    SEGRETERIA DI PARTITO) + NPC con `setFlag` (nuovo campo NpcDef: setta un flag
    quando ci parli) e un gift di direttiva al circolo del borgo.
- **UX & leggibilità (sessione precedente):**
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
