# Coalizione

> **Status**: Approved
> **Author**: Luca Tiengo + Codex
> **Last Updated**: 2026-07-10
> **Implements Pillar**: La politica è una squadra instabile; La scelta deve mordere
> **Design Review**: APPROVED (lean independent review, 2026-07-10)

## Overview

Coalizione è il sistema Core dell’Atto 3 che permette al giocatore di scegliere
fino a tre alleati politici, comporre uno di quattro assetti e accettarne bonus,
malus e LINEE ROSSE. È insieme una meccanica visibile di costruzione della
maggioranza e un dominio dati isolato: le scelte producono conseguenze entro dieci
minuti, mentre comandi atomici e query pure impediscono alle scene di creare stati
invalidi. L’implementazione segue ADR-0006 e resta completamente irraggiungibile
con i feature flag `atto3`/`coalition` disattivati.

## Player Fantasy

Il giocatore deve sentirsi il regista di una coalizione brillante ma precaria:
ogni alleato rende la campagna più forte e contemporaneamente introduce una
promessa difficile da mantenere. Il piacere nasce dal trovare un compromesso
personale, vedere rapidamente il mondo reagire e arrivare all’Election Night
pensando: «questa maggioranza assurda l’ho costruita io». La rottura di
un’alleanza non è una punizione arbitraria, ma la conseguenza leggibile di una
LINEA ROSSA che il giocatore ha scelto consapevolmente di rischiare.

## Detailed Design

### Core Rules

1. La coalizione contiene al massimo tre slot ordinati e accetta solo alleati con
   ID univoco.
2. Ogni alleato dichiara un tag primario (`campo`, `centro`, `destra`, `civica`),
   un bonus, un malus, una LINEA ROSSA, un evento di violazione e un requisito di
   riconciliazione.
3. L’assetto non è scelto manualmente: il tag con maggioranza assoluta determina
   CAMPO LARGO, CENTRO MOBILE, DESTRA COMPETITIVA o LISTA CIVICA. Una parità o
   una composizione senza maggioranza produce LISTA CIVICA; zero alleati produce
   NESSUN ASSETTO.
4. Prima di ogni conferma la UI mostra il risultato completo della modifica:
   assetto, bonus, malus, sinergie e linee rosse già a rischio.
5. Bonus e malus degli alleati operativi si aggregano entro cap dichiarati. I
   malus non vengono annullati dai cap dei bonus.
6. La prima violazione di una LINEA ROSSA imposta `strained=true`. Una seconda
   violazione lifetime, oppure una violazione `grave`, imposta membership ROTTO.
7. Un alleato ROTTO libera immediatamente lo slot e non applica più modificatori.
8. Ogni alleato può essere riconciliato una sola volta mediante la propria quest.
   Torna operativo come RICONCILIATO, con bonus ridotto e malus intero.
9. RIMUOVI imposta membership FUORI e compatta gli slot a sinistra mantenendo
   l’ordine relativo. `strained`, CICATRICE, violazioni e riconciliazione spesa
   sono storia ortogonale e non vengono azzerate; un nuovo RECLUTA ripristina
   quindi TESO o RICONCILIATO, non un ALLEATO vergine.
10. Gli alleati sono NPC e non possiedono PV persistenti. Se il loro Politicmon
   rappresentante va KO in una battaglia narrativa, il bonus è sospeso soltanto
   per quella battaglia; l’alleanza non cambia stato.
11. Governo Ombra e Coalizione sono separati: i ministri provengono dal party,
    gli alleati dalla storia. Le sinergie leggono snapshot di entrambi, senza
    mutazioni incrociate.
12. Ogni comando è atomico. Duplicati, slot pieni, token mancanti o coalizione
    bloccata restituiscono errore e zero patch.
13. L’avvio dell’Election Night congela composizione e stati fino alla risoluzione.
14. RIPARA consuma il token della quest e riporta TESO ad ALLEATO, ma non azzera
   `violationCount`: la violazione successiva rompe l’alleanza. Il contatore è
   monotono e impedisce loop di riparazione infinita.
15. RECLUTA, RIPARA e RICONCILIA consumano token namespaced rispettivamente
    `recruit:<allyId>`, `repair:<allyId>:<violationCount>` e
    `reconcile:<allyId>`. RICONCILIA inserisce in coda; rimozioni e rotture
    compattano gli slot stabilmente a sinistra.
