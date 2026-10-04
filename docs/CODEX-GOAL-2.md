# Politicmon: mandato 2 — profondità di mappa e di gioco

Sostituisce `CODEX-GOAL.md` come obiettivo attivo. Le regole di metodo di quel
file (slice prima dell'ampiezza, si gioca e non si certifica, budget
burocratico, niente acquisti Higgsfield) restano valide. Rileggi questo file a
ogni ripresa. Se contraddice `PIANO.md` o `REDESIGN-PLAN.md`, vince questo.

## STATO al 5 ottobre 2026 (leggi prima di ripartire)

Fatto e pubblicato: Fase 0 (interfaccia Tribuna su tutte le schermate a pannello, controlli `check:ui-panels` e `check:ui-flows`); Fase 1 (terreno, acqua, luce, camera); Fase 2 in parte (scarpate a salto su Percorsi 1-3, niente altezze a più livelli); Fase 4.1 (selvatici visibili con umore e vantaggio); Fase 5 in parte (intenzione dichiarata, posture per giocatore e allenatori, consegne, BUFERA).

Da fare: Fase 2 completa (strato `heights`, ponti a due livelli, scorci); Fase 3 (Borgo, Mediopoli, interni: livelli ridisegnati); Fase 4.2-4.6 (campo visivo dei capi, abitudini dei PNG, azioni dei compagni sulla mappa, carburante, eventi di strada); Fase 5.7-5.10 (capi a fasi, ribilanciare la durata delle lotte, IA più furba, duello in rete con le stesse regole: il duello PvP NON ha posture); Fase 6 (animazioni di mossa, regia, pubblico); Fase 7.

Script da riscrivere perché superati dall'interfaccia nativa: `check:first-campaign`, `check:world-layout`.

## 0. Dove siamo (verificato sul repo il 3 ottobre 2026)

Dopo il mandato 1 ci sono stati 20 commit. Quasi tutti riguardano **layout
portrait/PWA, comandi touch e rimozione di conferme**. È lavoro utile ed è
**chiuso**: non toccarlo più, salvo regressioni.

Quello che NON è cambiato, ed è il motivo per cui il gioco sembra piatto:

| Area | Stato reale | Prova |
|---|---|---|
| Mappa | Griglia 16 px a un solo livello. Erba e sabbia sono tinte unite con bordi a scalino, alberi solo come muro di cinta, nessuna ombra portata, nessun dislivello, nessuna acqua viva, niente da fare tra un punto e l'altro | `artifacts/viewport-after-mobile.png`, `src/data/maps/types.ts` (`tiles: string[]`, nessun campo altezza), `src/engine/worldCamera.ts` (13 righe, camera a pixel interi) |
| Incontri | Casuali nell'erba alta, invisibili | `EncounterEntry`, `encounterRate` |
| Lotta, regole | Clone del turno classico: 3 status, stage, priorità. `sim.ts` cambiato di 13 righe | `src/game/battle/sim.ts` |
| Lotta, novità | Polemica: contatore 0-3 che sblocca UNA mossa (40% PV). Eventi di campo: 3, in rotazione fissa | `polemica.ts` (41 righe), `fieldEvents.ts` (40 righe) |
| Lotta, aspetto | Sprite piccoli, HUD che copre metà scena, in portrait la lotta occupa un terzo dello schermo con il resto vuoto | `artifacts/viewport-baseline-battle.png` |

