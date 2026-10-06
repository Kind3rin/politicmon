# Audit di design — repertori e scelte in lotta

5-6 ottobre 2026. Metodo: simulazione di tutte le coppie di specie (52×51) allo stesso livello, scegliendo per ciascuna la mossa
che fa più danno atteso (`damageRange`), senza stati né cambi. Non misura il divertimento: misura se il giocatore ha una scelta.

## Prima

| Misura | Lv 10 | Lv 25 | Lv 40 |
|---|---|---|---|
| La mossa migliore dipende dall'avversario (+15% sulla più forte) | 11,3% | 18,2% | 28,8% |
| Turni al primo KO | 3,6 | 3,4 | 3,2 |
| Scontri a senso unico (3× di turni) | 16,5% | 13,8% | 13,1% |

- 33 specie su 52 avevano, al livello in cui le incontri, meno di 3 mosse da danno o un solo tipo. Salvinott a Lv 4: Comizio e uno slogan. Contemorfo e Tajanide: solo Comizio.
- A livello alto ogni specie imparava solo mosse del proprio tipo: il repertorio tornava a un tipo solo.
- Solo 26 mosse su 78 risultavano la migliore in almeno un incontro a Lv 10.

## Intervento

`scripts/balance-learnsets.ts` (ripetibile, `--write`): a ogni soglia (primo livello incontrato, 8, 14, 22, 32, 42) ogni specie deve
avere 3 mosse da danno di 2 tipi, scegliendo come il gioco sceglie (`movesAtLevel`). Le mosse mancanti si aggiungono un livello prima
della soglia, dal pool comune (mosse note ad almeno 2 specie, precisione ≥ 90, senza contraccolpo), preferendo un tipo affine al tema
della specie e che colpisca ciò che il suo tipo non colpisce, con una penalità per le mosse già molto usate. Non toglie né sposta nulla.
91 mosse aggiunte a 49 specie. Il test `tests/content/learnsetVariety.test.ts` fissa la regola.

## Dopo

| Misura | Lv 10 | Lv 25 |
|---|---|---|
| La mossa migliore dipende dall'avversario | 25,3% | 21,2% |
| Turni al primo KO | 3,5 | 3,5 |
| Scontri a senso unico | 11,6% | 10,9% |

Specie con repertorio povero: 33 → 2 (due creature di storia incontrate solo oltre la soglia). Il rivale scriptato non cambia: usa mosse esplicite.

**Correzione di rotta.** La prima versione aggiungeva mosse da 55 di potenza sotto il livello 10 e rendeva i selvatici iniziali molto più pericolosi
(Tajanide a Lv 5 stendeva il compagno in 2 turni invece di 7). Simulando i tre compagni iniziali contro ogni selvatico di Borgo e Percorso 1,
il tetto di potenza sotto il livello 10 è stato portato a 45: i selvatici portano tipi nuovi senza colpire più forte, e la minaccia iniziale
resta vicina a prima (da 9–13 turni quasi innocui a 4–5). Resta da giudicare giocando se l'inizio sia ora troppo duro per chi è nuovo.

## Leve ancora aperte

- Le lotte durano poco (3,2-3,3 turni al primo KO, 22-29% in due turni o meno): poco spazio per posture e stati. Vale una prova con un fattore di danno globale o PV più alti, con ribilanciamento dei capi.
- Mosse di stato: molte specie ne portano 1-2 che non cambiano mai l'esito; vanno viste con una simulazione che le includa.
- Alcune specie a pari livello perdono quasi sempre (4-16%): sono davvero scelte per il reclutamento? Verificare con il livello a cui si incontrano.