16. Un RICONCILIATO rompe alla successiva violazione normale o grave. CICATRICE e
    `reconciliationSpent` sono permanenti.
17. Le precondizioni hanno precedenza fissa: lock, input/ID, stato/duplicato,
    capacità, token. Ogni comando restituisce un solo errore.
18. Una sinergia ministeriale vale `+3` su un canale, entra nella somma e nel cap
    ±20 ed è zero se il ministro richiesto non è operativo.
19. `lineRedRisks(context)` valuta predicati dati puri e distingue `attiva ora`,
    `possibile` e `nessun rischio`; non predice eventi casuali futuri.
20. Ogni scelta principale dichiara un `consequenceId` one-shot osservabile entro
    600 secondi di playtime attivo o prima del prossimo checkpoint quest. Pausa,
    background e caricamento non contano.
21. Sono scelte principali RECLUTA, sostituzione confermata, RICONCILIA e una
    rottura causata da scelta dialogica. Il pending salva `consequenceId`, secondi
    attivi trascorsi e checkpoint target; save/load riprende il timer. Il controller
    mostra una conseguenza scaduta al primo passo sicuro prima di avanzare quest.

### Catalogo alleati Atto 3

Il catalogo, non le scene, possiede tag e tuning. Le incompatibilità sono
simmetriche e validate; i predicati LINEA ROSSA usano gli event index del
trattamento narrativo.

| allyId | Tag | Bonus +10 | Malus -6 | LINEA ROSSA | Incompatibile con | Sinergia Governo |
|---|---|---|---|---|---|---|
| `campo_secretary` | campo | `territoryGain` | `funds` | index 10, 12 | `steel_governor` | ESTERI → `territoryGain` |
| `quantum_centrist` | centro | `shopPrice` | `sondaggiGain` | index 11, 13 | — | ECONOMIA → `shopPrice` |
| `steel_governor` | destra | `funds` | `territoryGain` | index 11, 13 | `campo_secretary` | INFRASTRUTTURE → `funds` |
| `civic_mayor` | civica | `sondaggiGain` | `shopPrice` | index 10, 12 | `generorso` | INTERNI → `sondaggiGain` |
| `generorso` | destra | `funds` | `shopPrice` | index 11, 13 | `civic_mayor` | ESTERI → `funds` |

R1 espone solo `campo_secretary`, `quantum_centrist` e `civic_mayor`, due slot e
una preview aggregata. Stabilità numerica, terzo slot, RIPARA/RICONCILIA, CICATRICE
e sinergie ministeriali restano nel payload forward-compatible ma non nella UI R1.
Prima di R2 un test enumera tutte le composizioni ordinate 0–3 e verifica che
nessun ally/assetto migliori contemporaneamente tutti e quattro i canali.

### States and Transitions

Lo stato persistito è ortogonale; le etichette UI sono derivate, non salvate.

| Campo | Valori | Regola |
|---|---|---|
| `membership` | `out`, `active`, `broken` | RECLUTA/RIMUOVI/ROTTURA/RICONCILIA |
| `strained` | bool | prima violazione true; RIPARA false; ROTTO false |
| `scarred` | bool | true alla prima riconciliazione, mai torna false |
| `violationCount` | 0–2 | monotono; 2 significa rottura avvenuta |
| `reconciliationSpent` | bool | true al primo successo, mai torna false |

Etichette: `available = out`; `allied = active && !strained && !scarred`;
`strained = active && strained`; `reconciled = active && scarred && !strained`;
`broken = membership==broken`. RECLUTA da `out` cambia solo membership e conserva
la storia; è vietato da `broken`, che richiede RICONCILIA.

### Invarianti e canonicalizzazione save

`violationCount` è un contatore storico saturo: cresce 0→1→2 e resta 2 anche se
un RICONCILIATO rompe di nuovo. La rottura post-riconciliazione deriva da `scarred`,
non richiede un valore 3.

La normalizzazione applica in quest’ordine:

1. membership ignota → `out`; `violationCount` → intero clamp 0–2; booleani
   invalidi → false;