| Testi | Un solo carattere bitmap 5×7, tutto maiuscolo, interlinea 9 px (2 px d'aria), un solo peso. Titolo, dato e descrizione hanno lo stesso aspetto: non si capisce dove un blocco finisce e l'altro inizia | `src/engine/font.ts` (`LINE_H = 9`), `artifacts/career-earned-lesson.png` |
| Comandi e menù | Luca ha provato a giocare: macchinosi, non ci si orienta. Due sistemi sovrapposti (tela a 240 px + pulsanti HTML sotto) con stili diversi, grandi vuoti, azioni sparse | stessa schermata |

Conclusione: finora si è adattata l'interfaccia agli schermi, senza
riprogettarla. Questo mandato fa tre cose: **riprogetta comandi, menù e testi**
(Fase 0, per prima, perché oggi il gioco non si riesce a giocare volentieri),
poi cambia **il motore della mappa** e **le regole della lotta**.

## 1. Regole di questo mandato

1. **Niente più ritocchi a pezzi dell'interfaccia.** Commit come "adatta al
   portrait", "rendi diretto il tocco", "accorcia la ricevuta" sono vietati:
   hanno prodotto 20 commit senza che il gioco diventasse comodo. L'interfaccia
   si rifà **una volta, come sistema**, nella Fase 0; dopo, ogni schermata nuova
   usa quel sistema e basta.
2. **Ogni fase ha un prima/dopo visibile.** Salva 2 schermate nello stesso punto
   (`artifacts/m2/<fase>-prima.png`, `-dopo.png`). Se affiancate non si nota la
   differenza a colpo d'occhio, la fase non è chiusa.
3. **Una fase alla volta, nell'ordine sotto, partendo dalla Fase 0.** Non iniziare la successiva finché
   i criteri di uscita non sono veri.
4. **Slice di riferimento:** BORGO URNE → PERCORSO 1 → MEDIOPOLI. Tutto nasce
   lì; il resto delle 66 mappe si aggiorna solo nella Fase 7.
5. **Budget bundle.** Il limite attuale (358.163 byte gzip, 237 di margine)
   blocca qualsiasi funzione nuova. Alzalo una volta sola a **+120 KB** gzip per
   il codice, motivandolo in `CHANGELOG.md`. Gli asset PNG restano fuori dal
   bundle e vanno caricati per mappa, non tutti al boot.
6. **Prestazioni:** 60 fps su mobile medio. Tutto ciò che è statico (terreno,
   ombre, bordi) va **pre-renderizzato per mappa** su un canvas offscreen al
   caricamento; a ogni frame si disegnano solo strati animati e oggetti alti.
7. **Accessibilità:** ogni effetto animato rispetta `reduceEffects`.
8. **Salvataggi:** migrazione dalla v18 testata. Nessun salvataggio esistente
   deve restare bloccato da una mappa ridisegnata (riposiziona il giocatore sul
   punto sicuro più vicino).
9. Documentazione: una riga per fase nella tabella di `REDESIGN-PLAN.md`, voce
   in `CHANGELOG.md`, saldo in `HIGGSFIELD-ASSETS.md`. Nessun nuovo `.md` oltre
   a `docs/M2-DIARIO.md` (vedi §11).

## 1bis. Fase 0 — Comandi, menù e testi (per prima)

> **RIAPERTA il 4 ottobre 2026.** La prima consegna (kit `src/ui/kit/`) è stata
> provata da Luca su telefono: ingiocabile. Ha reso il testo nitido ma ha
> trasformato il gioco in un modulo web. **Leggi `docs/DESIGN-UI.md` prima di
> tutto:** contiene il verdetto, la direzione artistica, lo schema di ogni
> schermata, le regole numeriche e l'elenco delle regole qui sotto che sono
> ritirate. Dove i due file divergono vince `DESIGN-UI.md`. Bozze statiche
> prima del codice, e approvazione di Luca (`UI APPROVATA` in
> `docs/M2-NOTE-LUCA.md`) prima di migrare le scene.

Riscontro diretto di Luca dopo aver giocato: **i comandi e i menù sono
macchinosi e non ci si trova; i testi sono tutti attaccati, riga sotto riga,
non si capisce dove una cosa inizia e finisce, manca la formattazione.**
Trattalo come difetto bloccante.

Cause accertate nel codice:

- Un solo carattere 5×7 tutto maiuscolo, interlinea 9 px, un solo peso e una
  sola dimensione (`src/engine/font.ts`). Il maiuscolo continuo toglie la forma
  alle parole; senza gerarchia tutto pesa uguale.
- Le schermate sono disegnate a mano scena per scena con coordinate fisse
  (`screen.text(..., 31 + i * 9)`), quindi spaziature e allineamenti cambiano
  da una all'altra.
- Convivono due interfacce: la tela a 240 px e i pulsanti HTML sotto, con
  carattere, colori e logica diversi.

### 0.1 Testo leggibile

- [ ] **Risoluzione del testo.** Il testo non si disegna più a 240 px. Usa uno
      strato di testo ad alta risoluzione sopra la tela di gioco (stesso
      ingombro, pixel del dispositivo), così grafica pixel e testo nitido
      convivono. Vale per menù, dialoghi, schede e lotta.
- [ ] **Carattere.** Uno per i testi (leggibile, con minuscole e accenti
      italiani completi) e uno per titoli e numeri, entrambi incorporati per
      l'uso offline e con licenza libera. Il vecchio bitmap resta solo per
      insegne e dettagli dentro il mondo di gioco.
- [ ] **Minuscole.** Frasi in maiuscola/minuscola normale. Il tutto-maiuscolo è
      riservato a etichette brevi (massimo 2 parole) e nomi propri di specie.
- [ ] **Scala tipografica fissa, 4 livelli e basta:** titolo, sottotitolo,
      corpo, nota. Dimensione minima del corpo: 15 px CSS su telefono.
- [ ] **Interlinea** 1,4 per il corpo. **Spazio tra paragrafi** pari ad almeno
      mezza riga. **Mai più di 3 righe** di corpo senza uno stacco.
- [ ] **Lunghezza di riga** tra 28 e 45 caratteri; a capo sulle parole, mai
      parole spezzate, mai testo compresso in orizzontale.

### 0.2 Struttura dei contenuti

- [ ] **Ogni blocco ha un inizio e una fine visibili:** titolo, contenuto,
      margine. I blocchi si separano con spazio (almeno 12 px CSS) e, quando
      serve, con una linea sottile o un fondo diverso. Mai due blocchi a
      contatto.
- [ ] **Dati come coppie etichetta/valore allineate,** non frasi con barre.
      `SINISTRA / PP 15/15 / 100%` diventa tre voci: Tipo, PP, Precisione,
      ciascuna con etichetta in piccolo e valore in evidenza, sempre nello
      stesso ordine in tutto il gioco.
- [ ] **Icone e colore per i tipi:** ogni tipo ha il suo stemma e colore,
      usati ovunque compaia (mosse, schede, Politicdex, lotta).
- [ ] **Evidenza.** Una sola cosa in risalto per schermata (l'azione
      principale o il dato che cambia). Numeri che cambiano mostrano prima →
      dopo con freccia e colore.
- [ ] **Dialoghi:** nome di chi parla in una targhetta, testo su 2-3 righe
      ampie, indicatore chiaro di "continua", le scelte in un elenco separato
      dal testo. Il testo già letto non resta a schermo insieme al nuovo.
- [ ] **Elenchi:** una voce per riga con altezza generosa, selezione ben
      visibile, posizione nell'elenco indicata (3 di 12), intestazioni di
      gruppo quando le voci sono più di 7.
- [ ] **Riscrivi i testi mentre li impagini:** frasi corte, una idea per
      riga, niente abbreviazioni oscure. Glossario dei termini in
      `docs/GLOSSARIO.md` rispettato ovunque.

### 0.3 Un solo sistema di componenti

- [ ] Crea `src/ui/kit/` con i componenti unici: pannello, intestazione,
      scheda, elenco, riga etichetta/valore, pulsante, barra, targhetta,
      finestra di dialogo, finestra di scelta, avviso breve. Spaziature su una
      griglia di 4 px, raggio, bordi, colori e ombre definiti una volta.
- [ ] **Tutte** le 47 scene in `src/scenes/` e la lotta passano al kit. Vietato
      disegnare testo o riquadri con coordinate scritte a mano nelle scene.
      Aggiungi un controllo che fallisce se una scena chiama `screen.text`
      direttamente.
- [ ] **Una sola interfaccia,** non due: i comandi a pulsante e i pannelli a
      schermo usano lo stesso kit, lo stesso carattere e gli stessi colori.
- [ ] Riempi lo schermo: niente fasce vuote. Il contenuto si dispone
      sull'altezza disponibile, i comandi stanno in basso a portata di pollice.

### 0.4 Comandi

Prima di toccare il codice, scrivi nel diario l'**inventario dei comandi**:
per ognuna delle 12 azioni più frequenti (muoversi, parlare, aprire il menù,
scegliere una mossa, cambiare compagno, usare un oggetto, curarsi, salvare,
consultare la mappa, vedere la squadra, tornare indietro, saltare un testo)
quanti tocchi servono oggi e dove si trova il comando. Poi riprogetta:

- [ ] **Regole fisse in tutto il gioco:** un tasto conferma, uno torna
      indietro, sempre nello stesso punto e con lo stesso nome. "Indietro"
      chiude sempre un solo livello. Nessuna azione cambia posto tra una
      schermata e l'altra.
- [ ] **Movimento:** leva virtuale che compare dove appoggi il pollice
      (metà sinistra dello schermo), più tocco su una casella per andarci a
      piedi con percorso automatico. La croce fissa resta come opzione.
      Corsa attivabile con un tocco, non tenendo premuto due tasti.
- [ ] **Interazione a contesto:** quando sei davanti a qualcosa, il pulsante
      principale dice cosa farà (`Parla`, `Leggi`, `Entra`, `Raccogli`). Si può
      anche toccare direttamente il personaggio o l'oggetto.
- [ ] **Menù di pausa** con al massimo 6 voci grandi a icona, nell'ordine
      d'uso: Squadra, Borsa, Missioni, Mappa, Politicdex, Altro. Tutto il resto
      (rete, audio, salvataggi, archivi, opzioni) dentro `Altro`. Massimo 2
      livelli di profondità.
- [ ] **Accessi rapidi** sulla schermata di esplorazione: Squadra e Mappa a un
      tocco, senza passare dal menù.
- [ ] **In lotta:** le 4 mosse sono sempre visibili come schede grandi con
      tipo, potenza, PP ed efficacia prevista; le azioni secondarie (cambio,
      borsa, postura, mossa finale) in una fila sotto. Nessun sottomenù per
      scegliere una mossa. Tenendo premuta una scheda si apre il dettaglio.
- [ ] **Testi che scorrono:** un tocco completa la riga, il successivo va
      avanti. Velocità del testo regolabile, opzione "istantaneo".
- [ ] **Tastiera e controller:** stessa mappa di tasti ovunque, mostrata nella
      schermata comandi; i suggerimenti a schermo mostrano il tasto del
      dispositivo in uso.
- [ ] **Riscontro a ogni pressione:** stato premuto visibile, suono breve,
      vibrazione leggera. Area minima toccabile 44×44 px CSS.
- [ ] **Prima partita:** i comandi si imparano giocando nei primi 2 minuti, un
      gesto alla volta, senza pagine di istruzioni.

### 0.5 Uscita dalla Fase 0

- Affiancate, la vecchia e la nuova schermata di: dialogo, menù di pausa,
  squadra, scheda di un compagno, borsa, apprendimento di una mossa, lotta.
  In ognuna si distinguono a colpo d'occhio titolo, contenuto e azioni.
- Inventario dei comandi rifatto: ogni azione frequente a **massimo 2 tocchi**,
  nessuna oltre 3.
- Nessuna scena disegna testo fuori dal kit (controllo automatico verde).
- Prova su telefono in verticale e orizzontale e su computer con tastiera.
- `CONTROLLO UMANO RICHIESTO` nel diario: Luca deve poter giocare 10 minuti
  senza chiedersi quale tasto premere né rileggere una schermata.

**Asset (≈15 crediti):** stemmi dei tipi, icone del menù e della borsa, cornici
e fondi dei pannelli, in stile unico.

Tutte le fasi successive costruiscono le loro schermate **solo** con questo kit.

## 2. Fase 1 — Terreno vivo (motore di disegno)

Obiettivo: lo stesso PERCORSO 1, senza cambiare una casella, deve già sembrare
un altro gioco.

File: `src/game/world/WorldScene.ts` (estrai il disegno in un nuovo
`src/game/world/terrainRenderer.ts`), `src/art/tiles.ts`,
`src/data/maps/types.ts`.

- [ ] **1.1 Varianti deterministiche.** Per ogni terreno base (erba, sabbia,
      sterrato, asfalto, pavimento) 4 varianti scelte con hash di `(mapId,x,y)`.
      Niente più tinta unita. Sparpaglia dettagli non solidi (fiori, sassi,
      ciuffi, crepe, cartacce, volantini) con densità per mappa
      (`MapDef.scatter?: { kind: string; density: number }[]`).
- [ ] **1.2 Bordi morbidi (autotile).** Transizioni erba↔sabbia, erba↔acqua,
      strada↔marciapiede con maschera a 4 vicini (16 pezzi) più angoli interni.
      Nessun bordo a scalino visibile.
- [ ] **1.3 Ombre portate.** Ogni oggetto alto (albero, edificio, palo, NPC,
      veicolo) proietta un'ombra obliqua semitrasparente verso sud-est, cotta
      nello strato statico. L'ombra ellittica ai piedi resta per i personaggi.
- [ ] **1.4 Chiome sopra il giocatore.** Gli alberi diventano due parti: tronco
      (solido, ordinato per Y) e chioma (disegnata sopra tutto, non solida per
      la riga superiore). Il giocatore passa dietro e la chioma diventa
      semitrasparente quando lo copre.
- [ ] **1.5 Acqua e vento.** Acqua animata a 4 fotogrammi con riflesso della
      riva e schiuma sul bordo; erba alta che oscilla e si piega al passaggio;
      2-3 tipi di particelle ambientali per mappa (foglie, polvere, volantini,
      gabbiani in ombra).
- [ ] **1.6 Luce.** Tinta globale per fascia oraria dell'orologio reale (alba,
      giorno, tramonto, notte) con finestre e lampioni che si accendono di
      notte. Meteo per mappa (`MapDef.weather?: "sereno"|"pioggia"|"nebbia"|"afa"`)
      con effetto visivo e, dalla Fase 5, effetto in lotta.
