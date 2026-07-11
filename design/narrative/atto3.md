# Atto 3 — Verso le Elezioni

> **Status**: Approved
> **Last Updated**: 2026-07-10
> **Systems**: `design/gdd/coalizione.md`, `design/gdd/territori-elezioni.md`
> **Editorial policy**: `design/editorial/meme-research-policy.md`
> **Narrative Review**: APPROVED (independent review, 2026-07-10)

## Narrative Promise

Dopo Bruxelles il giocatore ha potere istituzionale ma nessun mandato popolare.
L’Atto 3 racconta una campagna in cui allearsi rende più forti e meno liberi. Le
scelte non stabiliscono una fazione “giusta”: determinano costi, persone fuori
campo, boss e un finale di governo oppure opposizione, entrambi validi.

Durata target core: 3h10–4h20. Capitoli 1–3 da 30–40 minuti, Tour 60–90,
Election Night 40–50; Genova/lettura/completismo portano il totale a 3,5–5 ore.
Nessun incontro casuale nei dungeon narrativi.

## Inciting Incident and Order

Dopo Bruxelles il GARANTE invia un messaggio: «Hai incarichi, non ancora voti».
GIANNI pubblica un sondaggio lampo che mostra il giocatore forte nei palazzi e
debole nelle urne, poi annuncia che correrà comunque. Il Governo Ombra reagisce in
base ai ministri assegnati. Questa crisi di legittimità rende le elezioni una
necessità personale e riattiva rivale/cast pregresso.

La sequenza è lineare e non skippabile:

1. `ue-beaten && !atto3Started` → Foto del Campo;
2. `photoComplete` → Futuro Anteriore;
3. `futureResolved` → Temptation Diplomacy;
4. `diplomacyComplete` → eventuale Ricucitura, poi Tour;
5. `tourComplete` → Election Night.

Fast travel resta libero fra capitoli completati, ma i trigger successivi non
esistono prima del gate. La Foto apre COALIZIONE, non apre direttamente il Tour.

### Narrative state ownership

`Atto3NarrativeState` è posseduto dal controller puro Atto 3 e contiene fase,
enum `photoChoice/futureChoice/diplomacyChoice`, `narrativeEventIdsProcessed` e il set
`brokenAllyIdsThisRun`. Il set nasce vuoto all’avvio Atto 3; il coordinator vi
aggiunge ogni allyId ricevuto da un DomainEvent `allyBroken`. Riconciliazione e
rimozione non lo cancellano. È deduplicato, ordinato per allyId, limitato agli ID
catalogo e idempotente al save/load. Il ledger esclude i `consequenceId` di
Coalizione: pending, timer e processed bit di RECLUTA/RICONCILIA/rottura
appartengono solo a Coalizione. Le flag quest sono proiezioni ricostruibili.

Eventi LINEA ROSSA autoritativi:

| Index | ID | Context | Severity |
|---:|---|---|---|
| 10 | `future_alliance` | `{kind:"alliance", stance:"future"}` | normal |
| 11 | `future_opposition` | `{kind:"campaign", stance:"oppose_future"}` | normal |
| 12 | `diplomacy_loyalty` | `{kind:"diplomacy", stance:"loyalty"}` | normal |
| 13 | `diplomacy_home` | `{kind:"diplomacy", stance:"home"}` | normal |

Il catalogo alleati contiene predicati espliciti su questi context. Il batch
Coalizione decide target/transizione e applica -3/-6; la narrativa non li calcola.

| Ally ID | Event index che viola la LINEA ROSSA |
|---|---|
| `campo_secretary` | 10, 12 |
| `quantum_centrist` | 11, 13 |
| `steel_governor` | 11, 13 |
| `civic_mayor` | 10, 12 |
| `generorso` | 11, 13 |

Il validator testa per ogni index il set esatto degli ally attivi colpiti. Alleati
fuori coalizione non vengono processati.

### Story boss loss contract

I boss C1–C3 usano il contratto storia standard: la scelta viene committata prima
della lotta; una sconfitta riporta all’ingresso dell’arena, conserva scelta/costi,
lascia il boss imbattuto e permette retry. La prima vittoria soltanto assegna
reward e gate capitolo. Save/load prima/dopo sconfitta non ripete conseguenze o
token. Solo il boss Election Night è one-shot e fail-forward.

## Cast funzionale