2. `scarred=true` oppure `reconciliationSpent=true` forza entrambi true e
   `violationCount=2`;
3. `strained=true && violationCount=0` forza `violationCount=1`;
4. `membership=broken` forza `strained=false` e `violationCount=2`;
5. `scarred && strained` rappresenta una violazione post-riconciliazione e
   canonicalizza a `membership=broken`, `strained=false`;
6. `membership=active && violationCount=2 && !scarred` canonicalizza a ROTTO;
7. `membership=out && violationCount=2 && !scarred` canonicalizza a ROTTO, perché
   un non riconciliato con due violazioni non può essere solo disponibile;
8. gli slot sono autoritativi: si mantengono i primi tre ID noti, unici e non
   ROTTI; questi diventano `active`. Un record active assente dagli slot diventa
   `out`. Gli slot sono poi compattati a sinistra.

Combinazioni valide notevoli: `out+strained+count1` (TESO rimosso),
`out+scarred+spent+count2` (RICONCILIATO rimosso),
`active+scarred+spent+count2` (RICONCILIATO operativo),
`broken+scarred+spent+count2` (seconda rottura definitiva).

`locked` non è uno stato dell’alleato ma una proprietà della coalizione. Conserva
gli stati e rifiuta ogni comando mutante. Solo `resolveElection(snapshotId)` con
lo stesso snapshot che ha creato il lock può sbloccarla; lo snapshot finale resta
immutabile e posseduto dal modulo Election Night.

### Interactions with Other Systems

| Sistema | Input | Output/contratto |
|---|---|---|
| SONDAGGI | valore nazionale e soglie | modificatori e `DomainEvent`; nessuna scrittura diretta |
| Governo Ombra | ministeri attivi e stato KO | sinergie pure calcolate da snapshot |
| Battaglia | contesto, esito, KO rappresentante | sospensione locale e possibili eventi narrativi |
| Quest/Narrativa | token reclutamento, riparazione, riconciliazione | comandi dominio e relativi eventi |
| Territori | nessuna mutazione | snapshot immutabile di assetto e modificatori |
| Election Night | comando lock/unlock | snapshot finale riproducibile |
| Save | payload persistito | normalizzazione forward-only e default valido |
| UI | comandi utente | view-model con preview prima/dopo e motivi di errore |

## Formulas

### Derivazione assetto

La formula `required_majority` è definita come:

`required_majority = floor(active_allies / 2) + 1`

**Variables:**

| Variabile | Simbolo | Tipo | Range | Descrizione |
|---|---:|---|---:|---|
| alleati operativi | `active_allies` | int | 0–3 | `allied`, `strained` o `reconciled` negli slot |
| maggioranza richiesta | `required_majority` | int | 1–2 | conteggio minimo dello stesso tag |

**Output Range:** 1–2. Con zero alleati l’assetto è `none` e la formula non viene
usata. Se un tag raggiunge la maggioranza, determina l’assetto; altrimenti il
risultato è `lista_civica`.

**Example:** tre alleati con tag `campo`, `campo`, `centro` richiedono 2 voti e
producono CAMPO LARGO. Due alleati `campo`, `destra` sono in parità e producono
LISTA CIVICA.

### Modificatore per canale

Ogni alleato assegna esattamente un bonus base `+10` e un malus base `-6` a due
canali diversi fra `funds`, `sondaggiGain`, `territoryGain`, `shopPrice`. Ogni
assetto usa lo stesso budget nominale `+5/-3`, ma su canali differenti. È un budget
identico, non a somma zero: la coalizione deve essere utile, mentre il costo rende
la scelta non gratuita. Per `shopPrice` un valore positivo riduce il prezzo.

| Assetto | +5 | -3 |
|---|---|---|
| CAMPO LARGO | `territoryGain` | `funds` |
| CENTRO MOBILE | `shopPrice` | `sondaggiGain` |
| DESTRA COMPETITIVA | `funds` | `territoryGain` |
| LISTA CIVICA | `sondaggiGain` | `shopPrice` |

Le formule `coalition_bonus` e `coalition_malus` sono definite separatamente:

`coalition_bonus(c) = clamp(0, 20, roundAway(assetBonus(c) + synergy(c) + sum(positive_i(c) * bonusPower_i)))`