- [ ] **1.7 Camera.** Inseguimento con interpolazione e leggero anticipo nella
      direzione di marcia; scossa breve su urti e incontri; avvicinamento del
      10% durante i dialoghi importanti. Le coordinate di disegno restano
      intere per non sfocare i pixel.
- [ ] **1.8 Passi.** Polvere sullo sterrato, schizzi sul bagnato, impronte che
      svaniscono sulla sabbia, suono del passo per tipo di terreno.

**Asset Higgsfield (≈35 crediti):** fogli di varianti e bordi per 5 terreni,
chiome/tronchi separati, acqua a 4 fotogrammi, set di dettagli sparsi.

**Uscita:** prima/dopo di PERCORSO 1 e BORGO; 60 fps misurati con
`perf:check`; `reduceEffects` spegne vento, particelle, scossa e meteo.

## 3. Fase 2 — Dislivelli e verticalità

Obiettivo: la mappa smette di essere un foglio.

- [ ] **2.1 Altezza.** Secondo strato dati opzionale `MapDef.heights?: string[]`
      (cifra 0-3 per casella, stessa griglia di `tiles`). Il disegno alza le
      caselle di 6 px per livello e disegna la parete di scarpata sul bordo sud.
- [ ] **2.2 Regole di movimento.** Tra livelli diversi si passa solo da scale o
      rampe. **Salto dal gradone**: si scende di un livello verso sud con un
      saltello animato, non si risale. Collisioni e test aggiornati.
