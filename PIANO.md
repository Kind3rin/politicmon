# PIANO — Politicmon

Aggiornato: 2026-07-10

## Programma hardening professionale — 2026-07-12

Obiettivo: portare la RC da prodotto indie avanzato a release 1.0 coerente,
misurata e verificabile. Fino al completamento di questo programma vige il
**feature freeze**: nessuna nuova meccanica o area, salvo correzioni necessarie
ai gate sotto.

### HP0 — Audit visuale e fallback (P0)

- [x] Inventario automatico di tutte le 40 scene e relativi screenshot (2026-07-12).
- [x] Zero fallback legacy: 62/62 sprite base/action pronti al boot (2026-07-12).
- [x] Zero chiamate `clipToWidth` nelle scene; testi variabili completi (2026-07-12).
- [x] Matrice portrait/landscape/desktop senza overflow e canvas 4:3 (2026-07-12).
- [x] Gate CI che fallisce su nuove superfici senza evidenza visuale (2026-07-12).

**Evidenza:** report `design/qa/professional-visual-audit.md`, manifest JSON e
screenshot in `artifacts/screens/professional/`.

### HP1 — Roster e animazioni (P1)

- [x] Ogni specie ha PNG front valido e identità politica/meme riconoscibile;
      chiuso rework SALIS/FUTURORSO/DODO con review PixelLab e screenshot
      front/action/evoluzione in-game (2026-07-12).
- [x] Ogni specie ha idle, attacco, danno e KO; frame dedicato o contratto
      procedurale esplicito e KO non istantaneo (2026-07-12).
- [x] Evoluzioni e Forme Meme non mostrano frame legacy o placeholder: 62/62
      asset runtime pronti al boot, forme applicate sul PNG base verificato e
      matrice evoluzioni/action verde (2026-07-12).
- [x] Matrice visuale parametrica 52×4 con confronto pixel degli stati (2026-07-12).

### HP2 — UX mobile e onboarding (P2)

- [x] Nessun testo sotto la soglia di leggibilità per compressione orizzontale:
      gate dati-driven su 359 stringhe reali, minimo 90,3% contro soglia 80%
      (2026-07-12).
- [x] Layout a riga intera/card dedicata per stringhe variabili lunghe: menu
      mosse PvE/PvP a quattro righe, categoria/evoluzione Squadra separate e
      nomi mossa completi (2026-07-12).
- [x] Flussi Tessera, Mappa, Scambio, Coalizione e Governo comprensibili senza
      istruzioni esterne; fixture visuali per stato normale/selezionato/KO e
      test completo scambio/anti-cheat verdi (2026-07-12).
- [x] Touch target, focus, conferma/annulla e stato selezionato coerenti:
      audit automatico su 31 scene interattive, 8 target touch portrait/landscape
      e fixture dedicate TRAGUARDI/STARTER (2026-07-12).

### HP3 — Ritmo dell'esplorazione (P3)

- [x] Sfide vaganti esclusivamente facoltative e visibili nel mondo: compaiono
      come NPC adiacenti e la lotta parte soltanto interagendo con A (2026-07-12).
- [x] Misura incontri/interruzioni per 1.000 passi in ogni fascia di campagna:
      audit deterministico su 100 semi, da 55,8 tutorial a 77,5 late-game
      nello scenario peggiore di cammino continuo su terreno incontro (2026-07-12).
- [x] Nessuna sequenza di interruzioni prima di 8 passi liberi: tregua condivisa
      tra trainer, comparsa vagante e incontri selvatici, verificata dall'audit
      `npm run audit:exploration-rhythm` (2026-07-12).
- [x] Backtracking e tempi morti verificati su 22 obiettivi del percorso critico:
      tutti raggiungibili e massimo 2 transiti fra obiettivi consecutivi, imposto
      come gate da `npm run audit:critical-route` (2026-07-12).

### HP4 — Bilanciamento reale (P4)

- [x] Telemetria locale anonima nel save: durata attiva, passi, battaglie,
      vittorie/sconfitte/fughe, KO del party, oggetti cura, visite al BAR e
      checkpoint con livello medio; grind e abbandono sono derivabili dai delta
      fra checkpoint senza inviare dati in rete (2026-07-12).
- [ ] Almeno 10 run complete su fixture/device diversi.
- [x] Curva boss, economia, cattura ed EXP entro range dichiarati: doppio
      profilo boss, invarianti economia e audit completo sulle 52 specie;
      massimo 4,3 KO wild/livello e cattura peggiore 5,7 SCHEDONE per un
      leggendario indebolito (`audit:progression`, 2026-07-12).
- [x] Nessun boss richiede grind obbligatorio o strategia unica: doppio gate su
      9 boss, con primo tentativo senza consumabili al 55–75% e party preparato
      con cure all'85–100%; entrambi verdi e roster del giocatore ruotati
      (`balance:bosses`, `playtest:campaign`, 2026-07-12).

### HP5 — Playtest esterno (P5)

- [ ] Minimo 5 tester esterni e almeno 2 run complete da nuovi giocatori.
- [ ] Difetti classificati S1–S3, riproducibili e collegati a evidenza.
- [ ] ≥80% comprende i sistemi chiave senza spiegazione verbale.
- [ ] Nessun S1/S2 aperto al gate successivo.

### HP6 — Debito tecnico e prestazioni (P6)

- [ ] Estrarre da `WorldScene` spawn/interruzioni, rendering NPC e trasporti.
- [ ] Estrarre da `BattleScene` orchestrazione messaggi e reward post-battaglia.
- [ ] Nessun nuovo modulo oltre 40 KB; contratti coperti da test.
- [ ] Code splitting: bundle iniziale gzip entro 250 KiB.
- [ ] Frame mobile p95 entro 20 ms e zero long task >100 ms nel percorso critico.

### HP7 — PWA e release 1.0 (P7)

- [ ] Upgrade reale da RC precedente senza perdita save.
- [ ] Installazione, offline, resume, background/foreground e cache asset testati
      su Android e almeno un browser iOS/WebKit.
- [ ] Pacchetto portable, backup release, changelog e rollback verificati.
- [ ] Due build candidate consecutive senza nuovi blocker.
- [ ] GO formale solo con tutti i gate HP0–HP7 verdi.

### Ordine operativo

Un task alla volta: diagnosi → fix minimo → test mirato → regressione completa →
screenshot/report → commit → deploy. Ogni task deve chiudere un criterio sopra;
non si considera completato soltanto perché typecheck o build sono verdi.

## Baseline di consegna v2 — sezione autorevole

Questa sezione stabilisce **come** consegnare tutto il catalogo del piano. Le
sezioni successive restano il backlog funzionale dettagliato; in caso di
contrasto su ordine, quantità o gate, prevale questa baseline.

### Principio di delivery

Tutte le feature previste restano in scope complessivo, ma non appartengono alla
stessa release:

| Treno | Contenuto | Uscita |
|---|---|---|
| **R0 — Stabilizzazione** | baseline, ADR, test infrastrutturali, seam refactor | interna |
| **R1 — Vertical Slice** | Campo Largo, coalizione minima, 1 collegio, 1 boss, 2 finali | playtest |
| **R2 — Atto 3 Core** | 3 collegi, 2 famiglie, Palazzo dei Feed, Election Night | pubblica |
| **R3 — Atto 3 Complete** | 5 collegi, capitoli extra, 6 famiglie, 4 finali | pubblica |
| **R4 — Longevità** | campagna settimanale, COPPA variabile, rivincite | pubblica |
| **R5 — Live Satire** | forme meme, pack stagionali, tool editoriale, fonti | ricorrente |

Ogni treno deve essere giocabile e rilasciabile indipendentemente. Una feature
incompleta resta dietro flag e non entra nel percorso del save pubblico.

### Budget e stime

| Treno | Stima solo dev | Gate massimo |
|---|---:|---|
| R0 | 2–4 settimane | nessun cambiamento percepibile obbligatorio |
| R1 | 4–7 settimane | massimo 1 mappa outdoor + 1 interno |
| R2 | 8–12 settimane | massimo 2 famiglie nuove e 2 finali |
| R3 | 8–14 settimane | completa contenuto, non introduce sistemi core |
| R4 | 6–10 settimane | riusa contenuto esistente |
| R5 | continuativo | pack piccoli, reversibili |

Stima complessiva realistica: **7–12 mesi**, variabile con produzione PixelLab e
numero di iterazioni di playtest. Nessuna data pubblica prima del gate R1.

### Regola scope

- Tutto è incluso nel **programma**, non tutto nella stessa **release**.
- Nuove idee entrano in R5/Backlog finché non viene rimosso lavoro equivalente.
- R2 non assorbe task R3 per “comodità”.
- Un gate fallito genera correzioni, non nuove feature.
- Ogni treno ha un branch/release candidate e un changelog separato.

---

## R0 — Stabilizzazione e architettura

### R0-T01 — Decision record prima del codice

**Stato:** COMPLETATO (ADR scritti `Proposed`, 2026-07-10). L’accettazione è
subordinata a review architetturale indipendente; ADR-0002/0006 restano gate per
nuovi campi persistenti.

Creare gli ADR in `docs/architecture/` prima dei relativi sistemi:

1. [x] `adr-0001-feature-flags-release-trains.md` — flag, default, rimozione e rollout.
2. [x] `adr-0002-save-schema-migrations.md` — ownership, versioni e fixture.
3. [x] `adr-0003-world-scene-boundaries.md` — cosa resta nella scena e cosa viene estratto.
4. [x] `adr-0004-map-registry-modules.md` — split dei dati mantenendo API `MAPS`.
5. [x] `adr-0005-content-event-schema.md` — eventi, fonti, scadenze e validazione.
6. [x] `adr-0006-coalition-election-ownership.md` — stato, comandi, query ed eventi.

