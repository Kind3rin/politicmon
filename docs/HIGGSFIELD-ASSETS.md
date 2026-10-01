# Politicmon: risorse Higgsfield

Blocco completato il 1 ottobre 2026: sette sfondi di battaglia e un nuovo
sfondo titolo. Modello GPT Image 2.5, qualità high, risoluzione sorgente 1k.
Saldo osservato prima/dopo: 885,97 → 873,97 crediti; costo del blocco: **12**.

Secondo blocco: quattro vignette per scelte e promesse, **6 crediti**.
Saldo osservato: **873,97 → 867,97**. Totale dei primi due blocchi: **18 crediti**,
dodici immagini integrate. Storia, morale e fonti: [SATIRA-MORALE.md](SATIRA-MORALE.md).

Terzo blocco: **24 creature × quattro pose = 96 pose**, con GPT Image 2.5.
Costo di produzione: 36 crediti; confronto Grok scartato: 2 crediti.
Saldo osservato: **867,97 → 829,97**. Costo del blocco: **38 crediti**.
Totale dei primi tre blocchi: **56 crediti**.

Quarto blocco: le **28 specie rimanenti** (42 crediti) e **nove illustrazioni
dei boss** (13,5 crediti). Saldo osservato: **829,97 → 774,47**;
costo: **55,5 crediti**. Totale dei primi quattro blocchi: **111,5 crediti**.
Il roster completo ha **52 fogli / 208 pose**. Nessun acquisto o abbonamento attivato.

Quinto blocco: fondali per evoluzione e scheda squadra, vignetta caro carburante.
**4,5 crediti**, saldo **774,47 → 769,97**; spesa cumulativa **116 crediti**.
Tre PNG a 48 colori, **132.807 byte** complessivi. Provenienza e riproduzione:
`scripts/higgsfield-evolution-dossier.json` e `scripts/prepare-evolution-dossier.py`.
Integrazione e controlli: [EVOLUZIONI-SCHEDE.md](EVOLUZIONI-SCHEDE.md).

![Pose dei tre starter e delle evoluzioni](img/monster-frames.png)

Sesto blocco: **tre ambienti e trenta icone degli oggetti**, prodotte in cinque
fogli da sei elementi. Otto job GPT Image 2.5, qualità high, 1k. Costo **12**,
saldo **769,97 → 757,97**, cumulativo **128 crediti**. I 33 PNG nativi occupano
**200.066 byte**. `scripts/higgsfield-supplies.json` conserva provenienza e
parametri; `scripts/prepare-supplies.py --download` ricostruisce le risorse.
Controlli, gameplay e prove: [RISERVE-DIRETTIVE.md](RISERVE-DIRETTIVE.md).

![Preparazione delle lotte](img/supplies.png)

## Pose dei personaggi

Il roster animato copre tutte le 52 specie, comprese evoluzioni ramificate,
personaggi internazionali e creature dell'Atto 3. Ogni sorgente usa lo sprite
originale del progetto come riferimento, con controllo visivo di anatomia,
accessori, corna, ali e coda prima dell'integrazione.

Ogni sorgente è una griglia 2×2: riposo, attacco, preparazione e palpebre
chiuse. La conversione tecnica rimuove il fondo magenta, applica una scala
comune alle quattro pose e le allinea alla stessa base. Ogni PNG finale è
256×64, trasparente, con una palette di 48 colori condivisa. I 52 fogli
occupano **746.099 byte** complessivi, caricati dopo il primo frame.

I fogli sono usati nel renderer condiviso PVE/PVP e nei ritratti del
Politicdex. RIDUCI EFFETTI mantiene la posa di riposo. Un foglio assente o
con dimensioni errate torna al PNG originale, senza lasciare il campo vuoto.
Gli sprite originali restano disponibili per tutte le specie.

La prova GPT di Giorgetta è stata integrata e verificata prima di estendere
il roster. Il confronto Grok ha perso le corna ed è stato scartato. AutoSprite
era presente nel catalogo ma la generazione ha restituito tipo non supportato:
nessun job creato; la produzione usa i fogli GPT verificati.

`scripts/higgsfield-monster-frames.json` conserva crediti, job, URL, riferimenti
agli sprite del progetto, prompt e parametri. Gli originali sono in
`artifacts/premium/`; i fogli pubblici in `public/sprites/monsters/animated/`.

```sh
python3 scripts/prepare-monster-frames.py scripts/higgsfield-monster-frames.json
```

