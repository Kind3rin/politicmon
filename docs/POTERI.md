# Poteri sul campo

Le «MN» di Politicmon, ripensate. Ricerca e punto di partenza: i giochi recenti del genere hanno tolto le MN-schiave (mosse sprecate in uno slot, mostri scelti solo per attraversare un fiume) e le hanno sostituite con poteri che si usano al volo, spesso senza costo, e che aprono strade facoltative invece di sbarrare quella principale (Leggende Arceus, Scarlatto/Violetto, i gadget da esplorazione di Temtem). Qui: **nessun slot, nessun obbligo, molta scena**.

## Come funzionano

- Si sbloccano con la storia (medaglie), non con un oggetto da trovare: `src/game/powers.ts`.
- Li usa il **primo compagno in forze** della squadra che ha uno dei tipi giusti (almeno il 30% del roster ne è capace, controllato da test). Se nessuno può, il gioco dice quale tipo serve; se il potere è chiuso, dice come si ottiene.
- Si lanciano dal pulsante **Poteri** (vicino a «Corri») o, per quelli che agiscono su qualcosa, dal pulsante contestuale davanti all'ostacolo («Taglia», «Spalla», «Scala», «Decreto»).
- Ogni potere entra in scena con un *cut-in* (banda diagonale, il Politicmon che si sporge, il nome sbattuto di lato) e ha il suo suono; con «Riduci effetti» resta un banner. Spallata e Scalata, che si ripetono, fanno il cut-in solo la prima volta in ogni mappa.
- **La strada principale non ne ha mai bisogno.** I poteri trovano oggetti, scorciatoie, nascondigli e divertimento. Test: `tests/content/powerSites.test.ts` verifica che ciò che nascondono sia fuori portata senza il potere e raggiungibile con.

## I poteri

| Potere | Sblocco | Tipi | Cosa fa | Dove |
|---|---|---|---|---|
| **Comizio** | Politicdex | tutti | Attira uno o due selvatici dall'erba vicina: accorrono col «!» e ti lasciano la prima mossa. 30 passi di pausa. | Erba alta |
| **Riflettori** | Auditel | Media, Tecno, Populismo | Nelle grotte buie accende un fascio largo; i tesori nascosti brillano. | Grotta del Consenso, Archivio di Stato |
| **Sondaggio lampo** | Spread | Media, Centro, Tecno | Per quindici secondi mostra i tesori nascosti entro nove caselle e segna dove sono i candidati (oro se rari). | Ovunque |
| **Dimissioni lampo** | Auditel | Centro, Istituzione, Media, Destra | Da grotte ed edifici ti porta all'ingresso, in una nuvola di fumo. | Interni |
| **Taglio lineare** | Spread | Destra, Istituzione, Tecno | Taglia i nastri rossi e bianchi. Per sempre. | Boschi di Percorso 2 |
| **Volo di Stato** | Spread | Destra, Centro, Media | Scegli una città già vista; volo al tramonto con gag a bordo; nessuna benzina. | Fuori da edifici e grotte |
| **Scalata** | Spread | Sinistra, Populismo, Verde | Sali una scarpata che di solito si scende soltanto. | Boschi di Percorso 2 |
| **Decreto Ponte** | Dazio | Istituzione, Tecno, Verde | Getta un ponte provvisorio (fino a 3 assi) sull'acqua stretta; sparisce uscendo dalla mappa. I laghi non si passano. | Fossato di Caput Mundi |
| **Spallata** | Dazio | Sinistra, Populismo, Istituzione | Sposta di una casella un masso; torna al suo posto rientrando. | Cantiere di Caput Mundi |

I veicoli (monopattino, ruspa, auto blu, traghetto) restano come sono: i poteri non li sostituiscono.

## Dove si trovano i luoghi

`src/data/maps/powerSites.ts` ritaglia radure e nicchie nei boschi (quattro per ora: due in Percorso 2, due in Caput Mundi), ciascuna sigillata da un solo ostacolo e con un premio: direttive di partito (FIAMMA, MULTA UE, SCIOPERO, INCIUCIO), schede, mojito, maalox, caffè. Gli ostacoli sono `MapDef.spots` (`tape`, `boulder`); i tesori hanno `PickupDef.power`.

## Come si aggiunge un luogo

1. Aggiungi una voce a `POWER_SITES` (modifiche alle caselle, `spots`, `pickups` con `power`).
2. Il bosco deve essere profondo almeno due righe; l'ingresso unico; l'atterraggio del ponte e il masso devono avere una casella libera dietro.
3. `npm test` dice se il premio è davvero fuori portata senza il potere e raggiungibile con.

## Verifica

`npm run check:powers`: ogni potere apre ciò che deve (nastro, scarpata, masso, fossato, comizio, riflettori, dimissioni), non senza medaglia o senza chi lo usi, e un cut-in con gli effetti accesi passa il testimone all'effetto.

## Limiti dichiarati

- I luoghi sono pochi (quattro) rispetto alla promessa: servono più nicchie in altre mappe, e un luogo per Riflettori che non sia solo «le grotte sono buie».
- Il Volo parte da tre città e da tre luoghi lontani una volta visitati; mancano Campo Largo e i capitoli del terzo atto.
- Nessun playtest a mano su telefono.
