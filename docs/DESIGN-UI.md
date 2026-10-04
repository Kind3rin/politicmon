# Politicmon: direzione di design dell'interfaccia

Questo file comanda su tutto ciò che riguarda l'aspetto e l'uso dell'interfaccia.
Se contraddice `CODEX-GOAL-2.md` (Fase 0) o il kit attuale, vince questo.

## 1. Verdetto sulla Fase 0 consegnata

Luca ha giocato la build del 4 ottobre su telefono: **ingiocabile, UX pessima.**
Il kit `src/ui/kit/` ha reso il testo nitido ma ha trasformato un gioco in un
modulo web. La Fase 0 **non è chiusa** e va rifatta secondo questo file.

Difetti osservati sulle schermate reali (412×915 e 844×390):

| Schermata | Cosa non va |
|---|---|
| Lotta | La scena è una striscia alta l'8% dello schermo, con gli sprite minuscoli **coperti** dalla barra "Polemica: 0 di 3". Le quattro mosse sono schede enormi che ripetono etichette ("Tipo", "Potenza", "PP", "Efficacia", "Agisci prima", "Danno stimato"). La terza riga di azioni (Fuorionda, Dossier, Fuga) è **tagliata** fuori schermo |
| Esplorazione | Due pannelli fissi coprono il quarto superiore della mappa. Pulsante "Avvicinati" spento che non fa nulla. "Salva" sempre in vista. In orizzontale la mappa è un francobollo al centro e un avviso la copre; resta un'etichetta in vecchio bitmap ("AGENDA A") |
| Squadra | Un compagno occupa uno schermo intero. Frasi come "Compagno 1 di 6." "Livello 26." "Capofila." una sotto l'altra, col punto: è testo per lettori di schermo reso visibile. PV senza barra. Scorrimento dentro un riquadro |
| Borsa | "Scelta 1 di 54": oggetti × compagni appiattiti in un elenco unico. Tre paragrafi di istruzioni prima del contenuto |
| Mappa | Non è una mappa: è un elenco di schede con "Scelta 1 di 10" |
| Impara mossa | Titolo su due righe, tre paragrafi di istruzioni, schede che scorrono dentro un riquadro |
| Tutte | Intestazione da sito (logo + tre pulsanti) sempre presente; tutto è una scheda blu con lo stesso peso; nessuna identità: sembra il pannello di un'app aziendale |

Cause, da non ripetere:

1. **Il gioco è stato messo in secondo piano.** La tela è diventata un'immagine
   dentro una pagina.
2. **Si scrive ciò che andrebbe mostrato.** Frasi al posto di barre, icone,
   colori, posizioni.
3. **Una scheda per ogni cosa.** Bordo, raggio e fondo uguali per titolo, dato
   e pulsante: nessuna gerarchia.
4. **Il testo per l'accessibilità è finito a schermo.** "Compagno 2 di 6",
   "Scelta 3 di 10" servono a un lettore di schermo: vanno in `aria-label`,
   non in vista.
5. **Nessuna direzione artistica.** Blu notte e verde acqua generici.
6. **Regole seguite alla lettera invece di guardare il risultato.** Alcune
   regole della Fase 0 erano sbagliate o ambigue e sono ritirate (vedi §9).

## 2. Principi

1. **La scena è la protagonista.** Mappa e lotta occupano lo schermo; i comandi
   stanno sopra, in trasparenza o ai bordi. Mai una pagina con dentro un
   riquadro di gioco.
2. **Mostra, non scrivere.** PV = barra. Tipo = stemma colorato. Capofila =
   stellina. Efficacia = freccia. Quantità = `×11`. Una frase compare solo
   quando racconta qualcosa (dialoghi, descrizioni, battute).
3. **Tutto in una schermata.** Lotta, squadra, menù, apprendimento: niente
   scorrimento. Se non ci sta, si toglie o si sposta in un dettaglio a
   richiesta. Mai scorrimento dentro un riquadro.
