# Territori ed Election Night

> **Status**: Approved
> **Author**: Luca Tiengo + Codex
> **Last Updated**: 2026-07-10
> **Implements Pillar**: La scelta deve mordere; Poco filler
> **Design Review**: APPROVED (lean independent review, 2026-07-10)

## Overview

Territori trasforma il Tour del Feed in cinque collegi compatti, ciascuno con
consenso locale 0–100, tre azioni one-shot (due scelte) e un solo seggio. Election Night
congela uno snapshot della campagna, applica un dibattito nazionale e assegna 0–5
seggi con una formula leggibile in una schermata. Il sistema consuma Coalizione,
SONDAGGI e risultati di battaglia senza possederli né permettere grind infinito.

## Player Fantasy

Il giocatore deve sentirsi in una vera notte elettorale cartoon: riconoscere dove
ha costruito consenso, vedere ogni promessa tornare come numero e scoprire se la
propria coalizione regge quando cinque territori votano contemporaneamente. Una
sconfitta deve sembrare conseguenza delle scelte, non tiro di dado nascosto.

## Detailed Design

### I cinque collegi

| ID | Nome | Tema satirico | Affinità assetto | Trainer/evento |
|---|---|---|---|---|
| `nord` | NORD PRODUTTIVO | capannoni, bonus e inaugurazioni | centro/destra | IL PRESIDENTE DI CATEGORIA |
| `centro` | CENTRO DEI SALOTTI | talk show e retroscena | campo/centro | L’OPINIONISTA DEFINITIVO |
| `sud` | SUD DELLE PROMESSE | cantieri e nastri da tagliare | campo/civica | IL COMMISSARIO ETERNO |
| `isole` | ISOLE DEL PONTE | traghetti, plastici e rinvii | destra/civica | L’INAUGURATORE |
| `capitale_feed` | CAPITALE DEI FEED | algoritmo, fact-check e trend | tutti, nessun bonus affinità | L’ALGORITMO CANDIDATO |

I nomi sono archetipi evergreen; riferimenti datati vivono negli eventi dati.

### Core Rules

1. Ogni collegio parte una sola volta da consenso locale 38 e assegna un seggio.
2. Offre tre azioni: DIBATTITO (battaglia), PROMESSA (scelta a costo/linea rossa),
   SOSTEGNO (usa un alleato). Il giocatore ne completa al massimo due; la terza
   viene bloccata definitivamente per quella run narrativa.
3. Ogni azione ha ID one-shot, preview di costo/delta possibile e risultato
   persistito. Save/load non la rende ripetibile.
4. DIBATTITO vale +8 alla vittoria e -4 alla sconfitta; la sconfitta non provoca
   game over e non è ripetibile.
5. PROMESSA sceglie fra una opzione prudente gratuita +4 e una rischiosa +12 a
   costo/LINEA ROSSA dichiarati. Costo e consenso sono atomici; la prudente
   garantisce sempre una seconda azione valida anche con zero fondi/alleati.
6. SOSTEGNO vale +6 con alleato affine, +3 neutro, -3 incompatibile. Ogni alleato
   può dare un solo endorsement nell’intero Tour: non viene rimosso dalla
   Coalizione, ma il suo `endorsementDistrictId` è persistito e rende reale il
   costo-opportunità. Rischio e consumo sono visibili prima della conferma.
7. Il consenso locale è sempre clamp 0–100. Perdite non ricevono bonus
   `territoryGain`; i guadagni positivi usano il contratto Coalizione.
8. Election Night può iniziare solo quando ogni collegio ha esattamente due azioni
   completate e la quest principale ha consegnato i cinque dossier.
9. `startElection(runId)` blocca Coalizione e Territori e salva uno snapshot
   canonico. Nessuna azione o modifica coalizione è ammessa fino a risoluzione.