| ID | Nome UI | Ruolo | Tag |
|---|---|---|---|
| `campo_secretary` | SEGRETARIA DEL CAMPO | idealista, teme compromessi vuoti | campo |
| `quantum_centrist` | CENTRISTA QUANTICO | pragmatico, è contemporaneamente dentro e fuori | centro |
| `steel_governor` | GOVERNATRICE D’ACCIAIO | esecutiva, pretende disciplina | destra |
| `civic_mayor` | SINDACA DELLA LISTA | locale, rifiuta simboli e gerarchie | civica |
| `generorso` | GENERORSO | scissionista, fonda il futuro al passato prossimo | destra |
| `campaign_chief` | CAPO CAMPAGNA | tutorial e voice of system | — |

Sono archetipi compositi. Nessun dialogo attribuisce reati, diagnosi o fatti
privati. I riferimenti riconoscibili riguardano soltanto comunicazione pubblica.

## Capitolo 1 — La Foto del Campo

### Premessa e luogo

Trigger: `ue-beaten && !atto3Started`. Una notifica invita il giocatore a
CAMPO LARGO, festival 18–24×14–18 tile con tre marker fotografici, quattro gazebo
e retropalco. Le transenne cambiano con la preview della coalizione; un collegamento
laterale diventa shortcut dopo la scelta.

### Beat

1. La FOTOGRAFA mostra tre posti e quattro candidati.
2. Il giocatore parla con tutti e vede bonus, malus e LINEA ROSSA.
3. Recluta da uno a tre alleati; chi resta fuori apre contenuto successivo.
4. Nel retropalco conferma la preview e riceve conseguenza immediata.
5. IL FOTOGRAFO UFFICIALE sfida il giocatore a un “dibattito d’inquadratura”.
6. La foto finale registra l’assetto e sblocca FUTURO ANTERIORE.

### Scelta, conseguenza, boss, reward

| Campo | Specifica |
|---|---|
| Scelta | composizione iniziale, mai esclusione definitiva degli altri |
| Conseguenza | assetto/bonus visibile, folla e dialoghi cambiano entro il capitolo |
| Boss | IL FOTOGRAFO UFFICIALE, roster MEDIA esistente, nessun modulo Election |
| Reward | menu COALIZIONE, CORNICE IMPOSSIBILE cosmetica, primo dossier FEED |
| Token | `recruit:<allyId>` soltanto; nessun token RIPARA anticipato |
| Conseguenza | `a3.photo.recruit.<allyId>` oppure `a3.photo.exclude.<allyId>` |
| Stato | Narrative possiede fase/scelta; Quest proietta `atto3Started`, `photoComplete` |

### Battute chiave

- `A3_C1_PHOTO_001`: «Sorridete. Il programma può aspettare, la luce no.»
- `A3_C1_COORD_001`: «Tre posti nel frame. Le ambizioni, invece, sono sette.»
- `A3_C1_OUT_001`: «Fuori campo, sì. Fuori dalla trattativa, mai.»
- `A3_C1_CLOSE`: «Nessuno è d’accordo, ma tutti sono a fuoco.»

Evergreen: foto/perimetro/leader fuori campo. Datato: identità sui poster e copy
social, sostituibili senza modificare quest o layout.

## Capitolo 2 — Il Partito che non c’era

### Premessa e luogo

VANNACCIX lascia il vecchio palco e apre FUTURO ANTERIORE. Piazzale-convention,
interno 12–18×10–14 con due pannelli rotanti e palco finale. Vecchi simboli restano
sotto vernice fresca; niente estetica militare realistica o simboli estremisti.

### Beat

1. Reception consegna un badge “provvisorio definitivo”.
2. Due leve ruotano manifesti bifronte e aprono lo shortcut centrale.
3. Tre stanze mostrano scissione, rebranding e tesoreria vuota.
4. Il giocatore sceglie ALLEANZA, DISTANZA o CONTRASTO.
5. VANNACCIX usa la TESSERA FUTURO, evolve nel ramo FUTURORSO e combatte.
6. Il coordinator emette evento LINEA ROSSA indicizzato e il dominio decide quali
   alleati colpisce; nessuna quest scrive direttamente TESO/ROTTO.

### Scelta, conseguenza, boss, reward

| Campo | Specifica |
|---|---|
| Alleanza | -800 fondi, token `recruit:generorso`, evento index 10 `future_alliance`, `a3.future.ally` |
| Distanza | +600 fondi base via `apply_gain(funds)`, `a3.future.distance` |
| Contrasto | +2 SONDAGGI, evento index 11 `future_opposition`, `a3.future.oppose` |
| Boss | FUTURORSO; abilità TABULA RASA azzera una volta gli stage di entrambi, senza curare PV/status |
| Reward | unlock ramo FUTURORSO, dossier NORD, quest Ricucitura se eleggibile |
| Stato | Narrative possiede enum `futureChoice`; Quest proietta `futureResolved` |