- [ ] **2.3 Ponti e sottopassi.** Caselle a due livelli: si cammina sopra il
      ponte o sotto l'arcata secondo il livello da cui si arriva.
- [ ] **2.4 Scorci.** Su ogni rilievo, un punto panoramico con fondale a
      parallasse (colline, skyline di MEDIOPOLI, mare) visibile oltre il bordo.
- [ ] **2.5 Edifici con volume.** Tetto e facciata con ombra, insegna leggibile,
      porta che si apre, interno visibile dalla finestra di notte.

**Asset (≈25 crediti):** scarpate e scale per 3 ambienti, 2 ponti, 3 fondali a
parallasse.

**Uscita:** PERCORSO 1 ha almeno 3 livelli, 2 gradoni, 1 ponte e 1 scorcio, e
si attraversa in entrambe le direzioni senza blocchi (test di percorribilità
automatico da ogni ingresso a ogni uscita).

## 4. Fase 3 — Ridisegno dei livelli della slice

Ora che il motore regge, ridisegna le tre mappe. Regole di level design,
vincolanti:

- Mai più di **10 caselle** in linea retta senza un bivio, un oggetto, un
  ostacolo o una vista.
- Ogni mappa esterna ha: **1 punto di riferimento** riconoscibile da lontano,
  **1 deviazione** con premio, **1 scorciatoia** che si sblocca dopo (gradone,
  cancello, barriera da abbattere con la ruspa), **1 segreto** non segnalato,
  **1 attività** propria (vedi §6).
