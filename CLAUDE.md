# Politicmon — guida per lo sviluppo

Clone di Pokémon (stile GBA) a tema satira politica italiana. TypeScript + Vite,
canvas 2D puro, zero dipendenze runtime (tranne `trystero` per il multiplayer P2P).
Risoluzione interna 240x180 scalata pixel-perfect.

> **PixelLab reboot attivo.** Il vecchio vincolo "grafica tutta da codice" non vale
> piu per la grafica visibile: l'utente vuole rifare tutto in PixelLab da zero,
> mantenendo solo le logiche di gameplay. Vedi `docs/PIXELLAB-REBOOT.md`.

> **Nuova sessione?** Leggi prima `docs/HANDOFF.md` (stato, decisioni prese,
> trappole, storico). Poi `docs/ARCHITETTURA.md` per la mappa dei moduli e
> `docs/GLOSSARIO.md` per il lessico. Questo file resta la guida operativa rapida.

## Comandi

- `npm run dev` / `npm run dev:local` — dev server
- `npm run typecheck` — tsc --noEmit (obbligatorio prima di consegnare)
- `npm run build` — typecheck + bundle

## Architettura

- Scene stack (`src/engine/scene.ts`): le scene si impilano (Title → World → Battle → Party/Bag).
  `transparent: true` lascia visibile la scena sotto (es. PauseScene).
- Tutta la grafica è pixel-map testuale (`src/art/*`): stringhe dove ogni carattere
  mappa a un colore di palette; `Screen.sprite` le rasterizza con cache.
  I mostri usano l'helper `c(s, shift)` che centra le righe su 24 colonne (bottom-aligned).
- Il testo usa il bitmap font 5x7 (`src/engine/font.ts`), solo MAIUSCOLE + accenti italiani.
- Le mappe sono ASCII (`src/data/maps.ts`): un carattere = un tile di `src/art/tiles.ts`.
- La battaglia è una coda di `Step` (testo/azione/attesa barre HP) in `BattleScene`;
  la matematica è separata in `src/game/battle/sim.ts` (danno gen-1, tipi, cattura).
- SONDAGGI (0-100) e GOVERNO OMBRA vivono in `src/game/governo.ts`: gradimento che
  sale/scende con gli esiti (vittorie, sconfitte, catture, fughe) e 6 ministeri
  assegnabili ai membri della squadra con bonus passivi (soldi, incontri, prezzi,
  exp, cura, cattura). Il bonus si sospende se il ministro è KO.
- Evoluzioni: `Species.evolutions` è un array di `EvolutionRule` (per livello,
  per oggetto `item`, o ramificate con `minSondaggi`/`maxSondaggi` — la prima
  regola soddisfatta vince). La logica è in `src/game/monster.ts`
  (`levelEvolution`, `itemEvolution`, `evolve(mon, targetId)`).
- Mosse: apprese per livello (learnset, prompt di sostituzione in `BattleScene`)
  o tramite DIRETTIVE DI PARTITO (le "MT": item `kind:"tm"` con `moveId`,
  `reusable:true`). `canLearnMove(mon, moveId)` in `monster.ts` decide la
  compatibilità (stesso tipo della mossa o presente nel learnset). L'apprendimento
  fuori battaglia avviene in `src/scenes/TeachScene.ts` (dalla BORSA). Alcune
  direttive sono in vendita (`SHOP_DIRECTIVES` in `items.ts`), altre sono pickup
  o ricompense di palestra. Riepilogo mossa leggibile: `moveSummary`/`moveKindLabel`.
