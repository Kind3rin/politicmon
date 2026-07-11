# Politicmon — Game Concept

> **Status**: Approved direction
> **Owner**: Luca Tiengo
> **Last Updated**: 2026-07-10
> **Source of truth for delivery**: `PIANO.md`

## Core Identity

| Field | Decision |
|---|---|
| Genre | RPG di cattura e battaglie a turni, stile GBA |
| Theme | Satira bonaria della politica italiana e internazionale |
| Platform | Web/PWA, desktop e mobile |
| Technology | TypeScript, Vite, Canvas 2D, 240×180 pixel-perfect |
| Core fantasy | Costruire una squadra politica improbabile, sopravvivere a media e alleanze, vincere consenso ed elezioni |
| Unique hook | Struttura monster-RPG leggibile, ma progressione e build reagiscono a SONDAGGI, Governo Ombra e coalizione |
| Estimated scope | Large: espansione incrementale R1–R5, sviluppo solo sostenibile tramite vertical slice e release train |

## Elevator Pitch

Politicmon trasforma archetipi, rituali e meme della politica in un RPG cartoon:
si catturano creature mostruose ispirate alla comunicazione pubblica, si affrontano
dibattiti a turni e si costruisce una coalizione capace di arrivare all’Election
Night. La satira cambia con il web; le regole fondamentali restano evergreen,
offline e comprensibili.

## Player Fantasy and Audience

Il giocatore deve sentirsi uno stratega di campagna capace di trasformare una
squadra instabile in una maggioranza vincente. Il pubblico primario ama RPG
leggeri, collezionismo, cultura meme e umorismo politico; quello secondario cerca
esplorazione e completismo. Non è rivolto a chi cerca simulazione elettorale
realistica, PvP competitivo o satira aggressiva/diffamatoria.

## Design Pillars

1. **La politica è una squadra instabile.** Ogni alleanza offre un vantaggio e un
   compromesso. Test: una scelta senza costo o conseguenza va riscritta.
2. **Il meme cambia, la meccanica resta.** I riferimenti recenti sono contenuti
   dichiarativi, non sistemi usa-e-getta. Test: rimuovendo la gag, il loop deve
   continuare a funzionare.
3. **La scelta deve mordere.** SONDAGGI, fondi, coalizione e territori reagiscono
   entro tempi percepibili. Test: una decisione importante produce feedback entro
   dieci minuti.
4. **Satira per tutti.** Nessuna fazione è immune e nessuna accusa non verificata
   diventa verità di gioco. Test: la gag deve riguardare atti o comunicazione
   pubblica, non salute, famiglia o vita privata.
5. **Poco filler.** Una nuova area esiste solo se introduce loop, scelta o payoff.
   Test: se una mappa serve soltanto ad allungare il percorso, viene tagliata.

### Anti-pillars

- Nessuna nuova regione con otto palestre: comprometterebbe poco filler.
- Nessun backend, account o generazione AI live obbligatoria: comprometterebbe
  offline, privacy e sostenibilità.
- Nessun ranked PvP: comprometterebbe il focus narrativo e il bilanciamento solo.
- Nessuna specie creata per un singolo meme: usare skin o forme evento.
- Nessun riferimento personale non verificato o umiliazione realistica.

## Core Loops

### 30 secondi

Esplorare, leggere un incontro breve, scegliere una mossa/azione, ricevere feedback
visivo e numerico chiaro. La competenza nasce da tipi, squadra, status e timing.

### 5 minuti

Completare un incontro, ottenere EXP/fondi/consenso, curare o modificare squadra e
decidere la prossima tappa. La scelta politica deve alterare almeno uno dei loop.

### Sessione

Concludere una quest, un territorio o un boss e salvare in un punto naturale. Ogni
capitolo chiude un conflitto e anticipa il successivo senza cliffhanger artificiale.

### Progressione

Catturare ed evolvere Politicmon, ottenere medaglie, formare il Governo Ombra,
costruire la coalizione, conquistare cinque collegi e vincere l’Election Night.
Post-game: campagna settimanale e COPPA variabile con ricompense cosmetiche.

## MDA and Motivation

- **Mechanics**: battaglia a turni, cattura, SONDAGGI, ministeri, alleati con linee
  rosse, consenso territoriale ed eventi dichiarativi.
- **Dynamics**: build ibride, compromessi di coalizione, conseguenze differite ma
  leggibili, finali e boss variabili.
- **Aesthetics**: fantasy satirica, challenge accessibile, scoperta, espressione e
  collezionismo.
- **Autonomy**: quattro assetti validi e nessuna coalizione moralmente corretta.
- **Competence**: formule visibili, matchup leggibili, feedback immediato.
- **Relatedness**: rivale ricorrente, alleati instabili e mondo che ricorda scelte.

## Atto 3 — Full Vision

La Foto del Campo apre la negoziazione; Futuro Anteriore introduce una scissione;
Temptation Diplomacy mette in conflitto fedeltà e consenso; il Tour del Feed porta
il giocatore in cinque collegi; Election Night compone un gauntlet dipendente da
coalizione e SONDAGGI. Aree principali: Campo Largo, Futuro Anteriore, Genova
Techno e Palazzo dei Feed.

Target: +3–5 ore per Atto 3, almeno 10 ore di ripetibilità e 20–25 ore per il
completismo, da confermare con telemetria locale e playtest umano.

## Visual Identity Anchor

**Cartoon RPG politico pixel-perfect.** Tutto deve essere leggibile alla risoluzione
240×180: silhouette mostruose, palette ad alto contrasto, testo bitmap senza
collisioni, pannelli avorio/blu e accenti oro. PixelLab è la fonte degli asset
visibili; ogni sprite conserva fallback e manifest finché la copertura strict non
è completa. Un riferimento politico deve emergere da silhouette, props e animazione,
mai da testo incorporato nello sprite.

## Scope Tiers

- **Vertical slice R1**: Campo Largo, una scelta di alleanza, un boss, due esiti,
  una famiglia nuova; tutto dietro flag.
- **R2–R3**: eventi satirici aggiornabili, roster prima ondata, cinque territori ed
  Election Night completa.
- **R4**: campagna settimanale, rivincite vive e COPPA variabile.
- **R5**: polish, accessibilità, localizzazione e release gate.

## MVP and Success Criteria

La vertical slice è valida se la campagna storica resta invariata con flag off,
una scelta di coalizione produce conseguenza visibile entro dieci minuti, due
percorsi arrivano a esiti differenti e save/load conserva lo stato senza perdita.
Nessun assetto deve dominare tutti gli altri nei test di scenario.

## Risks and Mitigations

- **Scope/content explosion**: massimo sei famiglie nella prima ondata e gate per release.
- **Satira che invecchia**: pack dati con periodo, fonte e fallback evergreen.
- **Formula opaca**: seggi e consenso spiegabili in una schermata.
- **Regressione save**: migrazioni forward-only e fixture storiche.
- **WorldScene/BattleScene monolitiche**: controller e contratti puri prima delle feature.
- **Prestazioni Canvas**: budget già registrati, cache bounded e perf gate.

## Technical Constraints

Zero dipendenze runtime aggiuntive salvo multiplayer esistente; nessun servizio
remoto richiesto; feature flag fail-closed; contenuti validati browserless; stato
nuovo posseduto da moduli dominio, non dalle scene. Ogni release deve superare
typecheck, test, validator, build e smoke della campagna storica.
