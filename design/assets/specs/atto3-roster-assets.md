# PixelLab Asset Spec — Roster Atto 3

> **Status**: Rework required — recognizability gate
> **Art Bible**: `design/art/art-bible.md`
> **Manifest**: `design/assets/asset-manifest.md`

## Preset comune

- Output per specie: `96x96` PNG trasparente, frame `front` e `action`, pivot bottom-center invariato.
- Silhouette entro 88 px, leggibile a 24 px; 12–20 colori; outline blu notte 1 px; luce top-left.
- Pixel art cartoon RPG GBA, nearest-neighbor, forme ampie e volto leggibile.
- Caricatura pubblica riconoscibile, mai likeness realistica: preservare volto,
  capelli/espressione e un marker pubblico; corpo e silhouette restano mostruosi.
- Vietati testo, loghi, bandiere, fotorealismo e antialiasing.
- Prompt negative comune: `generic pokemon, anonymous animal face, mascot, text, letters, logo, flag, photorealism, smooth vector, antialiasing, blur, gradients, military realism, extra limbs, cropped feet`.

## ASSET-001 — SALISTROBO

- **File**: `public/assets/monsters/salistrobo.png`, `salistrobo_action.png`.
- **Riferimento**: Ilaria Salis. Marker obbligatori: capelli biondi mossi,
  sopracciglia/espressione combattiva, occhiali tondi ovale e sciarpa rossa.
- **Prompt front**: caricatura mostruosa atletica di Ilaria Salis da palco, volto
  umano-cartoon riconoscibile, corpo agile con gambe a molla, cuffie circolari e
  cavo-microfono come coda; navy, teal, corallo, avorio, oro.
- **Action**: salto in avanti, coda-microfono in arco, due onde ritmiche; piedi e pivot identici.
- **Must read**: volto di Salis + cuffie + cavo + gambe elastiche. **Avoid**:
  testa-schermo, robot anonimo, mascotte generica, scritte.

## ASSET-002 — SALISOUND

- **File**: `public/assets/monsters/salisound.png`, `salisound_action.png`.
- **Prompt front**: evoluzione mostruosa di Ilaria Salis, stesso volto biondo e
  combattivo, torso-impianto audio, woofer-braccia, gambe da runner, cuffie ad
  aureola e coda-microfono; navy, teal, corallo, oro, crema, viola.
- **Action**: pianta i piedi e proietta un cono sonoro dai woofer.
- **Continuità**: conservare cuffie e cavo di SALISTROBO; massa +35%, non mecha realistico.

## ASSET-003 — FUTURORSO

- **File**: `public/assets/monsters/futurorso.png`, `futurorso_action.png`.
- **Riferimento**: Roberto Vannacci; derivare visivamente dal VANNACCIX esistente.
  Marker: volto squadrato, capelli cortissimi grigi, sguardo severo, giacca formale.
- **Prompt front**: orso massiccio con volto caricaturale riconoscibile di Roberto
  Vannacci, orecchie e mappa rovesciata ereditate da VANNACCIX, mantello strappato,
  giacca teal geometrica e podio-valigetta.
- **Action**: colpo del podio al suolo, fogli astratti in uscita.
- **Must read**: ramo visivo, non sostituzione della famiglia. **Avoid**: simboli di partito, uniformi, tricolori.

## ASSET-004 — GIANIMAGO

- **File**: `public/assets/monsters/gianimago.png`, `gianimago_action.png`.
- **Riferimento**: Eugenio Giani. Marker: capelli argento pettinati lateralmente,
  viso largo sorridente, occhiali sottili e fascia/giacca istituzionale astratta.
- **Prompt front**: caricatura mostruosa anfibia di Eugenio Giani, volto largo e
  sorridente riconoscibile, corpo a goccia, cappello-parabola e bacchetta-antenna.
- **Action**: leva la bacchetta e produce una scintilla a forma di scheda astratta.
- **Avoid**: rana anonima, mago fantasy generico, volto realistico, testo televisivo.

## ASSET-005 — QUASIMAGIANI