`coalition_malus(c) = clamp(-20, 0, roundAway(assetMalus(c) + sum(negative_i(c) * malusPower_i)))`

**Variables:**

| Variabile | Simbolo | Tipo | Range | Descrizione |
|---|---:|---|---:|---|
| canale | `c` | enum | 4 valori | metrica modificata |
| bonus alleato | `positive_i(c)` | int | 0, +10 | contributo positivo dati |
| malus alleato | `negative_i(c)` | int | -6, 0 | contributo negativo dati |
| potenza bonus | `bonusPower_i` | float | 0–1 | `allied=1`, `strained=.5`, `reconciled=.75`, `broken=0`; KO contestuale=0 |
| potenza malus | `malusPower_i` | int | 0–1 | ogni stato operativo=1, `broken=0`; il KO non lo sospende |
| bonus assetto | `assetBonus(c)` | int | 0, +5 | canale positivo della tabella |
| malus assetto | `assetMalus(c)` | int | -3, 0 | canale negativo della tabella |
| sinergia | `synergy(c)` | int | 0, +3 | ministero richiesto operativo |

**Output Range:** bonus 0–20%, malus -20–0%. I bucket restano distinti fino
all’applicazione: un cap positivo non cancella mai un costo. `roundAway` arrotonda
le metà lontano da zero (`4.5→5`, `-4.5→-5`) una sola volta per bucket.

**Example:** due bonus `funds` alleati pieni (+20) e DESTRA COMPETITIVA con +5
producono +20%, non +25%. Un malus -6 di un RICONCILIATO resta -6, non -4.5.

Una sinergia ministeriale non possiede un cap separato.

### Applicazione dei canali

Per un guadagno positivo la formula `apply_gain` è:

`apply_gain(base, c) = max(0, roundAway(base * (1 + coalition_bonus(c)/100) * (1 + coalition_malus(c)/100)))`

Si applica a `funds` soltanto su ricompense positive di trainer/quest, a
`sondaggiGain` soltanto su delta positivi e a `territoryGain` soltanto su influenza
positiva. Perdite, costi, penalità LINEA ROSSA e catture non vengono invertiti o
ridotti. Ordine: valore base → moltiplicatori Governo Ombra già esistenti → bonus
Coalizione → malus Coalizione → `roundAway`; poi il sistema proprietario applica
il proprio clamp (SONDAGGI 0–100, territorio 0–100).

Per il prezzo la formula `apply_shop_price` è:

`apply_shop_price(basePrice) = max(10, round10(basePrice * (1 - bonus/100) * (1 - malus/100)))`

`basePrice` è un intero 0–999.990 già calcolato da `shopPrice` (SONDAGGI e Governo Ombra);
`bonus=coalition_bonus(shopPrice)`, `malus=coalition_malus(shopPrice)` e `round10`
arrotonda alla decina più vicina con metà lontano da zero: `95→100`, `85→90`.

**Examples:** ricompensa 1000, Governo ×1.25, bonus +20 e malus -6 →
`roundAway(1000*1.25*1.20*.94)=1410`. Prezzo già calcolato 100, bonus +5 e
malus -3 → `round10(100*.95*1.03)=100`; il minimo resta 10.

### Stabilità

La formula `coalition_stability` è definita come:

`coalition_stability = clamp(0, 100, 100 - 25*S - 10*R - 15*I)`

**Variables:**

| Variabile | Simbolo | Tipo | Range | Descrizione |
|---|---:|---|---:|---|
| alleati tesi | `S` | int | 0–3 | stato `strained` |
| alleati riconciliati | `R` | int | 0–3 | stato `reconciled` |
| coppie incompatibili | `I` | int | 0–3 | soli alleati operativi unici; matrice simmetrica, diagonale sempre false, coppia contata una volta |

**Output Range:** 0–100. È un indicatore e input dei Territori; non rompe alleanze
automaticamente.

**Example:** un alleato TESO, uno RICONCILIATO e una coppia incompatibile danno
`100 - 25 - 10 - 15 = 50`.

### Conseguenza LINEA ROSSA

La formula `violation_sondaggi_delta` è definita come:

`violation_sondaggi_delta = grave ? -6 : (next_state == broken ? -6 : -3)`

