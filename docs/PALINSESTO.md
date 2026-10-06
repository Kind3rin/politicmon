# Palinsesto e coach

Round del 6 ottobre 2026, partito da una partita vera: avvio, laboratorio, strada, erba, prima lotta, menu Recluta, tutto da telefono a 375×812. Cosa ho visto e cosa ho fatto.

## Cosa non andava

1. **La lotta è profonda ma muta.** Quattro mosse con frecce ▲▼, tre cerchi sotto i PV, un'icona in alto a destra, tre posture, Fuorionda, reclutamento virale: tutto vero e tutto spiegato solo nel testo della guida, che nessuno apre. Nella prima lotta selvatica non c'era una parola.
2. **L'ora del giorno non contava.** C'era la luce vera, ma i selvatici erano gli stessi alle 9 e a mezzanotte.
3. **Poca varietà di tipi all'inizio.** Borgo e Percorso 1 offrono quasi solo Populismo. Verde, Media e Istituzione, che il giocatore dovrebbe avere in squadra per giocare con i tipi, compaiono ore dopo.

## Palinsesto

Quattro fasce, ognuna con due tipi «in onda» (tutti gli otto tipi compaiono una volta sola):

| Fascia | Ore | Programma | In onda |
|---|---|---|---|
| Mattina | 05–12 | Rassegna stampa | Istituzione, Verde |
| Giorno | 12–18 | Telegiornale | Centro, Media |
| Sera | 18–22 | Talk show | Sinistra, Destra |
| Notte | 22–05 | Televendite | Populismo, Tecno |

- **Doppio peso** ai tipi in onda nella tabella degli incontri (anche nei candidati visibili nell'erba, che si ricostruiscono al cambio di fascia).
- **Candidati solo a quell'ora** (`src/data/maps/slotEncounters.ts`, `EncounterEntry.slots`): 13 voci in Borgo, Percorso 1 e 2, Mediopoli, Colle dell'Antenna, Eurotown, Percorso 3, Caput Mundi. Sono specie già nel gioco, mostrate prima o dove mancavano; pesi bassi, perché il punto è un motivo per tornare, non sostituire la tabella. I primi due percorsi ricevono solo le specie più deboli (test).
- **Sfidanti vaganti per fascia** (`WanderingDef.slots`): quelli che non ne hanno girano a ogni ora; per ogni fascia e ogni numero di medaglie restano almeno quattro sfidanti (test).
- **Si apre dopo la prima sfida con Gianni** (`palinsestoOpen`), come il Comizio: l'inizio non cambia. Prima non c'è l'orologio e le voci «solo a quell'ora» non esistono.
- **Orologio e telecomando.** L'orologio del gioco è quello vero più `clockShift` ore (intero, salvato). L'orologio in alto a sinistra mostra fascia e ora; un tocco apre il Palinsesto, dove ogni fascia mostra ore, tipi in onda e quanti candidati «solo qui» ci sono (i nomi solo se già visti); toccando si apre una scheda con «Sintonizza col telecomando». `shiftToTune` porta l'orologio nel mezzo della fascia da qualsiasi ora (test su ogni quarto d'ora).
- **Luci e interni** seguono l'orologio del gioco. Il «mostro del giorno» e la sfida del giorno restano legati alla data vera e non all'ora.
- **Politicdex**: l'habitat dice «solo di notte» e il dossier ha il campo «Quando».
- **Annuncio**: al cambio di fascia un banner con i tipi in onda; la prima volta una spiegazione in tre battute.

- **Le persone dell'ora** (`src/data/maps/slotNpcs.ts`, `NpcDef.slots`): a Borgo, Mediopoli, Eurotown e Caput Mundi (14 persone, almeno tre fasce ciascuna) qualcuno compare solo in una fascia: il fornaio all'alba, il consigliere la sera, il nottambulo, il televenditore... Cambiare fascia cambia chi c'è in piazza. Cinque di loro danno un oggetto la prima volta (flag `slot-gift-*`), come motivo per guardare l'orologio. Stanno fermi, su caselle libere lontane da porte e scale; il test verifica che con tutti presenti ogni porta e ogni apertura del bordo restano raggiungibili. Portano il volto del loro ruolo (nessun busto nuovo: è folla di passaggio).
- **Missioni giornaliere** (`dailyquests.ts`): due nuove, solo a palinsesto aperto: *Recluta un candidato del tipo in onda* (300 €) e *Vinci contro un tipo in onda* (200 €).
- Nel Palinsesto i candidati «solo qui» non ancora visti compaiono col tipo («un candidato verde»), il nome solo dopo averli incontrati.

## Coach

`src/game/coach.ts`: funzione pura `nextBattleTip(state, situazione)`. Ogni consiglio è un flag `tip-<id>` nel salvataggio: letto, chiuso o semplicemente usato, non torna più.

In lotta, una scheda gialla sopra il campo (tutta la scheda è il tasto per chiuderla), un solo consiglio per turno, mai due di seguito dopo una chiusura. Ordine quando ne valgono più d'uno: Fuorionda pronto, compagno in difficoltà (≤ 30% PV, e c'è un caffè o un panchinaro), recluta (selvatico ≤ 50% PV, vivo, con schede), frecce, Polemica, intenzione del rivale. Nella prima lotta: frecce al primo turno, Polemica al secondo, intenzione al terzo.

Nel mondo (solo all'aperto, a mondo fermo): *Squadra stanca* (qualcuno sotto un terzo dei PV), *Schede finite* e *I Sondaggi* (la prima volta che la percentuale si muove); spariscono da sole dopo 14 secondi. Si spegne tutto con l'opzione «Guida e suggerimenti» (la stessa che governa la freccia verso la meta).

## Non verificato

- Nessuna partita lunga: l'effetto del doppio peso sul bilanciamento dell'inizio non è stato misurato su una campagna intera (le specie aggiunte nei primi percorsi sono le più deboli del gioco).
- Le voci «solo a quell'ora» vanno riviste con un giocatore vero: sono 13, forse poche o troppo nascoste.
- Il testo dei consigli non è stato letto da chi non ha mai giocato.

## Controlli

`npm run check:palinsesto`, `npm run check:coach`; test `tests/unit/palinsesto.test.ts`, `tests/unit/coach.test.ts`.
