# Playtest Gate — Atto 3 R1

> **Status**: Ready for 5 external sessions
> **Build gate**: automated checks required before every session

## Stato readiness automatica

- `smoke:campaign`: 6/6 checkpoint tecnici superati.
- `typecheck` e validazione contenuti: superati.
- `playtest:campaign`: benchmark diagnostico fuori range; non sostituisce il gate
  umano e non autorizza tuning prima della raccolta delle cinque sessioni.
- Il benchmark usa boss isolati e party integri: leggere i risultati insieme a
  KO, turni e osservazioni umane, non come verdetto autonomo sulla difficoltà.

## Setup

1. Avvia `npm run dev:local`.
2. In DevTools imposta:
   `localStorage.setItem('politicmon:dev:feature-overrides', JSON.stringify({atto3:true,coalition:true}))`.
3. Carica un save post-UE oppure completa LA COMMISSIONE.
4. A Bruxelles, usa il passaggio a coordinate 19,12 verso CAMPO LARGO.
5. Non spiegare bonus, malus o LINEA ROSSA verbalmente.

## Task osservato

- parla con i tre candidati;
- scegli due nomi;
- risolvi FOTO INCOMPLETA;
- completa il collegio CENTRO;
- affronta Futuro Anteriore;
- raggiungi uno dei due epiloghi.

## Dati per sessione

| Campo | Valore |
|---|---|
| ID tester/sessione | |
| inizio/fine e durata | |
| candidati scelti | |
| scelta foto | |
| finale COESA/TESA | |
| aperture menu Coalizione | |
| sconfitte boss | |
| ha compreso bonus? sì/no + frase | |
| ha compreso LINEA ROSSA? sì/no + frase | |
| motivazione trade-off, non copy? sì/no | |
| vuole provare l’altro ramo? sì/no | |
| soft-lock, testo tagliato o collisione | |

Le risposte di comprensione si accettano solo se il tester spiega con parole proprie
che il vantaggio ha un costo e che PANORAMICA può tendere un alleato. Un semplice
“sì” non conta.

## Soglie

- comprensione conseguenze ≥4/5;
- scelta motivata da trade-off ≥3/5;
- desiderio altro ramo ≥3/5;
- durata mediana 30–45 minuti;
- boss superabile senza grind;
- entrambi i finali osservati almeno una volta;
- zero soft-lock, corruzioni save o regressioni critiche.

## Decisione

- `PROCEED`: tutte le soglie passano.
- `ITERATE`: nessun blocker tecnico, ma una soglia UX fallisce; correggere solo il
  punto osservato e ripetere almeno tre sessioni.
- `STOP`: soft-lock, perdita save o loop terminale; bloccare R2 e correggere.

Non sostituire le cinque sessioni con test automatici: test e validator provano
correttezza tecnica, non comprensione o desiderio di replay.

## Raccolta e report

1. Compila una scheda in `production/qa/playtests/atto3-r1/sessions.json` senza
   correggere o interpretare le frasi del tester.
2. Imposta `completed: true` solo quando tutti i campi richiesti sono osservati.
3. Esegui `npm run playtest:atto3:report`.
4. Il comando rifiuta meno di cinque schede valide e genera
   `production/qa/playtests/atto3-r1/report.md` con soglie e action routing.