Ogni ADR deve contenere contesto, decisione, alternative scartate, conseguenze,
rollback, requisiti coperti e test richiesti. Stato iniziale `Proposed`; diventa
`Accepted` solo dopo review.

**Gate:** nessun nuovo campo di save o modulo Atto 3 prima di ADR-0002/0006 accettati.

### R0-T02 — Feature flags

**File previsti:** `src/game/features.ts`, test; nessun flag sparso nelle scene.

Flag iniziali:

- `atto3`
- `coalition`
- `territories`
- `memeEvents`
- `weeklyCampaign`

Best practice:

- default `false` in produzione finché il treno non passa;
- override DEV tramite query/localStorage namespaced;
- dipendenze validate (`territories` richiede `atto3`);
- save non deve dipendere dalla presenza del flag per essere parsato;
- ogni flag ha owner, treno previsto e task di rimozione.

**Acceptance criteria:** disabilitando tutti i flag la build si comporta come la
versione precedente; nessun ramo incompleto è raggiungibile da save pubblico.

### R0-T03 — Test infrastructure

**Stato:** COMPLETATO (2026-07-10). Suite ricorsive `unit`, `integration` e
`content`, runner cross-platform, documentazione, smoke checklist e CI aggiornati.
I validator mappe/porte/sprite non sono ancora gate CI perché presentano debito
legacy noto: 11 + 5 + 2 failure rilevate e assegnate a R0-T08. Inserirli prima
della correzione renderebbe la pipeline permanentemente rossa.

Riorganizzare senza big-bang:

```text
tests/
  unit/
  integration/
  fixtures/saves/
  content/
```

Aggiornare `npm test` per includere ricorsivamente tutti i test. CI obbligatoria:

1. typecheck;
2. unit/integration;
3. content validators;
4. map/evolution/sprite checks;
5. build;
6. coverage PixelLab strict solo sui branch che cambiano asset/manifest.

Non imporre una percentuale di coverage arbitraria. Imporre copertura per rischio:

- 100% dei rami di migrazione save supportati;
- boundary test per formule coalizione/elezione;
- contract test per tutti i registry dati;
- integration test per checkpoint Atto 3;
- smoke test della campagna storica.

### R0-T04 — Save fixtures e migrator esplicito

**Stato:** COMPLETATO (2026-07-10). Parser/serializer puri esportati, fixture
sintetiche per nuova/post-medaglie/post-Garante/post-UE, scenari multi-slot e
recovery, copertura di tutte le chiavi legacy v3–v12 e 10 integration test.
Corretto inoltre il recovery: il primario corrotto non viene più ruotato sopra
il backup valido durante il ripristino.

Prima di aggiungere campi:

1. congelare fixture anonime v13: nuova, post-medaglie, post-Garante, post-UE,
   multi-slot, backup valido e primario corrotto;
2. separare normalizzazione dati da accesso `localStorage`;
3. rendere testabile `parseState` o esporre un parser puro documentato;
4. aggiungere test round-trip export/import;
5. definire politica: migrazione solo forward, mai downgrade distruttivo.

Ogni futura versione aggiunge una fixture e un test. Non modificare le fixture
storiche per far passare un parser nuovo.

### R0-T05 — Split di `maps.ts` mantenendo compatibilità

Problema: `src/data/maps.ts` supera 100 KB. Procedere meccanicamente, senza
ridisegnare contemporaneamente i contenuti.

Target:

```text
src/data/maps/
  types.ts
  factories.ts
  base.ts
  postgame.ts
  interiors.ts
  atto3.ts
  index.ts
```

Procedura:

1. spostare tipi, nessun comportamento;
2. spostare factory;
3. spostare regioni una per commit;
4. ricomporre ed esportare `MAPS`, `BAR_RESPAWN`, `STARTER_SPOTS` dalla facade;
5. mantenere temporaneamente `src/data/maps.ts` come re-export se riduce churn;
6. eseguire tutti i check mappe dopo ogni commit;
7. confrontare chiavi/numero mappe prima e dopo con contract test.

**Divieto:** nessuna nuova mappa nello stesso commit dello split.

**Completato (2026-07-10):** facade compatibile `src/data/maps.ts`, contratti e
factory in `src/data/maps/`, cataloghi separati `base`, `postgame`, `interiors`
e placeholder `atto3`. La composizione rifiuta chiavi duplicate e mismatch tra
chiave e `MapDef.id`. Contract test: esattamente 40 mappe e tutti i riferimenti
warp/edge risolti. Nessun contenuto o coordinata modificati. I validator
continuano a riportare gli stessi 11 problemi map-consistency e 5 porte legacy,
da risolvere esclusivamente in R0-T08.

### R0-T06 — Confine di `WorldScene`

Problema: `WorldScene.ts` supera 150 KB e gestisce movimento, rendering, NPC,
battaglie, multiplayer, tornei, trasporti e narrativa.

Approccio **seam-first**, non riscrittura:

- la scena mantiene lifecycle, input, coordinate, camera e rendering;
- regole pure vanno in `src/game/*`;
- orchestration Atto 3 va in controller piccoli con interfacce esplicite;
- servizi non importano `WorldScene` e non accedono al canvas;
- la scena traduce risultati dominio in `MessageBox`, scene push/pop e audio.

Target iniziale:

```text
src/game/world/
  WorldScene.ts
  worldContext.ts
  npcInteraction.ts
  battleCoordinator.ts
  atto3Controller.ts
```

Estrarre solo seam necessari:

1. routing interazioni NPC;
2. avvio/risultato battaglia;
3. comandi Atto 3.

Non estrarre movimento, collisioni o rendering finché non impediscono un task.
Limite indicativo: nessun nuovo blocco Atto 3 >100 righe dentro `WorldScene`.

**Completato (2026-07-10):** aggiunti `worldContext.ts`,
`npcInteraction.ts`, `battleCoordinator.ts` e `atto3Controller.ts`.
`WorldScene` conserva lifecycle/input/camera/rendering e traduce routing/comandi
in scene e dialoghi. Le priorità NPC, la costruzione team (hard mode, mosse,
hold item) e la persistenza vittorie sono testate fuori dalla scena. Il seam
Atto 3 è collegato ma inattivo fino al vertical slice; nessun blocco di
movimento, collisione o rendering è stato estratto.

### R0-T07 — Confine di `BattleScene`

`BattleScene` resta orchestratore della coda `Step`. Nuove mosse/abilità devono
essere implementate come regole pure o handler registrati, non nuovi `if` sparsi.

Prima del pacchetto Atto 3:

- inventario degli effect handler esistenti;
- contratto unico per trigger pre-mossa, danno, post-mossa, switch, KO, fine turno;
- test di ordine trigger;
- parità PvE/PvP dichiarata per ogni effetto;
- nessuna duplicazione della formula tra `BattleScene`, `PvpBattleScene` e sim.

Non fare una riscrittura ECS o event bus globale: costo e rischio non giustificati.

**Completato (2026-07-10):** `effectContract.ts` definisce le sei fasi,
l’inventario univoco degli handler e la parità `shared`/`pve-only`/`pvp-only`.
PvE e PvP condividono ora pre-mossa, immunità status/stat e fine turno;
entrambi usano `calcDamage` da `sim.ts`, mentre `PvpBattleScene` delega il turno
a `duelsim`. Testano ordine, copertura fasi, parità strutturale e assenza della
formula in PvP. Specifica: `docs/battle-effect-contract.md`. La baseline
campagna automatizzata è byte-identica prima/dopo il refactor.

### R0-T08 — Content validators

Creare script read-only che falliscono con messaggi precisi per:

- ID duplicati;
- specie senza sprite/learnset valido;
- mosse o abilità inesistenti;
- trainer con specie/livelli invalidi;
- warp a mappa/coordinate inesistenti;
- righe mappa non uniformi;
- quest con target/flag incoerenti;
- eventi meme senza fonte, scelta o effetto;
- testi oltre budget noto quando non clippabili.

I validator devono girare localmente e in CI senza browser.

**Completato (2026-07-10):** `npm run validate:content` gira con Node/tsx e
copre tutti i punti sopra; è gate CI. Aggiunti schema/registry dichiarativo
`memeevents.ts` e budget single-line. Corretti i difetti emersi: guida della
Commissione fuori mappa, fronti porte di Caput Mundi/Stretto, interpretazione
della darsena navigabile e scaling 16×16 delle texture terreno. Tutti i check
mappe, porte, uscite e 374 PNG risultano verdi. Specifica operativa:
`docs/content-validation.md`.

### R0-T09 — Baseline prestazioni

Misurare, non ottimizzare a caso:

- tempo boot e caricamento asset;
- frame time mondo/battaglia su profilo mobile;
- memoria sprite cache;
- dimensione bundle;
- tempo parse/save.

Budget iniziali da confermare su device reale:

- gameplay stabile a 60 fps, floor accettabile 30 fps su device basso;
- nessun frame >100 ms durante input normale;
- save sincrono senza freeze percepibile;
- nessuna regressione bundle >10% per treno senza motivazione.

