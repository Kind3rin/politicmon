# Kit di lancio — Politicmon

Testi pronti da copiare per pubblicare il gioco. Tono: **gancio satirico + sostanza tech**.
Link: gioco → https://politicmon.vercel.app · codice → https://github.com/Kind3rin/politicmon

**Asset orizzontali** (README, X, feed): `docs/img/title.png`, `docs/img/battle.png`,
`docs/img/world.png`, `docs/img/gameplay.gif` (battaglia animata 480×360, ~290KB).

**Asset verticali 9:16** (Reels / TikTok / Shorts / Storie / FB):
- `docs/img/social/reel-gameplay.mp4` — **video verticale 540×960, ~7s** pronto da caricare su TikTok / Reels / Shorts (nessuna conversione).
- `docs/img/social/reel-gameplay.gif` — stessa cosa in GIF (per X / FB / anteprima).
- `docs/img/social/poster-verticale.png` — locandina 1080×1920 (post singolo o cover).
- `docs/img/social/gameplay.mp4` — versione orizzontale 480×360 (per X / feed).

> ✅ Gli MP4 sono già pronti: caricali direttamente. Sono corti (~7s in loop) —
> ottimi come clip d'aggancio. Per un video più lungo/narrato, registra lo schermo
> mentre giochi (OBS / registrazione del telefono) e monta seguendo lo storyboard.
> Per rigenerare gli asset: `node scripts/make-social-vertical.mjs` +
> `node scripts/make-social-poster.mjs` (dev server attivo), poi `ffmpeg` per l'MP4.

---

## 🐦 X / Twitter

**Post principale (con GIF):**
> Ho fatto un clone di Pokémon a tema satira politica italiana. 🗳️
>
> Catturi 42 "Politicmon", scali i SONDAGGI (0-100%) e il tuo gradimento decide in cosa si evolvono: popolare → al governo, impopolare → in piazza a urlare.
>
> Browser, mobile, multiplayer P2P. Tutto in TypeScript, canvas 2D puro.
>
> 🎮 politicmon.vercel.app

**Thread tecnico (per dev):**
> 1/ Politicmon è scritto in TypeScript su canvas 2D puro. Zero engine, una sola dipendenza runtime (il P2P). Rendering, audio, battaglie, salvataggi: tutto a mano.
>
> 2/ Il multiplayer è 100% peer-to-peer via WebRTC su relay pubblici. Nessun server proprio → nessun costo che possa mai crescere, per quanti giocatori arrivino.
>
> 3/ La logica di battaglia (danno gen-1, tipi, cattura, sondaggi) è coperta da unit test headless in CI. La grafica è pixel art generata con PixelLab.
>
> Open source (AGPL-3.0): github.com/Kind3rin/politicmon

**Hashtag:** `#gamedev #indiedev #typescript #pixelart #Pokemon #satira`

---

## 📕 Reddit

**r/gamedev / r/incremental_games / r/webgames — Titolo:**
> I made a Pokémon-style RPG about Italian political satire — pure TypeScript, canvas 2D, P2P multiplayer, no engine

**Corpo:**
> Ciao! Ho passato mesi su **Politicmon**, un clone di Pokémon in stile Game Boy a tema satira politica italiana. Gira nel browser, si installa come PWA, ha un multiplayer peer-to-peer gratuito.
>
> **Cosa lo rende diverso da un clone qualsiasi:**
> - I **SONDAGGI** (0-100%) sono la stat-firma: muovono prezzi, esperienza e persino i rami evolutivi. La stessa creatura si evolve in modo diverso se sei popolare o impopolare.
> - 42 mostri, 70 mosse, 8 tipi, Governo Ombra con ministeri, storia in due atti.
> - Multiplayer P2P: duelli PvP, scambi di mostri, chat di zona e dialogo 1:1 — tutto senza server.
>
> **Lato tecnico** (per chi è del mestiere): TypeScript + canvas 2D puro, zero engine, **una sola dipendenza runtime** (Trystero per il P2P). Multiplayer WebRTC senza server. Logica di battaglia testata in CI. Grafica pixel art.
>
> 🎮 Prova: https://politicmon.vercel.app
> 💻 Codice (AGPL-3.0): https://github.com/Kind3rin/politicmon
>
> Feedback benvenuto — è la prima volta che lo mostro in giro.

> ⚠️ Nota: la satira è di fantasia, caricature senza intento diffamatorio.

---

## 📸 Instagram (Reel + caption)

**Asset:** posta `reel-gameplay.gif` (convertito in MP4) come Reel, oppure
`poster-verticale.png` come post singolo / cover.

> 🗳️ **POLITICMON** — il Pokémon della politica italiana
>
> Scegli il tuo starter (Destra 🔥 Sinistra 🐱 Centro 🦎), scala i SONDAGGI e cattura i 42 mostri più discussi del Paese.
>
> 📊 Popolare? Vai al governo. Impopolare? In piazza a urlare. **I sondaggi decidono chi diventi.**
>
> 🎮 Gratis, nel browser — link in bio
>
> #politicmon #pokemon #satira #pixelart #indiegame #videogiochi #politicaitaliana #gamedev #retrogaming #memes

