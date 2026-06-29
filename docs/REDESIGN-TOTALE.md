# Redesign TOTALE PixelLab — checklist (zero pixmap residuo)

Obiettivo utente: portare TUTTO su PixelLab, NIENTE pixmap residuo, come rifare
da zero. Audit completo fatto (workflow w72jr2nj3). Ogni voce: tool, dimensione,
viste, dove cablare. Spuntare quando FATTO+verificato in-game.

## Regole (sempre)
- Proporzioni giuste (conta i tile del blocco). Vista corretta (top-down/3-4
  COERENTE tra terreno/edifici/personaggi). Si muove→4 viste/walk; statico→1.
- Si fonde: niente bordi/box/bande. Verifica SEMPRE in-game, mai l'asset isolato.
- Anti-regressione: fallback al Pixmap finché il PNG non c'è.

## 1. TERRENO (priorità MAX — "mappa tutto vecchio")
Erba/sentiero/acqua/sabbia ora hanno PNG PixelLab agganciati; erba alta/fiori
restano overlay pixmap.
- [x] **Terreno base FATTO E VERIFICATO (R30)**: erba `.`/sentiero `=` usano un
  Wang FLAT PixelLab rigenerato (`wang_grass_path.png`, `transition_size:0`,
  lineless, low top-down) → il sentiero si fonde nell'erba allo STESSO livello,
  niente più mesa/scarpata. Riattivato in `drawWangTerrain`. I tile flat
  (`grass_flat.png`/`path_flat.png`) restano come fallback se il foglio non carica.
- [x] **Autotiling Wang acqua/sabbia FATTO E VERIFICATO**: acqua `w`/sabbia `z`
  (`wang_water_sand.png`) con bordi morbidi. `WANG_INDEX` calibrato dalla
  metadata = `[6,5,2,3,7,14,11,0,10,1,4,13,9,8,15,12]`.
- [ ] Erba alta `~`, fiori `,` come overlay trasparenti (ancora pixmap).
- [ ] Tile pieni roccia-grotta / marmo (tileset 6f6cd97e era FAILED; rigenerare).
  Il pavimento interno `p` ora usa `tiles/floor_wood.png` PixelLab-derived 16x16.
- [ ] Tileset Wang: rigenerare solo se resta piatto top-down. Il primo
  `wang_grass_path.png` è tenuto come asset storico ma NON agganciato.
- [ ] Tile pieni seamless (tileset 6f6cd97e: erba/sentiero/sabbia/roccia/pavimento/marmo).
- [ ] Acqua `w` animata 2 frame (water tileset).
- [ ] Erba alta `~` (overlay trasparente ciuffi) + fiori `,` (overlay).

## 2. INTERNI (grotta, case, negozi, bar, palazzo interno)
- [x] Tileset INTERNI: muro `A` (wall_interior) + pavimento `p` (floor_wood) — FATTO,
  verificato lab. Roccia/caverna estratti (cave_rock/cave_floor) per la grotta.
- [x] Arredi object-PNG: letto `L`, tavolo `t`, scaffale `b`, pianta `P`, bancone `h`,
  macchina `k` — FATTO (OBJECT_PNG).
- [ ] GROTTA `grotta1`: `A` ora = muro-pietra-interno (va bene-ish); idealmente
  cablare cave_rock.png per la roccia grotta (char `A` in contesto grotta) + tappeto `c`.
- [ ] Tappeto `c` (calpestabile) ancora pixmap.

## 3. STRETTO (tile meme unici)
- [ ] Impalcato ponte `j`, traliccio acciaio `J`, gru cantiere `K` (object/tile dedicati).
- [ ] Sabbia `z` (esiste sand.png non mappato), molo `j` legno/asfalto, acqua.

## 4. PALAZZO esterno
- [ ] `M` ha build_palace.png MA `C` colonna, `G` bandiera, `D` portone, `g` porta
  dorata sono pixmap → estendere il PNG palazzo o tileset marble-facade + porta dorata.

## 5. PERSONAGGI residui
- [ ] SCHETTINO al timone traghetto (NPC sopra ferry.png — ora pixmap).
- [ ] Avatar remoti MP (usano charSprite pixmap, non PNG).
- [ ] FERRY_PIX fallback / traghetto idealmente 4 viste.

## 6. MOSTRI residui
- [ ] MONSTER_ACTION_ART (frame bocca urlante, 8 specie) → PNG o riusare base PNG.
- [ ] BALLOT_ART (scheda pickup/cattura) → items/scheda.png (già esiste, agganciare in battle).
- [ ] BADGE_ART (medaglie 12x12) → icone PixelLab.

## 7. UI / HUD (tutto a codice)
- [ ] Barre HP / EXP / SONDAGGI → HP frame PixelLab cablato; restano EXP e
  SONDAGGI da portare su asset coerenti.
- [ ] Type-badge 8 tipi (TYPE_COLORS rect) → icone tipo (Types/Dex/Party/Teach/Battle).
- [ ] Icone stato (IND/SCA/GAF + simboli !$?) → icone.
- [ ] Freccia guida (triangolo) → icona freccia.
- [ ] Slot casinò (cabinet + simboli V/S/P/M/★) → asset slot.
- [ ] Tastiere Nickname/Chat (griglia tasti) → tasti/sfondo.
- [ ] Title: logo POLITICMON, filetto tricolore, podio/pedana → asset (lo sfondo è già AI splash).
- [ ] Nome-mappa tag, banner evento/BREAKING NEWS, targhetta veicolo → panel/banner.

## Ordine d'esecuzione (impatto visivo)
1. TERRENO + autotiling (la mappa "tutto vecchio") — PRIMA cosa.
2. INTERNI (grotta/case) — seconda mappa più vista.
3. STRETTO tile meme + palazzo esterno.
4. PERSONAGGI residui (Schettino/remoti).
5. MOSTRI residui (action/ballot/badge).
6. UI/HUD (barre/badge/type/slot/tastiere/title).
