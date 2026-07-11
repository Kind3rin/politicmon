# Level Design — Campo Largo R1

> **Status**: Implemented scaffold
> **Maps**: `campo_largo` 24×18, `retropalco_campo` 16×11

## Funzione

Tutorial narrativo della Coalizione: festa pubblica, tre candidati e due posti;
il retropalco trasforma la promessa in trade-off. R1 termina prima del Tour completo.

## Percorso

1. ingresso/uscita sicura a sud;
2. CAPO CAMPAGNA orienta verso tre gazebo;
3. candidati ai lati del percorso centrale;
4. retropalco a est per preview e commit;
5. palco/fotografo a nord per il boss;
6. ritorno sud senza perdita di stato.

Il palco è visibile dall'ingresso. Recinti e sentiero centrale comunicano la rotta
senza colore; due marker-statue sul palco mostrano fisicamente il limite degli slot.

## Cast R1

- CAPO CAMPAGNA;
- SEGRETARIA DEL CAMPO (`campo_secretary`);
- CENTRISTA QUANTICO (`quantum_centrist`);
- SINDACA CIVICA (`civic_mayor`);
- FOTOGRAFO UFFICIALE;
- MEDICO VOLONTARIO healer.

## Pacing target

- orientamento 3–5 min;
- candidati e scelta 8–12 min;
- collegio sandbox 8–10 min;
- boss e conseguenza 8–12 min;
- totale 30–45 min.

## Visual direction

Palette prato/salvia, tende avorio, accenti oro e corallo; palco rettangolare,
gazebo a silhouette diverse, backstage più stretto e navy. Poster e testo non
entrano negli asset PixelLab: cartelli runtime e fallback evergreen.

## Accessibilità e safety

- rotta centrale continua e landmark palco visibile;
- nessun incontro casuale;
- healer prima del boss;
- uscita con conferma esplicita;
- due tile porta e due tile uscita evitano blocchi;
- nessun puzzle basato solo sul colore;
- dialoghi e foto non possiedono il commit Coalizione.

## QA

- map consistency, building doors, world layout ed exit check verdi;
- tutte le celle critiche raggiungibili;
- warp interno torna davanti alla stessa porta;
- sei NPC su tile validi e senza sovrapposizioni;
- sconfitta boss non resetta scelta o candidati visitati;
- flag off rende l'area irraggiungibile dalla campagna storica.