**Prime 3 righe (l'hook che si vede senza "…altro"):** tienile forti — la battuta
starter + "i sondaggi decidono chi diventi" è il gancio.

---

## 🎵 TikTok (caption breve + hook parlato)

**Asset:** `reel-gameplay.gif` → MP4 verticale. Meglio ancora: uno screen-record di
30s mentre giochi una battaglia vera, con l'hook nei primi 2 secondi.

**Hook da dire/scrivere nei primi 2s** (scegline uno):
> "Ho fatto un Pokémon con i politici italiani."
> "In questo gioco i sondaggi decidono in cosa si evolvono i mostri."
> "Nessuno ha chiesto un Pokémon della politica italiana. L'ho fatto lo stesso."

**Caption:**
> Catturali tutti prima che ti tassino 🗳️ Gioca gratis nel browser (link in bio)
> #politicmon #pokemon #satira #italia #indiegame #pixelart #fyp #videogiochi

---

## 👍 Facebook

FB premia i post con immagine grande e poco testo iniziale. Usa `poster-verticale.png`
oppure `gameplay.gif`, e metti il link in fondo (non tagghi il primo commento).

> 🗳️ **Politicmon** — ho fatto un clone di Pokémon a tema satira politica italiana.
>
> Scegli il tuo starter tra Destra, Sinistra e Centro, giri l'Italia caricaturale e
> catturi 42 "Politicmon". La stat-firma sono i **SONDAGGI**: se sei popolare le tue
> creature si evolvono "al governo", se sei impopolare finiscono "all'opposizione".
>
> Gira nel browser, si installa come app, ha pure un multiplayer gratuito. È tutto
> gratis e open source.
>
> 👉 Gioca ora: https://politicmon.vercel.app
>
> (È satira di fantasia, caricature senza cattiveria 😄)

---

## 💼 LinkedIn (taglio portfolio/tech)

> Ho pubblicato **Politicmon**, un RPG in stile Pokémon a tema satira politica italiana — e questa volta condivido soprattutto il *come*.
>
> È scritto interamente in **TypeScript su canvas 2D puro**: nessun game engine, una sola dipendenza a runtime. Rendering, sistema di scene, motore di battaglia a turni, audio sintetizzato, salvataggi e multiplayer sono tutto codice del progetto.
>
> Un paio di scelte di cui vado fiero:
> → **Multiplayer 100% peer-to-peer** (WebRTC su relay pubblici): nessun server, quindi nessun costo che scala coi giocatori.
> → **Logica di gioco testata in CI** (danno, tipi, cattura, bilanciamento) con unit test headless.
> → **PWA installabile e offline**, mobile-first.
>
> 🎮 https://politicmon.vercel.app
> 💻 https://github.com/Kind3rin/politicmon (open source, AGPL-3.0)

---

## 🎬 Storyboard — trailer 30-40s

Musica: chiptune/8-bit allegra (es. da freesound o un generatore royalty-free). Voiceover IT opzionale.

| # | Durata | Video | Testo a schermo / VO |
|---|--------|-------|----------------------|
| 1 | 0-3s | Logo POLITICMON su sfondo scanline, i 3 starter che entrano (usa `title.png`) | **"Catturali tutti…"** |
| 2 | 3-5s | Cut alla tagline | **"…prima che ti tassino."** |
| 3 | 5-12s | GIF di gameplay: camminata nel mondo (Mediopoli, `world.png` → clip), banner AVVISTAMENTI | VO: *"Un clone di Pokémon a tema satira politica italiana."* |
| 4 | 12-20s | Battaglia: menu LOTTA, animazione mossa, barra HP che cala (`gameplay.gif`) | Testo: **42 mostri · 70 mosse · 8 tipi** |
| 5 | 20-27s | Zoom sulla barra SONDAGGI, split: freccia su → forma "governo", freccia giù → forma "opposizione" | VO: *"I sondaggi decidono chi diventi."* |
| 6 | 27-33s | Montaggio rapido: casinò, ponte, multiplayer (altri avatar sulla mappa) | Testo: **Mobile · PWA · Multiplayer P2P gratis** |
| 7 | 33-40s | Schermata finale: logo + URL grande | **politicmon.vercel.app** · *"Scendi in campo."* |

**Come girarlo senza tool complessi:**
1. Registra lo schermo mentre giochi (OBS gratis, o registrazione schermo del telefono per il mobile).
2. Cattura le clip chiave: intro, camminata, una battaglia intera, un'evoluzione, il casinò.
3. Monta in CapCut / DaVinci Resolve (entrambi gratis): taglia sui beat della musica, aggiungi i testi a schermo della tabella.
4. Esporta 1080×1080 (quadrato, per IG/feed) **e** 1080×1920 (verticale, per Reels/TikTok/Shorts).

Per generare altre clip animate come la GIF: `node scripts/make-launch-gif.mjs` (modifica la scena scriptata nello script per catturare mondo/evoluzione invece della battaglia).

---

## ✅ Checklist di lancio

- [ ] Repo pubblico con README accattivante + GIF (fatto)
- [ ] Pagina di presentazione (artifact / o deploy come pagina statica)
- [ ] GIF/screenshot pronti in `docs/img/`
- [ ] Post X + thread tecnico
- [ ] Post Reddit (r/webgames, r/gamedev, r/italygames)
- [ ] Reel/Short verticale da 30s
- [ ] Caption IG/TikTok
- [ ] (opzionale) Post LinkedIn taglio tech
- [ ] Aggiungi "topics" al repo GitHub: `game`, `pokemon`, `typescript`, `pixel-art`, `pwa`, `webrtc`, `satire`
