# Piano redesign grafico PixelLab — Politicmon (Round 15)

Refactor completo della grafica da pixel-map testuali a sprite PNG generati con
PixelLab. Vincolo storico "grafica 100% da codice" abbandonato (scelta utente).

**Principio anti-regressione:** ogni asset PNG ha fallback al vecchio Pixmap
finché non è pronto/presente (`src/engine/assets.ts`). I save NON sono toccati.
Ogni task chiude con `npm run typecheck` pulito + screenshot di verifica.

## Stato infrastruttura (FATTO)

- `src/engine/assets.ts` — registry async PNG con fallback Pixmap.
- `Screen.imageSprite()` — disegna PNG con ancoraggio/flip/scala come `sprite`.
- `public/sprites/{monsters,tiles,chars,ui}/` — cartelle asset.
- `scripts/pixellab-monsters.json` — manifest prompt + objectId mostri.
- `scripts/pixellab-fetch.mjs` — download batch frame mostri (URL pubblici).

---

## TASK 1 — Mostri (30 specie) [IN CORSO: 6/30]

**Tool:** `create_1_direction_object` size 64, view sidescroller → frame_1.
**Output:** `public/sprites/monsters/<id>.png`.
**Integrazione:** `monsterImage()` + `MONSTERS_WITH_PNG` in `src/art/monsters.ts`;
`BattleScene.drawMonster` già cablato (anim procedurali preservate).
**Restano da cablare anche:** DexScene, PartyScene, BoxScene, TitleScene (podio),
EvolutionScene, WorldScene (overworld mon) — tutte usano `MONSTER_ART[id]`.
Sostituire con helper condiviso che prova il PNG e ricade sul Pixmap.

- [x] Infra + 6 mostri (salvinator, giorgiagon, ellyna, schleinix, renzino, grillix)
- [ ] Restanti 24 mostri (in coda/da generare)
- [ ] Cablare PNG in TUTTE le scene che disegnano mostri (non solo battaglia)
- [ ] Frame d'azione (bocca urlante) per starter/boss: opzionale, riusare base PNG

## TASK 2 — Player + NPC

**Tool:** `create_character` size 32, 8-dir, low top-down + `animate_character` (walk).
**Output:** `public/sprites/chars/player_<dir>.png` (+ frame walk).
**Integrazione:** WorldScene disegna l'avatar player da pixel-map → PNG per direzione.
Stesso per NPC (palette `npcDef.pal`): generare 1 character per archetipo
(trainer, professor, guard, journalist, influencer, kid, aide, boss, marinaio).

- [ ] Player 8-dir (in coda: b57a3bfe) + camminata
- [ ] ~9 archetipi NPC
- [ ] Cablare rendering avatar in WorldScene (player + remoti MP + NPC)

## TASK 3 — Tile terreno (texture-swap, NO autotiling Wang)

**Decisione:** NON riscrivere il renderer per Wang completo. Uso il tile "pieno"
di ogni tileset come texture 1:1 del tile attuale (1 char = 1 PNG 16px).
**Tool:** `create_topdown_tileset` (prendo il base tile pieno) o `create_tiles_pro`.
**Terreni:** erba `.`, erba alta `~`, sentiero `=`, acqua `w` (animata 2 frame),
sabbia `z`, pavimento interno `p`, roccia grotta, marmo palazzo, asfalto ponte `j`.
**Integrazione:** `src/art/tiles.ts` → `TILES[ch].pix` resta come fallback; aggiungo
un campo PNG opzionale e il renderer mappa prova il PNG.

- [ ] Tileset erba/sentiero [FATTO: generato, da cablare]
- [ ] acqua, sabbia, roccia, pavimento, marmo, asfalto
- [ ] Cablare nel renderer mappa (WorldScene draw tiles) con fallback

## TASK 4 — Oggetti mappa (overlay)