10. Il boss nazionale usa il boss base e un solo modulo autoritativo della sezione
    “Moduli boss”: DIFESA collettiva one-shot per CAMPO LARGO, reset stage/+VEL
    per CENTRO MOBILE, +2 ATT/-1 DIF al turno 7 per DESTRA COMPETITIVA, alternanza
    AI fisico/speciale +15% per LISTA CIVICA; `none` non aggiunge moduli. SCISSIONE
    sostituisce la dottrina se un alleato si è rotto nel capitolo.
11. La battaglia Election Night è one-shot e continua con vittoria o sconfitta.
    Non aggiunge punti a tutti i collegi: risolve soltanto gli esatti 50 a favore
    del giocatore se vinta e contro se persa; inoltre seleziona premio/epilogo.
    Le dottrine hanno budget equivalente
    (durata simulata entro ±5%) e non aumentano semplicemente i PV.
12. Ogni collegio calcola il risultato finale. >50 assegna il seggio, <50 lo
    perde, =50 usa l’esito del boss nazionale come RICONTO.
13. Il RICONTO è una fase di visualizzazione, non un secondo boss: applica +1/-1
    soltanto agli esatti 50 e conserva punteggio pre/post.
14. Tre o più seggi vincono le ELEZIONI; 0–2 producono finale di opposizione.
    Entrambi chiudono l’Atto 3 e sbloccano contenuti post-game differenti, senza
    cancellare il save o richiedere retry.
15. Il breakdown mostra LOCALE PRE-RICONTO, eventuale RICONTO ±1 e TOTALE. Il
    DIBATTITO territoriale appare solo nel dettaglio azioni già incorporato nel
    locale. SONDAGGI/stabilità cambiano epilogo e premi, non i seggi.

### States and Transitions

| Stato run | Comandi validi | Uscita |
|---|---|---|
| `tour` | resolveAction | `ready` quando gate soddisfatto |
| `ready` | startElection | `locked` |
| `locked` | resolveDebate | `resolved` (con breakdown RICONTO se necessario) |
| `resolved` | query finali | terminale per runId |

Ogni collegio mantiene `localConsensus`, bitset azioni, risultati e massimo due
azioni. `resolved` conserva breakdown, seggi e finale per replay/crediti.

### Catalogo azioni P1

Ogni collegio offre sempre DIBATTITO, PROMESSA e SOSTEGNO; se ne scelgono due.

| Collegio | PROMESSA prudente | PROMESSA rischiosa | Tag affine | Neutro | Incompatibile |
|---|---|---|---|---|---|
| NORD | TAVOLO PERMANENTE: +4, gratis | SUPERBONUS: +12, 1000 fondi | centro/destra | civica | campo |
| CENTRO | SILENZIO STAMPA: +4, gratis | OSPITATA TOTALE: +12, 800 fondi + linea rossa | campo/centro | civica | destra |
| SUD | CABINA DI REGIA: +4, gratis | PRIMA PIETRA: +12, 900 fondi + linea rossa | campo/civica | centro | destra |
| ISOLE | TRAGHETTO SUBITO: +4, gratis | IL PLASTICO: +12, 1000 fondi + linea rossa | destra/civica | campo | centro |
| FEED | FACT-CHECK: +4, gratis | TREND SPONSORIZZATO: +12, 1200 fondi + linea rossa | — | tutti | — |

DIBATTITO usa sempre +8/-4. SOSTEGNO richiede un alleato attivo non ancora usato e
usa +6/+3/-3; FEED è neutro. La rischiosa non domina la prudente: +8 extra costa
fondi e talvolta LINEA ROSSA. Fondi insufficienti disabilitano solo la rischiosa.

### Interactions with Other Systems

| Sistema | Input | Output |
|---|---|---|
| Coalizione | snapshot, stabilità, bonus territorio, lock | affinità, linee rosse, snapshot ID |
| SONDAGGI | valore 0–100 allo start | variante epilogo/premio, mai punti seggio |
| Battaglia | win/loss one-shot | delta dibattito locale/nazionale |
| Quest | dossier e gate | stato avanzamento/finale |
| Governo Ombra | nessuna lettura diretta | già incluso nei valori proprietari |
| Save | run e breakdown | normalizzazione/idempotenza |
| UI | comandi con revisionId | preview e breakdown immutabile |

