# Percorsi immersivi: la strada non va più solo a nord

Prima il viaggio era una scala: Borgo → Percorso 1 → Mediopoli → Percorso 2 → Eurotown → Percorso 3 → Caput Mundi, sempre dal basso verso l'alto, con strade larghe quattro caselle che attraversavano la mappa in verticale. L'atlante (`WorldMapScene`) disegnava già una geografia a zig-zag, ma il gioco no.

## La nuova geografia

```
 Caput Mundi ◀── Percorso 3 (sale, poi esce a ovest)
                      ▲
 Eurotown ◀─ Percorso 2 ─▶ (giro a "C" attorno al lago)
                      ▲
 Mediopoli ─▶ cancello est ─▶ Percorso 2
     ▲          ▲
     │          └── Colle dell'Antenna (facoltativo, a nord)
 Percorso 1 (resta verticale: è il tutorial)
     ▲
   Borgo
```

- **Cancelli laterali**: Mediopoli (est), Eurotown (est) e Caput Mundi (est) hanno una strada che esce di lato. Sono avvisi sul terreno: «▶ Percorso 2», «◀ Eurotown»… (`places.ts` riconosce una porta sul bordo laterale come un cancello). Il cancello di Mediopoli resta chiuso fino alla prima medaglia, con le stesse battute di prima.
- **Percorso 2 è una "C"** (46×34): si entra da ovest in basso, si cammina verso est lungo il lungolago, si sale la scarpata a est (l'unico dislivello, con una scalinata larga cinque) e si torna a ovest lungo il crinale fino a Eurotown. Il lago sta al centro: molo con un allenatore, isola del tesoro (solo col traghetto), cove, boschetti, nebbia. Dalla riva nord si può saltare giù a sud: scorciatoia di ritorno.
- **Percorso 3** sale da Eurotown come prima ma in cima gira a ovest: l'uscita non è più a nord ma una strada larga tre caselle che porta nel cancello est di Caput Mundi.
- **Colle dell'Antenna** (30×26, facoltativo): a nord di Mediopoli, dove prima c'era la strada per il Percorso 2. Due terrazze e una cima con la statua del Segnale Ignoto, tre sfidanti nuovi (Ripetitorista, Radioamatore, Meteorologo dei sondaggi, con busto Higgsfield), erba alta con selvatici propri, tre oggetti. Si può saltare, ma chi esplora trova.
- **Strade senza sbocco**: i vecchi sbocchi nord di Mediopoli (ora Antenna), sud di Eurotown e sud di Caput Mundi sono stati chiusi: nessun vicolo cieco da percorrere inutilmente.

## Cosa c'è sotto

- **La guida** (freccia e «Ti accompagno») non usa più una catena "verso nord": cerca la strada più breve nel grafo vero dei luoghi, tra strade e porte (`WorldScene.nextHop`). Funziona con qualunque forma di mondo.
- **Il mondo ha una guardia**: `npm run check:gates` attraversa tutti i cancelli nei due versi, verifica il cancello della prima medaglia e che la guida scelga il cancello giusto da Percorso 2 verso Caput Mundi.
- Il driver della campagna nativa (`play-campaign-native.mjs`) attraversa i cancelli con `crossTo`; l'ha percorsa fino alla palestra di Eurotown senza blocchi.
- Test: i Percorsi restano raggiungibili a piedi dall'ingresso, con un solo percorso dal basso all'alto per ciascuna scarpata (`terraceMaps`), compreso il Colle (due quote).

## Limiti

- Non ho camminato i Percorsi a mano sul telefono: ho visto le schermate a 375×812 e fatto camminare il driver. La lunghezza del Percorso 2 (circa 110 caselle a piedi) è un'ipotesi: se pesa, il traghetto sul lago è già un'alternativa a più medaglie e si può accorciare il lato est.
- Percorso 1 resta verticale: è il tutorial, non l'ho toccato.
