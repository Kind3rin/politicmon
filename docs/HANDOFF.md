# HANDOFF — Politicmon

> **Leggimi per primo a ogni nuova sessione.** Questo file ti mette al corrente
> dello stato del progetto in 2 minuti, così puoi riprendere senza rileggere
> tutto il codice. Aggiornalo alla fine di ogni sessione che cambia qualcosa di
> sostanziale.

Ultimo aggiornamento: **Audit lore/narrativa end-to-end (fix testo/coord)**, 2026-07-04.

### ⏭️ CONTINUA DA QUI (handoff per la prossima sessione)
Audit narrativo + fix leggendari + fix save-trap + SALVA scopribile + SLOT MULTIPLI,
tutto pushato (HEAD `3ae7a3a`). Tree pulito, live su politicmon.vercel.app.

**💾 SLOT MULTIPLI DI SALVATAGGIO (`3ae7a3a`)** — save da mono-slot a 3 slot
indipendenti SENZA toccare i ~70 call site di saveGame: concetto di "slot attivo"
persistito in localStorage. Chiavi `politicmon-save-v13__sN` (+.bak). Retrocompat:
vecchia chiave mono-slot → slot 0, legacy v3-v12 → solo slot 0. Nuova `SlotScene`
(selettore 3 slot con riepilogo LV/medaglie/luogo, modalità load/new, START cancella).
TitleScene: CONTINUA→SlotScene(load), NUOVA→difficoltà→SlotScene(new). Verificato
`check-slots.mjs` 21/21 + screenshot. NON è migrazione di versione (stessa forma
GameState, cambia solo il layout chiavi localStorage). Vedi [[politicmon-save-slots]].

**💾 SALVA NEL MENU PAUSA PRINCIPALE (`a369058`)** — il salvataggio manuale ESISTEVA
gia' (menu pausa → OPZIONI → SALVA) ma era sepolto e poco scopribile (classica
[[politicmon-discoverability-trap]]). Portato come PRIMA voce del menu pausa,
rimosso da OPZIONI. Logica invariata (msg.show(saveGame)). Verificato con screenshot
Playwright (scripts/shot-pause-save.mjs). NB: resta un solo slot autosalvato — SALVA
ora e' un checkpoint manuale visibile ma sovrascrive lo stesso slot (no multi-save).

**💾 FIX TRAPPOLA AUTOSAVE + LEGGENDARI (`4cfee9f`)** — l'utente ha segnalato che il
gioco autosalva sempre (nessun save manuale), quindi davanti a un leggendario si
rischiava di perderlo andando avanti. Confermato il bug in `interactLegendary`
(WorldScene): l'esito "win" (KO del leggendario) era trattato come "caught" →
settava il flag `-gone` + saveGame → l'NPC spariva PER SEMPRE, cementato
dall'autosave. I flavor `afterRunLines` ("puoi ritentare quando vuoi") mostravano
che il design lo voleva ricontattabile. Fix (come Pokémon classico): SOLO "caught"
consuma il leggendario; "win"/"run" lo lasciano disponibile. 5 leggendari coinvolti
(bunkerput, berlusconix base+encore, draghimon, mattarellux), zero soft-lock (i
flag `-gone` sono solo `hideIfFlag`). Aggiornato il hint side-encore. Vedi memory
[[politicmon-legendary-ko-trap]]. NB: il save resta un solo slot autosalvato
(~70 call site) — le scelte rischiose vanno rese non distruttive lato codice.

**🎭 AUDIT LORE/NARRATIVA (`0f49019`)** — audit a 4 dimensioni con subagent paralleli
(storia/quest, species/dex, trainer/rivale, mappe/mondo). Il mondo e' risultato
strutturalmente MOLTO solido: 0 BLOCKER, tutti i warp/gate/flag integri, nessun
riferimento morto a species/move/item, nessun placeholder/TODO. 6 fix applicati
(tutti a basso rischio, no save):
- **`ponte` era MAIN ma e' area OPZIONALE**: deviava l'HUD dallo Stretto invece che
  verso il PALAZZO dopo il 3o badge, e non aveva `target` (freccia guida spenta).
  Ora `side:true` → `boss` resta il prossimo obiettivo principale.
- **Rivale GIANNI, conteggi off-by-one**: capitale "quattro persi"→"tre", stretto
  "cinque a zero"→"quattro", defeat "sei a zero"→"cinque" (rivalWins parte da 1 dopo
  il lab; le battute descrivono lo stato PRIMA dello scontro).
- **Taxi EUROTOWN atterrava sulla statua** (tile solido `Y` col 23): x 23→24.
- **`scorta-cap`** prometteva il taxi per lo Stretto (rimosso da TRANSPORT_DESTINATIONS):
  testo riallineato a IMBARCO+TRAGHETTO.
- **Virgolette caporali `«»`** (4×, incl. intro leggendario MATTARELLUX) → `"`: il font
  5x7 non ha quei glyph, rendevano come buchi vuoti.

**✅ SECONDO GIRO (`f557a3f`) — chiusi 2 dei punti editoriali:**
- **Boss leggendari**: PRESIDENTE OMBRA (Atto 1) non schiera piu' DRAGHIMON/MATTARELLUX
  (reveal Atto 2). Sostituiti con TELECRATE (lv 24) + GENERORSO (lv 26), non-leggendari.
  trainers.ts:321.
- **Livello UE**: SHERPA UE ora consiglia "lv 50+" per BRUXELLES (boss COMMISSIONE lv 52-55),
  non piu' "45+". Gli altri banner/consigli erano gia' corretti sui dati reali (wild offshore
  38+, wild bruxelles 42+, boss tesoriere lv 45+).