Il comando recupera gli originali mancanti e ricrea i fogli senza nuove
generazioni. La matrice `npm run shot:monster-frames` verifica 260 campioni,
renderer PVE/PVP, timer online, isolamento del salvataggio e fallback.

## Illustrazioni delle sfide

Nove scene originali introducono i boss nel briefing, dallo studio di Sua
Emittenza alla cattedrale dei server dell'Algoritmo Sovrano. I banner sono
224×78, opachi, a 48 colori, **74.155 byte** complessivi. La conversione
conserva l'inquadratura intera; testi e controlli sono disegnati dal gioco.
Partono nel preload differito e sono disponibili anche offline.

![Briefing e scelta del leader](img/boss-briefing.png)

`scripts/higgsfield-premium-next.json` conserva tutti i 37 nuovi job, parametri,
URL, destinazioni e saldo. Gli originali dei boss sono in
`artifacts/premium-next/`; i PNG pubblici in `public/sprites/ui/boss/`.

```sh
python3 scripts/prepare-boss-art.py
npm run shot:boss-briefing
```

Il controllo verifica 2.106 layout, annullamento dal mondo, rifiuto dei leader
KO, salvataggio del leader e avvio della battaglia reale senza consumo di PP
o anticipo delle ricompense. Uscire dal briefing libera anche lo stato occupato
del multiplayer.

![Titolo e sette ambienti nel gioco](img/higgsfield-ambienti.png)

## Risultato nel gioco

| Ambiente | Dove appare |
|---|---|
| Piazza | Borgo Urne, Mediopoli, Eurotown, capitale, Bruxelles, Campo Largo |
| Studio TV | Palestra TV, redazione, retropalco, terrazza diplomatica, talk show |
| Palazzo | Palazzo, Colle, Commissione e altri interni senza tema specifico |
| Costa | Stretto, Offshore, chiosco, bar sul mare, distretti Sud e Isole |
| Neve | Oblast del Meme |
| Rete | Futuro Anteriore, Genova Techno, capitale e Palazzo dei Feed |
| Grotta | Grotta del Consenso e Archivio di Stato |

I percorsi mantengono il prato PixelLab. Il selettore in
`src/game/battle/backdrop.ts` sceglie l'ambiente alla creazione della battaglia,
sia PVE sia PVP; i colori delle piattaforme seguono il tema. Gli sfondi partono
nel preload non bloccante. Se un PNG manca, si usa il prato originale; se
anche questo non è disponibile, il renderer disegna due fasce di colore.

La nuova schermata titolo lascia logo, starter animati e menu al renderer,
senza personaggi stampati nello sfondo. Il suo URL usa la versione della build.

I sette PNG di battaglia occupano **113.536 byte** complessivi, più **21.053**
per il titolo. Sono nativi 240×136 / 240×180, con 48 colori e nessun dithering.
La precache PWA include tutti gli asset; il service worker risolve gli URL
versionati anche al primo utilizzo offline, nella cache della stessa build.

Le vignette fermata, studio, molo e lavoro fuori camera occupano altri
**52.489 byte**, nativi 240×136 a 48 colori. Appaiono nelle sei scelte civiche;
il verbale illustra anche il menu MORALE.

![Scelte civiche e morale nel gioco](img/morale-satira.png)

## Provenienza e riproduzione

`scripts/higgsfield-assets.json` conserva progetto Higgsfield, job ID, URL
degli originali, prompt e parametri per ogni asset. Gli originali scaricati
restano in `artifacts/higgsfield/`, escluso da Git; i PNG pronti per il gioco
sono in `public/`.

Per ripetere la conversione, con Python e Pillow disponibili:

```sh
python3 scripts/prepare-higgsfield-assets.py --download
```

Il comando recupera solo gli originali mancanti e non richiede nuove generazioni
o crediti. Senza `--download` usa gli originali già presenti.

## Verifica

```sh
npm test
npm run build
# Con Vite dev in esecuzione sulla porta 5179:
npm run shot:battle-backdrops
npm run shot:morale-satire
# Con preview della build sulla porta 4180:
npm run smoke:pwa:release
```

Lo screenshot harness controlla otto campi PVE, un duello PVP, il titolo,
caricamento PNG e fallback per un asset mancante. Il test PWA rimuove le copie
versionate dalla cache e verifica che tutti i 109 asset siano recuperabili
dalla precache durante il reload offline Chromium/Pixel 7.

Politicdex, dossier, ritmo delle lotte e controlli sono documentati in
[GAMEPLAY-DEX.md](GAMEPLAY-DEX.md).