**Completato (2026-07-10):** `npm run perf:baseline` registra boot, rAF/costo
draw di mondo-battaglia-DEX su Chromium mobile CPU ×4, working set/worst-case
sprite, bundle e parse/serialize save. `npm run perf:check` applica budget e
regressione gzip ≤10%. Il primo profilo ha scoperto frame p95 150 ms: la cache
dei glifi bitmap ha eliminato il collo di bottiglia senza cambiare resa visiva.
Baseline accettata: primo frame ~1,2 s su rete profilata, p95 rAF 16,7–16,8 ms,
nessun frame >100 ms, bundle code gzip ~286 KiB, sprite compressi ~0,91 MiB,
save parse/serialize <0,1 ms. Evidenza in `docs/performance-baseline.md/json`;
resta obbligatoria la conferma su device reale prima della release.

### Gate R0

- [x] 6 ADR scritti, quelli fondazionali accettati;
- [x] flag funzionanti e testati;
- [x] fixture save e migration test;
- [x] `maps.ts` modulare con facade compatibile;
- [x] seam WorldScene pronto per Atto 3;
- [x] contract nuovi effetti battaglia definito;
- [x] validator contenuti in CI;
- [x] baseline prestazioni registrata;
- [x] campagna storica smoke-testata (`npm run smoke:campaign`, 6/6 checkpoint).

Se il gate fallisce, non iniziare R1. Correggere solo i blocker del gate.

---

## R1 — Vertical Slice isolata

R1 implementa P1, P2 e P3 solo nella quantità minima già definita:

- coalizione: 3 candidati, 2 slot, una linea rossa per candidato;
- territorio: 1 collegio;
- mappe: Campo Largo + backstage;
- contenuto: nessuna nuova famiglia obbligatoria per il primo playtest tecnico;
- boss: Futuro Anteriore con roster esistente;
- finali: stabile/rottura;
- persistenza: campi definitivi, non prototipi incompatibili.

### Ordine R1

1. GDD Coalizione.
2. GDD Territorio/Election Night ridotto alla slice.
3. ADR-0006 accettato.
4. funzioni pure + test.
5. schema save + migrazione fixture.
6. UI debug minimale.
7. controller Atto 3.
8. mappe e NPC.
9. boss/finali.
10. UX definitiva solo dopo comprensione validata.

### Gate R1

- [ ] 5 tester esterni o sessioni equivalenti;
- [ ] ≥4/5 comprendono bonus e linea rossa senza spiegazione verbale;
- [ ] ≥3/5 scelgono motivati da trade-off, non da testo ambiguo;
- [ ] nessun soft-lock o save incompatibile;
- [ ] durata 30–45 minuti;
- [ ] boss superabile senza grind;
- [ ] entrambe le scelte osservate almeno una volta;
- [ ] nessuna regressione critica sulla campagna esistente;
- [ ] decisione esplicita PROCEED / ITERATE / STOP.

---

## R2 — Atto 3 Core rilasciabile

Contenuto:

- 3 collegi completi;
- Coalizione integrata al Governo Ombra;
- Palazzo dei Feed compatto;
- Election Night;
- 2 famiglie: SALISTROBO e FUTURORSO;
- 4 mosse e 2 abilità nuove;
- 2 finali;
- 6 eventi evergreen;
- una traccia Atto 3 riutilizzata con variazioni.

### Gate R2

- [ ] storia Atto 3 completabile end-to-end;
- [ ] almeno due build candidate senza blocker nuovi;
- [ ] fixture save per prima/durante/dopo Atto 3;
- [ ] formule simulate ai boundary;
- [ ] economia senza soft-lock;
- [ ] screenshot audit tutte le scene nuove;
- [ ] touch e desktop completi;
- [ ] PWA update da versione precedente verificato su telefono;
- [ ] satire/source review completata;
- [ ] feature flag `atto3` attivabile senza rebuild e rollback sicuro.

R2 è la prima release pubblica. Se una feature R3 non è pronta, non blocca R2.

---

## R3 — Atto 3 Complete

Completa tutto il contenuto narrativo previsto senza introdurre nuovi sistemi
fondazionali:

- collegi 4 e 5;
- Futuro Anteriore esteso;
- Temptation Diplomacy;
- Genova Techno, solo dopo spike di 2 giorni;
- altre 4 famiglie fino al totale di 6;
- pacchetto completo 8 mosse/5 abilità;
- altri 2 finali;
- asset mondo e 3 tracce totali.

### Spike Genova Techno

Prototipo isolato, nessun campo save. Valutare leggibilità touch, reduced-motion,
latenza e divertimento. Se non supera 4/5 comprensione e 3/5 gradimento, sostituire
con battaglia/evento narrativo: il capitolo resta, il mini-game no.

### Gate R3

- [ ] nessun nuovo core system oltre quelli R2;
- [ ] tutti i rami completabili da fixture dedicate;
- [ ] 6 famiglie con ruolo tattico non duplicato;
- [ ] 4 finali raggiungibili e testati;
- [ ] Atto 3 aggiunge 3–5 ore misurate;
- [ ] regressione prestazioni entro budget.

---

## R4 — Longevità

Implementare P6-T01..03 in quest’ordine:

1. campagna settimanale usando lo stesso dominio Coalizione/Territori;
2. modificatori COPPA;
3. rivincite adattive.

Best practice:

- stato run separato dalla campagna narrativa;
- RNG seedato e riproducibile;
- nessuna ricompensa FOMO o potenza esclusiva;
- run riprendibile dopo reload;
- reward table con sink/faucet simulati;
- rotazioni validate da data, non logica duplicata nelle scene.

### Gate R4

- [ ] 10 seed consecutivi completabili;
- [ ] nessuna combinazione impossibile;
- [ ] durata mediana 35–50 minuti;
- [ ] economia netta entro target;
- [ ] almeno 30% dei tester ripete una seconda run;
- [ ] offline completo e cambio data gestito.

---

## R5 — Live Satire e contenuto stagionale

Implementare P6-T04..06 e il registry completo:

- forme meme;
- pack datati;
- validator/editor CLI;
- fonti e crediti;
- processo editoriale ricorrente.

### Procedura di un pack

1. raccogliere almeno due fonti affidabili quando il fatto è controverso;
2. classificare evergreen/stagionale/fragile;
3. scrivere gag comprensibile senza conoscere la notizia;
4. review satirica con checklist P7-T07;
5. implementare solo dati dichiarativi;
6. validare date, ID, fonti, lunghezza ed effetti;
7. screenshot/playtest;
8. impostare fallback e scadenza;
9. release PWA normale;
10. verificare che un pack scaduto non rompa save o contenuti ottenuti.

### Gate R5 per ogni pack

- [ ] zero codice di gameplay specifico del singolo meme;
- [ ] fonti presenti;
- [ ] effetti entro whitelist;
- [ ] nessun testo diffamatorio o su vita privata;
- [ ] fallback valido;
- [ ] disattivazione tramite flag possibile;
- [ ] save compatibile prima/dopo scadenza.

---

## Best practice trasversali obbligatorie

### Architettura

- Dipendenze a senso unico: `data → game/domain → scenes`; il dominio non importa UI.
- Stato posseduto da un solo modulo; le scene inviano comandi e leggono query.
- Funzioni pure per formule, selezione eventi e validazione.
- Facade stabili per evitare refactor a cascata.
- Niente service locator globale o event bus generico.
- Dependency injection solo dove serve testare tempo, RNG o storage.
- Refactor e feature in commit separati.

### Dati e salvataggi

- ID stabili e mai riciclati.
- Migrazioni idempotenti e forward-only.
- Parser difensivo su campi mancanti/invalidi.
- Scrittura atomica primario + backup già esistente preservata.
- Nessuna logica stagionale che cancelli collezionabili.

### Test

- Piramide: molti unit puri, pochi integration mirati, screenshot per UI.
- Test deterministici: RNG e orologio iniettati.
- Ogni bug corretto aggiunge un regression test quando economicamente sensato.
- Snapshot solo per strutture stabili; non sostituiscono assertion semantiche.
- Testare comportamento pubblico, non dettagli interni.

### UI/UX

- Stato e conseguenza comunicati prima della conferma irreversibile.
- Colore mai unico segnale.
- Testi variabili sempre clippati/wrappati.
- Tap target coerenti con touch esistente.
- Reduced-motion rispettato.
- Nessun tutorial modale lungo: introduzione progressiva.

### Prestazioni

- Misurare prima/dopo; nessuna micro-ottimizzazione speculativa.
- Asset precaricati solo se core; stagionali lazy-loaded.
- Cache con limiti/chiavi stabili.
- Evitare allocazioni per-frame nei nuovi HUD/controller.

### Sicurezza e privacy

- Nessun HTML non sanitizzato da contenuti evento.
- URL fonti con protocollo `https` e apertura esplicita.
- Nessun dato analytics remoto senza consenso e specifica separata.
- Chat/P2P non entra in statistiche run.

### Git e release

- Branch `codex/<treno>-<tema>`.
- Conventional commits atomici.
- PR separata per refactor, dominio, contenuti e asset quando possibile.
- Feature flag prima del merge di codice incompleto.
- Tag release e rollback documentato.
- HANDOFF aggiornato a ogni modifica strutturale.

---

## Traceability minima richiesta

Prima di R1 creare una matrice in `docs/architecture/requirements-traceability.md`:

| Requirement | GDD | ADR | Task | Test | Stato |
|---|---|---|---|---|---|

Ogni requisito core Coalizione/Territori deve avere l’intera catena. I contenuti
puramente narrativi possono avere test visuale/manuale dichiarato; migrazioni,
formule e registry richiedono test automatici.

## Ordine immediato aggiornato

