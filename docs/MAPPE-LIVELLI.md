# Livelli e orientamento nelle mappe

Due cose che il gioco non aveva: il terreno a più altezze e un modo di capire, a colpo d'occhio, dove sei e dove puoi andare.

## Terrazze (quote)

Nessun motore nuovo: le altezze si disegnano con caselle che le mappe già usavano e si leggono dalla mappa stessa (`src/game/world/terraces.ts`).

| Casella | Cosa è | Regola |
|---|---|---|
| `%` | scarpata di terra | si scende saltando verso sud, mai in altri versi (esisteva già) |
| `&` | muro di sostegno in pietra | come `%`, materiale da terrazza |
| `E` | scalinata | si sale e si scende; appartiene al lato basso |
| `l` | scala nella roccia (Stretto, Offshore) | come `E` |

La quota di un terreno è il numero di scalinate salite per arrivarci (e di salti fatti, al contrario). `terraceLevels(mappa)` la ricava con una visita a partire dalle porte: nessun livello va scritto a mano. Una mappa senza `%`, `&`, `E`, `l` non paga nulla.

Cosa se ne fa:

- il terreno più alto prende un velo di luce calda (cotto nella base, una sola volta per mappa), così le terrazze si leggono prima di arrivarci;
- le scarpate hanno fianchi arrotondati alle estremità, i muri sono in pietra a due corsi con coronamento, le scalinate hanno quattro gradini con l'alzata in ombra e fianchi dove toccano un muro;
- sui gradini il passo sale di mezza casella (solo disegno: collisioni, tocco e camera restano quelli di sempre);
- la pianta (sotto) ombreggia il terreno per quota.

Un salvataggio fatto prima che una mappa fosse ridisegnata può trovare il giocatore dentro un muro: `unstick()` lo sposta sul terreno libero più vicino al caricamento.

### Borgo Urne

Tre quote nello spazio che prima era piatto, senza toccare porte, edifici e tutto da riga 9 in giù.

- **Piazza** (righe 9-23): laboratorio, casa, circolo, bar. Invariata.
- **Campagna** (righe 5-8): prima terrazza, erba alta, due sfidanti, una scarpata sul fronte con la scalinata al centro. La tasca a sinistra si raggiunge anche saltando dal belvedere.
- **Belvedere** (righe 0-4): muro di pietra con la scalinata al centro, panchina, il Monumento al Candidato Ignoto (testo che indica il laboratorio, casa e bar dall'alto), l'uscita verso il Percorso 1 e un tesoro nascosto.

Il nome della zona compare in alto quando ci entri (`MapDef.zones`). `tests/content/borgoTerraces.test.ts` fissa che tutto sia raggiungibile a piedi dalla porta del laboratorio, che senza scale la cima non si raggiunga e che nessuno stia su un muro o blocchi una scala.

## Dove sei e dove puoi andare

- **Insegne** (`places.ts`): sopra ogni porta vicina (entro 8 caselle e non più di cinque) una targhetta col nome («Laboratorio», «Bar»); sulle strade di confine una targa «▲ Percorso 1» (con «· chiuso» se mancano medaglie); l'obiettivo della missione è giallo con «▶». Dentro un edificio la porta si chiama «Esci».
- **Pianta** (`Mappa → Qui`): il luogo intero disegnato dalle sue caselle (`localPlan.ts`, `ui/kit/plan.ts`) con te in rosso, l'obiettivo in giallo, le porte numerate, gli sfidanti ancora da battere, le scale e le scarpate. Sotto, l'elenco «Dove puoi andare» con direzione, passi e a cosa serve («Cura gratis · box squadra»). Toccare una riga ti ci porta a piedi (stesso percorso del tocco sulla mappa); chiusa dalle medaglie non si tocca. L'atlante d'Italia resta nelle altre schede.
- **Percorso visibile**: durante un cammino automatico una scia di puntini gialli e un anello sul punto d'arrivo; «Fermati» c'era già.
- **Freccia della guida**: ora punta lungo il percorso percorribile (scale incluse), non in linea d'aria attraverso il muro.
- **Zone**: il nome del quartiere o della terrazza in cui sei si aggiunge al luogo in alto («Borgo urne · Belvedere»).

`npm run check:ui-panels` copre anche la schermata `pianta` in quattro formati; `check:ui-flows` verifica il passaggio fra Qui e Italietta.
