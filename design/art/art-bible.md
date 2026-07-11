# Politicmon — Art Bible

> **Status**: Approved baseline
> **Last Updated**: 2026-07-10
> **Pipeline**: PixelLab MCP → normalized PNG → manifest → in-game verification

## 1. Visual Identity Statement

**Caricatura politica riconoscibile trasformata in monster-RPG.** Il riferimento
pubblico e la creatura devono leggersi insieme: nessuno dei due puo diventare un
semplice umano chibi o un mostro fantasy generico.

- **Leggibilità prima della battuta**: a 240×180 funzione, porta, minaccia, reward
  e focus devono leggersi senza zoom.
- **Politico + mostro nello stesso colpo d'occhio**: anatomia non umana, ma volto,
  capelli/espressione e almeno un accessorio o gesto pubblico riconoscibili.
- **Teatro del compromesso**: facciata ordinata in primo piano, piccola
  contraddizione materiale sul fondo.
- **Meme modulare**: layout e creatura evergreen; riferimenti datati solo in
  poster astratti, skin, prop o tableau sostituibili.

Gate: silhouette comprensibile in tinta piatta e grayscale; test cieco interno
riconosce sia la specie sia il riferimento senza leggere il nome. Un asset con
solo costume/prop politico su volto animale generico e bocciato.

## 2. Mood, Atmosphere and VFX

Illuminazione dipinta, ombre corte alto-sinistra in 1–3 toni, niente PBR/bloom.

| Stato | Mood | Luce/palette | Energia |
|---|---|---|---|
| Esplorazione | curiosità civica | diurna calda, contrasto medio | misurata |
| Istituzioni | solennità leggermente fasulla | fredda, simmetrica, avorio/blu/oro | controllata |
| Comizio | entusiasmo costruito | palco caldo, pubblico ritmico | vivace |
| Battaglia | confronto TV-teatrale | fondale scuro, mostri saturi | scattante |
| Vittoria | sollievo/fanfara | crema/oro | 300–600 ms |
| Sconfitta | imbarazzo dignitoso | blu spento/viola polvere | quieta |
| Election | tensione studio TV | blu notte/oro, accenti stanza | crescente |

VFX a cluster pieni, 2–3 colori, 120–400 ms. Proibiti blur, alpha-noise, flash
fullscreen e shake ripetuto. Reduced motion: frame immediato/crossfade 0–100 ms.

## 3. Shape Language

- Politicmon: 70% forma primaria, 20% secondaria, 10% props.
- Campo: curve/aperture; centro: ovali/snodi; destra: triangoli/trapezi; civica:
  quadrati irregolari. È grammatica, non giudizio morale.
- NPC: testa/mani lievemente grandi, torso semplice, piedi stabili; una forma e
  un gesto firma. Boss con tre livelli di silhouette.
- Ambienti ortogonali e front-facing; curve per socialità/natura, rettangoli per
  istituzioni, diagonali solo per energia/pericolo.
- UI: pannelli cartacei regolari, doppio bordo, tab/cartellini, badge circolari,
  allarmi triangolari con pattern.
- Interattivi hanno contorno/contrasto/asimmetria maggiori dei props decorativi.

Gate: mostri distinguibili in 24×24 tinta piatta; porte/warp e NPC principali
riconoscibili senza colore.

## 4. Color System

| Colore | Hex | Ruolo |
|---|---|---|
| Avorio Carta | `#F4E6C1` | pannelli, luce, neutralità |
| Blu Istituzione | `#19324D` | bordi, contenitori, autorità |
| Oro Consenso | `#D3A62C` | focus, reward, milestone |
| Rosso Comizio | `#B9473F` | perdita/minaccia, mai fazione |
| Verde Piazza | `#4F7A52` | conferma/progresso |
| Turchese Feed | `#3F7F83` | informazione/calcolo |
| Viola Compromesso | `#76527C` | tensione/status |
| Inchiostro | `#172027` | testo/outline |

Testo: inchiostro/blu su avorio oppure avorio su blu; mai oro su avorio. Stato
sempre colore + icona + label + pattern. Rosso/verde hanno X/check e tratteggio;
oro/blu stella/scudo. Sprite principali 12–20 colori, tile/prop 6–12, massimo tre
shade per materiale, niente antialias o quasi-duplicati.

## 5. Character and Creature Direction

- Player neutro, contemporaneo, silhouette compatta; quattro cardinali + walk.
- Politicmon sono caricature-mostro, non persone chibi: anatomia non umana e
  somiglianza cartoon evidente. Conservare almeno tre marker: (1) volto o profilo,
  (2) capelli/barba/occhiali/espressione, (3) abito, gesto o prop pubblico.
- Il volto non deve essere realistico, ma non puo essere sostituito da muso animale,
  schermo, elmo o maschera anonima. La trasformazione mostruosa avviene soprattutto
  su corpo, arti, coda, ali, corna e silhouette.
- Evoluzione conserva due marker di famiglia e amplia forma/gesto, non accessori.
- NPC archetipici: giornalista diagonale/microfono, guardia blocco verticale,
  influencer telefono/posa, professore forma aperta.
- Mondo: 16–24 px visivi; dettaglio facciale solo ritratto/battaglia.
- Walk quattro frame/cardinale, pivot stabile; idle battaglia 1–2 px; action frame
  stessa canvas/anchor; nessuna interpolazione.
- Gag escluse: corpo, salute, famiglia, sessualità, etnia, religione, dettagli privati.

## 6. Environment and Level Art