**Variables:**

| Variabile | Simbolo | Tipo | Range | Descrizione |
|---|---:|---|---:|---|
| violazione grave | `grave` | bool | — | rompe immediatamente |
| stato risultante | `next_state` | enum | strained/broken | transizione atomica |

**Output Range:** -6 o -3 punti SONDAGGI, applicati dal controller tramite
`governo.ts`. La chiave idempotente persistita è `(allyId,eventId)`: lo stesso
evento globale può colpire alleati diversi. I bonus `sondaggiGain` non modificano
le penalità LINEA ROSSA, evitando ricorsione.

**Example:** prima violazione normale: -3 e TESO; seconda: -6 e ROTTO.

### Batch LINEE ROSSE e idempotenza

Ogni evento dichiarato possiede `eventIndex` immutabile 0–127, `eventId` univoco,
`kind` e payload tipizzato. Ogni alleato salva un bitset fisso di 128 bit: la coppia
`(allyId,eventIndex)` è processata se il bit corrispondente è 1. Gli indici non
possono essere riordinati o riusati; il validator confronta anche un manifest
storico. Il formato save conserva tutti i 128 bit, inclusi quelli non noti alla
build corrente.

Un evento viene risolto in un’unica transazione:

1. validare schema e `eventIndex`; input mancante/ignoto = errore, zero patch;
2. valutare gli alleati attivi in ordine slot su uno snapshot pre-evento;
3. scartare le coppie già processate;
4. calcolare tutte le transizioni e marcarne i bit;
5. sommare i delta individuali e applicare una sola volta
   `batchDelta = max(-12, sum(individualDelta))` tramite `governo.ts`;
6. emettere un evento dominio per alleato più un riepilogo batch.

Due rotture simultanee avvengono entrambe anche se il delta aggregato raggiunge il
cap -12. Nessun modificatore `sondaggiGain` influenza questo batch.

### Lifecycle Election Night

`startElection(runId)` canonicalizza la Coalizione, genera
`snapshotId = hash(runId + canonicalCoalition)`, salva snapshot e imposta `locked`.
Ripetere lo stesso `runId` restituisce lo snapshot esistente; un run diverso mentre
locked restituisce `coalitionLocked`. Save/load conserva lock, run e snapshot.

`resolveElection(runId, snapshotId)` è l’unico unlock: entrambi devono coincidere.
Una risoluzione ripetuta restituisce lo stesso risultato senza eventi; ID errato
restituisce `snapshotMismatch`. Il modulo Election conserva lo snapshot risolto,
mentre Coalizione torna modificabile nel post-game.

## Edge Cases

- **Se si aggiunge un ID già presente**: `duplicateAlly`, zero patch.
- **Se i tre slot sono pieni**: `slotsFull`, zero patch; la UI deve proporre prima
  una sostituzione esplicita, mai rimuovere automaticamente.
- **Se RICONCILIA trova tre slot pieni**: `slotsFull`, token non consumato e stato
  ROTTO invariato.
- **Se la coalizione è vuota**: assetto `none`, modificatori zero, stabilità 100.
- **Se due o più tag pareggiano**: LISTA CIVICA; nessun tiebreak nascosto.
- **Se l’alleato rappresentante va KO**: sospendere il suo bonus nel solo contesto
  battaglia; malus, stato persistito e composizione non cambiano.
- **Se una violazione è ricevuta due volte con la stessa coppia `(allyId,eventId)`**:
  ignorare la seconda; lo stesso `eventId` su un altro alleato viene valutato.
- **Se una violazione grave colpisce un alleato TESO**: una sola transizione a
  ROTTO e un solo delta -6; non sommare la penalità precedente nel nuovo comando.
- **Se un alleato ROTTO non ha token di riconciliazione**: `notEligible`, zero patch.
- **Se è già stato riconciliato una volta**: ogni tentativo successivo restituisce
  `reconciliationSpent`, anche dopo una nuova rottura.
- **Se un RICONCILIATO subisce una nuova violazione**: passa a ROTTO con delta -6
  e non può più essere riconciliato.
- **Se il ministro richiesto da una sinergia è KO o fuori party**: sinergia off;
  il bonus base dell’alleato resta calcolato.