### Battute chiave

- `A3_C2_GEN_001`: «Il futuro non arriva. Si mette in formazione.»
- `A3_C2_GEN_002`: «Ho lasciato il palco. Era troppo affollato.»
- `A3_C2_GEN_003`: «Non è scissione. È avanzamento separato.»
- `A3_C2_CLOSE`: «Domani presenteremo il nome definitivo di domani.»

Riferimento 2026–2027: [Sky TG24](https://tg24.sky.it/politica/2026/06/15/roberto-vannacci-futuro-nazionale-programma-reazioni)
e [statuto pubblico](https://futuronazionale.it/statuto/). Fallback: partito
fittizio del domani; nessuna etichetta ideologica o accusa entra nel dialogo.

## Capitolo 3 — Temptation Diplomacy

### Premessa e luogo

Un vertice internazionale diventa reality del selfie. Hotel-set con corridoio
circolare e tre stanze: FEDELTÀ, AUTONOMIA, CONSENSO. La terrazza-studio è arena
e uscita, evitando backtracking. Monitor usano forme astratte, non loghi social.

### Beat

1. Check-in consegna tre pass ma una sola scelta.
2. Ogni stanza mostra preview di fondi, SONDAGGI e linee rosse.
3. La scelta chiude due porte, ridistribuisce NPC e apre lo studio.
4. IL PARTNER PERFETTO affronta il giocatore con cue leggibili.
5. La conseguenza si verifica prima dell’uscita e può offrire RIPARA.

### Scelta, conseguenza, boss, reward

| Scelta | Beneficio | Costo/rischio |
|---|---|---|
| FEDELTÀ | 800 fondi base via `apply_gain(funds)` + PASS VERTICE cosmetico | evento index 12 `diplomacy_loyalty`; `a3.diplomacy.loyalty` |
| AUTONOMIA | con TESO: paga 500 e crea token; senza TESO: +500 fondi base via `apply_gain(funds)` | `a3.diplomacy.autonomy` |
| CONSENSO | +4 SONDAGGI | evento index 13 `diplomacy_home`; `a3.diplomacy.home` |

AUTONOMIA usa rami esclusivi: non somma costo e fallback. Il token
contiene target e contatore esatti; se lo stato cambia prima dell’uso diventa
invalido senza essere convertito. Boss: IL PARTNER PERFETTO. Reward one-shot.
Narrative possiede enum `diplomacyChoice`; Quest proietta `diplomacyComplete`.

### Battute chiave

- `A3_C3_HOST_001`: «Un selfie, tre sovranità.»
- `A3_C3_ENVOY_001`: «L’amicizia è salda. Il filtro, meno.»
- `A3_C3_HOST_002`: «Fedeltà, autonomia o share: salvatene una.»
- `A3_C3_CLOSE`: «La diplomazia resiste. La clip è già virale.»

Pack datato attivo soltanto nella finestra editoriale. Fonti di contesto:
[RaiNews](https://www.rainews.it/articoli/2026/07/lultimo-schiaffo-di-trump-per-meloni-serve-un-ordine-restrittivo-1d2bdd3e-2683-4ff8-8b1c-53182e9ab76f.html)
e [Open](https://www.open.online/2026/06/20/trump-meloni-selfie-implorato-satira-social-video/).
Fallback evergreen obbligatorio; nessun insulto reale viene replicato.

### Quest Ricucitura

Dopo C3, se esiste almeno un ROTTO mai riconciliato, il CAPO CAMPAGNA apre una
quest breve nel retropalco. Il giocatore sceglie un target, completa un dialogo e
ottiene esattamente `reconcile:<allyId>`; il comando controlla slot e storia. La
quest è opzionale e non blocca il Tour, ma non è “possibile” o casuale: compare
deterministicamente quando eleggibile. Conseguenza `a3.reconcile.<allyId>`.

## Capitolo 4 — Il Tour del Feed

### Struttura

Un hub `tour_feed` presenta cinque tessere e fast travel. Cinque micro-arene
14–18×10–13 condividono factory: introduzione, tre postazioni azione, arena e
uscita automatica dopo la seconda scelta. Nessun nuovo overworld completo.

| Collegio | Spazio | NPC/boss | Storytelling |
|---|---|---|---|
| NORD | capannone/tavolo circolare | PRESIDENTE DI CATEGORIA | bonus e tavoli dei tavoli |
| CENTRO | studio a ferro di cavallo | OPINIONISTA DEFINITIVO | camerini con opinioni intercambiabili |
| SUD | cantiere/prima pietra | COMMISSARIO ETERNO | nastro pronto, opera abbozzata |
| ISOLE | molo/plastico | INAUGURATORE | modello perfetto, traghetto fermo |
| FEED | palazzo simmetrico | MODERATORE AUTOMATICO | fact-check chiaro, trend costoso |

Azioni, costi, endorsement e formule sono autoritativi nel GDD Territori. Primo
collegio 10–12 minuti tutorial, successivi 6–9, ordine libero. GENOVA TECHNO è
side area/spike: ritmo-lite opzionale; reduced-motion lo sostituisce con input a
tempo libero e stessa fascia reward.

### Battute chiave

- `A3_C4_NORD_001`: «Produciamo tutto. Soprattutto tavoli permanenti.»
- `A3_C4_CENTRO_001`: «Non ho dati, ma ho già la sintesi.»
- `A3_C4_SUD_001`: «La prima pietra è pronta. Manca il progetto.»
- `A3_C4_ISOLE_001`: «Il plastico funziona. Il territorio fa ritardo.»
- `A3_C4_FEED_001`: «Mostro la promessa a chi ci crede già.»
- `A3_C4_CLOSE`: «Il tour è finito. Le promesse hanno memoria.»

Stato Territori: action index/district ed endorsement. `tourComplete` non è
persistito: è una proiezione Quest derivata da `Territori.phase` in
`ready|locked|resolved`, non authority parallela.

## Capitolo 5 — Election Night

### Premessa e luogo

PALAZZO DEI FEED: lobby snapshot, quattro stanze brevi (algoritmo, fact-check,
talk show, silenzio stampa), studio e terrazza epilogo. Nessun incontro casuale.
Il risultato viene persistito prima della presentazione skippabile.

### Beat

1. Lobby mostra Coalizione, cinque locali e punto di non ritorno.
2. `startElection(runId)` salva i due snapshot e blocca i domini.
3. Le stanze ricordano scelte senza quiz o nuovi modificatori.
4. Boss nazionale usa dottrina snapshot o SCISSIONE.
5. Cinque urne mostrano LOCALE, eventuale RICONTO, TOTALE.
6. 3–5 seggi: governo; 0–2: opposizione. Entrambi portano alla terrazza/post-game.

### Boss, reward e finali

Il boss nazionale è L’ALGORITMO SOVRANO, evoluzione diegetica del sistema del
Palazzo ma non riuso del trainer FEED, con modulo definito nel GDD Territori. La vittoria
risolve gli esatti 50 a favore; la sconfitta contro. Quattro varianti epilogo
combinano risultato (governo/opposizione) e stabilità (coesa/fratturata): premi a
budget equivalente, titoli/cosmetici differenti, nessun save cancellato.

Stato: `electionSnapshotId`, `coalitionSnapshotId`, risultato dominio e proiezioni
quest `atto3Complete`, `endingId`. Nessun flag `election-locked` duplica l’authority.

### Battute chiave

- `A3_C5_ANCHOR_001`: «Urne chiuse. Opinioni ancora spalancate.»
- `A3_C5_RECOUNT_001`: «Parità esatta. Un numero che crea lavoro.»
- `A3_C5_WIN_001`: «La maggioranza esiste: maneggiare con cura.»
- `A3_C5_LOSE_001`: «Non è vittoria, ma nemmeno titoli di coda.»
- `A3_C5_CLOSE`: «Il feed chiede già una rivincita.»

## Visual, Motion and Localization Contract

- PixelLab, top-down GBA, griglia 16×16, asset senza testo/loghi/bandiere reali.
- Silhouette dominante + massimo due props pubblici; niente sosia fotorealistici.
- UI core avorio `#F4E6C1`, blu `#19324D`, oro `#D3A62C`; stato sempre con
  icona/pattern/testo, mai solo colore.
- Cutscene 3–5 tableau; nominale 120–400 ms, skippabili. Reduced motion 0–100 ms,
  niente shake/parallax/morph/flash ripetuti.
- Budget: titolo 18 caratteri, CTA 16, nome 14, collegio 20 su riga dedicata,
  dialogo 28–32 caratteri per riga e massimo tre righe/pagina.
- String key `A3_C{chapter}_{speaker}_{index}`; placeholder nominati, plural rules,
  +35% spazio EN/DE/FR. Ellissi solo nelle liste, mai su scelte/formule.
- Ogni pun ha glossario con intento e fallback; meme datato ha fonte, finestra ed
  `evergreenFallback`.

## Flag and Token Registry

Consequence ID ammessi: `a3.photo.recruit.<allyId>`,
`a3.photo.exclude.<allyId>`, `a3.future.ally|distance|oppose`,
`a3.diplomacy.loyalty|autonomy|home`, `a3.reconcile.<allyId>`,
`a3.district.<districtId>.<actionIndex>` e `a3.ending.<endingId>`. Ognuno ha un
consumer dichiarato, timer persistito e bit one-shot; il validator rifiuta scelte
principali senza ID o ID senza consumer.

Gli ID `a3.district.*` sono proiezioni di display degli action index posseduti da
Territori, non un secondo registro: vengono derivati e non salvati separatamente.

| Owner | Chiavi persistenti |
|---|---|
| Quest projection | `atto3Started`, `photoComplete`, `futureResolved`, `diplomacyComplete`, `tourComplete`, `atto3Complete`, `endingId` |
| Atto3 Narrative | fase, choice enum, consequence IDs, `brokenAllyIdsThisRun` |
| Coalizione | ally records, token namespaced, processed event bitset |
| Territori | district states, endorsement, run phase, battle checkpoint, snapshot/result |

Il validator rifiuta chiavi duplicate, token senza consumer, dialoghi oltre budget,
eventi datati senza fallback e riferimenti a NPC/mappe inesistenti.

## Editorial Pack Registry

| Pack ID | Evento/pubblicazione | Verifica | Active | Rischio | Fallback |
|---|---|---|---|---|---|
| `photo_field_2026` | foto coalizione, 2026-06-16, [fonte](https://www.ilfattoquotidiano.it/2026/06/16/campo-largo-schlein-conte-eventi-luglio-notizie/8421147/) | 2026-07-10 | 2026-06-16→2026-09-30 | basso | foto di gruppo fittizia |
| `future_party_2026` | assemblea nuovo partito, 2026-06-13/15, [fonte](https://tg24.sky.it/politica/2026/06/15/roberto-vannacci-futuro-nazionale-programma-reazioni) | 2026-07-10 | 2026-06-13→2027-03-31 | medio | scissione del partito del domani |
| `selfie_diplomacy_2026` | selfie/parodie, 2026-06-20 e 2026-07-06, [fonte](https://www.open.online/2026/06/20/trump-meloni-selfie-implorato-satira-social-video/) | 2026-07-10 | 2026-06-15→2026-09-30 | medio | reality diplomatico fittizio |

GENERORSO è una creatura composita e il bersaglio è il rebranding pubblico. Copy e
visual non usano “tana”, tratti fisici o simboli reali; review editoriale obbligatoria
prima del pack. Poster C1 usano soltanto il pack `photo_field_2026` o fallback.

## Vertical Slice R1

Implementare CAMPO LARGO, tre candidati/due slot, retropalco, un collegio sandbox
e il boss di FUTURO ANTERIORE con roster interamente legacy. Il collegio esercita due azioni
e persiste il `DistrictState`, ma non abilita `startElection`: C3–C5, gli altri
quattro collegi, Palazzo ed Election Night restano R2–R3. La slice termina con una
vignetta stabile/rottura entro 30–45 minuti. Nessun risultato preseedato o Palazzo
provvisorio viene introdotto per simulare sistemi futuri.

## Acceptance Criteria

- Ogni capitolo ha premessa, scelta, conseguenza, boss, reward e chiavi persistenti.
- Ogni scelta principale produce un `consequenceId` entro il contratto 600 secondi.
- Tutti i dialoghi rispettano budget e hanno string key/fallback localizzabile.
- Ogni contenuto datato ha fonte, finestra e fallback evergreen.
- Nessuna quest scrive direttamente stato Coalizione/Territori.
- Flag e token hanno un solo owner; proiezioni quest sono ricostruibili dal dominio.
- Save/load a ogni beat irreversibile riprende senza duplicare dialoghi/reward.
- Governo e opposizione completano l’Atto 3 e sbloccano post-game equivalente.
- Reduced motion completa ogni capitolo senza timing obbligatorio.
- Vertical slice copre un flusso completo flag-on e lascia campagna storica
  byte-equivalente nel comportamento con flag-off.
