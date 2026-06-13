# ARCHITETTURA — Politicmon

Mappa dei moduli e dei flussi. Per dettagli operativi sintetici vedi `../CLAUDE.md`;
per ripartire da zero vedi `HANDOFF.md`.

## Stack tecnico

- **TypeScript + Vite**, output statico in `dist/`.
- **Canvas 2D puro**, risoluzione interna 240×180, scalata pixel-perfect (`image-rendering: pixelated`).
- **Zero dipendenze runtime** tranne `trystero` (multiplayer P2P WebRTC).
- `tsconfig.json` strict, `noUnusedLocals`/`noUnusedParameters` attivi → il codice morto fa fallire il typecheck.

## Albero dei sorgenti

```
src/
├── main.ts                 # entry: loop rAF, scene stack, audio unlock, PWA, init multiplayer
├── styles.css              # shell "console", controlli touch, banner PWA
├── engine/                 # infrastruttura indipendente dal gioco
│   ├── screen.ts           # Screen: rect/text/sprite/panel, cache sprite, fit-to-window
│   ├── font.ts             # bitmap font 5×7 (MAIUSCOLE + accenti), CHAR_W=6
│   ├── input.ts            # tastiera + touch (d-pad e levetta analogica)
│   ├── scene.ts            # SceneStack (push/pop/replace, transparent)
│   ├── audio.ts            # chiptune WebAudio, registry TRACKS per zona/battaglia
│   ├── controls.ts         # preferenze: levetta vs d-pad, modalità guidata
│   └── pwa.ts              # beforeinstallprompt + hint iOS, banner installazione
├── art/                    # grafica generata da codice (pixel-map testuali)
│   ├── monsters.ts         # caricature() + MONSTER_ART + MONSTER_ACTION_ART + BALLOT/BADGE
│   ├── characters.ts       # charSprite() personaggi 16×16, CHAR_PALETTES, remotePalId()
│   └── tiles.ts            # TILES (mappa char→tile), waterFrames
├── data/                   # contenuti di gioco (dati puri)
│   ├── species.ts          # 28 specie, RIVAL_COUNTER, STARTERS
│   ├── moves.ts            # 57 mosse, moveSummary()/moveKindLabel(), STATUS_*
│   ├── poltypes.ts         # 8 tipi + tabella efficacie (typeMultiplier)
│   ├── items.ts            # oggetti (ball/heal/cure/evo/tm/key), BAG_ORDER, SHOP_DIRECTIVES
│   ├── maps.ts             # MAPS (9), tile ASCII, warp, npc, pickup, encounter, music
│   ├── trainers.ts         # 21 allenatori fissi, BADGES, BADGE_TEASER
│   ├── quests.ts           # 18 quest (principali + side), currentQuest(), target per la guida
│   ├── encounters.ts       # WANDERERS (PG vaganti casuali) + scaling
│   ├── streetevents.ts     # STREET_EVENTS (eventi morale di strada)
│   └── rival.ts            # RIVAL_STAGES (GIANNI ricorrente) + team scalato
├── game/                   # logica e regole
│   ├── state.ts            # GameState, save/load localStorage (v6 + LEGACY_KEYS)
│   ├── monster.ts          # createMonster, statsOf, gainExp, evoluzioni, canLearnMove
│   ├── governo.ts          # SONDAGGI (add/bumpSondaggi), MINISTERI, prezzi, cura passiva
│   ├── vehicles.ts         # veicoli (monopattino/ruspa), bulldozed
│   ├── world/WorldScene.ts # IL CUORE: movimento, incontri, NPC, warp, HUD, rivale, multiplayer
│   └── battle/
│       ├── BattleScene.ts  # battaglia (coda di Step), animazioni, EXP, loot, milestone
│       └── sim.ts          # matematica gen-1: danno, tipi, crit, cattura, scelta mossa nemico
├── scenes/                 # scene UI (una per schermata)
│   ├── TitleScene, PauseScene, PartyScene, BagScene, ShopScene, DexScene
│   ├── GovScene            # assegnazione ministeri
│   ├── QuestScene          # missioni (lista scorrevole)
│   ├── TeachScene          # insegna mossa da DIRETTIVA
│   ├── StarterPreviewScene # anteprima animata starter
│   ├── CasinoScene         # slot + bunga bunga club
│   ├── NicknameScene       # tastiera a schermo per il nick online
│   └── ChatScene           # chat di zona + emote (multiplayer)
├── net/                    # multiplayer P2P
│   ├── mp.ts               # client Trystero (singleton mp), presence/chat/emote per mappa
│   └── profile.ts          # nickname persistente (localStorage)
└── ui/widgets.ts           # Menu, MessageBox (wrapText 36), drawHpBar, colori INK/PAPER/GREY
```

