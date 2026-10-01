# Riserve, acquisti e scelte delle mosse

Round del 1 ottobre 2026. Il redesign riguarda la preparazione delle lotte:
zaino, negozio, trenta oggetti e insegnamento da direttiva o da livello.
Le altre aree restano nel [piano completo](REDESIGN-PLAN.md).

![Zaino, negozio, preventivo e confronto della direttiva](img/supplies.png)

## Borsa e negozio

Destra/sinistra cambiano filtro: TUTTI, CURE, RECLUTA, DIRETTIVE, KIT.
Su/giù selezionano un oggetto. Il tocco seleziona una voce; il secondo tocco
conferma. START apre la scheda senza spendere nulla, B torna alla lista.
La lista mostra un estratto; la scheda conserva il testo completo scorrevole.

| Pagina | Informazioni |
|---|---|
| EFFETTO | Descrizione completa, costo in turni/oggetti, uso fuori lotta, regole dei boost e della mossa insegnata |
| SQUADRA | PV effettivamente recuperabili, KO, status, compatibilità della direttiva, evoluzione e oggetto già tenuto |
| PREZZI | Base, tutte le variazioni attive, arrotondamento, prezzo finale, fondi e quantità acquistabile |

Nella scheda destra/sinistra cambiano pagina; su/giù scorrono il testo.
A usa l'oggetto nella borsa o apre un preventivo nel negozio.
I kit da equipaggiare, le direttive, le tessere e gli strumenti da campo
restano consultabili in battaglia: usarli è bloccato senza consumare il turno.
La cura da campo salva subito PV, status e quantità rimasta.
Rientrare nella borsa conserva l'oggetto selezionato se è ancora disponibile.

Il preventivo mostra quantità, prezzo unitario, totale, fondi residui e scorta.
Destra/sinistra cambiano di uno, su/giù di dieci. Il massimo è il numero
acquistabile con i fondi, fino a 99 per acquisto; una direttiva riutilizzabile
ammette una sola copia. A conferma, B annulla. Il pagamento ricontrolla fondi,
prezzo e disponibilità attuali e salva solo dopo un acquisto riuscito.
Non ci sono sconti inventati per quantità.

La pagina PREZZI comprende anche i rincari di INTERNO e PROPAGANDA, prima
assenti dalla spiegazione. Le percentuali si sommano al prezzo base; il risultato
è arrotondato a dieci euro, minimo dieci. Un ministro KO non applica il bonus
o il costo. Fiducia e sondaggi mantengono le loro conseguenze economiche reali.

Sono state ripristinate nell'ordine della borsa MULTA UE e PIAZZA GREMITA.
La seconda torna acquistabile e utilizzabile: la speciale SINISTRA senza
contraccolpo non era raggiungibile dal catalogo, benché esistesse nei dati.

## Insegnare è una scelta

Anche le mosse ottenute salendo di livello aprono la nuova scena di confronto.
Con quattro mosse si sceglie quale archiviare; con uno slot libero si può
leggere e rinunciare prima di aggiungere la nuova mossa.

START apre MOSSA NUOVA, MOSSA ATTUALE e COSA CAMBIA. Destra/sinistra cambiano
pagina, su/giù scorrono. La scheda mostra tipo, categoria, PP attuali/massimi,
potenza, precisione, priorità, effetti, STAB del candidato e testo satirico.
La potenza è un valore base, non una previsione del danno finale.

A sceglie, poi una seconda A conferma; B nel preventivo della sostituzione
permette di ripensarci. B nella lista rinuncia. Il candidato apprende soltanto
alla conferma: i nuovi PP sono al massimo, le altre mosse mantengono i PP,
e PV, status e oggetto restano invariati. Non si aggiungono mosse duplicate.
Rinunciare alla mossa da livello conserva il livello appena guadagnato.
Le direttive non si consumano e possono insegnare la mossa ad altri membri.

## Satira e risorse

Mediopoli parla di programmi con meno contenuto nella stessa confezione;
Eurotown promette prezzi stabili soltanto nel carattere tipografico;
l'ambulante confronta le «coperture» del palazzo con quelle del gilet.
Sono dialoghi originali. L'ispirazione sul contenuto ridotto a prezzo invariato
e sulla necessità di confrontare i prezzi viene da
[Altroconsumo](https://www.altroconsumo.it/alimentazione/fare-la-spesa/news/shrinkflation).
Il negozio risponde alla contraddizione mostrando costi e quantità verificabili.

Higgsfield ha prodotto otto immagini: tre ambienti e cinque fogli da sei oggetti.
Le ventotto icone preesistenti sono sostituite; le due mancanti sono aggiunte. Risorse native: 240×180 per gli ambienti, 32×32 trasparenti per le icone,
**200.066 byte** complessivi. Saldo verificato **769,97 → 757,97**, costo
**12 crediti**; spesa cumulativa dei round Higgsfield **128 crediti**.

Prompt, parametri di invio, parametri restituiti, job e originali sono registrati
in `scripts/higgsfield-supplies.json`. `python3 scripts/prepare-supplies.py --download`
recupera gli originali esistenti e converte le risorse senza nuove generazioni.
Pillow è necessario. La rimozione del bianco parte dal bordo di ciascuna cella,
conservando carta e riflessi bianchi interni agli oggetti.

## Verifica del round

- 250 test di logica, integrazione, contenuto e regressione passati.
- `shot:supplies`: 2.992 layout, tutti i 30 oggetti e tutte le 78 mosse;
  nessuna sovrapposizione o uscita dal canvas. Verificati purezza della lettura,
  tocco, quantità, preventivi scaduti, acquisto riutilizzabile, salvataggio della
  cura, blocco dei kit in lotta, rinuncia/conferma e apertura da livello.
- `shot:evolution-dossier`: 2.137 layout e flussi; `shot:gameplay-guide`: 1.846;
  `shot:switch-guide`: 247. Contratti degli input, contenuto, mappe e audit visivo
  passati. Le frecce dei menu non coprono più il prezzo della prima riga.
- Budget della build: iniziale 216,9 KiB gzip, totale 348,3 KiB;
  p95 circa 18,5 ms su Chromium con CPU ×4. Eliminato il catalogo storico delle
  texture testuali: il renderer del mondo leggeva già esclusivamente i PNG.
  Collisioni, incontri, acqua e metadati delle mappe restano gli stessi.
- `smoke:pwa:release`: 109 risorse Higgsfield disponibili anche al primo uso
  offline, aggiornamento del service worker e salvataggio migrato conservato.

Le immagini e i test non provano il completamento di esplorazione, audio,
postgame e rete multiplayer. Questi restano lavori del redesign completo.