### Transazioni cross-domain

Il `CampaignCoordinator` non possiede regole: chiede patch pure a Territori,
Coalizione e Governo usando lo stesso `transactionId` e revisioni attese. Clona il
GameState, applica tutte le patch sulla copia, rivalida gli invarianti e sostituisce
lo stato autorevole una sola volta; solo dopo emette DomainEvent e salva. Qualunque
errore o fault injection scarta la copia: fondi, locale, LINEA ROSSA, SONDAGGI e
bit idempotenza restano invariati. I transaction ID riusciti sono derivati da
`runId:districtId:actionIndex` e rendono i retry idempotenti.

### Snapshot Election v1

La canonical JSON ordinata contiene: `schemaVersion=1`, runId, revisioni Territori
e Coalizione, `coalitionSnapshotId`, cinque DistrictState ordinati per ID con locale,
bitset azioni e outcome, SONDAGGI, stabilità, lista `brokenDuringChapter`, dottrina,
`endorsementDistrictByAlly`, pending battle/outcome e playtime. `electionSnapshotId` è l’hash SHA-256 della
canonical JSON più runId. È distinto dal coalition ID; stesso ID con payload
diverso è `snapshotCollision`.

Il coordinator chiama prima Coalizione `startElection(runId)` e ottiene il
`coalitionSnapshotId`, poi crea/blocca Territori con `electionSnapshotId`, nella
stessa transazione. La risoluzione valida l’election ID, persiste il breakdown e
chiama l’unlock Coalizione col coalition ID, sempre nello stesso commit. Un crash
prima del commit lascia entrambi locked;
dopo il commit lascia Territori resolved e Coalizione unlocked.

### Checkpoint battaglia one-shot

All’avvio si salva `CampaignBattleCheckpoint`: battleId, stato e cursore PRNG
canonici, turno, squadre
snapshot (PV, status, PP, stage, active index), modulo boss e flag trigger. Dopo
ogni turno risolto si salva il nuovo checkpoint; animazioni e coda testi non sono
persistite. Reload torna al menu decisione dell’ultimo turno completato con lo
stesso RNG. Vittoria/sconfitta committano outcome una volta e rimuovono pending.

### Moduli boss

Tutti usano hook del contratto battaglia e flag one-shot nello snapshot:

- CAMPO LARGO, `endTurn`: al primo avversario ≤50% PV, +1 DIFESA a tutti i suoi vivi.
- CENTRO MOBILE, `postDamage`: dopo la prima debolezza subita, azzera stage negativi
  dell’attivo e gli dà +1 VELOCITÀ.
- DESTRA COMPETITIVA, `preMove` turno 7: +2 ATTACCO e -1 DIFESA all’attivo.
- LISTA CIVICA, `endTurn` pari: alterna preferenza AI fisica/speciale; le mosse
  dannose favorite ricevono +15% potenza per i due turni successivi.
- SCISSIONE sostituisce la dottrina se `brokenDuringChapter` non è vuoto: al primo
  membro della squadra boss mandato KO, una riserva viva entra immediatamente
  prima di concedere azione libera, con +1 ATTACCO e -1 DIFESA. Non crea mostri,
  non supera il cap squadra e non modifica EXP, PP o status.

`brokenDuringChapter` copia il set ordinato `brokenAllyIdsThisRun` dallo snapshot
Atto3NarrativeState, non lo stato Coalizione corrente: una riconciliazione non
cancella il fatto narrativo. Simulation gate: ogni modulo deve restare entro ±1
turno mediano e ±5 punti percentuali di win rate rispetto alla media moduli.

## Formulas

### Aggiornamento locale