4. **Gerarchia con dimensione, colore e posizione,** non con riquadri. Un
   riquadro solo dove c'è qualcosa da toccare o da separare davvero.
5. **Dettaglio a richiesta.** A colpo d'occhio l'essenziale; pressione lunga o
   tocco per il resto.
6. **Niente istruzioni a schermo.** Se serve spiegare come si usa una
   schermata, la schermata è sbagliata.
7. **Un'identità riconoscibile** (§4), coerente con la satira politica e con la
   grafica a pixel.
8. **Si giudica guardando.** Ogni schermata si confronta con i riferimenti (§3)
   prima di chiamarla finita.

## 3. Riferimenti da studiare

Cerca online schermate di questi giochi e guardale prima di disegnare. Non
copiare: capire densità, proporzioni e gerarchia.

- **Pokémon Bianco/Nero e HeartGold (DS):** lotta con scena in alto e quattro
  mosse grandi colorate per tipo in basso; squadra a sei riquadri in una
  schermata.
- **Cassette Beasts, Coromon:** catturamostri moderni a pixel, HUD leggero.
- **Persona 5:** menù con personalità forte, tipografia come grafica.
- **Slay the Spire:** intenzione del nemico come icona sopra la testa.
- **Stardew Valley mobile, Sea of Stars:** esplorazione a tutto schermo con
  comandi sovrapposti.
- **Marvel Snap, Balatro:** riscontro tattile e numeri che rimbalzano.

## 4. Identità visiva: "Tribuna elettorale"

Tema: materiale da campagna elettorale italiana. Schede, manifesti, timbri,
grafiche da telegiornale, tessere di partito.