- **Se il finale è già avviato**: tutti i comandi di composizione restituiscono
  `coalitionLocked`; solo la risoluzione col medesimo `snapshotId` sblocca; letture
  e snapshot restano disponibili.
- **Se un save contiene ID ignoto, duplicati o più di tre slot**: mantenere i primi
  tre ID validi e unici nell’ordine salvato, registrare warning debug e scartare il
  resto senza fallire il caricamento.
- **Se un save contiene combinazioni ortogonali impossibili**: applicare la tabella
  di canonicalizzazione prima di derivare etichette, eligibility o modificatori;
  il secondo parse dello stato normalizzato deve essere idempotente.
- **Se un valore numerico è NaN/infinito/fuori range**: normalizzare al default
  sicuro prima delle query; nessun output può superare i cap.
- **Se feature flag off**: non creare UI/controller Atto 3; il payload save resta
  leggibile e viene preservato per un futuro riattivamento.
- **Se il catalogo dichiara oltre 128 eventi o riusa/riordina un `eventIndex`**:
  il validator rifiuta la build. Il bitset resta sempre 128 bit e non richiede
  pruning; gli indici futuri sono preservati anche da build precedenti.
- **Se una preview ha `revisionId` superato**: `stalePreview`, zero patch e preview
  da ricalcolare.
- **Se due alleati rompono sullo stesso evento**: entrambe le transizioni avvengono
  nello snapshot batch; delta aggregato minimo -12, un solo aggiornamento SONDAGGI.
- **Se l’app chiude durante Election Night**: save/load ripristina `locked`, run e
  snapshot; non rigenera né accetta una coalizione diversa.
- **Se il checkpoint arriva prima della conseguenza pendente**: il controller
  mostra la conseguenza prima del dialogo checkpoint e marca `consequenceId`; se
  scadono prima 600 secondi attivi, la inietta al primo passo sicuro.

## Dependencies

| Dipendenza | Tipo | Contratto richiesto |
|---|---|---|
| Feature Flags | hard | ADR-0001 + `src/game/features.ts`: entrambi i flag attivi |
| Save/Migrazioni | hard | ADR-0002 + `src/game/state.ts`: default, forward migration, round-trip |
| SONDAGGI | hard | `src/game/governo.ts`: input/clamp 0–100 e applicazione delta |
| Governo Ombra | soft | `src/game/governo.ts`: query ministeri operativi; assenza valida |
| Quest/Narrativa | hard | `src/data/quests.ts`, poi `design/narrative/atto3.md`: token dichiarativi |
| Battaglia | soft | `docs/battle-effect-contract.md`: BattleContext non persistente |
| Territori/Election Night | downstream | `design/gdd/territori-elezioni.md` (P1-T02): snapshot immutabile |
| UI | downstream | UX spec P1-T05: comandi/view-model, nessuna formula duplicata |

Ownership e direzione delle dipendenze sono vincolati da ADR-0006.

## Tuning Knobs

| Knob | Default | Range sicuro | Estremo/rischio |
|---|---:|---:|---|
| `maxAllies` | 3 | fisso 3 | cambiarlo invalida UI, formule e contenuti |
| `allyBonus` | +10% | 6–12% | alto rende decisivo un singolo alleato |
| `allyMalus` | -6% | -4…-8% | basso rende la scelta gratuita |
| `assetBonus` | +5% | 3–6% | alto rende l’etichetta più importante degli alleati |
| `assetMalus` | -3% | -2…-5% | alto punisce composizioni coerenti |
| `channelCap` | ±20% | ±15…±25% | oltre 25% collide con Governo Ombra/economia |
| `strainedPower` | 0.50 | 0.40–0.60 | alto rende irrilevante la prima violazione |
| `reconciledPower` | 0.75 | 0.65–0.80 | alto rende la rottura quasi gratuita |
| `strainedStabilityCost` | 25 | 20–30 | influenza troppo Territori se >30 |
| `reconciledStabilityCost` | 10 | 5–15 | deve restare inferiore a TESO |
| `incompatibilityCost` | 15 | 10–20 | alto forza coalizioni monocolore |
| `firstViolationDelta` | -3 | -2…-4 | feedback invisibile sotto 2 |
| `breakDelta` | -6 | -4…-8 | oltre 8 può creare spirale punitiva |