**Findings ANCORA NON fixati (decisioni editoriali/design, lasciati all'utente):**
- **Tono `bunga`/BERLUSCONIX/`telecrate`**: la mossa BUNGA PARTY e il flavor alludono
  in modo trasparente a fatti giudiziari reali di persona identificabile. E' la voce piu'
  esposta rispetto al vincolo "satira BONARIA". Valutare se ammorbidire.
- **dexNum fuori sequenza** (`bunkerput` = 37 in mezzo alla serie): cosmetico, il Dex ordina
  per dexNum. species.ts.
- **Rami evoluzione `trade:true` ridondanti** (conteblob/calendauro/tajanide): il level 18
  scatta prima, lo scambio e' quasi sempre flavor morto. Alzare il level o documentare.
- **STREET_EVENTS** e' codice morto (disabilitato in onStepComplete): pool sano ma inerte.

Prima di questo (ancora valido):
Fix netcode/chat chiuso e pushato (`2b5702a`).

**🔧 FIX MULTIPLAYER/CHAT (`2b5702a`)** — l'utente segnalava "chat e multiplayer non
funzionano bene: crasha con emote, non vedo giocatori, chat sparisce". Audit
multi-agente avversariale (workflow `wf_8250ab25-c33`): 6 bug confermati + 1 plausible,
tutti fixati e verificati in-game. In `src/net/mp.ts` (+ ChatScene.ts, WorldScene.ts):
- **TURN single point of failure** (causa "non vedo giocatori" su 4G/CGNAT): c'era solo
  il demo openrelay. Ora multi-provider via lo slot `turnConfig` di Trystero (CONCATENA
  sui default STUN; passare i TURN in `rtcConfig.iceServers` li avrebbe SOVRASCRITTI).
- **Chat azzerata al cambio mappa**: `chat.length=0` spostato da `leave()` a
  `setEnabled(false)` → la chat sopravvive al cambio zona (decade col cap a 30).
- **`connected=true` all'apertura room** (prima di ogni peer): mascherava il fallimento
  TURN. Ora guidato da `remotes.size` in onPeerJoin/onPeerLeave.
- **Nick "???"** (msg prima del profilo): risolto a draw-time via nuovo `mp.chatNick(line)`
  (peerId→nick attuale), non più congelato.
- **Offline: msg mostrato ma non inviato** → riga "MESSAGGIO NON INVIATO" + INVIA grigio.
- **Storico chat** 3→4 righe, nick troncato a 8 char (prima tagliava il testo).
- **`void send()` async = unhandled rejection** (il "crash emote": overlay Vite in dev su
  disconnessione/backpressure) → `.catch(()=>{})` su tutti i send P2P.

**⚠️ AZIONE UTENTE per chiudere davvero il MP su mobile:** il codice ora supporta un TURN
dedicato, ma il default resta openrelay (inaffidabile). Registrare un TURN gratuito
(Cloudflare Calls / Metered account / Twilio) e settare `VITE_TURN_URL` / `VITE_TURN_USER`
/ `VITE_TURN_CRED` nelle env di Vercel (Production). Senza questo, "non vedo giocatori"
su 4G può ripresentarsi quando openrelay è saturo. Vedi memory [[politicmon-multiplayer-turn]].

Prima di questo (ancora valido):
- **Chat UI rifatta** (`7ed3db2`): layout `ChatScene.ts` non sforava più i 240x180.
- **Clamp livello trade/duello** (`f28ab57`): `sanitizeTradeMon` (trade.ts:41) e
  `validateWireTeam` (duelproto.ts:126) usano `LEVEL_CAP` (55), non più 50.

**✅ REVIEW R42 COMPLETATA** (workflow `wf_acd22422-d64`, ripreso e finito, tutti i
verify girati). 4 finding in fase Find, esito finale:
  - trade.ts:41 e duelproto.ts:126 (clamp livello 50 vs cap 55) → VERI, fixati in `f28ab57`.
  - state.ts:287 (monumentLevel senza tetto → un save importato/manomesso con lv>3
    crashava MonumentScene.draw: `MONUMENT_STAGES[lv]` undefined → `.flatMap`) → **VERO**.
    Fixato in `2f8fc38`: clamp 0..3 in parseState + fallback difensivo in MonumentScene.
    (Nota: nel triage a mano l'avevo scartato per errore — guardavo getCost/commit, ma
    il buco era in parseState. Non fidarsi del triage quando i verify non sono girati:
    [[politicmon-workflow-limit-trap]].)
  - BattleScene.ts:267 (boost decrement) → FALSO: logica corretta.
  → Zero finding reali residui. Review chiusa.

**Prossimo giro possibile** (dal backlog audit R42, già fatti tutti i punti proposti):
il gioco è maturo. Un audit fresco (onboarding/combat/accessibilità/economia sono stati
appena chiusi) andrebbe fatto su angolazioni NUOVE: es. *contenuto narrativo/lore*
(la storia regge dall'inizio alla fine?), *replay/social multiplayer* (cosa lega i
giocatori oltre il singleplayer?), *performance mobile reale* (profiling su device),
*localizzazione* (solo IT ora). Oppure feature nuove: NG+ vero, breeding/uova, altre
route/regioni. Chiedere all'utente la direzione.

Convenzioni operative confermate in questa sessione: commit+push autonomi (l'utente li
vuole), review avversariale multi-agente dopo ogni round grande, verifica in-game con
Playwright+screenshot, save migration bumpata dal PRIMO lotto che ne ha bisogno con
TUTTI i campi del round insieme. TURN Metered configurato su Vercel (env VITE_TURN_*).

---

### 🏁 Round 42 — RIEPILOGO CONSOLIDATO (3 lotti, tutti pushati)
Audit a 4 dimensioni (spec `scratchpad/specs/r42-audits.md`), spezzato in 3 lotti
sequenziali. **Una sola migrazione save, v12→v13** (fatta nel LOTTO 2). Stato finale:

- **LOTTO 1 — FIX + COMBAT + ONBOARDING** (commit `f82820e`): level cap 50→55,
  IA rispetta lo status fuori da lotta, decremento boost corretto, soft-cap danno
  3.5×, GAFFE 100→65%, VERDE>TECNO 2×, trigger offensivi annunciati, onboarding
  (NORMALE consigliata, tipi spiegati). Nessun campo save nuovo. Guardrail
  `check-r42-lotto1` 13/13.
- **LOTTO 2 — ACCESSIBILITÀ** (commit `cc4425a`, **save v13**): toggle RIDUCI
  EFFETTI, marker efficacia ▲▼X in griglia mosse, % PV nemico. Migrazione unica
  v12→v13 con campi: `reduceEffects`, `reduceEffectsSet`, **`monumentLevel`** (già
  pronto per il LOTTO 3). Dettaglio sotto.
- **LOTTO 3 — ECONOMIA** (commit `ef0cda9`): 6 riequilibri, NESSUNA nuova
  migrazione (usa `monumentLevel` già in v13). Dettaglio sotto.

### 💰 Round 42 — LOTTO 3: ECONOMIA (3° di 3 lotti) — **NESSUNA nuova migrazione**
Spec: `scratchpad/specs/r42-audits.md` sezione LOTTO 3. Usa `monumentLevel` (già
nel save v13). 6 riequilibri:

1. **REMATCH FAUCET dimezzato** (`rematch.ts`): moltiplicatore post-game rematch
   **×3→×2** + `REMATCH_COOLDOWN_STEPS` **400→600**. Insieme portano il rubinetto
   per-1000-passi da ~4.5× a ~2.0× il money base del trainer (**−56%**, ratio 0.444
   verificato). I rematch restano un premio, non punitivi. Il payout gym resta
   `×2.5×0.6` (invariato); il taglio tocca solo i trainer comuni post-garante.
2. **SPOT NON-SINK** (`BattleScene.ts` + `WorldScene.ts`): lo SPOT IN PRIME TIME
   (+50% fondi) è ora **escluso dai rematch** (nuovo flag `isRematch` in
   `BattleOptions`, propagato da `startTrainerFight(def, true)` al solo call-site
   RIVINCITA). Sui ribattuti il bonus non si applica **e** la carica boost NON si
   consuma (niente uso sprecato). Il COMIZIO (SONDAGGI×2) vale anche sui rematch.
3. **TORNEO PREMIO SCALANTE** (`tournament.ts` + `WorldScene.awardTournament`): dal
   **2° trionfo** un premio ripetibile `COPPA_REPEAT_PRIZE` = 700€ + 2 SCHEDE
   BLINDATE. La tassa (1500€) resta più alta → la COPPA è un **SINK netto**
   (~−800€/giro) ma dà una carota invece del vecchio −1500€ cosmetico.
4. **MANIFESTI UTILE PRIMA** (`ShopScene.ts`): MANIFESTI OVUNQUE (+30% EXP, utile
   fino al cap 55) ora in vendita **dal 2° badge** (prima solo post-garante). SPOT/
   COMIZIO restano end-game (post-garante). Gate: `id==="manifesti" && badges>=2`.
5. **MONEY-SINK TERMINALE "MONUMENTO AL CANDIDATO"** (`MonumentScene.ts` nuovo +
   NPC `architetto-cap` a (19,13) nella capitale, flag `monument` in `NpcDef` +
   dispatch in `WorldScene`): 3 livelli **10k/25k/50k€** (`MONUMENT_COSTS`),
   puramente cosmetico, deducono i fondi e alzano `state.monumentLevel` (0→3). Al
   lv3 titolo `PADRE DELLA PATRIA (AUTOPROCLAMATO)`. Ogni livello ha una descrizione
   satirica sempre più grottesca. La STATUA EQUESTRE della capitale (20,13) diventa
   il MONUMENTO nel mondo: il testo di esame cambia con `monumentLevel`
   (`monumentDecoLines`). Statua stilizzata che cresce nella scena (nessun asset).
   Satira bonaria: il candidato si erige statue coi propri soldi, "qui è legale".
6. **HARD MODE PIÙ INTERESSANTE** (`BattleScene.computeAiProfile` + `WorldScene`):
   SOLO in `state.hardMode` (normale INTATTA): boss whiff **0.2→0.1**, capipalestra
   **0.28→0.15** (boss-grade), e i **trainer comuni** ottengono cura+finisher con
   whiff-floor **0.33→0.22**. Inoltre i BOSS narrativi (`BOSS_TRAINER_IDS`, ora
   esportato) ricevono un **hold item extra (GILET, −15% danni)** sull'asso in hard,
   se non ne ha già uno (riusa il 4° slot della tupla team).

**Verifiche** (dev server :5179): typecheck + build puliti; **10 guardrail mappa**
PASS (nuovo NPC monumento su cella valida); check-sim/check-duel/check-daily/
check-evolutions/check-pixellab-coverage (173/173) PASS; **check-r42-lotto3 21/21**
(rematch mult/cooldown/faucet-ratio 0.444; SPOT escluso dai rematch A=300>B=200 +
carica non consumata; torneo premio<tassa; MANIFESTI dal 2° badge, SPOT no; monumento
3 livelli deducono i soldi e salgono, titolo lv3, fondi insufficienti→niente addebito;
hard AI whiff più basso + cura/finisher ai comuni + boss 0.2→0.1); **check-r42-lotto1
13/13** (regressione, nessuna rottura). **sim-balance pacing 3.27 turni INVARIATO**
(l'economia non tocca calcDamage né la IA normale). Monte Carlo hard boss UE
(commissione lv57-60 + GILET, party lv55): win-rate ~11% con IA-giocatore ingenua
(no cure/tipi/item) vs ~76% in normale → la modalità è più dura ma un giocatore reale
(coperture tipo + hold + item campagna + switch) vince comodamente. Screenshot:
`r42-lotto3-monument-0/2/3.png`, `r42-lotto3-hardmode-boss.png` (MACRONFOX L57 vs
DRAGHIMON L55). Script: `scripts/check-r42-lotto3.mjs`, `scripts/shot-r42-lotto3.mjs`.

**MANCANZE NOTE**: la statua nella `MonumentScene` cresce in modo sottile (il
colosso lv3 non è nettamente più grande dei livelli 1-2 a colpo d'occhio); la
crescita è comunicata soprattutto dal testo e dal titolo (accettabile per spec:
"se troppo costoso graficamente, basta dialogo + titolo"). Nessun asset PixelLab
per il monumento (rettangoli procedurali). Hard mode resta impegnativo: per un
giocatore poco esperto i boss UE lv57-60 col GILET possono essere ostici (voluto).

### ♿ Round 42 — LOTTO 2: ACCESSIBILITÀ (2° di 3 lotti) — **MIGRAZIONE UNICA v12→v13**
Spec: `scratchpad/specs/r42-audits.md` sezione LOTTO 2 (+ campi del LOTTO 3 inclusi
qui). Chiave `politicmon-save-v13`, v12 in testa a `LEGACY_KEYS`, `.bak` alla 2ª save.

**Campi v13** (default difensivi in `parseState` + `newGameState`):
- `reduceEffects:boolean` — accessibilità (questo lotto).
- `reduceEffectsSet:boolean` — l'utente ha scelto esplicitamente? Distingue
  default-di-sistema da scelta. Un save v12 (campo assente) migra a
  `reduceEffectsSet=false` e `reduceEffects = prefers-reduced-motion` del browser
  (onboarding accessibile senza sovrascrivere scelte future). Il toggle in OPZIONI
  imposta `reduceEffectsSet=true`, così il default di sistema non lo riscrive mai più.
- `monumentLevel:number=0` (clamp intero ≥0) — **money-sink terminale del LOTTO 3**
  (MONUMENTO AL CANDIDATO). Incluso QUI così il LOTTO 3 lo usa e basta, niente
  seconda migrazione.

**3 feature accessibilità:**
1. **TOGGLE RIDUCI EFFETTI** (`PauseScene` OPZIONI, stile delle altre voci toggle):
   legge/scrive `state.reduceEffects` + `saveGame`. Quando ON azzera: screen-shake
   (`BattleFx.shakeOffset()→(0,0)`, flag `fx.reduceEffects` propagato dallo state in
   `BattleScene`/`PvpBattleScene`), flash KO bianco (`BattleScene` draw gated
   `&& !state.reduceEffects`), flash level-up/cattura (idem), lampo intro leggendario
   (`legendIntroFlash` non impostato se ON), dialog-shake urla (flag di modulo
   `setReduceMotion` in `widgets.ts`, sincronizzato in `WorldScene` costruttore + al
   toggle). L'INFORMAZIONE resta ovunque (KO/level/cattura restano nel testo; le urla
   restano ROSSE+MAIUSCOLE, solo statiche).
2. **MARKER EFFICACIA IN GRIGLIA MOSSE** (`BattleScene` griglia 2x2 ~1594): disegna
   `▲`(super)/`▼`(poco eff.)/`X`(immune) PRIMA del nome mossa, dal già-calcolato
   `fightEff[i]` (segnale non più solo-colore, daltonici). Nome accorciato per fare
   spazio al marker. Rimosso commento stale "se nota dal Dex".
3. **PV NEMICO LEGGIBILI** (`view.ts drawCombatantBox`): box nemico mostra la **%**
   PV a fianco della barra (`FOE_BOX.hpW` 70→52 per far spazio). Il player resta con
   `n/max`. Il colore della barra non è più l'unico segnale di "quasi KO".

**Verifiche** (dev server :5179): typecheck+build puliti; **migrazione v12→v13**
(save v12 → load → `reduceEffects=false`/`reduceEffectsSet=false`/`monumentLevel=0`,
dati conservati, chiave v12 rimossa, `.bak` alla 2ª save, scelta esplicita conservata,
`monumentLevel` clamp 2.9→2) 14/14; **12 guardrail statici** (map-consistency,
building-doors, world-layout, map-exit, sprite-bounds, door-warps, placement,
spawn-spots, interactables, npcs, evolutions, pixellab-coverage) PASS; check-sim/
check-duel/check-daily PASS; **check-r42-lotto1** (regressione lotto 1) 6/6; playtest
lotto 2 (matchup giorgetta vs schleinix: `fightEff=[null,null,weak,super]` → ▲/▼
in griglia; `shakeOffset` ON=(0,0)/OFF≠0; `reduceEffects` propagato a `fx`; koFlash
soppresso senza crash; toggle OPZIONI inverte lo state e marca `reduceEffectsSet`)
7/7 + OPZIONI 4/4. Screenshot verificati a vista: `r42-lotto2-fight-markers.png`
(box nemico "100%" + ▼GIRAVOLTA/▲BLOCCO NAVALE colorati), `r42-lotto2-reduce-effects.png`
(nessun whiteout KO), `r42-lotto2-opzioni-on.png` (voce RIDUCI EFFETTI: SÌ).

**NOTE per il LOTTO 3 (ECONOMIA)**: `monumentLevel` è GIÀ nel save v13 (default 0,
clamp intero ≥0) — il MONUMENTO AL CANDIDATO lo usa e basta, **NESSUNA nuova
migrazione**. Gli altri punti (rematch faucet, spot non-sink, torneo, manifesti,
hard mode) non toccano il save.


### 🔧 Round 42 — LOTTO 1: FIX + COMBAT + ONBOARDING (1° di 3 lotti) — NESSUN nuovo save
Spec: `scratchpad/specs/r42-audits.md` sezione LOTTO 1. **NESSUNA migrazione save**
(il cap è runtime; i boost usano campi v12 esistenti). 9 punti, tutti fatti:

1. **LEVEL CAP 50→55** (`monster.ts`): nuova costante `LEVEL_CAP=55` (export),
   usata da `gainExp` e da `BattleScene.expRatio`. Aggiornati i commenti "cap 50"
   in `maps.ts`/`daily.ts`/`rematch.ts`; il clamp rematch (`Math.min(50→55)`) e il
   daily (`Math.min(50→55)`) salgono a 55. `expForLevel(55)=163350` finito e crescente.
2. **IA STATUS FUORI DA LOTTA** (`BattleScene.ts`): estratto helper `foeCounterStep()`
   (unico punto che sceglie+lancia la contromossa del nemico, SEMPRE via
   `pushMoveNow→pushMove` → eredita il blocco INDAGATO/GAFFE). Usato in
   `switchTo`/`useItem`/`throwBall`/`tryRun` **e** `useCampaign` (prima 5 blocchi
   duplicati). Bug di coerenza regole chiuso.
3. **BOOST DECREMENTO** (`BattleScene.endBattle`): la carica si consuma SOLO dove
   il bonus si applica davvero (audit): **MANIFESTI/EXP** su ogni vittoria per KO
   (`"win"`, l'EXP arriva da ogni foe faint, wild inclusi); **SPOT/fondi** e
   **COMIZIO/SONDAGGI×2** solo su vittoria contro un **trainer** (il payout e il
   raddoppio sondaggi vivono nel ramo trainer di `afterFoeDown`). Niente cariche
   sprecate su tratti wild-heavy. NB: nel codice la mappatura reale è exp=tutte,
   money/sond=solo-trainer (verificato, non come dice la spec alla lettera).
4. **SOFT-CAP DANNO** (`sim.ts`): `DAMAGE_MULT_CAP=3.5` (export), clampa il `mult`
   finale prima del danno. Replicato **automaticamente** nel duello (duelsim usa
   `calcDamage`); sentinella aggiornata in `duelsim.ts`. Pacing invariato.
5. **GAFFE 100%→65%** (`moves.ts`): telepromessa/covfefe/memedoge da `chance:100`
   a `65` (in linea con citofonata/bunga 30 e con INDAGATO/SCANDALO 20-30).
6. **TYPE CHART VERDE→TECNO 2×** (`poltypes.ts`): aggiunto `VERDE:{TECNO:2,...}`.
   TECNO ora ha 2 attaccanti super (POPULISMO storico + VERDE); le altre relazioni
   VERDE (DESTRA/MEDIA 2×, POPULISMO 0.5×) intatte. POPULISMO lasciato com'era.
7. **TRIGGER OFFENSIVI ANNUNCIATI** (`sim.ts`+`BattleScene.ts`): `DamageResult`
   ora porta `offensive?: OffensiveTrigger[]` (maggioranza/opposizione/whatever/
   caimano/santino/agendarossa). BattleScene annuncia il primo trigger per specie
   in battaglia (`announcedOffensive` Set + `OFFENSIVE_TRIGGER_TEXT`), simmetrico
   ai difensivi (LODO/GILET/TEFLON) già parlanti.
8. **DIFFICOLTÀ PRE-STARTER** (`TitleScene.ts`): label `NORMALE (CONSIGLIATA)` +
   testo più chiaro sull'immutabilità ("NON si cambia dopo: e per tutta la
   partita"). Flusso invariato. Screenshot `artifacts/screens/r42-diff-{normal,hard}.png`.
9. **TIPI SPIEGATI** (`WorldScene.giveDex`): riga "I TIPI DECIDONO LE SFIDE: studia
   la GUIDA TIPI nel menu prima di ogni lotta" (la voce GUIDA TIPI esiste in PauseScene).

**Verifiche** (dev server :5179): typecheck+build puliti; sim-balance pacing
**3.27 turni invariato** (soft-cap tocca solo la coda estrema, GAFFE non cambia il
danno medio — before=after per costruzione dei pair alla pari); check-sim esteso
(cap 55, soft-cap, VERDE>TECNO, GAFFE 65) 28/28; check-duel (soft-cap ereditato +
e2e P2P completo, HP mirror OK) 24/24; check-daily 13/13; check-evolutions/
pixellab-coverage OK; **10 guardrail mappa** PASS; playtest **`check-r42-lotto1.mjs`
13/13** (cap 55 end-to-end, INDAGATO blocca su switch/item, boost money non
consumato su wild ma consumato su trainer, GAFFE 65, VERDE>TECNO reale, WHATEVER
annunciato, TitleScene CONSIGLIATA).

**NOTE per il LOTTO 2 (ACCESSIBILITÀ)**: qui va la **MIGRAZIONE UNICA v12→v13**
(chiave `politicmon-save-v13`, v12 in testa a `LEGACY_KEYS`, `reduceEffects:boolean=false`
+ eventuali campi money-sink del LOTTO 3 economia, tutti insieme, default difensivi
in `parseState`). Il LOTTO 1 NON ha toccato la forma del save.
**NOTE per il LOTTO 3 (ECONOMIA)**: col cap 55 MANIFESTI (+30% EXP) torna utile
fino a lv55 → valutare di renderlo disponibile PRIMA del post-garante. Il soft-cap
e il decremento boost corretto non toccano i rubinetti rematch/spot (quelli sono
economia pura del LOTTO 3).

### 🇪🇺 Round 41 — COMPLETO: consolidato dei 4 lotti (save v12)
Spec: `scratchpad/specs/r41-audits.md`. I 4 lotti sequenziali sono **tutti fatti e
pushati** su master (Vercel). Riepilogo:

1. **LOTTO 1 — QUALITÀ/TEST**: dex version-marking, `check-daily.mjs`, validazione
   `dailyQuestsDone`, clamp pos MP, abilità leggendari (WHATEVER IT TAKES /
   GARANZIA COSTITUZIONALE), hold item nei boss (tupla team a 4 elem), 2 pickup hold.
2. **LOTTO 2 — JUICE**: numeri di danno flottanti, ombre, screen-shake, freeze/flash
   KO, tint meteo, musiche offshore/duel, jingle distinti, SFX meccaniche, dialoghi juice.
3. **LOTTO 3 — END-GAME (save v12, MIGRAZIONE UNICA v11→v12)**: MODALITÀ DIFFICILE,
   COPPA DELLE POLTRONE (torneo), CAMPAGNA ELETTORALE (money-sink `kind:"boost"`).
4. **LOTTO 4 — NARRATIVO ELEZIONI UE** (commit `2fbf991`, questa sessione):
   - **Mappa `bruxelles`** (29 wide, `src/data/maps.ts`) + interno **`commissione`**:
     viale che sale al **Palazzo della Commissione** (marmo `M` 10x4, porte `DD`),
     bar **CAFFÈ SCHUMAN** (`bar-bruxelles`), cortili istituzionali (`f`+`,`), erba UE `~`.
   - **GATE**: traghetto dalle **boe est dell'OFFSHORE** (28,9)/(28,10) →
     `bruxelles` (14/15,13), `requiresFlag:"garante-beaten"` (end-game come offshore).
     **SHERPA UE** @offshore (25,10) annuncia la rotta (`setFlag:"hint-ue"`).
     `BAR_RESPAWN.bruxelles` + `MAP_ENTRY_HINTS.bruxelles` aggiunti.
   - **GAUNTLET** (`src/data/trainers.ts`): 4 trainer `eu-relatore`/`eu-eurodeputato`/
     `eu-commissario`/`eu-lobby` (lv 44-52, 1800-2300€) + **boss `commissione`**
     ("LA COMMISSIONE", lv 52-55, **5000€**, asso URSULAX col GILET PVE), **dentro
     l'interno `commissione`** (come garante nel COLLE). `commissione` ∈
     `BOSS_TRAINER_IDS` (musica `battle-boss` + IA boss). Vittoria → flag **`ue-beaten`**
     (in `WorldScene.startTrainerFight` callback, +10 sondaggi) + **TESSERA DORATA**
     una-tantum (`def.reward`, il boss si nasconde con `hideIfFlag:"ue-beaten"`).
   - **Contenuti**: wild UE lv 42-50 (`encounterRate:0.16`, roster
     macronfox/bojoon/zelenskir/ursulax/xipanda/putingrad/trumpon); **dexzone
     `bruxelles`** (7 specie, reward schedona×3+4000€); **DIRETTIVA MULTA UE**
     (`dirMulta`→`multaue`, TECNO) come pickup nascosto; **2 quest** `ue-rotta`
     (target offshore boe) + `ue-commissione` (target bruxelles palazzo) con freccia
     GUIDA; traccia musicale **`bruxelles`** in `audio.ts`. `wandererLevel` cappa già
     a 50 post-garante (nessuna modifica a encounters.ts necessaria).
   - **NESSUNA nuova migrazione save** (solo flag `garante-beaten`/`ue-beaten`/`hint-ue`).
   - **Verifiche**: typecheck+build puliti; **10 guardrail mappa** PASS (incluso
     `check-building-door-alignment` — il palazzo UE è un edificio reale 10x4 con
     porte, non decor); evolutions/sim/duel/daily/pixellab-coverage PASS; playtest
     **`check-r41-lotto4.mjs` 29/29** (gate pre/post garante, gauntlet+boss
     battibili end-to-end con `endBattle("win")`→`ue-beaten`, wild UE, dexzone,
     quest); screenshot `artifacts/screens/brux_{arrivo,viale,palazzo,boss}.png`.
   - **TRAPPOLE evitate**: righe ASCII a mano (mai slice, R34); larghezza costante 29
     `TT`+25+`TT` (EUROTOWN style, NON 30 come CAPITALE); ogni char-tetto (`M`/`x`)
     è trattato come edificio reale dal guardrail door-alignment → usati SOLO edifici
     con footprint PNG valido + porte (palazzo 10x4, bar), niente `x`/`M` decorativi.

### 🏆 Round 41 — LOTTO 3: END-GAME (3° di 4 lotti sequenziali) — save v12
Spec: `scratchpad/specs/r41-audits.md` sezione LOTTO 3. **MIGRAZIONE UNICA v11→v12**
(tutti i campi nuovi insieme, default difensivi, dati conservati, chiave v11
rimossa, `.bak` alla 2ª save). Chiave `politicmon-save-v12`, v11 in testa a
`LEGACY_KEYS`. 3 feature:

1. **MODALITÀ DIFFICILE** (`hardMode:boolean`, IMMUTABILE): scelta a inizio partita
   nel selettore DIFFICOLTÀ del `TitleScene` (NUOVA CAMPAGNA → NORMALE / MODALITÀ
   DIFFICILE, prima del nickname). Effetti: `hardModeLevelBonus` in `rematch.ts`
   (+3 lv ai trainer, +5 sui boss lv≥45, cap 60) applicato in
   `WorldScene.startTrainerBattle` (esclusa la SFIDA DEL GIORNO); **ONDA DEL
   CONSENSO disattivata** (`wave=1` in `BattleScene.foeFaintedSteps`); cooldown
   rivincita RADDOPPIATI (`rematchCooldown` in `rematch.ts`). Mostrato in PauseScene
   (tag `☠ HARD` sulla TESSERA). NB: il **tint meteo JUICE è indipendente** (legge
   `state.sondaggi`, non `wave`): verificato non si rompe.
2. **COPPA DELLE POLTRONE** (`src/game/tournament.ts` + `src/scenes/TournamentScene.ts`):
   torneo post-garante (BANDITORE @offshore 18,10, flag `garante-beaten`). Bracket
   8 = giocatore + 7 FANTASMI (versioni lv 50-55 di trainer noti). **SESSIONE
   SINGOLA, NON salvata** (se esci perdi il progresso del giorno — solo `coppaWins`
   e flag `coppa-vinta` persistono). Bracket deterministico dal giorno
   (`hashDate("coppa:"+day)` → shuffle seedato, ripetibile/stabile nel giorno).
   Il giocatore combatte i suoi round come `BattleScene` normale (via
   `startTrainerBattle`, id `coppa:*` mai in `defeatedTrainers`); gli **altri match
   sono risolti con `duelsim`** (RNG seedato mulberry32, AI ghost deterministica —
   il save NON è toccato). Flusso in `WorldScene.openTournament`/`runTournamentRound`/
   `awardTournament`. Premio: titolo permanente **PORTAVOCE DEL POPOLO** (mostrato
   in PauseScene) + una-tantum al 1° trionfo (TESSERA DORATA + 3000€). **TASSA
   d'iscrizione 1500€** (money-SINK).
3. **MONEY-SINK CAMPAGNA ELETTORALE** (nuovo `kind:"boost"` in `items.ts`): 3 item
   consumabili ripetibili, buff a tempo (contatore battaglie nel save, scala su
   vittoria in `BattleScene.endBattle`): **MANIFESTI OVUNQUE** 2000€ (+30% EXP, 10
   batt., `boostExpBattles`), **SPOT IN PRIME TIME** 3000€ (+50% fondi trainer, 10
   batt., `boostMoneyBattles`), **COMIZIO OCEANICO** 5000€ (×2 SONDAGGI su vittoria,
   8 batt., `boostSondBattles`). Usati dalla BORSA fuori battaglia (`BagScene.useBoostItem`);
   in vendita al DISCOUNT solo post-garante. Il NETTO è un SINK.

**Campi v12** (in `GameState`+`newGameState`+`parseState`): `hardMode:boolean=false`,
`coppaWins:number=0`, `boostExpBattles=0`, `boostMoneyBattles=0`, `boostSondBattles=0`.

**Verifiche** (dev server :5179): typecheck+build puliti; 10 guardrail mappa PASS
(banditore offshore valido); check-sim(16)/duel(24)/daily/evolutions/pixellab-coverage
PASS; sim-balance pacing base invariato (3.27, non tocco il danno); playtest
`check-r41-lotto3.mjs` 40/40 PASS (migrazione v11→v12, hardMode bonus, bracket
deterministico, duelsim risolve i fantasmi, torneo a 3 round → campione, boost);
integrazione `check-r41-coppa-flow.mjs` (banditore reale → tassa dedotta → bracket
creato). Screenshot `artifacts/screens/r41-difficulty.png`, `r41-coppa-bracket.png`,
`r41-campaign-boosts.png`.

**NOTE per il LOTTO 4 (NARRATIVO ELEZIONI UE)**: nessuna nuova migrazione save (v12
copre tutto). I FANTASMI del torneo riusano trainer esistenti — se aggiungi trainer
UE puoi eventualmente ampliare il pool `GHOSTS` in `tournament.ts`. Il gate coerente
per BRUXELLES può riusare `showIfFlag`/`requiresFlag` come il banditore. `duelsim`
resta la via per risolvere incontri NPC-vs-NPC senza toccare il save.

### 🧪 Round 41 — LOTTO 1: QUALITÀ + TEST (1° di 4 lotti sequenziali)
Spec: `scratchpad/specs/r41-audits.md` sezione LOTTO 1. NESSUNA migrazione save
(solo campi v11 esistenti). 7 punti, tutti fatti:

1. **DEX VERSION-MARKING** (`DexScene.ts`): importa `version.ts`; le esclusive
   dell'ALTRA fazione (non ottenibili nella `gameVersion(browserSeed)` corrente)
   hanno il tag azzurro **"SCAMBIO"** in lista + riga **"SOLO VIA SCAMBIO: N"** +
   nota "SOLO VIA SCAMBIO ONLINE" nel dettaglio. Screenshot `artifacts/screens/
   dex-scambio.png` (GOVERNO → contemorfo/vannaccix taggati; tajanide/calendauro no).
2. **check-daily.mjs** NUOVO (dev server :5179, pattern check-sim): 13 assert su
   dailyquests (bump→target paga 1 volta, reset, no-op fuori-pool, no doppio-pay
   post-done, "id:count"→"id:done"), streak (`prevDateKey` attorno DST 2026-03-29 +
   confini mese/anno), crisi (`hashDate("crisi:"+day)%3` ~33% su 90gg = 30/90, flag
   blocca doppio), version (speciesAvailable pari vs dispari). **FUORI dalla CI**
   (richiede dev server+localStorage, come check-sim/check-duel — CI resta statica).
3. **VALIDAZIONE dailyQuestsDone** (`state.ts` `parseState` + helper
   `isValidDailyQuestEntry`): scarta entry il cui suffisso dopo ":" non è "done" né
   intero 0..99999 (count gigante/negativo/non-numerico/malformato). Coerente con
   `parseEntry` in dailyquests.ts.
4. **CLAMP pos MP** (`mp.ts` `clampCoord` su posAction.onMessage): x/y clampati
   0..255 (difesa in profondità sul filo, NaN→0).
5. **ABILITÀ LEGGENDARI** (`abilities.ts` + `species.ts`): 2 nuove abilità —
   **WHATEVER IT TAKES** (draghimon: +25% danno sotto 1/3 PV, pura calcDamage →
   arriva anche in duello) e **GARANZIA COSTITUZIONALE** (mattarellux: immune a
   stat-drop E status, riusa gli hook poltrona+teflon). Riuso per gli altri: trumpon
   =maggioranza, xipanda=poltrona, bunkerput=lodo, marsrat=opposizione (capitanone
   aveva già caimano). Le nuove immunità replicate in `sim.ts` (whatever),
   `BattleScene.ts` E `duelsim.ts` (garanzia, 2 punti ciascuno). **Sentinella
   duelsim aggiornata**. +2 assert in check-sim.
6. **HOLD ITEM NEI BOSS** (solo PVE): `TrainerDef.team` tuple estesa con 4° elem
   `[id, lv, moveIds|undefined, heldItem]`; materializzato in
   `WorldScene.startTrainerBattle` (`mon.heldItem = ...`). Assegnati: garante/
   mattarellux→**gilet**, tycoon/trumpon→**sondtruccato**, ilcapitano/capitanone→
   **caffettiera**. L'effetto passa via `heldItemOf(foe)` in calcDamage/per-turno
   (endOfTurn gira per player E foe). Gli hold NON viaggiano sul filo PvP (invariato).
7. **2 PICKUP HOLD ITEM nascosti**: **gilet** @offshore(5,12), **caffettiera**
   @capitale/Caput Mundi(26,10). Su tile calpestabili (check-pickups PASS: 48 tot,
   19 nascosti).

**Verifiche** (dev server :5179): typecheck+build puliti; 10 guardrail mappa PASS;
check-evolutions/pixellab-coverage/sim(esteso, 16 PASS)/duel(24 PASS)/daily(nuovo,
13 PASS) PASS; playtest `check-r41-lotto1.mjs` 12/12 PASS (dex tag pari/dispari,
parseState scarta malformati, gilet del boss riduce danno 23→19, leggendari con
abilità). Screenshot dex-scambio.png + dex-detail-legend.png in artifacts/screens/.

**NOTE per i lotti successivi**:
- JUICE (audio/feel): dopo modifiche a sim/battaglia rigira sim-balance + check-duel;
  NON toccare la logica di danno (solo presentazione).
- END-GAME: la MIGRAZIONE v11→v12 (hardMode + campi torneo/campagna) va fatta QUI,
  tutta insieme. La tuple `team` del boss ora ha un 4° elemento hold item già pronto.
- NARRATIVO (UE): roster UE già esistente; abilità appena assegnate a trumpon/xipanda/
  bunkerput/marsrat sono parte del roster UE/mondiale.

### ✅ Verifica in-game Round 39-40 (giro completo end-to-end)
Playtest esaustivo su tutte le feature del ciclo (`scratchpad/verify-r3940.mjs`,
pattern guardrail via `window.stack`): **25/25 asserzioni PASS**. Dettaglio:
- **TECH**: save key `politicmon-save-v11`; migrazione v10→v11 (money conservato,
  chiave vecchia rimossa, campi a default); backup `.bak` scritto prima di ogni
  save; export/import codice (`exportSaveCode`/`importSaveCode`, round-trip ok);
  `browserSeed` inizializzato >0; `calcDamage` con RNG iniettabile (duelsim non
  duplica più il calcolo del danno).
- **GAMEPLAY**: 6 hold item + 2 field item (kind `hold`/`field`); 8 abilità su
  17 specie; repellente attivo; **gilet riduce davvero il danno (30→25)**;
  **sondaggi-meteo attivo** (mossa CENTRO: 24 con sondaggi≥85, 21 con ≤30).
- **RETENTION**: 3 trade-evolution (contemorfo/calendauro/tajanide);
  `dailyquests` (pool + bump + toast + status); streak via `prevDateKey` locale;
  versione GOVERNO≠OPPOSIZIONE con 4 specie esclusive (`speciesAvailable`
  filtra per `browserSeed`).
- **UX/CONTENUTI**: minimappa "MAPPA DELL'ITALIETTA" render OK (nodi, "SEI QUI",
  aree gated "???"); linea VERDE verdolino→ecoverdon (tipo VERDE); mattarellux
  lv49 catturabile post-garante al colle; 6/6 ministeri con `malus`; icone item
  in borsa (verifica visiva).
- **FLASH FIX**: 39 sprite mostro PNG tutti `ready` dopo il preload → niente più
  lampeggio del pixmap "vecchio design" alla prima battaglia/Dex.
- **MULTIPLAYER (rete P2P reale)**: `check-duel.mjs` PASS — record duelWins/
  duelLosses sincronizzato tra i due peer, save intatto durante il duello;
  `shot-trade.mjs` PASS — scambio 1:1 end-to-end.
Screenshot in `scratchpad/verify/` (minimap2.png, bag2.png). Unico rumore: un
`undefined.draw` nel test isolato della minimappa (artefatto del test, zero
errori con lo stack di gioco reale — confermato).

### 🗺️ Round 40 — LOTTO UX/CONTENUTI (4/4, chiude il ciclo)
Spec: r39-audits sezioni UX + CONTENUTI EXTRA. Nessuna nuova migrazione save.

- **MINIMAPPA** (`src/scenes/WorldMapScene.ts`, voce MAPPA nel menu pausa):
  grafo a nodi "MAPPA DELL'ITALIETTA", coordinate hardcoded a 240x180, nodo
  corrente evidenziato/lampeggiante ("SEI QUI"), aree gated non ancora sbloccate
  mostrate come "???" (derivate da badges/flag: stretto=3 badge, colle=boss-beaten,
  offshore=garante-beaten — nessun nuovo campo save).
- **HINT GOVERNO**: alla 1ª medaglia si spiega il GOVERNO OMBRA (menu→GOVERNO,
  6 ministeri, bonus); riga guida alla prima apertura di GovScene. Pattern flag hint-*.
- **MINISTERI CON DOWNSIDE**: ogni ministero ora ha un `malus` mostrato in GovScene
  (netto positivo ma scelta reale su chi nominare). Testi in governo.ts/GovScene.
- **CRISI DI GOVERNO** (`maybeGovernmentCrisis` in WorldScene, `governo.ts`):
  una-tantum alla 2ª medaglia (flag `crisi-governo-1`), ripetibile raro post-game
  a Caput Mundi (~1 giorno su 3, `hashDate`, flag `crisi-gov-day:<data>`). Scelta
  SECCA senza stato nuovo: SOSTIENI (sondaggi -8) vs SCARICA il ministro
  (sondaggi +5, libera un incarico riassegnabile).
- **INDICATORE REMOTI + ISPEZIONA**: doppia freccia blu sopra l'avatar online
  adiacente; menu remoto ora ISPEZIONA/SCAMBIA/SFIDA/ANNULLA; `partyPreview`
  (max 6 speciesId, validati contro SPECIES in mp.ts upsert) nel Profile broadcast
  → popup "SQUADRA DI <nick>" + record duelli.
- **LINEA VERDE**: nuove specie VERDOLINO (dex 38) → ECOVERDON (dex 39, lv 18),
  ability `galleggiamento`, satira attivismo climatico. Sprite PixelLab in
  `public/sprites/monsters/` + fallback caricature in `art/monsters.ts` (richiesto
  dalla pipeline evoluzioni). Negli encounter di route2/route3 + dexzone.
- **MATTARELLUX catturabile**: encore leggendario al colle post-garante (NPC
  `mattarellux-legend` lv 49, flag `legend-mattarellux-gone`, pattern berlusconix).
  Prima era nel dex ma di fatto irraggiungibile.

⚠️ TRAPPOLA (fix incluso): gli eventi "d'ingresso mappa" (hint one-shot + CRISI)
scattano SOLO al primo frame idle dopo `loadMap` E con `input.heldDirection()===null`
(flag `justEnteredMap`). Prima giravano a ogni frame fermo: stare sulla porta prima
di un warp faceva scattare la crisi al posto del passo (guardrail world-layout).
❌ RESTA: icone PNG per gli 8 item nuovi del lotto GAMEPLAY (fallback: fuori da
ITEMS_WITH_PNG, non bloccante).

### 🔁 Round 39 — LOTTO RETENTION (3/4)
Spec: r39-audits sezione RETENTION. Nessuna nuova migrazione save (usa i campi v11).

- **STREAK DAILY**: alla vittoria della SFIDA DEL GIORNO `dailyStreak` +1 se
  `lastDailyDate` era ieri (`prevDateKey` in daily.ts, componenti locali — mai
  aritmetica in ms), altrimenti 1. Bonus +100€/giorno (cap 500€). Streak mostrata
  nel dialogo OPINIONISTA (anche a premio già ritirato).
- **MOSTRO DEL GIORNO**: `dailyBoostSpeciesId(mapId, entries)` in daily.ts
  (hashDate su data+mappa, deterministico, zero stato salvato); weight x4
  (`DAILY_BOOST_MULT`) nella tabella incontri di WorldScene; banner
  "AVVISTAMENTI! OGGI TANTI X!" al primo ingresso zona del giorno (flag di sessione).
- **MISSIONI GIORNALIERE** (`src/game/dailyquests.ts`): pool di 6, 3/giorno
  deterministiche (hashDate + sonda lineare); progresso in `dailyQuestsDone`
  con formato **"id:count"** in corso e **"id:done"** a completamento; reset se
  `lastDailyQuestDate != oggi`. Reward 150-300€ + toast (coda `consumeDailyToast`
  drenata in WorldScene.update). Hook: vittoria/cattura (onBattleEnd), passi
  (onStepComplete), slot (CasinoScene), scambio (TradeScene), duello
  (recordDuelResult), item in lotta (BattleScene). UI: sezione DEL GIORNO in QuestScene.
- **RECORD DUELLI** (`src/game/duelrecord.ts`): `PvpBattleScene.onEnd(result)`
  consegna l'esito locale a duello CHIUSO; `recordDuelResult` scrive
  duelWins/duelLosses+save SOLO al ritorno al mondo (invariante C9 raffinato).
  `mp.setDuelWins` nel Profile broadcast (validato 0..99999 in ricezione),
  targhetta ★N sopra l'avatar remoto, "PORTAVOCE" a 10+ vittorie; record anche
  in PauseScene. `check-duel.mjs`: snapshot normalizzato (ignora SOLO
  duelWins/duelLosses/dailyQuestsDone/lastDailyQuestDate/money e chiavi .bak)
  + assert 4b su record e broadcast — tutto PASS su rete P2P reale.
- **EVOLUZIONE DA SCAMBIO**: `EvolutionRule.trade` + `tradeEvolution()` in
  monster.ts. Coppie ("cambio di casacca"): contemorfo→conteblob,
  calendauro→calendrone, tajanide→tajacolomba. TradeScene post-commit →
  EvolutionScene; il target evoluto segue il pattern dex-trade C10 (dex globale
  sì, gate di zona no).
- **VERSIONE ESCLUSIVA** (`src/game/version.ts`): browserSeed pari=GOVERNO,
  dispari=OPPOSIZIONE (etichetta in PauseScene). Split wild: tajanide+calendauro
  solo GOVERNO, contemorfo+vannaccix solo OPPOSIZIONE (filtro
  `effectiveEncounters` in WorldScene, `speciesAvailable`). `zoneProgress`
  accetta browserSeed: il gate di zona esclude le specie dell'altra versione
  (100% raggiungibile sul campo); dex globale completabile solo scambiando.
  NPC SONDAGGISTA a Borgo (13,17) spiega le versioni con testo dinamico.
- **EMOTE**: +6 in ChatScene (▼ GIÙ, GG, OK, NO, € RICCO, !! WOW), griglia
  2 righe; bolla nel mondo adattata a 2 caratteri (mp.ts tronca già a 2).

Verifiche: typecheck+build, 10 guardrail mappa, check-sim, check-duel (24 PASS
incl. nuovi 4b), playtest mirato retention (34 assert PASS), playtest.mjs.
Non coperto (per il lotto UX): hint/discoverability delle missioni fuori dalla
QuestScene, ISPEZIONA/partyPreview, minimappa, indicatore remoti.

### 🎮 Round 39 — LOTTO GAMEPLAY (2/4)
Spec: r39-audits sezione GAMEPLAY. Fatto in questo lotto:

- **HOLD ITEM** (kind `"hold"`, 1 slot `Monster.heldItem`): GILET ANTIPROIETTILE
  (-15% danno subito), TELECAMERA (previene GAFFE), SONDAGGIO TRUCCATO (crit 1/8),
  CAFFETTIERA (cura 1/16 a fine turno), AGENDA ROSSA (+10% speciali), SANTINO
  ELETTORALE (+10% fisiche). Equip da BagScene (swap con conferma SÌ/NO),
  visibile/rimovibile nel dettaglio PartyScene (START toglie → torna in borsa).
  Effetti danno in `sim.ts::calcDamage` (`heldItemOf` con parse difensivo: id
  sconosciuto → rimosso), cura/prevenzione in BattleScene. In vendita al DISCOUNT
  (1200-2500€) + 2 pickup nascosti (route2 santino, route3 agendarossa).
  **v1: heldItem NON passa sul filo** (trade/duello: i mon ricostruiti da
  {speciesId,level,moves} non lo hanno — verificato, nessun effetto nel PvP).
- **SONDAGGI COME METEO**: `calcDamage(..., ctx?: {sondaggi})`, default NEUTRO.
  Divisione (documentata in sim.ts): establishment = ISTITUZIONE/TECNO/CENTRO/MEDIA,
  anti-establishment = POPULISMO/DESTRA/SINISTRA/VERDE. Sondaggi ≥70 → +15% alle
  mosse establishment; ≤40 → +15% anti. Solo PVE (BattleScene passa il ctx; il
  duello NO, dichiarato nella sentinella duelsim). Banner a inizio battaglia
  ("IL VENTO POLITICO SOFFIA A FAVORE DEL GOVERNO/DELL'OPPOSIZIONE").
- **ABILITÀ PASSIVE** (`Species.ability` + registry `src/data/abilities.ts`, 8):
  POLTRONA SALDA (tajanide/tajacolomba), TEFLON (contemorfo/conteblob),
  MAGGIORANZA (giorgiagon/movimenton), OPPOSIZIONE (schleinix/vaffenix),
  GALLEGGIAMENTO (mediocrate/telecrate), VOLTAGABBANA (renzino/renzilla, +1 SPD
  applicato in `makeCombatant` = ogni ingresso), LODO (berlusconix, flag
  `Combatant.firstHitTaken`), CAIMANO (capitanone/putingrad). Danno in calcDamage
  (vale AUTO nel duello); TEFLON/POLTRONA/GALLEGGIAMENTO replicate in duelsim
  (sentinella aggiornata). Mostrate in PartyScene (riga ABILITÀ/OGGETTO al posto
  della dexLine) e DexScene (nome+descrizione).
- **SPRAY ANTI-COMIZIO + TESSERA RIMBORSO SPESE** (kind `"field"`, 400€/600€):
  spray → `repellentSteps=150`, decrementato in `onStepComplete`, sopprime SOLO
  i wild (vaganti/trainer passano), messaggio a esaurimento; tessera → teleport
  a `BAR_RESPAWN[state.lastBar]` da BagScene (pop borsa+pausa; **WorldScene.update
  ora riconcilia mappa** se `state.pos.mapId` cambia sotto i menu). In battaglia
  entrambi rifiutati da `useItem` (che ora respinge anche hold/tm/key invece di
  consumarli nel ramo cura — bug pre-esistente).
- **Bilanciamento** (sim-balance, seed fisso): prima 3.3-3.4 turni / WR 58.5%;
  dopo **3.19-3.38 turni (media 3.30) / WR 55.4%** — dentro il vincolo ~3-6,
  /58 NON toccato (scelta deliberata). check-sim esteso (hold/abilità/meteo),
  nuovo **check-r39-gameplay.mjs** (e2e: equip via UI, spray 150 passi senza
  wild + contro-prova, tessera teleport). check-duel PASS invariato (C9 incluso).
  DEV: `main.ts` espone anche `window.__input` (i test riusano l'input reale).
- Nota RNG: il fattore random 0.88-1.0 del danno ora usa la `rng` iniettata
  (prima Math.random fisso: nel duello il danno host non era deterministico al 100%).

Mancanze/note per RETENTION e UX: hold item senza PNG (esclusi da ITEMS_WITH_PNG
in art/items.ts: rigenerare icone PixelLab); abilità non mostrate nel duello
(nessun messaggio lato guest, solo effetti via eventi); telecamera/caffettiera
utili solo PVE finché heldItem non passa sul filo; possibile hint/NPC che spieghi
hold item e vento politico (discoverability).

### 🔧 Round 39 — LOTTO TECH (1/4: TECH → GAMEPLAY → RETENTION → UX/CONTENUTI)
Spec: audit 4 dimensioni approvati dall'utente (r39-audits). Fatto in questo lotto:

- **Save v11** (`politicmon-save-v11`, v10 in LEGACY_KEYS): campi nuovi con default
  e parse difensivo — `repellentSteps`, `dailyStreak`, `duelWins/duelLosses`,
  `dailyQuestsDone`, `lastDailyQuestDate`, `browserSeed` (0 = non inizializzato →
  generato 1..2^31-1 e persistito al primo load/newGame; pari/dispari = versione A/B).
  `Monster.heldItem?: string` opzionale (sanificato in parseState). I lotti successivi
  USANO questi campi: qui sono solo introdotti.
- **Save robustezza**: `saveGame` scrive prima `politicmon-save-v11.bak` (valore
  precedente valido); `loadGame` recupera dal .bak se il primario non parsa.
  Export/import: `exportSaveCode`/`importSaveCode` (btoa di encodeURIComponent(JSON));
  UI in menu pausa → OPZIONI → **BACKUP** (`src/scenes/BackupScene.ts`, overlay HTML
  per copia con fallback clipboard e incolla; import = conferma + reload).
- **RNG unificata**: `sim.ts::calcDamage(..., rng = Math.random)` retro-compatibile;
  `duelsim.ts` usa il VERO calcDamage (calcDamageRng CANCELLATO, sentinella aggiornata:
  ora solo la semantica di TURNO va replicata a mano, il danno no).
- **sim-balance.mjs riscritto**: importa il vero sim.ts via dev server+Playwright
  (pattern check-duel), Math.random rimpiazzato da mulberry32 seed fisso (deterministico).
  ⚠️ NUMERI VERI: **~3.3-3.4 turni** medi a parità di livello (lv10/20/30), win-rate
  giocatore a pari livello 58.5%. FUORI dal target 5-8 della vecchia memoria, ma il
  divisore /58 era una scelta deliberata ("le lotte sembravano lunghissime") e la
  vecchia copia /70 misurava una formula morta. NESSUN ritocco applicato: decidere
  nel lotto GAMEPLAY se ritoccare (che tanto rigira sim-balance dopo hold/abilità).
- **check-sim.mjs nuovo** (guardrail runtime, dev server richiesto): danno con RNG
  fissa in range, determinismo, catchChance 1HP+status ≥0.9, soglie bumpSondaggi.
- **CI** (`.github/workflows/ci.yml`): push/PR master → node 22, npm ci, typecheck,
  build, check-evolutions (unico check-* statico; tutti gli altri richiedono Playwright
  + dev server e restano locali).
- **Relay Nostr verificati** (P8): trystero 0.25 usa pool di ~46 relay di default con
  redundancy 5 → ridondanza ok, mp.ts NON toccato (TURN env già supportate).

Mancanze/note per i lotti successivi: heldItem non passa sul filo trade/duello (v1);
duelWins/duelLosses vanno scritti SOLO a duello chiuso e check-duel C9 andrà raffinato
quando il lotto RETENTION li popola; bilanciamento fuori target segnalato sopra.

### 🏝️ Round 38 — longevità: route mancanti, rematch, post-game, daily, trade+PvP
Feedback utente: "il gioco non è longevo" → fatti TUTTI e 4 i punti in un ciclo solo
(design multi-agente → 3 lotti implementativi → review avversariale → 7 bug fixati).

**Route vere tra le città** (prima edge diretti):
- `route2` PERCORSO 2 (Mediopoli↔Eurotown, wild/trainer lv 12-15, LAGHETTO DELL'AUDITEL
  con isoletta-tesoro solo-traghetto) e `route3` PERCORSO 3 (Eurotown↔Capitale, lv 16-19,
  checkpoint) + `grotta2` ARCHIVIO DI STATO (pattern grotta1). Gate medaglie conservati
  LATO CITTÀ (mediopoli.north requiresBadges:1, eurotown.north:2). 7 TrainerDef nuovi.
  `northChain` della freccia GUIDA ora include le route.

**Rematch allenatori** (`src/game/rematch.ts`): trainer normali ribattibili dopo 400
passi (`stepsTotal`/`trainerRematch` nuovi in GameState), capipalestra SOLO post-garante
con cooldown 1500 passi e team fissi lv 50-55. Payout rematch 60%, badge/reward SEMPRE
strippati (niente medaglie/schedone duplicate). "!" dorato sui rematch pronti;
`interactNpc` chiede RIVINCITA via `askYesNo`.

**Post-game** (flag `garante-beaten`): mappa `offshore` PARADISO OFFSHORE (isola via
traghetto dalle boe dello stretto, wild lv 38-45, bar LIDO CAYMAN + respawn), boss
TESORIERE lv 46-50 (in `BOSS_TRAINER_IDS` → musica e IA boss), encore BERLUSCONIX
catturabile al casinò se manca al dex, contabile-pentito che svela l'isola, 2 quest
main + 1 side, dexzone offshore, wanderer cap post-garante 50.

**Sfida giornaliera** (`src/game/daily.ts`): OPINIONISTA PERPETUA a Caput Mundi, team
deterministico dal giorno (seed=data locale YYYY-MM-DD, mai toISOString) scalato a
maxParty+2, 1 vittoria/giorno (`lastDailyDate`, solo su win), 500€ + item comune a
rotazione; BREAKING NEWS all'ingresso in capitale se disponibile. TrainerId `daily:*`
mai in `defeatedTrainers`.

**Multiplayer trade + duello PvP** (P2P Trystero, actions "trade"/"duel" con send
mirato al peer): menu SCAMBIA/SFIDA sull'avatar remoto adiacente + DUELLO PVP nel menu
pausa. Scambio 1:1 con anti-cheat (sul filo solo {speciesId,level,moves}; ricostruzione
locale con `createMonster`, mai stats dal filo) e commit a due fasi anti-dupe
(done/done con seq). Duello host-autoritativo (l'host simula con `duelsim.ts`, il guest
applica il log eventi SANITIZZATO — `sanitizeTurnlog`): no cattura/oggetti/fuga, resa,
timeout 30s, **il duello non tocca MAI il save** (asserito da `check-duel.mjs`).
Dex da scambio = caught ma flag `dex-trade:<id>` lo esclude dai premi di zona.

**Save v9→v10**: `stepsTotal`, `trainerRematch`, `lastDailyDate` (migrazione in
state.ts, v9 in LEGACY_KEYS).

**Refactor**: presentazione battaglia estratta in `src/game/battle/view.ts` (~420
righe, usata da BattleScene e PvpBattleScene).

⚠️ TRAPPOLE NUOVE:
- **`duelsim.ts` DUPLICA la semantica di `sim.ts`** (danno/crit/status): ogni ritocco
  di bilanciamento PVE va replicato lì (sentinella in testa al file).
- `legalMoveForSpecies` (duelproto/trade) accetta le mosse ereditate dalle
  PRE-EVOLUZIONI risalendo `SPECIES[].evolutions` — non irrigidirlo o gli starter
  evoluti tornano "SQUADRA NON VALIDA".
- Negli script Playwright usare `window.__mp`, MAI `import("/src/net/mp.ts")` (l'HMR
  di Vite crea una seconda istanza del singleton).
- `askYesNo` di WorldScene condivide `askLabel` col transportMenu (stati mutuamente
  esclusivi); `mp.duelBusy` copre PVE, TradeScene, DuelLobby e PvpBattleScene.
- BOSS_TRAINER_IDS guida anche l'IA (whiff/heal/finisher), non solo la musica.

Guardrail nuovi: `check-duel.mjs` (e2e 2 pagine, HP speculari, C9 save intatto,
assert anti-cheat/pre-evo; SKIP se relay giù) e `shot-trade.mjs`.
Verifiche: typecheck+build, 12 guardrail PASS, coverage 162/162, migrazione v9→v10
testata, review avversariale (5 dimensioni × 3 lenti): 7 bug trovati e fixati.

MANCANZE NOTE: rematch gym con musica/IA da trainer normale (badge strippato — la
difficoltà è nei livelli); contatore `duelWins` e emote in duello rimandati; dupe da
restore-backup di localStorage = limite P2P accettato; host del duello può barare
(nessun premio in palio).

### 🚪 Round 37 — ingresso dritto sulla porta + fine rettangoli neri interni
Feedback utente: "non entri camminando dritto sulla porta ma spostato a lato; dentro
esci male e si vedono rettangoli neri".

Cause radice trovate:
1. **Porta visiva al CENTRO dello sprite, footprint a larghezza PARI** → la porta
   disegnata cavalca i DUE tile centrali (w/2-1|w/2), ma il tile `d`+warp era solo
   quello di destra (offset 2). Camminando dritti sulla porta visiva si finiva sul
   tile sinistro = muro. (Il PALAZZO con porte `DD` su 4|5 funzionava già: era il
   pattern giusto.)
2. **Tile `c` (zerbino uscita) senza PNG** → il renderer world è solo-PNG (nessun
   fallback pixmap): `c` restava NERO in tutti gli interni. Idem `^` (scogliera) e
   `l` (scala) sullo Stretto.

FATTO R37:
- **Porta a 2 tile centrali su TUTTI gli edifici**: facciate `mndm`→`mddm`,
  `mmdnmm`→`mmddmm`, `mnd^`→`mdd^` + 22 warp duplicati (uno per tile-porta, stesso
  interno). Convenzione codificata in `centralDoorTiles(w)` (`src/art/tiles.ts`);
  `BUILDING_DOOR_OFFSET` rimosso. La soglia `=` davanti alla porta è ridisegnata
  sotto OGNI tile-porta (`WorldScene.drawThreshold` scansiona la riga-facciata).
- **Nuovi PNG PixelLab**: `tiles/doormat.png` (zerbino rosso su parquet),
  `tiles/cliff_sand.png` (masso arenaria), `tiles/stairs_sand.png` (scala) —
  generati con `create_map_object` 32x32 → composito su base (floor_wood/sand) →
  resize NN 16x16. Mappati in TILE_PNG (`c`/`^`/`l`) + preload + manifest (162/162).
  NB grotta1 continua a sovrascrivere `c` con roccia via `tileOverrides`.
- **Guardrail aggiornati** al pattern 2-tile: `check-building-door-alignment`
  (porte = esattamente i 2 tile centrali, ognuna con warp + `=` davanti),
  `check-door-warps`, `check-world-layout`, `check-map-consistency` (ritorno
  dall'interno accettato davanti a UNO dei due tile-porta).
- Verifiche: playtest Playwright (ingresso dritto dal tile sinistro → entra; interno
  senza neri; uscita davanti alla porta), tutti i guardrail PASS, typecheck+build
  puliti, coverage 162/162.
- **TRAPPOLA**: `create_map_object` con prompt "texture che riempie il canvas" può
  restituire un PNG VUOTO (83 byte). Descriverlo come OGGETTO ("massive square slab
  of...") funziona. Controllare sempre la size del file scaricato.

### 🎯 Round 36 — loop edifici fino a top-down coerente (ingresso da sentiero)
Feedback utente: "ritenta finche TUTTO e coerente con l'ingresso da sentiero". Diversi
edifici (lab/palace/bar/apartment/casino/gym) erano ancora 3/4 (base a rombo → porta
che pareva in diagonale).

FATTO R36:
- **Rigenerati i 6 edifici 3/4 finche top-down puri**, ispezionati a vista uno per uno.
  Prompt vincente (dopo vari tentativi): per i piccoli "simple symmetric triangular
  gable / flat rectangle roof seen straight from ABOVE, door at the very bottom"; per i
  LARGHI (palace/gym) la chiave e stata "**a wide building roof seen PERFECTLY FROM
  ABOVE like from a HELICOPTER, the image is almost ENTIRELY the flat rooftop, the door
  is just a small NOTCH at the bottom edge, ZERO depth**". Quest'ultima ha finalmente
  reso flat anche palazzo e palestra (i piu ostici).
- Ora TUTTI i 14 edifici sono top-down con porta in basso al centro verso il sentiero.
  Niente piu rombi/ingresso da vertice.
- **REGOLA CHIAVE PixelLab** (aggiorna la trappola): `view:"high top-down"` da solo NON
  basta; serve descrivere l'immagine come "quasi interamente il TETTO visto dall'alto,
  porta = tacca in basso". I building LARGHI scivolano al 3/4 piu dei piccoli → per
  quelli insistere sul "helicopter view, zero depth". Generare a canvas quadrato/largo
  e resize NN alla footprint (`scratchpad/fetch-*.ps1`). Ispezionare OGNI sprite.
- Verifiche: door-alignment + sprite-bounds + tutti i guardrail mappa PASS; build pulito;
  coverage 159/159; render full-map di tutte le 4 citta conferma coerenza.

### 🏙️ Round 35 — edifici TOP-DOWN 2D + insegne + piazze interattive

### 🏙️ Round 35 — edifici top-down 2D, insegne, fontane/statue esaminabili
Feedback utente: "edifici rifalli tutti TOP-DOWN 2D (alcuni non lo sono), il bar e gli
altri devono avere un'INSEGNA, le piazze devono avere FONTANE e oggetti interattivi".

FATTO R35:
- **TUTTI i 14 edifici rigenerati TOP-DOWN 2D** (PixelLab `view:"high top-down"` — il
  vero fix: si vede il TETTO dall'alto + striscia di facciata con porta in basso, stile
  Pokémon GBA overworld). I round precedenti usavano `view:"side"` = facciata frontale
  piatta (ancora con labbro prospettico). Ora niente più 3/4 (eccetto il PALAZZO 160px,
  che resta semi-3/4 ma monumentale — i building larghi resistono al top-down).
- **INSEGNE leggibili** nei prompt: BAR, PALESTRA, CASINO, LAB, CIRCOLO, EDICOLA,
  STUDIO TV, TRATTORIA, PALAZZO. (PixelLab rende il testo in modo approssimativo ma
  riconoscibile.)
- **OGGETTI PIAZZA interattivi**: nuovi asset PixelLab `obj_fountain.png` (W),
  `obj_statue.png` (Y), `obj_bench.png` (U). Cablati come tile overlay solidi
  (OBJECT_PNG + TILES + preload + WORLD_OBJECT_TARGET_PX) + nuovo sistema
  **`DecorativeDef`** (`maps.ts`): char nella mappa + array `decoratives:[{x,y,lines}]`
  → testo satirico premendo A. Handler in `WorldScene.interact` dopo il check cartelli.
  Fontana+statua/panchina piazzate in borgo/mediopoli/eurotown/capitale con battute.
- **TRAPPOLA PixelLab confermata**: `high top-down` funziona su canvas QUADRATO (64x64,
  96x96); su canvas largo (64x48/96x48) scivola al 3/4. Soluzione: generare a 64x64
  quadrato e poi resize NN alla footprint reale (`scratchpad/fetch-td.ps1`). Verifica
  ogni sprite A VISTA (l'agente non vede le immagini nel batch cieco).
- **Helper validazione**: `scratchpad/checkdeco.mjs` verifica che ogni coord in
  `decoratives` cada su un tile W/Y/U (le coord a mano sbagliano spesso di ±1).
- Verifiche: typecheck+build puliti; tutti i guardrail mappa PASS; coverage 159/159
  (3 oggetti nuovi tracciati); render full-map di tutte le città.

### 🛣️ Round 34 — layout città: rete di strade fino a ogni porta

### 🛣️ Round 34 — layout città: rete di strade fino a ogni porta
Feedback utente: "non è vero che sono messi bene rispetto al sentiero". Visto le
MAPPE INTERE (`scratchpad/shot-buildingmaps.mjs` = render full-map senza HUD/player,
fedele all'anchoring building): gli sprite flat-front R33 erano ok, ma il LAYOUT delle
città era debole — sentiero a stub sottili, edifici negli angoli scollegati dalla strada.

FATTO R34:
- **Ridisegnato l'ASCII di borgo/mediopoli/eurotown/capitale**: rete di strade `=`
  (spina centrale + avenue orizzontali) che porta DIRITTA davanti a OGNI porta, edifici
  flush, niente buchi d'erba tra base e strada. Stile piazza Pokémon.
- **VINCOLO RISPETTATO**: posizioni edifici/porte INVARIATE (i warp dipendono dalle
  coord esatte). Cambiati SOLO i tile-terreno (`.`/`=`/`~`) attorno. Door-front sempre `=`.
- **Trappola imparata**: editare l'ASCII a mano riga-per-riga è error-prone (drift di
  riga/colonna, char invalidi, footprint edificio rotta). Workflow sicuro: NON toccare
  le righe-edificio né il conteggio righe; validare DOPO OGNI edit con
  `check-map-consistency` + `check-building-door-alignment` (controllano lunghezza riga
  30, door-front `=`, warp sulla porta). Helper `scratchpad/doors.mjs` stampa
  roof/footprint/door/front per ogni edificio = ground truth per il redesign.
- Verificato: tutti gli 8 guardrail mappa PASS; render full-map di tutte e 4 le città
  mostra ogni porta collegata; typecheck+build puliti.

### 🏠 Round 33 — edifici flat-front orto (fine del mismatch 3/4)

### 🏠 Round 33 — edifici flat-front orto (fine del mismatch 3/4)
Feedback utente: "zerbino orrendo sposizionato, gli edifici vanno rifatti".
Problema radice (R17/R30): edifici PixelLab 3/4 isometrici su terreno top-down piatto
→ basi che galleggiano, soglie staccate. Lo zerbino R31 peggiorava → RIMOSSO.

FATTO R33:
- **Rimosso overlay zerbino** (door_step) da WorldScene/preload/manifest + PNG.
- **TUTTI i 14 edifici rigenerati flat-front** in PixelLab (facciata 2D dritta, base
  appoggiata sulla griglia, porta in basso allineata al tile calpestabile): 4 case
  (rosso/blu/verde/brick), lab, bar, gym, casino, palazzo, circolo, apartment, kiosk,
  studio, bistro. Stessi filename, stesse dimensioni (la door-alignment guardrail le
  vincola: 64x48 case/lab, 64x32 bar/minori, 96x48 gym/casino, 160x96 palazzo).
- **TRAPPOLA PixelLab confermata**: anche con view:"side" scivola al 3/4 ~40% delle
  volte. Prompt vincente: "FLAT 2D elevation, paper cutout standing upright, ONLY front
  wall, NO side walls, NO roof top surface, roof = thin horizontal band, you do NOT see
  the top". Loop genera→ispeziona→scarta i 3/4→rigenera. Ho ispezionato ogni sprite
  visivamente prima di tenerlo (l'agente NON puo fidarsi del batch cieco).
- **Pipeline integrazione**: download object → trim bordo trasparente → resize NN a
  dimensione target esatta (`scratchpad/fetch-all.ps1`). NB il trim+stretch puo
  distorcere leggermente gli aspect molto diversi (es. apartment): se un edificio
  sembra schiacciato, rigenerare con aspect piu vicino al target.
- Verificato in-game (borgo/mediopoli/eurotown/capitale): basi piatte, porte allineate,
  player davanti corretto, z-order ok. Guardrail door-alignment/world-layout/sprite-bounds
  PASS; typecheck+build puliti; coverage 156/156.

❌ RESTA (rifinitura): lieve "labbro" prospettico sul bordo-tetto di alcuni edifici
larghi (gym/casino); le case sono pulite. Se si vuole il flat perfetto, rigenerare i
2-3 larghi con altri seed. Gli NPC/personaggi restano leggermente frontali (non 3/4
puro) ma erano gia coerenti col nuovo look flat.

### 🔬 Round 32 — audit multi-agente verificato avversarialmente
Workflow ultracode: 6 reviewer specialisti (combat/economy/level/art/ux/narrative) →
verifica avversariale 3-lenti (voto maggioranza) → sintesi. Combat/art/narrative = 0
problemi (puliti). Economy 7, Level 12, UX 9. Verificati a mano i top per severità.

FATTO R32:
- **P0 GAMBLING +EV (money infinito)**: SLOT del consenso aveva EV ~1.49× (coppia
  pagava 2×) e la SCOMMESSA MAFIA EV ~1.45× (40/25/35). Entrambi stampavano soldi
  all'infinito. Ribilanciati a EV ~0.97-0.99 (banco vince di poco, verificato con
  simulazione 2M giri): SLOT coppia 2×→1× e V-tris 12→10 (EV 0.994); MAFIA prob
  25/22/53 (EV 0.970). `CasinoScene.ts`, `MafiaScene.ts`.
- **P2 economia/soft-lock**:
  - **Penalità sconfitta** cap 250€→600€ (a metà gioco 250 = 3-8% irrilevante). `WorldScene.ts`.
  - **CAPUT MUNDI senza negozio**: aggiunto NPC AMBULANTE (`shop:true`, @14,14) — era
    l'unica città grande senza rifornimento prima di palazzo/colle. `maps.ts`.
  - **OBLAST DEL MEME soft-lock**: zona cieca senza cura né respawn (KO vs leggendario
    lv10 → risveglio a Borgo). Aggiunto MEDICO DA CAMPO (`healer:true`, @5,13). `maps.ts`.
  - **MIN. SALUTE** buff scalante (~3% max HP/tick invece di 1 PV flat): era morto nel
    tardo gioco. `governo.ts`.
  - **TESSERA DORATA** sovra-offerta: rimossa dal mercato nero mafia (1400€, duplicato
    del negozio a 3000€). Restano negozio + loot raro 3% + quest. `MafiaScene.ts`.
- **P2 pacing encounter**: curva sistemata (town < route ≈ grotta ≤ città): Borgo
  0.18→0.10, route1 0.16→0.14, grotta1 0.22→0.16, oblast 0.18→0.14. Prima la città
  tutorial interrompeva PIÙ della route (al contrario). `maps.ts` + doc CLAUDE.md
  riallineata (era 0.10-0.11 / vaganti 0.045 / eventi morale attivi — tutto stale).
- **P3 UX**: sondDelta float usciva sopra il bordo (clamp y≥2); TransportMenu poteva
  renderizzare a y<0 (clamp); ChatScene B-key ambiguo (hint chiaro "B: cancella
  START: esci") + ultima riga tastiera riempita (era 5 tasti = 2/3 zona morta al touch).
  `WorldScene.ts`, `ChatScene.ts`.
- Verifiche: `typecheck` + `build` puliti; tutti i guardrail mappa PASS (nuovi NPC
  validati); coverage 157/157; EV simulati 2M giri.

NB: il workflow ha colpito rate-limit a metà verifica (level/ux non verificati dal
workflow); ho verificato io a mano i finding ad alta severità prima di applicare.

### 🔎 Round 31 — audit gameplay + design pixelmap
Richiesta utente: audit di gameplay + design pixelmap (PixelLab), focus su "soglie casa"
e gameplay che non matcha il design. 3 Explore agent in parallelo + verifica diretta +
6 guardrail (tutti PASS) + screenshot.

FATTO R31:
- **P0 DIFESA SPECIALE (`sim.ts:39`)**: le mosse speciali usavano `spc` anche in difesa
  → FACCIA TOSTA (`def`) non proteggeva MAI dalle speciali. Ora `defKey = "def"`. La
  difesa speciale legge la stat giusta. (Matematicamente può solo allungare i turni,
  non accorciarli → nessuna regressione; harness AI-vs-AI invariato perché lo starter
  ha def≈spc. Target turni resta ~5-8 player-perfect, divisore 58 tarato per gioco umano.)
- **P1 `vaffa`** power 90→75 (era over-tuned, speciale POPULISMO early).
- **P1 `bumpSondaggi` (`governo.ts`)**: reso esplicito che si annuncia la milestone PIÙ
  ALTA attraversata in un colpo (prima dipendeva dall'ordine del loop, di fatto già la
  più alta; ora chiaro e non accidentale).
- **P1 OVERFLOW HUD sondaggi**: l'etichetta "TESTA A TESTA" (13 char) sforava i 240px.
  Rinominata in "IN BILICO" (`sondaggiLabelShort`) + clip ridotto 13→12 in `WorldScene`
  (interno panel 72px = max 12 char). Verificato a schermo (borgo/capitale).
- **P2 guard `exp` in `parseState`**: stessa rete di sicurezza dell'HP (NaN→`expForLevel`).
- **P2 nuovo guardrail `scripts/check-map-exit.mjs`** (+ `npm run check:map-exit`): ogni
  mappa ha un'uscita, ogni interno torna all'aperto (BFS) → previene autosave-trap. PASS.
- **SOGLIE CASA**: i tile-porta sono LOGICAMENTE ok (tutti i guardrail PASS); lo scarto
  era solo visivo (edifici 3/4 su griglia top-down). Aggiunto **zerbino/soglia** PixelLab
  (`tiles/door_step.png`, `create_map_object` 32px scalato a 16) disegnato come overlay
  decorativo sulla cella davanti alle porte `d`/`D` outdoor (`WorldScene.draw`, key
  `obj:doorstep`). Niente collisioni toccate. Verificato a schermo.
- **PULIZIA**: rimossi 12 orphan PNG in `public/sprites/tiles/` (vecchi build_*/grass/
  flowers/tallgrass superati da `*_front.png`/`obj_*.png`). Manifest sincronizzato,
  `pixellab:coverage` 157/157.
- Verifiche: `typecheck` + `build` puliti; 6 guardrail mappa PASS + il nuovo; coverage
  verde; shot HUD/soglie; turni battaglia ri-misurati.

Report completo dell'audit: piano in `~/.claude/plans/goofy-prancing-bird.md`.

### 🗺️ Round 30 — terreno Wang flat, menu titolo, fix interazioni (porte/cartelli)
Feedback utente: "menu ancora vecchio; mappa fatta male — pezzo sovraelevato
attraversabile senza scale, case enterabili non dritti alla porta, incoerenze di
layout; revisione mappa/oggetti/interazioni col PG incompleta (lavoro Codex)."

FATTO R30 (pushato, 2 commit):
- **TERRENO "sovraelevato" RISOLTO**: il vero problema era il terreno. Codex aveva
  disattivato il Wang erba/sentiero (sembrava una scarpata: il vecchio
  `wang_grass_path.png` aveva un CONTORNO NERO da dirupo) e messo tile flat tan a
  bordi netti → la zona-sentiero sembrava una MESA rialzata. **Rigenerato in
  PixelLab un Wang FLAT** (`create_topdown_tileset` mode=pro, `transition_size:0`
  = niente dislivello, `view:low top-down`, `shading:flat`, `outline:lineless`,
  `spread_x:0.7`, `raggedness:0.15`), che fonde sentiero→erba allo STESSO livello,
  bordi morbidi e organici (stile Stardew). Sovrascritto `wang_grass_path.png`,
  riattivato in `WorldScene.drawWangTerrain` (`.`/`=` → key `grass_path`, upper=`=`)
  e registrato in `main.ts`. WANG_INDEX invariato (ricalcolato da metadata bbox =
  identico). I tile flat restano come fallback se il foglio non è caricato.
  Verificato su borgo/mediopoli/eurotown/capitale/route1; water/sand intatto.
- **MENU TITOLO ridisegnato** (`TitleScene`): pannello menu CENTRATO in basso
  (non più box stretto nell'angolo), `NOME`/`AUDIO` con rightLabel, slogan clampato
  a 220px (niente overflow a sinistra), tricolore+logo centrati con doppia ombra,
  footer "A SCEGLI · B INDIETRO · SATIRA". Matcher update() aggiornati
  (NUOVA CAMPAGNA / CANCELLA DOSSIER).
- **RIGHE MAPPA disallineate**: BORGO/MEDIOPOLI/EUROTOWN/CAPITALE avevano righe
  bordo a 29 char invece di 30 → colonna-muro fantasma / bordo sfasato. Pad a 30.
- **INTERAZIONI OGGETTI/PG (audit cella-per-cella, verifica avversariale)** — 6 fix:
  - **STRETTO (alto)**: la porta del bar CHIRINGUITO PAPEETE (13,4) aveva come unico
    fronte (13,5), che era ANCHE il warp d'imbarco verso `mare` → calpestandolo ti
    spediva in mare invece di entrare. **Bar irraggiungibile a piedi.** Spostati i
    2 warp mare sulle celle d'acqua d'approdo (13-14,6).
  - **EUROTOWN**: NPC `pensionato-euro` e un cartello sulla STESSA cella (21,11);
    interact() vede prima l'NPC → cartello illeggibile. Cartello → (22,11).
  - **GYM (template), PALAZZO, HOME (casa), CASINO**: cartelli incassati tra
    macchine `k`/scaffali `b`/muri `A` su tutti i lati → illeggibili. Spostati su
    muro di fondo con pavimento davanti.
  - **Guardrail nuovo** `scripts/check-interactables.mjs` (importa le VERE MAPS via
    Playwright, copre anche le mappe da template gym/bar/house/market): cartelli
    leggibili, niente NPC su cartelli, niente warp sul fronte porta. + ripristinato
    `scripts/check-door-warps.mjs` (porte outdoor solo dal fronte). Entrambi PASS.
- Verifiche: `npm run typecheck` + `npm run build` puliti; screenshot di audit in
  `artifacts/screens/audit_*.png` (title, città, route1, stretto bar).

❌ RESTA (non bloccante): gli edifici PixelLab sono 3/4 isometrici su griglia
top-down → la porta visiva può sembrare leggermente disallineata col tile-porta
calpestabile (footprint scalata, documentato). I tile-erba Wang mostrano una lieve
costura di griglia in alcune zone. Valutare un Wang `~`/`,` (erba alta/fiori)
coerente e un eventuale Wang sabbia→molo per lo Stretto se si vuole rifinire.

## Handoff domani

Stato repo:
- Branch: `master`.
- Tutti i blocchi completati sono stati pushati a fine blocco.
- Ultimo blocco: UI/terrain polish PixelLab + ritocco overflow menu battaglia.
- Wave 3 dei rimanenti Politicmon e gia pushata: caricature umane piatte
  sovrascritte da mostriciattoli satirici con attributi politici riconoscibili.

Verifiche gia fatte nella sessione:
- `npm run pixellab:coverage`
- `npm run typecheck`
- `npm run build`
- Contact sheet: `artifacts/screens/monster-wave1-contact.png`
- Contact sheet: `artifacts/screens/monster-wave2-contact.png`
- Contact sheet: `artifacts/screens/monster-wave3-contact.png`
- Screenshot fix overflow: `artifacts/screens/battle_menu_v2.png`
- Screenshot menu mosse: `artifacts/screens/battle_fight_v2.png`
- Screenshot floor wood in game: `artifacts/screens/terrain_route1.png`
- Screenshot/playtest mirati su titolo, mondo, terrain, battle, starter preview.

Da testare su device:
- Apri la build aggiornata e controlla title, scelta starter, battle, Dex/Party.
- Mostri wave 1 da giudicare: `giorgetta`, `giorgiagon`, `ellyna`, `schleinix`,
  `renzino`, `renzilla`.
- Mostri wave 2 da giudicare: `salvinott`, `salvinator`, `grillix`, `vaffenix`,
  `contemorfo`, `calendauro`, `vannaccix`, `tajanide`, `berlusconix`,
  `draghimon`, `mattarellux`.
- Mostri wave 3 da giudicare: `trumpon`, `putingrad`, `xipanda`, `macronfox`,
  `ursulax`, `bojoon`, `zelenskir`, `muskrat`, `marsrat`, `movimenton`,
  `capitanone`, `mediocrate`, `pontigor`.
- Criterio: devono ricordare le figure politiche/meme del roster tramite
  volto/capelli/pose/props, restando mostri satirici leggibili.

Prossima wave consigliata:
- Controllare in device wave 3 e, se approvata, passare a UI battle/menu
  (`battle_bg`, badge/type icons, EXP/sondaggi/status icons) con asset PixelLab
  coerenti.
- `floor_wood.png` ora e PixelLab-derived 16x16 e non trasparente; se su device
  sembra troppo rigato, rigenerare solo quel tile con style reference migliore.

### 🎨 Round 29 — PixelLab UI/terrain polish + battle overflow
FATTO R29:
- Integrata nuova `ui/hpbar.png` da PixelLab (`30bcb94b-a3c3-471a-b98b-e927e986cb9e`),
  croppata a 210x41 e verificata in battaglia.
- Integrato `tiles/floor_wood.png` da frame PixelLab selezionato
  (`9080abd2-ddab-4a16-840a-305444d1dd00`), normalizzato a tile opaco 16x16.
- Scartati i tentativi floor trasparenti/furniture-like e documentati nel
  manifest.
- Rifinito il menu battaglia: `CAMPAGNA` resta nel box, prompt compatto
  `AZIONE?`, riepilogo mossa clippato con `clipToWidth`.
- Shot di verifica: `artifacts/screens/battle_menu_v2.png`,
  `artifacts/screens/battle_fight_v2.png`, `artifacts/screens/terrain_route1.png`.

### 🎨 Round 28 — PixelLab Politicmon wave 3 + fix battle menu
FATTO R28:
- Fixato il menu battaglia: pannello azioni piu largo, colonne calcolate e
  label sempre clippate con `clipToWidth`; verificato con
  `artifacts/screens/battle_menu_v2.png`.
- Rigenerati/riscaricati i rimanenti 13 Politicmon: Trumpon, Putingrad,
  Xipanda, Macronfox, Ursulax, Bojoon, Zelenskir, Muskrat, Marsrat,
  Movimenton, Capitanone, Mediocrate, Pontigor.
- Motivo del rework: la prima wave 3 era troppo "politico umano chibi".
  I nuovi sprite hanno silhouette da mostro, code/ali/artigli/props meme e
  facce/capelli/vestiti riconoscibili.
- Aggiornati `scripts/pixellab-monsters.json`,
  `scripts/pixellab-reboot-assets.json`, `docs/PIXELLAB-REBOOT.md` e questa
  handoff.

### 🎨 Round 27 — PixelLab Politicmon italiani wave 2
FATTO R27:
- Rigenerati da review pack PixelLab e integrati: Salvinott, Salvinator,
  Grillix, Vaffenix, Contemorfo, Calendauro, Vannaccix, Tajanide,
  Berlusconix, Draghimon, Mattarellux.
- Criterio usato: volto/attributi riconoscibili del politico + categoria mostro
  gia definita in `src/data/species.ts` (castorino, grillo, fenice, blob, sauro,
  orso, colomba, biscione, drago, garante).
- Aggiornati `scripts/pixellab-monsters.json`,
  `scripts/pixellab-reboot-assets.json`, `docs/PIXELLAB-REBOOT.md` e questa
  handoff.

### 🎨 Round 26 — PixelLab Politicmon italiani wave 1
FATTO R26:
- Scartati i 6 sprite fantasy generici non convincenti.
- Rigenerati da review pack PixelLab e integrati: Giorgetta, Giorgiagon, Ellyna,
  Schleinix, Renzino, Renzilla.
- Direzione corretta: facce/attributi dei politici italiani + corpo da
  mostriciattolo satirico.
- Fixato overflow del menu battaglia: `CAMPAGNA` non esce piu dal box azioni.
- Starter preview ora usa i PNG PixelLab dei mostri e tronca/wrappa la dexline
  dentro il pannello.
- Aggiornati `scripts/pixellab-monsters.json`,
  `scripts/pixellab-reboot-assets.json`, `scripts/pixellab-fetch.mjs` e questa
  handoff.

### 🎨 Round 25 — proporzioni PixelLab mondo/title
FATTO R25:
- Commit pushato: `474ac14` (`Tighten PixelLab world proportions`).
- Ridotte title UI/logo/menu e sistemate proporzioni mondo.
- Oggetti PixelLab 32px ora scalati a tile 16px: niente case/props giganti.
- Ridotta freccia guida, compatta notifica traguardi, rimosso doppio hint
  inferiore quando e gia presente il quest strip.

### 🎨 Round 24 — PixelLab vehicle wave
FATTO R24:
- Rigenerati e integrati: auto, ruspa, monopattino, ferry, Schettino.
- Auto/ruspa/monopattino usano 4 direzioni da `create_8_direction_object`.
- Ferry e Schettino sono statici da `create_map_object`.
- Aggiornato manifest con batch `vehicles-wave-2026-06-28`.

### 🎨 Round 23 — PixelLab NPC archetypes wave 2
FATTO R23:
- Rigenerati e integrati con 4 direzioni + walk 4-frame: boss, granny,
  influencer, aide.
- Aggiornato manifest con batch `npc-archetypes-wave2-2026-06-28`.

### 🎨 Round 22 — PixelLab NPC archetypes wave 1
FATTO R22:
- Rigenerati e integrati con 4 direzioni + walk 4-frame: kid, journalist,
  rival, barista.
- Aggiornato manifest con batch `npc-archetypes-wave1-2026-06-28`.

### 🎨 Round 21 — PixelLab edifici e props mondo
FATTO R21:
- Rigenerati in PixelLab e integrati: lab, bar, gym, casino, palazzo,
  sign, fence, tallgrass, flowers, counter, table, shelf, plant, bed, machine,
  girder, crane, gold door, wall interior.
- Aggiornato manifest con batch `world-buildings-props-2026-06-28`.
- Non sovrascritto `floor_wood.png`: la generazione PixelLab era quasi vuota,
  quindi resta da rifare con workflow terrain/tile più adatto.

### 🎨 Round 20 — PixelLab style foundation
FATTO R20:
- Confermato abbonamento PixelLab attivo: Tier 2 Pixel Artisan.
- Generato e integrato primo blocco grafico nuovo: Wang grass/path,
  Wang water/sand, house, tree, dialog frame, player 4-dir + walk,
  professor 4-dir + walk, guard 4-dir + walk.
- Aggiornato `scripts/pixellab-reboot-assets.json` con gli ID MCP del batch
  `style-foundation-2026-06-28`.
- Normalizzato `ui/dialog.png` da 192x192 a 48x48 per la 9-slice del gioco;
  border in `src/main.ts` portato a 8.

Regola nuova richiesta utente: dopo ogni blocco di modifiche completato, fare
commit e push, così il gioco è testabile da device.

### 🎨 Round 19 — PixelLab reboot da zero
Richiesta utente: rifare **tutta** la grafica in PixelLab da zero, tenendo le
logiche di gameplay. Decisione operativa: il vecchio compromesso "alcuni residui
pixmap per scelta" e superato. Ora ogni fallback visibile e debito temporaneo.

FATTO R19:
- Configurato MCP globale `pixellab` in Codex (`https://api.pixellab.ai/mcp`).
  Serve restart della sessione per far comparire i tool `create_*`/`get_*`.
- Aggiunto source of truth `scripts/pixellab-reboot-assets.json`.
- Aggiunto guardrail `scripts/check-pixellab-coverage.mjs` con script npm
  `pixellab:coverage` e `pixellab:coverage:strict`.
- Aggiunta guida corta `docs/PIXELLAB-REBOOT.md`.

Regola R19: non toccare salvataggi, mappe, quest, formule battaglia, multiplayer
o progressione mentre si sostituisce la grafica.

### 🎨 Round 18 — direzione di design unica (Stardew/RPG 3/4 cozy)
Feedback utente: "è tutto sbagliato, va rifatto il gioco come INSIEME coerente,
non toppe sul vecchio; provalo, il personaggio si muove in 2D". **Decisione utente
(AskUserQuestion): stile "Stardew / RPG 3/4 cozy"** — sfrutta gli edifici 3/4
PixelLab + lo z-order (R17). Memory: `politicmon-isometric-pivot` (aggiornata).
Causa del "vecchio": il **terreno**. Il Wang erba/sentiero era verde FLUO + sentiero
a ricciolini.

FATTO R18:
- **TERRENO tenue**: rigenerati i Wang erba→sentiero e acqua→sabbia con toni
  morbidi naturali (no neon, sentiero terra liscio, bordi morbidi). WANG_INDEX
  invariato `[6,5,2,3,7,14,11,0,10,1,4,13,9,8,15,12]` (stesso layout 4x4,
  verificato da metadata corners+bounding_box). File: `wang_grass_path.png`,
  `wang_water_sand.png`.
- **OGGETTI scena cozy**: albero (`tree.png`), erba alta (`obj_tallgrass.png`),
  recinto (`fence.png`), segnale (`sign.png`) rigenerati in stile morbido coerente.
- Verificato in-game (borgo/mediopoli/eurotown + playtest mondo): terreno, case,
  oggetti, NPC ora condividono lo stesso linguaggio Stardew 3/4. Niente più look anni 90.
- Tool playtest: `scripts/playtest.mjs` (inietta WorldScene via window.stack, cammina).

❌ RESTA (rifinitura, non bloccante): sprite **player/NPC** sono PixelLab ma in posa
più "frontale/ritta" che 3/4 puro — leggibili, a 4 viste+walk, ma rigenerabili in
3/4 più coerente se si vuole spingere. Terreno iso a rombo NON necessario (il look
cozy a griglia + 3/4 + z-order basta). UI/menu già coerenti.

### 🔧 Round 17 — Z-ORDER profondità + fix VEICOLI (pivot verso 3/4 iso)

### 🔧 Round 17 — z-order + veicoli + decisione PROSPETTIVA
Feedback utente: "case in diagonale ma ingressi dritti, mappa stile vecchio,
oggetti/veicoli fuori proporzione". Causa radice: **PixelLab genera gli edifici
SEMPRE in vista 3/4 isometrica** (anche con view "low top-down" + "directly above"
+ "flat orthographic": il modello ignora e fa 3/4). Il mondo era top-down piatto →
mix incoerente, ingresso poco chiaro. **Decisione utente: portare il mondo a 3/4
isometrico** per accordarlo agli edifici (vedi memory `politicmon-isometric-pivot`).

FATTO in R17 (primo pezzo del pivot, alto impatto, basso rischio):
- **Z-ORDER per profondità** (`WorldScene.draw`): edifici building-PNG + NPC +
  remoti MP + player raccolti in una lista `tall[{baseY, draw}]`, ordinata per Y
  di base, disegnata dal più in alto al più in basso. Il personaggio passa DIETRO
  una casa quando è sopra di essa, DAVANTI quando è sotto → **niente più
  personaggio sul tetto; l'ingresso (porta in basso) è leggibile.** Mantiene
  footprint scalata (R16), fallback Pixmap, offset veicolo, exclaim, nick/emote MP.
  Verificato in-game (player dietro/davanti casa borgo). Shot: `scripts/shot-zorder.mjs`.
- **VEICOLI**: auto/ruspa target 30px (era 26) e scala sul **lato maggiore** (non
  height) → le 4 viste N/S/E/O non si deformano/sbordano, il mezzo riempie la cella
  ed è chiaramente più grosso di un pedone. Verificato auto+ruspa+monopattino in
  tutte e 4 le direzioni. (NB: lo shot DEVE attendere il caricamento PNG, altrimenti
  cade sul fallback pixmap che disegna il player sopra l'auto.)

❌ RESTA del pivot 3/4 (blocco successivo, NON ancora fatto): per coerenza piena
servirebbe portare a stile 3/4 anche **terreno** (i tile sono ancora top-down
piatti) e rifinire **personaggio/NPC** in 3/4. Lo z-order già integra bene gli
sprite con gli edifici (stile Stardew: terreno a griglia + sprite/edifici 3/4 +
profondità), quindi l'incoerenza è molto ridotta. Valutare se il terreno iso vero
(tile a rombo) vale la riscrittura della proiezione o se il look attuale basta.

### 🔧 Round 16 — fix EDIFICI + UI/HUD PixelLab (type-badge, slot, grotta, avatar MP)

### 🔧 Round 16b — UI/HUD PixelLab + residui
- **8 TYPE-BADGE** (megafono/ingranaggio/foglia/pugno/rosa/tv/bilancia/stretta-mano)
  in `ui/type_*.png`, cablati in **GUIDA TIPI, Dex dettaglio, Party, StarterPreview**
  (`typeIcon` sul chip colorato). Verificato in-game. **NB: gli ID PixelLab dei
  map-object scadono dopo 8h** → rigenerati da zero (i vecchi ID del round prima
  erano morti). `setTypeIconLoader(getSpriteImage)` in main.ts collega il loader.
- **Mobile SLOT** (`ui/slot_cabinet.png`) come **decoro del menu casinò** (basso-dx),
  NON dietro i rulli: messo dietro i 3 rulli li rendeva illeggibili. Rulli puliti.
- **GROTTA** con texture roccia: nuovo `MapDef.tileOverrides` (char→PNG per-mappa,
  non tocca collisioni) → `cave_floor.png`/`cave_rock.png`; uscita `c`→roccia.
  `WorldScene.tilePng()` applica override poi delega a `tileImage`.
- **Avatar remoti MP** → ora PNG player (4 viste+walk), nick li distingue; fallback
  pixmap. (Era l'ultimo personaggio a pixmap.)
- **DECISIONI "non cablare" (peggiorerebbero / nessun valore)**:
  - **Barra HP** (`ui/hpbar.png` scaricato ma NON cablato): la barra è alta 7px e
    leggibile; una cornice 9-slice 192px la ingombrerebbe. L'utente vuole HP leggibili.
  - **Title logo/podio/filetto**: già c'è `public/title-bg.png` (splash AI 240x180 a
    tutto schermo) + logo testo bitmap nitido scalato 3x con filetto tricolore. Un
    logo-PNG peggiorerebbe leggibilità/coerenza. Podio/palazzo procedurali sono solo
    fallback (raramente visti). **Tenuto com'è.**
  - **`MONSTER_ACTION_ART`** (bocca urlante): **codice morto** per le specie attive —
    in `BattleScene.drawMonster` il ramo PNG (`monsterImage`) vince SEMPRE e ignora
    `art`/`useAction`; tutte le 8 specie con action-art sono in `MONSTERS_WITH_PNG`.
    L'affondo usa il base PNG con squash/stretch. Resta come fallback se una specie
    futura non avrà PNG. **Nessun lavoro utile.**
  - **Tastiere Nickname/Chat**: griglia di tasti = testo dinamico; un PNG non aiuta.
  - **Tappeto `c`**: nel palazzo (colle) è una passatoia rossa coerente → tenuto pixmap;
    in grotta è stato sostituito con roccia via override.

### 🔧 Round 16a — fix rendering edifici (feedback utente: "edifici doppi/storti")
Gli edifici multi-tile col building-PNG erano **spezzati/duplicati/tagliati**:
- `bar eQQe` e `palestre y/B/x` venivano resi come 3 micro-edifici affiancati
  (il rilevamento blocco confrontava il **char identico**, non il **gruppo PNG**).
- Il PNG a dimensione fissa (64/96/160px) sbordava o lasciava celle-tetto scoperte.
- Colonne `C`/bandiere `G` del palazzo restavano tile-pixmap esposti ai lati.

**Fix** (`tiles.ts` + `WorldScene.ts`): `buildingKey(ch)` = file PNG → i char-tetto
dello stesso gruppo (e/Q, y/B/x) sono UN edificio; `buildingFootprint()` misura
l'impronta reale (tetto + righe facciata) dalla mappa ASCII e il PNG si **scala**
su quella; `buildingCovering()` sopprime il terreno sotto tetto+facciata; `C`/`G`
aggiunti ai FACADE_CHARS (palazzo li ingloba). Verificato in-game su borgo/
mediopoli/eurotown/capitale (case, bar col simbolo cura, palestre, palazzo) —
tutti coerenti, entrata centrata visibile. **Le viti dei vecchi screenshot
(blob nero NPC, recinti pixmap) erano il deploy VECCHIO**: nel bundle attuale
NPC=PNG, recinti/segnali=PNG. Shot helper: `scripts/shot-buildings.mjs`.

## ⚠️ REDESIGN PixelLab — STATO E MANCANZE (leggi per primo se continui il redesign)

Obiettivo utente: **tutta la grafica su PixelLab, ZERO pixmap residuo**, come
rifare da zero. Roadmap operativa completa: **`docs/REDESIGN-TOTALE.md`** (audit
esaustivo di ogni char/scena). Tracking asset: `scripts/pixellab-assets.json`,
`scripts/pixellab-monsters.json`.

**Infrastruttura (tutta non-bloccante, fallback al Pixmap → save intatti):**
`src/engine/assets.ts` (registry async PNG + loadPanelImage/loadWangSet),
`Screen.imageSprite/imageRegion/nineSlice/setPanelImage`. Asset in `public/sprites/{monsters,chars,tiles,items,ui}/`.

### ✅ GIÀ PixelLab (fatto + verificato in-game)
- **30 mostri** (battaglia + dex/party/box/titolo/evo/HUD) — `MONSTERS_WITH_PNG`.
- **Player + 10 NPC** 4 viste N/S/E/O **+ camminata animata** (`_<dir>_w<n>.png`,
  `playerImage`/`npcImage` con `(facing,frame,moving)`; `NPC_WALK`).
- **Veicoli terrestri** (auto/ruspa/monopattino) **4 viste**; **traghetto** 1 vista.
- **Edifici** building-PNG con rilevamento blocco **per gruppo + footprint scalata**
  (R16): case/lab/bar 64x48, palestre/casinò 96x48, palazzo 160x64 inclusi colonne/
  bandiere (`isRoof`/`buildingKey`/`buildingFootprint`/`buildingCovering`). No più
  duplicazioni/tagli; entrata centrata visibile.
- **Oggetti**: albero/segnale/recinto (`OBJECT_PNG`).
- **TERRENO autotiling Wang**: erba `.`/sentiero `=` + acqua `w`/sabbia `z`
  (`wang_grass_path.png`/`wang_water_sand.png`, `WorldScene.drawWangTerrain`,
  `cornerMask`/`wangSrc`, `WANG_INDEX=[6,5,2,3,7,14,11,0,10,1,4,13,9,8,15,12]`).
- **Icone borsa** (scheda/caffè/spritz/mojito/maalox), **cornice dialog 9-slice**
  (tutti i box/menu/HP), **sfondo battaglia**, **pickup scheda**.
- **8 type-badge** (icone ideologia su chip) in Types/Dex/Party/Starter (R16b).
- **Mobile slot** (decoro menu casinò), **grotta roccia** (tileOverrides), **avatar MP** (R16b).

### ❌ ANCORA PIXMAP — residui (per ognuno: decisione presa, vedi § Round 16b)
Tutti i residui sono stati VALUTATI; quelli sotto restano pixmap **per scelta
motivata** (peggiorerebbero leggibilità o non danno valore), non per dimenticanza:
1. **Barra HP frame** — `ui/hpbar.png` scaricato, NON cablato (ingombrerebbe la barra
   7px leggibile). Se si vuole ritentare: serve un frame SOTTILE, e tenere i numeri sopra.
2. **Title logo/podio** — bg AI + logo bitmap nitido, tenuto com'è (un PNG peggiora).
3. **`MONSTER_ACTION_ART`** — codice morto (il PNG vince sempre in battaglia). No-op.
4. **Tastiere Nickname/Chat** — testo dinamico, PNG non aiuta.
5. **Tappeto `c`** palazzo — passatoia rossa coerente, tenuta (in grotta = roccia).
6. **Micro-UI a codice** (basso valore, testo-centriche): barre EXP/SONDAGGI, icone
   stato (IND/SCA/GAF), freccia guida, banner BREAKING NEWS, tag nome-mappa. Sono
   composizioni di rect+testo già leggibili; PixelLab darebbe poco e rischia rumore.

> In pratica il redesign grafico **sostanziale** è completo: mondo, personaggi,
> edifici, mostri, oggetti, terreno, interni, grotta, UI principali = PixelLab.
> Ciò che resta pixmap è per leggibilità/valore, documentato sopra.
6. **MOSTRI**: `MONSTER_ACTION_ART` (frame bocca-urlante, 8 specie, pixmap);
   `BALLOT_ART` (scheda lanciata in battaglia); `BADGE_ART` (medaglie 12x12).
7. **UI/HUD (tutto a codice)**: barre HP/EXP/SONDAGGI, **type-badge** 8 tipi
   (`TYPE_COLORS` rect, in Types/Dex/Party/Teach/Battle), icone stato (IND/SCA/GAF),
   freccia guida (triangolo), **slot casinò** (cabinet+simboli), **tastiere**
   Nickname/Chat, **title** logo/filetto/podio (lo sfondo è già `title-bg.png`),
   banner evento/BREAKING NEWS, tag nome-mappa, targhetta veicolo.

### Trappole imparate (redesign)
- **Limite 10 job PixelLab in volo**; oggi la coda andava in **timeout** sui
  tileset (rigenerare con descrizioni minimali tipo lower="grass" upper="dirt").
- **Verifica del registry async in DEV è inaffidabile** (HMR duplica i moduli →
  `buildingImage()` può tornare null anche con status ready): verifica nel gioco
  reale (shot-*.mjs con attesa caricamento), non con import freschi.
- **Wang**: la metadata (`/metadata`) ha `corners` (NE/NW/SE/SW) + `bounding_box`
  per ogni tile → calibrare `WANG_INDEX` (bit 1=TL/NW,2=TR/NE,4=BR/SE,8=BL/SW).
- **Edifici PixelLab** escono in vista 3/4 (high top-down), non top-down puro:
  l'utente l'ha notato. Coerenza vista terreno↔edifici↔personaggi da curare.
- **Download animazioni walk**: NON zip — URL diretti `animations/<animId>/<dir>/<n>.png`
  (animId diverso per direzione, da `get_character`).
- Regola viste cardinali: si muove→4 viste/walk; statico→1. Verifica SEMPRE in-game.

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
4. Deploy: push su `master` → Vercel deploya da solo (Git integration). NON serve
   `npx vercel`. Se il webhook non scatta, commit vuoto per ri-triggerare.
5. Verifica: vedi § Verifica visiva.

### Tool: pixel-plugin (installato round 14)

È installato il **pixel-plugin** (`willibrandon/pixel-plugin`, plugin Claude Code,
scope user): comandi pixel-art + MCP `pixel-mcp` (40+ tool) basato su **Aseprite**.
Si carica al riavvio della sessione; il setup è `/pixel-setup`.
⚠️ **Richiede Aseprite installato** (editor a pagamento) — al momento NON risulta nel
PATH, va installato/configurato. ⚠️ **Vincolo del progetto:** la grafica DI GIOCO è
100% pixel-map da codice (niente asset binari committati). Usa pixel-plugin/Aseprite
per *prototipare/visualizzare* sprite, poi traducili in pixel-map (`src/art/*`) —
NON committare `.aseprite`/PNG come asset di gioco (le sole eccezioni esistenti sono
gli splash AI `public/title-bg.png`/`intro.mp4` e le icone PWA generate da script).

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
| Veicoli | MONOPATTINO (veloce), RUSPA (abbatte alberi), AUTO BLU, **TRAGHETTO** | `game/vehicles.ts` |
| TRAGHETTO (acqua) | **Veicolo** (non MN). Naviga l'acqua; imbarco/sbarco AUTOMATICO su acqua (`syncFerryVehicle`), `canFerry` = possiedi `veh-traghetto`. Al timone CAPITANO SCHETTINO (`SCHETTINO_PIX`). Lo regala il MARINAIO a Caput Mundi (`vehicleGift` con `requiresBadges`) | `game/world/WorldScene.ts`, `game/vehicles.ts` |
| Route/percorsi | PERCORSO 1 tra Borgo e Mediopoli: erba alta+incontri, LAGHETTO con isola-tesoro (solo col traghetto), GROTTA DEL CONSENSO. Pattern replicabile (vedi memoria `politicmon-route-pattern`) | `data/maps.ts` (`route1`, `grotta1`) |
| Incontri PG casuali | Allenatori vaganti scalati | `data/encounters.ts` |
| Eventi morale | Siparietti di strada che muovono sondaggi/fondi | `data/streetevents.ts` |
| Rivale ricorrente | GIANNI a 5 tappe, squadra che cresce, battute con memoria | `data/rival.ts` |
| Retention | Teaser post-medaglia, BREAKING NEWS sondaggi, loot a sorpresa | `data/trainers.ts` (`BADGE_TEASER`), `game/governo.ts` (`bumpSondaggi`), `game/battle/BattleScene.ts` (`LOOT_TABLE`) |
| Audio dinamico | Tracce per zona e tipo di battaglia | `engine/audio.ts` |
| Animazioni | Idle/affondo procedurali + frame d'azione su boss; preview starter | `game/battle/BattleScene.ts`, `scenes/StarterPreviewScene.ts` |
| Mobile | Levetta analogica + d-pad, toggle controlli, modalità guidata | `engine/controls.ts`, `engine/input.ts` |
| PWA | Manifest, service worker, prompt installazione (iOS incluso) | `engine/pwa.ts`, `public/sw.js` |
| Multiplayer P2P | Presence (vedi gli altri sulla tua mappa), chat di zona, emote, nickname | `net/mp.ts`, `net/profile.ts`, `scenes/ChatScene.ts` |

Numeri attuali: **30 specie, ~70 mosse, 21 allenatori fissi (+ rivale dinamico), 18 quest, ~32 mappe (borgo, route1, mediopoli, eurotown, capitale, mare, stretto, palazzo, colle, grotta1 + interni)**.

**STRETTO: come ci si arriva (aggiornato round 14).** A Caput Mundi il MARINAIO
(11,19) regala il **VEICOLO TRAGHETTO** a 3 medaglie (al timone SCHETTINO). L'IMBARCO
(warp 12,19, gated `requiresFlag: veh-traghetto`) porta alla mappa `mare` (BRACCIO DI
MARE) → **attivi il traghetto camminando sull'acqua (automatico)** → approdi nello
STRETTO. La SCORTA AUTO BLU resta solo per il fast-travel tra città già visitate
(STRETTO è stato tolto dal suo menu). Flag vecchio `hm-traghetto` ABBANDONATO: ora
è `veh-traghetto` (flag veicolo).

**Geografia (route stile Pokémon, in corso).** Le città non sono più tutte
attaccate: **Borgo ↔ PERCORSO 1 ↔ Mediopoli** ha una route in mezzo (erba/acqua/
grotta). Le altre tratte (Mediopoli↔Eurotown, Eurotown↔Caput Mundi) sono ANCORA
edge diretti — backlog: replicare il pattern PERCORSO 1 (documentato in memoria).

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
- ~~Route pilota stile Pokémon (erba/acqua/grotta tra città)~~ ✓ FATTO (round 14, PERCORSO 1).
- **Route rimanenti** (Mediopoli↔Eurotown, Eurotown↔Caput Mundi): replicare il
  pattern PERCORSO 1. È il prossimo passo richiesto dall'utente ("provo prima" la 1).
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

- **Round 15 — REDESIGN GRAFICO PixelLab (totale) + fix canale STRETTO (2026-06-28):**
  - **Vincolo "grafica 100% pixel-map" ABBANDONATO** (scelta utente): tutta la
    grafica passa a PNG PixelLab, serviti da `public/sprites/{monsters,chars,tiles,items,ui}/`.
  - **Infra anti-regressione:** `src/engine/assets.ts` (registry async PNG con
    fallback al Pixmap) + `Screen.imageSprite()`/`Screen.nineSlice()`. I save NON
    sono toccati. Ogni asset ha fallback → niente si rompe durante la migrazione.
  - **FATTO e in produzione:** 30/30 MOSTRI (battaglia+dex/party/box/titolo/evo/HUD,
    helper `drawMonsterSprite`); PLAYER 4 dir (`playerImage`); NPC 4 dir
    (`NPC_WITH_PNG`: professor/guard/kid/journalist/boss/granny/rival/influencer;
    aide/barista in coda); VEICOLI terrestri 4 viste N/S/E/O (`vehicleImage(id,facing)`,
    auto/ruspa chiusi=solo veicolo, monopattino=player sopra); TRAGHETTO (1 vista);
    OGGETTI overlay (albero T/segnale s/recinto f); ICONE borsa (scheda/caffe/
    spritz/mojito/maalox, `ITEMS_WITH_PNG`+`drawItemIcon`); CORNICE DIALOG 9-slice
    (`ui/dialog.png`, `loadPanelImage`+`Screen.panel`, border 7 → tutti i dialoghi/
    menu/box HP); SFONDO BATTAGLIA (`ui/battle_bg.png`).
  - **REGOLA VISTE CARDINALI** (vedi memoria `politicmon-asset-views-rule` +
    REDESIGN-PLAN): risorsa che si muove = 4 viste N/S/E/O; statica/frontale = 1.
    Bug corretto: i veicoli avevano 1 sola vista (guardavano sempre uguale guidando).
  - **EDIFICI building-PNG (FATTI):** rilevamento blocco-tetto nel renderer
    (`isRoof`/`buildingImage` in tiles.ts, angolo alto-sx → disegno in 2° passo).
    Dimensioni per tipo: case/lab/bar 64x48 (4x3), palestre/casinò 96x48 (6x3),
    palazzo 160x64 (10x4). Verificato borgo/mediopoli/capitale.
  - **CAMMINATA animata (FATTA):** `animate_character` walking-4-frames →
    `chars/<char>_<dir>_w<n>.png` (16 file/personaggio). `playerImage`/`npcImage`
    prendono `(facing, frame, moving)`; il renderer cicla `walkCycle` mentre si
    muove. Player + NPC (granny/guard/kid/aide/barista/professor; journalist/boss/
    rival/influencer in coda). Fix scivolamento (prima 1 frame statico).
  - **RESTA pixmap (di proposito):** ponte stretto (cantiere satirico), acqua/
    laghetto bordo, interni (pavimenti/mobili), erba alta, frame d'azione mostri
    (bocca urlante), HUD, title-screen, medaglie. Round dedicato se richiesto.
  - **NON fatto (round dedicato / basso ROI):** EDIFICI (tetti multi-tile +
    facciata: serve building-PNG completi con rilevamento blocco — rischio
    renderer); ERBA ALTA `~` (ciuffo ripetuto fa pasticcio); TERRENO base
    (texture-swap senza autotiling Wang dà bande); type-badge 11px (rect colorati ok).
  - **Tracking:** `scripts/pixellab-monsters.json` (30 mostri) +
    `scripts/pixellab-assets.json` (npc/ui/icone/veicoli/sfondi). Download:
    `scripts/pixellab-fetch.mjs` (mostri); NPC via `get_character`, oggetti/icone
    via `/mcp/map-objects/<id>/download`, UI via `get_ui_asset`, veicoli 8-dir via
    `get_object`. Verifica: `scripts/shot-{pilot,terrain,vehicle,bag,dex-pilot}.mjs`.
  - **Fix bug STRETTO** (segnalato dall'utente): vedi sotto.

- **Round 15 (dettaglio fix STRETTO):**
  - **Fix bug STRETTO** (segnalato dall'utente): l'approdo dal traghetto cadeva su
    una fascia di SABBIA continua (righe 6-7 di `STRETTO_TILES`) che faceva da
    "isola di terra" e tagliava la traversata — il ponte sembrava irraggiungibile,
    niente collegamento d'acqua visivo. Ridisegnate righe 5-7: ora un **canale
    d'acqua centrale (col 11-16)** scende ininterrotto dal molo nord all'acqua
    aperta e al cantiere del ponte. Edifici/warp/NPC ricontrollati cella-per-cella
    (chiosco door col10, covo col20, bar col13 invariati; capitano/geometra/pickup
    su `j` ponte ok). Verificato con `scripts/shot-stretto.mjs` (approdo/canale/ponte).
  - **DECISIONE: vincolo "grafica 100% pixel-map da codice" ABBANDONATO.** L'utente
    ha scelto di rifare il design con **PixelLab** (MCP, sub Tier 2, 5000 gen).
    Gli asset diventano PNG serviti da `public/sprites/{monsters,tiles,chars,ui}/`.
  - **Infrastruttura asset PNG (non bloccante, anti-regressione):** nuovo
    `src/engine/assets.ts` (registry async: `getSpriteImage`/`preloadSprites`,
    fallback al Pixmap finché il PNG non è `ready` o se manca) + `Screen.imageSprite()`
    (disegna PNG con stesso ancoraggio/flip/scala di `sprite`). I save NON sono
    toccati (grafica = presentazione pura).
  - Tool PixelLab: mostri statici → `create_1_direction_object` (size 64, view
    sidescroller); tile → `create_topdown_tileset` (Wang 16px); player/NPC →
    `create_character` (8-dir). Generazione async (~2-7 min/asset), si scarica con
    `get_object`/`get_character` (URL) → salva in `public/sprites/...`.

- **Round 14 — TRAGHETTO-veicolo + PERCORSO 1 + grotta (2026-06-28):**
  - **TRAGHETTO da MN a VEICOLO** (richiesta utente): `VehicleId "traghetto"` +
    flag `veh-traghetto`; lo regala il MARINAIO (`vehicleGift` con `requiresBadges:3`,
    gating aggiunto al handler vehicleGift). **Imbarco/sbarco automatico**
    (`syncFerryVehicle` in `onStepComplete`): su acqua il veicolo passa a
    "traghetto" e ripristina il mezzo terrestre allo sbarco (niente soft-lock;
    escluso dal ciclo VEICOLO del menu pausa). `canFerry` = possiedi `veh-traghetto`.
    Sprite: scafo `FERRY_PIX` + **CAPITANO SCHETTINO** al timone (`SCHETTINO_PIX`,
    satira bonaria). Rimosso `hmGift`/`isOnWater` (sostituiti).
  - **PERCORSO 1** (route pilota stile Pokémon tra Borgo e Mediopoli): nuova mappa
    `route1` (erba alta+incontri intermedi, LAGHETTO con isola-tesoro accessibile
    solo col traghetto, ingresso GROTTA) + nuova mappa `grotta1` (GROTTA DEL
    CONSENSO: incontri + TESSERA DORATA). Riagganciati gli edge **borgo↔route1↔
    mediopoli** (prima diretto). Le città non sono più tutte "attaccate".
  - Pattern route documentato in memoria (`politicmon-route-pattern`): mappe a **29
    colonne**, strada `====` a idx 13-16, erba `~`, validare con `check-placement.mjs`.
  - Installato **pixel-plugin** (vedi § Tool sopra) per futuro lavoro su sprite.
  - NB: round 13 introdusse il TRAGHETTO come MN (`hm-traghetto`); round 14 l'ha
    convertito in veicolo. Il flag `hm-traghetto` è morto, usa `veh-traghetto`.
- **Round 13 — TRAGHETTO (prima versione, MN) + fix placement (2026-06-27):** lo STRETTO ora si
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

## Handoff 2026-06-29 — wave menu/mappa/HUD

- **Non spegnere il PC:** richiesta utente esplicita.
- **HUD battaglia:** `EXP+` non sta più sul numero PV; se c'è uno status si sposta
  dopo il badge status. Helper `A: OK`/`A: AVANTI` nei dialoghi rialzato dentro
  il box.
- **Menu titolo:** box compattato in basso a destra, label accorciate per non
  coprire logo/slogan PixelLab.
- **Mappa:** erba/sentiero Wang disattivato perché sembrava una scarpata
  attraversabile. Ora `.` e `=` usano `grass_flat.png`/`path_flat.png` PixelLab.
- **Porte:** i warp outdoor->interno su porta entrano solo frontali dal tile sotto
  la porta; niente ingresso laterale alle case.
- **Domani:** rigenerare un vero Wang erba/sentiero piatto, oppure ridisegnare le
  mappe con dislivelli reali + scale/collisioni se vuoi mantenere la lettura da
  altura.