## Flussi principali

### Game loop (`main.ts`)
`requestAnimationFrame` → `stack.update(dt)` → `stack.draw(screen)` → `input.endFrame()`.
`dt` è blindato contro NaN. L'audio si sblocca al primo input (policy autoplay).

### Scene
Si parte da `TitleScene`. `start()` fa `stack.replace(WorldScene)`. Le scene UI
(pausa, party, borsa…) si fanno `push` sopra il mondo e `pop` per tornare.
`PauseScene` è `transparent` (vede il mondo sotto).

### Mondo (`WorldScene`)
- `loadMap(id)`: carica tile/npc, avvia musica, fade-in, aggiunge l'NPC rivale
  dinamico se è la sua tappa, entra nella room multiplayer (`mp.joinMap`).
- `onStepComplete()`: a ogni passo controlla, in ordine — warp, linea di vista
  allenatori, **incontro PG vagante**, **evento morale**, **incontro selvatico**.
  Invia anche la posizione al multiplayer (`mp.sendMove`).
- `draw()`: tile → pickup → NPC → **altri giocatori (remoti)** → player → HUD
  (nome zona, sondaggi, online, veicolo, obiettivo) → freccia guida → fade.

### Battaglia (`BattleScene`)
Coda di `Step` consumata in `update`. La matematica è in `sim.ts`. Alla vittoria:
EXP (con onda del consenso + DIVISA EQUA), level-up/evoluzioni, sondaggi
(`bumpSondaggi` → eventuale BREAKING NEWS), badge + teaser, reward fisso, **busta a sorpresa**.
Animazioni: `drawMonster` (idle/affondo procedurale + frame d'azione sui boss).

### Sondaggi e governo (`governo.ts`)
`addSondaggi` clampa 0-100. `bumpSondaggi` segnala il superamento soglie.
I ministeri danno bonus passivi (sospesi se il ministro è KO). Influenzano
prezzi (`shopPrice`), incontri (Min. Interno), exp, cura passiva, cattura.

### Multiplayer (`net/mp.ts`)
Singleton `mp`. P2P via Trystero (relay Nostr pubblici). Una room per mappa.
Messaggi: profilo, posizione, emote, chat. `update(dt)` interpola gli avatar
remoti. Se la rete non c'è, fallisce in silenzio (singleplayer regge).

## Convenzioni di estensione

- **Nuova specie:** sprite in `art/monsters.ts` + scheda in `data/species.ts` (stesso id) + eventuali mosse in `data/moves.ts`. Il Dex si aggiorna da solo.
- **Nuova mappa:** aggiungi i tile ASCII e l'entry in `MAPS`; ogni char deve esistere in `TILES`; le righe devono essere uniformi; npc/pickup/warp su tile non solidi.
- **Nuovo oggetto:** entry in `ITEMS` + id in `BAG_ORDER`; gestisci il `kind` in `BagScene`.
- **Nuova feature di stato:** campo in `GameState`, bumpa `SAVE_KEY`, aggiorna `parseState` e `LEGACY_KEYS`.

## Deploy

`npm run build` → `dist/` → `npx vercel --prod`. Nessun server. Le icone PNG si
rigenerano con `node scripts/gen-icons.mjs`. Il service worker (`public/sw.js`)
è cache-first sugli asset hashati, network-first sulle navigazioni.