- Il percorso principale si capisce senza frecce: lo guidano strada, luce e
  composizione. La freccia guida resta solo nei primi 3 minuti.
- Larghezze variabili: strettoie, slarghi, una piazza. Niente corridoi di
  larghezza costante.
- Gli alberi non sono più solo cornice: boschetti attraversabili, radure,
  filari.

Mappe:

- [ ] **3.1 BORGO URNE.** Paese in salita: piazza col municipio in alto, vicoli,
      lavatoio, bar con dehors, cantiere eterno transennato, benzinaio col
      cartello dei prezzi che cambia. 6 PNG con una riga nuova a testa e 2 con
      micro-missione da un minuto.
- [ ] **3.2 PERCORSO 1.** Strada provinciale con buche, campo coltivato,
      boschetto, torrente con guado e ponte crollato "in ripristino dal 2011",
      rotonda con monumento inutile, autovelox finto, area di servizio.
      Ingresso della grotta su un livello rialzato.
- [ ] **3.3 MEDIOPOLI.** Città a quartieri distinti: centro con studi TV,
      periferia con palazzoni, zona cantieri. Traffico, semafori, cartelloni
      elettorali che cambiano con il sondaggio del giocatore.
- [ ] **3.4 Interni** dei tre luoghi più visitati con profondità: parete di
      fondo, oggetti in primo piano che coprono il giocatore, luce dalle
      finestre.