1. R0-T01 — ADR feature flag/save/confini.
2. R0-T03 — struttura test e CI.
3. R0-T04 — fixture save v13.
4. P0-T01 — statistiche run minime, senza nuova scena.
5. P0-T03 — playtest campagna.
6. P0-T04 — baseline.
7. R0-T05 — split mappe meccanico.
8. R0-T06 — seam WorldScene per routing Atto 3.
9. R0-T07 — contract effetti battaglia.
10. R0-T08/09 — validator e performance baseline.
11. P1-T01..05 — GDD/review Atto 3.
12. Gate R0.
13. R1 Vertical Slice.

Non produrre nuovi asset Atto 3 prima del gate R0, salvo concept art non
integrata usata per validare la direzione.

## Direzione

Espansione principale: **ATTO 3 — VERSO LE ELEZIONI**.

Il giocatore ha conquistato Palazzo, Colle e Bruxelles, ma governare non basta:
deve costruire una coalizione, attraversare una campagna dominata dai social e
vincere le ELEZIONI GENERALI. Tono: satira bonaria, fatti pubblici trasformati
in archetipi e mostri; niente accuse, procedimenti o dettagli privati usati come
gag.

Obiettivo durata:

- campagna esistente: misurare con telemetria locale e playtest cronometrato;
- Atto 3: +3–5 ore;
- contenuto ripetibile: +10 ore senza grind obbligatorio;
- completismo totale: target 20–25 ore.

## Pilastri

1. **La politica è una squadra instabile** — ogni alleanza dà un vantaggio e un compromesso.
2. **Il meme cambia, la meccanica resta** — notizie recenti diventano eventi dati, non sistemi usa-e-getta.
3. **La scelta deve mordere** — SONDAGGI, fondi, coalizione e territori reagiscono alle decisioni.
4. **Satira per tutti** — nessuna fazione è immune, nessuna accusa non verificata diventa “verità” di gioco.
5. **Poco filler** — nuove mappe solo se introducono un loop o una scelta nuova.

## Fase 0 — Misurare prima di espandere

- [ ] Aggiungere timer locale non invasivo: durata slot, battaglie, sconfitte, completamento Atto 1/2/post-game.
- [ ] Script `playtest-campaign` con checkpoint e livelli attesi.
- [ ] Verificare curva: starter → 3 medaglie → Palazzo → Colle → Offshore → Bruxelles.
- [ ] Individuare 3 tratti morti e 3 picchi di difficoltà.
- [ ] Nessuna analytics personale: dati solo nel save/debug e riepilogo esportabile.

**Done:** una run normale ha durata e curva misurabili, non stimate a sensazione.

## Fase 1 — ATTO 3: VERSO LE ELEZIONI

### Storia

1. **La Foto del Campo** — a Bruxelles arriva un selfie incompleto: quattro leader nel frame, altri fuori campo. Il giocatore deve negoziare il perimetro della coalizione.
2. **Il Partito che non c’era** — GENERORSO lascia la vecchia tana e fonda FUTURO ANTERIORE. Nuova roccaforte e boss con squadra iper-specializzata.
3. **Temptation Diplomacy** — un alleato internazionale trasforma la diplomazia in reality e meme. Il giocatore sceglie tra fedeltà, autonomia e consenso interno.
4. **Il Tour del Feed** — tre territori votano in base a promesse, squadra ministeriale e risultati nei dibattiti.
5. **Election Night** — gauntlet finale variabile: gli avversari dipendono dalla coalizione costruita e dai SONDAGGI.

### Nuove aree

- **CAMPO LARGO** — festival/assemblea all’aperto; percorsi che si aprono o chiudono con le alleanze.
- **FUTURO ANTERIORE** — caserma-convention trasformata in labirinto di manifesti capovolti.
- **GENOVA TECHNO** — porto e arena musicale; sfida ritmo-lite senza diventare rhythm game completo.
- **PALAZZO DEI FEED** — dungeon finale: stanze algoritmo, fact-check, talk show e silenzio stampa.

### Meccanica: Coalizione

- 3 slot alleato, separati dal party di battaglia.
- Ogni alleato dà un bonus e pone una LINEA ROSSA.
- Violare una linea rossa non blocca la storia: provoca rottura, perdita SONDAGGI e un boss alternativo.
- 4 assetti validi: Campo Largo, Centro Mobile, Destra Competitiva, Lista Civica.
- Nessun assetto è “corretto”; cambiano finale, boss e ricompensa.

### Meccanica: Territori

- 5 collegi con consenso separato, rappresentati su una mappa compatta.
- Ogni collegio propone un evento, un allenatore e una scelta.
- Vincere battaglie aiuta, ma non sostituisce le decisioni.
- Election Night calcola seggi con formula semplice e leggibile, mai simulatore politico realistico.

## Fase 2 — Politicmon ed evoluzioni

Nomi provvisori; tutti richiedono asset spec e review satirica prima della produzione.

| Linea | Tipo | Gancio | Evoluzione |
|---|---|---|---|
| **SALISTROBO → SALISOUND** | SINISTRA/MEDIA | atleta + palco techno, energia da outsider | livello 32 con SONDAGGI ≥55 |
| **GIANIMAGO → QUASIMAGIANI** | CENTRO/MEDIA | “è quasi magia” e comunicazione pop regionale | TESSERA DORATA |
| **CROSETTANK** | DESTRA/ISTITUZIONE | gigante corazzato diplomatico | specie singola difensiva |
| **NORDIODO → REFERENDODO** | ISTITUZIONE/CENTRO | dodo togato che riscrive regolamenti | ramo secondo esito di una quest |
| **LOLLOBISONTE** | DESTRA/VERDE | bisonte ferroviario che ferma tutto “solo un minuto” | specie singola lenta/potente |
| **FRATOCORNO → CAMPOCORNO** | SINISTRA/VERDE | caprone da piazza, forte se affiancato | evoluzione con alleato VERDE in squadra |
| **MAGISTRELLO** | CENTRO/ISTITUZIONE | piccolo camaleonte garantista | evolve in base alla coalizione |
| **MODIFANTE** | ISTITUZIONE/MEDIA | elefante da selfie diplomatico | incontro internazionale raro |
| **GIGIORGIA** | DESTRA/MEDIA | forma meme temporanea di GIORGIAGON | non specie Dex: skin/event form |
| **FUTURORSO** | DESTRA/POPULISMO | ramo autonomo di VANNACCIX/GENERORSO | evento “PARTITO CHE NON C’ERA” |

Regole:

- massimo 6 nuove famiglie vere nel primo rilascio;
- le forme nate da un singolo meme sono skin/forme evento, non numeri Dex;
- ogni nuova specie deve avere ruolo tattico distinto, abilità e almeno una mossa firma;
- niente copia del politico in forma umana: silhouette animale/mostruosa leggibile.

## Fase 3 — Mosse e abilità

### Mosse

- **SELFIE DI COALIZIONE** — buff squadra, fallisce se due linee rosse sono incompatibili.
- **ORDINE RESTRITTIVO** — MEDIA/status, impedisce di ripetere la stessa mossa per 2 turni.
- **ISOLA DELLE ALLEANZE** — CENTRO/status, scambia bonus e malus dei due combattenti.
- **PARTITO NUOVO** — DESTRA/status, resetta modifiche statistiche e aumenta GRINTA.
- **QUASI MAGIA** — MEDIA/speciale, potenza variabile ma mai zero.
- **CASSA DRITTA** — SINISTRA/fisico, colpisce due volte se la velocità è maggiore.
- **FOTO TAGLIATA** — MEDIA/status, riduce precisione e consenso guadagnato dal rivale.
- **SILENZIO STAMPA** — ISTITUZIONE/status, blocca mosse MEDIA per un turno.

### Abilità

- **AGO DELLA BILANCIA** — bonus se restano due Politicmon vivi per parte.
- **FUORI CAMPO** — entra senza subire il primo malus.
- **ALGORITMO AMICO** — prima mossa MEDIA ha priorità.
- **LINEA ROSSA** — sotto 50% PV cambia tipo secondario.
- **REALITY DIPLOMACY** — gli status durano un turno in più su entrambi.

## Fase 4 — Longevità senza grind

### Campagna elettorale settimanale

- seed locale settimanale;
- 5 eventi + 3 dibattiti + Election Night;
- durata 35–50 minuti;
- modificatori pescati da pacchetti dati;
- ricompense cosmetiche, titoli e forme evento, non potenza esclusiva.

### Rivincite vive

- capipalestra con 3 roster alternativi;
- boss che reagiscono al tuo Governo Ombra;
- COPPA DELLE POLTRONE con regole settimanali: monotipo, livello fisso, niente oggetti, squadra da 3.

### Politicdex vivo

- dossier comici sbloccabili;
- catene di cattura e incontri con meteo politico;
- forme meme marcate con data/stagione e conservate nel box;
- 12 traguardi nuovi legati a strategie, non solo quantità.

## Fase 5 — Sistema eventi aggiornabile

Creare `src/data/meme-events/` con eventi puramente dichiarativi:

- id, periodo attivo, testo, personaggi, scelta A/B, effetti, fonte editoriale;
- nessun download remoto e nessun server richiesto;
- pack aggiornabili con una normale release PWA;
- fallback evergreen quando il periodo termina;
- pannello crediti/fonti accessibile dal menu.

Categorie sicure:

- tormentoni pubblici e dichiarazioni testuali;
- comunicazione social, selfie, slogan, look e format TV;
- alleanze, scissioni, campagne e risultati pubblici;
- assurdità burocratiche trattate come sistemi, non accuse personali.

Esclusioni:

- salute, famiglia e vita privata;
- procedimenti aperti usati come verdetto;
- voci social senza riscontro;
- violenza o umiliazione realistica contro persone riconoscibili.

## Priorità di produzione

1. [ ] Telemetria locale e playtest campagna.
2. [ ] GDD Coalizione + Territori + Election Night.
3. [ ] Vertical slice: CAMPO LARGO, 1 scelta alleanza, 1 boss, 2 finali brevi.
4. [ ] Due nuove famiglie: SALISTROBO e FUTURORSO.
5. [ ] Sistema eventi dichiarativi con 6 eventi evergreen e 3 recenti.
6. [ ] Atto 3 completo.
7. [ ] Campagna settimanale e varianti COPPA.
8. [ ] Seconda ondata Politicmon solo dopo dati di playtest.

## Scope da evitare ora

- nuova regione enorme con altri 8 capipalestra;
- PvP competitivo classificato;
- backend/account/cloud obbligatori;
- generazione AI live dei dialoghi;
- decine di specie senza ruolo tattico;
- eventi che richiedono aggiornamenti quotidiani.

## Riferimenti editoriali iniziali

- ANSA, giugno 2026: selfie e costruzione del “campo largo”.
- ANSA, febbraio–giugno 2026: nascita di Futuro Nazionale e autonomia dalle coalizioni.
- ANSA, giugno–luglio 2026: tensioni social/diplomatiche Meloni–Trump e meme pubblici.
- RaiNews, aprile 2026: “È quasi magia Giany”, dal meme alla comunicazione istituzionale.
- RaiNews/Corriere, 2025: Italian brainrot come linguaggio visuale virale, da usare solo per eventi minori e non come nuova direzione artistica generale.

---

# Piano esecutivo dettagliato

## Regole operative

### Flusso di ogni task

1. Leggere `docs/HANDOFF.md`, la sezione pertinente di questo piano e i file coinvolti.
2. Controllare `git status --short`; non sovrascrivere modifiche non correlate.
3. Implementare un solo obiettivo verificabile per volta.
4. Eseguire almeno `npm run typecheck`.
5. Eseguire test automatici e screenshot pertinenti al rischio del task.
6. Fare regression check mentale sui sistemi collegati.
7. Aggiornare `docs/HANDOFF.md` se cambia stato, schema, flusso o decisione.
8. Commit atomico conventional: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`.
9. Push solo dopo build pulita e verifica visuale quando cambia UI/grafica.

### Definition of Done globale

Un task è completo solo quando:

- [ ] acceptance criteria soddisfatti;
- [ ] `npm run typecheck` passa;
- [ ] `npm test` passa per modifiche a formule/stato/battaglia;
- [ ] `npm run build` passa alla fine del blocco;
- [ ] save precedente caricato senza perdita dati;
- [ ] testi variabili clippati/wrappati;
- [ ] touch, tastiera e tasto B verificati nelle nuove scene;
- [ ] fallback singleplayer mantenuto;
- [ ] screenshot salvato per ogni nuova superficie visuale;
- [ ] HANDOFF aggiornato.

### Vincoli tecnici

- Risoluzione logica: 240×180.
- Nessuna dipendenza runtime nuova salvo necessità dimostrata.
- Nessun backend obbligatorio.
- Eventi recenti distribuiti con la build PWA, non scaricati da fonti esterne.
- Cambiando `GameState`: bump `SAVE_KEY_BASE`, aggiornare parser, default e migrazione.
- Nuova specie: `species.ts` + sprite PixelLab + mosse/abilità + incontri + Dex.
- Nuova mappa: righe uniformi, tile validi, warp/collisioni controllati.
- Ogni formula deve vivere fuori dalle scene quando è testabile come funzione pura.

## Dipendenze di alto livello

```text
P0 Misurazione
 └─> P1 Design Atto 3
      ├─> P2 Fondazioni tecniche
      │    └─> P3 Vertical slice Campo Largo
      │         └─> P4 Produzione contenuti
      │              └─> P5 Atto 3 completo
      └─> P6 Loop settimanale (dopo validazione vertical slice)