`localAfter = clamp(0, 100, localBefore + applyTerritoryGain(max(0, delta)) + min(0, delta))`

| Variabile | Tipo | Range | Descrizione |
|---|---|---:|---|
| `localBefore` | int | 0–100 | consenso prima dell’azione |
| `delta` | int | -4, -3, +3, +4, +6, +8, +12 | risultato catalogo/battaglia |
| `applyTerritoryGain` | pure query | 0…+14 | `apply_gain` Coalizione completo (bonus e malus) sul positivo |

Esempio: locale 38, PROMESSA +12, bonus +20 e malus 0 → `38+14=52`.
Con bonus 0/malus -20 → `38+10=48`. Una sconfitta -4 resta `34`.

### Risultato collegio e seggi

`finalScore = clamp(0, 100, localConsensus)`

`seat = finalScore > 50 ? 1 : finalScore < 50 ? 0 : recountPending`

| Variabile | Tipo | Range |
|---|---|---:|
| `localConsensus` | int | 0–100 |
| `finalScore` | int | 0–100 |

Il RICONTO aggiunge +1 se il boss nazionale è vinto e -1 se perso soltanto ai
punteggi esattamente 50. I seggi sono la somma dei cinque valori binari, range
0–5; vittoria se `seats >= 3`.

Esempio UI: `50 LOCALE + 1 RICONTO = 51 → SEGGIO`.

### Stato e canonicalizzazione

`DistrictStateV1` contiene `id`, `localConsensus`, `actionMask` (bit 0–2), outcome
per i soli bit attivi, `pendingBattle?` e `revision`. La normalizzazione:

1. crea esattamente i cinque collegi mancanti a 38 e ordine canonico;
2. clamp/roundAway locale 0–100 e revision a intero ≥0;
3. applica `actionMask & 0b111`; rimuove outcome senza bit e deduplica per index;
4. se popcount >2 mantiene i due bit più bassi e scarta outcome successivi;
5. distretti ignoti vanno in `extensions.unknownDistricts` opaco, preservato ma
   escluso da gate/formule;
6. endorsement mantiene la prima coppia valida per allyId e district noto; duplicati
   successivi vengono scartati, ma rimozione/rottura dell’alleato non la cancella;
7. un `pendingBattle` valido deve riferire district/action non risolti e contenere
   checkpoint completo; se malformato l’intero primary save è invalido e usa il
   backup, perché inventare un esito permetterebbe exploit;
8. fase `ready` è derivata solo se tutti i popcount sono 2; `locked/resolved` richiede
   snapshot v1 valido, altrimenti primary invalido;
9. il secondo parse della forma canonica è identico al primo.

## Edge Cases

- **Azione duplicata o terza azione**: errore specifico, stato deep-equal, nessun costo.
- **Battaglia abbandonata/crash**: resta `pendingBattle`; reload riprende prima
  dell’esito, non assegna né permette un secondo tentativo parallelo.
- **Due effetti della stessa scelta**: costo, LINEA ROSSA e locale sono un’unica
  transazione orchestrata; errore in un comando causa rollback completo.
- **Coalizione modificata dopo preview**: `stalePreview`, ricalcolo obbligatorio.
- **SONDAGGI/locale/stabilità corrotti**: intero clamp 0–100 prima delle formule.
- **Election Night avviata due volte**: stesso run restituisce snapshot esistente;
  run diverso fallisce locked.
- **Save durante lock/recount**: ripristina fase, snapshot e battaglia pending.
- **Nessun pareggio**: salta IL RICONTO e risolve immediatamente.
- **Più pareggi**: un unico esito +1/-1 viene applicato a tutti; breakdown conserva
  il punteggio pre/post per ciascuno.
- **Esatto 3 seggi**: vittoria; nessun ballottaggio nascosto.
- **Flag off**: UI e controller non raggiungibili; payload preservato.
- **Catalogo collegi diverso da cinque**: validator/build failure.
- **ID collegio ignoto nel save**: preservato opaco in extensions ed escluso dalle
  query; action index oltre 2 viene mascherato e non può soddisfare il gate.