I valori vivono nel catalogo dati Coalizione, non nelle scene. Variazioni oltre i
range richiedono balance check e aggiornamento GDD.

## Visual/Audio Requirements

- Quattro emblemi 16×16 PixelLab, riconoscibili anche senza colore: tavolo largo,
  bussola mobile, scudo competitivo, lista/clipboard civica.
- Ritratti alleato almeno 32×32 con silhouette cartoon-mostro, mai fotorealistici.
- Cambio assetto: animazione breve di tessere che scorrono sul tavolo, massimo
  350 ms e disattivabile con riduzione movimento.
- LINEA ROSSA: bordo rosso tratteggiato e stinger di due note; non usare flash
  pieno schermo.
- Rottura: tessera che esce dal frame, suono secco e testo esplicito. Il feedback
  non dipende esclusivamente da colore, animazione o audio.
- Tutti gli asset rispettano `docs/PIXELLAB-REBOOT.md` e il manifest reboot.

## UI Requirements

Schermata COALIZIONE raggiungibile dal menu pausa solo con flag attivo. Layout a
240×180: header con assetto e SONDAGGI, tre slot verticali, footer contestuale.
Ogni tessera mostra nome troncato in sicurezza, tag con icona, stato e una riga
bonus/malus alternabile. Il pannello dettaglio usa cursore Y progressivo e scrolling.

Il flusso `AGGIUNGI/RIMUOVI/RIPARA/RICONCILIA` apre sempre una preview prima/dopo.
La conferma mostra conseguenze immediate e LINEE ROSSE a rischio; un errore indica
la causa concreta (`SLOT PIENI`, `GIÀ ALLEATO`, `ELEZIONI IN CORSO`). Touch target
minimo 32×24 logici, focus visibile, B annulla senza mutazioni. Nessun testo
variabile condivide una riga senza `clipToWidth`.

## Acceptance Criteria

- **GIVEN** flag `atto3` o `coalition` off, **WHEN** si carica qualunque save,
  **THEN** la campagna storica resta raggiungibile, la UI Coalizione non compare e
  il payload eventuale non viene distrutto.
- **GIVEN** 0–3 alleati, **WHEN** si calcola l’assetto, **THEN** il risultato segue
  maggioranza assoluta/parità documentate per tutte le 85 combinazioni ordinate
  di quattro tag fino a tre slot.
- **GIVEN** un alleato già presente o tre slot pieni, **WHEN** si tenta l’aggiunta,
  **THEN** il comando fallisce col codice esatto e lo stato resta deep-equal con
  hash canonico invariato.
- **GIVEN** una modifica valida, **WHEN** la UI apre la conferma, **THEN** preview
  e risultato applicato coincidono per assetto, stabilità e quattro canali.
- **GIVEN** contributi oltre cap, **WHEN** si calcola un canale, **THEN** l’output è
  composto da bonus 0…20 e malus -20…0, arrotondati una volta per bucket; casi
  +30/-18, +25/-6 e +10/-25 conservano entrambi i costi.
- **GIVEN** fondi/SONDAGGI/territorio positivi o un prezzo, **WHEN** si applica il
  canale dopo Governo Ombra, **THEN** segue le formule e gli esempi numerici; delta
  negativi e penalità LINEA ROSSA restano invariati.
- **GIVEN** prezzi intermedi 85 e 95 oppure output sotto 10, **WHEN** si applica
  `round10`, **THEN** risultano 90, 100 e minimo 10 senza overflow fino a 999.990.
- **GIVEN** lo stesso catalogo ruotato tra i quattro assetti, **WHEN** si confrontano
  i budget, **THEN** ogni assetto assegna esattamente +5/-3 sui canali dichiarati
  e nessun vettore è Pareto-superiore agli altri.
- **GIVEN** un alleato ALLEATO, **WHEN** subisce prima violazione normale,
  **THEN** diventa TESO, produce un solo evento e richiede un delta SONDAGGI -3.
- **GIVEN** un alleato TESO o una violazione grave, **WHEN** si viola la linea,
  **THEN** diventa ROTTO, libera lo slot e richiede un solo delta -6.