P5 + P6 ─> P7 Bilanciamento, QA e release
```

---

## P0 — Misurazione e baseline

Obiettivo: conoscere durata e curva reali prima di aggiungere contenuti.

### P0-T01 — Modello statistiche run

**Stato:** COMPLETATO (2026-07-10). Save v14 con migrazione slot v13, contatori
tempo/passi/battaglie/esiti e checkpoint starter–Bruxelles. Il tempo viene contato
dal loop solo a pagina visibile; i traguardi già raggiunti in un save v13 sono
marcati `null` (storici/non misurabili), senza inventare durate retroattive.

**Dipendenze:** nessuna.

**File previsti:** `src/game/state.ts`, nuovo `src/game/runstats.ts`, test dedicato.

**Procedura:**

1. Definire `RunStats`: secondi giocati, passi, battaglie, vittorie, sconfitte, catture, fughe.
2. Registrare timestamp di inizio sessione senza contare tempo in background.
3. Aggiungere checkpoint una-tantum: starter, medaglie, Palazzo, Garante, Offshore, Bruxelles.
4. Salvare durate cumulative e livello medio squadra al checkpoint.
5. Migrare i save esistenti con valori default.

**Acceptance criteria:**

- [ ] cambio tab/minimizzazione non gonfia il tempo;
- [ ] ogni evento incrementa una volta sola;
- [ ] un save v13 continua a caricarsi;
- [ ] nessun dato lascia il dispositivo.

**Verifica:** test unitari parser/migrazione + simulazione `visibilitychange` manuale.

### P0-T02 — Riepilogo debug esportabile

**Stato:** RINVIATO. La baseline v2 richiede P0-T01 senza nuova scena; il JSON
resta già esportabile col normale codice salvataggio. Valutare la scena dopo il
report P0-T04 solo se serve davvero al playtest.

**Dipendenze:** P0-T01.

**File previsti:** nuova `RunStatsScene.ts`, `PauseScene.ts` solo in DEV o opzione avanzata.

**Procedura:** mostrare tempi checkpoint, conteggi e un pulsante COPIA JSON. Il JSON non deve includere nickname, chat o identificatori P2P.

**Acceptance criteria:**

- [ ] riepilogo leggibile su 240×180 e scorrevole;
- [ ] copia produce JSON valido;
- [ ] nessuna informazione personale inclusa.

### P0-T03 — Playtest campagna automatizzato

**Dipendenze:** P0-T01.

**File previsti:** `scripts/playtest-campaign.mjs`, eventuali fixture.

**Procedura:** creare checkpoint deterministici con party/livelli plausibili; attraversare battaglie chiave e registrare turni, danni, KO e consumabili.

**Acceptance criteria:**

- [x] script termina senza input manuale (`npm run playtest:campaign`, 400 run/checkpoint);
- [x] segnala boss fuori range, non corregge automaticamente;
- [x] output Markdown e JSON confrontabile tra commit (`docs/baseline-campaign-auto.md`,
  `artifacts/reports/campaign-playtest.json`).

**Esito baseline automatica (2026-07-10):** 0/7 checkpoint nei range dichiarati.
AUDITEL risulta troppo difficile (20,3% vittorie); gli altri sei risultano
troppo facili (99,3-100%). Il dato è una red flag, non ancora una richiesta di
nerf: va confrontato con la run umana P0-T04 perché le fixture usano team pieni,
IA greedy e un budget cure prefissato.

### P0-T04 — Report baseline

**Dipendenze:** P0-T02, P0-T03, almeno una run umana.

**Output:** `docs/baseline-campaign.md`.

Contenuto minimo: durata per atto, livelli medi, tasso KO, punti morti, picchi, contenuti ignorati, proposta di correzione. Nessun bilanciamento prima di questo report.

---

## P1 — Design bloccato dell’Atto 3

Obiettivo: eliminare ambiguità prima di toccare save e mappe.

### P1-T01 — GDD Coalizione

**Stato:** [x] completato e review `APPROVED` (`design/gdd/coalizione.md`).

**Output:** `design/gdd/coalizione.md`.

Definire:

- 4 assetti e requisiti;
- massimo 3 alleati;
- bonus, malus e linee rosse;
- eventi di rottura e riconciliazione;
- relazione con Governo Ombra;
- UI richiesta;
- formule e limiti;
- edge case: alleato KO, duplicato, coalizione vuota, finale già avviato.

**Acceptance criteria:** ogni scelta produce almeno una conseguenza visibile entro 10 minuti; nessun assetto domina tutti gli altri.

### P1-T02 — GDD Territori ed Election Night

**Stato:** [x] completato e review `APPROVED` (`design/gdd/territori-elezioni.md`).

**Output:** `design/gdd/territori-elezioni.md`.

Definire 5 collegi, consenso locale 0–100, azioni disponibili, formula seggi, pareggio, soglia di vittoria e varianti boss. La formula deve essere spiegabile in una schermata.

### P1-T03 — Trattamento narrativo

**Stato:** [x] completato e narrative review `APPROVED`
(`design/narrative/atto3.md`).

**Output:** `design/narrative/atto3.md`.

Per ogni capitolo: premessa, NPC, battute chiave, scelta, conseguenza, boss, ricompensa e flag. Separare riferimenti evergreen da eventi datati.

### P1-T04 — Roster e asset specification

**Stato:** [x] completato; roster, role matrix e PixelLab spec `APPROVED`
(`design/content/atto3-roster.md`, `design/assets/specs/atto3-roster-assets.md`).

**Output:** `design/content/atto3-roster.md` e asset spec PixelLab.

Bloccare prima ondata:

1. SALISTROBO → SALISOUND;
2. VANNACCIX → FUTURORSO come ramo;
3. GIANIMAGO → QUASIMAGIANI;
4. CROSETTANK;
5. FRATOCORNO → CAMPOCORNO;
6. una sesta famiglia scelta dopo playtest dei ruoli tattici.

Per ognuno: silhouette, satira, tipi, statistiche, abilità, learnset, evoluzione, habitat e ruolo.

### P1-T05 — Review design e scope gate

**Stato:** [x] completato; prima review `MAJOR REVISION`, blocker corretti,
verdetto finale `PASS` (`design/gdd/reviews/p1-scope-gate.md`).

**Dipendenze:** P1-T01..04.

Verificare coerenza con Sondaggi, Governo, battaglia, quest, Dex, save e finale esistente. Tagliare qualunque feature non necessaria alla vertical slice.

---

## P2 — Fondazioni tecniche

### P2-T01 — Schema Coalizione

**Stato:** [x] completato (`src/game/coalition.ts`, save v15, 5 test dominio;
suite 65/65 e build verdi).

**Dipendenze:** P1-T01 approvato.

**File previsti:** nuovo `src/game/coalition.ts`, `state.ts`, test.

**Procedura:**

1. Tipi `CoalitionId`, `AllyId`, `CoalitionState`.
2. Funzioni pure `canAddAlly`, `addAlly`, `removeAlly`, `violatedLines`, `coalitionBonuses`.
3. Nessuna logica di regola dentro la futura scena UI.
4. Migrazione save e default.

**Acceptance criteria:** max slot rispettato, duplicati impossibili, linee rosse deterministiche, bonus sospesi nelle condizioni definite.

### P2-T02 — Schema Territori

**Stato:** [x] completato (`src/game/election.ts`, save v16, 6 test dominio;
suite 71/71 e build verdi).

**Dipendenze:** P1-T02.

**File previsti:** nuovo `src/game/election.ts`, `state.ts`, test.

Definire dati per collegio, clamp, modificatori, formula seggi e risultato finale. Testare min/max, pareggi e valori mancanti.

### P2-T03 — Registry eventi meme

**Stato:** [x] completato; registry tipizzato, 2 evergreen + 2 stagionali,
fonti/review/fallback/scadenza, validator e test (73/73).

**File previsti:** `src/data/meme-events/types.ts`, `index.ts`, `evergreen.ts`, `season-2026.ts`.

**Schema minimo:** id, titolo, testo, data inizio/fine opzionale, condizioni, due scelte, effetti, tags, sourceLabel/sourceUrl.

**Procedure editoriali:**

1. Verificare fonte primaria o testata affidabile.
2. Scrivere la gag su dichiarazione/format pubblico, non su presunta colpa.
3. Far funzionare l’evento anche quando il riferimento non è noto.
4. Impostare scadenza ai meme fragili.
5. Aggiungere fallback evergreen.

**Acceptance criteria:** registry validato all’avvio in DEV; ID unici; URL validi; evento scaduto non pescato.

### P2-T04 — Framework quest ramificate

**Stato:** [x] completato; prerequisiti `all/any/not`, ramo one-shot,
completamento/fallimento terminale e patch flag esplicite (78/78 test).

Estendere le quest senza rompere quelle lineari: prerequisiti multipli, ramo scelto, esito e quest fallita/completata. Preferire flag espliciti e helper puri.

### P2-T05 — UI primitives mancanti

**Stato:** [x] completato; card alleato, chip LINEA ROSSA, barra consenso,
mappa collegi e preview scelta; UX spec e test layout (80/80).

Estendere il sistema HUD già creato con:

- card alleato;
- chip Linea Rossa;
- barra consenso territoriale con numero;
- mappa collegi;
- dialogo scelta con conseguenze anticipate;
- variante reduced-motion.

Verifica screenshot a 240×180, canvas mobile e testi massimi.

---

## P3 — Vertical slice “Campo Largo”

Obiettivo: dimostrare che coalizione + territorio + battaglia sono divertenti in 30–45 minuti.

### P3-T01 — Mappa Campo Largo

**Stato:** [x] completato; outdoor 24×18 + retropalco, accesso post-UE,
6 NPC, healer, safe exit e opt-out vaganti. Tutti i validator mappe verdi.

Creare una sola mappa outdoor più un interno palco/backstage. Inserire warp, collisioni, musica, 6 NPC, healer temporaneo e uscita sicura.

**Verifica:** map consistency, building doors, world layout, screenshot completo e passeggiata touch.

### P3-T02 — Tre candidati alleati

**Stato:** [x] completato; tre NPC aprono card differenziate, persistono `seen`,
selezione/rimozione atomica e cap R1 a due slot.

Implementare tre NPC con bonus e linee rosse chiaramente differenti. Il giocatore può sceglierne massimo due nella slice.

### P3-T03 — Evento “Foto incompleta”

**Stato:** [x] completato; scelta prudente/rischiosa con preview, commit atomico
fondi-Coalizione-Territorio-flag, conseguenza immediata e idempotenza.

Scelta A/B con risultato immediato su coalizione e consenso locale. Deve avere almeno due battute diverse al ritorno sull’NPC.

### P3-T04 — Primo collegio

**Stato:** [x] completato; evento Foto come prima azione, dibattito one-shot
win/loss, secondo trainer, premio nascosto e HUD CENTRO numerico.

Implementare consenso locale, un evento, due allenatori e un premio esplorativo. L’HUD deve mostrare variazione con animazione e numero.

### P3-T05 — Boss Futuro Anteriore

**Stato:** [x] completato; boss legacy a tre membri, IA boss, fase PARTITO NUOVO
sotto 50% PV (reset malus + VEL 1, one-shot), reward e retry sicuro.

Boss con una regola speciale leggibile: cambia strategia quando rompe o cerca un’alleanza. Niente semplice aumento HP.

### P3-T06 — Due finali slice

**Stato:** [x] completato; finale COESA/TESA derivato dallo stato Coalizione,
flag terminali one-shot e ritorno sicuro a Bruxelles.

Finale coalizione stabile e finale rottura. Entrambi devono chiudere la slice e riportare al post-game senza bloccare il save.

### P3-T07 — Playtest gate

**Stato:** [!] gate umano rinunciato esplicitamente dal product owner il 2026-07-10;
non considerato superato. Readiness tecnica completata e criticità della sessione
pilota corrette; da P4 in avanti si usano gate automatici e screenshot locali.
Smoke 6/6, test 89/89, typecheck/build/content validation verdi. Il benchmark
campagna ora usa efficacia dei tipi (1/7 checkpoint nel range) e resta diagnostico:
il tuning è sospeso fino al report delle cinque sessioni, come richiesto dal piano.

Raccogliere:

- comprensione delle linee rosse;
- scelta effettuata e motivazione;
- durata;
- numero di aperture menu;
- difficoltà boss;
- desiderio di provare l’altro ramo.

**Gate PROCEED:** almeno 4/5 tester comprendono conseguenze e almeno 3/5 vogliono provare l’altro ramo. Altrimenti iterare prima di produrre altre mappe.

---

## P4 — Produzione contenuti

### P4-T01..06 — Nuove famiglie Politicmon

**P4-T01 SALISTROBO → SALISOUND:** [x] completato; asset rigenerati col volto
riconoscibile di Ilaria Salis dopo il correttivo artistico 2026-07-11. Ruolo validato, Dex 43–44,
FESTIVAL fallback, evoluzione lv32/SONDAGGI 55, selvatico a Campo Largo, zona Dex,
front/action PixelLab 96×96, renderer PNG-first, screenshot Dex/battaglia/evoluzione,
coverage strict, validator, test e build verdi.

**P4-T02 VANNACCIX → FUTURORSO:** [x] completato; FUTURORSO rigenerato preservando
il volto riconoscibile di Roberto Vannacci. Ramo oggetto con TESSERA FUTURO
separato da GENERORSO, Dex 45, boss/ricompensa aggiornati, abilità TABULA RASA
con parità PvE/PvP e log autoritativo, front/action PixelLab 96×96 più icona 32×32,
screenshot Dex/battaglia/evoluzione, report bilanciamento, coverage strict, validator,
test e build verdi.

**P4-T03 GIANIMAGO → QUASIMAGIANI:** [x] completato; asset rigenerati col volto
riconoscibile di Eugenio Giani. Dex 46–47, evoluzione lv32,
EXIT POLL dinamico 60/100 alla soglia esatta del 50%, FORCHETTA SONDAGGI con
STIMA BASSA/ALTA deterministica e parità PvE/PvP, front/action PixelLab 96×96,
screenshot Dex/battaglia/evoluzione e fix HUD per nomi da 12 caratteri, report
bilanciamento, coverage strict, validator, test e build verdi. Habitat e boss
restano nel capitolo P5-T04 GENOVA TECHNO/TOUR MEDIATICO come pianificato.

**P4-T04 CROSETTANK:** [x] completato; asset rigenerati col volto riconoscibile di
Guido Crosetto. Dex 48, muro fisico ISTITUZIONE/DESTRA,
POLTRONA legacy, nessuna cura naturale, difesa speciale dichiarativa 58 per rendere
reale il counter previsto senza alterare le specie legacy, front/action PixelLab
96×96, screenshot Dex/battaglia, fix HUD nemico senza ellissi, report bilanciamento,
coverage strict, validator, test e build verdi. Habitat nel capitolo P5-T03
TEMPTATION DIPLOMACY come pianificato.

**P4-T05 FRATOCORNO → CAMPOCORNO:** [x] completato; asset rigenerati col volto
riconoscibile di Nicola Fratoianni. Dex 49–50, evoluzione lv32,
support/sustain con POLTRONA → GALLEGGIAMENTO, esclusione verificata di FIDUCIA e
TAVOLO LUNGO, AUREOLA limitata a 5 PP, FRATOCORNO catturabile a Campo Largo e zona
Dex aggiornata, front/action PixelLab 96×96 coerenti, screenshot Dex/battaglia/
evoluzione, report bilanciamento, coverage strict, validator, test e build verdi.

Un task separato per famiglia. Procedura obbligatoria:

1. validare ruolo tattico contro roster esistente;
2. aggiungere scheda specie e `dexNum` senza rompere ordine famiglie;
3. generare asset PixelLab fronte/azione coerente;
4. normalizzare trasparenza e bounding box;
5. aggiungere abilità e learnset;
6. aggiungere evoluzione e test;
7. posizionare incontri/allenatori;
8. screenshot Dex, battaglia, cattura/evoluzione;
9. coverage PixelLab strict.

**Done per famiglia:** utilizzabile, catturabile, evolvibile, visibile nel Dex e tatticamente distinta.

**Correttivo P4-ART-01:** [x] ASSET-001..010 rigenerati e verificati con test cieco interno:
riconoscere politico/meme e creatura senza leggere il nome. I front/action generici
del primo passaggio sono stati sostituiti. Gate: 110 test, coverage 184/184,
typecheck/build e screenshot in-game inclusi NORDIODO/REFERENDODO verdi.

### P4-T07 — Pacchetto mosse Atto 3

**Stato:** [x] completato. Otto mosse: FESTIVAL, EXIT POLL, AUTONOMIA,
DIRETTA SOCIAL, PATTO VERDE, VOTO DISGIUNTO, SMENTITA FLASH e PIAZZA APERTA.
Contratto puro `festivalScandaloChance`, proc SCANDALO solo agendo per primi,
parita PvE/PvP, riepilogo UI, learnset Atto 3 e test di ordine coperti.
Gate: 114 test, 52 specie/78 mosse validate, typecheck e build verdi.

### P4-T08 — Pacchetto abilità Atto 3

**Stato:** [x] completato. Cinque abilita: TABULA RASA, FORCHETTA SONDAGGI,
PRIMA PAGINA, CONTRADDITTORIO e STAFFETTA. Le tre nuove sono assegnate alle
forme base Atto 3; stato per ingresso resettato da `makeCombatant`, proc KO e
post-hit autoritativi nel duello. Coperti una-tantum, switch/reset, KO,
simulazione multi-hit e PvP. Gate: 119 test, content validation e build verdi.

### P4-T09 — Asset mondo

**Stato:** [x] completato. PixelLab: palco, gazebo, manifesto, cabina elettorale,
urna, maxischermo social, van stampa e roccaforte Futuro Anteriore. Otto tile-anchor
dedicati, provenance nel manifest, palco/gazebo/manifesto/maxischermo integrati a
Campo Largo; gli altri pronti per i capitoli P5. QA su griglia reale in
`artifacts/screens/atto3_world_assets.png`; collisioni/affollamento del primo layout
corretti. Gate: coverage PixelLab 192/192, map consistency, 119 test e build verdi.

### P4-T10 — Audio

**Stato:** [x] completato. Aggiunte le tracce testuali `campo_largo`,
`social_tension` ed `election_night`; Campo Largo usa ora il tema dedicato.
Cue distinti guadagno/perdita collegio integrati nel primo dibattito, brevi e a
volume ridotto per non coprire i dialoghi. Gate: typecheck, 119 test, content
validation e build verdi.

---

## P5 — Atto 3 completo

### P5-T01 — Capitolo Foto del Campo

**Stato:** [x] completato. Slice attiva in produzione dopo `ue-beaten`, invito
post-Commissione e tre missioni guidate fino allo scatto finale. Onboarding
Coalizione in tre battute, schede leggibili e menu permanente sbloccato. Separato
il FOTOGRAFO UFFICIALE dal boss Futuro Anteriore; vittoria assegna CORNICE
IMPOSSIBILE, dossier FEED e unlock del capitolo successivo con patch idempotente.
QA visuale in `artifacts/screens/p5_photo_intro.png` e
`artifacts/screens/p5_coalition_card.png`. Gate: 122 test, content validation e
build verdi.

### P5-T02 — Capitolo Futuro Anteriore

**Stato:** [x] completato. Nuova convention con piazza PixelLab, sede, puzzle a
due manifesti e tre sale dedicate a scissione, rebranding e tesoreria. Scelta
atomica ALLEANZA/DISTANZA/CONTRASTO con fondi, SONDAGGI, reclutamento GENERORSO
e LINEE ROSSE indicizzate. Boss FUTURORSO separato, TESSERA FUTURO, dossier NORD
e ramo evolutivo sbloccati one-shot. Tre missioni guidate e ritorno sicuro al
Campo. QA visuale `artifacts/screens/p5_future_*.png`; map consistency, map exit,
127 test, content validation e build verdi.

### P5-T03 — Capitolo Temptation Diplomacy

**Stato:** [x] completato. Hotel-set con lobby, stanze FEDELTÀ/AUTONOMIA/CONSENSO
e terrazza-studio senza backtracking obbligatorio. Tre esiti atomici e non morali:
fondi+PASS con linea 12, AUTONOMIA a rami esclusivi con token RIPARA esatto,
oppure +4 SONDAGGI con linea 13. Boss IL PARTNER PERFETTO, reward one-shot e
unlock Tour del Feed. Tre missioni guidate, testi fittizi e monitor astratti.
QA visuale `artifacts/screens/p5_diplomacy_*.png`; map consistency, map exit,
132 test, content validation e build verdi.

### P5-T04 — Genova Techno

**Stato:** [x] completato. Side area con van stampa, maxischermo e palco PixelLab.
Minigioco di sei battute sugli input standard; finestre larghe, errori e timeout
avanzano sempre. `RIDUCI EFFETTI` elimina integralmente il timer mantenendo le
stesse fasce premio. Esiti PERFETTO/IN ONDA/FUORI TEMPO cambiano fondi e SONDAGGI,
ma tutti completano la quest one-shot. Cue testuali grandi compatibili col font
bitmap, dopo correzione delle frecce Unicode invisibili rilevata dal QA. Screenshot
`artifacts/screens/p5_genova_*.png`; map checks, 136 test, content validation e
build verdi.

### P5-T05 — Cinque collegi

**COMPLETATO (2026-07-11).** Hub `tour_feed` e cinque arene visitabili in ordine
libero. Ogni collegio include:

- identità visuale;
- problema satirico;
- scelta;
- allenatore;
- segreto o pickup;
- effetto della coalizione;
- stato post-risoluzione.

Il giocatore sceglie due azioni su quattro: dibattito, promessa prudente,
promessa rischiosa o sostegno di un alleato. La UI mostra costi e guadagni reali
dopo i modificatori della coalizione; i sostegni consumano globalmente l'alleato.
Le promesse rischiose applicano fondi e linee rosse in modo atomico. Cinque
trainer dedicati, cinque pickup segreti, quest generale e dossier laterali.
Stato chiuso con riepilogo locale dopo due azioni. QA: 141 test, typecheck,
map consistency/exit, content validation e build verdi; screenshot automatici
`artifacts/screens/p5_district_*.png` verificati.

### P5-T06 — Palazzo dei Feed

**COMPLETATO (2026-07-11).** Dungeon finale con lobby, quattro archivi brevi
(algoritmo, talk show, fact-check, silenzio stampa) e studio elettorale. Ogni
archivio richiede due riscontri e ricapitola conseguenze già registrate, senza
quiz, battaglie obbligatorie o nuovi modificatori. Reception con progresso 0/4,
studio gated e ritorni sicuri al Tour. 143 test, map checks, content validation,
typecheck e build verdi; screenshot `artifacts/screens/p5_palazzo_feed_*.png`.

### P5-T07 — Election Night

**COMPLETATO (2026-07-11).** Snapshot canonici SHA-256 distinti per Coalizione ed
Elezione, lock prima del punto di non ritorno e save pre-diretta. Gauntlet
one-shot contro L'ALGORITMO SOVRANO con dottrina congelata dall'assetto:
DIFESA COLLETTIVA, CENTRO MOBILE, DESTRA COMPETITIVA, LISTA CIVICA oppure
SCISSIONE prioritaria. Vittoria e sconfitta proseguono entrambe. Scrutinio
animato con LOCALE, RICONTO ±1 sugli esatti 50, TOTALE e 0–5 seggi; risultato
persistente e rivedibile. 146 test, content validation, typecheck e build verdi;
screenshot `artifacts/screens/p5_election_night_results.png` verificato.

### P5-T08 — Finali

**COMPLETATO (2026-07-11).** Quattro epiloghi distinti combinano
governo/opposizione con coalizione coesa/fratturata e citano lo stato del Governo
Ombra. Sequenza a quattro pagine con epilogo, ministeri, crediti e post-game.
Premio identico e idempotente per tutti i rami (2500€, 2 SCHEDE BLINDATE,
cosmetico tematico); sblocchi post-game distinti senza penalità di valore.
Terrazza finale esplorabile con ritorno libero al Palazzo e al resto del mondo.
148 test, map gates, content validation, typecheck e build verdi; screenshot
`artifacts/screens/p5_ending_*.png` verificati.

### P5-T09 — Quest log e guida

**COMPLETATO (2026-07-11).** Percorso principale Atto 3 verificato su 13
checkpoint consecutivi; side quest escluse dal focus HUD e dal cursore iniziale
MISSIONI. Tutti i target puntano dentro mappe esistenti, ID unici e testi guida
completi. `tourComplete` nel quest log deriva dalla fase autoritativa Election.
Rimosse le ellissi dalle etichette troncate della lista, con taglio a parola.
151 test, map gates, content validation, typecheck e build verdi; screenshot
`artifacts/screens/p5_quest_guide.png` verificato.

---

## P6 — Longevità e aggiornabilità

### P6-T01 — Campagna settimanale

**COMPLETATO (2026-07-11).** Seed ISO settimanale locale e schedule
deterministica con 5 eventi a scelta, 3 dibattiti scalati e finale. Stato v17
separato dalla storia, normalizzato, salvato dopo ogni stage e riprendibile senza
duplicazioni. Tre fasce premio one-shot; nuova settimana crea una run nuova solo
quando il giocatore la apre. Accesso dalla terrazza post-game. 155 test,
persistenza/migrazioni, map/content gates, typecheck e build verdi; screenshot
`artifacts/screens/p6_weekly_campaign.png` verificato.

### P6-T02 — Modificatori COPPA

**COMPLETATO (2026-07-11).** Rotazione deterministica giornaliera fra MONOTIPO,
LIVELLO 50, SQUADRA 3, NIENTE OGGETTI e UNA SOLA CURA. Regola e descrizione
appaiono prima della quota e restano nel tabellone. MONOTIPO valida almeno tre
idonei senza addebito; roster temporanei non mutano la squadra storia; limiti
borsa applicati in BattleScene. Uscita, sconfitta e trionfo ripristinano lo stato.
159 test, typecheck e build verdi; screenshot
`artifacts/screens/p6_coppa_rule.png` verificato.

### P6-T03 — Rivincite adattive

**COMPLETATO (2026-07-11).** Tre roster deterministici per ciascun capopalestra:
GOVERNO, OPPOSIZIONE e COALIZIONE. Il risultato di Election Night seleziona il
primo asse, mentre una coalizione fratturata ha priorità e attiva il terzo. La
dottrina del roster viene anticipata prima della conferma; badge e ricompense
uniche non si duplicano. 162 test, typecheck e build verdi.

### P6-T04 — Forme meme

**COMPLETATO (2026-07-11).** Quattro forme stagionali legate al singolo
esemplare, senza nuove specie o numeri Dex. Premio one-shot dei trionfi
settimanali, persistenza v18 anche dopo scadenza, bonus singolo massimo +5%,
aura sopra la caricatura PixelLab originale e pagina Dex con stagione,
provenienza e archivio. Migrazione v17 verificata; 167 test, check evoluzioni,
typecheck e build verdi. Screenshot `artifacts/screens/p6_meme_form.png` verificato.

### P6-T05 — Tool editoriale eventi

**COMPLETATO (2026-07-11).** `npm run validate:meme-packs` valida registry o
pack JSON esterni: ID, date, fonti HTTPS, budget testi, condizioni, conseguenze e
metadati editoriali. Output separa ERRORE/AVVISO; solo gli errori strutturali
restituiscono exit code 1. Integrato in CI con test di scadenza e rischio.

### P6-T06 — Crediti fonti

**COMPLETATO (2026-07-11).** EXTRA → FONTI SATIRA apre una schermata
scorrevole con titolo e fonte per tutti gli eventi. I link HTTPS vengono aperti
in nuova scheda soltanto premendo A; nessuna navigazione automatica. 172 test,
validator, typecheck e build verdi; screenshot
`artifacts/screens/p6_sources.png` verificato.

---

## P7 — Bilanciamento, QA e release

### P7-T01 — Bilanciamento progressione

**COMPLETATO (2026-07-11).** Harness deterministico sul vero `calcDamage`, IA
competente, mosse, tipi, status e squadre complete. Nove boss principali ×
1.000 tentativi con roster/livelli plausibili per checkpoint: win-rate dal 58,6%
al 73,8%, tutti nel target 55–75%. Il comando `npm run balance:bosses` fallisce
automaticamente fuori soglia e scrive `design/balance/p7-boss-simulations.md`.

### P7-T02 — Economia

**COMPLETATO (2026-07-11).** Audit automatico su sette invarianti: COPPA
ripetibile netta -800€, primo premio limitato, settimanale 800–1800€ per nove
stage, cura base acquistabile con i fondi iniziali, payout validi, rivincite con
600/1500 passi e boost-fondi come sink. KO cura la squadra e perdita massima
600€, quindi nessun soft-lock. Report `design/balance/p7-economy-audit.md` e
comando bloccante `npm run audit:economy`.

### P7-T03 — Save migration matrix

**COMPLETATO (2026-07-11).** Matrice esplicita con save vuoto, v13
pre-Atto3, post-Garante, post-Bruxelles, tre slot indipendenti, backup primario
corrotto recuperabile, v17→v18 e persistenza Forme Meme v18. Restano coperti
anche v3–v12, Unicode e rotazione backup. 15 test integrazione verdi; evidenza in
`design/qa/p7-save-migration-matrix.md`.

### P7-T04 — Regression suite

Copertura critica:

- nuova partita e starter;
- 3 palestre;
- evoluzione livello/oggetto/sondaggi;
- cattura e box;
- Governo Ombra;
- veicoli e warp;
- Palazzo/Colle/Offshore/Bruxelles;
- Coalizione/collegi/Election Night;
- PvP senza effetti PvE fuori sync;
- PWA update senza perdita save.

**COMPLETATO (2026-07-11).** Suite `npm run test:regression` separata con
dieci percorsi: nuova partita/starter, tre palestre, tre tipi di evoluzione,
cattura/box, Governo, veicoli/warp, quattro aree end-game,
Coalizione/Election Night, contratto PvP e isolamento save dal service worker.
10/10 verdi e gate aggiunto alla CI.

### P7-T05 — Visual audit

**COMPLETATO (2026-07-11).** Inventario automatico di 14 screenshot P5/P6,
PNG validi e scene con testi lunghi. Browser mobile reale simulato a 390×844 e
844×390: canvas 4:3, nessun overflow e tutti i controlli dentro viewport. L’audit
ha scoperto e corretto i controlli landscape tagliati dalla scocca. Evidenze
`p7_portrait.png`, `p7_landscape.png` e `design/qa/p7-visual-audit.md`.

### P7-T06 — Accessibilità

**COMPLETATO (2026-07-11).** Audit automatico con contrasto WCAG misurato
(14,9:1 testo/pannello, 12,2:1 controlli), focus comunicato anche da simboli e
testo, RIDUCI EFFETTI, vibrazione disattivabile, tastiera nativa anti-zoom e otto
target touch nominati ≥24px in portrait/landscape. Report
`design/qa/p7-accessibility-audit.md`.

### P7-T07 — Satire review

Checklist per ogni riferimento reale:

- fonte salvata;
- evento pubblico;
- battuta chiaramente parodica;
- nessuna accusa presentata come fatto;
- niente categorie protette come bersaglio;
- tono distribuito tra fazioni;
- testo comprensibile anche tra un anno.

**COMPLETATO (2026-07-11).** Quattro eventi su quattro revisionati con fonte
raggiungibile online, fatto pubblico, parodia esplicita, nessuna accusa non
provata, nessuna categoria protetta bersaglio, tono distribuito e fallback
evergreen. Checklist machine-readable in `design/editorial/satire-review.json`,
report e gate `npm run audit:satire`.

### P7-T08 — Release candidate

**RC COMPLETATA E DEPLOYATA (2026-07-11).** Build e tutti i gate automatici
verdi; pacchetti/checksum in `releases/`; produzione READY su
`https://politicmon.vercel.app` (deployment `dpl_9gRyTCXVFHuExNKMdr7MVcF4REkf`).
Smoke PWA locale e pubblico: installazione, update senza perdita save e offline
OK. Il worktree deployato è rappresentato dal commit `68dcf12`, pubblicato su
GitHub e firmato dal tag annotato `v1.0.0-rc.1`. La verifica hardware fisica è
stata sostituita dai test automatici portrait/landscape e touch su richiesta
esplicita di non dipendere dal testing umano. Dettaglio in
`design/qa/p7-release-candidate.md`.

1. aggiornare changelog e HANDOFF;
2. `npm run pixellab:coverage:strict`;
3. tutti i check mappe/evoluzioni/sprite;
4. `npm test`;
5. `npm run build`;
6. smoke test su installazione PWA pulita e aggiornata;
7. backup artefatti e tag release;
8. deploy;
9. verifica cache/versione da telefono reale.

---

## Ordine storico superseded

> Questa lista è conservata come traccia della prima decomposizione. Non va
> eseguita: l’ordine operativo vigente è **Ordine immediato aggiornato** nella
> Baseline di consegna v2.

1. **P0-T01** — statistiche run e migrazione save.
2. **P0-T02** — riepilogo debug/esportazione.
3. **P0-T03** — playtest automatizzato.
4. **P0-T04** — report baseline con una run reale.
5. **P1-T01** — GDD Coalizione.
6. **P1-T02** — GDD Territori/Election Night.
7. **P1-T03** — trattamento narrativo Atto 3.
8. **P1-T04** — roster/asset spec prima ondata.
9. **P1-T05** — review e taglio scope.
10. **P2-T01** — implementazione schema Coalizione.

La regola resta valida ed è rafforzata dal Gate R0/R1 della baseline v2.