## Dependencies

| Dipendenza | Tipo | Source of truth |
|---|---|---|
| Coalizione | hard | `design/gdd/coalizione.md`, ADR-0006 |
| Feature flags | hard | ADR-0001, `src/game/features.ts` |
| Save | hard | ADR-0002, `src/game/state.ts` |
| SONDAGGI/Governo | hard | `src/game/governo.ts` |
| Battaglia | hard | `docs/battle-effect-contract.md` |
| Quest/Narrativa | hard | `src/data/quests.ts`, `design/narrative/atto3.md` |
| UI | downstream | UX spec P1-T05 |

## Tuning Knobs

### Baseline economica Atto 3

Le fixture di ingresso sono `low=3000`, `median=5000`, `high=8000` fondi, misurate
dai save automatici a fine Atto 2. I costi rischiosi 800–1200 valgono 16–24% del
saldo mediano. Ogni collegio conserva PROMESSA prudente gratuita, quindi fondi zero
non causano soft-lock. Prima di R2 la smoke campaign deve rigenerare i tre percentili:
se la mediana reale esce da 4000–6500, costi e reward C2/C3 vengono ritunati insieme.
I +600/+800 narrativi sono one-shot; non sono faucet ripetibili.

| Knob | Default | Range sicuro |
|---|---:|---:|
| collegi | 5 | fisso 5 |
| azioni disponibili/completabili | 3/2 | fisso |
| consenso iniziale | 38 | 36–40 |
| battaglia locale win/loss | +8/-4 | +6…+10 / -3…-6 |
| promessa prudente/rischiosa | +4/+12 | +3…+5 / +10…+12; prudente sempre gratuita |
| sostegno affine/neutro/incompatibile | +6/+3/-3 | ±1 dal default; un endorsement/alleato |
| soglia seggio | >50 | fisso |
| soglia vittoria | 3/5 | fisso |

## Visual/Audio Requirements

- Mappa elettorale compatta con cinque tessere distinguibili per silhouette e
  pattern, non solo colore; palette avorio/blu con rosso/blu elettorale attenuati.
- Urna che si apre per ogni seggio, animazione ≤400 ms e modalità reduced-motion.
- RICONTO usa lente/mazzetto di schede, mai immagini realistiche di brogli.
- Boss e fondali PixelLab cartoon-RPG conformi al reboot; nessun testo negli asset.
- Stinger crescente per seggio, ma testo e icona comunicano sempre l’esito.

## UI Requirements

La schermata TOUR mostra cinque collegi, consenso e azioni usate. Election Night
usa una sequenza skippabile: snapshot → boss → cinque breakdown → eventuale
RICONTO → totale. Ogni breakdown deve stare in una card 224×48 o scorrere, con
formula su righe separate e segno esplicito. Touch target minimo 32×24, focus
visibile, testi variabili clippati, B disabilitato soltanto durante commit atomico.

## Acceptance Criteria

- **GIVEN** ogni collegio nuovo, **WHEN** inizializzato, **THEN** locale=38, azioni=0.
- **GIVEN** tutte le sequenze di tre azioni, **WHEN** si tenta la terza o un replay,
  **THEN** errore e hash canonico invariato.
- **GIVEN** zero fondi e coalizione vuota, **WHEN** si completa DIBATTITO e si cerca
  la seconda azione, **THEN** PROMESSA prudente +4 resta valida in ogni collegio.
- **GIVEN** un alleato ha già sostenuto un collegio, **WHEN** viene scelto altrove,
  **THEN** il comando fallisce senza patch; rimozione/rottura non resetta endorsement.
- **GIVEN** DIBATTITO win/loss, **WHEN** risolto una volta, **THEN** delta +8/-4 e
  nessun game over/retry.