**Colori (unici ammessi per l'interfaccia):**

| Nome | Valore | Uso |
|---|---|---|
| Carta | `#F4EEDC` | fondo dei pannelli |
| Carta scura | `#E4DAC0` | fondo secondario, righe alterne |
| Inchiostro | `#14161F` | testo, bordi |
| Inchiostro tenue | `#5B5F70` | etichette, note |
| Rosso tribuna | `#D7263D` | azione principale, pericolo, PV bassi |
| Verde scheda | `#1B998B` | conferma, PV alti, guadagni |
| Giallo evidenziatore | `#FFD23F` | selezione, novità, mossa finale |
| Blu istituzionale | `#1E3A8A` | intestazioni, targhette |
| Notte | `#0E1220` | velo sopra la scena, fondo dei menù a tutto schermo |

Più un colore per ciascun tipo di Politicmon, usato per stemma e mosse.

**Forme:**

- Pannelli come **cartoncini**: fondo Carta, bordo Inchiostro di 2 px, **ombra
  piena spostata di 4 px** (nessuna sfocatura), angoli quasi vivi (raggio 4).
- Pulsanti grossi, con la stessa ombra piena; premuti, si spostano di 4 px e
  l'ombra sparisce.
- Targhette inclinate di 1-2 gradi, timbri ("ELETTO", "KO", "NUOVO") ruotati,
  strappi e nastri adesivi come decorazione, retino a punti sui fondi.
- Sprite a pixel sempre a multipli interi, mai sfocati, **grandi**.

**Caratteri:** uno condensato e pesante per titoli, nomi e numeri (da
manifesto), uno leggibile per i testi. Titoli brevi in maiuscolo; testi in
minuscolo.

**Movimento:** entrate a scatto (120-180 ms), numeri che rimbalzano, timbro che
batte sulla scelta confermata. Tutto disattivabile con `reduceEffects`.

**Vietato:** blu notte con verde acqua, riquadri arrotondati uguali per tutto,
contorni sottili a basso contrasto, emoji di sistema come icone.

## 5. Scocca

- **Via l'intestazione da sito** (logo, croce, "?", schermo intero). Quelle
  funzioni vanno in Menù → Altro. Il gioco parte dal bordo superiore, sotto la
  barra di stato del telefono, rispettando le aree sicure.
- **Un solo strato di gioco** a tutto schermo; l'interfaccia è uno strato
  sopra.
- Nessuna cornice arrotondata attorno all'intera schermata.

## 6. Schermate

Proporzioni riferite a un telefono in verticale 412×915. I disegni sono schemi
di disposizione, non stile.

### 6.1 Esplorazione, verticale

```
┌──────────────────────────────┐
│ [Percorso 3]        (👥)(🗺)(☰)│  ← nome luogo: compare 2 s e svanisce
│ ▸ Sfida la Global Tower       │  ← obiettivo: una riga, si ripiega con un tocco
│                               │
│                               │
│         M A P P A             │  ← a tutto schermo, dal bordo alto al basso
│      (100% dell'altezza)      │
│                               │
│                               │
│                               │
│   ◯                    ( A )  │  ← leva: appare dove appoggi il pollice
│  leva                 Parla   │  ← A: visibile solo se c'è qualcosa da fare
│                        (»)    │  ← corsa: interruttore piccolo
└──────────────────────────────┘
```

- La mappa occupa **tutto** lo schermo; i comandi sono sovrapposti e
  semitrasparenti.
- In alto a destra tre icone piccole: Squadra, Mappa, Menù. Borsa sta nel menù.
- Il pulsante d'azione **non esiste** quando non c'è nulla da fare. Mai un
  pulsante spento con scritto "Avvicinati".
- **Salvataggio automatico** a ogni cambio mappa e dopo ogni lotta, con una
  piccola icona che lampeggia. "Salva" manuale sta in Menù → Altro.
- Avvisi ("Oggi tanti Ursulax!") come **striscia breve** in alto che scorre via
  da sola in 3 secondi, mai un riquadro sopra il personaggio.
- Sondaggi, fondi e mezzo non stanno fissi a schermo: si vedono nel menù.
  Il mezzo si capisce dallo sprite.
- Le etichette sui personaggi usano lo stesso carattere del resto.

### 6.2 Esplorazione, orizzontale

Mappa a **tutto schermo**. Leva sovrapposta a sinistra, pulsante d'azione e
corsa sovrapposti a destra, tre icone in alto a destra. Nessuna colonna
laterale piena, nessuna griglia di pulsanti.

### 6.3 Lotta, verticale

```
┌──────────────────────────────┐
│ BERLUSCONIX  Lv26        ⚔︎   │  ← targhetta nemico + icona intenzione
│ ▓▓▓▓▓▓▓░░░                    │
│                    ┌───────┐  │
│                    │ nemico│  │  ← sprite grande: ≥ 30% della larghezza
│                    └───────┘  │
│   SCENA  (≥ 48% altezza)      │
│  ┌────────┐                   │
│  │  mio   │                   │  ← sprite ≥ 36% della larghezza
│  └────────┘  MEDIOCRATE Lv17  │
│              ▓▓▓▓▓▓▓▓▓▓ 65/65 │
│              ● ● ○  polemica  │  ← risorse come pallini accanto alla targhetta
├──────────────────────────────┤
│ Mediocrate usa Conferenza!    │  ← una riga di cronaca, sparisce da sola
├───────────────┬──────────────┤
│ TELEPROMESSA  │ APPELLO      │
│ 📺  14/15     │ 📺 15/15  ▲  │  ← 2 righe: nome; stemma, PP, freccia efficacia
├───────────────┼──────────────┤
│ EDITORIALE    │ BUNGA PARTY  │
│ 📺  9/10   ▲  │ 📺  0/5   ▲  │  ← senza PP: sbiadita e barrata
├───────┬───────┼───────┬──────┤
│Cambio │ Borsa │Recluta│ ···  │  ← una sola fila di azioni a icona
└───────┴───────┴───────┴──────┘
```

- **Niente scorrimento, niente elemento tagliato**, a qualsiasi altezza da 640
  px in su.
- Le mosse hanno **solo**: nome, stemma del tipo (la scheda prende il colore
  del tipo), PP, freccia di efficacia (▲ forte, ▼ debole, niente se normale).
  Niente etichette "Tipo/Potenza/PP/Efficacia", niente "Agisci prima", niente
  "Danno stimato" in vista.
- **Pressione lunga** su una mossa: foglietto dal basso con potenza,
  precisione, effetto, danno stimato, ordine d'azione.
- Nulla copre gli sprite. Le risorse sono pallini o una barretta vicino alla
  targhetta del proprio compagno.
- La previsione dell'avversario è un'**icona** sopra la sua testa (spada,
  scudo, megafono…), con il numero solo se serve.
- "···" apre Dossier e Fuga. La mossa finale, quando è carica, **sostituisce
  con un pulsante giallo lampeggiante** la riga di cronaca: non una voce fissa.
- I danni compaiono come numeri sulla scena, non come frasi.

### 6.4 Squadra

```
┌──────────────────────────────┐
│ SQUADRA                    ✕ │
├──────────────────────────────┤
│ ★ [spr] BERLUSCONIX   Lv26   │
│         ▓▓▓▓▓▓░░░  64/102 📺✊│
├──────────────────────────────┤
│   [spr] MOVIMENTON    Lv26   │
│         ▓▓▓▓▓▓▓▓▓ 103/103 ⚖ │
├──────────────────────────────┤
│   … altri 4, tutti visibili … │
└──────────────────────────────┘
```

- **Sei compagni in una schermata**, senza scorrere. Riga: sprite, nome,
  livello, barra PV con numeri, stemmi dei tipi, stato alterato.
- Capofila = stellina. Trascinare per riordinare. Tocco = scheda di dettaglio.
- Nessuna frase. Nessun "Compagno 1 di 6".

### 6.5 Scheda del compagno

Sprite grande in alto con nome e tipi; sotto, tre linguette: **Mosse** (quattro
righe come in lotta), **Valori** (barre orizzontali, non numeri in colonna),
**Storia** (descrizione, abilità, evoluzione). Tutto in una schermata per
linguetta.

### 6.6 Borsa

- Linguette per categoria con icona: Cure, Schede, Strumenti, Chiave.
- Griglia o elenco fitto: icona, nome, `×11`. Almeno 8 oggetti visibili.
- Tocco su un oggetto: **foglietto dal basso** con descrizione in una riga e
  **la fila dei sei compagni** (sprite + barra PV con anteprima dell'effetto).
  Tocco sul compagno: applica. Compagni su cui non ha effetto: sbiaditi.
- Mai l'elenco oggetti × compagni. Mai "Scelta 1 di 54".

### 6.7 Mappa

Una **mappa disegnata** dell'Italietta, illustrata, che si trascina e si
ingrandisce: luoghi come segnalini, strade come linee, posizione attuale che
pulsa, prossima tappa con bandierina. Tocco su un luogo: foglietto con nome,
una riga, pulsante di viaggio e costo. Le linguette (Italietta, Rotte, Atto 3)
cambiano strato sulla stessa mappa. **Niente elenchi di schede.**

### 6.8 Imparare una mossa

Una schermata, senza scorrere: sprite e nome in alto; la **mossa nuova** in
evidenza gialla con timbro "NUOVA"; sotto, le **quattro mosse attuali** come
righe (stesso formato della lotta) da toccare per sostituirle; in fondo "Non
imparare". Nessun paragrafo di istruzioni. Pressione lunga per i dettagli.

### 6.9 Menù di pausa

Foglio che sale dal basso **sopra il gioco scurito**, non una pagina nuova.
Striscia in alto con fondi e sondaggi (icona + numero). Griglia 3×2 di icone
grandi con **solo il nome**: Squadra, Borsa, Missioni, Mappa, Politicdex,
Altro. Nessuna descrizione sotto le voci. Chiusura con ✕ o tocco fuori.

### 6.10 Dialogo

Riquadro in basso sopra la scena, alto al massimo il 28% dello schermo;
targhetta col nome inclinata sul bordo superiore, ritratto di chi parla, testo
che compare a macchina da scrivere, freccina di "continua". Le scelte compaiono
come pulsanti sopra il riquadro.

## 7. Regole numeriche (verificate da script)

Aggiungi `scripts/check-ui-layout.mjs`, che apre ogni schermata a 360×740,
412×915 e 844×390 e fallisce se:

- la mappa in esplorazione copre meno del **95%** dell'area visibile;
- la scena di lotta è alta meno del **48%** in verticale;
- uno sprite in lotta è largo meno del 30% della larghezza;
- un elemento interattivo è fuori schermo, tagliato o sovrapposto a un altro;
- qualcosa copre gli sprite in lotta o il personaggio in esplorazione;
- lotta, squadra, menù, apprendimento hanno contenuto che scorre;
- esiste uno scorrimento annidato in qualsiasi schermata;
- squadra mostra meno di 6 compagni, borsa meno di 8 oggetti;
- una schermata ha più di **8** contenitori con bordo, o più di 3 dimensioni
  di testo;
- compare testo che corrisponde a `/\d+ di \d+\.?$/`, `^Scelta `, `^Compagno \d`,
  o un'etichetta ripetuta più di 2 volte nella stessa schermata;
- è presente l'intestazione da sito durante il gioco;
- un'area toccabile è più piccola di 44×44 px.

## 8. Come procedere

1. **Bozze prima del codice.** Crea `design/ui-mock/` con pagine HTML statiche
   (dati finti, sprite veri) per le dieci schermate di §6, in verticale e
   orizzontale. Salva le schermate in `artifacts/m2/mock-*.png`.
2. **Autocritica.** Per ogni bozza, affiancala al riferimento più vicino di §3
   e scrivi in una riga cosa è peggio. Correggi. Ripeti finché non regge.
3. **CONTROLLO UMANO, bloccante.** Scrivi nel diario `BOZZE PRONTE` con
   l'elenco delle immagini e **non migrare le scene** finché in
   `docs/M2-NOTE-LUCA.md` non compare la riga `UI APPROVATA`. Nell'attesa
   lavora alla Fase 1 (terreno), che non dipende dall'interfaccia.
4. **Migrazione nell'ordine:** esplorazione, lotta, dialogo, menù, squadra,
   borsa, imparare mossa, mappa, poi il resto. Dopo le prime due, nuovo
   controllo umano.
5. Riscrivi il kit attorno a questi componenti: targhetta, barra, stemma,
   riga-compagno, riga-mossa, foglietto dal basso, linguette, pulsante,
   striscia d'avviso, riquadro di dialogo. Elimina dal kit le schede
   generiche e le coppie etichetta/valore incolonnate.
6. Il testo per lettori di schermo resta, ma **nascosto alla vista**
   (`aria-label`, classe visivamente nascosta).

## 9. Regole della Fase 0 ritirate o corrette

- "Posizione nell'elenco indicata (3 di 12)" → **ritirata** a schermo; resta
  solo per l'accessibilità.
- "Dati come coppie etichetta/valore" → vale solo nelle schede di dettaglio.
  In lotta, squadra e borsa i dati si mostrano con barre, stemmi e numeri
  senza etichetta.
- "Ogni blocco ha titolo, contenuto e margine" → **non** significa una scheda
  con bordo per ogni blocco.
- "Mai più di 3 righe senza stacco", "spazio tra paragrafi" → valgono per
  dialoghi e descrizioni, non autorizzano a spezzare i dati in frasi.
- "Pulsante principale che dice cosa farà" → sì, ma **sparisce** quando non
  c'è nulla da fare.
- "Accessi rapidi a Squadra e Mappa" → icone piccole in alto, non una fila di
  pulsanti grandi.
- Diario: **massimo 15 righe brevi per fase**. La voce attuale della Fase 0 è
  un muro di testo: riscrivila.