**Asset (≈60 crediti):** edifici e arredi propri di ciascuna mappa, 10 PNG
direzionali, monumenti, veicoli di passaggio.

**Uscita:** un giro completo della slice dura 8-12 minuti e nel diario ci sono
almeno 12 "cose da notare" elencate, tutte raggiungibili.

## 5. Fase 4 — Mondo che reagisce

- [ ] **4.1 Incontri visibili.** I Politicmon selvatici si vedono sulla mappa
      (2-5 per zona di erba, rigenerati fuori schermo). Comportamenti per
      specie: fugge, insegue, tende agguati, dorme, cammina in gruppo.
      Avvicinarsi alle spalle dà il primo turno; farsi sorprendere lo toglie.
      L'incontro casuale resta solo in grotta e in acqua. Aggiorna
      `encounters`, bilanciamento del reclutamento e test.
- [ ] **4.2 Allenatori con campo visivo disegnato** (cono leggero) e reazione
      animata; si possono aggirare usando dislivelli e boschetti.
- [ ] **4.3 PNG con abitudini.** Orari (mattina al bar, sera in piazza), reazioni
      al tuo sondaggio e alle tue scelte civiche, battute che cambiano dopo gli
      eventi. Almeno 2 righe alternative per PNG della slice.
- [ ] **4.4 Azioni sul campo dei compagni.** Il capofila ti segue sulla mappa.
      Ogni tipo ha un'azione: abbattere una transenna, convincere una guardia,
      attraversare un guado, leggere un documento secretato, corrompere un
      usciere. Sono le chiavi di scorciatoie e segreti della Fase 3.
- [ ] **4.5 Caro carburante.** I veicoli consumano. Prezzo alla pompa che varia
      per mappa e per giorno, coda al distributore, accise come battuta
      ricorrente. A secco si va a piedi, mai blocco totale. Il viaggio rapido
      costa carburante: decidere dove andare diventa una scelta.
- [ ] **4.6 Eventi di strada.** Uno ogni 2-3 minuti, breve e facoltativo:
      sciopero che chiude una via, corteo che ti trascina, troupe TV che ti
      intervista (scelta con effetto sul sondaggio), gazebo, posto di blocco.

**Uscita:** in 10 minuti di gioco non passano mai 90 secondi senza che succeda
qualcosa di nuovo sulla mappa.

## 6. Fase 5 — Lotta: regole nuove

Obiettivo: ogni turno contiene una decisione vera. Oggi la scelta ottimale è
quasi sempre "la mossa super efficace".

File: `src/game/battle/sim.ts`, `tactics.ts`, `polemica.ts`, `fieldEvents.ts`,
`src/data/moves.ts`, `roster.json`, `BattleScene.ts`.

- [ ] **5.1 Intenzione dichiarata.** Sopra il nemico compare cosa farà nel
      prossimo turno (attacco forte, difesa, status, cambio, carica). Alcuni
      avversari bluffano, e lo si impara. Questo è il perno: rende sensate
      difesa, cambio e tempismo.