- **GIVEN** delta positivo/negativo ai boundary, **WHEN** applicato, **THEN** solo
  il positivo usa `territoryGain`, poi clamp 0–100.
- **GIVEN** SONDAGGI e stabilità ai boundary, **WHEN** si calcolano i seggi,
  **THEN** non alterano `finalScore`, ma selezionano soltanto epilogo/premio dati.
- **GIVEN** tutte le combinazioni boundary locale e modifier Coalizione, **WHEN**
  si calcola, **THEN** score 0–100, >50 seggio, <50 perso, =50 RICONTO.
- **GIVEN** uno o più pari, **WHEN** il boss nazionale termina, **THEN** il breakdown
  RICONTO applica +1/-1 solo ai pari ed è idempotente.
- **GIVEN** 0…5 seggi, **WHEN** si risolve, **THEN** 0–2 opposizione, 3–5 governo.
- **GIVEN** run locked salvata in ogni fase, **WHEN** reload, **THEN** snapshot,
  pending e breakdown sono identici e nessun comando tour/coalizione passa.
- **GIVEN** stesso run/start/resolve ripetuto, **WHEN** reinviato, **THEN** risultato
  idempotente; ID errato fallisce senza patch.
- **GIVEN** lo stesso stato/run, **WHEN** canonicalizzato su due runtime, **THEN**
  coalitionSnapshotId ed electionSnapshotId coincidono coi rispettivi payload;
  resolve passa il coalition ID all’unlock e collisioni/mismatch falliscono.
- **GIVEN** fault injection dopo ciascuna patch PROMESSA, **WHEN** il coordinator
  abortisce, **THEN** fondi, locale, Coalizione, SONDAGGI, bit e revisioni restano
  deep-equal; retry col transactionId riuscito non duplica effetti.
- **GIVEN** crash/reload all’avvio e dopo ogni turno di battaglia one-shot, **WHEN**
  riprende, **THEN** team, PV, PP, status, stage, active index, modulo e RNG sono
  quelli dell’ultimo checkpoint, incluso stato/cursore PRNG; outcome è committato una volta.
- **GIVEN** ogni modulo boss e team baseline, **WHEN** si eseguono almeno 10.000
  simulazioni seedate, **THEN** mediana turni è entro ±1 e win rate entro ±5 punti
  dalla media; SCISSIONE sostituisce, non somma, la dottrina.
- **GIVEN** actionMask corrotto, distretti mancanti/ignoti e valori non finiti,
  **WHEN** si normalizza due volte, **THEN** applica le nove regole, gate derivato
  corretto e seconda forma identica; pending malformato recupera dal backup.
- **GIVEN** catalogo completo, **WHEN** si enumerano tutte le strategie di due
  azioni sul vettore `{delta locale, -costo fondi, -rischio linea rossa,
  endorsement residui}`, **THEN**
  ogni collegio ha almeno due opzioni non Pareto-dominate e nessuna azione domina
  in tutti i profili fondi/coalizione; DIBATTITO viene valutato su entrambi i rami
  win/loss e sull’expected value del profilo, mai come esito certo.
- **GIVEN** 10.000 run seedate per assetto e profilo, **WHEN** si misura il sistema,
  **THEN** mediana=3 seggi, blind win rate 35–55%, competente 65–80% e nessun
  assetto/step sposta il win rate di oltre 15 punti percentuali.
- **GIVEN** 240×180, touch/tastiera/reduced-motion e stringhe massime, **WHEN** si
  percorre tutto il flusso, **THEN** formula, focus ed esiti restano leggibili;
  breakdown mostra DIBATTITO solo tra le azioni e RICONTO solo sugli esatti 50.
- **GIVEN** flag off, **WHEN** boot/load, **THEN** campagna storica invariata e
  payload preservato.

## Open Questions

Nessuna bloccante. Copy dei boss e azioni specifiche appartengono al trattamento
narrativo; i valori devono superare balance simulation prima dell’implementazione.
