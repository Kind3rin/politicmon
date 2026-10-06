# Ritmo e varietà: perché sembrava monotono, cosa è stato fatto

Richiesta: «il gioco lo trovo noioso e monotono, analizza bene». Qui sta cosa è stato misurato, cosa è cambiato e cosa **non** è stato verificato.

## Diagnosi (misure, non impressioni)

1. **I tre Percorsi erano lo stesso luogo.** Percorso 1, 2 e 3 avevano il 55-68% delle caselle identiche (stessa carreggiata, stesse scarpate a tutta larghezza, stessi campi). Il giro «Percorsi» precedente li aveva resi *più* simili, non meno. Dopo la riprogettazione: 44% (1↔2), 27% (1↔3), 35% (2↔3).
2. **Gli interni si ripetevano.** 45 interni, 28 piante diverse: cinque locali (circolo, redazione, bistrot, covo, chiosco) avevano la stessa stanza, le tre palestre la stessa aula. Ora 38 piante diverse; restano uguali solo le catene (sette bar sport, due discount), dove la ripetizione è la scelta.
3. **Lo stesso sfondo di lotta ovunque.** Percorsi 1-3 combattevano tutti sul «prato», le quattro città su «piazza». Ora Percorso 2 (lago), Percorso 3 (cava), Mediopoli (piazzale TV), Eurotown (viale europeo) e Caput Mundi (foro) hanno il proprio fondale.
4. **Nessuna regola cambiava dopo la prima medaglia.** Gli eventi di campo (Click day, Par condicio, Sondaggio lampo) esistevano solo a Borgo e Percorso 1 prima della prima medaglia; oltre, ogni lotta era uguale alla precedente. Il giocatore non vedeva neppure la regola del giorno annunciata nell'arena.
5. **Tratti vuoti.** Sul percorso più breve da un'entrata all'altra, Percorso 1 aveva 16 caselle consecutive senza persone né cartelli, Percorso 3 quattordici (ora quindici, ma con otto cose sulla strada invece di quattro). Percorso 2 è sceso da 10 a 6.
6. **Scelte di mossa quasi nulle all'inizio.** Con la politica greedy (`scripts/audit-battle-repetition.ts`, 300 corse): lotta di Percorso 1 3 turni, una sola mossa usata, mossa migliore dominante nel 100% dei turni; dalla prima medaglia in poi 3-5 mosse diverse e turni «dominanti» tra 0 e 33%. È il comportamento voluto di un tutorial (la mossa STAB è la migliore), non l'ho cambiato.

## Cosa è cambiato

- **Percorso 2** (colline del talk show → lungolago dell'Auditel → piana di Mediopoli): la strada scende in diagonale accanto a un lago con un'isola (molo e tesoro, raggiungibile solo col traghetto) e attraversa una scarpata a una sola scalinata.
- **Percorso 3** (cava del Protocollo → valle del fiume → piana di Eurotown): una strada a Z con tratti orizzontali lunghi, due muri di massi che la costringono a girare largo sul lato est (è il giro lungo, 58 passi invece di 32 nella versione vecchia); la geologa e il cavatore (nuovi, con busto). L'evento civico «La ghiaia del progetto» (cavatore) permette di aprire il varco: scelta che cambia la mappa, come il ponte a Percorso 1.
- **Palestre**: studio TV (palco rialzato), Parlamento UE (banco della presidenza e emiciclo, due quote), Attico globale (due quote); stesso principio del Palazzo e del Colle.
- **Nove interni nuovi**: redazione (muro di monitor), bistrot (bancone), retrobottega (casseforti e tavolo lungo), chiosco, studio di lobbying, covo dei retroscenisti, salotto romano (statue), casinò (slot e roulette).
- **Eventi di campo per area dopo la prima medaglia** (`AREA_EVENTS`): una lotta su tre, escluse palestre, leggende e duelli scritti, prende la regola del luogo — Caput Mundi e Colle *Taglio lineare* (−8% PV a tutti, mai KO), Mediopoli e Percorso 2 *Diretta TV* (Grinta +1 a entrambi), Eurotown e Bruxelles *Standard CE* (statistiche riportate tra −1 e +1), Percorso 3, Stretto, Offshore e Oblast *Cantiere aperto* (Velocità −1 a entrambi). Nell'arena la regola compare come avviso finché non scatta (al secondo turno).
- **Tocco involontario**: dopo una direzione, da un secondo dito, da un pollice appoggiato o da un click di rifocalizzazione la mappa non parte più (`docs/MOBILE-CONTROLS.md`).
- **Guardia permanente**: `tests/content/worldVariety.test.ts` (percorsi con meno del 60% di caselle uguali, sfondi e nomi di zona distinti, nessun interno con la stessa pianta fuori dalle catene, tutti raggiungibili dalla porta) e `tests/unit/areaEvents.test.ts`.

## Non verificato

- Nessuna partita umana: tutto ciò che sopra riguarda il «divertimento» è inferito da misure su dati e simulazioni, non da un giocatore su telefono dall'inizio alla fine. Le schermate sono state viste in emulazione a 375×812.
- La campagna intera non è stata rigiocata con i nuovi livelli; i controlli automatici (porte, collisioni, raggiungibilità, UI) sono verdi.
- Le regole di area sono nuove e non bilanciate in gioco: la scelta del −8% o del ±1 è prudente.

## Leve ancora aperte

- Lotte brevi (3-4 turni nel primo tratto): fattore di danno globale o PV più alti, da provare insieme a un ribilanciamento dei capi (`docs/GAME-DESIGN-AUDIT.md`).
- «Sfida a vista» per gli allenatori dei Percorsi, con consenso: oggi si parla con loro, non entrano nel tragitto.
- Altri eventi civici con conseguenze visibili sul mondo (oggi: cantiere, cava).
- Nuove specie selvatiche per percorso (richiedono arte).
