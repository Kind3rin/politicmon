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
TILE_PNG è VUOTO. Erba/sentiero/erba-alta/fiori/acqua/sabbia girano su pixmap.
- [x] **Autotiling Wang FATTO E VERIFICATO**: erba `.`/sentiero `=` (wang_grass_path.png)
  e acqua `w`/sabbia `z` (wang_water_sand.png) con bordi morbidi. `WANG_INDEX`
  calibrato dalla metadata = `[6,5,2,3,7,14,11,0,10,1,4,13,9,8,15,12]` (vale per
  ENTRAMBI i fogli, layout identico). Verificato borgo + mare.
- [ ] Erba alta `~`, fiori `,` come overlay trasparenti (ancora pixmap).
- [ ] Tile pieni roccia-grotta / pavimento interno / marmo (tileset 6f6cd97e era
  FAILED; rigenerare). Il pavimento interno `p` e ancora pixmap.
- [ ] Tileset Wang: erba→sentiero, erba→acqua, sabbia→acqua, erba→sabbia
  (create_topdown_tileset, 16px). Esistono già `grass_path_wang.png` (non agganciato).
- [ ] Tile pieni seamless (tileset 6f6cd97e: erba/sentiero/sabbia/roccia/pavimento/marmo).
- [ ] Acqua `w` animata 2 frame (water tileset).
- [ ] Erba alta `~` (overlay trasparente ciuffi) + fiori `,` (overlay).

## 2. INTERNI (grotta, case, negozi, bar, palazzo interno)
- [ ] Tileset GROTTA: roccia `A` + pavimento caverna `p` (grotta1). MANCA del tutto.
- [ ] Tileset INTERNI: muro `A` + pavimento `p` (lab/gym/market/case/bar/palazzo/colle/casino).
- [ ] Arredi object-PNG ~32px ancorati basso: letto `L`, tavolo `t`, scaffale `b`,
  pianta `P`, bancone bar `h`, macchina/computer `k`, tappeto `c`.

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
- [ ] Barre HP / EXP / SONDAGGI → asset barra PixelLab (cornice+fill) o 9-slice.
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