- Veicoli: `src/game/vehicles.ts`. MONOPATTINO (più veloce all'aperto) e RUSPA
  (abbatte gli alberi `T` davanti col tasto A; le coord finiscono in `state.bulldozed`,
  rese calpestabili da `tileAt`). Si sbloccano con NPC `vehicleGift` e si attivano
  ciclando la voce VEICOLO nel menu pausa (`state.vehicle`).
- Eventi morale: `src/data/streetevents.ts` (pool `STREET_EVENTS`). Camminando
  all'aperto può scattare un siparietto satirico che muove SONDAGGI/fondi
  (`WorldScene.checkStreetEvent`, cooldown a passi). Side quest opzionali in
  `quests.ts` con `side:true` (escluse dall'HUD da `currentQuest`); la `QuestScene`
  mostra la lista con finestra scorrevole.
- Bilanciamento trigger casuali (tarati per non interrompere troppo su mobile):
  `encounterRate` per zona — città-tutorial Borgo 0.10, route 0.14, grotta/oblast 0.16,
  città mid/late 0.18-0.20 (curva: town < route ≈ grotta ≤ città). PG vaganti
  prob 0.02/passo + cooldown (`checkWanderingChallenger`). **Eventi morale di strada
  DISABILITATI** (pool `STREET_EVENTS` resta in `streetevents.ts` ma non è più chiamato
  in `onStepComplete`). Cambiare questi numeri in `WorldScene`/`maps.ts` insieme.
- Retention/hook: cliffhanger post-medaglia (`BADGE_TEASER` in `trainers.ts`,
  mostrato in `BattleScene` dopo il badge), notifiche milestone SONDAGGI
  (`bumpSondaggi` in `governo.ts` segnala il superamento delle soglie 25/40/55/70/85
  con "BREAKING NEWS"), e loot a sorpresa ~30% post-vittoria allenatore
  (`LOOT_TABLE`/`rollLootDrop` in `BattleScene`, jackpot raro = TESSERA DORATA).
- Incontri PG casuali: `src/data/encounters.ts` (pool `WANDERERS`). Su strada
  all'aperto un PG vagante può fermarti; team scalato con `wandererLevel`, id
  `wander:*` (ripetibili, non salvati in `defeatedTrainers`). Cooldown a passi in
  `WorldScene.checkWanderingChallenger`.
- Animazioni battaglia: `BattleScene.drawMonster` applica idle (respiro
  squash/stretch via `Screen.sprite` scaleX/scaleY), affondo all'attacco e
  bagliore al level-up. Starter/leggendari hanno un frame d'azione (bocca
  urlante) in `MONSTER_ACTION_ART` usato durante l'affondo. Preview animata
  dello starter in `StarterPreviewScene`.
- EXP: `BattleScene.foeFaintedSteps`. ONDA DEL CONSENSO scala l'EXP coi SONDAGGI
  (+25% sopra 70%, -15% sotto 40%). DIVISA EQUA (item `kind:"key"`) condivide
  metà EXP con la squadra in panchina.
- Modalità guidata: freccia gialla verso `quest.target` (`WorldScene.drawGuideArrow`),
  toggle `GUIDA` nel menu pausa (`isGuideOn`/`toggleGuide` in `controls.ts`).
- CASINÒ: mappa interna `casino` (porta a Caput Mundi 21,11). `CasinoScene`
  con SLOT DEL CONSENSO (scommetti fondi, payout su tris/coppia) e BUNGA BUNGA
  CLUB (ingresso a pagamento, evento random che muove i SONDAGGI). NPC con flag
  `casino:true` apre la scena (come `shop`). Satira bonaria, niente esplicito.
- PWA install: `src/engine/pwa.ts` cattura `beforeinstallprompt`, mostra un banner
  HTML (`#pwa-banner`) e gestisce iOS (istruzioni manuali). Si autoesclude se già
  installata o dopo "Chiudi" (flag `politicmon-pwa-dismissed`).
- Multiplayer (presence + chat): 100% peer-to-peer via WebRTC con Trystero
  (`src/net/mp.ts`, singleton `mp`), scoperta peer su relay Nostr pubblici e
  gratuiti — NESSUN server proprio, nessun account, nessun costo. Una room per
  mappa (`map-<mapId>`): vedi solo chi è sulla tua stessa mappa. WorldScene chiama
  `mp.joinMap` in `loadMap`, `mp.sendMove` in `onStepComplete`, `mp.update(dt)`
  nell'update e disegna i remoti (avatar con palette derivata da `remotePalId`,
  nickname, emote) prima del player. Nickname in `src/net/profile.ts`
  (localStorage `politicmon-nick`), scelto con `NicknameScene` (tastiera a schermo).
  Chat di zona + emote in `ChatScene` (menu pausa → CHAT ONLINE). Se i relay/WebRTC
  non sono disponibili, il gioco resta in singleplayer senza crash.