- **GIVEN** un `eventId` già processato, **WHEN** viene riprodotto dopo save/load,
  **THEN** stato, eventi e SONDAGGI richiesti non cambiano.
- **GIVEN** lo stesso evento viola due alleati, **WHEN** il batch viene risolto,
  **THEN** entrambi usano lo snapshot pre-evento, i bit sono marcati per alleato,
  le rotture avvengono tutte e il delta aggregato non scende sotto -12.
- **GIVEN** 128 indici storici, **WHEN** si tenta di aggiungere il 129° o riusarne
  uno, **THEN** il validator fallisce; save/load conserva esattamente i 128 bit.
- **GIVEN** token valido e riconciliazione mai usata, **WHEN** si riconcilia,
  **THEN** lo stato è RICONCILIATO, potenza bonus .75, malus pieno e token speso.
- **GIVEN** una seconda riconciliazione, **WHEN** viene richiesta, **THEN** fallisce
  senza patch parziale.
- **GIVEN** tre slot pieni, **WHEN** si tenta RICONCILIA, **THEN** ritorna
  `slotsFull`, non consuma token e lascia ROTTO l’alleato.
- **GIVEN** un alleato operativo, **WHEN** RIMUOVI viene confermato, **THEN** passa
  a DISPONIBILE, gli slot residui si compattano stabilmente e la sua storia resta.
- **GIVEN** un TESO o RICONCILIATO rimosso, **WHEN** viene reclutato nuovamente,
  **THEN** l’etichetta e la potenza derivano dalla storia preservata, senza reset.
- **GIVEN** una preview con revisione superata, **WHEN** viene confermata, **THEN**
  ritorna `stalePreview` e zero patch.
- **GIVEN** un rappresentante KO nella battaglia narrativa, **WHEN** si risolve il
  modificatore locale, **THEN** il bonus è sospeso in quel contesto e ritorna dopo
  la battaglia senza modificare il save.
- **GIVEN** ministro KO/assente, **WHEN** si calcola una sinergia, **THEN** solo la
  sinergia è off e il contributo base dell’alleato resta attivo.
- **GIVEN** `locked=true`, **WHEN** qualsiasi comando mutante viene inviato,
  **THEN** restituisce `coalitionLocked`; lo snapshot Election Night resta identico.
- **GIVEN** `startElection(runId)`, **WHEN** è ripetuto con lo stesso run, **THEN**
  restituisce lo stesso snapshot; con run diverso fallisce. **GIVEN** reload locked,
  **WHEN** si risolve con ID corretti/errati/ripetuti, **THEN** rispettivamente
  sblocca una volta, fallisce senza patch o restituisce il risultato idempotente.
- **GIVEN** payload corrotto con duplicati, ID ignoti e numeri non finiti, **WHEN**
  viene normalizzato, **THEN** contiene al massimo tre ID validi unici e ogni
  numero è entro range senza crash.
- **GIVEN** fixture per `broken+strained`, `scarred&&!spent`, `strained+count0`,
  `active+count2&&!scarred`, `out+count2&&!scarred` e `scarred+strained`, **WHEN**
  vengono normalizzate due volte, **THEN** rispettano le otto regole, producono la
  stessa forma canonica al secondo passaggio e nessuna eligibility divergente.
- **GIVEN** qualunque scelta di alleato, **WHEN** viene confermata, **THEN** entro
  600 secondi di playtime attivo o il prossimo checkpoint è osservabile una volta
  il `consequenceId` in dialogo, SONDAGGI, fondi, prezzo o territorio.
- **GIVEN** viewport interno 240×180 e stringhe massime validate, **WHEN** si naviga
  con tastiera o touch, **THEN** focus, preview, errori e tre slot sono leggibili
  senza collisioni e B annulla senza mutazioni.
- **GIVEN** 1.000 query e preview consecutive, **WHEN** profilate dal performance
  harness Chromium mobile CPU ×4 di `scripts/measure-performance.mjs`, **THEN**
  il p95 è ≤1 ms e la dimensione cache prima/dopo è identica.

## Open Questions

Nessuna domanda bloccante. Nomi, copy e identità degli alleati appartengono al
trattamento narrativo; formule e tag sono stabili indipendentemente dal riferimento
politico aggiornato.