**Tool:** `create_map_object` (high top-down, transparent).
**Oggetti:** albero `T`, recinto `f`, segnale `s`, edifici (tetti case/lab/bar/
palestra/casinò/palazzo), porta `d`, veicoli (traghetto, auto blu, ruspa, monopattino).
**Integrazione:** overlay sopra il terreno (i tile `overlay:true` già esistono).

- [ ] albero, recinto, segnale, fiori
- [ ] edifici (riusare come tile multi-cella o 1 PNG per tetto)
- [ ] veicoli (traghetto/auto/ruspa/monopattino) sotto/accanto al player

## TASK 5 — UI / HUD

**Tool:** `create_ui_asset`.
**Pezzi:** cornice finestra messaggi (`Screen.panel`), box HP battaglia,
pannello menu pausa, cornice borsa/dex.
**Integrazione:** `Screen.panel` → opzione 9-slice PNG con fallback al disegno attuale.

- [ ] cornice dialog 9-slice
- [ ] box HP battaglia
- [ ] cablare in Screen.panel + BattleScene HUD

## TASK 6 — Icone oggetti

**Tool:** `create_map_object` 32px o `create_1_direction_object` piccoli.
**Output:** ~16 icone item (BORSA/SHOP), `src/art/items.ts`.
**Integrazione:** sostituire le pixmap 12x12 con PNG nelle liste.

- [ ] 16 icone item
- [ ] cablare in BORSA/SHOP/TeachScene

---

## REGOLA VISTE CARDINALI (obbligatoria — gameplay)

Ogni risorsa deve vedersi bene IN GIOCO a NORD/SUD/EST/OVEST.
- **Si muove / cambia direzione** (player, NPC, veicoli terrestri auto/ruspa/
  monopattino) → **4 viste N/S/E/O** (file `_south/_north/_east/_west.png`),
  generate con `create_character` (4-8 dir) o `create_8_direction_object`. MAI 1
  vista riusata per tutte le direzioni: si vede l'oggetto puntare sempre uguale.
- **Statico / frontale / vista unica** (mostri in battaglia, alberi, segnali,
  recinti, edifici, oggetti scena, icone, traghetto su acqua) → **1 vista** basta.
Prima di cablare un asset, CHIEDITI: "si muove e cambia verso? quante viste?
che dimensione in tile (16px)? si fonde col contesto (trasparenza/ancoraggio)?".

## REDESIGN TOTALE (richiesta utente: title, UI, menu, vignette, oggetti scena)

Domande-guida per OGNI asset (sempre): risoluzione/dimensione (tile 16px, mai
sforare 240x180), quante VISTE (overworld N/S/E/O; mostri/oggetti frontale-o-topdown),
animazioni (walk/idle/water), si fonde col contesto (trasparenza/ancoraggio/no box).

**Infra trasversale (alto impatto, una modifica → tutte le scene):**
- [x] `Screen.panel` ora supporta una cornice **9-slice** PixelLab (`nineSlice`,
  `setPanelImage`); `loadPanelImage` in assets la carica all'avvio (main.ts).
  Fallback al doppio-bordo GB finché il PNG non c'è. → cambia TUTTI i dialoghi/menu.