- Rivale ricorrente GIANNI: `src/data/rival.ts` (`RIVAL_STAGES`). Dopo il primo
  scontro nel lab (`rivalWins` parte a 1), ti reintercetta a Mediopoli/Eurotown/
  Caput Mundi/Stretto con squadra scalata (`buildRivalStageTeam`: counter dello
  starter che evolve + riempitivi) e battute che ricordano gli scontri passati.
  L'NPC è aggiunto dinamicamente in `WorldScene.loadMap` via `rivalStageFor(rivalWins)`;
  `trainerForId` costruisce il TrainerDef "rival-*" al volo; la vittoria incrementa
  `rivalWins` e ricarica la mappa (rimuove l'NPC). `rivalWins` è in `GameState` (save v6).
- Salvataggio: JSON in localStorage (`src/game/state.ts`). MULTI-SLOT (3 slot):
  chiavi `politicmon-save-v13__sN` (+`.bak`), slot attivo in `politicmon-active-slot`.
  `saveGame`/`loadGame`/`hasSave`/`clearSave` operano sullo slot attivo (i ~70 call
  site non lo sanno). UI in `SlotScene` (da TitleScene: CONTINUA=load, NUOVA=new).
  Se cambi la forma di `GameState`, bumpa `SAVE_KEY_BASE` e aggiungi la vecchia a
  `LEGACY_KEYS` (migrano nello slot 0). Retrocompat mono-slot→s0 automatica.
- Storia: Atto 1 = 3 medaglie + PALAZZO; Atto 2 = mappa `colle` (porta dorata nel
  Palazzo, gated da flag `boss-beaten`), gauntlet della CONSULTA e GARANTE SUPREMO,
  poi leggendario DRAGHIMON. I warp supportano `requiresBadges` e `requiresFlag`.
  Area opzionale `stretto` (Ponte sullo Stretto, satira meme): raggiungibile solo
  con l'AUTO BLU a 3 medaglie, mini-boss IL CAPITANO (flag `ponte-beaten`).
- Musica: `audio.playMusic(nome)` con registry `TRACKS` in `src/engine/audio.ts`
  (tracce testuali melody/bass). Ogni mappa dichiara `music` in `MapDef`
  (default "borgo"); la battaglia sceglie da contesto in `battleMusic()`
  (wild/trainer/gym/boss/legend — i boss narrativi sono in `BOSS_TRAINER_IDS`).
  Cambiando mappa `loadMap` riavvia la traccia giusta.
- PWA: `public/sw.js` (cache-first sugli asset hashati, network-first sulle
  navigazioni), registrato in `main.ts` solo in PROD. Le icone PNG si rigenerano
  con `node scripts/gen-icons.mjs` (encoder PNG senza dipendenze).

## Convenzioni

- Italiano nei testi di gioco, satira bonaria senza riferimenti diffamatori.
- Niente asset binari scolpiti a mano: tutto generato da codice (le icone PNG
  in `public/` escono da `scripts/gen-icons.mjs`).
- Nuove specie: sprite in `src/art/monsters.ts` + scheda in `src/data/species.ts`
  (stesso id) + eventuali mosse in `src/data/moves.ts`; il Dex si aggiorna da solo.
- Verifica visiva: `node scripts/shot-stretto.mjs` (Playwright + dev server attivo)
  salva screenshot in `artifacts/screens/`.