- Terreno piatto 16×16; Wang soltanto se non sembra una scarpata passabile.
- Edifici front-facing su footprint multipli di 16, porta allineata al tile,
  nessuna ombra/terra baked oltre footprint.
- Percorso critico sempre visivamente libero di almeno un tile.
- Densità props: città 20–30% zone non camminabili; interni 15–25%; arene 10–20%.
- Un landmark per schermata, massimo due props satirici principali.
- Ogni stanza comunica promessa pubblica + contraddizione concreta.
- Testo essenziale sempre runtime; insegne asset soltanto simboli astratti.

Atto 3: marker foto e sedie eccessive; vecchio simbolo sotto vernice; tre pass e
una porta; prima pietra senza progetto; plastico perfetto/traghetto fermo; monitor
astratti; Palazzo simmetrico con cavi visibili.

## 7. UI/HUD Visual Direction

UI screen-space: avorio pieno, doppio bordo blu, ombra 1–2 px, focus oro con
chevron. Il bitmap 5×7 resta nearest-neighbor; gerarchia tramite spazio/pannello.

| Elemento | Budget |
|---|---:|
| Titolo card | 18 caratteri |
| CTA/menu | 16 |
| Nome NPC/mostro | 14 |
| Collegio su riga dedicata | 20 |
| Dialogo | 28–32 per riga, max 3 righe/pagina |

Riserva localizzazione +35%. Ellissi solo liste; scelte/formule vanno a capo o
paginano. Placeholder nominati e plural rules, niente concatenazione.

Icone 8/12/16 px, una metafora, max tre colori. TESO triangolo/tratteggio, ROTTO
crepa/X, RICONCILIATO cucitura/stella. Touch target almeno 44 CSS px; focus
visibile; B annulla. Blocchi verticali usano cursore Y, variabili `clipToWidth`.

## 8. Asset Standards and Pipeline

### Coordinate e formato

- Canvas logico 240×180, griglia mondo 16×16, coordinate/dest integer.
- `imageSmoothingEnabled=false`; no crop subpixel, rotazioni arbitrarie o bilinear.
- PNG-8 indexed se alpha binaria/palette ≤256, altrimenti PNG-32 RGBA sRGB 8-bit,
  non interlacciato, niente metadata/fringe/premultiplied alpha.

### Dimensioni normalizzate

| Categoria | Standard | Anchor/nota |
|---|---|---|
| Terrain | 16×16 opaco | edge-to-edge; Wang multipli di 16 |
| Prop | 16×16 o 32×32/multipli | bottom-center |
| Building | footprint esatto 64×32, 64×48, 96×48, Palazzo 160×64 | top-left, porta dichiarata |
| Player/NPC | canvas 32×32 | piedi `(16,31)`, 4 dir × idle+4 walk |
| Vehicle | canvas fisso per set | bottom-center, 4 dir |
| Monster battle | canvas 96×96 | silhouette ≤88×88, bottom-center; action stessa anchor |
| Icon | source 16×16 | display tipico 12×12 |
| UI 9-slice | dialog 48×48, border 12 | safe inset dichiarato |
| Battle background | 240×136 | crop esplicito, mai stretch |

File legacy 68–92 chars, 80–112 mostri e battle bg 256×160 sono input di
migrazione, non standard.

### Naming e manifest

Lowercase ASCII snake_case. Folder `tiles/`, `chars/`, `monsters/`, `items/`,
`ui/`; ID uguali al codice. Direzioni `north/east/south/west`, walk `w0..w3`.

`scripts/pixellab-reboot-assets.json` è autoritativo. Ogni record: id, dominio,
tool/provenance PixelLab, prompt/style ref, source/output dims/path, footprint,
anchor, direzioni/frame/fps, alpha, postprocess, checksum, stato
generated/reviewed/integrated/verified/rejected. Niente glob, duplicati o rejected
che soddisfano coverage.

### Performance budgets

- critical transfer ≤0,55 MiB; requests ≤100; decoded ≤1 MiB;
- all decoded ≤12 MiB; sprite compressi ≤1,25 MiB;
- first frame ≤1,30 s nel profilo baseline;
- rAF p95 ≤33,4 ms; zero frame >100 ms; gzip code ≤baseline +10%.

Preload solo terrain/building/player idle/UI; animazioni/NPC/veicoli/item/mostri
deferred. Superare budget richiede crop/atlas/lazy preload, non alzare baseline.

### Gates

Validator: PNG/dimensioni/opacity/alpha, anchor tolerance ≤1 px, frame completeness,
naming/case, provenance/checksum, duplicate/orphan, 9-slice seams, memory totals.
Comandi: `pixellab:coverage:strict`, sprite bounds, typecheck, build, perf check,
screenshot 390×844 DPR2 e device reale.

## 9. References and Prohibitions

| Reference | Take | Avoid |
|---|---|---|
| Pokémon FR/LG | gerarchia top-down e battle/menu | copia UI, palette, creature/layout |
| Stardew Valley | calore e cluster semplici | densità/perspective che falsano collisioni |
| EarthBound/Mother 3 | assurdo sincero e props ordinari | psichedelia continua |
| Paper Mario classico | staging teatrale e retroscena | look vettoriale/carta letterale |
| Grafica istituzionale/studi TV | moduli, timbri, urne, simmetria | loghi, partiti, fotomontaggi |

Proibiti: fotorealismo/sosia, propaganda, testo raster, loghi/bandiere reali,
neon terrain, prospettiva isometrica, blur/bloom/antialias, outline incoerenti,
dither rumoroso, props decorativi ambigui, flash/shake ripetuti e specie la cui
unica ragione è un singolo meme.