- [ ] **5.2 Due risorse invece di una.** `CONSENSO` (sale colpendo bene e
      resistendo) e `POLEMICA` (sale con status, provocazioni e subendo colpi).
      Ogni specie ha **una mossa finale propria** che consuma una delle due,
      con animazione e battuta. Niente più un unico FUORIONDA uguale per tutti.
- [ ] **5.3 Posture.** Oltre alle 4 mosse, ogni turno una postura gratuita:
      `ATTACCA` (+danno, -difesa), `SMENTISCI` (dimezza e annulla lo status in
      arrivo), `TEMPOREGGIA` (recupera PP e risorsa). Sasso-carta-forbice
      leggibile contro l'intenzione dichiarata.
- [ ] **5.4 Combinazioni di status.** Da 3 a 6 status, con reazioni a coppie:
      `SCANDALO` + `GAFFE` → `BUFERA` (danno a tempo e sondaggio in calo),
      `INDAGATO` + `IMMUNITÀ` → annullati con battuta, e così via. Tabella
      delle reazioni consultabile in lotta con un tocco.
- [ ] **5.5 Staffetta.** Cambiare compagno non è un turno perso: chi entra
      eredita un bonus dal tipo di chi esce (una volta per lotta per coppia).
      Le coppie sinergiche sono elencate nella scheda squadra.
- [ ] **5.6 Campo di battaglia.** Il luogo conta: in piazza il CONSENSO sale più
      in fretta, in studio TV gli status durano di più, sotto la pioggia le
      mosse di tipo comizio calano. Eventi di campo da 3 a 12, scelti a caso
      pesato e non in rotazione, annunciati un turno prima.
- [ ] **5.7 Capi a fasi.** Ogni capo ha 2 fasi, un trucco riconoscibile e un
      punto debole che si scopre giocando o parlando con i PNG. Rifai i 3 capi
      della slice.
- [ ] **5.8 Lotte brevi.** Bersaglio 4-6 turni contro selvatici, 8-12 contro
      capi. Ribilancia PV e danni con `balance:bosses` e le simulazioni.
- [ ] **5.9 Avversario all'altezza.** `tactics.ts`: l'IA usa posture, staffetta
      e risorse; tre livelli (prudente, aggressiva, furba). Nessun turno a
      vuoto.
- [ ] **5.10 Duello in rete** (`duelsim.ts`, `PvpBattleScene.ts`): stesse
      regole, scelte simultanee, anti-imbroglio aggiornato.

**Uscita:** 20 lotte giocate a mano nella slice; in almeno 15 la mossa migliore
non era la stessa in due turni consecutivi. Annota i casi nel diario.

## 7. Fase 6 — Lotta: spettacolo

- [ ] **6.1 Inquadratura.** Sprite grandi almeno il doppio, HUD ridotto a due
      barre sottili ai bordi. In portrait la scena occupa tutta l'altezza
      disponibile, con i comandi sotto: nessuna fascia vuota.
- [ ] **6.2 Regia.** Ingresso animato dei contendenti, camera che stringe sul
      colpo, fermo-immagine di 80 ms sull'impatto, scossa proporzionale al
      danno, numeri grandi che rimbalzano, lampo sul critico, rallentatore sul
      colpo finale.
- [ ] **6.3 Animazioni di mossa.** Una animazione riconoscibile per ciascuna
      delle mosse più usate (almeno 30), le altre per famiglia di tipo. Le mosse
      satiriche hanno la loro gag visiva (il microfono aperto, il tweet delle
      3 di notte, il decreto che si arrotola).
- [ ] **6.4 Fondali a strati** con parallasse e pubblico che reagisce (applausi,
      fischi, telefoni alzati) in base a CONSENSO e POLEMICA.
- [ ] **6.5 KO, vittoria, reclutamento, evoluzione:** quattro momenti brevi e
      diversi, ciascuno con animazione, suono e battuta propri.
- [ ] **6.6 Audio:** suoni d'impatto per tipo, stacco musicale al cambio fase
      del capo, motivo breve per la mossa finale.

**Asset (≈110 crediti, la voce più grande):** fogli d'animazione per i
contendenti della slice (attacco, colpo subito, KO, finale), effetti di mossa,
fondali a strati, pubblico.