- [ ] Sfondo battaglia (oggi rect piatti) → backdrop PixelLab (in coda).
- [ ] Type-badge 8 tipi: restano rect colorati (a 11px un'icona perde leggibilità — basso ROI).

**Da rifare (catalogo completo in coda di lavorazione):**
NPC, icone item, erba alta (overlay), monopattino, casa, cornice dialog 9-slice,
sfondo battaglia. Edifici multi-tile = round dedicato (richiede rilevamento blocchi).

**EDIFICI — FATTI (round 15, aggiornamento finale):** building-PNG per tutti i
tipi principali, con rilevamento del blocco-tetto nel renderer (angolo alto-sx,
disegno in secondo passo dopo il terreno). Dimensioni gestite per tipo:
- case `r` / lab `u` / bar `e`/`Q` → 64x48 (4x3 tile)
- palestre `y`/`B`/`x` / casinò `$` → 96x48 (6x3 tile)
- palazzo `M` (capitale) → 160x64 (10x4 tile), porta-warp resta accessibile
Verificato in borgo, mediopoli, capitale. `isRoof()`/`buildingImage()` in tiles.ts.
RESTANO pixmap (decisione, basso ROI/alto rischio o satira tematica):
- **Ponte stretto** (j/J/K): cantiere satirico già tematico (asfalto+tralicci+gru) → LASCIATO.
- **Acqua/laghetto** (w): bordo squadrato; servirebbe autotiling Wang riva (rischio bande) → LASCIATO.
- Interni (pavimenti/mobili `p`/`b`/`t`/`k`/`L`/`P`), erba alta `~` → pixmap.

**EDIFICI — decisione iniziale (storica):** gli edifici (case `uuuu/mdnm`, lab, bar, palestre,
casinò, palazzo) sono blocchi multi-tile **tetto + facciata** di dimensioni che
VARIANO tra mappe. Due approcci valutati:
- *Building-PNG con rilevamento blocco*: disegnare 1 PNG sull'intero edificio.
  ALTO RISCHIO di regressione sul renderer mappa (core) + dimensioni non uniformi.
- *Tetti-tile seamless 16px*: sostituire solo i char tetto. Problema: la facciata
  (`mdnm`) resta vecchia → mismatch tetto/facciata.
Provati i tetti-tile seamless (tegole rosse/blu/verdi, tiles f8b28457). VERDETTO:
i tile tegola hanno bordi (transizione, non perfettamente seamless) e
striderebbero con la facciata `mdnm` vecchia (pixmap). → **EDIFICI = ROUND
DEDICATO**, NON cablati in questo round (evitato il rischio sul renderer mappa).
Serve: building-PNG COMPLETI tetto+facciata per ogni tipo (casa/lab/bar/palestra/
casinò/palazzo), con rilevamento del blocco-edificio nel render loop (gli edifici
sono blocchi ~4×3 tile di dimensione che varia tra mappe). Le facciate attuali
(porta `d`/finestra `n`/muro `m`) restano pixmap, già riconoscibili.

## Stato (aggiornato 2026-06-28)

- **TASK 1 mostri — FATTO 30/30.** Tutti gli sprite PixelLab scaricati e cablati
  in battaglia + dex/party/box/titolo/evoluzione/HUD (helper `drawMonsterSprite`).
- **TASK 1b cablaggio scene — FATTO.**
- **TASK 2 player — FATTO** (4 dir PixelLab, `playerImage`, 3 rami rendering).
  NPC: non fatti (restano pixmap parametrici).
- **TASK 4 oggetti — FATTO il core** (albero, segnale, recinto, fiori, traghetto).
  Edifici multi-tile + veicoli terrestri 4-dir: non fatti (basso ROI/complessi).
- **TASK 3 terreno — DECLASSATO.** Texture-swap senza autotiling Wang dà artefatti.
  Infra pronta, mapping quasi vuoto (solo fiori sparsi).
- **TASK 5 UI — NON fatto.** Il panel GBA attuale è già pulito (basso ROI).
- **TASK 6 icone item — NON fatto.** Icone 12px: PixelLab perde dettaglio a quella
  scala (basso ROI).

Le 3 aree ad alto impatto visivo (mostri, player, oggetti) sono complete. Il resto
è micro-polish a basso ROI: da fare solo se richiesto.

## Ordine di esecuzione

1. Finire TASK 1 (mostri) + cablare in tutte le scene → impatto massimo.
2. TASK 3 (terreno) + TASK 4 (oggetti) → la mappa cambia faccia.
3. TASK 2 (player/NPC) → il personaggio.
4. TASK 5 (UI) + TASK 6 (icone) → rifinitura.

Ogni task: genera async → scarica → cabla con fallback → typecheck → screenshot →
commit+push (deploy Vercel auto).
