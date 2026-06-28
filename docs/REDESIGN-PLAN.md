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

## Ordine di esecuzione

1. Finire TASK 1 (mostri) + cablare in tutte le scene → impatto massimo.
2. TASK 3 (terreno) + TASK 4 (oggetti) → la mappa cambia faccia.
3. TASK 2 (player/NPC) → il personaggio.
4. TASK 5 (UI) + TASK 6 (icone) → rifinitura.

Ogni task: genera async → scarica → cabla con fallback → typecheck → screenshot →
commit+push (deploy Vercel auto).