- **File**: `public/assets/monsters/quasimagiani.png`, `quasimagiani_action.png`.
- **Prompt front**: nucleo anfibio a goccia, grande parabola, tre maschere-lobo, mantello-tenda e antenna; viola profondo, magenta polvere, teal, oro, crema, navy.
- **Action**: apre mantello e maschere, due illusioni semitrasparenti a pixel pieni.
- **Continuità**: goccia, parabola e antenna di GIANIMAGO. **Avoid**: blur/alpha morbido.

## ASSET-006 — CROSETTANK

- **File**: `public/assets/monsters/crosettank.png`, `crosettank_action.png`.
- **Riferimento**: Guido Crosetto. Marker: corporatura enorme, testa rasata/capelli
  cortissimi, barba e baffi scuri, sorriso deciso, completo blu.
- **Prompt front**: rinoceronte ministeriale corazzato con volto caricaturale
  riconoscibile di Guido Crosetto, massa rettangolare, spalle-scudo, corno a penna,
  leggio e cartellina.
- **Action**: postura di brace e timbro a terra, onda istituzionale geometrica.
- **Avoid**: armi da fuoco, mezzi militari realistici, medaglie o stemmi reali.

## ASSET-007 — FRATOCORNO

- **File**: `public/assets/monsters/fratocorno.png`, `fratocorno_action.png`.
- **Riferimento**: Nicola Fratoianni. Marker: capelli scuri ricci, barba corta,
  occhiali rettangolari e gesto da assemblea.
- **Prompt front**: capra da piazza con volto caricaturale riconoscibile di Nicola
  Fratoianni, capelli ricci che continuano nella lana a foglie, corna a parentesi,
  zoccoli larghi e megafono-fiore.
- **Action**: corna inclinate avanti, due archi di foglie collegati.
- **Must read**: supporto amichevole; evitare mascotte infantile generica.

## ASSET-008 — CAMPOCORNO

- **File**: `public/assets/monsters/campocorno.png`, `campocorno_action.png`.
- **Prompt front**: grande stambecco, corna ad arco protettivo, criniera di foglie e nastri, megafono-fiore evoluto; verde scuro, verde, crema, corallo, oro, navy.
- **Action**: zoccolo a terra, arco di corna e anello di foglie.
- **Continuità**: parentesi, fiore e lana vegetale di FRATOCORNO.

## ASSET-009 — NORDIODO

- **File**: `public/assets/monsters/nordiodo.png`, `nordiodo_action.png`.
- **Riferimento**: Carlo Nordio. Marker: capelli argento compatti, sopracciglia
  scure, occhiali sottili e sorriso trattenuto da giurista.
- **Prompt front**: dodo consultivo con volto caricaturale riconoscibile di Carlo
  Nordio integrato sopra un piccolo becco a pennino, corpo ovale, toga troppo
  grande, regolamento e sigillo di cera.
- **Action**: becca il regolamento e solleva due pannelli-regola astratti.
- **Avoid**: stemmi, testo leggibile, toga giudiziaria realistica.

## ASSET-010 — REFERENDODO

- **File**: `public/assets/monsters/referendodo.png`, `referendodo_action.png`.
- **Prompt front**: evoluzione dodo larga di Carlo Nordio, stesso volto argento e
  sopracciglia riconoscibili, becco a doppio pennino, toga stratificata, ali a
  parentesi, urna astratta, rotolo e sigillo.
- **Action**: timbra il rotolo e inverte due tessere-regola.
- **Continuità**: pennino, toga, rotolo e forma ovale di NORDIODO.

## QA per ogni generazione

1. Verificare canvas, alpha, pivot e dimensioni con validator automatico.
2. Ispezionare silhouette a 24 px e contrasto in battaglia chiara/scura.
3. Confrontare front/action: nessun salto di scala, palette o anatomia.
4. Controllo editoriale: tre marker pubblici riconoscibili, anatomia mostruosa,
   nessun testo/logo/bandiera e nessuna somiglianza realistica.
5. Esportare solo dopo approvazione visiva; registrare seed/versione PixelLab nel manifest.