**Uscita:** prima/dopo della stessa lotta; una lotta contro selvatico dura
30-60 secondi.

## 8. Fase 7 — Estensione a tutto il gioco

- [ ] **7.1** Applica motore di terreno, altezze e regole di level design alle
      altre mappe, **una regione per commit**, nell'ordine della campagna.
      Ogni regione riceve identità propria: palette, meteo, attività, un
      comportamento di selvatici, un evento di strada.
- [ ] **7.2** Mosse finali e sinergie di staffetta per tutte le 52 specie.
- [ ] **7.3** Capi a fasi per tutti i capi.
- [ ] **7.4** Elimina il codice e gli asset rimasti senza uso (vecchio disegno
      del terreno, incontri casuali di superficie, FUORIONDA unico, eventi in
      rotazione). Nessun doppio sistema.
- [ ] **7.5** Giro completo di una campagna nuova dall'inizio alla fine.

## 9. Crediti Higgsfield

Leggi il saldo reale con lo strumento `balance` prima di iniziare e scrivilo
nel diario. Ripartizione del saldo disponibile (se è inferiore a 300, scala in
proporzione; lascia sempre 10 crediti di riserva):

| Voce | Quota |
|---|---|
| Lotta: animazioni, effetti, fondali, pubblico (Fase 6) | 37% |
| Edifici, arredi e PNG della slice (Fase 3) | 20% |
| Icone, stemmi dei tipi, cornici dei pannelli (Fase 0) | 5% |
| Terreni, bordi, chiome, acqua (Fase 1) | 13% |
| Scarpate, ponti, fondali a parallasse (Fase 2) | 9% |
| Estensione alle altre regioni (Fase 7) | 12% |
| Correzioni e rigenerazioni | 4% |

Lotti piccoli, guarda ogni immagine prima di convertirla, rigenera solo ciò che
non regge. Stile unico: stessa palette, stesso contorno, stessa direzione della
luce (da nord-ovest, coerente con le ombre della Fase 1). Un foglio di stile di
riferimento generato per primo e allegato a ogni richiesta successiva.

## 10. Prove

- Test esistenti verdi; aggiorna quelli che codificano le regole vecchie.
- Nuovi test solo per: percorribilità delle mappe con altezze, reazioni tra
  status, intenzione dichiarata coerente con l'azione, migrazione salvataggi.
- `perf:check` a ogni fase.
- A fine fase, gioca davvero la slice nel browser con input reali.

## 11. Diario e punti di controllo

Un solo file, `docs/M2-DIARIO.md`, massimo 15 righe per fase:

```
## Fase N — <nome> — <data>
Prima/dopo: artifacts/m2/...
Cosa si nota subito: (3 righe, verificabili da un umano)
Cosa ancora non convince: (3 righe)
Crediti: saldo prima → dopo
Commit: <hash>
```

Dopo le Fasi 0, 1, 3, 5 e 6 scrivi in cima al diario `CONTROLLO UMANO RICHIESTO`
con le schermate da guardare, poi prosegui con la fase successiva senza
attendere. Se Luca lascia note in `docs/M2-NOTE-LUCA.md`, leggile all'inizio di
ogni fase: hanno la precedenza su questo piano.

## 12. Condizione di fine

Tutte vere:

- Ogni schermata usa il kit unico; i testi hanno gerarchia, minuscole, aria
  tra i blocchi e si leggono senza sforzo su telefono.
- Ogni azione frequente richiede al massimo 2 tocchi e i comandi sono gli
  stessi in tutto il gioco.
- Affiancando una schermata di oggi e una nuova della stessa mappa, chiunque
  dice che sono due giochi diversi.
- Nessuna mappa esterna è a un solo livello né ha terreni a tinta unita.
- I selvatici si vedono sulla mappa e si comportano in modi diversi.
- In lotta il nemico dichiara l'intenzione, ci sono due risorse, posture,
  reazioni tra status, staffetta e mosse finali per specie.
- Una lotta contro selvatico dura 30-60 secondi; i capi hanno due fasi.
- La scena di lotta riempie lo schermo in portrait.
- Nessun sistema vecchio convive con quello nuovo.
- Build, test, PWA offline, duello in rete e salvataggi funzionano.
- Diario compilato per ogni fase.
